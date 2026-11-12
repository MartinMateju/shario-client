import { describe, expect, it } from "vitest";
import {
  CUSTOMER_PORTAL_PAGE_HREFS,
  CUSTOMER_PORTAL_PAGE_IDS,
  getCustomerPortalFallbackHref,
  getCustomerPortalPageId,
  isCustomerPortalHrefEnabled,
  isCustomerPortalNavigationVisible,
  isCustomerPortalPageEnabled,
  normalizeCustomerPortalVisibility,
} from "@/components/customer-shell/customerPortalVisibility";
const tenantWithPages = (pages) => ({
  publicSite: {
    customerPortal: {
      pages,
    },
  },
});
const allDisabled = () =>
  Object.fromEntries(
    CUSTOMER_PORTAL_PAGE_IDS.map((id) => [
      id,
      {
        enabled: false,
      },
    ]),
  );
describe("customer portal page visibility", () => {
  it("uses the dedicated voucher shop and applies the same switch to old voucher links", () => {
    const tenant = tenantWithPages({
      vouchers: {
        enabled: false,
      },
    });
    expect(CUSTOMER_PORTAL_PAGE_HREFS.vouchers).toBe("/portal/vouchers");
    expect(
      isCustomerPortalHrefEnabled(
        tenant,
        "/portal/vouchers?location=vaclavska",
      ),
    ).toBe(false);
    expect(
      isCustomerPortalHrefEnabled(
        tenant,
        "/portal?tab=vouchers&location=vaclavska",
      ),
    ).toBe(false);
    expect(isCustomerPortalNavigationVisible(tenant, "giftVouchers")).toBe(
      false,
    );
  });
  it("protects the courses catalog and direct course dates with the same page switch", () => {
    const tenant = tenantWithPages({
      courses: {
        enabled: false,
      },
    });
    expect(isCustomerPortalHrefEnabled(tenant, "/portal/courses")).toBe(false);
    expect(
      isCustomerPortalHrefEnabled(
        tenant,
        "/portal/courses/wheel?courseSessionId=existing&location=vaclavska",
      ),
    ).toBe(false);
    expect(isCustomerPortalNavigationVisible(tenant, "courses")).toBe(false);
    expect(
      isCustomerPortalHrefEnabled(tenant, "/portal?tab=studio-calendar"),
    ).toBe(true);
  });
  it("defaults all known pages and navigation links to enabled for existing tenants", () => {
    const settings = normalizeCustomerPortalVisibility();
    expect(Object.keys(settings.pages)).toHaveLength(11);
    expect(Object.keys(settings.navigation)).toHaveLength(5);
    for (const pageId of CUSTOMER_PORTAL_PAGE_IDS) {
      expect(settings.pages[pageId]).toEqual({
        enabled: true,
      });
      expect(isCustomerPortalPageEnabled(undefined, pageId)).toBe(true);
    }
    expect(
      Object.values(settings.navigation).every(({ visible }) => visible),
    ).toBe(true);
  });
  it.each(Object.entries(CUSTOMER_PORTAL_PAGE_HREFS))(
    "blocks the exact %s destination while leaving unrelated pages enabled",
    (pageId, href) => {
      const tenant = tenantWithPages({
        [pageId]: {
          enabled: false,
        },
      });
      expect(getCustomerPortalPageId(href)).toBe(pageId);
      expect(isCustomerPortalHrefEnabled(tenant, href)).toBe(false);
      const otherId = CUSTOMER_PORTAL_PAGE_IDS.find((id) => id !== pageId);
      expect(
        isCustomerPortalHrefEnabled(
          tenant,
          CUSTOMER_PORTAL_PAGE_HREFS[otherId],
        ),
      ).toBe(true);
    },
  );
  it.each([
    ["studio-calendar", "calendar"],
    ["STUDIO_CALENDAR", "calendar"],
    ["my-bookings", "bookings"],
    ["MY_BOOKINGS", "bookings"],
    ["vouchers", "vouchers"],
    ["tutorials", "studioGuide"],
  ])("recognizes legacy tab %s without a direct-link bypass", (tab, pageId) => {
    const tenant = tenantWithPages({
      [pageId]: {
        enabled: false,
      },
    });
    expect(
      getCustomerPortalPageId(
        "/portal",
        new URLSearchParams({
          tab,
          location: "brno",
        }),
      ),
    ).toBe(pageId);
    expect(
      isCustomerPortalHrefEnabled(tenant, `/portal?tab=${tab}&location=brno`),
    ).toBe(false);
  });
  it("recognizes nested membership invoices and trailing slashes but does not capture unknown descendants", () => {
    const tenant = tenantWithPages({
      memberships: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
    });
    expect(
      isCustomerPortalHrefEnabled(
        tenant,
        "/portal/membership/invoices/?page=2",
      ),
    ).toBe(false);
    expect(
      isCustomerPortalHrefEnabled(
        tenant,
        "/portal/credits/?location=brno#history",
      ),
    ).toBe(false);
    expect(getCustomerPortalPageId("/portal/credits/not-a-page")).toBeNull();
    expect(getCustomerPortalPageId("/portal/membership/not-a-page")).toBeNull();
    expect(getCustomerPortalPageId("/portalized")).toBeNull();
  });
  it.each([
    "/portal/success?orderId=existing-order",
    "/portal/cancel?orderId=existing-order",
    "/portal/overlap",
    "/portal/kapacita",
    "/portal/booking/confirm?intent=existing-token",
    "/portal/credits/success?orderId=existing-order",
    "/portal/credits/cancel?orderId=existing-order",
    "/portal/credits/purchase-success?orderId=existing-order&location=brno",
    "/memberships/checkout/success?session_id=existing-session",
    "/checkout/success?session_id=existing-session",
  ])(
    "preserves payment and booking recovery at %s even when every page is disabled",
    (href) => {
      expect(getCustomerPortalPageId(href)).toBeNull();
      expect(
        isCustomerPortalHrefEnabled(tenantWithPages(allDisabled()), href),
      ).toBe(true);
    },
  );
  it("hides a navigation entry independently without disabling the page", () => {
    const tenant = {
      publicSite: {
        customerPortal: {
          navigation: {
            giftVouchers: {
              visible: false,
            },
          },
        },
      },
    };
    expect(isCustomerPortalNavigationVisible(tenant, "giftVouchers")).toBe(
      false,
    );
    expect(isCustomerPortalHrefEnabled(tenant, "/portal?tab=vouchers")).toBe(
      true,
    );
    expect(isCustomerPortalNavigationVisible(tenant, "bookSession")).toBe(true);
    tenant.publicSite.customerPortal.pages = {
      calendar: {
        enabled: false,
      },
    };
    expect(isCustomerPortalNavigationVisible(tenant, "bookSession")).toBe(
      false,
    );
  });
  it("chooses an enabled fallback, respects disabled modules, and returns no route when all pages are off", () => {
    const pages = allDisabled();
    expect(getCustomerPortalFallbackHref(tenantWithPages(pages))).toBeNull();
    pages.account.enabled = true;
    expect(
      getCustomerPortalFallbackHref(tenantWithPages(pages), {
        firing: false,
      }),
    ).toBe("/portal/account");
    pages.calendar.enabled = true;
    expect(
      getCustomerPortalFallbackHref(tenantWithPages(pages), {
        bookings: false,
        courses: true,
      }),
    ).toBe("/portal?tab=studio-calendar");
  });
});
