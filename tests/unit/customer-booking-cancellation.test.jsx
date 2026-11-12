import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";
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
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelBooking: vi.fn(),
  dispatch: vi.fn(),
  language: "EN",
  setOpen: vi.fn(),
}));

vi.mock("@heroicons/react/24/outline", async (importOriginal) => ({
  ...(await importOriginal()),
  CheckIcon: (props) => <svg data-testid="success-check" {...props} />,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ id: "customer-1", firstname: "Customer" }),
  selectCurrentTenant: () => ({ id: "tenant-1" }),
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => mocks.language,
}));

vi.mock("@/lib/features/cart/cartSlice", () => ({
  addToCart: vi.fn(),
  openCart: vi.fn(),
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useCancelBookingMutation: () => [mocks.cancelBooking, { isLoading: false }],
  useRescheduleBookingMutation: () => [vi.fn(), { isLoading: false }],
  useGetMyBookingExtensionOptionsQuery: () => ({ isUninitialized: true }),
  useCancelMyBookingExtensionPaymentMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useExtendMyBookingMutation: () => [vi.fn(), { isLoading: false }],
  useGetMyBookingRescheduleAvailabilityQuery: () => ({
    data: { slots: [] },
    isUninitialized: true,
  }),
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
  tag: "workshop",
  canCancel: true,
  canReschedule: false,
  start: "2026-11-02T09:00:00.000Z",
  end: "2026-11-02T10:00:00.000Z",
  participantCount: 1,
  location: {
    id: "location-1",
    name: "The Pottery House",
    timeZone: "Europe/Prague",
  },
};

function BookingDrawer({ openCancelConfirmation = false } = {}) {
  const [open, setOpen] = useState(true);

  return (
    <NextIntlClientProvider
      locale={mocks.language === "CZ" ? "cs" : "en"}
      messages={mocks.language === "CZ" ? cs : en}
      timeZone="Europe/Prague"
    >
      <Drawer
        booking={booking}
        open={open}
        openCancelConfirmation={openCancelConfirmation}
        setOpen={(nextOpen) => {
          mocks.setOpen(nextOpen);
          setOpen(nextOpen);
        }}
      />
    </NextIntlClientProvider>
  );
}

const openCancellation = async (user) => {
  await user.click(
    screen.getByRole("button", {
      name: mocks.language === "CZ" ? "Zrušit rezervaci" : "Cancel booking",
    }),
  );
  return screen.findByRole("dialog", {
    name:
      mocks.language === "CZ" ? "Zrušit rezervaci?" : "Cancel this booking?",
  });
};

describe("customer booking cancellation", () => {
  beforeEach(() => {
    mocks.language = "EN";
    mocks.cancelBooking.mockReset();
    mocks.cancelBooking.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mocks.setOpen.mockReset();
  });

  it("lets the next-visit shortcut confirm cancellation immediately", async () => {
    const user = userEvent.setup();
    render(<BookingDrawer openCancelConfirmation />);

    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this booking?",
    });
    expect(screen.queryByTestId("success-check")).not.toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Yes, cancel" });
    expect(confirm.closest('[inert], [aria-hidden="true"]')).toBeNull();
    await waitFor(() => {
      expect(
        within(dialog).getByText("Keep booking", { selector: "button" }),
      ).toHaveFocus();
    });

    await user.click(confirm);

    expect(mocks.cancelBooking).toHaveBeenCalledExactlyOnceWith({
      id: "booking-1",
    });
    expect(
      await screen.findByRole("dialog", { name: "Booking was cancelled" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("success-check")).toHaveLength(1);
    expect(mocks.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(["Keep booking", "Escape"])(
    "returns from the shortcut confirmation to the drawer with %s",
    async (dismissal) => {
      const user = userEvent.setup();
      render(<BookingDrawer openCancelConfirmation />);
      const dialog = await screen.findByRole("dialog", {
        name: "Cancel this booking?",
      });

      if (dismissal === "Escape") {
        await user.keyboard("{Escape}");
      } else {
        await user.click(
          within(dialog).getByText("Keep booking", { selector: "button" }),
        );
      }

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      const drawer = await screen.findByRole("dialog", {
        name: "Edit booking",
      });
      expect(drawer.closest('[inert], [aria-hidden="true"]')).toBeNull();
      expect(mocks.cancelBooking).not.toHaveBeenCalled();
      expect(mocks.setOpen).not.toHaveBeenCalled();
      expect(await openCancellation(user)).toBeInTheDocument();
    },
  );

  it("keeps a server failure in the confirmation and allows retrying the same booking", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    mocks.cancelBooking.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({ data: { message: "Please try again later." } }),
    });
    render(<BookingDrawer />);
    const dialog = await openCancellation(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Yes, cancel" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Please try again later.",
    );
    expect(mocks.cancelBooking).toHaveBeenCalledExactlyOnceWith({
      id: "booking-1",
    });
    expect(mocks.setOpen).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Booking was cancelled" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("success-check")).not.toBeInTheDocument();
    const retry = within(dialog).getByRole("button", { name: "Yes, cancel" });
    expect(retry).toBeEnabled();

    await user.click(retry);

    expect(
      await screen.findByRole("dialog", { name: "Booking was cancelled" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("success-check")).toHaveLength(1);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mocks.cancelBooking).toHaveBeenCalledTimes(2);
    expect(mocks.cancelBooking).toHaveBeenLastCalledWith({ id: "booking-1" });
    expect(mocks.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each([
    ["EN", "Could not cancel this booking. Please try again."],
    ["CZ", "Rezervaci se nepodařilo zrušit. Zkuste to prosím znovu."],
  ])(
    "shows a localized %s fallback when the request has no server message",
    async (language, message) => {
      mocks.language = language;
      mocks.cancelBooking.mockReturnValue({
        unwrap: () => Promise.reject({ status: "FETCH_ERROR" }),
      });
      const user = userEvent.setup();
      render(<BookingDrawer />);
      const dialog = await openCancellation(user);

      await user.click(
        within(dialog).getByRole("button", {
          name: language === "CZ" ? "Ano, zrušit" : "Yes, cancel",
        }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(screen.queryByTestId("success-check")).not.toBeInTheDocument();
      expect(mocks.setOpen).not.toHaveBeenCalled();
    },
  );

  it("blocks duplicate requests and dismissals until cancellation completes", async () => {
    let resolveCancellation;
    const cancellation = new Promise((resolve) => {
      resolveCancellation = resolve;
    });
    mocks.cancelBooking.mockReturnValue({ unwrap: () => cancellation });
    const user = userEvent.setup();
    render(<BookingDrawer />);
    const drawerClose = screen.getByRole("button", { name: "Close" });
    const dialog = await openCancellation(user);
    const confirm = within(dialog).getByRole("button", { name: "Yes, cancel" });
    expect(screen.queryByTestId("success-check")).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });

    expect(mocks.cancelBooking).toHaveBeenCalledOnce();
    expect(confirm).toBeDisabled();
    expect(screen.queryByTestId("success-check")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Booking was cancelled" }),
    ).not.toBeInTheDocument();
    for (const keep of within(dialog).getAllByRole("button", {
      name: "Keep booking",
    })) {
      expect(keep).toBeDisabled();
      fireEvent.click(keep);
    }
    expect(drawerClose).toBeDisabled();
    fireEvent.click(drawerClose);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mocks.setOpen).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();

    await act(async () => {
      resolveCancellation({});
      await cancellation;
    });

    const successDialog = await screen.findByRole("dialog", {
      name: "Booking was cancelled",
    });
    expect(
      within(successDialog).getByTestId("success-check"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("success-check")).toHaveLength(1);
    expect(mocks.cancelBooking).toHaveBeenCalledOnce();
    expect(mocks.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });
});
