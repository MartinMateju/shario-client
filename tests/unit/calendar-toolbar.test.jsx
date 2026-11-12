import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/locationBookingUtils", () => ({
  zonedDateTimeToUtc: vi.fn(),
}));

import CalendarToolbar, {
  resolveCalendarView,
} from "@/components/calendar/CalendarToolbar";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import { getCalendarTitle } from "@/components/calendar/calendar.title";

const labels = {
  "toolbar.viewLabel": "Calendar view",
  "toolbar.today": "Today",
  "toolbar.previous": "Previous",
  "toolbar.next": "Next",
  "toolbar.newBooking": "New booking",
  "filters.activity": "Filters",
  "filters.filterActivities": "Filter activities",
  "filters.openLegend": "Open legend",
  "filters.closeLegend": "Close legend",
  "views.month": "Month",
  "views.week": "Week",
  "views.day": "Day",
  "availability.available": "Available",
  "availability.limited": "Limited availability",
  "events.full": "Full",
};

const t = (key, values = {}) => {
  if (key === "events.availability") {
    if (values.remaining === 0) return "Full";
    return `${values.remaining} places left`;
  }
  if (key === "events.unavailable") return "Unavailable";
  if (key === "events.myBooking") return "My booking";
  return labels[key] || key;
};

const renderToolbar = (overrides = {}) => {
  const handlers = {
    onViewChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onCreateBooking: vi.fn(),
    onToggleFilters: vi.fn(),
  };

  render(
    <section data-calendar-shell="true">
      <CalendarToolbar
        view="week"
        title="27 July – 2 August 2026"
        audience="tenant"
        filtersOpen={false}
        activeFilterCount={2}
        filtersId="calendar-filters"
        t={t}
        {...handlers}
        {...overrides}
      />
    </section>,
  );

  return handlers;
};

