import { test, expect } from "../fixtures/test.js";
import { isApiResponse, PASSWORD, USERS } from "../helpers/auth.js";
import { E2E, customTenantUrl, tenantUrl } from "../helpers/urls.js";

const selectCourseAndStartAccountBooking = async ({ page, detailUrl }) => {
  await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Alpha Workshop",
    }),
  ).toBeVisible();

  const session = page.locator('input[name="course-session"]').first();
  await session.waitFor();
  await session.check();

  const intentResponsePromise = page.waitForResponse((response) =>
    isApiResponse(
      response,
      "/public/tenants/studio-alpha/booking-intents",
      "POST",
    ),
  );
  await page
    .getByRole("button", { name: "Book with my account", exact: true })
    .click();

  const intentResponse = await intentResponsePromise;
  expect(intentResponse.ok()).toBe(true);
  await expect(page).toHaveURL((url) => {
    const next = url.searchParams.get("next") || "";
    return (
      url.pathname === "/en/login" &&
      next.startsWith("/portal/booking/confirm?intent=")
    );
  });
};

const signInAndExpectRestoredConfirmation = async ({ page, hostname }) => {
  await page.getByLabel(/^e-?mail\s*\*?$/i).fill(USERS.customer);
  await page.getByLabel(/^Password\s*\*?$/).fill(PASSWORD);

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(
      response,
      hostname === E2E.alphaCustomHostname
        ? "/api/tenant-auth/auth/customer"
        : "/auth/customer",
      "POST",
    ),
  );
  const restoreResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      /^\/booking-intents\/[A-Za-z0-9._~-]+$/.test(url.pathname) &&
      response.request().method() === "GET"
    );
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), await loginResponse.text()).toBe(true);
  if (hostname === E2E.alphaCustomHostname) {
    expect(new URL(loginResponse.url()).hostname).toBe(hostname);
  }
  expect((await restoreResponsePromise).ok()).toBe(true);
  await expect(page).toHaveURL((url) => {
    return (
      url.hostname === hostname &&
      url.pathname === "/en/portal/booking/confirm" &&
      Boolean(url.searchParams.get("intent"))
    );
  });
  await expect(
    page.getByRole("heading", { level: 1, name: "Review and confirm" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your selection is available", { exact: true }),
  ).toBeVisible();
};

test("restores an anonymous selection after customer login on a tenant subdomain", async ({
  page,
  e2eState,
}) => {
  const productId = e2eState.products.alpha.id;
  await selectCourseAndStartAccountBooking({
    page,
    detailUrl: tenantUrl(E2E.alphaSlug, `/courses/${productId}`),
  });
  await signInAndExpectRestoredConfirmation({
    page,
    hostname: `${E2E.alphaSlug}.shario.localhost`,
  });
});

test(
  "keeps booking intent restoration on the tenant custom domain",
  { tag: "@custom-domain-auth" },
  async ({ page, e2eState }) => {
    const productId = e2eState.products.alpha.id;
    await selectCourseAndStartAccountBooking({
      page,
      detailUrl: customTenantUrl(
        E2E.alphaCustomHostname,
        `/courses/${productId}`,
      ),
    });
    await signInAndExpectRestoredConfirmation({
      page,
      hostname: E2E.alphaCustomHostname,
    });
  },
);
