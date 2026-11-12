import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  availability: vi.fn(),
  cancelBooking: vi.fn(),
  dispatch: vi.fn(),
  rescheduleBooking: vi.fn(),
  setOpen: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ id: "customer-1" }),
  selectCurrentTenant: () => ({ id: "tenant-1" }),
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));

vi.mock("@/lib/features/cart/cartSlice", () => ({
  addToCart: vi.fn(),
  openCart: vi.fn(),
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useCancelBookingMutation: () => [mocks.cancelBooking, { isLoading: false }],
  useRescheduleBookingMutation: () => [
    mocks.rescheduleBooking,
    { isLoading: false },
  ],
  useGetMyBookingExtensionOptionsQuery: () => ({ isUninitialized: true }),
  useCancelMyBookingExtensionPaymentMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useExtendMyBookingMutation: () => [vi.fn(), { isLoading: false }],
  useGetMyBookingRescheduleAvailabilityQuery: mocks.availability,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: {} }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import Drawer from "@/components/sidebars/Drawer";

const booking = {
  id: "booking-1",
  title: "Open studio session",
  tag: "open-studio",
  canCancel: true,
  canReschedule: true,
  start: "2026-11-02T09:00:00.000Z",
  end: "2026-11-02T10:00:00.000Z",
  participantCount: 1,
  location: {
    id: "location-1",
    name: "The Pottery House",
    timeZone: "Europe/Prague",
  },
};

const availableSlot = {
  start: "2026-11-02T11:00:00.000Z",
  end: "2026-11-02T12:00:00.000Z",
  available: true,
  remainingCapacity: 2,
};

function BookingDrawer({ value = booking }) {
  const [open, setOpen] = useState(true);
  return (
    <NextIntlClientProvider
      locale={"en"}
      messages={en}
      timeZone="Europe/Prague"
    >
      <Drawer
        booking={value}
        open={open}
        setOpen={(nextOpen) => {
          mocks.setOpen(nextOpen);
          setOpen(nextOpen);
        }}
      />
    </NextIntlClientProvider>
  );
}

describe("customer booking rescheduling", () => {
  beforeEach(() => {
    mocks.rescheduleBooking.mockReset();
    mocks.rescheduleBooking.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.availability.mockReset();
    mocks.availability.mockReturnValue({
      data: { slots: [availableSlot] },
      isFetching: false,
    });
    mocks.setOpen.mockReset();
  });

  it.each([
    "cancelled",
    "expired",
    "awaiting_payment",
    "awaiting_confirmation",
  ])("does not promise an access code for a %s record", (reservationState) => {
    render(
      <BookingDrawer
        value={{
          ...booking,
          canCancel: false,
          canReschedule: false,
          reservationState,
          isActiveReservation: reservationState === "awaiting_payment",
          location: {
            ...booking.location,
            arrival: {
              publicInstructions: "Use the side entrance.",
              accessCodeDeliveryEnabled: true,
              accessCodeDeliveryMinutesBefore: 30,
            },
          },
        }}
      />,
    );

    expect(
      screen.queryByText(/Your access code will be emailed/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Arrival information")).not.toBeInTheDocument();
    if (reservationState === "awaiting_confirmation") {
      expect(
        screen.getByText("Payment received · awaiting confirmation"),
      ).toBeInTheDocument();
    }
  });

  it.each(["open-studio", "workshop"])(
    "lets an eligible %s booking choose and confirm a new time",
    async (tag) => {
      const user = userEvent.setup();
      render(<BookingDrawer value={{ ...booking, tag }} />);

      expect(screen.getByLabelText("New date")).toHaveValue("2026-11-02");
      expect(screen.getByLabelText("Start time")).toHaveValue("10:00");
      expect(mocks.availability).toHaveBeenLastCalledWith(
        { id: booking.id, date: "2026-11-02" },
        { skip: false },
      );
      expect(
        screen.queryByText(/Course registrations are read-only/),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "12:00–13:00" }));
      await user.click(
        screen.getByRole("button", { name: "Confirm new time" }),
      );

      expect(mocks.rescheduleBooking).toHaveBeenCalledExactlyOnceWith({
        id: booking.id,
        start: availableSlot.start,
      });
      expect(
        await screen.findByRole("dialog", { name: "Booking moved" }),
      ).toBeInTheDocument();
      expect(mocks.setOpen).toHaveBeenCalledExactlyOnceWith(false);
    },
  );

  it.each(["open-studio", "workshop"])(
    "keeps a %s booking without reschedule permission read-only without calling it a course",
    (tag) => {
      render(
        <BookingDrawer
          value={{ ...booking, tag, canCancel: false, canReschedule: false }}
        />,
      );

      expect(
        screen.getByText("The time of this booking can no longer be changed."),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("New date")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Confirm new time" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Course registrations are read-only/),
      ).not.toBeInTheDocument();
      expect(mocks.availability).toHaveBeenLastCalledWith(expect.anything(), {
        skip: true,
      });
      expect(mocks.rescheduleBooking).not.toHaveBeenCalled();
    },
  );

  it.each(["class", "course"])(
    "keeps scheduled %s registrations read-only",
    (tag) => {
      render(
        <BookingDrawer
          value={{ ...booking, tag, canCancel: false, canReschedule: false }}
        />,
      );

      expect(
        screen.getByText(/Course registrations are read-only/),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("New date")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Cancel booking" }),
      ).not.toBeInTheDocument();
      expect(mocks.availability).toHaveBeenLastCalledWith(expect.anything(), {
        skip: true,
      });
    },
  );

  it("removes reschedule controls if permission is revoked while the drawer is open", async () => {
    const { rerender } = render(<BookingDrawer />);
    expect(screen.getByLabelText("New date")).toBeInTheDocument();

    rerender(
      <BookingDrawer
        value={{ ...booking, canCancel: false, canReschedule: false }}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("New date")).not.toBeInTheDocument();
    });
    expect(mocks.availability).toHaveBeenLastCalledWith(expect.anything(), {
      skip: true,
    });
    expect(mocks.rescheduleBooking).not.toHaveBeenCalled();
  });
});
