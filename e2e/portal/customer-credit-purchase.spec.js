import { expect, test } from "@playwright/test";

const copy = {
  cs: {
    open: "Přidat kredity",
    title: "Zakoupit kredity",
    close: "Zavřít",
    cancel: "Zrušit",
    purchase: /^Zakoupit/,
    selected: "Vybráno",
  },
  en: {
    open: "Add credits",
    title: "Purchase Credits",
    close: "Close",
    cancel: "Cancel",
    purchase: /^Purchase /,
    selected: "Selected",
  },
};

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(
    page.locator("[data-customer-portal-tour-dismiss]"),
    (dismiss) => dismiss.click(),
  );
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text x="0" y="28">Nami</text></svg>',
    }),
  );
});

async function openPurchase(page, locale) {
  await page.goto(`/${locale}/portal/credits?location=atelier-brno`);
  await page
    .getByRole("button", { name: copy[locale].open, exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: copy[locale].title });
  await expect(dialog.locator("[data-credit-purchase-panel]")).toBeVisible();
  await expect(dialog.locator("input:checked")).toHaveValue("1000");
  return dialog;
}

async function expectControlsReachable(page, dialog, locale) {
  const purchase = dialog.getByRole("button", { name: copy[locale].purchase });
  const close = dialog.getByRole("button", {
    name: copy[locale].close,
    exact: true,
  });
  for (const control of [purchase, close]) {
    await expect(control).toBeInViewport({ ratio: 1 });
    // Trial checks include hit testing: a clipped or covered button fails.
    await control.click({ trial: true });
  }
  const geometry = await dialog
    .locator("[data-credit-purchase-panel]")
    .evaluate((panel) => {
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        overflow: panel.scrollWidth - panel.clientWidth,
      };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
}

for (const locale of ["cs", "en"]) {
  test(`${locale}: purchase controls remain reachable and packages scroll on every screen`, async ({
    page,
  }, testInfo) => {
    let purchaseRequests = 0;
    await page.route("**/credits/purchase", (route) => {
      purchaseRequests += 1;
      return route.abort();
    });
    const dialog = await openPurchase(page, locale);
    await expectControlsReachable(page, dialog, locale);
    for (const amount of [500, 1000, 1500, 2000]) {
      await dialog
        .locator("[data-credit-package]")
        .filter({ has: page.locator(`input[value="${amount}"]`) })
        .click();
      await expect(dialog.locator("input:checked")).toHaveValue(String(amount));
      await expectControlsReachable(page, dialog, locale);
    }
    await expect(
      dialog.getByText(copy[locale].selected, { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`credit-modal-${locale}.png`),
    });
    await dialog
      .getByRole("button", { name: copy[locale].cancel, exact: true })
      .click();
    await expect(dialog.locator("[data-credit-purchase-panel]")).toBeHidden();
    expect(purchaseRequests).toBe(0);
    // Reopening resets the selection and preserves keyboard dismissal.
    await page
      .getByRole("button", { name: copy[locale].open, exact: true })
      .click();
    await expect(dialog.locator("input:checked")).toHaveValue("1000");
    await page.keyboard.press("Escape");
    await expect(dialog.locator("[data-credit-purchase-panel]")).toBeHidden();
  });
}

test("checkout errors keep the selection and allow retry to the selected payment", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  const requests = [];
  await page.route("**/credits/purchase", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: requests.length === 1 ? 503 : 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": route.request().headers().origin,
      },
      body: JSON.stringify(
        requests.length === 1
          ? { message: "Checkout temporarily unavailable" }
          : { url: "https://checkout.stripe.com/c/pay/credit-test-session" },
      ),
    });
  });
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Test checkout: 500 CZK</h1>",
    }),
  );
  const dialog = await openPurchase(page, "cs");
  await dialog
    .locator("[data-credit-package]")
    .filter({ has: page.locator('input[value="500"]') })
    .click();
  await dialog.getByRole("button", { name: copy.cs.purchase }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.locator("input:checked")).toHaveValue("500");
  await expectControlsReachable(page, dialog, "cs");
  await dialog.getByRole("button", { name: copy.cs.purchase }).click();
  await expect(
    page.getByRole("heading", { name: "Test checkout: 500 CZK" }),
  ).toBeVisible();
  expect(requests).toEqual([
    { amount: 500, locale: "cs", locationReference: "atelier-brno" },
    { amount: 500, locale: "cs", locationReference: "atelier-brno" },
  ]);
});

test("verified payment refreshes the balance and returns to the same studio", async ({
  page,
}) => {
  const orderId = "64b000000000000000000091";
  let paid = false;
  let checks = 0;
  const fulfill = (route, payload) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": route.request().headers().origin,
      },
      body: JSON.stringify(payload),
    });
  await page.route(`**/checkout/orders/${orderId}/status`, (route) => {
    if (route.request().method() !== "GET") return route.continue();
    paid = ++checks >= 2;
    return fulfill(route, {
      orderId,
      orderType: "credit-purchase",
      status: paid ? "processed_order" : "pending_order",
      isPaid: paid,
      terminal: paid,
    });
  });
  await page.route("**/credits/mine/balance", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return fulfill(route, { balance: paid ? 1400 : 400, currency: "CZK" });
  });
  await page.goto(
    `/en/portal/credits/purchase-success?orderId=${orderId}&location=atelier-brno`,
  );
  await expect(
    page.getByRole("heading", { name: "We are confirming your payment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your credits are ready" }),
  ).toBeVisible();
  const returnLink = page.getByRole("link", {
    name: "View credits",
    exact: true,
  });
  await expect(returnLink).toHaveAttribute(
    "href",
    "/en/portal/credits?location=atelier-brno",
  );
  await returnLink.click();
  await expect(
    page.getByRole("heading", { name: "Studio credits" }),
  ).toBeVisible();
  await expect(
    page.getByText(/1[, ]400\s*CZK|CZK\s*1[, ]400/).first(),
  ).toBeVisible();
  expect(checks).toBe(2);
});
