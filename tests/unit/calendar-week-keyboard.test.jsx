import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WeekCalendar from "@/components/calendar/WeekCalendar";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  openingHours: {
    wednesday: { isOpen: false },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  },
};

const t = (key, values = {}) => {
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "footer.bookingCount") return `${values.count} bookings`;
  if (key === "events.availability") return "Full";
  if (key === "events.closed") return "Closed";
  return key;
};

const dayLabel = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

describe("WeekCalendar keyboard selection", () => {
  it("rejects closed days and creates an opening-hours slot on open days", () => {
    const onSlotSelect = vi.fn();

    render(
      <WeekCalendar
        date={new Date("2026-08-05T12:00:00.000Z")}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const firstTimeLabel = document.querySelector(
      '[data-calendar-first-time-label="true"]',
    );
    expect(firstTimeLabel).toHaveTextContent("09:00");
    expect(firstTimeLabel).toHaveClass(
      "-translate-y-1/2",
      "text-[11px]",
      "font-medium",
    );
    expect(firstTimeLabel).toHaveStyle({ top: "8px" });

    fireEvent.keyDown(
      screen.getByRole("group", {
        name: dayLabel(new Date("2026-08-05T12:00:00.000Z")),
      }),
      { key: "Enter" },
    );
    expect(onSlotSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(
      screen.getByRole("group", {
        name: dayLabel(new Date("2026-08-06T12:00:00.000Z")),
      }),
      { key: " " },
    );
    expect(onSlotSelect).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /New booking: 09:00.*10:00/ }),
    );
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "WORKSTATION",
      start: new Date("2026-08-06T09:00:00.000Z"),
      end: new Date("2026-08-06T10:00:00.000Z"),
    });
  });
});
