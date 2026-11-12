import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MonthCalendar from "@/components/calendar/MonthCalendar";
import MobileAgendaCalendar, {
  getQuickSelection,
} from "@/components/calendar/MobileAgendaCalendar";
import {
  getCalendarDayState,
  getCustomerCalendarDaySurface,
} from "@/components/calendar/calendar.utils";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  resources: [{ id: "WORKSTATION", name: "Pottery wheel", capacity: 2 }],
  openingHours: {
    monday: { isOpen: true, openTime: "08:00", closeTime: "20:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    wednesday: { isOpen: false },
  },
};

const t = (key, values = {}) => {
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "footer.bookingCount") return `${values.count} bookings`;
  if (key === "events.availability") {
    return values.remaining === 0
      ? "Full"
      : `${values.remaining} ${values.remaining === 1 ? "place" : "places"} available`;
  }
  if (key === "events.closed") return "Closed";
  if (key === "events.unavailable") return "Unavailable";
  if (key === "events.myBooking") return "My booking";
  if (key === "events.busy") return "Busy";
  if (key === "month.bookingCount") return `${values.count} bookings`;
  if (key === "month.more") return `${values.count} more`;
  if (key === "month.ownBookingCount") return `Your bookings: ${values.count}`;
  return key;
};

describe("MobileAgendaCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T10:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["customer", "public"])(
    "keeps a complete weekly date strip and a selected-day agenda for %s mobile visitors",
    (audience) => {
      const days = Array.from(
        { length: 7 },
        (_, index) =>
          new Date(
            `2026-08-${String(index + 3).padStart(2, "0")}T12:00:00.000Z`,
          ),
      );
      const onDateChange = vi.fn();
      const { container, rerender } = render(
        <MobileAgendaCalendar
          days={days}
          selectedDate={days[0]}
          onDateChange={onDateChange}
          bookings={[]}
          studio={studio}
          locale="en-GB"
          audience={audience}
          selectedActivityId="WORKSTATION"
          onSlotSelect={audience === "customer" ? vi.fn() : undefined}
          t={t}
        />,
      );

      const weekStrip = container.querySelector(
        '[data-calendar-mobile-week-strip="true"]',
      );
      expect(weekStrip).toBeInTheDocument();
      expect(weekStrip).toHaveClass(
        "overflow-x-auto",
        "overscroll-x-contain",
        "snap-x",
      );
      expect(
        container.querySelector('[data-calendar-mobile-agenda="true"]'),
      ).toHaveClass("min-w-0", "max-w-full", "overflow-x-hidden");
      expect(
        weekStrip.querySelectorAll('[data-calendar-mobile-day="true"]'),
      ).toHaveLength(7);
      expect(
        screen.getByRole("button", { name: /Monday.*3 August/i }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        container.querySelector('[data-calendar-mobile-selected-day="true"]'),
      ).toHaveTextContent(/Monday.*3 August/i);

      fireEvent.click(
        screen.getByRole("button", { name: /Tuesday.*4 August/i }),
      );
      expect(onDateChange).toHaveBeenCalledWith(days[1]);

      rerender(
        <MobileAgendaCalendar
          days={days}
          selectedDate={days[1]}
          onDateChange={onDateChange}
          bookings={[]}
          studio={studio}
          locale="en-GB"
          audience={audience}
          selectedActivityId="WORKSTATION"
          onSlotSelect={audience === "customer" ? vi.fn() : undefined}
          t={t}
        />,
      );

      expect(
        screen.getByRole("button", { name: /Monday.*3 August/i }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", { name: /Tuesday.*4 August/i }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        container.querySelector('[data-calendar-mobile-selected-day="true"]'),
      ).toHaveTextContent(/Tuesday.*4 August/i);
      if (audience === "customer") {
        expect(
          screen.getByRole("button", {
            name: /New booking, 09:00 – 10:00, Pottery wheel/i,
          }),
        ).toBeEnabled();
      } else {
        expect(
          screen.queryByRole("button", { name: /New booking/i }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it("marks past, today, and future days with distinct customer states", () => {
    const past = new Date(2026, 7, 2, 12);
    const today = new Date(2026, 7, 3, 12);
    const future = new Date(2026, 7, 4, 12);

    render(
      <MobileAgendaCalendar
        days={[past, today, future]}
        selectedDate={today}
        onDateChange={vi.fn()}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="customer"
        t={t}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Sunday.*2 August/i }),
    ).toHaveAttribute("data-calendar-day-state", "past");
    expect(
      screen.getByRole("button", { name: /Monday.*3 August/i }),
    ).toHaveAttribute("data-calendar-day-state", "today");
    expect(
      screen.getByRole("button", { name: /Tuesday.*4 August/i }),
    ).toHaveAttribute("data-calendar-day-state", "future");

    expect(getCalendarDayState(past, new Date(), "UTC")).toBe("past");
    expect(getCalendarDayState(today, new Date(), "UTC")).toBe("today");
    expect(getCalendarDayState(future, new Date(), "UTC")).toBe("future");
    expect(getCustomerCalendarDaySurface("past")).toContain(
      "var(--tenant-text-on-surface) 6%",
    );
    expect(getCustomerCalendarDaySurface("future")).toContain(
      "var(--tenant-accent) 2%",
    );
  });

  it("selects an explicit capacity-aware range before continuing the booking", () => {
    const onSlotSelect = vi.fn();
    const selectedDate = new Date("2026-08-04T12:00:00.000Z");
    const bookings = [
      {
        id: "full-slot",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-04T09:00:00.000Z",
        end: "2026-08-04T10:00:00.000Z",
        capacityUsed: 2,
      },
    ];

    render(
      <MobileAgendaCalendar
        days={[selectedDate]}
        selectedDate={selectedDate}
        onDateChange={vi.fn()}
        bookings={bookings}
        studio={studio}
        locale="en-GB"
        audience="customer"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const fullSlot = screen.getByRole("button", {
      name: /New booking, 09:00 – 10:00, Pottery wheel, Full/i,
    });
    expect(fullSlot).toBeDisabled();
    expect(fullSlot).toHaveAttribute(
      "data-calendar-availability-state",
      "full",
    );

    const availableSlot = screen.getByRole("button", {
      name: /New booking, 10:00 – 11:00, Pottery wheel, 2 places available/i,
    });
    expect(availableSlot).toBeEnabled();
    expect(availableSlot).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(availableSlot);

    expect(availableSlot).toHaveAttribute("aria-pressed", "true");
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-mobile-selection-summary="true"]'),
    ).toHaveTextContent(/10:00 – 11:00/i);

    const continueButton = document.querySelector(
      '[data-calendar-mobile-continue="true"]',
    );
    expect(continueButton).toBeInTheDocument();
    fireEvent.click(continueButton);

    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "WORKSTATION",
      start: new Date("2026-08-04T10:00:00.000Z"),
      end: new Date("2026-08-04T11:00:00.000Z"),
    });
  });

  it("keeps tenant mobile slot selection immediate", () => {
    const onSlotSelect = vi.fn();
    const selectedDate = new Date("2026-08-04T12:00:00.000Z");

    const { container } = render(
      <MobileAgendaCalendar
        days={[selectedDate]}
        selectedDate={selectedDate}
        onDateChange={vi.fn()}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /New booking, 09:00 – 10:00, Pottery wheel/i,
      }),
    );

    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).not.toBeInTheDocument();
  });

  it("keeps overlapping shared bookings selectable while capacity remains", () => {
    const onSlotSelect = vi.fn();
    const selectedDate = new Date("2026-08-04T12:00:00.000Z");
    const bookings = [
      {
        id: "shared-slot",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-04T09:00:00.000Z",
        end: "2026-08-04T10:00:00.000Z",
        capacityUsed: 1,
      },
    ];

    render(
      <MobileAgendaCalendar
        days={[selectedDate]}
        selectedDate={selectedDate}
        onDateChange={vi.fn()}
        bookings={bookings}
        studio={studio}
        locale="en-GB"
        audience="customer"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const sharedSlot = screen.getByRole("button", {
      name: /New booking, 09:00 – 10:00, Pottery wheel, 1 place available/i,
    });
    expect(sharedSlot).toBeEnabled();
    fireEvent.click(sharedSlot);

    expect(sharedSlot).toHaveAttribute("aria-pressed", "true");
    expect(onSlotSelect).not.toHaveBeenCalled();
    fireEvent.click(
      document.querySelector('[data-calendar-mobile-continue="true"]'),
    );
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
  });

  it("revalidates a selected time before continuing", () => {
    const onSlotSelect = vi.fn();
    const selectedDate = new Date("2026-08-04T12:00:00.000Z");

    render(
      <MobileAgendaCalendar
        days={[selectedDate]}
        selectedDate={selectedDate}
        onDateChange={vi.fn()}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="customer"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /New booking, 09:00 – 10:00, Pottery wheel/i,
      }),
    );
    expect(
      document.querySelector('[data-calendar-mobile-selection-summary="true"]'),
    ).toBeInTheDocument();

    vi.setSystemTime(new Date("2026-08-04T09:30:00.000Z"));
    fireEvent.click(
      document.querySelector('[data-calendar-mobile-continue="true"]'),
    );

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-mobile-selection-summary="true"]'),
    ).not.toBeInTheDocument();
  });

  it("uses unfiltered bookings for capacity without exposing them as events", () => {
    const selectedDate = new Date("2026-08-04T12:00:00.000Z");
    const availabilityBookings = [
      {
        id: "other-activity-capacity",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-04T09:00:00.000Z",
        end: "2026-08-04T10:00:00.000Z",
        capacityUsed: 2,
      },
    ];

    render(
      <MobileAgendaCalendar
        days={[selectedDate]}
        selectedDate={selectedDate}
        onDateChange={vi.fn()}
        bookings={[]}
        availabilityBookings={availabilityBookings}
        studio={studio}
        locale="en-GB"
        audience="customer"
        selectedActivityId="WORKSTATION"
        onSlotSelect={vi.fn()}
        t={t}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /New booking, 09:00 – 10:00, Pottery wheel, Full/i,
      }),
    ).toBeDisabled();
    expect(screen.getAllByText("0 bookings")).not.toHaveLength(0);
  });

  it("does not offer a quick action for past, closed, or too-late slots", () => {
    expect(
      getQuickSelection(
        new Date("2026-08-04T12:00:00.000Z"),
        studio,
        [],
        "WORKSTATION",
      ),
    ).toEqual({
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T10:00:00.000Z"),
    });
    expect(
      getQuickSelection(new Date("2026-08-02T12:00:00.000Z"), studio),
    ).toBeNull();
    expect(
      getQuickSelection(new Date("2026-08-05T12:00:00.000Z"), studio),
    ).toBeNull();

    vi.setSystemTime(new Date("2026-08-03T19:15:00.000Z"));
    expect(
      getQuickSelection(new Date("2026-08-03T12:00:00.000Z"), studio),
    ).toBeNull();
  });

  it.each(["closed", "blocked"])(
    "explains a %s agenda day without allowing a booking",
    (state) => {
      const selectedDate = new Date(
        state === "closed"
          ? "2026-08-05T12:00:00.000Z"
          : "2026-08-04T12:00:00.000Z",
      );
      const bookings =
        state === "blocked"
          ? [
              {
                id: "private-all-day",
                locationId: studio.id,
                kind: "privateStudio",
                start: "2026-08-04T09:00:00.000Z",
                end: "2026-08-04T17:00:00.000Z",
              },
            ]
          : [];
      const onSlotSelect = vi.fn();
      const { container } = render(
        <MobileAgendaCalendar
          days={[selectedDate]}
          selectedDate={selectedDate}
          onDateChange={vi.fn()}
          bookings={bookings}
          studio={studio}
          locale="en-GB"
          audience="customer"
          selectedActivityId="WORKSTATION"
          onSlotSelect={onSlotSelect}
          t={t}
        />,
      );

      const unavailable = container.querySelector(
        "[data-calendar-mobile-slot-empty]",
      );
      expect(unavailable).toHaveAttribute(
        "data-calendar-availability-state",
        state,
      );
      expect(unavailable).toHaveTextContent(
        state === "closed" ? "Closed" : "Unavailable",
      );
      expect(unavailable.style.backgroundColor).toContain(
        `var(--calendar-slot-${state}-surface,`,
      );
      expect(unavailable.style.backgroundColor).toContain(
        "var(--tenant-background)",
      );
      expect(
        container.querySelectorAll("[data-calendar-mobile-slot]"),
      ).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /New booking/i }),
      ).not.toBeInTheDocument();
      expect(onSlotSelect).not.toHaveBeenCalled();
    },
  );
});

