import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
const catalogs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../src/messages/*.json", {
      eager: true,
      import: "default",
    }),
  ).map(([path, messages]) => [
    path.split("/").at(-1).replace(".json", ""),
    messages,
  ]),
);

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  extend: vi.fn(),
  cancel: vi.fn(),
  move: vi.fn(),
  close: vi.fn(),
  refetch: vi.fn(),
  cancelPending: vi.fn(),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useCancelBookingMutation: () => [mocks.cancel, { isLoading: false }],
  useRescheduleBookingMutation: () => [mocks.move, { isLoading: false }],
  useGetMyBookingRescheduleAvailabilityQuery: () => ({
    data: { slots: [] },
    isUninitialized: true,
  }),
  useGetMyBookingExtensionOptionsQuery: mocks.quote,
  useCancelMyBookingExtensionPaymentMutation: () => [
    mocks.cancelPending,
    { isLoading: false },
  ],
  useExtendMyBookingMutation: () => [mocks.extend, { isLoading: false }],
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
  title: "Private pottery time",
  tag: "open-studio",
  bookingMode: "private",
  participantCount: 2,
  canExtend: true,
  canCancel: false,
  canReschedule: false,
  reservationState: "confirmed",
  start: "2026-11-02T09:00:00.000Z",
  end: "2026-11-02T10:00:00.000Z",
  location: {
    id: "location-1",
    name: "Grohova",
    timeZone: "Europe/Prague",
    arrival: { accessCodeDelivered: true },
  },
};
const quote = {
  bookingId: booking.id,
  currentEnd: booking.end,
  currency: "CZK",
  canExtend: true,
  quoteVersion: "quote-1",
  paymentMethods: ["card", "credits"],
  pricingSource: "original_booking",
  options: [
    {
      minutes: 30,
      end: "2026-11-02T10:30:00.000Z",
      available: true,
      amountMinor: 6250,
    },
    {
      minutes: 60,
      end: "2026-11-02T11:00:00.000Z",
      available: true,
      amountMinor: 12500,
    },
    {
      minutes: 90,
      end: "2026-11-02T11:30:00.000Z",
      available: false,
      reason: "LOCATION_PRIVATE_BOOKING_CONFLICT",
    },
    {
      minutes: 120,
      end: "2026-11-02T12:00:00.000Z",
      available: false,
      reason: "LOCATION_OUTSIDE_OPENING_HOURS",
    },
  ],
};
function mount(value = booking, locale = "en") {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <NextIntlClientProvider
        locale={locale}
        messages={catalogs[locale]}
        timeZone="Europe/Prague"
      >
        <Drawer
          open={open}
          setOpen={(value) => {
            mocks.close(value);
            setOpen(value);
          }}
          booking={value}
        />
      </NextIntlClientProvider>
    );
  }
  return render(<Harness />);
}

describe("customer booking action selector and extensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.quote.mockReturnValue({ data: quote, refetch: mocks.refetch });
    mocks.extend.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "confirmed",
          orderId: "order-extension",
          booking: { ...booking, end: quote.options[0].end },
        }),
    });
    mocks.cancelPending.mockReturnValue({
      unwrap: () => Promise.resolve({ cancelled: true }),
    });
    mocks.cancel.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("offers extension independently after door-code delivery and shows only the selected action", async () => {
    mount();
    const selector = screen.getByRole("group", {
      name: "What would you like to do?",
    });
    expect(within(selector).getAllByRole("radio")).toHaveLength(3);
    expect(
      within(selector).getByRole("radio", { name: "Extend" }),
    ).toBeChecked();
    expect(
      within(selector).getByRole("radio", { name: "Move" }),
    ).toBeDisabled();
    expect(
      within(selector).getByRole("radio", { name: "Cancel" }),
    ).toBeDisabled();
    expect(screen.queryByLabelText("New date")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel booking" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /\+30 min/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /\+60 min/ })).toBeEnabled();
    expect(screen.getByRole("radio", { name: /\+90 min/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /\+120 min/ })).toBeDisabled();
    expect(
      screen.getByText("Another private booking starts during this time."),
    ).toBeVisible();
    expect(
      screen.getByText("This extends outside studio opening hours."),
    ).toBeVisible();
  });

  it("submits only the chosen increment and authoritative quote, preserving the original booking", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("radio", { name: /\+60 min/ }));
    await user.click(screen.getByRole("radio", { name: "Studio credits" }));
    await user.click(screen.getByRole("button", { name: /Extend booking ·/ }));
    expect(mocks.extend).toHaveBeenCalledExactlyOnceWith({
      id: booking.id,
      minutes: 60,
      expectedEnd: booking.end,
      expectedAmountMinor: 12500,
      quoteVersion: "quote-1",
      paymentMethod: "credits",
      locale: "en",
      idempotencyKey: expect.any(String),
    });
    expect(mocks.extend.mock.calls[0][0]).not.toHaveProperty("bookingType");
    expect(mocks.extend.mock.calls[0][0]).not.toHaveProperty("numberOfGuests");
    expect(
      await screen.findByRole("dialog", { name: "Booking extended" }),
    ).toBeInTheDocument();
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("requires explicit cancellation selection and confirmation", async () => {
    const user = userEvent.setup();
    mount({ ...booking, canCancel: true, canReschedule: true });
    await user.click(
      screen.getByRole("radio", { name: "Cancel", exact: true }),
    );
    expect(
      screen.queryByRole("radio", { name: /\+30 min/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New date")).not.toBeInTheDocument();
    expect(mocks.cancel).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Cancel booking", exact: true }),
    );
    const confirmation = await screen.findByRole("dialog", {
      name: "Cancel this booking?",
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
    await user.click(
      within(confirmation).getByRole("button", { name: "Yes, cancel" }),
    );
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith({ id: booking.id });
  });

  it("allows only credits when too little time remains for a card checkout", async () => {
    mocks.quote.mockReturnValue({
      data: { ...quote, paymentMethods: ["credits"] },
      refetch: mocks.refetch,
    });
    mount();
    expect(
      screen.queryByRole("radio", { name: "Payment card" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Studio credits" })).toBeChecked();
    expect(
      screen.getByText(/There is not enough time to finish card checkout/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Extend booking ·/ }));
    await waitFor(() => expect(mocks.extend).toHaveBeenCalled());
    expect(mocks.extend.mock.calls[0][0].paymentMethod).toBe("credits");
  });

  it("does not charge against a missing, failed or refreshing quote", () => {
    mocks.quote.mockReturnValue({
      data: quote,
      isFetching: true,
      refetch: mocks.refetch,
    });
    mount();
    expect(
      screen.getByRole("button", { name: /Extend booking ·/ }),
    ).toBeDisabled();
    expect(mocks.extend).not.toHaveBeenCalled();
  });

  it("refreshes a stale quote and never displays a false success", async () => {
    mocks.extend.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { errorCode: "CUSTOMER_BOOKING_EXTENSION_PRICE_CHANGED" },
        }),
    });
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /Extend booking ·/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The booking or price has changed.",
    );
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.close).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Booking extended" }),
    ).not.toBeInTheDocument();
  });

  it("blocks duplicate payment requests and preserves the retry idempotency key after a connection failure", async () => {
    let rejectRequest;
    const pending = new Promise((_, reject) => {
      rejectRequest = reject;
    });
    mocks.extend.mockReturnValueOnce({ unwrap: () => pending });
    mount();
    const pay = screen.getByRole("button", { name: /Extend booking ·/ });
    act(() => {
      fireEvent.click(pay);
      fireEvent.click(pay);
    });
    expect(mocks.extend).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    await act(async () => {
      rejectRequest({ status: "FETCH_ERROR" });
      await pending.catch(() => {});
    });
    fireEvent.click(screen.getByRole("button", { name: /Extend booking ·/ }));
    await waitFor(() => expect(mocks.extend).toHaveBeenCalledTimes(2));
    expect(mocks.extend.mock.calls[1][0].idempotencyKey).toBe(
      mocks.extend.mock.calls[0][0].idempotencyKey,
    );
  });

  it("recovers a pending extension payment without cancelling the original booking", async () => {
    mocks.quote.mockReturnValue({
      data: {
        ...quote,
        canExtend: false,
        options: [],
        pendingExtension: {
          orderId: "pending-order",
          url: "https://checkout.stripe.com/c/pay/test-extension",
        },
      },
      refetch: mocks.refetch,
    });
    const user = userEvent.setup();
    mount({ ...booking, canExtend: false, hasPendingExtension: true });
    expect(
      screen.getByRole("radio", { name: "Extend", exact: true }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Continue to payment" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("radio", { name: /\+30 min/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Cancel extension payment" }),
    );
    expect(mocks.cancelPending).toHaveBeenCalledExactlyOnceWith({
      id: booking.id,
      orderId: "pending-order",
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it.each(Object.keys(catalogs))(
    "localizes booking actions and extension quotes in %s",
    (locale) => {
      mount(booking, locale);
      const copy = catalogs[locale].BookingActions;
      expect(screen.getByRole("dialog", { name: copy.title })).toBeVisible();
      expect(
        screen.getByRole("radio", { name: copy.extend, exact: true }),
      ).toBeChecked();
      expect(screen.getByRole("radio", { name: copy.credits })).toBeVisible();
      expect(screen.getByText(copy.reasons.private)).toBeVisible();
      expect(
        screen.getByRole("button", {
          name: new RegExp(
            copy.payExtend
              .split("{amount}")[0]
              .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          ),
        }),
      ).toBeEnabled();
      expect(screen.queryByText(/BookingActions\./)).not.toBeInTheDocument();
    },
  );
});
