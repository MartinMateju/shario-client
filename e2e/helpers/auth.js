import { isTenantRoute, tenantOrigin, tenantUrl } from "./urls.js";

export const PASSWORD = "Playwright!123";

export const USERS = Object.freeze({
  owner: "owner@studio-alpha.test",
  viewer: "viewer@studio-alpha.test",
  customer: "customer@studio-alpha.test",
  betaOwner: "owner@studio-beta.test",
});

export function isApiResponse(response, pathname, method = "GET") {
  const url = new URL(response.url());

  return (
    url.pathname === pathname &&
    response.request().method() === method.toUpperCase()
  );
}

export async function openLogin(page, slug) {
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: tenantOrigin(slug),
      sameSite: "Lax",
    },
  ]);

  await page.goto(tenantUrl(slug, "/login"), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
}

export async function loginAs(
  page,
  { slug, email, password = PASSWORD, expectedPath = "/app" },
) {
  await openLogin(page, slug);

  await page.getByLabel(/^e-?mail\s*\*?$/i).fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth", "POST"),
  );

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const response = await loginResponsePromise;

  if (!response.ok()) {
    throw new Error(
      `Login for ${email} failed with ${response.status()}: ${await response.text()}`,
    );
  }

  await page.waitForURL((url) => isTenantRoute(url, slug, expectedPath));

  return response;
}
