import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
describe("customer authentication boundary contract", () => {
  it("uses dedicated customer login, refresh, and logout endpoints", () => {
    const authApi = read("src/lib/features/auth/authApiSlice.js");
    expect(authApi).toContain('url: "/auth/customer"');
    expect(authApi).toContain('url: "/auth/customer/refresh"');
    expect(authApi).toContain('url: "/auth/customer/logout"');
    expect(authApi).toContain("isAuthResponseForContext");
    expect(authApi).toContain("validateContextualAuthResponse");
    expect(authApi).toContain("createContextualAuthLifecycle");
    expect(authApi).toContain("query: buildCustomerLoginRequest");
  });
  it("restores by browser surface with epoch gating and centralized cache isolation", () => {
    const refreshHook = read("src/hooks/useTokenRefresh.js");
    const apiSlice = read("src/lib/features/api/apiSlice.js");
    const cacheMiddleware = read(
      "src/lib/features/auth/authCacheIsolationMiddleware.js",
    );
    expect(refreshHook).toContain("resolveAuthContextForLocation");
    expect(refreshHook).toContain("beginAuthContextTransition");
    expect(refreshHook).toContain("createAuthRequestSnapshot");
    expect(refreshHook).toContain("restoreAuthSession");
    expect(refreshHook).toContain("isCustomerSocialCompletePath(pathname)");
    expect(refreshHook).toContain("isContextualLoginHandoff()");
    expect(apiSlice).toContain("getRefreshEndpointForAuthContext(authContext)");
    expect(apiSlice).toContain("isAuthRequestCurrent");
    expect(apiSlice).toContain("completeAuthRequest");
    expect(cacheMiddleware).toContain("apiSlice.util.resetApiState()");
    expect(cacheMiddleware).toContain("identityReplaced");
  });
  it("preserves contextual central sign-in routing for pure customers", () => {
    const centralLogin = read("src/app/[locale]/login/page.js");
    const centralRouting = read("src/components/auth/platformAuthRouting.js");
    const authApi = read("src/lib/features/auth/authApiSlice.js");
    expect(centralLogin).toContain("authContext: result.authContext");
    expect(centralLogin).toContain("authContext: currentUser.authContext");
    expect(centralRouting).toContain("getTenantPostLoginPath");
    expect(centralRouting).toContain("normalizeAuthContext");
    expect(centralRouting).toContain("AUTH_CONTEXTS.CUSTOMER");
    expect(authApi).toContain(
      "transformResponse: validateContextualAuthResponse",
    );
    expect(authApi).toContain("onQueryStarted: createContextualAuthLifecycle");
  });
  it("keeps tenant login customer-only and restores only a safe customer next path", () => {
    const login = read(
      "src/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page.js",
    );
    expect(login).toContain("useCustomerLoginMutation");
    expect(login).toContain('router.replace(safeNextPath || "/portal", {');
    expect(login).not.toContain("useLoginMutation");
    expect(login).not.toContain('router.replace("/app")');
    expect(login).not.toContain("buildInternalAdminUrl");
  });
  it("clears a tenant-mismatched customer session into requested-tenant login", () => {
    const boundary = read("src/components/auth/TenantSurfaceBoundary.js");
    const mismatchBranch = boundary.slice(
      boundary.indexOf("authenticatedTenantSlug !== routeTenantSlug"),
      boundary.indexOf("if (isWorkspaceSurface && !userAccess.isTenantUser)"),
    );
    expect(mismatchBranch).toContain("!isWorkspaceSurface");
    expect(mismatchBranch).toContain(
      "logOut({ authContext: AUTH_CONTEXTS.CUSTOMER })",
    );
    expect(mismatchBranch).toContain("router.replace(customerLoginHref)");
    expect(mismatchBranch).not.toContain("sendCustomerLogout");
  });
  it("renders booking links with authenticated and anonymous customer hrefs", () => {
    const header = read("src/components/headers/Header.js");
    const desktop = read("src/components/headers/DesktopActions.js");
    const mobileMenu = read("src/components/headers/MobileMenu.js");
    const mobileRight = read("src/components/headers/MobileRight.js");
    expect(header).toContain(
      "const defaultCustomerPortalPath = buildCustomerPortalPath({",
    );
    expect(header).toContain(
      "const customerPortalPath = isCustomerPortalPageEnabled(",
    );
    expect(header).toContain("getCustomerPortalFallbackHref(");
    expect(header).toContain(
      "locationReference: customerPortalLocationReference,",
    );
    expect(header).toContain(
      'buildTenantAuthHref("/login", customerPortalPath)',
    );
    expect(header).toContain("selectIsCustomerAuthenticated");
    expect(desktop).toContain("href={customerPortalHref}");
    expect(desktop).toContain('publicTenantT("actions.book")');
    expect(mobileMenu).toContain("href={customerPortalHref}");
    expect(mobileRight).toContain("href={customerPortalHref}");
  });
  it("clears customer memory before sending cookie revocation", () => {
    const header = read("src/components/headers/Header.js");
    const customerLogout = header.slice(
      header.indexOf("if (isCustomerShell)"),
      header.indexOf("/*\n     * Workspace logout"),
    );
    expect(customerLogout).toMatch(
      /dispatch\(\s*logOut\(\{\s*authContext: AUTH_CONTEXTS\.CUSTOMER,?\s*\}\),?\s*\)/,
    );
    expect(customerLogout.indexOf("dispatch(")).toBeLessThan(
      customerLogout.indexOf("sendCustomerLogout()"),
    );
  });
  it("uses current-customer credit APIs", () => {
    const creditsApi = read("src/lib/features/credits/creditsApiSlice.js");
    const creditHistory = read(
      "src/components/credits/CreditTransactionHistory.js",
    );
    expect(creditsApi).toContain('url: "/credits/mine/balance"');
    expect(creditsApi).toContain('url: "/credits/mine/transactions"');
    expect(creditHistory).toContain("useGetMyCreditTransactionsQuery");
    expect(creditHistory).not.toContain("useGetCreditTransactionsQuery");
  });
  it("redirects stale credit success and hides the unfinished customer inbox", () => {
    const legacySuccess = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/credits/success/page.js",
    );
    const desktop = read("src/components/headers/DesktopActions.js");
    const mobile = read("src/components/headers/MobileRight.js");
    expect(legacySuccess).toContain("/portal/credits/purchase-success");
    expect(legacySuccess).not.toContain("Payment successful");
    expect(desktop).toContain("!tenantScoped");
    expect(mobile).toContain("!customerSurface");
    expect(desktop).not.toContain("/portal/notifications");
    expect(mobile).not.toContain("/portal/notifications");
  });
  it("opens the admin View public action in a protected new tab", () => {
    const header = read("src/components/headers/Header.js");
    const profileMenu = read("src/components/headers/UserProfileMenu.js");
    const userActions = read(
      "src/components/headers/UserActionsMenuContent.js",
    );
    const tenantSurfaceNavigation = header.slice(
      header.indexOf("const navigateToTenantSurface"),
      header.indexOf("const handleSwitchToAdminMode"),
    );
    const publicSiteAction = header.slice(
      header.indexOf("const handleOpenBookingSite"),
      header.indexOf("const handleLogout"),
    );
    const profilePublicSiteAction = profileMenu.slice(
      profileMenu.indexOf("const handleOpenBookingSite"),
      profileMenu.indexOf("const handleLogout"),
    );
    expect(tenantSurfaceNavigation).toContain("if (isTenantRoute)");
    expect(tenantSurfaceNavigation).toMatch(
      /router\.push\(surfacePath,\s*\{\s*locale: targetLocale,?\s*\}\)/,
    );
    expect(tenantSurfaceNavigation).toContain("window.location.assign(");
    expect(tenantSurfaceNavigation).toContain("buildTenantUrl({");
    expect(tenantSurfaceNavigation).toContain("slug: currentTenantSlug");
    expect(tenantSurfaceNavigation).toContain("pathname: surfacePath");
    expect(publicSiteAction).toContain('pathname: "/?from=workspace"');
    expect(publicSiteAction).toContain(
      'window.open(target, "_blank", "noopener,noreferrer")',
    );
    expect(publicSiteAction).not.toContain("window.location.assign(");
    expect(profilePublicSiteAction).toContain('pathname: "/?from=workspace"');
    expect(profilePublicSiteAction).toContain(
      'window.open(target, "_blank", "noopener,noreferrer")',
    );
    expect(profilePublicSiteAction).not.toContain("window.location.assign(");
    expect(userActions).toContain("opensInNewTab: true");
    expect(userActions).toContain(
      'rel={item.opensInNewTab ? "noopener noreferrer" : undefined}',
    );
  });
});
