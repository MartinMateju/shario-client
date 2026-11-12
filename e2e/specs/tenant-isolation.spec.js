import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  openLogin,
  PASSWORD,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, isTenantRoute, tenantUrl } from "../helpers/urls.js";

test("rejects valid credentials presented to the wrong tenant", async ({
  page,
}) => {
  await openLogin(page, E2E.betaSlug);
  await page.getByLabel("E-mail").fill(USERS.owner);
  await page.getByLabel(/^Password\s*\*?$/).fill(PASSWORD);

  const responsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/customer", "POST"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  expect((await responsePromise).status()).toBe(401);
  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.betaSlug, "/login"),
  );
  const loginError = page
    .getByRole("form", { name: "Sign in", exact: true })
    .getByRole("alert");
  await expect(loginError).toHaveText("Wrong username or password");
  await expect(loginError).toBeVisible();
});

test("returns an authenticated user to their own tenant", async ({ page }) => {
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app"),
  );

  await page.goto(tenantUrl(E2E.betaSlug, "/app/products"), {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app"),
  );
  await expect(
    page.getByRole("button", {
      name: "Change studio: Alpha Main Studio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Studio operations",
      exact: true,
    }),
  ).toBeVisible();
});
