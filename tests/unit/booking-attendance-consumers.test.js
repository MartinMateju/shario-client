import { describe, expect, it } from "vitest";
import { normalizeBookingToCalendarEvent } from "@/components/calendar/calendar.adapters";
import { hasUserBookedCourse } from "@/utils/sidebarUtils";
import { getGuestsCount } from "@/components/modals/admin/BookingInfoModal";

const booking = {
  _id: "booking-1",
  location: "location-1",
  tag: "open-studio",
  start: "2026-11-01T12:00:00Z",
  end: "2026-11-01T13:00:00Z",
  attendanceManaged: true,
  numberOfGuests: 1,
  author: { customId: "1147" },
  participants: [
    { customId: "1147", attendanceStatus: "removed", order: "paid-order" },
    { customId: "1148", attendanceStatus: "active" },
  ],
};

describe("attendance-aware booking presentation", () => {
  it("shows only active attendee references and keeps the physical occupancy", () => {
    const event = normalizeBookingToCalendarEvent(booking);
    expect(event.customerIds).toEqual(["1148"]);
    expect(event.guests).toBe(1);
    expect(hasUserBookedCourse(booking, "1147")).toBe(false);
    expect(hasUserBookedCourse(booking, "1148")).toBe(true);
  });

  it("shows zero when every course attendee was removed instead of counting payment snapshots", () => {
    const empty = {
      ...booking,
      tag: "class",
      numberOfGuests: 0,
      participants: [booking.participants[0]],
    };
    expect(getGuestsCount(empty)).toBe(0);
    const event = normalizeBookingToCalendarEvent(empty);
    expect(event.guests).toBe(0);
    expect(event.customerIds).toEqual([]);
  });
});
