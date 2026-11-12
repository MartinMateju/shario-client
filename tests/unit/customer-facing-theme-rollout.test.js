import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("customer-facing tenant theme rollout", () => {
  it("keeps public catalog, membership, help, and detail surfaces on tenant semantic tokens", () => {
    const productCatalogSource = readSource(
      "src",
      "components",
      "public-tenant",
      "PublicProductCatalogPage.js",
    );
    const voucherCatalogSource = readSource(
      "src",
      "components",
      "public-tenant",
      "PublicVoucherCatalogPage.js",
    );
    const bookingAvailabilitySource = readSource(
      "src",
      "components",
      "public-tenant",
      "PublicBookingAvailabilityPage.js",
    );
    const sources = [
      readSource("src", "components", "public-tenant", "PublicTenantFooter.js"),
      readSource(
        "src",
        "components",
        "public-tenant",
        "PublicCapabilityGate.js",
      ),
      readSource(
        "src",
        "components",
        "public-tenant",
        "PublicBookingProductDetailPage.js",
      ),
      readSource(
        "src",
        "components",
        "public-tenant",
        "PublicKnowledgeResourcePage.js",
      ),
      readSource(
        "src",
        "components",
        "memberships",
        "PublicMembershipCatalog.js",
      ),
      readSource("src", "components", "knowledge", "KnowledgeBrowser.js"),
      readSource("src", "components", "knowledge", "KnowledgeResourceCard.js"),
      productCatalogSource,
      voucherCatalogSource,
      bookingAvailabilitySource,
    ];

    for (const source of sources) {
      expect(source).toContain("--tenant-");
      expect(source).not.toContain("bg-brand-offset");
    }

    expect(sources.join("\n")).toContain("--tenant-label-color");
    expect(sources.join("\n")).toContain("--tenant-accent-on-surface");
    expect(sources.join("\n")).toContain("--tenant-muted-on-surface");
    expect(productCatalogSource).toContain("accentForeground");
    expect(voucherCatalogSource).toContain(
      'color: "var(--tenant-accent-on-surface)"',
    );
    expect(voucherCatalogSource).toContain("bg-[color:var(--tenant-surface)]");
    expect(voucherCatalogSource).toContain("var(--tenant-portal-button)");
    expect(voucherCatalogSource).toContain(
      "var(--tenant-portal-button-foreground)",
    );
    expect(bookingAvailabilitySource).toContain("--tenant-text-on-surface");
    expect(bookingAvailabilitySource).toContain("--tenant-accent-link");
  });

  it("uses page-safe label color on the themed auth form surface", () => {
    const fieldSource = readSource(
      "src",
      "components",
      "auth",
      "CustomerAuthField.js",
    );
    const socialSource = readSource(
      "src",
      "components",
      "auth",
      "CustomerSocialAuthButtons.js",
    );

    expect(fieldSource).toContain("--tenant-page-label-color");
    expect(fieldSource).toContain("--tenant-auth-field-surface");
    expect(fieldSource).toContain("--tenant-auth-form-text");
    expect(fieldSource).toContain("--tenant-auth-form-error");
    expect(fieldSource).toContain("--tenant-auth-field-error");
    expect(fieldSource).toContain("--tenant-auth-field-success");
    expect(fieldSource).not.toContain("border-red-300");
    expect(fieldSource).not.toContain("border-emerald-300");
    expect(socialSource).toContain("--tenant-page-label-color");
    expect(socialSource).toContain("--tenant-auth-form-surface");
    expect(socialSource).toContain("--tenant-auth-form-muted");
    expect(socialSource).not.toContain("bg-white");
  });

  it("keeps the customized portal overview scoped to the calendar tab", () => {
    const menuSource = readSource("src", "components", "menu", "Menu.js");

    expect(menuSource).toContain("<MenuHeader");
    expect(menuSource).toMatch(
      /\{currentTab === STUDIO_CALENDAR_TAB \? \(\s*<MenuHeader/,
    );
    expect(menuSource).toMatch(
      /onSlotSelect=\{\s*canBookActiveLocation\s*\?\s*openBookingDrawer\s*:\s*undefined\s*\}/,
    );
    expect(menuSource).toContain(
      "bookingAccountEnabled={bookingHistoryEnabled}",
    );
    expect(menuSource).toMatch(
      /const bookingHistoryEnabled =\s*bookingAccountEnabled &&\s*isCustomerPortalPageEnabled\(visibilityTenant, "bookings"\)/,
    );
  });

  it("keeps portal page labels and raised surfaces in their matching contrast domains", () => {
    const primitivesSource = readSource(
      "src",
      "components",
      "customer-shell",
      "CustomerPortalPrimitives.js",
    );

    expect(primitivesSource).toContain(
      "text-[var(--tenant-label-color)] sm:text-[11px]",
    );
    expect(primitivesSource).toContain("bg-[var(--tenant-surface)]");
    expect(primitivesSource).toContain("--tenant-text-on-surface");
    expect(primitivesSource).not.toContain(
      "text-[var(--tenant-accent-on-surface)] sm:text-[11px]",
    );
  });

  it("themes every customer calendar view without changing tenant-admin fallbacks", () => {
    const calendarSources = [
      "CalendarToolbar.js",
      "StudioCalendar.js",
      "MonthCalendar.js",
      "WeekCalendar.js",
      "DayCalendar.js",
      "MobileAgendaCalendar.js",
      "CalendarEventCard.js",
      "CalendarSlotSelection.js",
    ].map((file) => readSource("src", "components", "calendar", file));

    for (const source of calendarSources) {
      expect(source).toContain("--tenant-");
    }

    expect(calendarSources.join("\n")).toContain(
      '["customer", "public"].includes(audience)',
    );
    expect(calendarSources.join("\n")).toContain("--tenant-border");
    expect(calendarSources.join("\n")).toContain("--tenant-accent-on-surface");
  });
});
