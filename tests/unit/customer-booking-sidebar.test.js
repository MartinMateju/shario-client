import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import messagesEn from "@/messages/en.json";
import messagesCs from "@/messages/cs.json";

import {
  formatBookingDateLabel,
  formatBookingDurationSummary,
  formatBookingPrice,
  formatBookingSummary,
  getBookingAvailabilityPresentation,
  getBookingPriceBreakdown,
  getLocalizedBookingProductName,
} from "@/components/sidebars/openStudioBooking.utils";

const readSidebarSource = () =>
  fs.readFileSync(
    path.join(process.cwd(), "src/components/sidebars/Sidebar.js"),
    "utf8",
  );

const readPortalPageSource = () =>
  fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/[locale]/tenants/[tenantSlug]/portal/page.js",
    ),
    "utf8",
  );

describe("customer booking sidebar presentation", () => {
  it("formats wall dates without an ambiguous numeric-only representation", () => {
    expect(formatBookingDateLabel("2026-08-05", "EN")).toBe(
      "Wednesday, August 5, 2026",
    );
    expect(formatBookingDateLabel("2026-08-05", "CZ")).toContain(
      "5. srpna 2026",
    );
    expect(
      formatBookingDateLabel("2026-08-05", "EN", {
        includeWeekday: false,
      }),
    ).toBe("August 5, 2026");
    expect(formatBookingDateLabel("08/05/2026", "EN")).toBe("");
  });

  it("uses natural localized duration labels in the summary", () => {
    expect(formatBookingDurationSummary(60, "EN")).toBe("1 hour");
    expect(formatBookingDurationSummary(120, "EN")).toBe("2 hours");
    expect(formatBookingDurationSummary(90, "CZ")).toBe("1 h 30 min");
  });

  it("renders a clear time range and only includes guests when useful", () => {
    expect(
      formatBookingSummary({
        durationMinutes: 60,
        startTime: "08:00",
        endTime: "09:00",
        guests: 1,
        language: "EN",
      }),
    ).toBe("1 hour · 08:00–09:00");
    expect(
      formatBookingSummary({
        durationMinutes: 120,
        startTime: "10:00",
        endTime: "12:00",
        guests: 3,
        language: "EN",
      }),
    ).toBe("2 hours · 10:00–12:00 · 3 guests");
  });

  it("rounds CZK presentation to whole crowns without changing other currencies", () => {
    expect(formatBookingPrice(499.98, "CZK", "en-GB")).toMatch(/^CZK\s500$/);
    expect(formatBookingPrice(12.5, "EUR", "en-GB")).toBe("€12.50");
  });

  it("breaks down guest multipliers and private-studio surcharges", () => {
    expect(
      getBookingPriceBreakdown({
        unitPrice: 250,
        durationMinutes: 60,
        guests: 3,
      }),
    ).toEqual({
      baseTotal: 1500,
      durationQuantity: 2,
      guestCount: 3,
      hasDetails: true,
      surchargeTotal: 0,
      total: 1500,
    });

    expect(
      getBookingPriceBreakdown({
        unitPrice: 250,
        extraCharge: 100,
        durationMinutes: 60,
        guests: 1,
      }),
    ).toMatchObject({
      baseTotal: 500,
      hasDetails: true,
      surchargeTotal: 200,
      total: 700,
    });
  });

  it("explains loading, incomplete, capacity and overlap availability states", () => {
    expect(
      getBookingAvailabilityPresentation({ isLoading: true, language: "EN" }),
    ).toMatchObject({
      title: "Checking availability…",
      tone: "loading",
    });
    expect(
      getBookingAvailabilityPresentation({
        reason: "INCOMPLETE",
        language: "EN",
      }),
    ).toMatchObject({
      title: "Complete the booking details",
      tone: "neutral",
    });
    expect(
      getBookingAvailabilityPresentation({
        reason: "LOCATION_CAPACITY_EXCEEDED",
        language: "EN",
      }),
    ).toMatchObject({
      title: "The studio is full at this time",
      description: "Try another time or reduce the number of guests.",
    });
    expect(
      getBookingAvailabilityPresentation({
        reason: "LOCATION_OVERLAP_NOT_ALLOWED",
        language: "CZ",
      }),
    ).toMatchObject({
      title: "Termín se překrývá s jinou rezervací",
      tone: "unavailable",
    });
  });

  it("prefers the selected product language and preserves tenant-authored names", () => {
    const product = {
      name: { cs: "Glazovací dílna", en: "Glazing Lab" },
    };

    expect(getLocalizedBookingProductName(product, "EN")).toBe("Glazing Lab");
    expect(getLocalizedBookingProductName(product, "CZ")).toBe(
      "Glazovací dílna",
    );
    expect(
      getLocalizedBookingProductName({ name: { cs: "Pouze česky" } }, "EN", {
        fallback: "Shared session",
      }),
    ).toBe("Pouze česky");
    expect(
      getLocalizedBookingProductName({}, "pl", { fallback: "Sesja wspólna" }),
    ).toBe("Sesja wspólna");
  });

  it("uses customer-friendly English and Czech booking copy", () => {
    const source = readSidebarSource();

    expect(source).toContain('useLegacyCopy("bookingSidebar")');
    expect(messagesEn.Legacy.screens.bookingSidebar.title).toBe(
      "Book a session",
    );
    expect(messagesEn.Legacy.screens.bookingSidebar.product).toBe(
      "Session type",
    );
    expect(messagesCs.Legacy.screens.bookingSidebar.title).toBe(
      "Rezervace studia",
    );
    expect(source).not.toContain('title: "Book Open Studio"');
    expect(source).not.toContain('product: "Open Studio option"');
  });

  it("hides a redundant product selector when only one option exists", () => {
    const source = readSidebarSource();

    expect(source).toContain("availableProducts.length !== 1");
    expect(source).toContain("{showProductSelection && (");
  });

  it("keeps all controls scrollable above a non-overlapping footer", () => {
    const source = readSidebarSource();

    expect(source).toContain("data-booking-scroll-region");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("data-booking-summary-footer");
    expect(source).toContain('className="shrink-0 border-t');
    expect(source).toContain("[@media(max-height:740px)]:py-3");
    expect(source.indexOf("data-booking-price-breakdown")).toBeLessThan(
      source.indexOf("data-booking-summary-footer"),
    );
  });

  it("shows background loading and a perceivable add-to-cart confirmation", () => {
    const source = readSidebarSource();
    const portalSource = readPortalPageSource();

    expect(source).toContain("data-booking-loading-skeleton");
    expect(source).toContain("data-booking-availability-state");
    expect(source).toContain("data-booking-submit-state");
    expect(messagesEn.Legacy.screens.bookingSidebar.added).toBe(
      "Added to cart",
    );
    expect(source).toContain("window.setTimeout");
    expect(source).toContain("}, 520)");
    expect(portalSource).toContain("isFetching: isFetchingBookings");
    expect(portalSource).toContain("isFetching: isFetchingProducts");
    expect(portalSource).toContain("isAvailabilityLoading={");
    expect(portalSource).toContain("isCatalogLoading={");
  });

  it("themes interactive states and exposes complex-price semantics", () => {
    const source = readSidebarSource();

    expect(source).toContain('backgroundColor: "var(--tenant-accent)"');
    expect(source).toContain('color: "var(--tenant-accent-foreground)"');
    expect(source).toContain("style={tenantTheme.style}");
    expect(source).toContain(
      'className="text-[24px] font-medium tracking-[-0.045em] text-[var(--tenant-accent-on-surface)]"',
    );
    expect(source).toContain("data-booking-duration-selected");
    expect(source).toContain('data-tenant-hover="preserve"');
    expect(source.match(/data-tenant-hover="preserve"/g)).toHaveLength(3);
    expect(source).not.toContain("var(--tenant-secondary)");
    expect(source).toContain("aria-pressed={durationMinutes === value}");
    expect(source).toContain("data-booking-price-breakdown");
    expect(source).toContain("data-booking-submit");
  });

  it("uses the header close control and a single full-width cart action", () => {
    const source = readSidebarSource();

    expect(source.match(/\{text\.cancel\}/g)).toHaveLength(1);
    expect(source).toContain("aria-label={text.cancel}");
    expect(source).toContain("min-h-11 w-full rounded-full");
  });
});
