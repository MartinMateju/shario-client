import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomerBookingDetailsModal from "@/components/bookings/CustomerBookingDetailsModal";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";

const mocks = vi.hoisted(() => ({ query: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetMyBookingQuery: (...args) => mocks.query(...args),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));

const booking = {
  id: "owned-booking",
  start: "2026-08-12T08:00:00.000Z",
  end: "2026-08-12T10:00:00.000Z",
  participantCount: 2,
  bookingMode: "private",
  status: "processed",
  paymentStatus: "CONFIRMED",
  product: {
    id: "product-1",
    name: { EN: "Wheel session", CZ: "Točení na kruhu" },
  },
  location: {
    id: "location-1",
    name: "Studio Brno",
    address: { line1: "Grohova 1", city: "Brno" },
    timezone: "Europe/Prague",
  },
};

function modal(props = {}, locale = "en") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "cs" ? cs : en}
      timeZone="UTC"
    >
      <CustomerBookingDetailsModal
        bookingId={booking.id}
        onClose={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  mocks.query.mockReturnValue({
    currentData: { booking },
    refetch: mocks.refetch,
  });
});

describe("customer booking details modal", () => {
  it("loads the exact owned booking and shows its local time, product, people and statuses", () => {
    render(
      modal({
        locations: [{ id: "location-1", booking: { timezone: "UTC" } }],
      }),
    );
    expect(mocks.query).toHaveBeenCalledWith(
      { bookingId: booking.id },
      { skip: false, refetchOnMountOrArgChange: true },
    );
    expect(
      screen.getByRole("dialog", { name: "Booking details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wheel session")).toBeInTheDocument();
    expect(screen.getByText("Studio Brno")).toBeInTheDocument();
    expect(screen.getByText("Grohova 1, Brno")).toBeInTheDocument();
    expect(screen.getByText("Aug 12, 2026")).toBeInTheDocument();
    expect(screen.getByText("10:00–12:00")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("uses the active locale for labels, product names and dates", () => {
    render(modal({}, "cs"));
    expect(
      screen.getByRole("dialog", { name: cs.CustomerBookingDetails.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("Točení na kruhu")).toBeInTheDocument();
    expect(screen.getByText("12. 8. 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: cs.Common.close }),
    ).toBeInTheDocument();
  });

  it.each([0, undefined, null, "", "invalid"])(
    "does not invent attendee numbers for a private booking with count %j",
    (participantCount) => {
      mocks.query.mockReturnValue({
        currentData: { booking: { ...booking, participantCount } },
      });
      render(modal());

      expect(
        screen.queryByText(en.BookingConfirmation.summary.people),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Private")).toBeInTheDocument();
    },
  );

  it("retains genuine zero enrolment for a class", () => {
    mocks.query.mockReturnValue({
      currentData: {
        booking: { ...booking, tag: "class", participantCount: 0 },
      },
    });
    render(modal());

    expect(
      screen.getByText(en.BookingConfirmation.summary.people),
    ).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it.each([
    ["privateStudio", 0, false],
    ["privateStudio", undefined, false],
    ["privateStudio", 2, true],
    ["class", 0, true],
  ])(
    "uses the calendar's attendance semantics for a %s summary with %j people",
    (kind, participantCount, visible) => {
      render(
        modal({
          bookingId: undefined,
          calendarSummary: {
            kind,
            productName: "Studio session",
            locationId: "location-1",
            start: booking.start,
            end: booking.end,
            bookingMode: "private",
            participantCount,
          },
        }),
      );

      const label = screen.queryByText(en.BookingConfirmation.summary.people);
      if (visible) {
        expect(label).toBeInTheDocument();
        expect(screen.getByText(String(participantCount))).toBeInTheDocument();
      } else {
        expect(label).not.toBeInTheDocument();
      }
    },
  );

  it("keeps loading visible and hides cached private details while refreshing", () => {
    mocks.query.mockReturnValue({ currentData: { booking }, isFetching: true });
    render(modal());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading booking details…",
    );
    expect(screen.queryByText("Wheel session")).not.toBeInTheDocument();
  });

  it("offers retry without showing stale details after an API failure", () => {
    mocks.query.mockReturnValue({
      currentData: { booking },
      isError: true,
      refetch: mocks.refetch,
    });
    render(modal());
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.CustomerBookingDetails.error,
    );
    expect(screen.queryByText("Wheel session")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("never displays a response for a different selected booking", () => {
    render(modal({ bookingId: "different-booking" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Wheel session")).not.toBeInTheDocument();
  });

  it("does not reuse the previous query data while a different booking is loading", () => {
    mocks.query.mockReturnValue({ data: { booking }, isLoading: true });
    render(modal({ bookingId: "different-booking" }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Wheel session")).not.toBeInTheDocument();
  });

  it("closes via its accessible button", () => {
    const onClose = vi.fn();
    render(modal({ onClose }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens a calendar summary without requesting or exposing private booking details", () => {
    // A previously fetched own booking must not leak into another card's summary.
    mocks.query.mockReturnValue({ currentData: { booking }, isError: true });
    render(
      modal({
        bookingId: undefined,
        calendarSummary: {
          productName: "Shared session",
          locationId: "location-1",
          start: booking.start,
          end: booking.end,
          participantCount: 3,
          bookingMode: "public",
          paymentStatus: "CONFIRMED",
          status: "processed",
          customerName: "Private customer name",
        },
        locations: [booking.location],
      }),
    );
    expect(mocks.query).toHaveBeenCalledWith(
      { bookingId: undefined },
      { skip: true, refetchOnMountOrArgChange: true },
    );
    expect(
      screen.getByRole("dialog", { name: "Booking details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shared session")).toBeInTheDocument();
    expect(screen.getByText("Studio Brno")).toBeInTheDocument();
    expect(screen.getByText("10:00–12:00")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.queryByText("Wheel session")).not.toBeInTheDocument();
    expect(screen.queryByText("Private customer name")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment")).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toEqual([
      screen.getByRole("button", { name: "Close" }),
    ]);
  });

  it("shows both dates for an overnight booking and does not invent unknown statuses", () => {
    mocks.query.mockReturnValue({
      currentData: {
        booking: {
          ...booking,
          start: "2026-08-12T21:00:00Z",
          end: "2026-08-13T00:00:00Z",
          status: "unknown",
          paymentStatus: "unknown",
        },
      },
    });
    render(modal());
    expect(screen.getByText("Aug 12, 2026 – Aug 13, 2026")).toBeInTheDocument();
    expect(screen.getByText("23:00–02:00")).toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment")).not.toBeInTheDocument();
  });
});
