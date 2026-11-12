import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("tenant logout navigation", () => {
  it.each([
    "src/components/headers/Header.js",
    "src/components/headers/UserProfileMenu.js",
  ])("hands %s off to central platform logout", (relativePath) => {
    const source = read(relativePath);
    const logoutHandler = source.slice(source.indexOf("const handleLogout"));

    expect(logoutHandler).toContain("buildPlatformUrl");
    expect(logoutHandler).toContain('pathname: "/logout"');
    expect(logoutHandler).toContain("window.location.replace");
    expect(logoutHandler).not.toContain("sendLogout");
    expect(logoutHandler).not.toContain("dispatch(logOut())");
  });

  it("revokes and clears the session on the central origin before login", () => {
    const logoutPage = read("src/app/[locale]/logout/page.js");

    expect(logoutPage).toContain("dispatch(logOut())");
    expect(logoutPage).toContain("apiSlice.util.resetApiState()");
    expect(logoutPage).toContain("sendLogout()");
    expect(logoutPage).toContain('pathname: "/login"');
    expect(logoutPage).toContain("window.location.replace");
  });

  it("does not persist access tokens or race logout with refresh restoration", () => {
    const store = read("src/lib/store.js");
    const tokenRefresh = read("src/hooks/useTokenRefresh.js");
    const cacheIsolation = read(
      "src/lib/features/auth/authCacheIsolationMiddleware.js",
    );

    expect(store).toContain("version: 5");
    expect(store).toContain("const { auth: _legacyAuth, ...persistedState }");
    expect(store).toContain('whitelist: ["cart", "studioContext"]');
    expect(store).not.toContain('whitelist: ["auth", "cart", "studioContext"]');

    expect(tokenRefresh).toContain("isPlatformLogoutHandoff()");
    expect(tokenRefresh).toContain("customerRefresh");
    expect(tokenRefresh).toContain("workspaceRefresh");
    expect(tokenRefresh).toContain("beginAuthContextTransition");
    expect(tokenRefresh).toContain("restoreAuthSession");
    expect(cacheIsolation).toContain("apiSlice.util.resetApiState()");
    expect(tokenRefresh).not.toContain("if (token)");
  });

  it("waits for the cookie-authoritative bootstrap before auto-redirecting login", () => {
    const loginPage = read("src/app/[locale]/login/page.js");

    expect(loginPage).toContain("selectIsSessionReady");
    expect(loginPage).toContain(
      "if (!sessionReady || !isAuthenticated || !currentUser)",
    );
  });
});
