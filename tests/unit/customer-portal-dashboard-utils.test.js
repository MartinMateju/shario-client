import { describe, expect, it, vi } from "vitest";

import {
  focusCustomerPortalCalendar,
  formatUpcomingBooking,
  getNextUpcomingBooking,
  getPortalDashboardCopy,
  getPortalGreetingName,
} from "@/components/menu/menuDashboard.utils";

describe("customer portal dashboard localization", () => {
  it("uses the route locale for copy and Czech vocative greeting names", () => {
    expect(getPortalDashboardCopy("en")).toMatchObject({
      greeting: "Welcome back",
      chooseTime: "Choose a time",
      cancelBooking: "Cancel booking",
      calendarTitle: "Plan your next visit",
      calendarDescription:
        "Choose a studio, then select an available time in the calendar.",
    });
    expect(getPortalDashboardCopy("cs")).toMatchObject({
      greeting: "Vítejte zpět",
      chooseTime: "Vybrat termín",
      cancelBooking: "Zrušit rezervaci",
      calendarTitle: "Naplánujte si další návštěvu",
      calendarDescription: "Vyberte studio a potom volný termín v kalendáři.",
    });
    expect(getPortalDashboardCopy("EN").greeting).toBe("Welcome back");
    expect(getPortalGreetingName("Martin Mateju", "en")).toBe("Martin");
    expect(getPortalGreetingName("Martin Mateju", "cs")).toBe("Martine");
    expect(getPortalGreetingName("  Marek Novák  ", "cs")).toBe("Marku");
    expect(getPortalGreetingName("martin maker", "en")).toBe("Martin");
    expect(getPortalGreetingName("MARTIN MAKER", "cs")).toBe("Martine");
    expect(getPortalGreetingName("", "cs")).toBe("");
  });
});

describe("customer portal calendar handoff", () => {
  it("focuses the calendar context and respects reduced-motion scrolling", () => {
    const heading = { focus: vi.fn() };
    const section = { scrollIntoView: vi.fn() };

    expect(
      focusCustomerPortalCalendar({ heading, section, reduceMotion: false }),
    ).toBe(true);
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    section.scrollIntoView.mockClear();
    focusCustomerPortalCalendar({ heading, section, reduceMotion: true });
    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    expect(focusCustomerPortalCalendar()).toBe(false);
  });
});

