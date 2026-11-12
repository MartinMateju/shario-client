import { expect } from "../fixtures/test.js";
import { PASSWORD } from "./auth.js";
import { E2E, tenantOrigin, tenantUrl } from "./urls.js";

const api = (path) => `http://127.0.0.1:4311${path}`;
export async function createPaidBooking({ page, request, e2eState }) {
  const customer = e2eState.users.alphaBookingCustomer;
  const product = e2eState.products.alphaOpenStudio;
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: tenantOrigin(E2E.alphaSlug),
    },
  ]);
  await page.goto(tenantUrl(E2E.alphaSlug, `/book/${product.id}?date=${date}`));
  await page
    .getByRole("combobox", { name: "Planned activity", exact: true })
    .selectOption("SHARED_TABLE");
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Book with my account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await page.getByLabel("E-mail").fill(customer.email);
  await page.getByLabel(/^Password\s*\*?$/).fill(PASSWORD);
  const loginPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /^\/auth(?:\/customer)?(?:\/login)?$/.test(
        new URL(response.url()).pathname,
      ),
  );
  const quotePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /^\/booking-intents\/[^/]+$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const login = await loginPromise;
  expect(login.ok()).toBe(true);
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const read = async (path) => {
    const response = await request.get(api(path), { headers });
    expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
    return response.json();
  };
  const initialBalance = (await read("/credits/mine/balance")).balanceMinor;
  const initialQuote = await (await quotePromise).json();
  const originalAmount = initialQuote.quote.totalAmountMinor;
  await page.getByRole("radio", { name: /Use studio credit/ }).check();
  const terms = page.getByRole("checkbox", {
    name: "I have read and accept the booking terms.",
  });
  if (await terms.count()) await terms.check();
  const checkoutPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /^\/booking-intents\/[^/]+\/checkout$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  const checkout = await checkoutPromise;
  expect(checkout.ok()).toBe(true);
  const order = await checkout.json();
  expect(order.status).toBe("confirmed");
  await expect(page).toHaveURL(
    new RegExp(`/portal/success\\?orderId=${order.orderId}`),
  );
  const bookings = (await read("/bookings/mine")).bookings;
  expect(bookings).toHaveLength(1);
  return {
    read,
    headers,
    booking: bookings[0],
    initialBalance,
    originalAmount,
  };
}

export async function scenario(request, bookingId, name) {
  const response = await request.post(api("/__e2e/booking-edit-scenario"), {
    headers: {
      "x-e2e-key": process.env.E2E_TEST_KEY || "shario-e2e-local-key",
    },
    data: { bookingId, scenario: name },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
