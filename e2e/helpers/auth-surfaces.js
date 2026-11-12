import { PASSWORD, isApiResponse, openLogin } from "./auth.js";
import { isTenantRoute, platformUrl } from "./urls.js";

export { PASSWORD, USERS, isApiResponse, openLogin } from "./auth.js";

export async function openWorkspaceLogin(page) {
  await page.goto(platformUrl("/login"), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
}

export async function loginWorkspaceAs(
  page,
  { slug, email, password = PASSWORD, expectedPath = "/app" },
) {
  await openWorkspaceLogin(page);

  await page.getByLabel("Workspace URL", { exact: true }).fill(slug);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth", "POST"),
  );

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const response = await loginResponsePromise;

  if (!response.ok()) {
    throw new Error(
      `Workspace login failed with ${response.status()}: ${await response.text()}`,
    );
  }

  await page.waitForURL((url) => isTenantRoute(url, slug, expectedPath));
  // The tenant URL commits before its refresh finishes. Wait for the signed-in
  // workspace before a later full navigation can interrupt that refresh.
  await page.locator('[data-workspace-ui="true"]').waitFor();

  return response;
}

export async function loginCustomerAs(
  page,
  { slug, email, password = PASSWORD, expectedPath = "/portal" },
) {
  await openLogin(page, slug);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/customer", "POST"),
  );

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const response = await loginResponsePromise;

  if (!response.ok()) {
    throw new Error(
      `Customer login failed with ${response.status()}: ${await response.text()}`,
    );
  }

  await page.waitForURL((url) => isTenantRoute(url, slug, expectedPath));

  return response;
}
