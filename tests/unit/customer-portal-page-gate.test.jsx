import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CUSTOMER_PORTAL_PAGE_IDS } from "@/components/customer-shell/customerPortalVisibility";
const mocks = vi.hoisted(() => ({
  tenant: null,
  sessionTenant: {},
  pathname: "/portal",
  params: new URLSearchParams(),
  router: {
    replace: vi.fn(),
  },
  child: vi.fn(),
  cancel: vi.fn(),
  location: null,
}));
vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => "en",
    }))(...args),
  );
});
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.params,
}));
vi.mock("react-redux", () => ({
  useSelector: () => mocks.sessionTenant,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.tenant
      ? {
          tenant: mocks.tenant,
        }
      : null,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => ({
    activeLocation: mocks.location,
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/customer-shell/CustomerShellStatus", () => ({
  default: () => <p role="status">Loading</p>,
}));
vi.mock("@/lib/features/potteryPieces/potteryPiecesApiSlice", () => ({
  useCancelPieceCheckoutMutation: () => [mocks.cancel, {}],
}));
import CustomerPortalPageGate from "@/components/customer-shell/CustomerPortalPageGate";
import useCustomerPortalReturnHref from "@/components/customer-shell/useCustomerPortalReturnHref";
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
function ProtectedPage() {
  mocks.child();
  return <p>Protected page</p>;
}
const renderGate = (props = {}) =>
  render(
    <CustomerPortalPageGate {...props}>
      <ProtectedPage />
    </CustomerPortalPageGate>,
  );
describe("customer portal page gate", () => {
  beforeEach(() => {
    mocks.tenant = null;
    mocks.location = null;
    mocks.sessionTenant = {};
    mocks.pathname = "/portal";
    mocks.params = new URLSearchParams();
    mocks.router.replace.mockReset();
    mocks.child.mockReset();
    mocks.cancel.mockReset().mockReturnValue({
      unwrap: async () => ({
        status: "cancelled",
      }),
    });
    window.history.replaceState({}, "", "/");
  });
  it("mounts existing enabled pages without redirects", () => {
    renderGate();
    expect(screen.getByText("Protected page")).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it.each(["vouchers", "VOUCHERS"])(
    "redirects legacy %s links to the shop before mounting booking queries",
    (tab) => {
      mocks.params = new URLSearchParams({
        tab,
        location: "vaclavska",
      });
      renderGate();
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/portal/vouchers?location=vaclavska",
        {
          scroll: false,
        },
      );
      expect(mocks.child).not.toHaveBeenCalled();
    },
  );
  it("does not mount a voucher shop when its tenant module is off", () => {
    mocks.pathname = "/portal/vouchers";
    mocks.sessionTenant = {
      modules: {
        vouchers: false,
      },
    };
    renderGate();
    expect(
      screen.getByRole("heading", {
        name: "Page unavailable",
      }),
    ).toBeVisible();
    expect(mocks.child).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("keeps an enabled signed-in voucher shop independent from public-page visibility", () => {
    mocks.pathname = "/portal/vouchers";
    mocks.tenant = {
      publicSite: {
        pages: {
          vouchers: {
            visible: false,
          },
        },
        customerPortal: {
          pages: {
            vouchers: {
              enabled: true,
            },
          },
        },
      },
    };
    renderGate();
    expect(screen.getByText("Protected page")).toBeVisible();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it.each([
    ["/portal", "tab=vouchers", "vouchers"],
    ["/portal/vouchers", "", "vouchers"],
    ["/portal", "tab=MY_BOOKINGS", "bookings"],
    ["/portal", "tab=tutorials", "studioGuide"],
    ["/portal/credits", "", "credits"],
    ["/portal/account", "", "account"],
    ["/portal/membership/invoices", "", "memberships"],
    ["/portal/membership/plans", "", "memberships"],
  ])(
    "does not mount disabled child queries at %s?%s",
    (pathname, query, pageId) => {
      mocks.pathname = pathname;
      mocks.params = new URLSearchParams(`${query}&location=atelier-brno`);
      mocks.tenant = tenantWithPages({
        [pageId]: {
          enabled: false,
        },
      });
      renderGate();
      expect(
        screen.getByRole("heading", {
          name: "Page unavailable",
        }),
      ).toBeInTheDocument();
      expect(mocks.child).not.toHaveBeenCalled();
      expect(mocks.router.replace).not.toHaveBeenCalled();
      expect(
        screen.getByRole("link", {
          name: "Continue in the portal",
        }),
      ).toHaveAttribute(
        "href",
        "/portal?tab=studio-calendar&location=atelier-brno",
      );
    },
  );
  it("redirects a bare portal to an enabled page while retaining the chosen studio", async () => {
    mocks.tenant = tenantWithPages({
      calendar: {
        enabled: false,
      },
      memberships: {
        enabled: false,
      },
    });
    mocks.params = new URLSearchParams("location=atelier-brno");
    renderGate();
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/portal/courses?location=atelier-brno",
        {
          scroll: false,
        },
      ),
    );
    expect(mocks.child).not.toHaveBeenCalled();
  });
  it("renders an all-off landing without a self-link, child queries, or a redirect loop", () => {
    mocks.tenant = tenantWithPages(allDisabled());
    renderGate();
    expect(
      screen.getByRole("heading", {
        name: "Page unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(mocks.child).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it.each([
    "/portal/success",
    "/portal/credits/purchase-success",
    "/portal/credits/cancel",
    "/portal/booking/confirm",
    "/portal/unknown-route",
  ])("leaves recovery or unknown route handling intact at %s", (pathname) => {
    mocks.pathname = pathname;
    mocks.params = new URLSearchParams(
      "orderId=old-order&intent=old-intent&location=atelier-brno",
    );
    mocks.tenant = tenantWithPages(allDisabled());
    renderGate();
    expect(screen.getByText("Protected page")).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.params.get("orderId")).toBe("old-order");
  });
  it("uses the public or preview settings instead of stale session settings", () => {
    mocks.pathname = "/portal/credits";
    mocks.sessionTenant = tenantWithPages({
      credits: {
        enabled: false,
      },
    });
    mocks.tenant = tenantWithPages({
      credits: {
        enabled: true,
      },
    });
    renderGate();
    expect(screen.getByText("Protected page")).toBeInTheDocument();
  });
  it("uses session settings if no public context is available", () => {
    mocks.pathname = "/portal/credits";
    mocks.sessionTenant = tenantWithPages({
      credits: {
        enabled: false,
      },
    });
    renderGate();
    expect(mocks.child).not.toHaveBeenCalled();
  });
  it("shows a disabled draft preview without navigating the editor", () => {
    mocks.tenant = tenantWithPages({
      calendar: {
        enabled: false,
      },
    });
    renderGate({
      pathnameOverride: "/portal",
      searchParamsOverride: new URLSearchParams(),
      autoRedirect: false,
    });
    expect(
      screen.getByRole("heading", {
        name: "Page unavailable",
      }),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("keeps payment return links on enabled destinations with their location, including the all-off landing", () => {
    mocks.tenant = tenantWithPages({
      credits: {
        enabled: false,
      },
    });
    const hook = renderHook(() =>
      useCustomerPortalReturnHref("/portal/credits", "atelier-brno"),
    );
    expect(hook.result.current).toBe(
      "/portal?tab=studio-calendar&location=atelier-brno",
    );
    mocks.tenant = tenantWithPages(allDisabled());
    hook.rerender();
    expect(hook.result.current).toBe("/portal?location=atelier-brno");
  });
});
