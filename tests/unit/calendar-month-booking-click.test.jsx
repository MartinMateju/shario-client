import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MonthCalendar from "@/components/calendar/MonthCalendar";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  availabilityMode: "lanes",
  publicLaneCount: 1,
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
};
const ownedBooking = {
  id: "own-1",
  locationId: studio.id,
  kind: "sharedOpenStudio",
  title: "Wheel session",
  start: "2026-08-12T10:00:00.000Z",
  end: "2026-08-12T12:00:00.000Z",
  isMine: true,
};
const otherBooking = {
  ...ownedBooking,
  id: "other-1",
  title: "Occupied studio",
  start: "2026-08-13T10:00:00.000Z",
  end: "2026-08-13T12:00:00.000Z",
  isMine: false,
};
const t = (key, values = {}) => {
  if (key === "events.myBooking") return "My booking";
  if (key === "month.bookingCount") return `${values.count} bookings`;
  if (key === "month.ownBookingCount") return `Your bookings: ${values.count}`;
  if (key === "month.selectedDay") return `Bookings for ${values.date}`;
  if (key === "month.viewDay") return "View day";
  if (key === "month.findTime") return "Find a time";
  if (key === "month.noBookings") return "No bookings on this day.";
  if (key === "events.availability") return "Available";
  return key;
};
const renderMonth = (overrides = {}) => {
  const props = {
    date: new Date("2026-08-12T12:00:00.000Z"),
    bookings: [ownedBooking, otherBooking],
    studio,
    locale: "en-GB",
    audience: "customer",
    onDateSelect: vi.fn(),
    onBookingClick: vi.fn(),
    t,
    ...overrides,
  };
  return { ...render(<MonthCalendar {...props} />), props };
};