describe("MonthCalendar availability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T10:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prioritizes availability states, own bookings, and outside-month context", () => {
    const onDateSelect = vi.fn();
    const monthStudio = {
      ...studio,
      resources: [{ id: "WORKSTATION", name: "Pottery wheel", capacity: 5 }],
    };
    const bookings = [
      {
        id: "full-tuesday",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-04T09:00:00.000Z",
        end: "2026-08-04T17:00:00.000Z",
        capacityUsed: 5,
      },
      {
        id: "mine",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-10T10:00:00.000Z",
        end: "2026-08-10T11:00:00.000Z",
        capacityUsed: 1,
        isMine: true,
        title: "My private title",
      },
      {
        id: "blocked-thursday",
        locationId: studio.id,
        activityId: "WORKSTATION",
        kind: "privateStudio",
        start: "2026-08-06T08:00:00.000Z",
        end: "2026-08-06T20:00:00.000Z",
      },
      {
        id: "limited-friday",
        locationId: studio.id,
        activityId: "WORKSTATION",
        start: "2026-08-07T08:00:00.000Z",
        end: "2026-08-07T20:00:00.000Z",
        capacityUsed: 4,
      },
    ];

    const { container } = render(
      <MonthCalendar
        date={new Date("2026-08-15T12:00:00.000Z")}
        bookings={bookings}
        studio={monthStudio}
        locale="en-GB"
        audience="customer"
        selectedActivityId="WORKSTATION"
        onDateSelect={onDateSelect}
        pageScroll
        t={t}
      />,
    );

    const monthScroll = container.querySelector(
      '[data-calendar-month-scroll="true"]',
    );
    const monthGrid = container.querySelector(
      '[data-calendar-month-grid="true"]',
    );
    const monthHeader = container.querySelector(
      '[data-calendar-grid-header="true"]',
    );
    expect(monthScroll).toHaveClass("min-w-0", "overflow-visible");
    expect(monthScroll).not.toHaveClass("overflow-x-auto");
    expect(monthGrid).toHaveClass("min-w-0");
    expect(monthGrid).not.toHaveClass("min-w-[308px]");
    expect(monthHeader).toHaveClass("sticky");
    expect(monthHeader).toHaveStyle({
      top: "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
    });
    expect(monthHeader.firstElementChild).toHaveClass("text-[10px]");
    expect(
      screen
        .getByRole("button", { name: /Sunday, 2 August 2026/i })
        .querySelector("span"),
    ).toHaveClass("text-[12px]", "sm:text-sm");
    expect(
      container.querySelector('[data-calendar-availability-label="true"]'),
    ).toHaveClass("text-[9px]", "sm:text-[10px]");

    expect(
      screen.getByRole("button", { name: /Sunday, 2 August 2026/i }),
    ).toHaveAttribute("data-calendar-availability-state", "past");
    expect(
      screen.getByRole("button", { name: /Tuesday, 4 August 2026/i }),
    ).toHaveAttribute("data-calendar-availability-state", "full");
    expect(
      screen.getByRole("button", { name: /Wednesday, 5 August 2026/i }),
    ).toHaveAttribute("data-calendar-availability-state", "closed");
    expect(
      screen.getByRole("button", { name: /Thursday, 6 August 2026/i }),
    ).toHaveAttribute("data-calendar-availability-state", "blocked");
    expect(
      screen.getByRole("button", { name: /Friday, 7 August 2026/i }),
    ).toHaveAttribute("data-calendar-availability-state", "limited");
    expect(
      screen.getByRole("button", {
        name: /Monday, 10 August 2026.*Your bookings: 1/i,
      }),
    ).toHaveAttribute("data-calendar-has-own-booking", "true");

    const outsideMonth = screen
      .getByRole("button", {
        name: /Monday, 31 August 2026/i,
      })
      .closest("[data-calendar-month-day]").nextElementSibling;
    expect(outsideMonth).toHaveAttribute("data-calendar-outside-month", "true");

    fireEvent.click(
      screen.getByRole("button", { name: /Tuesday, 4 August 2026/i }),
    );
    expect(onDateSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-calendar-month-agenda="2026-08-04"]'),
    ).toBeInTheDocument();
    fireEvent.click(container.querySelector("[data-calendar-month-view-day]"));
    expect(onDateSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it("inherits the measured toolbar offsets for public page scrolling", () => {
    const { container } = render(
      <MonthCalendar
        date={new Date("2026-08-15T12:00:00.000Z")}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="public"
        selectedActivityId="WORKSTATION"
        onDateSelect={vi.fn()}
        pageScroll
        t={t}
      />,
    );

    expect(
      container.querySelector('[data-calendar-grid-header="true"]'),
    ).toHaveStyle({
      top: "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
    });
  });
});
