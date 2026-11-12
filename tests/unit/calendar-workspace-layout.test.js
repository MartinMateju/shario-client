import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const readCalendarSources = () => {
  const directory = resolve(process.cwd(), "src/components/calendar");

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".js"))
    .map((fileName) => readFileSync(resolve(directory, fileName), "utf8"))
    .join("\n");
};

describe("tenant calendar workspace layout", () => {
  it("removes the workspace shell margin and padding only for edge-to-edge routes", () => {
    const source = readSource(
      "../../src/components/dashboard/TenantDashboardShell.js",
    );

    expect(source).toContain('normalizedPathname === "/app/calendar"');
    expect(source).toContain('normalizedPathname?.endsWith("/app/calendar")');
    expect(source).toContain(
      'useFullWorkspaceWidth ? "edge-to-edge" : "contained"',
    );
    const layoutClasses = source.match(
      /className=\{\s*useFullWorkspaceWidth\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/,
    );
    expect(layoutClasses?.slice(1)).toEqual([
      "w-full min-w-0 outline-none",
      "mx-auto w-full min-w-0 max-w-[1680px] px-4 pb-10 pt-5 outline-none sm:px-6 lg:px-8 2xl:px-10",
    ]);
    expect(source).toContain("canUseSetupCenter && !useFullWorkspaceWidth");
  });

  it("uses all space below the responsive workspace header", () => {
    const source = readSource(
      "../../src/app/[locale]/tenants/[tenantSlug]/app/(workspace)/calendar/page.js",
    );

    expect(source).toContain('data-calendar-page="true"');
    expect(source).toContain("h-[calc(100dvh-4rem)]");
    expect(source).toContain("md:h-[calc(100dvh-5rem)]");
    expect(source).toContain("min-h-0 min-w-0 flex-col");
    expect(source).not.toContain('className="space-y-5"');
    expect(source).not.toContain("rounded-[20px] border border-[#E7E4DE]");
  });

  it("uses one stable command bar and a collapsible filter panel", () => {
    const source = readCalendarSources();

    expect(source.match(/data-calendar-command-bar="true"/g)).toHaveLength(1);
    expect(source).toContain('data-calendar-filter-trigger="true"');
    expect(source).toContain('data-calendar-filter-panel="true"');
    expect(source).toContain("aria-expanded");
    expect(source).toContain("aria-controls");
  });

  it("lets the customer portal page own vertical calendar scrolling", () => {
    const source = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const portalSource = readSource("../../src/components/menu/Menu.js");

    expect(source).toContain('data-calendar-shell="true"');
    expect(source).toContain('data-calendar-scroll-region="true"');
    expect(source).toContain("min-h-0");
    expect(source).toContain("overflow-hidden");
    expect(source).toContain(
      'data-calendar-page-scroll={pageScroll ? "true" : "false"}',
    );
    expect(portalSource).not.toContain("min-h-[560px]");
    expect(portalSource).not.toContain("h-[clamp(560px,72dvh,760px)]");
    const portalCalendarMarkup =
      portalSource.match(/<StudioCalendar[\s\S]*?\/>/)?.[0] ?? "";
    expect(portalCalendarMarkup).toContain("pageScroll");
  });

  it("keeps portal headers in flow and makes calendar time direction explicit", () => {
    const studioSource = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const portalSource = readSource("../../src/components/menu/Menu.js");
    const weekSource = readSource(
      "../../src/components/calendar/WeekCalendar.js",
    );
    const daySource = readSource(
      "../../src/components/calendar/DayCalendar.js",
    );
    const monthSource = readSource(
      "../../src/components/calendar/MonthCalendar.js",
    );
    const mobileSource = readSource(
      "../../src/components/calendar/MobileAgendaCalendar.js",
    );
    const utilsSource = readSource(
      "../../src/components/calendar/calendar.utils.js",
    );
    const nowMarkerSource = readSource(
      "../../src/components/calendar/NowMarker.js",
    );

    expect(studioSource).toContain(
      "const [filtersOpen, setFiltersOpen] = useState(false)",
    );
    expect(studioSource).toContain(
      'setFiltersOpen(!window.matchMedia("(max-width: 639px)").matches)',
    );
    expect(portalSource).toContain('variant="calendar"');
    expect(portalSource).toContain(
      'className="w-full sm:w-[380px] sm:max-w-[420px]"',
    );

    for (const source of [weekSource, daySource, monthSource]) {
      expect(source).toContain('data-calendar-grid-header="true"');
      expect(source).not.toContain("top-[var(--header-height,78px)]");
    }

    for (const source of [weekSource, daySource]) {
      expect(source).toContain(
        "overflow-x-auto overscroll-x-contain overscroll-y-auto",
      );
      expect(source).toContain("flex-1 overflow-auto overscroll-contain");
    }
    expect(weekSource).toContain("--calendar-command-toolbar-sticky-top");
    expect(weekSource).toContain("--calendar-command-toolbar-sticky-height");
    expect(monthSource).toContain('data-calendar-month-scroll="true"');
    expect(monthSource).toContain('? "overflow-visible"');
    expect(monthSource).toContain("--calendar-command-toolbar-sticky-height");

    for (const source of [weekSource, daySource, monthSource, mobileSource]) {
      expect(source).toContain("data-calendar-day-state");
      expect(source).toContain("getCustomerCalendarDaySurface");
      expect(source).not.toContain("tenant-secondary");
    }

    for (const source of [weekSource, daySource]) {
      expect(source).toContain("getCalendarDisplayHours");
      expect(source).toContain("data-calendar-start-minute");
      expect(source).toContain("data-calendar-end-minute");
      expect(source).toContain("data-calendar-first-time-label");
      expect(source).toContain("slot.minute === start * 60");
      expect(source).toContain("? 8");
    }

    expect(utilsSource).toContain("var(--tenant-accent) 10%");
    expect(utilsSource).toContain("var(--tenant-accent) 1%");
    expect(nowMarkerSource).toContain("getStudioOpeningWindow");
    expect(nowMarkerSource).toContain('data-calendar-now-marker="true"');
  });

  it("uses tenant contrast tokens for selected and current dates", () => {
    const weekSource = readSource(
      "../../src/components/calendar/WeekCalendar.js",
    );
    const monthSource = readSource(
      "../../src/components/calendar/MonthCalendar.js",
    );
    const mobileSource = readSource(
      "../../src/components/calendar/MobileAgendaCalendar.js",
    );

    for (const source of [weekSource, monthSource, mobileSource]) {
      expect(source).toContain(
        "var(--tenant-accent, var(--color-brand-primary))",
      );
      expect(source).toContain("var(--tenant-accent-foreground, #FFFFFF)");
      expect(source).toContain(
        'data-tenant-hover={customerThemed ? "preserve" : undefined}',
      );
    }
  });

  it("preserves real weekly and daily time grids for customer mobile calendars", () => {
    const studioSource = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const publicBookingSource = readSource(
      "../../src/components/public-tenant/PublicBookingAvailabilityPage.js",
    );
    const mobileSource = readSource(
      "../../src/components/calendar/MobileAgendaCalendar.js",
    );
    const daySource = readSource(
      "../../src/components/calendar/DayCalendar.js",
    );
    const weekSource = readSource(
      "../../src/components/calendar/WeekCalendar.js",
    );
    const stylesSource = readSource("../../src/styles/globals.css");

    expect(weekSource).toContain("data-calendar-mobile-week-grid={");
    expect(weekSource).toContain('data-calendar-week-scroll="true"');
    expect(weekSource).toContain('data-calendar-time-rail="true"');
    expect(weekSource).toContain('data-calendar-week-day-column="true"');
    expect(weekSource).toContain("calendar-week-grid-columns");
    expect(weekSource).toContain("overflow-x-auto");
    expect(weekSource).toContain("overscroll-x-contain");
    expect(stylesSource).toContain(".calendar-week-grid-columns");
    expect(stylesSource).toContain(
      "repeat(7, minmax(var(--calendar-day-width), 1fr))",
    );

    // Tenant week/day calendars retain the existing compact mobile agenda.
    expect(mobileSource).toContain('data-calendar-mobile-agenda="true"');
    expect(mobileSource).toContain("lg:hidden");
    expect(studioSource).toMatch(
      /!\["customer", "public"\]\.includes\(audience\)\s*&&[\s\S]{0,240}setView\("day"\)/,
    );
    expect(publicBookingSource).not.toContain('setView("day")');
    // The tenant style clips media surfaces with overflow: hidden. The
    // page-scrolling public frame must stay out of that, or the calendar's
    // sticky toolbar and day header stick inside it over the first hour.
    expect(stylesSource).toMatch(
      /\[data-public-calendar-frame="true"\]\[data-public-calendar-page-scroll="true"\]\s*\{\s*overflow: visible;\s*overflow: clip;\s*\}/,
    );
    // Landscape phones cannot fit the framed calendar either.
    expect(publicBookingSource).toContain(
      'window.matchMedia("(max-width: 639px), (max-height: 600px)")',
    );
    expect(studioSource).toContain("dateKey(new Date(), studio?.timeZone)");
    expect(daySource).toContain('data-calendar-desktop-grid="true"');
    expect(daySource).toContain("data-calendar-mobile-day-grid={");
    expect(daySource).toContain('customerThemed ? "flex" : "hidden lg:flex"');
    expect(daySource).toContain("calendar-day-responsive-grid");
    expect(daySource).toContain('pageScroll ? "overflow-visible"');
  });

  it("uses one overlap-aware availability contract across every customer view", () => {
    const studioSource = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const utilsSource = readSource(
      "../../src/components/calendar/calendar.utils.js",
    );
    const daySource = readSource(
      "../../src/components/calendar/DayCalendar.js",
    );
    const weekSource = readSource(
      "../../src/components/calendar/WeekCalendar.js",
    );
    const monthSource = readSource(
      "../../src/components/calendar/MonthCalendar.js",
    );
    const mobileSource = readSource(
      "../../src/components/calendar/MobileAgendaCalendar.js",
    );
    const selectionSource = readSource(
      "../../src/components/calendar/CalendarSlotSelection.js",
    );

    expect(utilsSource).toContain(
      "export function getCalendarSlotAvailability",
    );
    expect(utilsSource).toContain("export function getBookableSlotsForDay");
    expect(utilsSource).toContain("export function getCalendarDayAvailability");
    expect(utilsSource).toContain(
      "export function getCustomerCalendarSlotSurface",
    );
    expect(studioSource).toContain("const availabilityBookings = useMemo");
    expect(studioSource).toContain("availabilityBookings,");

    for (const source of [daySource, weekSource]) {
      expect(source).toContain("availabilityBookings");
      expect(source).toContain("getCalendarSlotAvailability");
      expect(source).toContain("<CalendarSlotSelection");
      expect(source).toMatch(/<CalendarSlotSelection\b[\s\S]*?availability=\{/);
    }
    for (const source of [monthSource, mobileSource]) {
      expect(source).toContain("availabilityBookings = bookings");
      expect(source).toContain("data-calendar-availability-state");
      expect(source).toContain("getCalendarDayAvailability");
    }

    expect(selectionSource).toContain("availability.isBookable");
    expect(selectionSource).toContain(
      "data-calendar-slot-state={availability?.state}",
    );
    expect(selectionSource).toContain("disabled={!canConfirm}");
  });

  it("does not render the old permanent status footer", () => {
    const source = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );

    expect(source).not.toContain('data-calendar-footer="true"');
    expect(source).not.toContain('t("footer.studioTime"');
    expect(source).not.toContain('t("footer.bookingCount"');
  });

  it("supports a bounded, interaction-free calendar presentation", () => {
    const calendarSource = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const eventCardSource = readSource(
      "../../src/components/calendar/CalendarEventCard.js",
    );

    expect(calendarSource).toContain("availableViews = CALENDAR_VIEWS");
    expect(calendarSource).toContain("const view = resolveCalendarView(");
    expect(calendarSource).toContain(
      'data-calendar-read-only={readOnly ? "true" : "false"}',
    );
    expect(calendarSource).toMatch(/onBookingClick:\s*readOnly\s*\|\|/);
    expect(calendarSource).toContain("onBookingClick?.(booking)");
    expect(calendarSource).toMatch(
      /onSlotSelect:\s*readOnly \|\| !onSlotSelect\s*\? undefined/,
    );
    expect(calendarSource).toContain(
      'audience === "public" && booking.privacySafe !== true',
    );
    expect(eventCardSource).toContain(
      'const EventElement = interactive ? "button" : "article"',
    );
  });

  it("does not reintroduce a card frame around the full-width calendar", () => {
    const source = readSource(
      "../../src/components/calendar/StudioCalendar.js",
    );
    const sectionStart = source.indexOf("<section");
    const sectionEnd = source.indexOf(">", sectionStart);
    const calendarShell = source.slice(sectionStart, sectionEnd + 1);

    expect(calendarShell).toBeTruthy();
    expect(calendarShell).not.toMatch(/\b(?:m[trblxy]?|p[trblxy]?)-/);
    expect(calendarShell).not.toContain("rounded-");
    expect(calendarShell).not.toContain("shadow-");
    expect(calendarShell).not.toMatch(/\bborder(?:-|\b)/);
  });
});
