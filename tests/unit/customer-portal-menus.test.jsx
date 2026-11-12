import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const messages = {
        "Header.closeMenu": "Close menu",
        "Header.changeLanguage": "Change language",
        "Header.account.eyebrow": "Your account",
        "Header.account.menu": "User menu",
        "Header.account.closeMenu": "Close user menu",
        "Header.mobile.navigation": "Mobile navigation",
        "Header.mobile.myAccount": "My account",
        "Header.mobile.language": "Language",
        "Header.mobile.tagline": "Studio tools",
        "CustomerShell.mobile.portalEyebrow": "Customer portal",
        "CustomerShell.mobile.portalTitle": `Your account at ${values.studio || "Studio"}`,
        "PublicTenant.mobile.poweredBy": "Powered by shario.io",
      };

      return messages[`${namespace}.${key}`] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/headers/DesktopNavAdmin", () => ({
  ADMIN_LINKS: [],
  isAdminItemActive: () => false,
  isAdminSectionActive: () => false,
}));

vi.mock("@/components/headers/marketingNavigation", () => ({
  PUBLIC_NAV_ITEMS: [],
}));

vi.mock("@/components/headers/UserActionsMenuContent", () => ({
  default: ({ portalThemed }) => (
    <div data-testid="profile-content" data-portal-themed={portalThemed}>
      Martin Maker
    </div>
  ),
}));

import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
import MobileMenu from "@/components/headers/MobileMenu";
import MobileUserActionsSheet from "@/components/headers/MobileUserActionsSheet";
import portalMenuStyles from "@/components/headers/portalMobileMenu.module.css";

const tenantThemeStyle = {
  "--tenant-accent": "#2748D8",
  "--tenant-accent-foreground": "#FFFFFF",
  "--tenant-accent-link": "#2748D8",
  "--tenant-accent-on-surface": "#2748D8",
  "--tenant-secondary": "#D27357",
  "--tenant-surface": "#F6F3ED",
  "--tenant-background": "#FCFAF7",
  "--tenant-muted-on-surface": "#696861",
  "--tenant-text": "#22221F",
  "--tenant-text-on-surface": "#22221F",
  "--tenant-font-display": '"Barlow Condensed", sans-serif',
  "--tenant-radius-card": "0.25rem",
  "--tenant-shadow-card": "none",
};

const tenant = {
  name: "Studio Emilka",
  publicSite: { branding: { displayName: "Studio Emilka" } },
};

const presetCases = [
  {
    name: "Classic Editorial",
    id: "classic-editorial-v1",
    font: 'var(--font-editorial, "Playfair Display")',
    radius: "1.25rem",
  },
  {
    name: "Modern Minimal",
    id: "modern-minimal-v1",
    font: 'var(--font-modern-display, "Barlow Condensed")',
    radius: "0.25rem",
  },
  {
    name: "Warm Organic",
    id: "warm-organic-v1",
    font: 'var(--font-warm-display, "Fraunces")',
    radius: "2rem 1rem 2rem 1rem",
  },
];

