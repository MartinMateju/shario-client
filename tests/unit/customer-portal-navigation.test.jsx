import fs from "node:fs";
import path from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DesktopNavTenant from "@/components/headers/DesktopNavTenant";
import Brand from "@/components/headers/Brand";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/headers/header.utils", () => ({
  classNames: (...classes) => classes.filter(Boolean).join(" "),
  isActivePath: (pathname, href) => {
    const current = new URL(String(pathname), "https://studio.test");
    const target = new URL(String(href), "https://studio.test");
    const targetTab = target.searchParams.get("tab");

    return (
      current.pathname === target.pathname &&
      (!targetTab || current.searchParams.get("tab") === targetTab)
    );
  },
}));

describe("customer portal navigation theme", () => {
  it("uses the secondary interaction colour for the current destination", () => {
    const theme = getPublicTenantTheme({
      slug: "dark-studio",
      publicSite: {
        branding: {
          accentColor: "#121212",
          backgroundColor: "#111111",
          textColor: "#FFFFFF",
        },
      },
    });

    expect(theme.accentLinkColor).not.toBe(theme.accentColor);

    render(
      <DesktopNavTenant
        pathname="/portal?location=main-studio&tab=studio-calendar"
        accentLinkColor={theme.accentLinkColor}
        items={[
          {
            href: "/portal?location=main-studio&tab=studio-calendar",
            label: "Book a session",
          },
          {
            href: "/portal?location=main-studio&tab=vouchers",
            label: "Gift vouchers",
          },
        ]}
      />,
    );

    const active = screen.getByRole("link", { name: "Book a session" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.style.color).toBe("var(--tenant-interactive-hover)");
    expect(active.style.backgroundColor).toBe("");
    expect(active.closest("nav")).toHaveClass("gap-x-6", "2xl:gap-x-10");
    expect(active.closest("nav")).not.toHaveClass("backdrop-blur-md");
    expect(active.closest("nav")).toHaveAttribute("data-tenant-navigation");
    expect(active.closest("nav")).toHaveAttribute(
      "data-tenant-navigation-layout",
      "flat",
    );
    const indicator = active.querySelector(
      "[data-tenant-navigation-indicator]",
    );
    expect(indicator).toHaveClass(
      "h-[2px]",
      "bg-current",
      "origin-left",
      "scale-x-100",
      "opacity-100",
    );
    expect(
      screen.getByRole("link", { name: "Gift vouchers" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Gift vouchers" })).toHaveStyle({
      color: theme.accentLinkColor,
    });
    expect(
      screen
        .getByRole("link", { name: "Gift vouchers" })
        .querySelector("[data-tenant-navigation-indicator]"),
    ).toHaveClass(
      "origin-right",
      "scale-x-0",
      "group-hover:origin-left",
      "group-hover:scale-x-100",
    );
    expect(active).toHaveClass("px-0.5", "font-semibold");
    expect(active.style.textTransform).toBe(
      "var(--tenant-header-text-transform, none)",
    );
    expect(active).toHaveAttribute("data-tenant-navigation-item");

    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/headers/Header.js"),
      "utf8",
    );
    expect(headerSource).not.toContain("accentColor={tenantAccentColor}");
    expect(headerSource).toMatch(
      /accentLinkColor=\{\s*isCustomerPortalSurface\s*\? tenantTheme\.portalHeaderLinkColor\s*: tenantAccentLinkColor\s*\}/,
    );
    expect(headerSource).toMatch(
      /hasCustomerPortalAppearance\s*\? customerPortalHeaderThemeStyle\s*:/,
    );
  });

  it("uses the configured portal header text for idle links and keeps the active interaction colour", () => {
    const theme = getPublicTenantPortalTheme({
      slug: "custom-header-studio",
      publicSite: {
        branding: { accentColor: "#9F1239", backgroundColor: "#FFFFFF" },
        customerPortal: {
          appearance: {
            headerBackgroundColor: "#FFFFFF",
            headerTextColor: "#075985",
            headingColor: "#9F1239",
          },
        },
      },
    });
    expect(theme.portalHeaderLinkColor).toBe("#075985");
    expect(theme.portalHeaderLinkColor).not.toBe(
      theme.portalHeaderHeadingColor,
    );

    render(
      <DesktopNavTenant
        pathname="/portal?tab=my-bookings"
        variant="portal"
        accentLinkColor={theme.portalHeaderLinkColor}
        items={[
          { href: "/portal?tab=my-bookings", label: "My bookings" },
          { href: "/portal?tab=vouchers", label: "Gift vouchers" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Gift vouchers" })).toHaveStyle({
      color: "#075985",
    });
    const active = screen.getByRole("link", { name: "My bookings" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.style.color).toBe("var(--tenant-interactive-hover)");
    expect(
      active.querySelector("[data-customer-portal-active-indicator]"),
    ).toHaveClass("scale-x-100");
  });

  it("keeps a light secondary current tab readable without filling the link", () => {
    const theme = getPublicTenantTheme({
      slug: "lavender-studio",
      publicSite: {
        branding: {
          accentColor: "#9DAAE2",
          backgroundColor: "#FCFBF8",
          textColor: "#1F1F1F",
        },
      },
    });

    render(
      <DesktopNavTenant
        pathname="/portal?tab=studio-calendar"
        accentLinkColor={theme.accentLinkColor}
        items={[
          {
            href: "/portal?tab=studio-calendar",
            label: "Book a session",
          },
        ]}
      />,
    );

    const active = screen.getByRole("link", { name: "Book a session" });
    expect(theme.accentForeground).toBe("#11110F");
    expect(active.style.color).toBe("var(--tenant-interactive-hover)");
    expect(active.style.backgroundColor).toBe("");
    expect(
      active.querySelector("[data-tenant-navigation-indicator]"),
    ).toHaveClass("bg-current", "h-[2px]");
  });

  it("bounds the configured tenant mark and falls back to a quieter studio wordmark", () => {
    const { container } = render(
      <Brand
        href="/portal"
        tenant={{
          name: "Clay Studio",
          publicSite: {
            branding: { logoUrl: "https://studio.test/logo.png", logoSize: 64 },
          },
        }}
      />,
    );
    const logo = container.querySelector("img");
    const brand = logo.parentElement;

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(brand).not.toHaveAttribute("href");
    expect(brand).toHaveClass("py-0.5");
    expect(logo).toHaveStyle({ height: "64px" });
    expect(logo).toHaveClass(
      "w-auto",
      "max-h-[72px]",
      "max-w-[min(100%,52vw,204px)]",
      "object-contain",
      "sm:max-w-[min(100%,232px)]",
    );
    expect(logo).toHaveAttribute("referrerPolicy", "no-referrer");

    fireEvent.error(logo);

    expect(container.querySelector("img")).toBeNull();
    expect(brand).toHaveClass("py-2");
    expect(screen.getByText("Clay Studio")).toHaveClass(
      "text-[19px]",
      "font-medium",
      "tracking-[-0.035em]",
      "truncate",
    );
  });
});
