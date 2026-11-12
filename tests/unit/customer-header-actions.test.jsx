import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  workspaceAuthenticated: false,
  customerAuthenticated: false,
  customerSessionReady: true,
  sessionTenantSlug: "the-pottery-house",
  searchParams: new URLSearchParams(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  dispatch: vi.fn(),
  cart: [],
  pieceAccess: {
    anyLocationEnabled: true,
    ownerScope: "customer-a",
  },
  paymentsEnabled: true,
  customerSurface: "public",
  appearanceSurface: undefined,
  portalAppearance: {},
  publicNavigation: [],
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, onClick, ...props }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
  usePathname: () => "/",
  useRouter: () => mocks.router,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({
    tenantSlug: "the-pottery-house",
  }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  logOut: vi.fn(),
  selectIsAuthenticated: () => mocks.workspaceAuthenticated,
  selectIsCustomerAuthenticated: () => mocks.customerAuthenticated,
  selectIsSessionReadyForContext: () => () => mocks.customerSessionReady,
  selectCurrentTenant: () => ({
    name: "The Pottery House",
    slug: mocks.sessionTenantSlug,
    modules: {
      payments: mocks.paymentsEnabled,
    },
  }),
  selectCurrentUser: () => ({
    firstname: "Studio",
    lastname: "Owner",
  }),
  selectCurrentWorkspaceAccess: () => ({
    role: "owner",
  }),
}));
vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useSendCustomerLogoutMutation: () => [vi.fn()],
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  openCart: vi.fn(),
  selectCurrentCart: () => mocks.cart,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({
    surface: mocks.customerSurface,
    appearanceSurface: mocks.appearanceSurface,
    tenant: {
      name: "The Pottery House",
      slug: "the-pottery-house",
      settings: {
        publicDefaultLanguage: "en",
        supportedPublicLanguages: ["en"],
      },
      publicSite: {
        branding: {
          displayName: "The Pottery House",
        },
        header: {
          announcement: {
            text: {},
            url: "",
          },
        },
        customerPortal: {
          appearance: mocks.portalAppearance,
        },
      },
    },
    navigation: mocks.publicNavigation,
  }),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/customer-shell/useCustomerPieceAccess", () => ({
  useCustomerPieceAccess: () => mocks.pieceAccess,
}));
vi.mock("@/components/headers/DesktopNavPublic", () => ({
  default: () => null,
}));
vi.mock("@/components/headers/DesktopNavTenant", () => ({
  default: ({ items = [] }) => (
    <nav aria-label="Desktop studio links">
      {items.map((item) => (
        <a key={item.key} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  ),
}));
vi.mock("@/components/headers/MobileUserActionsSheet", () => ({
  default: () => null,
}));
vi.mock("@/components/auth/PlatformAuthHeader", () => ({
  default: () => null,
}));
vi.mock("@/components/customer-shell/CustomerPortalHelpDrawer", () => ({
  default: () => null,
  CustomerPortalHelpTrigger: () => null,
}));
vi.mock("@/components/headers/LanguageSelector", () => ({
  default: ({ contextLabel, localeCodes, tenantScoped }) => (
    <div
      data-testid="language-selector"
      data-context-label={contextLabel}
      data-locales={localeCodes?.join(",") || "all"}
      data-tenant-scoped={tenantScoped || undefined}
    />
  ),
}));
vi.mock("@/components/headers/UserActionsMenuContent", () => ({
  default: () => <div>Account actions</div>,
}));
vi.mock("@/components/headers/Brand", () => ({
  default: () => <div>Studio brand</div>,
}));
vi.mock("@/components/customer-shell/CustomerPortalPrimitives", () => ({
  customerPortalHeaderThemeStyle: {},
}));
vi.mock("@/components/notifications/CustomerNotificationMenu", () => ({
  default: ({ viewAllHref = "/portal/notifications" }) => (
    <button
      type="button"
      aria-label="Customer notifications"
      data-customer-notification-menu
      data-view-all-href={viewAllHref}
    />
  ),
}));
import DesktopActions from "@/components/headers/DesktopActions";
import Header from "@/components/headers/Header";
import MobileMenu from "@/components/headers/MobileMenu";
import MobileRight from "@/components/headers/MobileRight";
import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
describe("customer header actions", () => {
  beforeEach(() => {
    mocks.workspaceAuthenticated = false;
    mocks.customerAuthenticated = false;
    mocks.customerSessionReady = true;
    mocks.publicNavigation = [];
    mocks.sessionTenantSlug = "the-pottery-house";
    mocks.searchParams = new URLSearchParams();
    mocks.cart = [];
    mocks.pieceAccess = {
      anyLocationEnabled: true,
      ownerScope: "customer-a",
    };
    mocks.paymentsEnabled = true;
    mocks.customerSurface = "public";
    mocks.appearanceSurface = undefined;
    mocks.portalAppearance = {};
  });
  it("keeps personal header colours on portal results without restoring cart or portal navigation", () => {
    mocks.customerAuthenticated = true;
    mocks.customerSurface = "transaction";
    mocks.appearanceSurface = "portal";
    mocks.portalAppearance = {
      headerBackgroundColor: "#112233",
      headerTextColor: "#FFFFFF",
    };
    render(<Header tenantScoped pathnameOverride="/portal/success" />);
    const header = document.querySelector("header");
    expect(header).toHaveAttribute("data-customer-portal-header", "true");
    expect(
      header.style.getPropertyValue("--tenant-portal-header-background"),
    ).toBe("#112233");
    expect(header.style.backgroundColor).toBe(
      "var(--tenant-portal-header-background)",
    );
    expect(
      document.querySelector("[data-customer-portal-navigation]"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "cart.open",
      }),
    ).not.toBeInTheDocument();
  });
  it("keeps desktop and mobile badges consistent while ignoring specialist rows", () => {
    mocks.customerAuthenticated = true;
    mocks.customerSurface = "portal";
    const piece = {
      id: "piece-1",
      type: "pottery-piece",
      ownerScope: "customer-a",
      quantity: 1,
    };
    mocks.cart = [piece];
    mocks.pieceAccess.anyLocationEnabled = false;
    const view = render(<Header tenantScoped pathnameOverride="/portal" />);
    expect(
      screen.queryByRole("button", {
        name: "cart.open",
      }),
    ).not.toBeInTheDocument();
    mocks.cart = [
      piece,
      {
        id: "booking-1",
        quantity: 4,
      },
    ];
    view.rerender(<Header tenantScoped pathnameOverride="/portal" />);
    expect(
      screen.getAllByRole("button", {
        name: "cart.open",
      }).length,
    ).toBeGreaterThan(1);
    screen
      .getAllByRole("button", {
        name: "cart.open",
      })
      .forEach((button) => expect(button).toHaveTextContent("1"));
    mocks.pieceAccess.anyLocationEnabled = true;
    view.rerender(<Header tenantScoped pathnameOverride="/portal" />);
    screen
      .getAllByRole("button", {
        name: "cart.open",
      })
      .forEach((button) => expect(button).toHaveTextContent("1"));
    mocks.paymentsEnabled = false;
    view.rerender(<Header tenantScoped pathnameOverride="/portal" />);
    screen
      .getAllByRole("button", {
        name: "cart.open",
      })
      .forEach((button) => expect(button).toHaveTextContent("1"));
    expect(mocks.cart).toHaveLength(2);
  });
  it("passes only the configured tenant pair to the public selector", () => {
    render(
      <DesktopActions
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated={false}
        isBooking={false}
        languageContextLabel="The Pottery House"
        languageLocaleCodes={["de", "pl"]}
        sessionReady
        showLanguageSelector
        tenantScoped
      />,
    );
    expect(screen.getByTestId("language-selector")).toHaveAttribute(
      "data-locales",
      "de,pl",
    );
    expect(screen.getByTestId("language-selector")).toHaveAttribute(
      "data-context-label",
      "The Pottery House",
    );
    expect(screen.getByTestId("language-selector").parentElement).toHaveClass(
      "lg:block",
    );
    expect(screen.getByTestId("language-selector")).toHaveAttribute(
      "data-tenant-scoped",
      "true",
    );
  });
  it("can suppress the broad selector on tenant admin and portal surfaces", () => {
    render(
      <DesktopActions
        isAdminRoute
        isAuthenticated
        isBooking={false}
        showLanguageSelector={false}
      />,
    );
    expect(screen.queryByTestId("language-selector")).toBeNull();
  });
  it("sends an anonymous customer portal action to login with a safe next", () => {
    render(
      <DesktopActions
        customerPortalHref="/login?next=%2Fportal%3Ftab%3Dstudio-calendar"
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated={false}
        isBooking={false}
        sessionReady
        tenantScoped
      />,
    );
    const portalAction = screen.getByRole("link", {
      name: "actions.book",
    });
    expect(portalAction).toHaveAttribute(
      "href",
      "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
    );
    expect(portalAction).toHaveAttribute("data-customer-portal-entry-action");
    expect(portalAction).toHaveClass("h-10", "border", "px-4");
    expect(portalAction.querySelector("svg")).toBeNull();
  });
  it("opens the portal without exposing the customer profile on public pages", () => {
    render(
      <DesktopActions
        customerPortalHref="/portal?tab=studio-calendar"
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated
        isBooking={false}
        sessionReady
        tenantScoped
        tenantAccentColor="#9DAAE2"
        tenantAccentForeground="#11110F"
        tenantAccentLinkColor="#5967A9"
      />,
    );
    const portalAction = screen.getByRole("link", {
      name: "actions.book",
    });
    expect(portalAction).toHaveAttribute("href", "/portal?tab=studio-calendar");
    expect(portalAction).toHaveStyle({
      color: "#5967A9",
    });
    expect(portalAction.querySelector("svg")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "account.menu",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("ME")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Notifications",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Customer notifications",
      }),
    ).not.toBeInTheDocument();
  });
  it.each([false, true])(
    "keeps the desktop public action in the customer journey despite legacy workspace props (customer authenticated: %s)",
    async (isAuthenticated) => {
      const user = userEvent.setup();
      const onSwitchToAdminMode = vi.fn();
      const customerPortalHref = isAuthenticated
        ? "/portal?tab=studio-calendar"
        : "/login?next=%2Fportal%3Ftab%3Dstudio-calendar";
      render(
        <DesktopActions
          canAccessAdmin
          canReturnToWorkspace
          customerPortalHref={customerPortalHref}
          customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
          isAuthenticated={isAuthenticated}
          isBooking={false}
          onSwitchToAdminMode={onSwitchToAdminMode}
          sessionReady
          tenantAccentColor="#9DAAE2"
          tenantAccentLinkColor="#5967A9"
          tenantScoped
        />,
      );
      const portalAction = screen.getByRole("link", {
        name: "actions.book",
      });
      expect(portalAction).toHaveAttribute("href", customerPortalHref);
      expect(portalAction).toHaveAttribute("data-customer-portal-entry-action");
      expect(portalAction).toHaveStyle({
        color: "#5967A9",
      });
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      expect(
        document.querySelector("[data-workspace-return-action]"),
      ).toBeNull();
      await user.click(portalAction);
      expect(onSwitchToAdminMode).not.toHaveBeenCalled();
    },
  );
  it("keeps account controls out of the public mobile navigation", () => {
    const { rerender } = render(
      <MobileMenu
        customerPortalHref="/portal?tab=studio-calendar"
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated
        isTenantRoute
        open
        setOpen={vi.fn()}
        closeMobileMenu={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: "actions.book",
      }),
    ).toHaveAttribute("href", "/portal?tab=studio-calendar");
    expect(screen.queryByText("myAccount")).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-mobile-account]"),
    ).toBeNull();
    rerender(
      <MobileMenu
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated
        isTenantRoute
        open
        setOpen={vi.fn()}
        closeMobileMenu={vi.fn()}
      />,
    );
    expect(screen.getByText("myAccount")).toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-mobile-account]"),
    ).not.toBeNull();
  });
  it.each([false, true])(
    "keeps the public mobile menu in the customer journey despite legacy workspace props (customer authenticated: %s)",
    async (isAuthenticated) => {
      const user = userEvent.setup();
      const closeMobileMenu = vi.fn();
      const onSwitchToAdminMode = vi.fn();
      const customerPortalHref = isAuthenticated
        ? "/portal?tab=studio-calendar"
        : "/login?next=%2Fportal%3Ftab%3Dstudio-calendar";
      render(
        <MobileMenu
          canAccessAdmin
          canReturnToWorkspace
          closeMobileMenu={closeMobileMenu}
          customerPortalHref={customerPortalHref}
          customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
          isAuthenticated={isAuthenticated}
          isTenantRoute
          onSwitchToAdminMode={onSwitchToAdminMode}
          open
          sessionReady
          setOpen={vi.fn()}
        />,
      );
      const portalAction = screen.getByRole("link", {
        name: "actions.book",
      });
      expect(portalAction).toHaveAttribute("href", customerPortalHref);
      expect(portalAction).toHaveAttribute("data-customer-portal-entry-action");
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      expect(screen.queryByText("myAccount")).not.toBeInTheDocument();
      expect(
        document.querySelector("[data-workspace-return-action]"),
      ).toBeNull();
      await user.click(portalAction);
      expect(closeMobileMenu).toHaveBeenCalledOnce();
      expect(onSwitchToAdminMode).not.toHaveBeenCalled();
    },
  );
  it("keeps customer notifications behind the authenticated portal boundary", () => {
    const desktop = render(
      <DesktopActions
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated={false}
        isBooking={false}
        sessionReady
        tenantScoped
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "Customer notifications",
      }),
    ).not.toBeInTheDocument();
    desktop.unmount();
    render(
      <MobileRight
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated={false}
        isBooking={false}
        mobileMenuOpen={false}
        toggleMobileMenu={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "Customer notifications",
      }),
    ).not.toBeInTheDocument();
  });
  it("keeps an empty cart out of the premium portal header", () => {
    const { rerender } = render(
      <DesktopActions
        cartCount={0}
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated
        isBooking
        onOpenCart={vi.fn()}
        sessionReady
        tenantScoped
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "cart.open",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Customer notifications",
      }),
    ).toHaveAttribute("data-view-all-href", "/portal/notifications");
    rerender(
      <DesktopActions
        cartCount={2}
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated
        isBooking
        onOpenCart={vi.fn()}
        sessionReady
        tenantScoped
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "cart.open",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("cart.items")).toHaveClass(
      "ring-[var(--tenant-background)]",
    );
    expect(screen.getByLabelText("cart.items")).toHaveAttribute(
      "data-header-badge",
      "cart-count",
    );
    expect(screen.getByLabelText("cart.items")).toHaveClass(
      "right-0",
      "top-0",
      "tabular-nums",
    );
    expect(
      screen.getByRole("button", {
        name: "Customer notifications",
      }),
    ).toHaveAttribute("data-customer-notification-menu");
  });
  it("uses the same order-entry count for desktop and mobile cart badges", () => {
    mocks.customerAuthenticated = true;
    mocks.customerSurface = CUSTOMER_SHELL_SURFACES.PORTAL;
    mocks.cart = [
      {
        id: "one-hour-booking",
        quantity: 2,
        numberOfGuests: 3,
        product: {
          kind: "open-studio",
        },
      },
    ];
    const { rerender } = render(
      <Header tenantScoped pathnameOverride="/portal" />,
    );
    const badges = screen.getAllByLabelText("cart.items");
    expect(badges).toHaveLength(2);
    for (const badge of badges) expect(badge).toHaveTextContent(/^1$/);
    mocks.cart = [
      ...mocks.cart,
      {
        id: "voucher-order",
        quantity: 4,
        product: {
          kind: "voucher",
        },
      },
    ];
    rerender(<Header tenantScoped pathnameOverride="/portal" />);
    for (const badge of screen.getAllByLabelText("cart.items"))
      expect(badge).toHaveTextContent(/^2$/);
    mocks.cart = [];
    rerender(<Header tenantScoped pathnameOverride="/portal" />);
    expect(screen.queryAllByLabelText("cart.items")).toHaveLength(0);
  });
  it("preserves the selected studio in the notifications destination", () => {
    render(
      <DesktopActions
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated
        isBooking={false}
        notificationHref="/portal/notifications?location=the-pottery-house"
        sessionReady
        tenantScoped
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Customer notifications",
      }),
    ).toHaveAttribute(
      "data-view-all-href",
      "/portal/notifications?location=the-pottery-house",
    );
  });
  it("opens the customer account drawer from an accessible desktop trigger", async () => {
    const user = userEvent.setup();
    const onOpenUserActions = vi.fn();
    const props = {
      customerSurface: CUSTOMER_SHELL_SURFACES.PORTAL,
      isAuthenticated: true,
      isBooking: false,
      onOpenUserActions,
      sessionReady: true,
      tenantScoped: true,
      userActionsControls: "customer-profile-drawer",
    };
    const { rerender } = render(<DesktopActions {...props} />);
    const trigger = screen.getByRole("button", {
      name: "account.menu",
    });
    expect(trigger).toHaveAttribute("data-profile-menu-trigger");
    expect(trigger).toHaveAttribute(
      "data-customer-portal-profile-drawer-trigger",
    );
    expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-controls", "customer-profile-drawer");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveClass(
      "hover:border-[var(--tenant-accent-on-surface)]",
    );
    expect(trigger.querySelector("svg")).toHaveClass(
      "group-hover:text-[var(--tenant-accent-on-surface)]",
    );
    expect(trigger).not.toHaveClass("hover:border-[var(--tenant-secondary)]");
    expect(
      document.querySelector("[data-customer-portal-profile-menu]"),
    ).toBeNull();
    await user.click(trigger);
    expect(onOpenUserActions).toHaveBeenCalledOnce();
    rerender(<DesktopActions {...props} userActionsOpen />);
    expect(
      screen.getByRole("button", {
        name: "account.menu",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });
  it("keeps language inside the profile flow on compact portal layouts", () => {
    render(
      <MobileRight
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        isAuthenticated
        isBooking={false}
        mobileMenuOpen={false}
        toggleMobileMenu={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("compact-header-language")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Customer notifications",
      }),
    ).toHaveAttribute("data-view-all-href", "/portal/notifications");
    const menuTrigger = screen.getByRole("button", {
      name: "openMenu",
    });
    expect(menuTrigger).toHaveAttribute(
      "data-customer-portal-mobile-menu-trigger",
      "true",
    );
    expect(menuTrigger).toHaveClass(
      "h-11",
      "bg-[var(--tenant-surface)]",
      "focus-visible:ring-[var(--tenant-secondary)]/30",
    );
  });
  it("keeps the compact public portal entry action secondary", () => {
    render(
      <MobileRight
        customerPortalHref="/portal?tab=studio-calendar"
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated
        isBooking={false}
        mobileMenuOpen={false}
        tenantAccentColor="#9DAAE2"
        tenantAccentLinkColor="#5967A9"
        toggleMobileMenu={vi.fn()}
      />,
    );
    const portalAction = screen.getByTestId("compact-header-customer-portal");
    expect(portalAction).toHaveAttribute("href", "/portal?tab=studio-calendar");
    expect(portalAction).toHaveClass("h-10", "border", "px-4");
    expect(portalAction).toHaveStyle({
      color: "#5967A9",
    });
    expect(portalAction.querySelector("svg")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Customer notifications",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "account.menu",
      }),
    ).not.toBeInTheDocument();
  });
  it.each([false, true])(
    "keeps the compact public action in the customer journey despite legacy workspace props (customer authenticated: %s)",
    async (isAuthenticated) => {
      const user = userEvent.setup();
      const onOpenWorkspace = vi.fn();
      const customerPortalHref = isAuthenticated
        ? "/portal?tab=studio-calendar"
        : "/login?next=%2Fportal%3Ftab%3Dstudio-calendar";
      render(
        <MobileRight
          canReturnToWorkspace
          customerPortalHref={customerPortalHref}
          customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
          isAuthenticated={isAuthenticated}
          isBooking={false}
          mobileMenuOpen={false}
          onOpenWorkspace={onOpenWorkspace}
          sessionReady
          tenantAccentColor="#9DAAE2"
          tenantAccentLinkColor="#5967A9"
          toggleMobileMenu={vi.fn()}
        />,
      );
      const portalAction = screen.getByRole("link", {
        name: "actions.book",
      });
      expect(portalAction).toHaveAttribute("href", customerPortalHref);
      expect(portalAction).toHaveStyle({
        color: "#5967A9",
      });
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      expect(
        document.querySelector("[data-workspace-return-action]"),
      ).toBeNull();
      await user.click(portalAction);
      expect(onOpenWorkspace).not.toHaveBeenCalled();
    },
  );
  it.each([
    [
      "desktop",
      DesktopActions,
      {
        tenantScoped: true,
      },
    ],
    [
      "mobile menu",
      MobileMenu,
      {
        isTenantRoute: true,
        open: true,
        setOpen: vi.fn(),
      },
    ],
    [
      "compact header",
      MobileRight,
      {
        toggleMobileMenu: vi.fn(),
      },
    ],
  ])(
    "waits for the customer session before showing the %s portal entry",
    (_name, Component, props) => {
      const { rerender } = render(
        <Component
          {...props}
          canReturnToWorkspace
          customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
          isAuthenticated={false}
          isBooking={false}
          sessionReady={false}
        />,
      );
      expect(
        screen.queryByRole("link", {
          name: "actions.book",
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      rerender(
        <Component
          {...props}
          canReturnToWorkspace
          customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
          isAuthenticated={false}
          isBooking={false}
          sessionReady
        />,
      );
      expect(
        screen.getByRole("link", {
          name: "actions.book",
        }),
      ).toHaveAttribute(
        "href",
        "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
      );
    },
  );
  it("keeps the compact portal entry out of a menu-only header", () => {
    render(
      <MobileRight
        customerPortalHref="/portal?tab=studio-calendar"
        customerSurface={CUSTOMER_SHELL_SURFACES.PUBLIC}
        isAuthenticated
        isBooking={false}
        menuOnly
        sessionReady
        toggleMobileMenu={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("link", {
        name: "actions.book",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "openMenu",
      }),
    ).toBeInTheDocument();
  });
  it.each([
    [
      "anonymous visitor",
      false,
      false,
      "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
    ],
    [
      "workspace-only studio owner",
      true,
      false,
      "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
    ],
    ["customer", false, true, "/portal?tab=studio-calendar"],
    [
      "studio owner with a customer session",
      true,
      true,
      "/portal?tab=studio-calendar",
    ],
  ])(
    "routes a %s through the customer journey even with old workspace URL and storage hints",
    async (
      _name,
      workspaceAuthenticated,
      customerAuthenticated,
      expectedHref,
    ) => {
      const user = userEvent.setup();
      mocks.workspaceAuthenticated = workspaceAuthenticated;
      mocks.customerAuthenticated = customerAuthenticated;
      mocks.searchParams = new URLSearchParams("from=workspace");
      window.sessionStorage.setItem(
        "shario:workspace-return:the-pottery-house",
        "1",
      );
      render(<Header tenantScoped />);
      const portalActions = screen.getAllByRole("link", {
        name: "actions.book",
      });
      expect(portalActions).toHaveLength(2);
      for (const action of portalActions) {
        expect(action).toHaveAttribute("href", expectedHref);
      }
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      await user.click(portalActions[0]);
      expect(mocks.router.push).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", {
          name: "openMenu",
        }),
      );
      const mobilePortalAction = within(
        await screen.findByRole("dialog"),
      ).getByRole("link", {
        name: "actions.book",
      });
      expect(mobilePortalAction).toHaveAttribute("href", expectedHref);
      expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
      await user.click(mobilePortalAction);
      expect(mocks.router.push).not.toHaveBeenCalled();
    },
  );
  it("keeps a cold customer session out of the public portal entry until it is ready", () => {
    mocks.workspaceAuthenticated = true;
    mocks.customerAuthenticated = true;
    mocks.customerSessionReady = false;
    mocks.searchParams = new URLSearchParams("from=workspace");
    const { rerender } = render(<Header tenantScoped />);
    expect(
      screen.queryByRole("link", {
        name: "actions.book",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
    mocks.customerSessionReady = true;
    rerender(<Header tenantScoped />);
    for (const action of screen.getAllByRole("link", {
      name: "actions.book",
    })) {
      expect(action).toHaveAttribute("href", "/portal?tab=studio-calendar");
    }
  });
  it.each(
    ["courses", "vouchers"].flatMap((page) => [
      [page, "location=vaclavska", `/${page}?location=vaclavska`],
      [page, "locationId=studio-1", `/${page}?location=studio-1`],
      [page, "location=%2F%2Fevil.example", `/${page}`],
      [page, "", `/${page}`],
    ]),
  )(
    "retains only a valid studio reference in public %s navigation: %s",
    async (page, query, expectedHref) => {
      mocks.searchParams = new URLSearchParams(query);
      mocks.publicNavigation = [
        {
          key: page,
          href: `/${page}`,
        },
      ];
      render(<Header tenantScoped />);
      expect(
        within(
          screen.getByRole("navigation", {
            name: "Desktop studio links",
          }),
        ).getByRole("link", {
          name: `nav.${page}`,
        }),
      ).toHaveAttribute("href", expectedHref);
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", {
          name: "openMenu",
        }),
      );
      expect(
        within(await screen.findByRole("dialog")).getByRole("link", {
          name: `nav.${page}`,
        }),
      ).toHaveAttribute("href", expectedHref);
    },
  );
  it("requires customer sign-in when the session belongs to another studio", () => {
    mocks.customerAuthenticated = true;
    mocks.sessionTenantSlug = "another-studio";
    render(<Header tenantScoped />);
    for (const action of screen.getAllByRole("link", {
      name: "actions.book",
    })) {
      expect(action).toHaveAttribute(
        "href",
        "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
      );
    }
    expect(screen.queryByText("openWorkspace")).not.toBeInTheDocument();
  });
  it.each([
    [
      false,
      "/login?next=%2Fportal%3Flocation%3Dvaclavska%26tab%3Dstudio-calendar",
    ],
    [true, "/portal?location=vaclavska&tab=studio-calendar"],
  ])(
    "preserves the selected studio in the booking action (authenticated: %s)",
    (authenticated, expectedHref) => {
      mocks.customerAuthenticated = authenticated;
      mocks.searchParams = new URLSearchParams("location=vaclavska");
      render(<Header tenantScoped />);
      for (const action of screen.getAllByRole("link", {
        name: "actions.book",
      })) {
        expect(action).toHaveAttribute("href", expectedHref);
      }
    },
  );
  it("uses the same booking label as the hero in both supported locales", () => {
    const en = JSON.parse(
      readFileSync(resolve(process.cwd(), "src/messages/en.json"), "utf8"),
    );
    const cs = JSON.parse(
      readFileSync(resolve(process.cwd(), "src/messages/cs.json"), "utf8"),
    );
    expect(en.PublicTenant.actions.book).toBe("Book a session");
    expect(cs.PublicTenant.actions.book).toBe("Rezervovat návštěvu");
  });
});