describe("customer portal mobile menus", () => {
  it.each([false, true])(
    "uses the real tenant logo opt-in in the mobile menu: enabled=%s",
    (enabled) => {
      const closeMobileMenu = vi.fn();
      render(
        <MobileMenu
          open
          setOpen={vi.fn()}
          isTenantRoute
          isAuthenticated
          closeMobileMenu={closeMobileMenu}
          showLanguageSelector={false}
          customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
          tenant={{
            ...tenant,
            publicSite: {
              branding: {
                ...tenant.publicSite.branding,
                logoUrl: "https://assets.example.test/logo.svg",
                logoRedirectEnabled: enabled,
                logoRedirectUrl: "https://www.atelierklei.cz/",
              },
            },
          }}
          tenantBrandHref="/portal?location=studio-emilka"
          tenantThemeStyle={tenantThemeStyle}
        />,
      );

      const logo = screen.getByRole("img", { name: "Studio Emilka" });
      const link = screen.queryByRole("link", { name: "Studio Emilka" });
      if (enabled) {
        expect(link).toHaveAttribute("href", "https://www.atelierklei.cz/");
        link.addEventListener("click", (event) => event.preventDefault());
        fireEvent.click(logo);
        expect(closeMobileMenu).toHaveBeenCalledOnce();
      } else {
        expect(link).toBeNull();
        expect(logo.closest("a, button")).toBeNull();
        expect(logo.parentElement).not.toHaveAttribute("tabindex");
        fireEvent.click(logo);
        expect(closeMobileMenu).not.toHaveBeenCalled();
      }
    },
  );

  it.each(presetCases)(
    "propagates $name into the portalled profile sheet",
    ({ id, font, radius }) => {
      render(
        <MobileUserActionsSheet
          open
          setOpen={vi.fn()}
          onLogout={vi.fn()}
          toggleLanguage={vi.fn()}
          customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
          tenantThemeStyle={{
            ...tenantThemeStyle,
            "--tenant-font-display": font,
            "--tenant-radius-card": radius,
          }}
          tenantStylePresetId={id}
        />,
      );

      const panel = document.querySelector(
        "[data-customer-portal-profile-sheet]",
      );
      expect(panel).toHaveAttribute("data-tenant-style", id);
      expect(panel.style.getPropertyValue("--tenant-font-display")).toBe(font);
      expect(panel.style.getPropertyValue("--tenant-radius-card")).toBe(radius);
    },
  );

  it("renders a tenant-themed, location-preserving portal navigation", () => {
    const closeMobileMenu = vi.fn();
    render(
      <MobileMenu
        open
        setOpen={vi.fn()}
        pathname="/portal/membership?location=studio-emilka"
        isTenantRoute
        isAuthenticated
        closeMobileMenu={closeMobileMenu}
        toggleLanguage={vi.fn()}
        onOpenUserActions={vi.fn()}
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        tenant={tenant}
        tenantBrandHref="/portal?location=studio-emilka"
        portalStudioName="Studio Emilka"
        tenantNavigation={[
          {
            key: "bookSession",
            label: "Book a session",
            href: "/portal?tab=studio-calendar&location=studio-emilka",
          },
          {
            key: "memberships",
            label: "Memberships",
            href: "/portal/membership?location=studio-emilka",
          },
        ]}
        tenantAccentColor="#2748D8"
        tenantAccentForeground="#FFFFFF"
        tenantThemeStyle={tenantThemeStyle}
        tenantStylePresetId="modern-minimal-v1"
        userInitials="MM"
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Mobile navigation" }),
    ).toBeInTheDocument();

    const panel = document.querySelector("[data-customer-portal-mobile-menu]");
    expect(panel).toHaveStyle({
      "--tenant-surface": "var(--tenant-portal-header-surface)",
      "--tenant-accent": "var(--tenant-portal-button)",
      "--tenant-text": "var(--tenant-portal-header-text)",
      "--tenant-heading-color": "var(--tenant-portal-header-heading)",
      "--tenant-radius-card": "0.25rem",
      "--tenant-shadow-card": "none",
    });
    expect(panel).toHaveAttribute("data-tenant-style", "modern-minimal-v1");
    expect(panel).toHaveClass(portalMenuStyles.portalMenu);
    const navigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(navigation).toHaveClass(portalMenuStyles.navigation);
    expect(
      document.querySelector("[data-customer-portal-mobile-navigation]"),
    ).toHaveClass(portalMenuStyles.navigationList);
    const booking = within(navigation).getByRole("link", {
      name: "Book a session",
      exact: true,
    });
    const membership = within(navigation).getByRole("link", {
      name: "Memberships",
      exact: true,
    });
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
    expect(membership).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getAllByRole("link", { current: "page" }),
    ).toEqual([membership]);
    expect(booking).toHaveAttribute(
      "href",
      "/portal?tab=studio-calendar&location=studio-emilka",
    );
    expect(membership).toHaveAttribute(
      "href",
      "/portal/membership?location=studio-emilka",
    );
    expect(membership).toHaveClass(portalMenuStyles.navigationLink);
    expect(membership).toHaveAttribute("data-tenant-hover", "preserve");
    expect(screen.getByText("Memberships")).toHaveClass(
      portalMenuStyles.navigationLabel,
    );
    expect(
      membership.querySelector(`.${portalMenuStyles.navigationIcon}`),
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      membership.querySelector(`.${portalMenuStyles.navigationChevron}`),
    ).toHaveAttribute("aria-hidden", "true");

    for (const link of screen.getAllByRole("link")) {
      if (link.textContent.includes("Studio Emilka")) continue;
      expect(link.getAttribute("href")).toContain("location=studio-emilka");
    }

    expect(booking).not.toHaveAttribute("aria-current");
    membership.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(membership);
    expect(closeMobileMenu).toHaveBeenCalledOnce();

    expect(
      screen.queryByRole("button", { name: "Change language" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveClass(
      "h-11",
      "w-11",
    );
  });

  it("closes the navigation before opening the customer profile flow", () => {
    const calls = [];

    render(
      <MobileMenu
        open
        setOpen={vi.fn()}
        pathname="/portal?tab=studio-calendar&location=studio-emilka"
        isTenantRoute
        isAuthenticated
        closeMobileMenu={() => calls.push("close")}
        toggleLanguage={vi.fn()}
        onOpenUserActions={() => calls.push("account")}
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        tenant={tenant}
        tenantNavigation={[]}
        tenantThemeStyle={tenantThemeStyle}
        tenantStylePresetId="modern-minimal-v1"
        userInitials="MM"
      />,
    );

    const account = document.querySelector(
      "[data-customer-portal-mobile-account]",
    );
    expect(account).toHaveClass("min-h-12");
    fireEvent.click(account);
    expect(calls).toEqual(["close", "account"]);
  });

  it("keeps the customer account drawer available at every portal breakpoint", async () => {
    const setOpen = vi.fn();
    const onClose = vi.fn();

    render(
      <MobileUserActionsSheet
        open
        setOpen={setOpen}
        dialogId="customer-profile-drawer"
        onClose={onClose}
        onLogout={vi.fn()}
        toggleLanguage={vi.fn()}
        userInitials="MM"
        customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
        tenantThemeStyle={tenantThemeStyle}
        tenantStylePresetId="modern-minimal-v1"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "User menu" });
    expect(dialog).not.toHaveClass("xl:hidden", "lg:hidden");

    const panel = document.querySelector(
      "[data-customer-portal-profile-sheet]",
    );
    expect(panel).toHaveAttribute("id", "customer-profile-drawer");
    expect(panel).toHaveAttribute(
      "data-customer-portal-profile-drawer",
      "true",
    );
    expect(panel).toHaveAttribute("data-dialog-layout", "drawer");
    expect(panel).toHaveStyle({
      "--tenant-surface": "var(--tenant-portal-profile-surface)",
      "--tenant-accent": "var(--tenant-portal-button)",
      "--tenant-font-display": '"Barlow Condensed", sans-serif',
    });
    expect(panel).toHaveAttribute("data-tenant-style", "modern-minimal-v1");
    expect(panel).toHaveClass(
      "relative",
      "rounded-none",
      "max-h-[min(90dvh,760px)]",
      "sm:w-[min(420px,calc(100vw-32px))]",
    );
    expect(panel).not.toHaveClass(
      "rounded-t-[var(--tenant-radius-panel)]",
      "sm:rounded-l-[var(--tenant-radius-panel)]",
    );
    expect(panel.style.boxShadow).toBe("var(--tenant-shadow-floating)");
    expect(screen.getByTestId("profile-content")).toHaveAttribute(
      "data-portal-themed",
      "true",
    );
    const closeButton = screen.getByRole("button", {
      name: "Close user menu",
    });
    expect(closeButton).toHaveClass(
      "h-11",
      "w-11",
      "hover:border-[var(--tenant-accent-on-surface)]",
    );
    expect(closeButton).toHaveAttribute("data-tenant-hover", "preserve");

    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(setOpen).toHaveBeenCalledWith(false);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
