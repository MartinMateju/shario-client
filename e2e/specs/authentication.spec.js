import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  loginCustomerAs,
  openLogin,
  PASSWORD,
  USERS,
} from "../helpers/auth-surfaces.js";
import {
  E2E,
  isPlatformRoute,
  isTenantRoute,
  platformUrl,
  tenantUrl,
} from "../helpers/urls.js";

test.describe("tenant authentication", () => {
  test("shows a focused error after a failed login", async ({ page }) => {
    await openLogin(page, E2E.alphaSlug);

    await page.getByLabel("E-mail").fill(USERS.owner);
    await page.getByLabel("Password").fill("Definitely-wrong-password");

    const responsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/auth/customer", "POST"),
    );

    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    expect((await responsePromise).status()).toBe(401);
    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/login"),
    );

    const error = page.getByText("Incorrect email or password.", {
      exact: true,
    });
    await expect(error).toBeVisible();
    await expect(error).toBeFocused();
  });

  test("routes an owner to the app and restores the session after reload", async ({
    page,
  }) => {
    await loginWorkspaceAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.owner,
      password: PASSWORD,
    });

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app"),
    );
    await expect(
      page.getByRole("region", { name: "Today’s studio overview" }),
    ).toBeVisible();

    await page.evaluate(() => window.localStorage.clear());

    const refreshResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/auth/refresh", "POST"),
    );
    await page.reload({ waitUntil: "domcontentloaded" });

    expect((await refreshResponsePromise).status()).toBe(200);
    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app"),
    );
    await expect(
      page.getByRole("region", { name: "Today’s studio overview" }),
    ).toBeVisible();
  });

  test("routes the public Customer portal action through customer login", async ({
    page,
  }) => {
    await page.goto(tenantUrl(E2E.alphaSlug, "/"), {
      waitUntil: "domcontentloaded",
    });

    await page
      .getByRole("link", { name: "Customer portal", exact: true })
      .click();

    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/login") &&
        url.searchParams.get("next") === "/portal"
      );
    });
  });

  test("opens the customer portal from the public header for a customer session", async ({
    page,
  }) => {
    await loginCustomerAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.customer,
    });

    await page.goto(tenantUrl(E2E.alphaSlug, "/"), {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("link", { name: "Customer portal", exact: true })
      .click();

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/portal"),
    );
  });

  test("routes a customer session to the customer portal", async ({ page }) => {
    await loginCustomerAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.customer,
      password: PASSWORD,
    });

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/portal"),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: /^Welcome\b/i }),
    ).toBeVisible();
  });

  test("preserves a studio-specific portal link through login and rejects a stale studio intent", async ({
    page,
    e2eState,
  }) => {
    const location = e2eState.locations.alpha;
    const directPath = `/portal?location=${location.slug}`;

    await page.goto(tenantUrl(E2E.alphaSlug, directPath), {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/login") &&
        url.searchParams.get("next") === directPath
      );
    });
    await expect(
      page.getByText(`Sign in to continue to ${location.name}.`, {
        exact: true,
      }),
    ).toBeVisible();

    await page.getByLabel("E-mail").fill(USERS.customer);
    await page.getByLabel("Password").fill(PASSWORD);
    const loginResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/auth/customer", "POST"),
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    expect((await loginResponsePromise).status()).toBe(200);
    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/portal") &&
        url.searchParams.get("location") === location.slug
      );
    });
    await expect(
      page.getByText(location.name, { exact: true }).first(),
    ).toBeVisible();

    await page.goto(
      tenantUrl(E2E.alphaSlug, "/portal?location=removed-studio"),
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Which studio would you like to visit?",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("The studio from this link is not currently available."),
    ).toBeVisible();

    await page.getByRole("button", { name: `Open ${location.name}` }).click();
    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/portal") &&
        url.searchParams.get("location") === location.slug
      );
    });
  });

  test("keeps a customer out of workspace-only routes", async ({ page }) => {
    await loginCustomerAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.customer,
    });

    await page.goto(tenantUrl(E2E.alphaSlug, "/app/products"), {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL((url) => isPlatformRoute(url, "/login"));
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Products & services" }),
    ).toHaveCount(0);
  });

  test("requires a customer session for portal and accepts the owner's same credentials", async ({
    page,
  }) => {
    await loginWorkspaceAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.owner,
    });

    await page.goto(tenantUrl(E2E.alphaSlug, "/portal/bookings"), {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/login") &&
        url.searchParams.get("next") === "/portal/bookings"
      );
    });

    await page.getByLabel("E-mail").fill(USERS.owner);
    await page.getByLabel("Password").fill(PASSWORD);

    const customerLoginResponse = page.waitForResponse((response) =>
      isApiResponse(response, "/auth/customer", "POST"),
    );

    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    expect((await customerLoginResponse).status()).toBe(200);

    await expect(page).toHaveURL((url) => {
      return (
        isTenantRoute(url, E2E.alphaSlug, "/portal") &&
        url.searchParams.get("tab") === "my-bookings"
      );
    });
  });

  test("logs out, clears the refresh session and protects the app", async ({
    page,
  }) => {
    await loginWorkspaceAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.owner,
    });

    await page.getByRole("button", { name: "User menu" }).click();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible();

    const logoutResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/auth/logout", "POST"),
    );
    await page.getByRole("button", { name: "Log out", exact: true }).click();

    expect((await logoutResponsePromise).status()).toBe(200);
    await page.waitForURL((url) => isPlatformRoute(url, "/login"));

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => isPlatformRoute(url, "/login"));
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();

    const persistedPlatformState = await page.evaluate(() => {
      const value = window.localStorage.getItem("persist:root");

      return value ? JSON.parse(value) : null;
    });

    expect(persistedPlatformState?.auth).toBeUndefined();

    await page.goto(platformUrl("/login"), {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL((url) => isPlatformRoute(url, "/login"));

    await page.goto(tenantUrl(E2E.alphaSlug, "/app"), {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL((url) => isPlatformRoute(url, "/login"));
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  });

  test("redirects an unauthenticated app deep link to workspace login", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "shario_language",
        value: "EN",
        url: `http://${E2E.alphaSlug}.shario.localhost:4310`,
        sameSite: "Lax",
      },
    ]);

    await page.goto(tenantUrl(E2E.alphaSlug, "/app/products"), {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL((url) => isPlatformRoute(url, "/login"));
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  });
});
