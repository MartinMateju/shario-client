import { describe, expect, it } from "vitest";
import {
  CUSTOMER_SHELL_SURFACES,
  createCustomerShellTenantFallback,
  getCustomerPortalNavigation,
  getCustomerPortalNavigationForLocation,
  getCustomerShellSurface,
  getCustomerShellAppearanceSurface,
  isCustomerCartSurface,
  resolveCustomerShellTenant,
} from "@/components/customer-shell/customerShell.config";
describe("capability-aware customer portal navigation", () => {
  it("fails closed to the portal booking entry until the tenant has hydrated", () => {
    expect(getCustomerPortalNavigation(null)).toEqual([
      {
        key: "bookSession",
        href: "/portal?tab=studio-calendar",
      },
    ]);
  });
  it("shows the action-led header for a time-based studio", () => {
    expect(
      getCustomerPortalNavigation({
        bookings: true,
        courses: false,
        firing: false,
        memberships: true,
        vouchers: true,
      }),
    ).toEqual([
      {
        key: "bookSession",
        href: "/portal?tab=studio-calendar",
      },
      {
        key: "memberships",
        href: "/portal/membership",
      },
      {
        key: "giftVouchers",
        href: "/portal/vouchers",
      },
      {
        key: "studioGuide",
        href: "/portal/knowledge",
      },
    ]);
  });
  it("keeps My work out of the header for a piece-based studio", () => {
    expect(
      getCustomerPortalNavigation({
        bookings: false,
        courses: false,
        firing: true,
        memberships: true,
        vouchers: true,
      }),
    ).toEqual([
      {
        key: "memberships",
        href: "/portal/membership",
      },
      {
        key: "giftVouchers",
        href: "/portal/vouchers",
      },
      {
        key: "studioGuide",
        href: "/portal/knowledge",
      },
    ]);
  });
  it("keeps My work out of the header for a hybrid studio", () => {
    expect(
      getCustomerPortalNavigation({
        bookings: true,
        firing: true,
        memberships: false,
        vouchers: false,
      }),
    ).toEqual([
      {
        key: "bookSession",
        href: "/portal?tab=studio-calendar",
      },
      {
        key: "courses",
        href: "/portal/courses",
      },
      {
        key: "studioGuide",
        href: "/portal/knowledge",
      },
    ]);
  });
  it("adapts booking to the selected studio without exposing My work", () => {
    const navigation = getCustomerPortalNavigation({
      bookings: true,
      firing: true,
      memberships: true,
    });
    expect(
      getCustomerPortalNavigationForLocation(navigation, {
        booking: {
          enabled: false,
        },
      }).map((item) => item.key),
    ).toEqual(["courses", "memberships", "giftVouchers", "studioGuide"]);
    expect(
      getCustomerPortalNavigationForLocation(navigation, {
        booking: {
          enabled: true,
        },
      }).map((item) => item.key),
    ).toEqual([
      "bookSession",
      "courses",
      "memberships",
      "giftVouchers",
      "studioGuide",
    ]);
  });
  it("keeps My work out while the location model is hydrating", () => {
    const navigation = getCustomerPortalNavigation({
      bookings: true,
      firing: true,
      memberships: false,
      vouchers: false,
    });
    expect(
      getCustomerPortalNavigationForLocation(navigation, null).map(
        (item) => item.key,
      ),
    ).toEqual(["bookSession", "courses", "studioGuide"]);
  });
});
describe("degraded portal branding", () => {
  it("uses the authenticated tenant only when its slug matches the route", () => {
    const fallback = createCustomerShellTenantFallback({
      tenantSlug: "studio-olivka",
      locale: "en",
    });
    const resolved = resolveCustomerShellTenant({
      publicTenant: fallback,
      authenticatedTenant: {
        slug: "studio-olivka",
        name: "Studio Olivka",
        branding: {
          displayName: "Olivka Ceramics",
          accentColor: "#123456",
        },
      },
      degraded: true,
      surface: "portal",
    });
    expect(resolved.slug).toBe("studio-olivka");
    expect(resolved.publicSite.branding.displayName).toBe("Olivka Ceramics");
    expect(resolved.publicSite.branding.accentColor).toBe("#123456");
  });
  it("keeps authenticated branding on publication-independent transaction results", () => {
    const fallback = createCustomerShellTenantFallback({
      tenantSlug: "studio-olivka",
      locale: "en",
    });
    const resolved = resolveCustomerShellTenant({
      publicTenant: fallback,
      authenticatedTenant: {
        slug: "studio-olivka",
        name: "Studio Olivka",
        publicSite: {
          branding: {
            displayName: "Olivka Ceramics",
            logoUrl: "https://cdn.example.com/olivka.svg",
          },
        },
      },
      degraded: true,
      surface: "transaction",
    });
    expect(resolved.publicSite.branding.displayName).toBe("Olivka Ceramics");
    expect(resolved.publicSite.branding.logoUrl).toBe(
      "https://cdn.example.com/olivka.svg",
    );
  });
  it("never applies persisted tenant A branding to tenant B", () => {
    const fallback = createCustomerShellTenantFallback({
      tenantSlug: "studio-b",
      locale: "en",
    });
    const resolved = resolveCustomerShellTenant({
      publicTenant: fallback,
      authenticatedTenant: {
        slug: "studio-a",
        name: "Studio A",
        branding: {
          displayName: "Wrong studio",
        },
      },
      degraded: true,
      surface: "portal",
    });
    expect(resolved.slug).toBe("studio-b");
    expect(resolved.publicSite.branding.displayName).toBe("Your studio");
  });
});
