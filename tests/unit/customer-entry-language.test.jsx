import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  pathname: "/pricing",
  params: {},
  publicContext: null,
  tenant: null,
  user: null,
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));
vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
  useSearchParams: () => new URLSearchParams(),
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
vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) => selector(),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  logOut: vi.fn(),
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentUser: () => mocks.user,
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
  selectIsAuthenticated: () => true,
  selectIsCustomerAuthenticated: () => true,
  selectIsSessionReadyForContext: () => () => true,
}));
vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useSendCustomerLogoutMutation: () => [vi.fn()],
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  openCart: vi.fn(),
  selectCurrentCart: () => [],
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => mocks.publicContext,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/customer-shell/useCustomerPieceAccess", () => ({
  useCustomerPieceAccess: () => ({ anyLocationEnabled: false }),
}));
vi.mock("@/components/headers/DesktopActions", () => ({
  default: ({ onOpenBookingSite, onSwitchToUserMode }) => (
    <>
      <button onClick={onOpenBookingSite}>Open public site</button>
      <button onClick={onSwitchToUserMode}>Open portal</button>
    </>
  ),
}));
vi.mock("@/components/headers/UserActionsMenuContent", () => ({
  default: ({ onOpenBookingSite }) => (
    <button onClick={onOpenBookingSite}>Open public site</button>
  ),
}));
vi.mock("@/components/headers/Brand", () => ({ default: () => null }));
vi.mock("@/components/headers/DesktopNavPublic", () => ({
  default: () => null,
}));
vi.mock("@/components/headers/DesktopNavTenant", () => ({
  default: () => null,
}));
vi.mock("@/components/headers/MobileMenu", () => ({ default: () => null }));
vi.mock("@/components/headers/MobileRight", () => ({ default: () => null }));
vi.mock("@/components/headers/MobileUserActionsSheet", () => ({
  default: () => null,
}));
vi.mock("@/components/customer-shell/CustomerPortalHelpDrawer", () => ({
  default: () => null,
}));
vi.mock("@/components/auth/PlatformAuthHeader", () => ({
  default: () => null,
}));

import Header from "@/components/headers/Header";
import UserProfileMenu from "@/components/headers/UserProfileMenu";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";

describe("language when entering customer surfaces", () => {
  beforeEach(() => {
    mocks.locale = "en";
    mocks.pathname = "/pricing";
    mocks.params = {};
    mocks.publicContext = null;
    mocks.tenant = {
      slug: "clay-house",
      name: "Clay House",
      settings: {
        adminLanguage: "en",
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
    };
    mocks.user = {
      firstName: "Studio",
      lastName: "Owner",
      customerDefaultLanguage: null,
    };
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it.each([
    [null, "cs"],
    ["en", "en"],
    ["de", "cs"],
  ])(
    "uses saved preference %s or the primary language for a public-site entry from platform English",
    (preference, expectedLocale) => {
      mocks.user.customerDefaultLanguage = preference;
      render(<Header />);
      fireEvent.click(screen.getByRole("button", { name: "Open public site" }));
      const target = new URL(window.open.mock.calls[0][0]);
      expect(target.hostname).toBe("clay-house.shario.localhost");
      expect(target.pathname).toBe(`/${expectedLocale}`);
      expect(target.searchParams.get("from")).toBe("workspace");
      expect(window.open.mock.calls[0].slice(1)).toEqual([
        "_blank",
        "noopener,noreferrer",
      ]);
    },
  );

  it("preserves an existing explicit customer language when moving between customer surfaces", () => {
    mocks.params = { tenantSlug: "clay-house" };
    mocks.pathname = "/";
    mocks.user.customerDefaultLanguage = "cs";
    mocks.publicContext = {
      tenant: normalizePublicTenant(mocks.tenant),
      surface: "public",
      navigation: [],
    };
    render(<Header tenantScoped />);
    fireEvent.click(screen.getByRole("button", { name: "Open portal" }));
    expect(mocks.router.push).toHaveBeenCalledWith("/portal", { locale: "en" });
    fireEvent.click(screen.getByRole("button", { name: "Open public site" }));
    expect(new URL(window.open.mock.calls[0][0]).pathname).toBe("/en");
  });

  it.each([
    [null, "cs"],
    ["en", "en"],
  ])(
    "uses saved preference %s or studio primary from the workspace profile",
    (preference, expectedLocale) => {
      mocks.pathname = "/app";
      mocks.user.customerDefaultLanguage = preference;
      render(<UserProfileMenu isAdminRoute />);
      fireEvent.click(screen.getByRole("button", { name: "account.menu" }));
      fireEvent.click(screen.getByRole("button", { name: "Open public site" }));
      expect(new URL(window.open.mock.calls[0][0]).pathname).toBe(
        `/${expectedLocale}`,
      );
    },
  );
});
