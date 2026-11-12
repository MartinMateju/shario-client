import { expect, test } from "@playwright/test";
import { responseForRequest, VISUAL_FIXED_TIME } from "./admin-fixtures.js";

const fixturePort =
  process.env.MEMBERSHIP_FIXTURE_PORT || (process.env.CI ? 4311 : 4107);
const languageSettings = {
  publicDefaultLanguage: "cs",
  supportedPublicLanguages: ["cs", "en"],
};

test("owner edits both studio languages and saves complete membership content", async ({
  page,
}, testInfo) => {
  const saved = [];
  const unexpected = [];
  const legacyPrices = [
    { currency: "CZK", amountMinor: 79000 },
    { currency: "EUR", amountMinor: 3533 },
  ];
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  await page.route(
    `http://api.shario.localhost:${fixturePort}/**`,
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      const headers = {
        "access-control-allow-origin":
          request.headers().origin ||
          new URL(testInfo.project.use.baseURL).origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      };
      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      let response;
      if (
        method === "PATCH" &&
        url.pathname === "/memberships/plans/member-plan"
      ) {
        const payload = request.postDataJSON();
        saved.push(payload);
        response = {
          plan: { id: "member-plan", draftVersion: payload, status: "draft" },
        };
      } else if (method === "GET" && url.pathname === "/memberships/plans") {
        response = {
          plans: [
            {
              id: "member-plan",
              status: "draft",
              draftVersion: {
                name: "Členství",
                prices: legacyPrices,
                billing: {
                  type: "recurring",
                  interval: "month",
                  intervalCount: 1,
                },
                locationScope: { type: "all", locationIds: [] },
                benefits: [],
              },
            },
          ],
          total: 1,
          page: 1,
          pages: 1,
        };
      } else {
        response = responseForRequest({ method, url });
      }
      if (response?.tenant?.settings) {
        response.tenant.settings = {
          ...response.tenant.settings,
          ...languageSettings,
        };
      }
      if (url.pathname === "/tenants/current/settings" && response?.settings) {
        response.settings = { ...response.settings, ...languageSettings };
      }
      if (response === null) unexpected.push(`${method} ${url.pathname}`);
      await route.fulfill({
        status:
          method === "POST" && url.pathname === "/auth/customer/refresh"
            ? 401
            : response === null
              ? 501
              : 200,
        headers,
        json: response || { message: "No fixture" },
      });
    },
  );
  await page.goto("/en/app/products?category=memberships", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Currency", { exact: true })).toHaveValue(
    "CZK",
  );
  await expect(dialog.getByLabel("Currency", { exact: true })).toHaveAttribute(
    "readonly",
  );
  await expect(dialog.getByRole("combobox", { name: "Currency" })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "Add currency" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Remove price" }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Amount", { exact: true })).toHaveCount(1);
  await dialog
    .getByLabel("Plan name · Čeština", { exact: true })
    .fill("Členství pro radost");
  await dialog
    .getByLabel("Plan name · English", { exact: true })
    .fill("Membership for joy");
  await dialog
    .getByLabel("Description · Čeština", { exact: true })
    .fill("Český popis členství");
  await dialog
    .getByLabel("Description · English", { exact: true })
    .fill("English membership description");
  await dialog.getByLabel("Amount", { exact: true }).fill("890");
  await dialog.getByRole("button", { name: /^Custom perk/ }).click();
  await dialog
    .getByLabel("Customer-facing label · Čeština", { exact: true })
    .fill("Káva zdarma");
  await dialog
    .getByLabel("Customer-facing label · English", { exact: true })
    .fill("Free coffee");
  await dialog
    .getByLabel(/^Membership terms · Čeština/)
    .fill("České podmínky členství");
  await dialog
    .getByLabel("Membership terms · English", { exact: true })
    .fill("English membership terms");
  await dialog
    .getByLabel("Plan name · Čeština", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("membership-translations-editor.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0]).toMatchObject({
    sourceLanguage: "cs",
    name: "Členství pro radost",
    description: "Český popis členství",
    terms: "České podmínky členství",
    prices: [{ currency: "CZK", amountMinor: 89000 }, legacyPrices[1]],
    translations: {
      en: {
        name: "Membership for joy",
        description: "English membership description",
        terms: "English membership terms",
      },
    },
    benefits: [
      { label: "Káva zdarma", translations: { en: { label: "Free coffee" } } },
    ],
  });
  await expect(dialog).not.toBeVisible();
  expect(unexpected).toEqual([]);
});
