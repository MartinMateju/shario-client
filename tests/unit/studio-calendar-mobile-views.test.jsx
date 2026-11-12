import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StudioCalendar from "@/components/calendar/StudioCalendar";

const MOBILE_QUERY = "(max-width: 639px)";
const MONTH_DATE = new Date("2026-09-17T12:00:00.000Z");

const location = {
  id: "studio-1",
  name: "Mobile studio",
  booking: {
    enabled: true,
    timezone: "UTC",
    slotStepMinutes: 30,
    minBookingMinutes: 60,
  },
  resources: [],
};

vi.mock("next-intl", () => ({
  useLocale: () => "en-GB",
  useTranslations: () => (key) => key,
}));

vi.mock("@/components/calendar/CalendarToolbar", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    default: ({
      availableViews,
      onNext,
      onPrevious,
      onToday,
      onToggleFilters,
      onViewChange,
      title,
      view,
    }) => (
      <div data-testid="calendar-toolbar" data-title={title} data-view={view}>
        {availableViews.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={`Show ${candidate} view`}
            aria-pressed={candidate === view}
            onClick={() => onViewChange(candidate)}
          >
            {candidate}
          </button>
        ))}
        <button type="button" aria-label="Previous period" onClick={onPrevious}>
          Previous
        </button>
        <button type="button" aria-label="Next period" onClick={onNext}>
          Next
        </button>
        <button type="button" aria-label="Today" onClick={onToday}>
          Today
        </button>
        <button
          type="button"
          aria-label="Toggle filters"
          onClick={onToggleFilters}
        >
          Filters
        </button>
      </div>
    ),
  };
});

vi.mock("@/components/calendar/CalendarLegend", () => ({
  default: () => null,
}));

vi.mock("@/components/calendar/WeekCalendar", () => ({
  default: ({ date, mobileOverlayBlocked }) => (
    <div
      data-testid="week-calendar"
      data-date={date.toISOString().slice(0, 10)}
      data-overlay-blocked={String(mobileOverlayBlocked)}
    />
  ),
}));

vi.mock("@/components/calendar/DayCalendar", () => ({
  default: ({ date }) => (
    <div
      data-testid="day-calendar"
      data-calendar-mobile-day-grid="true"
      data-date={date.toISOString().slice(0, 10)}
    >
      <button type="button" data-calendar-day-column="true">
        First available column
      </button>
    </div>
  ),
}));

vi.mock("@/components/calendar/MonthCalendar", () => ({
  default: ({ date, onDateSelect }) => (
    <div
      data-testid="month-calendar"
      data-date={date.toISOString().slice(0, 10)}
    >
      <button
        type="button"
        aria-label="Open 17 September"
        onClick={() => onDateSelect(MONTH_DATE)}
      >
        17
      </button>
    </div>
  ),
}));

const renderCustomerCalendar = (props = {}) =>
  render(
    <StudioCalendar
      audience="customer"
      location={location}
      bookings={[]}
      availableViews={["month", "week", "day"]}
      pageScroll
      {...props}
    />,
  );

