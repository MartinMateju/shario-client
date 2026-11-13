const intlMocks = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs({ useLocale: () => intlMocks.locale });
});

import fs from "node:fs";
import path from "node:path";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/locationBookingUtils", () => ({
  formatLocationAddress: (location, { includeCountry = true } = {}) => {
    if (typeof location?.address === "string") return location.address;

    const address = location?.address || {};
    return [address.line1, address.city, includeCountry ? address.country : ""]
      .filter(Boolean)
      .join(", ");
  },
  getEntityId: (location) => String(location?.id || ""),
}));

vi.mock("@/components/menu/menuUtils", () => ({
  classNames: (...classes) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  normalizePublicTenantLogoSize: (value) => Number(value) || 48,
}));

import StudioSwitcher from "@/components/menu/StudioSwitcher";

const brno = {
  id: "64b000000000000000000021",
  name: "Atelier Brno",
  address: {
    line1: "Grohova 3",
    city: "Brno",
    country: "Czech Republic",
  },
  isActive: true,
  isPrimary: true,
  booking: { enabled: true },
};
const prague = {
  id: "64b000000000000000000022",
  name: "Atelier Prague",
  address: {
    line1: "Vinohradska 10",
    city: "Prague",
    country: "Czech Republic",
  },
  isActive: true,
  booking: { enabled: true },
};
const pieceStudio = {
  id: "64b000000000000000000023",
  name: "Atelier Pieces",
  address: {
    line1: "Kvetna 4",
    city: "Brno",
    country: "Czech Republic",
  },
  isActive: true,
  booking: { enabled: false },
};

