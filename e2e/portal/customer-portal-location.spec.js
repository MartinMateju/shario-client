import { expect, test } from "@playwright/test";

const BRNO = { reference: "atelier-brno", name: /Atelier Brno/i };
const PRAGUE = { reference: "atelier-prague", name: /Atelier Prague/i };

const studioSwitcher = (page) =>
  page
    .locator("[data-customer-calendar-studio-selector]")
    .locator("[data-customer-studio-switcher-trigger]")
    .filter({ visible: true })
    .first();

async function expectStudio(page, studio) {
  await expect(page.locator("[data-customer-portal-overview]")).toBeVisible();
  // Run actionability checks so the optional tour handler dismisses a modal
  // before asserting the underlying control's accessible name.
  await studioSwitcher(page).click({ trial: true });
  await expect(studioSwitcher(page)).toHaveAccessibleName(studio.name);
  await expect(page.getByTestId("portal-location-chooser")).toBeHidden();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("location"))
    .toBe(studio.reference);
}

test.beforeEach(async ({ page }) => {
  // The optional introductory tour is unrelated to studio selection. Dismiss
  // it only if it appears and obstructs an action; its absence is valid.
  await page.addLocatorHandler(
    page.locator("[data-customer-portal-tour-dismiss]"),
    async (dismiss) => {
      await dismiss.click();
    },
  );
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text x="0" y="28">Nami</text></svg>',
    }),
  );
});

test("remembers the chosen studio through a bare portal navigation and reload", async ({
  page,
}) => {
  await page.goto("/en/portal");
  const chooser = page.getByTestId("portal-location-chooser");
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: PRAGUE.name }).click();
  await expectStudio(page, PRAGUE);

  // A fresh document discards React state, as an external checkout return does.
  await page.goto("/en/portal");
  await expectStudio(page, PRAGUE);
  await page.reload();
  await expectStudio(page, PRAGUE);
});

test("an explicit URL and a subsequent studio switch override the remembered studio", async ({
  page,
}) => {
  await page.goto(`/en/portal?location=${PRAGUE.reference}`);
  await expectStudio(page, PRAGUE);

  await page.goto(`/en/portal?location=${BRNO.reference}`);
  await expectStudio(page, BRNO);
  await page.goto("/en/portal");
  await expectStudio(page, BRNO);

  await studioSwitcher(page).click();
  await page.getByRole("option", { name: PRAGUE.name }).click();
  await expectStudio(page, PRAGUE);
  await page.goto("/en/portal");
  await expectStudio(page, PRAGUE);
});

test("an unavailable explicit URL never silently opens the remembered studio", async ({
  page,
}) => {
  await page.goto(`/en/portal?location=${PRAGUE.reference}`);
  await expectStudio(page, PRAGUE);

  await page.goto("/en/portal?location=unavailable-studio");
  await expect(page.getByTestId("portal-location-chooser")).toBeVisible();
  await expect(page.locator("[data-customer-portal-overview]")).toBeHidden();
  expect(new URL(page.url()).searchParams.get("location")).toBe(
    "unavailable-studio",
  );
});

test("a confirmed payment returns to its checkout studio instead of the previous selection", async ({
  page,
}) => {
  await page.route(
    "**/orders/mine/location-return-order/confirmation",
    (route) => {
      if (route.request().method() !== "GET") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": route.request().headers().origin,
        },
        body: JSON.stringify({
          status: "processed_order",
          isPaid: true,
          terminal: true,
          confirmation: {
            bookings: [
              {
                location: {
                  id: "64b000000000000000000021",
                  slug: BRNO.reference,
                  name: "Atelier Brno",
                },
              },
            ],
          },
        }),
      });
    },
  );
  await page.goto(`/en/portal?location=${PRAGUE.reference}`);
  await expectStudio(page, PRAGUE);

  // The payment provider returns only an order reference. The verified order
  // supplies the studio, with no real checkout or payment request involved.
  await page.goto("/en/portal/success?orderId=location-return-order");
  const returnToPortal = page.getByRole("link", {
    name: /Proceed to bookings/i,
  });
  await expect(returnToPortal).toHaveAttribute(
    "href",
    new RegExp(`/en/portal\\?location=${BRNO.reference}$`),
  );
  // An unconfigured logo is inert, including on payment confirmation. The
  // confirmation's explicit booking link returns to the verified order's studio.
  const headerLogo = page
    .getByRole("banner")
    .locator('span[aria-label="Atelier Nami"]')
    .filter({ visible: true })
    .first();
  await expect(headerLogo).toBeVisible();
  const confirmationUrl = page.url();
  await headerLogo.click();
  await expect(page).toHaveURL(confirmationUrl);

  await returnToPortal.click();
  await expectStudio(page, BRNO);
  await page.goto("/en/portal");
  await expectStudio(page, BRNO);
});

test("remembered locations remain scoped to their tenant", async ({
  context,
  page,
  baseURL,
}) => {
  await page.goto(`/en/portal?location=${PRAGUE.reference}`);
  await expectStudio(page, PRAGUE);

  const alphaOrigin = new URL(baseURL).origin;
  const betaOrigin = alphaOrigin.replace("studio-alpha.", "studio-beta.");
  const alphaStorage = await page.evaluate(() => Object.entries(localStorage));
  // Even if a browser carries old storage to another tenant, its remembered
  // selection must not apply there. The fixture deliberately reuses the same
  // location references so tenant scoping, rather than a failed lookup, wins.
  await context.addInitScript(
    ({ origin, entries }) => {
      if (location.origin !== origin) return;
      for (const [key, value] of entries) localStorage.setItem(key, value);
    },
    { origin: betaOrigin, entries: alphaStorage },
  );

  await page.goto(`${betaOrigin}/en/portal`);
  const chooser = page.getByTestId("portal-location-chooser");
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: BRNO.name }).click();
  await expectStudio(page, BRNO);

  await page.goto(`${alphaOrigin}/en/portal`);
  await expectStudio(page, PRAGUE);
});