describe("StudioCalendar customer mobile views", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"));
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === MOBILE_QUERY,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the customer's calendar palette in every view while keeping workspace calendars neutral", () => {
    const { container, rerender } = renderCustomerCalendar();
    for (const view of ["week", "day", "month"]) {
      fireEvent.click(screen.getByLabelText(`Show ${view} view`));
      const canvas = container.querySelector("[data-calendar-viewport]");
      expect(canvas.style.backgroundColor).toBe(
        "var(--tenant-portal-calendar-background)",
      );
      expect(
        canvas.style.getPropertyValue("--calendar-day-future-surface"),
      ).toBe("var(--tenant-portal-calendar-background)");
      expect(canvas.style.getPropertyValue("--tenant-text")).toBe(
        "var(--tenant-portal-calendar-text)",
      );
    }
    rerender(
      <StudioCalendar audience="tenant" location={location} bookings={[]} />,
    );
    expect(
      container.querySelector("[data-calendar-viewport]").style.backgroundColor,
    ).toBe("rgb(248, 250, 252)");
  });

  it("hides the selection summary only behind the phone filter sheet", () => {
    const useLayout = (phone) => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: phone && query === MOBILE_QUERY,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    };

    // Tablets open the filter panel inline by default; it never covers the
    // fixed Continue bar, which must stay available below desktop widths.
    useLayout(false);
    const { container, unmount } = renderCustomerCalendar();
    expect(
      container.querySelector('[data-calendar-filter-panel="true"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-overlay-blocked",
      "false",
    );
    unmount();

    // Phones show the panel as a bottom sheet over the bar's position.
    useLayout(true);
    renderCustomerCalendar();
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-overlay-blocked",
      "false",
    );
    fireEvent.click(screen.getByLabelText("Toggle filters"));
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-overlay-blocked",
      "true",
    );
  });

  it("closes the inline filter panel only for its own Escape", () => {
    const useLayout = (phone) => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: phone && query === MOBILE_QUERY,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    };
    const panel = () =>
      document.querySelector('[data-calendar-filter-panel="true"]');

    useLayout(false);
    const { unmount } = renderCustomerCalendar();
    expect(panel()).toBeInTheDocument();
    // Clearing a selection with Escape in the grid.
    const grid = screen.getByTestId("week-calendar");
    grid.addEventListener("keydown", (event) => event.preventDefault());
    fireEvent.keyDown(grid, { key: "Escape" });
    expect(panel()).toBeInTheDocument();
    // Escape anywhere else on the page.
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel()).toBeInTheDocument();
    // Escape from inside the panel still closes it.
    fireEvent.keyDown(panel(), { key: "Escape" });
    expect(panel()).not.toBeInTheDocument();
    unmount();

    // The phone bottom sheet closes on any Escape the calendar did not use.
    useLayout(true);
    renderCustomerCalendar();
    fireEvent.click(screen.getByLabelText("Toggle filters"));
    expect(panel()).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel()).not.toBeInTheDocument();
  });

  it("keeps Week as the phone default and lets customers select every view", () => {
    renderCustomerCalendar();

    expect(window.matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-05",
    );
    expect(screen.getByLabelText("Show week view")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Show month view")).toBeInTheDocument();
    expect(screen.getByLabelText("Show day view")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show day view"));
    expect(screen.getByTestId("day-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-05",
    );

    fireEvent.click(screen.getByLabelText("Show month view"));
    expect(screen.getByTestId("month-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-05",
    );

    fireEvent.click(screen.getByLabelText("Show week view"));
    expect(screen.getByTestId("week-calendar")).toBeInTheDocument();
  });

  it("opens a tapped Month date in Day without losing the selected date", () => {
    renderCustomerCalendar();

    fireEvent.click(screen.getByLabelText("Show month view"));
    fireEvent.click(screen.getByLabelText("Open 17 September"));
    act(() => vi.runAllTimers());

    expect(screen.queryByTestId("month-calendar")).not.toBeInTheDocument();
    expect(screen.getByTestId("day-calendar")).toHaveAttribute(
      "data-date",
      "2026-09-17",
    );
    expect(screen.getByTestId("calendar-toolbar")).toHaveAttribute(
      "data-view",
      "day",
    );
    expect(screen.getByText("First available column")).toHaveFocus();
  });

  it("keeps one shared date while applying each view's navigation interval", () => {
    renderCustomerCalendar();

    fireEvent.click(screen.getByLabelText("Next period"));
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-12",
    );

    fireEvent.click(screen.getByLabelText("Show day view"));
    expect(screen.getByTestId("day-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-12",
    );
    fireEvent.click(screen.getByLabelText("Next period"));
    expect(screen.getByTestId("day-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-13",
    );

    fireEvent.click(screen.getByLabelText("Show month view"));
    expect(screen.getByTestId("month-calendar")).toHaveAttribute(
      "data-date",
      "2026-08-13",
    );
    fireEvent.click(screen.getByLabelText("Next period"));
    expect(screen.getByTestId("month-calendar")).toHaveAttribute(
      "data-date",
      "2026-09-13",
    );

    fireEvent.click(screen.getByLabelText("Show week view"));
    fireEvent.click(screen.getByLabelText("Previous period"));
    expect(screen.getByTestId("week-calendar")).toHaveAttribute(
      "data-date",
      "2026-09-06",
    );
  });
});
