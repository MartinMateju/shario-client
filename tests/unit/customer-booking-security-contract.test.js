import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("customer booking security boundaries", () => {
  it("uses customer-owned booking and confirmation endpoints", () => {
    const bookingsApi = read(
      "src",
      "lib",
      "features",
      "bookings",
      "bookingsApiSlice.js",
    );
    const checkoutApi = read(
      "src",
      "lib",
      "features",
      "checkout",
      "checkoutSlice.js",
    );

    expect(bookingsApi).toContain('url: "/bookings/mine"');
    expect(bookingsApi).toContain(
      "`/bookings/mine/${encodeURIComponent(String(id))}/cancel`",
    );
    expect(bookingsApi).toContain("`/bookings/mine/${encodeURIComponent(");
    expect(bookingsApi).toContain(")}/reschedule`");
    expect(bookingsApi).toContain('method: "PATCH"');
    expect(checkoutApi).toContain(
      "`/orders/mine/${encodeOrderIdPathSegment(orderId)}/confirmation`",
    );
  });

  it("uses server booking capabilities and a confirmed move/cancel flow", () => {
    const drawer = read("src", "components", "sidebars", "Drawer.js");
    const table = read("src", "components", "tables", "MyBookingsTable.js");

    expect(drawer).toContain("booking?.canCancel === true");
    expect(drawer).toContain("booking?.canReschedule === true");
    expect(drawer).not.toContain("booking?.createdBy");
    expect(drawer).toContain("useGetMyBookingRescheduleAvailabilityQuery");
    expect(drawer).toContain("setShowCancelConfirmation(true)");
    expect(drawer).toContain("arrival.publicInstructions");
    expect(drawer).toContain("arrival.accessCodeDeliveryMinutesBefore");
    expect(table).toContain('const [scope, setScope] = useState("upcoming")');
    expect(table).toContain('["history"');
    expect(table).toContain("{selectedBooking && (");
    expect(table).not.toContain("{selectedBooking && selectedProduct && (");
  });

  it("does not restore an unsigned public selection in the legacy portal", () => {
    const portal = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "portal",
      "page.js",
    );

    expect(portal).not.toContain("parsePublicBookingIntent");
    expect(portal).not.toContain("useGetBookingsQuery");
    expect(portal).toContain("useGetCustomerBookingAvailabilityQuery");
  });

  it("separates customer and workspace audiences at the route boundary", () => {
    const boundary = read(
      "src",
      "components",
      "auth",
      "TenantSurfaceBoundary.js",
    );

    expect(boundary).toContain("selectIsCustomerAuthenticated");
    expect(boundary).toContain("selectIsWorkspaceAuthenticated");
    expect(boundary).toContain("selectIsSessionReadyForContext");
    expect(boundary).toContain("buildPlatformUrl");
    expect(boundary).not.toContain(
      "if (isPortalSurface && userAccess.isTenantUser)",
    );
  });

  it("uses customer-safe availability and location DTO endpoints in portal", () => {
    const bookingsApi = read(
      "src",
      "lib",
      "features",
      "bookings",
      "bookingsApiSlice.js",
    );
    const locationsApi = read(
      "src",
      "lib",
      "features",
      "locations",
      "locationApiSlice.js",
    );
    const productsApi = read(
      "src",
      "lib",
      "features",
      "products",
      "productsApiSlice.js",
    );
    const locationProvider = read(
      "src",
      "components",
      "customer-shell",
      "CustomerPortalLocationProvider.js",
    );
    const portal = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "portal",
      "page.js",
    );

    expect(bookingsApi).toContain('url: "/bookings/mine/availability"');
    expect(locationsApi).toContain("url: `${LOCATIONS_URL}/customer`");
    expect(productsApi).toContain('url: "/products/customer-catalog"');
    expect(portal).toContain("useGetCustomerBookingAvailabilityQuery");
    expect(portal).toContain("useGetCustomerCatalogQuery");
    expect(portal).toContain("useCustomerPortalLocation");
    expect(locationProvider).toContain("useGetCustomerLocationsQuery");
    expect(portal).not.toContain("useGetLocationsQuery");
    expect(locationProvider).not.toContain("useGetLocationsQuery");
    expect(portal).not.toContain("isAuth(BookingDashboard)");
    expect(portal).toContain("serviceCatalogEnabled && isProductsError");
  });

  it("uses dynamic host-aware SEO and tenant-neutral checkout layouts", () => {
    expect(
      fs.existsSync(path.join(process.cwd(), "public", "robots.txt")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(process.cwd(), "public", "sitemap.xml")),
    ).toBe(false);

    const checkoutLayout = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(customer-transactions)",
      "checkout",
      "layout.js",
    );
    expect(checkoutLayout).not.toContain("studio-grohovka");
    expect(checkoutLayout).not.toContain("notFound");
  });
});