describe("MonthCalendar selected-day agenda", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("retains privacy colors and ownership markers in the selected-day agenda", () => {
    const privateBooking = {
      ...ownedBooking,
      id: "private-1",
      title: "Private studio visit",
      bookingMode: "private",
      isMine: false,
      start: "2026-08-12T12:00:00.000Z",
      end: "2026-08-12T13:00:00.000Z",
    };
    const { container } = renderMonth({
      bookings: [ownedBooking, privateBooking],
    });
    const shared = container.querySelector(
      '[data-calendar-booking-id="own-1"]',
    );
    const exclusive = container.querySelector(
      '[data-calendar-booking-id="private-1"]',
    );
    expect(shared).toHaveStyle({
      backgroundColor: "#DDEEE9",
      borderColor: "#2563EB",
      color: "#254F48",
    });
    expect(exclusive).toHaveStyle({
      backgroundColor: "#674A64",
      color: "#FFFFFF",
    });
    expect(
      shared.querySelector("[data-calendar-own-booking-badge]"),
    ).toHaveTextContent("My booking");
    expect(
      exclusive.querySelector("[data-calendar-own-booking-badge]"),
    ).toBeNull();
    expect(
      shared.querySelector('[data-calendar-privacy-icon="public"]'),
    ).toBeInTheDocument();
    expect(
      exclusive.querySelector('[data-calendar-privacy-icon="private"]'),
    ).toBeInTheDocument();
  });
  it("keeps overview cells compact and opens the exact booking from the agenda", () => {
    const { container, props } = renderMonth();
    const grid = container.querySelector("[data-calendar-month-grid]");
    expect(grid.querySelector("[data-calendar-event-card]")).toBeNull();
    const day = grid.querySelector('[data-calendar-month-day="2026-08-12"]');
    expect(day).toHaveClass("h-[84px]", "sm:h-[96px]");
    expect(day).toHaveAccessibleName(/Your bookings: 1/);
    const agenda = container.querySelector(
      '[data-calendar-month-agenda="2026-08-12"]',
    );
    fireEvent.click(
      within(agenda).getByRole("button", { name: /Wheel session/ }),
    );
    expect(props.onBookingClick).toHaveBeenCalledWith(ownedBooking);
    expect(props.onDateSelect).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
  });

  it("selects a date without leaving month and offers an explicit day booking action", () => {
    const { container, props } = renderMonth();
    const day = screen.getByRole("button", { name: /Thursday, 13 August/ });
    fireEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "true");
    expect(
      container.querySelector('[data-calendar-month-agenda="2026-08-13"]'),
    ).toBeInTheDocument();
    expect(props.onDateSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Occupied studio/ }));
    expect(props.onBookingClick).toHaveBeenCalledWith(otherBooking);
    fireEvent.click(container.querySelector("[data-calendar-month-view-day]"));
    expect(props.onDateSelect).toHaveBeenCalledWith(expect.any(Date));
    expect(props.onDateSelect.mock.lastCall[0].getDate()).toBe(13);
  });

  it("supports arrow navigation and keyboard booking activation with one date tab stop", async () => {
    const user = userEvent.setup();
    const { container, props } = renderMonth();
    const initial = screen.getByRole("button", {
      name: /Wednesday, 12 August/,
    });
    initial.focus();
    await user.keyboard("{ArrowRight}");
    const next = screen.getByRole("button", { name: /Thursday, 13 August/ });
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute("aria-pressed", "true");
    expect(
      container.querySelectorAll('[data-calendar-month-day][tabindex="0"]'),
    ).toHaveLength(1);
    const event = screen.getByRole("button", { name: /Occupied studio/ });
    event.focus();
    await user.keyboard(" ");
    expect(props.onBookingClick).toHaveBeenCalledWith(otherBooking);
    expect(props.onDateSelect).not.toHaveBeenCalled();
  });

  it("shows all bookings chronologically with own markers instead of event chips in cells", () => {
    const second = {
      ...ownedBooking,
      id: "own-2",
      start: "2026-08-12T14:00:00.000Z",
      end: "2026-08-12T16:00:00.000Z",
    };
    const earlier = {
      ...otherBooking,
      start: "2026-08-12T08:00:00.000Z",
      end: "2026-08-12T09:00:00.000Z",
    };
    const { container, props } = renderMonth({
      bookings: [second, ownedBooking, earlier],
    });
    expect(
      screen.getByRole("button", { name: /Wednesday, 12 August/ }),
    ).toHaveAccessibleName(/Your bookings: 2/);
    const agenda = container.querySelector("[data-calendar-month-agenda]");
    expect(
      [...agenda.querySelectorAll("[data-calendar-booking-id]")].map(
        (event) => event.dataset.calendarBookingId,
      ),
    ).toEqual(["other-1", "own-1", "own-2"]);
    expect(
      agenda.querySelectorAll("[data-calendar-my-booking=true]"),
    ).toHaveLength(2);
    fireEvent.click(agenda.querySelector('[data-calendar-booking-id="own-2"]'));
    expect(props.onBookingClick).toHaveBeenCalledWith(second);
  });

  it("uses studio local dates and shows only the supplied customer reference", () => {
    const midnight = {
      ...otherBooking,
      start: "2026-08-12T22:30:00.000Z",
      end: "2026-08-12T23:30:00.000Z",
      customerName: "Private Person",
      customerIds: ["0873"],
      email: "private@example.com",
    };
    const { container } = renderMonth({
      bookings: [midnight],
      studio: { ...studio, timeZone: "Europe/Prague" },
    });
    expect(container.querySelector("[data-calendar-booking-id]")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Thursday, 13 August/ }),
    );
    expect(
      screen.getByRole("button", { name: /Occupied studio, 00:30.*01:30/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Private Person|private@example.com/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("#0873")).toBeInTheDocument();
  });

  it("shows safe agenda details on desktop hover and dismisses the tooltip before opening the booking", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
    const event = {
      ...ownedBooking,
      customerIds: ["0873"],
      customerName: "Private Person",
      email: "private@example.com",
    };
    const { props } = renderMonth({ bookings: [event] });
    const button = screen.getByRole("button", { name: /Wheel session/ });
    // jsdom has no layout; the tooltip intentionally ignores offscreen anchors.
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 50,
      right: 250,
      top: 100,
      bottom: 180,
      width: 200,
      height: 80,
    });
    fireEvent.pointerEnter(button, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Wednesday, 12 August 2026");
    expect(tooltip).toHaveTextContent("10:00 – 12:00");
    expect(tooltip).toHaveTextContent("My booking");
    expect(tooltip).toHaveTextContent("#0873");
    expect(tooltip).not.toHaveTextContent(/Private Person|private@example.com/);
    fireEvent.click(button);
    expect(props.onBookingClick).toHaveBeenCalledWith(event);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("updates the agenda for externally selected dates including Today in the same month", () => {
    const { container, props, rerender } = renderMonth();
    fireEvent.click(
      screen.getByRole("button", { name: /Thursday, 13 August/ }),
    );
    rerender(
      <MonthCalendar {...props} date={new Date("2026-08-15T12:00:00.000Z")} />,
    );
    expect(
      container.querySelector('[data-calendar-month-agenda="2026-08-15"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("No bookings on this day.")).toBeInTheDocument();
  });

  it("resets a local selection when Today reselects the original anchor date", () => {
    const { container, props, rerender } = renderMonth();
    fireEvent.click(
      screen.getByRole("button", { name: /Thursday, 13 August/ }),
    );
    rerender(<MonthCalendar {...props} date={new Date(props.date)} />);
    expect(
      container.querySelector('[data-calendar-month-agenda="2026-08-12"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Wednesday, 12 August/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves staff event actions and direct day navigation", () => {
    const { container, props } = renderMonth({ audience: "tenant" });
    const day = container.querySelector(
      '[data-calendar-month-day="2026-08-13"]',
    );
    fireEvent.click(
      within(day).getByRole("button", { name: /Occupied studio/ }),
    );
    expect(props.onBookingClick).toHaveBeenCalledWith(otherBooking);
    fireEvent.click(
      within(day).getByRole("button", { name: /Thursday, 13 August/ }),
    );
    expect(props.onDateSelect).toHaveBeenCalledOnce();
    expect(container.querySelector("button button")).toBeNull();
  });

  it("keeps read-only agenda bookings inert and date selection available", () => {
    const { container, props } = renderMonth({ onBookingClick: undefined });
    expect(
      container.querySelector('[data-calendar-my-booking="true"]').tagName,
    ).toBe("ARTICLE");
    fireEvent.click(
      screen.getByRole("button", { name: /Wednesday, 12 August/ }),
    );
    expect(props.onDateSelect).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector("[data-calendar-month-view-day]"));
    expect(props.onDateSelect).toHaveBeenCalledOnce();
  });
});
