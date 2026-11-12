import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/utils/locationBookingUtils", () => ({
  formatLocationAddress: (location) => location.address || "",
  getEntityId: (location) => String(location?.id || ""),
}));

vi.mock("@/components/menu/menuUtils", () => ({
  classNames: (...classes) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  normalizePublicTenantLogoSize: (value) => Number(value) || 48,
}));

import DesktopNavTenant from "@/components/headers/DesktopNavTenant";
import StudioSwitcher from "@/components/menu/StudioSwitcher";

const navigationItems = [
  {
    key: "bookSession",
    href: "/portal?tab=studio-calendar",
    label: "Book a session",
  },
  { key: "courses", href: "/portal/courses", label: "Courses" },
  { key: "memberships", href: "/portal/membership", label: "Memberships" },
  { key: "giftVouchers", href: "/portal/vouchers", label: "Gift vouchers" },
  { key: "studioGuide", href: "/portal/knowledge", label: "Studio guide" },
];

const locations = [
  {
    id: "studio-brno",
    name: "The Pottery House",
    address: "Brno",
    isActive: true,
    isPrimary: true,
  },
  {
    id: "studio-prague",
    name: "The Pottery House Prague",
    address: "Prague",
    isActive: true,
  },
];

describe("customer portal header navigation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("renders every destination as calm text navigation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/headers/DesktopNavTenant.js"),
      "utf8",
    );
    render(
      <DesktopNavTenant
        pathname="/portal?tab=studio-calendar"
        items={navigationItems}
        variant="portal"
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Studio navigation",
    });
    const links = screen.getAllByRole("link");
    const booking = screen.getByRole("link", { name: "Book a session" });
    const membership = screen.getByRole("link", { name: "Memberships" });

    expect(navigation).toHaveAttribute(
      "data-customer-portal-navigation-layout",
      "flat",
    );
    expect(navigation).not.toHaveAttribute(
      "data-customer-portal-navigation-pill",
    );
    expect(navigation).toHaveClass("gap-x-6", "2xl:gap-x-10");
    expect(links).toHaveLength(navigationItems.length);

    links.forEach((link) => {
      expect(link).toHaveAttribute("data-customer-portal-navigation-item");
      expect(link).not.toHaveAttribute(
        "data-customer-portal-primary-navigation",
      );
      expect(link).toHaveClass(
        "min-h-11",
        "font-semibold",
        "tracking-[-0.012em]",
        "px-0.5",
      );
      expect(link.style.fontWeight).toBe("600");
      expect(link.style.minHeight).toBe("2.75rem");
      expect(link.style.textTransform).toBe(
        "var(--tenant-header-text-transform, none)",
      );
      expect(link).not.toHaveAttribute("data-tenant-button");
      expect(link).not.toHaveAttribute("data-tenant-button-compact");
      expect(link.style.backgroundColor).toBe("");
      expect(link.querySelector("svg")).not.toBeInTheDocument();
    });
    expect(source).toContain('"clamp(0.8125rem, 0.78vw, 0.9375rem)"');

    expect(booking).toHaveAttribute("aria-current", "page");
    expect(
      booking.querySelector("[data-customer-portal-active-indicator]"),
    ).toHaveClass(
      "inset-x-0.5",
      "h-0.5",
      "scale-x-100",
      "origin-center",
      "duration-200",
      "motion-reduce:transition-none",
    );
    expect(
      membership.querySelector("[data-customer-portal-active-indicator]"),
    ).toHaveClass(
      "scale-x-0",
      "group-hover:scale-x-100",
      "group-focus-visible:scale-x-100",
      "origin-center",
    );
  });

  it("marks exactly one secondary destination with a restrained indicator", () => {
    render(
      <DesktopNavTenant
        pathname="/portal/membership?location=the-pottery-house"
        items={navigationItems}
        variant="portal"
      />,
    );

    const booking = screen.getByRole("link", { name: "Book a session" });
    const membership = screen.getByRole("link", { name: "Memberships" });

    expect(booking).not.toHaveAttribute("aria-current");
    expect(membership).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(
      membership.querySelector("[data-customer-portal-active-indicator]"),
    ).toHaveClass("inset-x-0.5", "h-0.5", "scale-x-100", "origin-center");
  });

  it("accepts a localized navigation landmark label", () => {
    render(
      <DesktopNavTenant
        pathname="/portal?tab=studio-calendar"
        items={navigationItems}
        variant="portal"
        navigationLabel="Navigace studia"
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Navigace studia" }),
    ).toBeInTheDocument();
  });

  it("keeps the studio identity compact while preserving a touch-safe switcher", () => {
    render(
      <StudioSwitcher
        locations={locations}
        activeLocationId="studio-brno"
        locale="en"
        onChange={vi.fn()}
        variant="header"
        logoUrl="https://visual-assets.example.test/studio-logo.svg"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Current studio: The Pottery House. Change studio",
    });

    expect(trigger).toHaveClass("min-h-12", "rounded-[12px]");
    expect(trigger.style.backgroundColor).toBe("transparent");
    expect(trigger.style.borderColor).toBe("transparent");
    expect(trigger).toHaveTextContent("The Pottery House");
  });

  it("reserves enough laptop width for localized navigation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/menu/StudioSwitcher.js"),
      "utf8",
    );

    expect(source.match(/xl:max-w-\[min\(28vw,380px\)\]/g)).toHaveLength(2);
    expect(source).not.toContain("xl:max-w-[min(24vw,320px)]");
  });

  it("uses the same quiet hierarchy in the tablet and phone drawer", () => {
    const mobileMenu = fs.readFileSync(
      path.join(process.cwd(), "src/components/headers/MobileMenu.js"),
      "utf8",
    );

    expect(mobileMenu).toContain("data-tenant-mobile-navigation");
    expect(mobileMenu).toContain("data-customer-portal-mobile-navigation");
    expect(mobileMenu).toContain("data-tenant-navigation-indicator");
    expect(mobileMenu).toContain("min-h-[58px]");
    expect(mobileMenu).toContain("border-[var(--tenant-border)]");
    expect(mobileMenu).toContain(
      'textTransform: "var(--tenant-header-text-transform, none)"',
    );
    expect(mobileMenu).toContain("h-[2px]");
    expect(mobileMenu).not.toContain(
      "[data-customer-portal-mobile-navigation] > a:first-child",
    );

    const header = fs.readFileSync(
      path.join(process.cwd(), "src/components/headers/Header.js"),
      "utf8",
    );
    expect(header).toContain(
      'isTenantRoute ? "h-[78px]" : isHomeRoute ? "h-16" : "h-[72px]"',
    );
    expect(header).toContain("customerPortalHeaderThemeStyle");
    expect(header).toContain("var(--tenant-portal-header-background)");
    expect(header).toContain(
      'const desktopNavigationBreakpointClass = "xl:flex"',
    );
  });
});
