import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicTenantProvider, {
  usePublicTenant,
} from "@/components/public-tenant/PublicTenantProvider";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  sessionTenant: null,
  pathname: "/portal",
  appearance: vi.fn(({ tenant }) => tenant),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.sessionTenant,
  selectIsCustomerAuthenticated: () => mocks.authenticated,
}));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/components/customer-shell/useCustomerPortalAppearance", () => ({
  useCustomerPortalAppearance: (props) => mocks.appearance(props),
}));

function SurfaceProbe() {
  const { surface, appearanceSurface } = usePublicTenant();
  return (
    <div data-testid="surfaces">
      {surface}:{appearanceSurface}
    </div>
  );
}

function Navigation() {
  const { portalNavigation, previewMode } = usePublicTenant();
  return (
    <nav aria-label={previewMode ? "Preview navigation" : "Portal navigation"}>
      {portalNavigation.map(({ key, href }) => (
        <a key={key} href={href}>
          {key}
        </a>
      ))}
    </nav>
  );
}

const tenant = (customerPortal = {}) => ({
  slug: "studio-a",
  publicCapabilities: { bookStudio: true, memberships: true, vouchers: true },
  publicSite: { customerPortal },
});

describe("published and draft portal navigation", () => {
  beforeEach(() => {
    mocks.authenticated = true;
    mocks.pathname = "/portal";
    mocks.sessionTenant = { slug: "studio-a", modules: {} };
  });

  it("uses personal portal appearance on payment results without changing the transaction surface", () => {
    mocks.pathname = "/portal/credits/purchase-success";
    render(
      <PublicTenantProvider initialTenant={tenant()} surface="portal">
        <SurfaceProbe />
      </PublicTenantProvider>,
    );
    expect(screen.getByTestId("surfaces")).toHaveTextContent(
      "transaction:portal",
    );
    expect(mocks.appearance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        surface: "portal",
        previewMode: false,
      }),
    );
  });

  it("does not extend personal appearance to public checkout results", () => {
    mocks.pathname = "/checkout/success";
    render(
      <PublicTenantProvider initialTenant={tenant()} surface="transaction">
        <SurfaceProbe />
      </PublicTenantProvider>,
    );
    expect(screen.getByTestId("surfaces")).toHaveTextContent(
      "transaction:transaction",
    );
    expect(mocks.appearance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        surface: "transaction",
      }),
    );
  });

  it("preserves existing navigation and includes Courses when controls are absent", () => {
    render(
      <PublicTenantProvider initialTenant={tenant()} surface="portal">
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      ["bookSession", "courses", "memberships", "giftVouchers", "studioGuide"],
    );
  });

  it("uses current published controls instead of stale session controls", () => {
    render(
      <PublicTenantProvider
        initialTenant={tenant({
          pages: { vouchers: { enabled: false } },
          navigation: { studioGuide: { visible: false } },
        })}
        surface="portal"
      >
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(
      screen.queryByRole("link", { name: "giftVouchers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "studioGuide" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "bookSession" }),
    ).toBeInTheDocument();
  });

  it("previews workspace modules even without a customer session or public catalog content", () => {
    mocks.authenticated = false;
    mocks.sessionTenant = {
      slug: "other-studio",
      modules: { memberships: false },
    };
    render(
      <PublicTenantProvider
        initialTenant={{
          ...tenant({ pages: { calendar: { enabled: false } } }),
          publicCapabilities: {
            bookStudio: false,
            memberships: false,
            vouchers: false,
          },
        }}
        surface="portal"
        previewMode
        previewModules={{ bookings: true, memberships: true, vouchers: true }}
      >
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(
      screen.getByRole("navigation", { name: "Preview navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "memberships" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "bookSession" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "giftVouchers" }),
    ).toBeInTheDocument();
  });

  it("hides disabled workspace modules in preview even if public capability snapshots remain enabled", () => {
    render(
      <PublicTenantProvider
        initialTenant={tenant()}
        surface="portal"
        previewMode
        previewModules={{ memberships: false, vouchers: false }}
      >
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(
      screen.queryByRole("link", { name: "memberships" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "giftVouchers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "bookSession" }),
    ).toBeInTheDocument();
  });

  it("uses the same tenant's published session controls during an outage", () => {
    mocks.sessionTenant.publicSite = {
      customerPortal: { pages: { vouchers: { enabled: false } } },
    };
    render(
      <PublicTenantProvider initialTenant={tenant()} surface="portal" degraded>
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(
      screen.queryByRole("link", { name: "giftVouchers" }),
    ).not.toBeInTheDocument();
  });

  it("never applies another tenant's controls to a degraded portal", () => {
    mocks.sessionTenant.slug = "studio-b";
    mocks.sessionTenant.publicSite = {
      customerPortal: { pages: { vouchers: { enabled: false } } },
    };
    render(
      <PublicTenantProvider initialTenant={tenant()} surface="portal" degraded>
        <Navigation />
      </PublicTenantProvider>,
    );
    expect(
      screen.getByRole("link", { name: "giftVouchers" }),
    ).toBeInTheDocument();
  });
});