describe("customer dashboard studio switcher", () => {
  beforeEach(() => {
    intlMocks.locale = "en";
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("renders the dashboard studio row as a touch-safe listbox and changes studios by keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StudioSwitcher
        locations={[brno, prague]}
        activeLocationId={brno.id}
        locale="en"
        onChange={onChange}
      />,
    );

    const switcher = document.querySelector("[data-customer-studio-switcher]");
    const trigger = screen.getByRole("button", {
      name: "Current studio: Atelier Brno. Change studio",
    });

    expect(switcher).toHaveAttribute("data-switching-enabled", "true");
    expect(switcher).toHaveAttribute("data-selected-location-id", brno.id);
    expect(trigger).toHaveAttribute("data-customer-studio-switcher-trigger");
    expect(trigger).toHaveClass("min-h-[64px]");
    expect(trigger).toHaveTextContent("Atelier Brno");

    await user.click(trigger);

    const pragueOption = screen.getByRole("option", {
      name: /Atelier Prague/i,
    });

    expect(pragueOption).toHaveClass("min-h-[58px]");
    const brnoOption = screen.getByRole("option", { name: /Atelier Brno/i });
    expect(brnoOption).toHaveAttribute("aria-selected", "true");
    expect(brnoOption).toHaveTextContent("Grohova 3, Brno");

    await user.keyboard("{End}{Enter}");

    expect(onChange).toHaveBeenCalledWith(prague.id);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Studio changed to Atelier Prague.",
    );
  });

  it("renders the calendar switcher as one aligned, contextual surface", async () => {
    const user = userEvent.setup();

    render(
      <StudioSwitcher
        locations={[brno, prague]}
        activeLocationId={brno.id}
        locale="en"
        onChange={vi.fn()}
        variant="calendar"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Current studio: Atelier Brno. Change studio",
    });

    expect(trigger).toHaveClass(
      "min-h-14",
      "sm:min-h-[64px]",
      "rounded-[14px]",
    );
    const triggerAddress = screen.getByText("Grohova 3, Brno");
    expect(triggerAddress).toHaveClass("hidden", "sm:block");
    expect(trigger).not.toHaveTextContent("Czech Republic");

    await user.click(trigger);

    const panel = document.querySelector("[data-studio-switcher-panel]");
    const selectedOption = screen.getByRole("option", {
      name: /Atelier Brno/i,
    });

    expect(panel).toHaveClass("inset-x-0", "w-full", "rounded-[14px]");
    expect(selectedOption).toHaveAttribute(
      "data-studio-switcher-selected",
      "true",
    );
    expect(selectedOption).toHaveTextContent("Grohova 3, Brno");
    expect(selectedOption).not.toHaveTextContent("Czech Republic");
    expect(selectedOption).toHaveClass(
      "min-h-[58px]",
      "cursor-pointer",
      "bg-[color-mix(in_srgb,var(--tenant-accent)_10%,var(--tenant-surface))]",
    );
  });

  it("keeps every studio reachable when the calendar switcher opens low on a phone", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    try {
      render(
        <StudioSwitcher
          locations={[brno, prague]}
          activeLocationId={brno.id}
          locale="en"
          onChange={vi.fn()}
          variant="calendar"
        />,
      );

      await user.click(
        screen.getByRole("button", {
          name: "Current studio: Atelier Brno. Change studio",
        }),
      );

      // The panel scrolls into view instead of locking the page, so options
      // below the fold can still be reached by touch.
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" }),
      );
      expect(
        scrollIntoView.mock.contexts.some((element) =>
          element.hasAttribute("data-studio-switcher-panel"),
        ),
      ).toBe(true);
      expect(document.documentElement.style.overflow).not.toBe("hidden");
      expect(
        screen.getByRole("option", { name: /Atelier Prague/i }),
      ).toBeVisible();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("renders one studio as a static current-studio identity", () => {
    render(
      <StudioSwitcher
        locations={[brno]}
        activeLocationId={brno.id}
        locale="en"
      />,
    );

    const switcher = document.querySelector("[data-customer-studio-switcher]");

    expect(switcher).toHaveAttribute("data-switching-enabled", "false");
    expect(switcher).toHaveAttribute("data-selected-location-id", brno.id);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Atelier Brno")).toBeInTheDocument();
  });

  it("localizes the Czech switch control and keeps every option touch-safe", async () => {
    intlMocks.locale = "cs";
    const user = userEvent.setup();

    render(
      <StudioSwitcher
        locations={[brno, prague]}
        activeLocationId={brno.id}
        locale="cs"
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Aktuální studio: Atelier Brno. Změnit studio",
      }),
    );

    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveClass("min-h-[58px]");
    }
  });

  it("keeps the studio switcher only in the calendar", () => {
    const headerSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/headers/Header.js"),
      "utf8",
    );
    const menuSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/menu/Menu.js"),
      "utf8",
    );

    expect(headerSource).not.toContain("PortalHeaderStudioSwitcher");
    expect(headerSource).toContain("<Brand");
    expect(headerSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    );
    expect(menuSource).toContain("data-customer-calendar-studio-selector");
    expect(menuSource).toContain("<StudioSwitcher");
  });

  it("renders a premium compact header control without leaking the address", async () => {
    const user = userEvent.setup();

    render(
      <StudioSwitcher
        locations={[brno, prague]}
        activeLocationId={brno.id}
        locale="en"
        onChange={vi.fn()}
        variant="header"
        logoUrl="https://visual-assets.example.test/studio-logo.svg"
        logoSize={64}
        brandDisplayName="Atelier Nami"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Atelier Nami. Current studio: Atelier Brno. Change studio",
    });

    expect(trigger).toHaveClass("min-h-12", "rounded-[12px]");
    expect(trigger).toHaveClass(
      "hover:bg-[color-mix(in_srgb,var(--tenant-surface)_62%,transparent)]",
    );
    expect(trigger).not.toHaveClass("hover:-translate-y-px");
    expect(trigger).toHaveTextContent("Atelier Nami");
    expect(trigger).toHaveTextContent("Atelier Brno");
    expect(screen.getByText("Atelier Nami")).toHaveAttribute(
      "data-customer-brand-name",
      "true",
    );
    expect(screen.getByText("Atelier Nami")).toHaveAttribute(
      "title",
      "Atelier Nami",
    );
    expect(screen.getByText("Atelier Brno")).toHaveAttribute(
      "data-customer-selected-studio",
    );
    expect(screen.getByText("Atelier Brno")).toHaveAttribute(
      "title",
      "Atelier Brno",
    );
    expect(trigger).not.toHaveTextContent("Grohova 3, Brno");
    expect(trigger.querySelector("img")).toHaveAttribute(
      "src",
      "https://visual-assets.example.test/studio-logo.svg",
    );
    expect(trigger.querySelector("img")).toHaveClass(
      "w-auto",
      "max-h-16",
      "max-w-[min(44vw,192px)]",
    );
    expect(trigger.querySelector("img")).not.toHaveClass("w-9");
    expect(trigger.querySelector("img")).not.toHaveClass("p-0.5");
    expect(trigger.querySelector("img")).toHaveStyle({ height: "64px" });

    await user.click(trigger);

    expect(screen.getByRole("option", { name: /Atelier Prague/i })).toHaveClass(
      "min-h-[58px]",
    );
    expect(document.querySelector("[data-studio-switcher-panel]")).toHaveClass(
      "origin-top-left",
      "will-change-[transform,opacity]",
      "motion-reduce:transform-none",
    );
  });

  it("truncates long header names visually while preserving the full name", () => {
    const longStudio = {
      ...brno,
      name: "The International Ceramic Arts and Community Studio Brno",
    };

    render(
      <StudioSwitcher
        locations={[longStudio, prague]}
        activeLocationId={longStudio.id}
        locale="en"
        onChange={vi.fn()}
        variant="header"
      />,
    );

    const name = screen.getByText(longStudio.name);
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longStudio.name);
    const trigger = screen.getByRole("button", {
      name: `Current studio: ${longStudio.name}. Change studio`,
    });
    expect(trigger).toHaveClass("min-h-12");
    expect(trigger.closest("[data-customer-studio-switcher]")).toHaveClass(
      "xl:max-w-[min(28vw,380px)]",
      "2xl:max-w-[420px]",
    );
  });

  it("keeps active piece-based studios available in the header switcher", async () => {
    const user = userEvent.setup();

    render(
      <StudioSwitcher
        locations={[brno, pieceStudio]}
        activeLocationId={brno.id}
        locale="en"
        onChange={vi.fn()}
        requireBookingEnabled={false}
        variant="header"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Current studio: Atelier Brno. Change studio",
      }),
    );

    expect(
      screen.getByRole("option", { name: /Atelier Pieces/i }),
    ).toBeVisible();
  });
});
