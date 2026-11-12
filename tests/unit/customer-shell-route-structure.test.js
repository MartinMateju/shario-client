import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const tenantRoot = path.join(
  process.cwd(),
  "src/app/[locale]/tenants/[tenantSlug]",
);
const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const obsoleteTransactionOwners = [
  "(public-foundation)/memberships/checkout/success/page.js",
  "(public-foundation)/memberships/checkout/cancel/page.js",
  "(studio-grohovka-public)/checkout/success/page.js",
  "(studio-grohovka-public)/checkout/cancel/page.js",
];
const transactionOwners = [
  "(customer-transactions)/memberships/checkout/success/page.js",
  "(customer-transactions)/memberships/checkout/cancel/page.js",
  "(customer-transactions)/checkout/success/page.js",
  "(customer-transactions)/checkout/cancel/page.js",
];
describe("shared customer shell route ownership", () => {
  it("has exactly one owner for every moved transaction callback", () => {
    for (const relativePath of obsoleteTransactionOwners) {
      expect(fs.existsSync(path.join(tenantRoot, relativePath))).toBe(false);
    }
    for (const relativePath of transactionOwners) {
      expect(fs.existsSync(path.join(tenantRoot, relativePath))).toBe(true);
    }
  });
  it("keeps transaction recovery independent from public publication", () => {
    const source = read(
      "src/app/[locale]/tenants/[tenantSlug]/(customer-transactions)/layout.js",
    );
    expect(source).toContain("getPublicTenantConfig");
    expect(source).toContain("createCustomerShellTenantFallback");
    expect(source).not.toContain("notFound()");
    expect(source).not.toContain('from "next/navigation"');
    expect(source).toContain('surface="transaction"');
  });
  it("mounts the shared shell on portal without gating it on public config", () => {
    const source = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/layout.js",
    );
    const configSource = read("src/lib/publicTenant/server.js");
    expect(source).toContain("CustomerTenantShell");
    expect(source).toContain("CustomerPortalLocationProvider");
    expect(source).toContain("CustomerPortalLocationGate");
    expect(source).toContain("createCustomerShellTenantFallback");
    expect(source).not.toContain("notFound()");
    expect(source).not.toContain('from "next/navigation"');
    expect(source).toContain('surface="portal"');
    expect(configSource).toContain("AbortSignal.timeout");
  });
  it("renders bookings at the dedicated portal route so navigation stays active", () => {
    const bookingsRoute = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/bookings/page.js",
    );
    expect(bookingsRoute).toContain("<MyBookingsTable headingLevel={1} />");
    expect(bookingsRoute).not.toContain('from "next/navigation"');
    expect(bookingsRoute).not.toContain("redirect(");
  });
  it("mounts credit purchasing wherever the Buy credits action is shown", () => {
    const creditsPage = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/credits/page.js",
    );
    expect(creditsPage).toContain(
      'import CreditPurchaseModal from "@/components/credits/CreditPurchaseModal"',
    );
    expect(creditsPage).toContain("<CreditPurchaseModal />");
  });
  it("suppresses the global header for nested portal chrome and leaves app isolated", () => {
    const headerSource = read("src/components/headers/Header.js");
    const localeLayoutSource = read("src/app/[locale]/layout.js");
    const appLayoutSource = read(
      "src/app/[locale]/tenants/[tenantSlug]/app/layout.js",
    );
    expect(headerSource).toContain('"/portal"');
    expect(localeLayoutSource).toContain("fallback={<HeaderPlaceholder />}");
    expect(headerSource).toContain("(!tenantScoped && isTenantRoute)");
    expect(localeLayoutSource).not.toContain("function HeaderFallback");
    expect(appLayoutSource).not.toContain("CustomerTenantShell");
    expect(appLayoutSource).not.toContain("getPublicTenantConfig");
  });
  it("uses the authenticated profile initials instead of a hardcoded user badge", () => {
    const headerSource = read("src/components/headers/Header.js");
    const actionSources = [
      "src/components/headers/DesktopActions.js",
      "src/components/headers/MobileRight.js",
      "src/components/headers/MobileUserActionsSheet.js",
    ].map(read);
    expect(headerSource).toContain("getUserInitials(currentUser");
    for (const source of actionSources) {
      expect(source).not.toContain('"MM"');
    }
  });
  it("ships an idempotent overlay cleanup for obsolete route owners", () => {
    const cleanupSource = read("scripts/cleanup-customer-shell-routes.mjs");
    for (const relativePath of obsoleteTransactionOwners) {
      expect(cleanupSource).toContain(relativePath);
    }
  });
  it("routes public catalog cards through selection-preserving detail pages", () => {
    const catalogSource = read(
      "src/components/public-tenant/PublicProductCatalogPage.js",
    );
    const taxonomySource = read(
      "src/components/public-tenant/publicProductTaxonomy.js",
    );
    expect(catalogSource).toContain("getPublicProductHref");
    expect(catalogSource).toContain("getPublicProductHref(product)");
    expect(taxonomySource).toContain("encodeURIComponent");
    expect(taxonomySource).toContain('[PRODUCT_KIND.OPEN_STUDIO]: "book"');
    expect(taxonomySource).toContain('[PRODUCT_KIND.CLASS]: "courses"');
    expect(catalogSource).not.toContain(
      'const portalHref = "/portal?tab=studio-calendar"',
    );
  });
  it("does not report a membership payment failure when status verification is unavailable", () => {
    const checkoutSource = read(
      "src/components/memberships/MembershipCheckoutSuccess.js",
    );
    expect(checkoutSource).toContain('? "unavailable"');
    expect(checkoutSource).toContain("signInToRecover");
    expect(checkoutSource).not.toContain(
      "!sessionId || failed || initialQuery.isError",
    );
  });
  it("server-verifies anonymous course checkout before showing success", () => {
    const successSource = read(
      "src/components/courses/GuestCourseCheckoutResult.js",
    );
    const checkoutApi = read("src/lib/features/checkout/checkoutSlice.js");
    const productDetail = read(
      "src/components/public-tenant/PublicBookingProductDetailPage.js",
    );
    expect(successSource).toContain("useGetGuestCheckoutOrderStatusQuery");
    expect(successSource).toContain('status === "processed_order"');
    expect(checkoutApi).toContain("getGuestCheckoutOrderStatus");
    expect(productDetail).toMatch(
      /getSafeCheckoutUrl\(response(?:\?\.|\.)url\)/,
    );
    expect(productDetail).toContain('response?.status === "confirmed"');
    expect(productDetail).toContain("getConfirmedGuestCheckoutHref({");
    expect(productDetail).not.toContain("window.location.assign(response.url)");
  });
});
