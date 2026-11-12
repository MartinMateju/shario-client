import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  publicTenant: null,
  creditCalls: [],
  replace: vi.fn(),
  persistCurrent: vi.fn(),
  state: {
    auth: {
      userInfo: {
        firstName: "Martin",
        lastName: "Mateju",
        email: "martin@example.test",
      },
      tenant: {
        slug: "the-pottery-house",
        modules: {
          bookings: true,
          courses: true,
          credits: true,
          firing: true,
          memberships: true,
          payments: true,
        },
        settings: {
          currency: "CZK",
          adminLanguage: "cs",
        },
      },
      workspaceAccess: {
        role: "owner",
        status: "active",
        effectivePermissions: ["workspace.update"],
      },
    },
  },
  pathname: "/portal/credits",
  location: {
    activeLocationReference: "atelier-prague",
    activeLocation: {
      name: "Atelier Prague",
      booking: {
        enabled: false,
      },
    },
  },
}));
const messages = {
  "sections.customer": "Your account",
  "sections.activity": "Studio activity",
  "sections.payments": "Account & payments",
  "sections.personal": "Personal",
  "sections.workspace": "Workspace",
  "tenantLinks.dashboard": "Studio dashboard",
  "tenantLinks.account": "Account settings",
  "tenantLinks.preferences": "Personal preferences",
  "tenantLinks.setupCenter": "Launch Center",
  "tenantLinks.settings": "Workspace settings",
  "tenantLinks.bookingSite": "View public site",
  "tenantLinks.bookingSiteNewTab": "View public site in a new tab",
  "customerLinks.bookings": "My bookings",
  "customerLinks.waitlists": "Waitlists",
  "customerLinks.services": "Services",
  "customerLinks.work": "My work",
  "customerLinks.lostFound": "Lost & Found",
  "customerLinks.knowledge": "Studio guide",
  "customerLinks.credits": "Credits",
  "customerLinks.membership": "Membership",
  "customerLinks.invoices": "Invoices",
  "customerLinks.account": "Account",
  eyebrow: "Your account",
  fallbackName: "Your account",
  "roles.customer": "Customer",
  language: "Language",
  changeLanguage: "Change language",
  logout: "Log out",
  menu: "User menu",
};
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => messages[key] || key,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentUser: (state) => state.auth.userInfo,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("location=atelier-prague"),
}));
vi.mock("@/i18n/customerLocalePreference", () => ({
  persistCustomerCurrentLocale: (...args) => mocks.persistCurrent(...args),
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetMyCreditBalanceQuery: (args, options) => {
    mocks.creditCalls.push({
      args,
      options,
    });
    return {
      data: {
        balance: 400,
      },
      isLoading: false,
    };
  },
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.publicTenant
      ? {
          tenant: mocks.publicTenant,
        }
      : null,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.location,
}));
import UserActionsMenuContent from "@/components/headers/UserActionsMenuContent";
const renderMenu = (props = {}) => {
  const callbacks = {
    onClose: vi.fn(),
    onLogout: vi.fn(),
    onOpenBookingSite: vi.fn(),
    onSwitchToAdminMode: vi.fn(),
    toggleLanguage: vi.fn(),
  };
  const result = render(<UserActionsMenuContent {...callbacks} {...props} />);
  return {
    ...result,
    callbacks,
  };
};
describe("UserActionsMenuContent", () => {
  beforeEach(() => {
    mocks.publicTenant = null;
    mocks.creditCalls = [];
    mocks.replace.mockReset();
    mocks.persistCurrent.mockReset();
    delete mocks.state.auth.tenant.publicSite;
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");
    mocks.pathname = "/portal/credits";
    mocks.location = {
      activeLocationReference: "atelier-prague",
      activeLocation: {
        name: "Atelier Prague",
        booking: {
          enabled: false,
        },
      },
    };
    mocks.state.auth.userInfo = {
      firstName: "Martin",
      lastName: "Mateju",
      email: "martin@example.test",
    };
    mocks.state.auth.tenant.slug = "the-pottery-house";
    mocks.state.auth.tenant.settings = {
      currency: "CZK",
      adminLanguage: "cs",
      publicDefaultLanguage: "cs",
      supportedPublicLanguages: ["cs"],
    };
    mocks.state.auth.tenant.modules = {
      bookings: true,
      courses: true,
      credits: true,
      firing: true,
      memberships: true,
      payments: true,
    };
    mocks.state.auth.workspaceAccess = {
      role: "owner",
      status: "active",
      effectivePermissions: ["workspace.update"],
    };
  });
  it("separates personal and workspace actions without repeating the current dashboard", () => {
    const { callbacks, container } = renderMenu({
      isAdminRoute: true,
    });
    const personal = screen.getByRole("region", {
      name: "Personal",
    });
    const workspace = screen.getByRole("region", {
      name: "Workspace",
    });
    expect(
      within(personal).getByRole("link", {
        name: "Account settings",
      }),
    ).toHaveAttribute("href", "/app/account");
    expect(
      within(personal).getByRole("link", {
        name: "Personal preferences",
      }),
    ).toHaveAttribute("href", "/app/preferences");
    expect(
      within(workspace).getByRole("link", {
        name: "Launch Center",
      }),
    ).toHaveAttribute("href", "/app/setup");
    expect(
      within(workspace).getByRole("link", {
        name: "Workspace settings",
      }),
    ).toHaveAttribute("href", "/app/settings");
    const publicSiteLink = within(workspace).getByRole("link", {
      name: "View public site in a new tab",
    });
    const publicSiteUrl = new URL(publicSiteLink.getAttribute("href"));
    expect(publicSiteLink).toHaveTextContent("View public site");
    expect(publicSiteLink).toHaveAttribute("target", "_blank");
    expect(publicSiteLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(publicSiteUrl.hostname).toBe("the-pottery-house.shario.localhost");
    expect(publicSiteUrl.pathname).toBe("/cs");
    expect(publicSiteUrl.searchParams.get("from")).toBe("workspace");
    publicSiteLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(publicSiteLink);
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(callbacks.onOpenBookingSite).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", {
        name: "Studio dashboard",
      }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("[data-profile-menu-scroll]")).toHaveClass(
      "min-h-0",
      "overflow-y-auto",
    );
    expect(container.querySelector("[data-profile-menu-footer]")).toHaveClass(
      "shrink-0",
      "grid-cols-2",
    );
  });
  it("keeps only the useful return-to-dashboard action on the public surface", () => {
    const { callbacks } = renderMenu({
      isAdminRoute: false,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Studio dashboard",
      }),
    );
    expect(callbacks.onSwitchToAdminMode).toHaveBeenCalledOnce();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("link", {
        name: "View public site in a new tab",
      }),
    ).not.toBeInTheDocument();
  });
  it("uses tenant-origin links for workspace actions shown on the platform host", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");
    mocks.pathname = "/";
    renderMenu({
      isAdminRoute: false,
    });
    const expectedPaths = [
      ["Account settings", "/cs/app/account"],
      ["Personal preferences", "/cs/app/preferences"],
      ["Launch Center", "/cs/app/setup"],
      ["Workspace settings", "/cs/app/settings"],
    ];
    for (const [name, pathname] of expectedPaths) {
      const href = screen
        .getByRole("link", {
          name,
        })
        .getAttribute("href");
      const target = new URL(href);
      expect(target.hostname).toBe("the-pottery-house.shario.localhost");
      expect(target.pathname).toBe(pathname);
    }
    const languageTarget = new URL(
      screen
        .getByRole("link", {
          name: /Language/,
        })
        .getAttribute("href"),
    );
    expect(languageTarget.hostname).toBe("the-pottery-house.shario.localhost");
    expect(languageTarget.pathname).toBe("/cs/app/settings/general");
  });
  it("fails closed instead of emitting platform-relative app links without a tenant slug", () => {
    mocks.pathname = "/";
    mocks.state.auth.tenant.slug = "";
    renderMenu({
      isAdminRoute: false,
    });
    for (const name of [
      "Account settings",
      "Personal preferences",
      "Launch Center",
      "Workspace settings",
    ]) {
      expect(
        screen.getByRole("link", {
          name,
        }),
      ).toHaveAttribute("href", "/login");
    }
  });
  it("keeps the legacy public-site fallback as an explicit new-tab action", () => {
    mocks.state.auth.tenant.slug = "";
    const { callbacks } = renderMenu({
      isAdminRoute: true,
    });
    const fallbackAction = screen.getByRole("button", {
      name: "View public site in a new tab",
    });
    expect(fallbackAction).toHaveTextContent("View public site");
    fireEvent.click(fallbackAction);
    expect(callbacks.onOpenBookingSite).toHaveBeenCalledOnce();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
  });
  it("links workspace language to General settings and keeps logout compact", () => {
    const { callbacks } = renderMenu({
      isAdminRoute: true,
    });
    const languageLink = screen.getByRole("link", {
      name: /Language/,
    });
    expect(languageLink).toHaveAttribute("href", "/app/settings/general");
    expect(languageLink).toHaveTextContent("CS");
    fireEvent.click(languageLink);
    expect(callbacks.toggleLanguage).not.toHaveBeenCalled();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Log out",
      }),
    );
    expect(callbacks.onLogout).toHaveBeenCalledOnce();
    expect(callbacks.onClose).toHaveBeenCalledTimes(2);
  });
  it("shows the inherited workspace language as read-only for staff", () => {
    mocks.state.auth.workspaceAccess.role = "staff";
    mocks.state.auth.workspaceAccess.effectivePermissions = [];
    renderMenu({
      isAdminRoute: true,
    });
    expect(
      screen.queryByRole("link", {
        name: /Language/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Language/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
  it("offers the studio's actual languages in customer mode even for workspace owners", () => {
    mocks.state.auth.tenant.settings.publicDefaultLanguage = "cs";
    mocks.state.auth.tenant.settings.supportedPublicLanguages = ["cs", "en"];
    const { callbacks } = renderMenu({
      portalThemed: true,
    });
    const languageSelect = screen.getByRole("combobox", {
      name: "Change language",
    });
    expect(languageSelect).toHaveValue("en");
    expect(screen.getAllByRole("option").map((option) => option.value)).toEqual(
      ["cs", "en"],
    );
    expect(
      screen.queryByRole("link", {
        name: /Language/,
      }),
    ).not.toBeInTheDocument();
    fireEvent.change(languageSelect, {
      target: {
        value: "cs",
      },
    });
    expect(callbacks.toggleLanguage).not.toHaveBeenCalled();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(mocks.persistCurrent).toHaveBeenCalledWith(
      "cs",
      "the-pottery-house",
    );
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("/portal/credits?location=atelier-prague"),
      {
        locale: "cs",
        scroll: false,
      },
    );
  });
  it.each([
    [null, "cs"],
    ["en", "en"],
    ["de", "cs"],
  ])(
    "opens the public site using saved customer default %s or Czech primary, not workspace English",
    (preference, expectedLocale) => {
      mocks.state.auth.tenant.settings.supportedPublicLanguages = ["cs", "en"];
      mocks.state.auth.userInfo.customerDefaultLanguage = preference;
      renderMenu({
        isAdminRoute: true,
      });
      const url = new URL(
        screen
          .getByRole("link", {
            name: "View public site in a new tab",
          })
          .getAttribute("href"),
      );
      expect(url.pathname).toBe(`/${expectedLocale}`);
      expect(url.searchParams.get("from")).toBe("workspace");
    },
  );
  it("omits unsupported specialist destinations for customers", () => {
    mocks.state.auth.workspaceAccess = null;
    renderMenu();
    expect(
      screen.queryByRole("link", {
        name: "Services",
      }),
    ).not.toBeInTheDocument();
  });
  it("uses the premium portal identity and focused location-aware information architecture", () => {
    mocks.state.auth.workspaceAccess = null;
    const { container } = renderMenu({
      portalThemed: true,
    });
    expect(
      container.querySelector("[data-profile-menu-identity]"),
    ).toHaveTextContent("Martin Mateju");
    expect(
      container.querySelector("[data-profile-menu-identity]"),
    ).toHaveTextContent("martin@example.test");
    expect(
      container.querySelector("[data-profile-menu-identity]"),
    ).toHaveTextContent("Atelier Prague");
    expect(container.querySelector("[data-profile-menu-identity]")).toHaveClass(
      "sm:px-3.5",
      "sm:py-2.5",
    );
    expect(
      container.querySelector("[data-profile-menu-identity]").style.background,
    ).toContain("linear-gradient");
    expect(
      container.querySelector("[data-profile-menu-customer-name]"),
    ).not.toHaveAttribute("data-tenant-type", "display");
    expect(
      container.querySelector("[data-profile-menu-identity]").innerHTML,
    ).not.toContain("w-28");
    expect(
      container.querySelector("[data-customer-portal-profile-content]"),
    ).toBeInTheDocument();
    const portalScrollRegion = screen.getByRole("navigation", {
      name: "User menu",
    });
    expect(portalScrollRegion).toHaveClass(
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
      "scrollbar-hidden",
      "sm:py-1.5",
    );
    expect(portalScrollRegion).toHaveAttribute("data-profile-menu-scroll");
    expect(
      container.querySelectorAll('[data-tenant-surface="field"]'),
    ).toHaveLength(0);
    expect(container.querySelectorAll("[data-profile-menu-item]")).toHaveLength(
      4,
    );
    expect(
      container.querySelectorAll("[data-profile-menu-item-label]"),
    ).toHaveLength(4);
    expect(
      container.querySelector("[data-profile-menu-identity] > div span"),
    ).toHaveAttribute("aria-hidden", "true");
    const studioActivity = screen.getByRole("region", {
      name: "Studio activity",
    });
    const expectedLinks = [
      ["My bookings", "/portal/bookings?location=atelier-prague"],
      ["Waitlists", "/portal/waitlists?location=atelier-prague"],
      ["Credits", "/portal/credits?location=atelier-prague"],
      ["Account", "/portal/account?location=atelier-prague"],
    ];
    for (const [name, href] of expectedLinks) {
      expect(
        screen.getByRole("link", {
          name: new RegExp(name),
        }),
      ).toHaveAttribute("href", href);
      expect(
        screen.getByRole("link", {
          name: new RegExp(name),
        }),
      ).toHaveClass("min-h-11");
      expect(
        screen.getByRole("link", {
          name: new RegExp(name),
        }),
      ).toHaveAttribute("data-tenant-hover", "preserve");
    }
    expect(
      screen.queryByRole("link", {
        name: "Knowledge Hub",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: "Invoices",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: "Membership",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("link", {
        name: /Credits/,
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/CZK\s*400/)).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.queryByText(/400[.,]00/)).toBeNull();
    expect(container.querySelector("[data-profile-menu-footer]")).toHaveClass(
      "shrink-0",
      "sm:p-2",
    );
    expect(
      container.querySelector("[data-profile-menu-identity] > div span"),
    ).toHaveClass("sm:h-10", "sm:w-10");
  });
  it("keeps booking history in the customer profile", () => {
    mocks.state.auth.workspaceAccess = null;
    mocks.state.auth.tenant.modules.bookings = false;
    mocks.state.auth.tenant.modules.courses = true;
    mocks.location.activeLocation.booking.enabled = true;
    renderMenu({
      portalThemed: true,
    });
    const studioActivity = screen.getByRole("region", {
      name: "Studio activity",
    });
    expect(
      within(studioActivity).getByRole("link", {
        name: "My bookings",
      }),
    ).toBeInTheDocument();
  });
  it("honours customer module gating and closes after navigation", () => {
    mocks.state.auth.workspaceAccess = null;
    mocks.state.auth.tenant.modules.credits = false;
    mocks.state.auth.tenant.modules.firing = false;
    mocks.state.auth.tenant.modules.payments = false;
    const { callbacks } = renderMenu({
      portalThemed: true,
    });
    expect(
      screen.queryByRole("link", {
        name: /Credits/,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: "My work",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: "Invoices",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "Waitlists",
      }),
    ).toHaveAttribute("href", "/portal/waitlists?location=atelier-prague");
    fireEvent.click(
      screen.getByRole("link", {
        name: "Account",
      }),
    );
    expect(callbacks.onClose).toHaveBeenCalledOnce();
  });
  it("hides disabled portal pages using published settings and retains sign-out when every profile destination is disabled", () => {
    mocks.state.auth.workspaceAccess = null;
    mocks.publicTenant = {
      publicSite: {
        customerPortal: {
          pages: Object.fromEntries(
            [
              "bookings",
              "waitlists",
              "work",
              "credits",
              "invoices",
              "account",
            ].map((id) => [
              id,
              {
                enabled: false,
              },
            ]),
          ),
        },
      },
    };
    const { callbacks } = renderMenu({
      portalThemed: true,
    });
    for (const label of [
      "My bookings",
      "Waitlists",
      "My work",
      "Credits",
      "Invoices",
      "Account",
    ]) {
      expect(
        screen.queryByRole("link", {
          name: new RegExp(`^${label}`),
        }),
      ).not.toBeInTheDocument();
    }
    expect(mocks.creditCalls.at(-1).options.skip).toBe(true);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Log out",
      }),
    );
    expect(callbacks.onLogout).toHaveBeenCalledOnce();
  });
  it("does not apply public page visibility to workspace actions", () => {
    mocks.state.auth.tenant.publicSite = {
      customerPortal: {
        pages: {
          account: {
            enabled: false,
          },
        },
      },
    };
    renderMenu({
      isAdminRoute: true,
    });
    expect(
      screen.getByRole("link", {
        name: "Account settings",
      }),
    ).toHaveAttribute("href", "/app/account");
  });
  it("keeps the workspace menu presentation isolated from portal styling", () => {
    const { container } = renderMenu({
      isAdminRoute: true,
    });
    expect(
      container.querySelector("[data-customer-portal-profile-content]"),
    ).toBeNull();
    expect(container.querySelector("[data-profile-menu-identity]")).toBeNull();
    expect(
      screen.getByRole("region", {
        name: "Workspace",
      }),
    ).toBeInTheDocument();
  });
});
