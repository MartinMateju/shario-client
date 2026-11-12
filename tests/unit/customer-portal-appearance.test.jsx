import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  customerPortalCalendarThemeStyle,
  customerPortalHeaderThemeStyle,
  customerPortalPrimaryActionClass,
  customerPortalPrimaryButtonStyle,
  customerPortalProfileThemeStyle,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import DesktopNavTenant from "@/components/headers/DesktopNavTenant";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";

const readSource = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

const contrastRatio = (foreground, background) => {
  const luminance = (color) => {
    const channels = [1, 3, 5].map((index) =>
      Number.parseInt(color.slice(index, index + 2), 16),
    );
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

describe("customer portal appearance contract", () => {
  it("maps every independently customizable surface into its contrast-safe semantic scope", () => {
    expect(customerPortalHeaderThemeStyle).toMatchObject({
      "--tenant-background": "var(--tenant-portal-header-background)",
      "--tenant-surface": "var(--tenant-portal-header-surface)",
      "--tenant-text": "var(--tenant-portal-header-text)",
      "--tenant-text-on-surface": "var(--tenant-portal-header-text-on-surface)",
      "--tenant-border": "var(--tenant-portal-header-border)",
      "--tenant-accent": "var(--tenant-portal-button)",
      "--tenant-accent-foreground": "var(--tenant-portal-button-foreground)",
      "--tenant-heading-color": "var(--tenant-portal-header-heading)",
      "--tenant-interactive-hover": "var(--tenant-portal-header-secondary)",
      "--tenant-interactive-hover-on-surface":
        "var(--tenant-portal-header-secondary-on-surface)",
    });
    expect(customerPortalCalendarThemeStyle).toMatchObject({
      "--tenant-background": "var(--tenant-portal-calendar-background)",
      "--tenant-surface": "var(--tenant-portal-calendar-surface)",
      "--tenant-calendar-available-surface":
        "var(--tenant-portal-calendar-available-surface)",
      "--tenant-calendar-available-text":
        "var(--tenant-portal-calendar-available-text)",
      "--tenant-calendar-available-accent":
        "var(--tenant-portal-calendar-available-accent)",
      "--tenant-text": "var(--tenant-portal-calendar-text)",
      "--tenant-label-color": "var(--tenant-portal-calendar-label)",
      "--tenant-border": "var(--tenant-portal-calendar-border)",
      "--tenant-accent-on-surface": "var(--tenant-portal-calendar-accent)",
      "--tenant-heading-color": "var(--tenant-portal-calendar-heading)",
      "--tenant-interactive-hover": "var(--tenant-portal-calendar-accent)",
      "--tenant-interactive-hover-on-surface":
        "var(--tenant-portal-calendar-accent)",
    });
    expect(customerPortalProfileThemeStyle).toMatchObject({
      "--tenant-background": "var(--tenant-portal-profile-background)",
      "--tenant-surface": "var(--tenant-portal-profile-surface)",
      "--tenant-text": "var(--tenant-portal-profile-text)",
      "--tenant-label-color": "var(--tenant-portal-profile-label)",
      "--tenant-border": "var(--tenant-portal-profile-border)",
      "--tenant-accent-on-surface": "var(--tenant-portal-profile-accent)",
      "--tenant-interactive-hover": "var(--tenant-portal-profile-secondary)",
      "--tenant-interactive-hover-on-surface":
        "var(--tenant-portal-profile-secondary-on-surface)",
    });
    expect(customerPortalPrimaryButtonStyle).toEqual({
      backgroundColor: "var(--tenant-portal-button)",
      color: "var(--tenant-portal-button-foreground)",
    });
    expect(customerPortalPrimaryActionClass).toContain(
      "bg-[var(--tenant-portal-button)]",
    );
    expect(customerPortalPrimaryActionClass).toContain(
      "text-[var(--tenant-portal-button-foreground)]",
    );
  });

  it("routes tenant-facing hover and focus feedback through the secondary colour", () => {
    const globalStyles = readSource("src", "styles", "globals.css");
    const helpDrawer = readSource(
      "src",
      "components",
      "customer-shell",
      "CustomerPortalHelpDrawer.js",
    );
    const header = readSource("src", "components", "headers", "Header.js");
    const notificationMenu = readSource(
      "src",
      "components",
      "notifications",
      "CustomerNotificationMenu.js",
    );
    const notificationItem = readSource(
      "src",
      "components",
      "notifications",
      "CustomerNotificationItem.js",
    );
    const userActions = readSource(
      "src",
      "components",
      "headers",
      "UserActionsMenuContent.js",
    );
    const menuNavigation = readSource(
      "src",
      "components",
      "menu",
      "MenuNavigation.js",
    );
    const membership = readSource(
      "src",
      "components",
      "memberships",
      "CustomerMembershipPage.js",
    );
    const myBookings = readSource(
      "src",
      "components",
      "tables",
      "MyBookingsTable.js",
    );

    expect(globalStyles).toContain("--tenant-interactive-hover");
    expect(globalStyles).toContain("--tenant-interactive-hover-foreground");
    expect(globalStyles).toContain("[data-tenant-navigation-item]");
    expect(globalStyles).toContain('[role="switch"]');
    expect(globalStyles).toContain("label:has(");
    expect(globalStyles).toContain('[data-tenant-button="primary"]');
    expect(globalStyles).toContain(
      "background-color: var(--tenant-secondary) !important;",
    );
    expect(globalStyles).toContain(
      "color: var(--tenant-interactive-hover-foreground) !important;",
    );
    expect(globalStyles).toContain(
      "color: var(--tenant-interactive-hover) !important;",
    );
    expect(globalStyles).toContain('[aria-current="page"]');
    expect(globalStyles).toContain('[aria-pressed="true"]');
    expect(globalStyles).toContain('[aria-selected="true"]');
    expect(globalStyles).toContain('[aria-checked="true"]');
    expect(globalStyles).toContain('[aria-expanded="true"]');
    expect(globalStyles).toContain('[data-booking-duration-selected="true"]');
    expect(globalStyles).toContain(
      '[data-customer-portal-help-toggle][aria-expanded="true"]',
    );
    expect(globalStyles).toMatch(
      /\[data-customer-notification-trigger\]\[aria-expanded="true"\]\s*\n\s*\):not\(\[data-tenant-hover="preserve"\]\)/,
    );
    expect(globalStyles).toContain(
      "--tenant-portal-button: var(--tenant-secondary)",
    );
    expect(globalStyles).toContain('[data-tenant-intent="danger"]');
    expect(globalStyles).toContain('[class*="bg-warning"]');
    expect(globalStyles).toContain('[class*="text-warning"]');
    expect(globalStyles).toContain(
      ":is([data-tenant-interactive-label], svg):not(",
    );
    expect(globalStyles.match(/\[data-tenant-hover-fill\]/g)).toHaveLength(4);
    expect(helpDrawer).toContain(
      "data-tenant-style={stylePresetId || undefined}",
    );
    expect(helpDrawer).toContain('data-tenant-button="primary"');
    expect(helpDrawer).toContain("data-tenant-interactive-label");
    expect(helpDrawer).toContain('data-tenant-hover="preserve"');
    expect(header).toContain("themeStyle={tenantTheme.style}");
    expect(notificationMenu).toContain(
      "data-tenant-style={stylePresetId || undefined}",
    );
    expect(notificationMenu).toContain(
      "stylePresetId={tenantTheme.stylePresetId}",
    );
    expect(notificationMenu).toContain(
      "var(--tenant-portal-profile-secondary-on-surface)",
    );
    expect(notificationMenu).toContain('data-tenant-hover="preserve"');
    expect(notificationItem).toContain("data-tenant-interactive-label");
    expect(notificationItem).toContain('data-tenant-hover="preserve"');
    expect(notificationItem).toContain(
      "hover:bg-[var(--tenant-surface)] focus-within:bg-[var(--tenant-surface)]",
    );
    expect(userActions).toContain("data-tenant-interactive-label");
    expect(userActions).toContain('data-tenant-hover="preserve"');
    expect(menuNavigation).not.toContain("data-tenant-button");
    expect(membership).toContain('data-tenant-hover="preserve"');
    expect(membership).toContain(
      "data-tenant-style={tenantTheme.stylePresetId}",
    );
    expect(membership).toContain("style={tenantTheme.style}");
    expect(myBookings).toContain("bg-[var(--tenant-secondary-surface)]");
    expect(myBookings).toContain(
      "text-[var(--tenant-text-on-secondary-surface)]",
    );
  });

  it.each([
    {
      name: "the warm portal palette that failed the browser contrast audit",
      branding: {
        accentColor: "#2748D8",
        secondaryColor: "#D9785D",
        backgroundColor: "#F5F1EA",
        textColor: "#22221F",
      },
    },
    {
      name: "dark colours with unreadable requested text",
      branding: {
        secondaryColor: "#181818",
        backgroundColor: "#111111",
        textColor: "#121212",
      },
    },
    {
      name: "a background near the light and dark contrast boundary",
      branding: {
        secondaryColor: "#E56F51",
        backgroundColor: "#797979",
        textColor: "#FFFFFF",
      },
    },
    {
      name: "independent dark portal colours on a light public brand",
      branding: {
        secondaryColor: "#D9785D",
        backgroundColor: "#F5F1EA",
        textColor: "#22221F",
      },
      appearance: {
        backgroundColor: "#101820",
        surfaceColor: "#F8FAFC",
        textColor: "#121212",
      },
    },
  ])(
    "keeps selected booking range text readable for $name",
    ({ branding, appearance }) => {
      const theme = getPublicTenantTheme(
        { publicSite: { branding, customerPortal: { appearance } } },
        { surface: "portal" },
      );

      expect(
        contrastRatio(
          theme.style["--tenant-text-on-secondary-surface"],
          theme.style["--tenant-secondary-surface"],
        ),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("uses one flat Klei-style destination treatment in the portal header", () => {
    render(
      <DesktopNavTenant
        pathname="/portal?tab=studio-calendar"
        items={[
          {
            key: "book",
            label: "Book a session",
            href: "/portal?tab=studio-calendar",
          },
          { key: "membership", label: "Memberships", href: "/memberships" },
        ]}
        variant="portal"
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Studio navigation",
    });
    const active = screen.getByRole("link", { name: "Book a session" });

    expect(navigation).toHaveAttribute(
      "data-customer-portal-navigation-layout",
      "flat",
    );
    expect(navigation).not.toHaveAttribute(
      "data-customer-portal-navigation-pill",
    );
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("data-customer-portal-navigation-item");
    expect(active.style.backgroundColor).toBe("");
    expect(active.style.color).toBe("var(--tenant-interactive-hover)");
    expect(navigation).toHaveClass("gap-x-6", "2xl:gap-x-10");
    expect(active).toHaveClass(
      "min-h-11",
      "font-semibold",
      "tracking-[-0.012em]",
      "px-0.5",
    );
    expect(
      active.querySelector("[data-customer-portal-active-indicator]"),
    ).toHaveClass(
      "inset-x-0.5",
      "h-0.5",
      "bg-current",
      "origin-center",
      "scale-x-100",
      "duration-200",
    );
  });

  it("derives available calendar surfaces from the tenant's calendar background", () => {
    const darkTheme = getPublicTenantTheme({
      slug: "dark-calendar",
      publicSite: {
        customerPortal: {
          appearance: {
            primaryButtonColor: "#1F36D4",
            calendarBackgroundColor: "#111827",
          },
        },
      },
    });
    const lightTheme = getPublicTenantTheme({
      slug: "light-calendar",
      publicSite: {
        customerPortal: {
          appearance: {
            primaryButtonColor: "#1F36D4",
            calendarBackgroundColor: "#FFF7ED",
          },
        },
      },
    });

    expect(darkTheme.portalCalendarBackgroundColor).toBe("#111827");
    expect(lightTheme.portalCalendarBackgroundColor).toBe("#FFF7ED");
    expect(darkTheme.portalCalendarAvailableSurfaceColor).not.toBe(
      lightTheme.portalCalendarAvailableSurfaceColor,
    );
  });

  it("keeps headings tied to the website primary colour across portal backgrounds", () => {
    const theme = getPublicTenantTheme({
      slug: "palette-studio",
      publicSite: {
        branding: {
          accentColor: "#8B5CF6",
          backgroundColor: "#FFFDF8",
          textColor: "#171717",
        },
        customerPortal: {
          appearance: {
            headerBackgroundColor: "#F3E8FF",
            primaryButtonColor: "#E11D48",
            calendarBackgroundColor: "#111827",
          },
        },
      },
    });

    expect(theme.style["--tenant-heading-color"]).toBe(theme.accentLinkColor);
    expect(theme.portalHeaderHeadingColor).not.toBe(theme.portalButtonColor);
    expect(theme.portalCalendarHeadingColor).not.toBe(theme.portalButtonColor);
    expect(
      contrastRatio(
        theme.portalCalendarTextOnSurfaceColor,
        theme.portalCalendarSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrastRatio(
        theme.portalHeaderHeadingColor,
        theme.portalHeaderBackgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrastRatio(
        theme.portalCalendarHeadingColor,
        theme.portalCalendarBackgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrastRatio(
        theme.portalCalendarAvailableTextColor,
        theme.portalCalendarAvailableSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        theme.portalCalendarAvailableAccentColor,
        theme.portalCalendarAvailableSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(theme.style["--tenant-calendar-available-surface"]).toBe(
      theme.portalCalendarAvailableSurfaceColor,
    );
    expect(theme.style["--tenant-calendar-available-text"]).toBe(
      theme.portalCalendarAvailableTextColor,
    );
    expect(theme.style["--tenant-calendar-available-accent"]).toBe(
      theme.portalCalendarAvailableAccentColor,
    );
  });

  it("lowercases shared header labels only for the modern minimal preset", () => {
    const minimalTheme = getPublicTenantTheme({
      slug: "minimal-studio",
      publicSite: {
        branding: { stylePreset: "modern-minimal-v1" },
      },
    });
    const classicTheme = getPublicTenantTheme({
      slug: "classic-studio",
      publicSite: {
        branding: { stylePreset: "classic-editorial-v1" },
      },
    });

    expect(minimalTheme.style["--tenant-header-text-transform"]).toBe(
      "lowercase",
    );
    expect(classicTheme.style["--tenant-header-text-transform"]).toBe("none");
  });

  it("applies the live scopes to desktop, mobile, calendar, and profile consumers", () => {
    const header = readSource("src", "components", "headers", "Header.js");
    const desktopActions = readSource(
      "src",
      "components",
      "headers",
      "DesktopActions.js",
    );
    const mobileMenu = readSource(
      "src",
      "components",
      "headers",
      "MobileMenu.js",
    );
    const mobileProfile = readSource(
      "src",
      "components",
      "headers",
      "MobileUserActionsSheet.js",
    );
    const profileContent = readSource(
      "src",
      "components",
      "headers",
      "UserActionsMenuContent.js",
    );
    const menu = readSource("src", "components", "menu", "Menu.js");
    const studioCalendar = readSource(
      "src",
      "components",
      "calendar",
      "StudioCalendar.js",
    );
    const monthCalendar = readSource(
      "src",
      "components",
      "calendar",
      "MonthCalendar.js",
    );
    const mobileAgendaCalendar = readSource(
      "src",
      "components",
      "calendar",
      "MobileAgendaCalendar.js",
    );
    const menuHeader = readSource("src", "components", "menu", "MenuHeader.js");
    const headerStyles = readSource(
      "src",
      "components",
      "headers",
      "customerPortalHeader.module.css",
    );

    expect(header).toContain("customerPortalHeaderThemeStyle");
    expect(header).toContain("var(--tenant-portal-header-background)");
    expect(header).toContain("styles.tenantHeader");
    expect(headerStyles).toContain("[data-customer-portal-entry-action]");
    expect(headerStyles).toContain("--tenant-header-text-transform");
    expect(desktopActions).toContain(
      "data-customer-portal-profile-drawer-trigger",
    );
    expect(desktopActions).toContain('aria-haspopup="dialog"');
    expect(desktopActions).not.toContain("customerPortalProfileThemeStyle");
    expect(header).toContain("userActionsControls={customerProfileDialogId}");
    expect(header).toContain("dialogId={customerProfileDialogId}");
    expect(mobileMenu).toContain("customerPortalHeaderThemeStyle");
    expect(mobileProfile).toContain("customerPortalProfileThemeStyle");
    expect(mobileProfile).toContain("data-customer-portal-profile-drawer");
    expect(profileContent).toContain("bg-[var(--tenant-background)]");
    expect(profileContent).toContain("text-[var(--tenant-label-color)]");
    expect(menu).toContain("customerPortalCalendarThemeStyle");
    expect(menu).toContain("--tenant-portal-calendar-background");
    expect(studioCalendar).toContain("CUSTOMER_CALENDAR_THEME_STYLE");
    expect(studioCalendar).toContain(
      '"--tenant-background": "var(--tenant-portal-calendar-background)"',
    );
    expect(menu).toContain("requireBookingEnabled");
    expect(monthCalendar).toContain("--tenant-calendar-available-accent");
    expect(mobileAgendaCalendar).toContain("--tenant-calendar-available-text");
    expect(mobileAgendaCalendar).toContain(
      "--tenant-calendar-available-accent",
    );
    expect(mobileAgendaCalendar).toContain(
      "focus-visible:ring-[var(--tenant-calendar-available-accent)]",
    );
    expect(mobileAgendaCalendar).toContain('!slot.isBookable && "opacity-70"');
    expect(menuHeader).toContain("data-customer-portal-account-summary");
    expect(menuHeader).toContain('fontFamily: "var(--tenant-font-display)"');
    expect(menuHeader).not.toContain("data-customer-portal-primary-action");
  });
});
