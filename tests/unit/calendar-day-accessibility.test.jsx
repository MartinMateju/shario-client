import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  availabilityMode: "lanes",
  publicLaneCount: 1,
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  openingHours: {
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  },
};

const t = (key, values = {}) => {
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "footer.bookingCount") return `${values.count} bookings`;
  if (key === "events.availability") return "Full";
  if (key === "events.closed") return "Closed";
  if (key === "events.unavailable") return "Studio unavailable";
  if (key === "events.myBooking") return "My booking";
  if (key === "day.publicLane") return `Public booking ${values.number}`;
  return key;
};

describe("DayCalendar accessibility", () => {
  it.each([undefined, "retired-activity"])(
    "opens own bookings with unassigned activity %s without inventing a resource",
    (activityId) => {
      const onBookingClick = vi.fn();
      const resourceStudio = {
        ...studio,
        availabilityMode: "capacity",
        resources: [
          { id: "wheel", name: "Wheels", capacity: 2 },
          { id: "table", name: "Tables", capacity: 6 },
        ],
      };
      const booking = {
        id: "own-no-activity",
        locationId: studio.id,
        kind: "sharedOpenStudio",
        title: "My paid studio booking",
        activityId,
        isMine: true,
        start: "2026-08-04T10:00:00.000Z",
        end: "2026-08-04T11:00:00.000Z",
      };
      const { container } = render(
        <DayCalendar
          date={new Date("2026-08-04T12:00:00.000Z")}
          bookings={[booking]}
          availabilityBookings={[]}
          studio={resourceStudio}
          locale="en-GB"
          audience="customer"
          onBookingClick={onBookingClick}
          t={t}
        />,
      );
      const card = screen.getByRole("button", {
        name: /My paid studio booking/,
      });
      expect(card.closest("[data-calendar-day-column]")).toBeNull();
      expect(
        screen.getByRole("region", { name: "My booking" }),
      ).toContainElement(card);
      expect(card.closest("[data-calendar-day-scroll]")).toBeNull();
      expect(card.style.position).not.toBe("absolute");
      expect(
        container.querySelectorAll("[data-calendar-day-column]"),
      ).toHaveLength(2);
      expect(screen.getByRole("group", { name: "Wheels" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Tables" })).toBeInTheDocument();
      expect(card).toHaveAttribute("data-calendar-my-booking", "true");
      fireEvent.click(card);
      expect(onBookingClick).toHaveBeenCalledExactlyOnceWith(booking);
      expect(onBookingClick.mock.lastCall[0]).toMatchObject({
        kind: "sharedOpenStudio",
        activityId,
      });
    },
  );

  it("keeps overlapping unassigned bookings separate from each other and resource cards", () => {
    const onBookingClick = vi.fn();
    const booking = {
      id: "own-unassigned-1",
      locationId: studio.id,
      kind: "sharedOpenStudio",
      title: "First unassigned booking",
      isMine: true,
      start: "2026-08-04T10:00:00.000Z",
      end: "2026-08-04T11:00:00.000Z",
    };
    const second = {
      ...booking,
      id: "own-unassigned-2",
      title: "Second unassigned booking",
      activityId: "retired-activity",
    };
    const assigned = {
      ...booking,
      id: "wheel-booking",
      title: "Wheel booking",
      activityId: "wheel",
    };
    render(
      <DayCalendar
        date={new Date("2026-08-04T12:00:00.000Z")}
        bookings={[booking, second, assigned]}
        availabilityBookings={[assigned]}
        studio={{
          ...studio,
          availabilityMode: "capacity",
          resources: [{ id: "wheel", name: "Wheels", capacity: 2 }],
        }}
        locale="en-GB"
        audience="customer"
        onBookingClick={onBookingClick}
        t={t}
      />,
    );
    const agenda = screen.getByRole("region", { name: "My booking" });
    const cards = within(agenda).getAllByRole("button");
    expect(cards).toHaveLength(2);
    expect(within(agenda).getAllByRole("listitem")).toHaveLength(2);
    for (const card of cards) {
      expect(card.closest("[data-calendar-day-scroll]")).toBeNull();
      expect(card.style.position).not.toBe("absolute");
      fireEvent.click(card);
    }
    const wheelCard = within(
      screen.getByRole("group", { name: "Wheels" }),
    ).getByRole("button", { name: /Wheel booking/ });
    expect(agenda).not.toContainElement(wheelCard);
    fireEvent.click(wheelCard);
    expect(onBookingClick.mock.calls.map(([event]) => event)).toEqual([
      booking,
      second,
      assigned,
    ]);
  });

  it("keeps global blocking events openable and supports keyboard slot creation", () => {
    const onBookingClick = vi.fn();
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const blocker = {
      id: "blocker-1",
      locationId: "studio-1",
      kind: "privateStudio",
      title: "Kiln maintenance",
      start: "2026-08-04T10:00:00.000Z",
      end: "2026-08-04T11:00:00.000Z",
    };
    const { container } = render(
      <DayCalendar
        date={date}
        bookings={[blocker]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onBookingClick={onBookingClick}
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );
    const desktop = container.querySelector(
      '[data-calendar-desktop-grid="true"]',
    );

    fireEvent.click(
      within(desktop).getByRole("button", { name: /Kiln maintenance/i }),
    );
    expect(onBookingClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "blocker-1" }),
    );

    fireEvent.keyDown(screen.getByRole("group", { name: "Public booking 1" }), {
      key: "Enter",
    });
    expect(onSlotSelect).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /New booking: 09:00.*10:00/ }),
    );
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      laneIndex: 0,
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T10:00:00.000Z"),
    });
  });
});
