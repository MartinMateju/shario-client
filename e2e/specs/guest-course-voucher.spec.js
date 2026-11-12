import { test, expect } from "../fixtures/test.js";
import { E2E, tenantOrigin, tenantUrl } from "../helpers/urls.js";

test("a guest redeems a voucher, confirms without Stripe and reserves one place only", async ({
  page,
  request,
  e2eState,
}) => {
  const product = e2eState.products.alpha;
  const session = e2eState.courseSessions.alpha;
  const voucher = e2eState.vouchers.alphaGuest;
  expect(voucher, "Use the paired guest-voucher server fixtures").toBeTruthy();
  const base = `/public/tenants/${E2E.alphaSlug}`;
  const sessionsPath = `${base}/products/${product.id}/sessions?locationId=${session.locationId}`;
  const api = (path) => `http://127.0.0.1:4311${path}`;
  const readSession = async () => {
    const response = await request.get(api(sessionsPath));
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const sessions = Array.isArray(body) ? body : body.sessions;
    return sessions.find((entry) => (entry.id || entry._id) === session.id);
  };
  const before = await readSession();
  expect(before.remainingCapacity).toBeGreaterThan(0);
  let stripeRequests = 0;
  page.on("request", (outgoing) => {
    if (new URL(outgoing.url()).hostname === "checkout.stripe.com")
      stripeRequests += 1;
  });
  await page.goto(
    tenantUrl(
      E2E.alphaSlug,
      `/courses/${product.id}?location=${session.locationId}&courseSessionId=${session.id}`,
    ),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: product.name }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Continue as a guest", exact: true }),
  ).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Guest");
  await page.getByLabel("Last name", { exact: true }).fill("Voucher");
  await page
    .getByLabel("Email", { exact: true })
    .fill("guest-voucher@shario-e2e.test");
  await page
    .getByLabel("Voucher code (optional)", { exact: true })
    .fill(voucher.code.toLowerCase());
  const quotedResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `${base}/checkout/guest/voucher/quote` &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Check voucher", exact: true })
    .click();
  const quoted = await quotedResponse;
  expect(quoted.ok()).toBe(true);
  expect(quoted.request().headers().authorization).toBeUndefined();
  const quote = await quoted.json();
  expect(quote.remainingToPayMinor).toBe(0);
  expect(quote.voucherAppliedMinor).toBe(4500);
  // A price check must not consume the voucher or reserve a place.
  expect((await readSession()).remainingCapacity).toBe(
    before.remainingCapacity,
  );
  const guestForm = page
    .getByRole("button", {
      name: "Confirm booking with voucher",
      exact: true,
    })
    .locator("xpath=ancestor::form");
  await expect(
    guestForm.getByRole("link", {
      name: "Terms and conditions",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://studio-alpha.example.test/terms");
  await expect(
    guestForm.getByRole("link", {
      name: "Cancellation policy",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://studio-alpha.example.test/cancellation");
  await page
    .getByRole("checkbox", {
      name: "I have read and accept these class terms.",
      exact: true,
    })
    .check();
  // Forward the real checkout once and capture its unmodified response before
  // releasing it to the page. The success navigation can discard Chromium's
  // response body even when waitForResponse starts reading it immediately.
  let checkout;
  await page.route(
    (url) => url.pathname === `${base}/checkout/guest`,
    async (route) => {
      const outgoing = route.request();
      if (outgoing.method() !== "POST") {
        await route.continue();
        return;
      }
      const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
      checkout = {
        ok: response.ok(),
        headers: outgoing.headers(),
        submitted: outgoing.postDataJSON(),
        result: await response.json(),
      };
      await route.fulfill({ response });
    },
  );
  const checkoutResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `${base}/checkout/guest` &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirm booking with voucher", exact: true })
    .click();
  await checkoutResponse;
  expect(checkout).toBeDefined();
  expect(checkout.ok).toBe(true);
  expect(checkout.headers.authorization).toBeUndefined();
  const result = checkout.result;
  expect(result.status).toBe("confirmed");
  await expect(page).toHaveURL(
    new RegExp(`/checkout/success\\?orderId=${result.orderId}`),
  );
  await expect(
    page.getByRole("heading", {
      name: "Thank you for your booking",
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect(stripeRequests).toBe(0);
  expect((await readSession()).remainingCapacity).toBe(
    before.remainingCapacity - 1,
  );

  // Replaying the exact submitted attempt must return the same confirmed order.
  const replay = await request.post(api(`${base}/checkout/guest`), {
    headers: {
      Origin: tenantOrigin(E2E.alphaSlug),
      "Idempotency-Key": checkout.headers["idempotency-key"],
    },
    data: checkout.submitted,
  });
  expect(replay.ok()).toBe(true);
  expect(await replay.json()).toMatchObject({
    orderId: result.orderId,
    status: "confirmed",
  });
  expect((await readSession()).remainingCapacity).toBe(
    before.remainingCapacity - 1,
  );
  const status = await request.post(
    api(`${base}/checkout/guest/orders/${result.orderId}/status`),
    {
      data: { accessToken: result.accessToken },
    },
  );
  expect(status.ok()).toBe(true);
  expect(await status.json()).toMatchObject({
    isPaid: true,
    status: "processed_order",
    terminal: true,
  });
  const noProof = await request.post(
    api(`${base}/checkout/guest/orders/${result.orderId}/status`),
    { data: {} },
  );
  expect(noProof.status()).toBe(404);
  const remainingQuote = await request.post(
    api(`${base}/checkout/guest/voucher/quote`),
    {
      data: quoted.request().postDataJSON(),
    },
  );
  expect(remainingQuote.ok()).toBe(true);
  expect(await remainingQuote.json()).toMatchObject({
    voucherAppliedMinor: 500,
    remainingToPayMinor: 4000,
  });
});