describe("customer portal upcoming booking", () => {
  it("does not advertise the expired October 30 checkout or its separately cancelled paid booking", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const common = {
      locationId: "grohova",
      start: "2026-10-30T06:00:00Z",
      end: "2026-10-30T07:00:00Z",
    };
    const ghostEntries = [
      {
        ...common,
        id: "expired-checkout",
        status: "pending",
        paymentStatus: "PENDING_PAYMENT",
        paymentExpiresAt: "2026-10-12T12:00:00Z",
      },
      {
        ...common,
        id: "cancelled-paid",
        status: "cancelled",
        paymentStatus: "CONFIRMED",
        reservationState: "cancelled",
        isActiveReservation: false,
      },
    ];
    expect(
      getNextUpcomingBooking({ bookings: ghostEntries }, now, "grohova"),
    ).toBeNull();
    expect(
      getNextUpcomingBooking(
        {
          bookings: [
            ...ghostEntries,
            {
              ...common,
              id: "paid-needs-confirmation",
              status: "pending",
              reservationState: "awaiting_confirmation",
              isActiveReservation: false,
            },
            {
              ...common,
              id: "live-hold",
              reservationState: "awaiting_payment",
              paymentExpiresAt: "2026-10-22T12:15:00Z",
              isActiveReservation: true,
            },
            {
              ...common,
              id: "next-real-visit",
              start: "2026-10-31T06:00:00Z",
              end: "2026-10-31T07:00:00Z",
              reservationState: "confirmed",
              isActiveReservation: true,
            },
          ],
        },
        now,
        "grohova",
      )?.id,
    ).toBe("next-real-visit");
  });

  it("filters cancelled and past bookings before sorting the next visit", () => {
    const now = new Date("2026-08-06T12:00:00.000Z");
    const response = {
      bookings: [
        {
          id: "later",
          status: "confirmed",
          start: "2026-08-09T09:00:00.000Z",
          end: "2026-08-09T10:00:00.000Z",
        },
        {
          id: "past",
          status: "completed",
          start: "2026-08-05T09:00:00.000Z",
          end: "2026-08-05T10:00:00.000Z",
        },
        {
          id: "cancelled",
          status: "cancelled",
          start: "2026-08-07T08:00:00.000Z",
          end: "2026-08-07T09:00:00.000Z",
        },
        {
          id: "next",
          status: "confirmed",
          start: "2026-08-07T14:30:00.000Z",
          end: "2026-08-07T16:00:00.000Z",
        },
        {
          id: "invalid",
          status: "confirmed",
          start: "not-a-date",
          end: "not-a-date",
        },
      ],
    };

    expect(getNextUpcomingBooking(response, now)?.id).toBe("next");
    expect(getNextUpcomingBooking({ bookings: [] }, now)).toBeNull();
  });

  it("selects the next visit only from the active studio", () => {
    const now = new Date("2026-08-06T12:00:00.000Z");
    const brnoLocationId = "64b000000000000000000021";
    const pragueLocationId = "64b000000000000000000022";
    const response = {
      bookings: [
        {
          id: "prague-earlier",
          status: "confirmed",
          locationId: pragueLocationId,
          start: "2026-08-07T08:00:00.000Z",
          end: "2026-08-07T09:00:00.000Z",
        },
        {
          id: "brno-next",
          status: "confirmed",
          location: { id: brnoLocationId, name: "Atelier Brno" },
          start: "2026-08-08T14:00:00.000Z",
          end: "2026-08-08T16:00:00.000Z",
        },
        {
          id: "brno-later",
          status: "confirmed",
          location: brnoLocationId,
          start: "2026-08-09T14:00:00.000Z",
          end: "2026-08-09T16:00:00.000Z",
        },
      ],
    };

    expect(getNextUpcomingBooking(response, now, brnoLocationId)?.id).toBe(
      "brno-next",
    );
    expect(getNextUpcomingBooking(response, now, pragueLocationId)?.id).toBe(
      "prague-earlier",
    );
    expect(
      getNextUpcomingBooking(response, now, "64b000000000000000000099"),
    ).toBeNull();
  });

  it("formats the same instant in the studio timezone and requested locale", () => {
    const booking = {
      id: "booking-1",
      status: "confirmed",
      productId: "product-1",
      locationId: "location-1",
      start: "2026-08-07T14:30:00.000Z",
      end: "2026-08-07T16:00:00.000Z",
    };
    const products = [
      {
        id: "product-1",
        name: { en: "Wheel basics", cs: "Základy kruhu" },
      },
    ];
    const locations = [
      {
        id: "location-1",
        name: "Studio Olivie",
        booking: { timezone: "Europe/Prague" },
      },
    ];

    const english = formatUpcomingBooking({
      booking,
      products,
      locations,
      locale: "en",
    });
    const czech = formatUpcomingBooking({
      booking,
      products,
      locations,
      locale: "cs",
    });

    expect(english).toMatchObject({
      id: "booking-1",
      title: "Wheel basics",
      date: "Fri 7 August",
      time: "16:30–18:00",
      locationName: "Studio Olivie",
    });
    expect(czech).toMatchObject({
      id: "booking-1",
      title: "Základy kruhu",
      date: "pá 7. srpna",
      time: "16:30–18:00",
      locationName: "Studio Olivie",
    });
  });

  it("uses localized-safe fallbacks when catalog records are unavailable", () => {
    expect(
      formatUpcomingBooking({
        booking: {
          id: "booking-2",
          start: "2026-08-07T14:30:00.000Z",
          end: "2026-08-07T15:30:00.000Z",
        },
        locale: "cs",
        fallbackTitle: "Návštěva studia",
        fallbackLocation: "Vaše studio",
      }),
    ).toMatchObject({
      title: "Návštěva studia",
      locationName: "Vaše studio",
    });
  });

  it("uses an embedded booking product when the service catalog is disabled", () => {
    expect(
      formatUpcomingBooking({
        booking: {
          id: "course-booking",
          bookingProduct: {
            id: "course-product",
            name: { en: "Clay course", cs: "Kurz keramiky" },
          },
          start: "2026-08-07T14:30:00.000Z",
          end: "2026-08-07T15:30:00.000Z",
        },
        locale: "cs",
      }),
    ).toMatchObject({ title: "Kurz keramiky" });
  });
});