describe("CalendarToolbar", () => {
  it("uses Czech grammatical month forms for same-month week ranges", () => {
    expect(getCalendarTitle("week", new Date(2026, 7, 12, 12), "cs")).toBe(
      "10.–16. srpna 2026",
    );
  });

  it("coerces an excluded view to an allowed fallback", () => {
    expect(resolveCalendarView("month", ["week", "day"], "week")).toBe("week");
    expect(resolveCalendarView("month", ["day"], "week")).toBe("day");
  });

  it("exposes navigation, view, filter, and creation actions from one toolbar", () => {
    const handlers = renderToolbar();

    expect(
      screen.getByRole("toolbar", { name: "Calendar view" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "27 July – 2 August 2026",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const createBookingButton = screen.getByRole("button", {
      name: "New booking",
    });
    expect(createBookingButton).toHaveAttribute("aria-label", "New booking");
    expect(createBookingButton).toHaveAttribute("title", "New booking");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.click(screen.getByRole("button", { name: "Filter activities" }));
    fireEvent.click(createBookingButton);

    expect(handlers.onToday).toHaveBeenCalledOnce();
    expect(handlers.onPrevious).toHaveBeenCalledOnce();
    expect(handlers.onNext).toHaveBeenCalledOnce();
    expect(handlers.onViewChange).toHaveBeenCalledWith("month");
    expect(handlers.onToggleFilters).toHaveBeenCalledOnce();
    expect(handlers.onCreateBooking).toHaveBeenCalledOnce();
  });

  it("communicates filter disclosure state and hides tenant actions from customers", () => {
    renderToolbar({
      audience: "customer",
      filtersOpen: true,
      activeFilterCount: 0,
    });

    const filterButton = screen.getByRole("button", {
      name: "Close legend",
    });
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(filterButton).toHaveAttribute("aria-controls", "calendar-filters");
    expect(
      screen.queryByRole("button", { name: "New booking" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "27 July – 2 August 2026",
      }),
    ).toBeInTheDocument();
    const toolbar = screen.getByRole("toolbar", { name: "Calendar view" });
    expect(toolbar).toHaveAttribute("data-calendar-audience", "customer");
    expect(toolbar).toHaveClass(
      "border-[var(--tenant-border)]",
      "bg-[var(--tenant-surface)]",
    );
    expect(
      toolbar.querySelector('[data-calendar-toolbar-layout="responsive"]'),
    ).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]", "lg:flex");
    expect(screen.getByRole("button", { name: "Today" })).toHaveClass(
      "rounded-[10px]",
      "border-transparent",
      "min-h-11",
    );
    expect(
      screen
        .getByRole("button", { name: "Today" })
        .closest("[data-calendar-period-navigation]"),
    ).toContainElement(screen.getByRole("button", { name: "Previous" }));
    expect(
      screen
        .getByRole("button", { name: "Today" })
        .closest("[data-calendar-period-navigation]"),
    ).toContainElement(screen.getByRole("button", { name: "Next" }));
    const periodNavigation = screen
      .getByRole("button", { name: "Today" })
      .closest("[data-calendar-period-navigation]");
    expect(periodNavigation).toHaveClass(
      "border-[var(--tenant-border)]",
      "bg-transparent",
    );
    expect(periodNavigation.className).not.toContain("tenant-secondary");

    expect(screen.getByRole("button", { name: "Previous" })).toHaveClass(
      "h-11",
      "w-11",
      "rounded-[10px]",
    );
    for (const name of [
      "Today",
      "Previous",
      "Next",
      "Month",
      "Week",
      "Day",
      "Close legend",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "data-tenant-hover",
        "preserve",
      );
    }
  });

  it("labels the closed customer disclosure as Open legend", () => {
    renderToolbar({
      audience: "customer",
      filtersOpen: false,
      activeFilterCount: 0,
    });

    expect(screen.getByRole("button", { name: "Open legend" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("exposes all three calendar views on customer phones with compact controls", () => {
    const handlers = renderToolbar({
      audience: "customer",
      view: "week",
      filtersOpen: false,
      activeFilterCount: 0,
      pageScroll: true,
    });

    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Day" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const viewControl = screen.getByRole("group", { name: "Calendar view" });
    const toolbar = screen.getByRole("toolbar", { name: "Calendar view" });
    expect(toolbar).toHaveClass("sticky", "z-[45]");
    expect(toolbar).toHaveStyle({
      top: "var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem))",
    });
    expect(viewControl).toHaveAttribute(
      "data-calendar-mobile-view-control",
      "true",
    );
    expect(viewControl).toHaveClass("grid", "grid-cols-3");
    expect(viewControl).not.toHaveClass("hidden");
    for (const name of ["Month", "Week", "Day"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "min-h-11",
        "min-w-11",
      );
    }
    const legendTrigger = screen.getByRole("button", {
      name: "Open legend",
    });
    expect(legendTrigger).toHaveAttribute(
      "data-calendar-filter-trigger",
      "true",
    );
    expect(legendTrigger).toHaveAttribute("aria-controls", "calendar-filters");
    expect(legendTrigger).toHaveAttribute("aria-expanded", "false");
    expect(legendTrigger).toHaveAttribute("title", "Open legend");
    expect(legendTrigger).toHaveClass("h-11", "min-w-11");
    expect(legendTrigger.querySelector("span")).toHaveClass(
      "hidden",
      "xl:inline",
    );
    // A long date wraps on narrow phones instead of losing its day number.
    const title = screen.getByRole("heading", { level: 3 });
    expect(title).toHaveClass("max-sm:line-clamp-2", "sm:truncate");
    expect(title).not.toHaveClass("truncate");

    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    fireEvent.click(legendTrigger);
    expect(handlers.onViewChange).toHaveBeenNthCalledWith(1, "month");
    expect(handlers.onViewChange).toHaveBeenNthCalledWith(2, "day");
    expect(handlers.onToggleFilters).toHaveBeenCalledOnce();
  });

  it("sticks the public page-scroll toolbar below the measured tenant header", () => {
    const tenantHeader = document.createElement("header");
    tenantHeader.dataset.tenantSurface = "header";
    vi.spyOn(tenantHeader, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 390,
      bottom: 94,
      left: 0,
      width: 390,
      height: 94,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(tenantHeader);

    renderToolbar({ audience: "public", pageScroll: true, readOnly: true });

    const toolbar = screen.getByRole("toolbar", { name: "Calendar view" });
    const calendarShell = toolbar.closest('[data-calendar-shell="true"]');
    expect(toolbar).toHaveClass("sticky", "z-[45]", "lg:static");
    // Short landscape phones keep the grid visible: the bar scrolls away and
    // the day header sticks directly below the site header.
    expect(toolbar).toHaveClass("[@media(max-height:500px)]:static");
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(max-width: 1023px) and (min-height: 501px)",
    );
    expect(
      calendarShell.style.getPropertyValue(
        "--calendar-command-toolbar-sticky-top",
      ),
    ).toBe("94px");
    expect(toolbar).toHaveStyle({
      top: "var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem))",
    });

    tenantHeader.remove();
  });

  it("limits the view switcher and removes editing controls in read-only mode", () => {
    renderToolbar({
      availableViews: ["week", "day"],
      readOnly: true,
    });

    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Day" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Calendar view" })).toHaveClass(
      "grid-cols-2",
    );
    expect(
      screen.queryByRole("button", { name: "Filter activities" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "New booking" }),
    ).not.toBeInTheDocument();
  });
});

describe("CalendarEventCard", () => {
  it.each(["customer", "public"])(
    "renders a suggested %s slot with an accent marker and readable neutral text",
    (audience) => {
      const onClick = vi.fn();
      render(
        <CalendarEventCard
          event={{
            id: "suggested-slot:1",
            title: "Here is an available time to start with",
            subtitle: "Select this time",
            start: "2026-07-20T07:00:00.000Z",
            end: "2026-07-20T08:00:00.000Z",
            isSuggested: true,
          }}
          studio={{ timeZone: "Europe/Prague" }}
          locale="en-GB"
          audience={audience}
          onClick={onClick}
        />,
      );

      const slot = screen.getByRole("button", {
        name: /Here is an available time to start with/,
      });
      expect(slot).toHaveAttribute("data-calendar-suggested-event", "true");
      expect(slot).toHaveAttribute("data-tenant-hover", "preserve");
      expect(slot).toHaveClass(
        "border-[var(--tenant-accent-on-surface)]/45",
        "text-[#202838]",
      );
      expect(slot).not.toHaveClass("text-[var(--tenant-accent-on-surface)]");
      expect(slot.querySelector("[data-calendar-event-accent]")).toHaveClass(
        "bg-[var(--tenant-accent-on-surface)]",
      );
      expect(slot.className).not.toContain("tenant-secondary");

      fireEvent.click(slot);
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "suggested-slot:1" }),
      );
    },
  );

  it("opens occupancy summaries while identifying the customer's own booking", () => {
    const onClick = vi.fn();
    const sharedEvent = {
      id: "shared",
      title: "Shared availability",
      start: "2026-07-20T07:00:00.000Z",
      end: "2026-07-20T08:00:00.000Z",
      guests: 3,
    };
    const { rerender } = render(
      <CalendarEventCard
        event={sharedEvent}
        studio={{ timeZone: "Europe/Prague" }}
        locale="en-GB"
        audience="customer"
        onClick={onClick}
      />,
    );

    const otherCustomersBooking = screen.getByRole("button", {
      name: /Shared availability/,
    });
    expect(otherCustomersBooking).toHaveAttribute(
      "data-calendar-event-interactive",
      "true",
    );
    expect(otherCustomersBooking).not.toHaveAttribute(
      "data-calendar-my-booking",
    );
    expect(otherCustomersBooking).not.toHaveTextContent("My booking");
    fireEvent.click(otherCustomersBooking);
    expect(onClick).toHaveBeenLastCalledWith(sharedEvent);

    rerender(
      <CalendarEventCard
        event={{ ...sharedEvent, id: "mine", isMine: true }}
        studio={{ timeZone: "Europe/Prague" }}
        locale="en-GB"
        audience="customer"
        onClick={onClick}
      />,
    );

    const ownBooking = screen.getByRole("button", {
      name: /Shared availability/,
    });
    expect(ownBooking).toHaveAttribute("data-calendar-my-booking", "true");
    expect(ownBooking).toHaveTextContent("My booking");
    expect(screen.getByText("3 people")).toBeInTheDocument();
    fireEvent.click(ownBooking);
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mine", isMine: true }),
    );
  });
});

describe("CalendarLegend", () => {
  it("explains customer availability and ownership separately from product colors", () => {
    const { container } = render(<CalendarLegend audience="customer" t={t} />);

    expect(screen.getByRole("list")).toHaveAttribute(
      "data-customer-calendar-legend",
    );
    for (const [state, label] of [
      ["available", "Available"],
      ["limited", "Limited availability"],
      ["mine", "My booking"],
    ]) {
      expect(
        container.querySelector(
          `[data-calendar-availability-legend="${state}"]`,
        ),
      ).toHaveTextContent(label);
    }
    expect(
      container.querySelector('[data-calendar-availability-legend="blocked"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });

  it("retains the full booking badge in the staff legend", () => {
    const { container } = render(<CalendarLegend audience="tenant" t={t} />);

    expect(
      container.querySelector('[data-calendar-availability-legend="full"]'),
    ).toHaveTextContent("Full");
  });
});
