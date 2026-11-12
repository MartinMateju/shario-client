import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CustomerPortalEmptyState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  formatCustomerPortalCurrencyAmount,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";

function TestIcon(props) {
  return <svg aria-hidden="true" {...props} />;
}

const contrast = (foreground, background) => {
  const luminance = (hex) => {
    const linear = [1, 3, 5].map((index) => {
      const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

const studio = {
  name: "Clay studio",
  slug: "clay-studio",
  publicSite: {
    customerPortal: {
      appearance: {
        backgroundColor: "#FFF7EE",
        surfaceColor: "#FFFFFF",
        textColor: "#171715",
        headingColor: "#264FAD",
      },
    },
  },
};

const emptyState = (
  <CustomerPortalEmptyState
    icon={TestIcon}
    title="Nothing here yet"
    description="Your studio records will appear here."
    action={
      <button className={customerPortalPrimaryActionClass} type="button">
        Browse sessions
      </button>
    }
  />
);

describe("customer portal page primitives", () => {
  it("provides one premium, semantic page frame with stable QA hooks", () => {
    render(
      <CustomerPortalPage>
        <CustomerPortalPageHeader
          eyebrow="Your studio"
          title="My bookings"
          description="Plan and manage your studio visits."
          actions={
            <button className={customerPortalPrimaryActionClass} type="button">
              Book a session
            </button>
          }
        />
        <CustomerPortalSurface>
          <CustomerPortalEmptyState
            icon={TestIcon}
            title="Nothing booked yet"
            description="Choose a studio time when you are ready."
          />
        </CustomerPortalSurface>
      </CustomerPortalPage>,
    );

    const pageTitle = screen.getByRole("heading", { name: "My bookings" });
    const emptyTitle = screen.getByRole("heading", {
      name: "Nothing booked yet",
    });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(pageTitle).toHaveAttribute("data-tenant-type", "display");
    expect(pageTitle).not.toHaveClass("font-serif");
    expect(pageTitle).toHaveClass("text-[var(--tenant-heading-color)]");
    expect(pageTitle.style.fontFamily).toBe("var(--tenant-font-display)");
    expect(emptyTitle).toHaveAttribute("data-tenant-type", "display");
    expect(emptyTitle).not.toHaveClass("font-serif");
    expect(emptyTitle).toHaveClass("text-[var(--tenant-heading-color)]");
    expect(screen.getByRole("button", { name: "Book a session" })).toHaveClass(
      "min-h-12",
    );
    expect(
      document.querySelector("[data-customer-portal-page]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-page-content]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-page-header]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-surface]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-customer-portal-empty-state]"),
    ).toBeInTheDocument();
  });

  it("supports an embedded heading level without forcing a font family", () => {
    render(
      <CustomerPortalPageHeader
        headingAs="h2"
        eyebrow="Studio knowledge"
        title="Studio guide"
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveAttribute("data-tenant-type", "display");
    expect(title).not.toHaveClass("font-serif");
    expect(title.style.fontFamily).toBe("var(--tenant-font-display)");
  });

  it.each([
    ["a white page with black cards", "#FFFFFF", "#000000", "#111111"],
    ["a black page with white cards", "#000000", "#FFFFFF", "#FFFFFF"],
    ["the dark preset", "#111827", "#1F2937", "#F3F4F6"],
  ])(
    "keeps empty-state copy, icons and focus readable on %s",
    (_name, backgroundColor, surfaceColor, textColor) => {
      const theme = getPublicTenantTheme(
        mergePortalAppearance(studio, {
          backgroundColor,
          surfaceColor,
          textColor,
          headingColor: textColor,
        }),
        { surface: "portal" },
      );
      const { container } = render(
        <div style={theme.style}>
          <CustomerPortalSurface>{emptyState}</CustomerPortalSurface>
        </div>,
      );
      const card = container.querySelector(
        "[data-customer-portal-empty-state]",
      );
      const title = screen.getByRole("heading", { name: "Nothing here yet" });
      const description = screen.getByText(
        "Your studio records will appear here.",
      );
      const icon = card.querySelector("svg").parentElement;

      // The preset stylesheet also styles data-tenant-surface="card"; every
      // foreground must match that card surface, not the outer page palette.
      expect(card).toHaveAttribute("data-tenant-surface", "card");
      expect(card).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-text-on-surface)]",
        "[--tenant-heading-color:var(--tenant-heading-on-surface)]",
        "[--tenant-action-focus:var(--tenant-accent-on-surface)]",
        "[--tenant-action-focus-offset:var(--tenant-surface)]",
      );
      expect(title).toHaveClass("text-[var(--tenant-heading-color)]");
      expect(description).toHaveClass("text-[var(--tenant-muted-on-surface)]");
      expect(icon).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-accent-on-surface)]",
      );
      for (const token of [
        "--tenant-text-on-surface",
        "--tenant-heading-on-surface",
        "--tenant-muted-on-surface",
        "--tenant-accent-on-surface",
      ]) {
        expect(
          contrast(theme.style[token], theme.style["--tenant-surface"]),
          token,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("restores the studio card palette when personal colours are cleared", () => {
    const personalTenant = mergePortalAppearance(studio, {
      backgroundColor: "#FFFFFF",
      surfaceColor: "#000000",
      textColor: "#111111",
    });
    const { container, rerender } = render(
      <div
        style={
          getPublicTenantTheme(personalTenant, { surface: "portal" }).style
        }
      >
        {emptyState}
      </div>,
    );
    expect(
      container.firstChild.style.getPropertyValue("--tenant-surface"),
    ).toBe("#000000");

    const restoredTheme = getPublicTenantTheme(
      mergePortalAppearance(studio, {}),
      { surface: "portal" },
    );
    rerender(<div style={restoredTheme.style}>{emptyState}</div>);
    expect(
      container.firstChild.style.getPropertyValue("--tenant-surface"),
    ).toBe("#FFFFFF");
    expect(
      screen.getByRole("heading", { name: "Nothing here yet" }),
    ).toHaveClass("text-[var(--tenant-heading-color)]");
    expect(
      contrast(
        restoredTheme.style["--tenant-heading-on-surface"],
        restoredTheme.style["--tenant-surface"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        restoredTheme.style["--tenant-muted-on-surface"],
        restoredTheme.style["--tenant-surface"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("formats whole-crown CZK amounts without visual noise", () => {
    expect(formatCustomerPortalCurrencyAmount(400, "CZK", "en-GB")).toMatch(
      /CZK\s*400|400\s*CZK/,
    );
    expect(
      formatCustomerPortalCurrencyAmount(400, "CZK", "en-GB"),
    ).not.toContain(".00");
  });
});
