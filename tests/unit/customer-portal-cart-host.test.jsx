import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerPortalCartHost from "@/components/customer-shell/CustomerPortalCartHost";
const state = vi.hoisted(() => ({
  open: true,
  tenant: null,
  publicTenant: null,
  modal: vi.fn(),
  location: null,
}));
vi.mock("next/dynamic", () => ({
  default: () => (props) => {
    state.modal(props);
    return <div data-testid="portal-cart" />;
  },
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: state.tenant,
      },
      cart: {
        isOpen: state.open,
      },
    }),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({
    tenant: state.publicTenant,
  }),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => state.location,
}));
beforeEach(() => {
  state.open = true;
  state.tenant = {
    modules: {
      bookings: false,
      courses: false,
      firing: true,
      payments: true,
    },
  };
  state.publicTenant = null;
  state.location = null;
});
describe("shared authenticated portal cart", () => {
  it("permits course checkout independently of the calendar page, while respecting the courses page", () => {
    state.tenant.modules.courses = true;
    state.publicTenant = {
      publicSite: {
        customerPortal: {
          pages: {
            calendar: {
              enabled: false,
            },
          },
        },
      },
    };
    const view = render(<CustomerPortalCartHost />);
    expect(state.modal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allowBookings: false,
        allowCourses: true,
      }),
    );
    state.publicTenant.publicSite.customerPortal.pages.courses = {
      enabled: false,
    };
    view.rerender(<CustomerPortalCartHost />);
    expect(state.modal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allowBookings: false,
        allowCourses: false,
      }),
    );
  });
  it("does not load an unopened cart", () => {
    state.open = false;
    render(<CustomerPortalCartHost />);
    expect(state.modal).not.toHaveBeenCalled();
    expect(screen.queryByTestId("portal-cart")).not.toBeInTheDocument();
  });
  it("mounts one cart for every authenticated portal route rather than only the calendar page", () => {
    const layout = readFileSync(
      "src/app/[locale]/tenants/[tenantSlug]/portal/layout.js",
      "utf8",
    );
    const page = readFileSync(
      "src/app/[locale]/tenants/[tenantSlug]/portal/page.js",
      "utf8",
    );
    expect(layout).toContain("<CustomerPortalCartHost />");
    expect(layout.indexOf("<CustomerPortalCartHost")).toBeGreaterThan(
      layout.indexOf('<TenantSurfaceBoundary surface="portal">'),
    );
    expect(layout.indexOf("<CustomerPortalCartHost")).toBeLessThan(
      layout.indexOf("</TenantSurfaceBoundary>"),
    );
    expect(layout.indexOf("<CustomerPortalCartHost")).toBeGreaterThan(
      layout.indexOf("</CustomerPortalPageGate>"),
    );
    expect(page).not.toContain("<CartModal");
    expect(page).not.toContain('import("@/components/modals/CartModal")');
  });
});
