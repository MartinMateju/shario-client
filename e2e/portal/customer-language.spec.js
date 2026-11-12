import { expect, test } from "@playwright/test";

const TENANT_ORIGIN = "http://studio-language.shario.localhost:4310";
const API_ORIGIN = "http://127.0.0.1:4311";
const CURRENT_COOKIE = "SHARIO_CUSTOMER_LANGUAGE_CURRENT_studio-language";
const DEFAULT_COOKIE = "SHARIO_CUSTOMER_LANGUAGE_DEFAULT_studio-language";

async function saveFixtureDefault(request, defaultLanguage) {
  const response = await request.patch(
    `${API_ORIGIN}/account/customer-preferences`,
    {
      headers: { Origin: TENANT_ORIGIN },
      data: { defaultLanguage },
    },
  );
  expect(response.ok()).toBe(true);
}

async function openProfile(page) {
  if ((page.viewportSize()?.width || 0) >= 1280) {
    await page
      .locator("[data-profile-menu-trigger]")
      .filter({ visible: true })
      .click();
  } else {
    await page
      .locator('button[aria-controls="mobile-menu"]')
      .filter({ visible: true })
      .click();
    await page.locator("[data-customer-portal-mobile-account]").click();
  }
  const sheet = page.locator("[data-customer-portal-profile-sheet]");
  await expect(sheet).toBeVisible();
  return sheet;
}

test.beforeEach(async ({ request, page }) => {
  await saveFixtureDefault(request, null);
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text y="30">Nami</text></svg>',
    }),
  );
});

test("an English browser enters the studio website in its primary Czech language", async ({
  page,
}) => {
  await page.goto(TENANT_ORIGIN, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(
    (url) => url.pathname === "/cs" || url.pathname === "/cs/",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "cs");
});

test("legacy booking entry uses Czech and preserves the query", async ({
  page,
}) => {
  await page.goto(
    `${TENANT_ORIGIN}/rezervace?location=atelier-brno&source=language-test`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/cs/portal" &&
      url.searchParams.get("location") === "atelier-brno" &&
      url.searchParams.get("source") === "language-test",
  );
  await expect(page.locator("[data-customer-portal-page]")).toBeVisible();
});

test("the profile language selector changes only this visit and preserves query and hash", async ({
  page,
  context,
  request,
}) => {
  await page.goto(
    `${TENANT_ORIGIN}/cs/portal/account?location=atelier-brno&source=language-test#language`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(
    page.getByRole("combobox", { name: "Aktuální jazyk" }),
  ).toHaveValue("cs");
  const sheet = await openProfile(page);
  await sheet
    .locator("select[data-language-selector-trigger]")
    .selectOption("en");
  await expect(page).toHaveURL(
    `${TENANT_ORIGIN}/en/portal/account?location=atelier-brno&source=language-test#language`,
  );
  await expect(
    page.getByRole("combobox", { name: "Current language" }),
  ).toHaveValue("en");
  await expect(
    page.getByRole("combobox", { name: "Default language" }),
  ).toHaveValue("");
  expect(
    (await context.cookies(TENANT_ORIGIN)).find(
      (cookie) => cookie.name === CURRENT_COOKIE,
    )?.value,
  ).toBe("en");
  const account = await request.get(`${API_ORIGIN}/account`, {
    headers: { Origin: TENANT_ORIGIN },
  });
  expect((await account.json()).account.customerDefaultLanguage).toBeNull();
});

test("saving a default retains the current visit and applies on a later entry without a session choice", async ({
  page,
  context,
}) => {
  await page.goto(
    `${TENANT_ORIGIN}/cs/portal/account?location=atelier-brno#language`,
    { waitUntil: "domcontentloaded" },
  );
  await page
    .getByRole("combobox", { name: "Výchozí jazyk", exact: true })
    .selectOption("en");
  const preferenceResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/account/customer-preferences" &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Uložit výchozí jazyk" }).click();
  expect((await preferenceResponse).ok()).toBe(true);
  await expect(page.getByRole("status")).toHaveText(
    "Výchozí jazyk byl uložen. Aktuální jazyk zůstává beze změny.",
  );
  await expect(page).toHaveURL(
    `${TENANT_ORIGIN}/cs/portal/account?location=atelier-brno#language`,
  );
  await expect(
    page.getByRole("combobox", { name: "Aktuální jazyk" }),
  ).toHaveValue("cs");
  expect(
    (await context.cookies(TENANT_ORIGIN)).find(
      (cookie) => cookie.name === DEFAULT_COOKIE,
    )?.value,
  ).toBe("en");

  await page.goto(
    `${TENANT_ORIGIN}/portal/account?location=atelier-brno#language`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(
    page.getByRole("combobox", { name: "Aktuální jazyk" }),
  ).toHaveValue("cs");
  await expect(
    page.getByRole("combobox", { name: "Výchozí jazyk", exact: true }),
  ).toHaveValue("en");

  await context.clearCookies({ name: CURRENT_COOKIE });
  await page.goto(
    `${TENANT_ORIGIN}/portal/account?location=atelier-brno#language`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).toHaveURL(
    `${TENANT_ORIGIN}/en/portal/account?location=atelier-brno#language`,
  );
  await expect(
    page.getByRole("combobox", { name: "Current language" }),
  ).toHaveValue("en");
  await expect(
    page.getByRole("combobox", { name: "Default language" }),
  ).toHaveValue("en");
});

test("an explicit English URL stays English even when the saved default is Czech", async ({
  page,
  request,
}, testInfo) => {
  await saveFixtureDefault(request, "cs");
  await page.goto(`${TENANT_ORIGIN}/en/portal/account?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("combobox", { name: "Current language" }),
  ).toHaveValue("en");
  await expect(
    page.getByRole("combobox", { name: "Default language" }),
  ).toHaveValue("cs");
  await expect(page).toHaveURL(
    `${TENANT_ORIGIN}/en/portal/account?location=atelier-brno`,
  );
  await page.screenshot({
    path: testInfo.outputPath("account-language.png"),
    fullPage: true,
  });
});
