import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  booking: {
    _id: "507f1f77bcf86cd799439011",
    product: "507f191e810c19729de860ea",
  },
  bookings: [],
  selectorState: {
    currentUser: {
      _id: "507f1f77bcf86cd799439012",
      isOwner: true,
    },
    activeLocationId: "507f1f77bcf86cd799439013",
  },
  push: vi.fn(),
  getBookings: vi.fn(),
  deleteBooking: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const message = key
        .split(".")
        .reduce((value, part) => value?.[part], messages.Bookings);
      return (message || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? name,
      );
    },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.selectorState),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.currentUser,
  getAuthCacheIdentity: () => "tenant:owner",
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeLocationId,
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useDeleteBookingMutation: () => [
    mocks.deleteBooking,
    { isLoading: mocks.deleting },
  ],
}));

vi.mock("@/lib/features/bookings/bookingDirectoryApiSlice", () => ({
  useGetBookingFilterOptionsQuery: () => ({
    currentData: { products: [], lecturers: [] },
  }),
  useGetBookingDirectoryQuery: () => ({
    currentData: mocks.response,
    isFetching: false,
  }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetProductsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useGetUsersQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/features/lecturers/lecturersApiSlice", () => ({
  useGetAllLecturersQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    currentData: {
      locations: [{ _id: "507f1f77bcf86cd799439013" }],
    },
    isLoading: false,
  }),
}));

vi.mock("@/components/loaders/Loader", () => ({
  default: () => <div>Loading bookings</div>,
}));

vi.mock("@/components/modals/AlertModal", () => ({
  default: ({ open, title, text, buttonText, onSubmitClicked, setOpen }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{text}</p>
        <button type="button" onClick={onSubmitClicked}>
          {buttonText}
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Keep booking
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: ({ open, title, text }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{text}</p>
      </div>
    ) : null,
}));

vi.mock("@/components/modals/ResponsiveModal", () => ({
  default: ({ open, onClose, children }) =>
    open ? (
      <div role="dialog">
        {children}
        <button type="button" onClick={onClose}>
          Close booking modal
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/forms/bookings/EditBookingForm", () => ({
  default: ({ booking }) => (
    <div>Editing booking {String(booking?._id || "")}</div>
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  PlusIcon: () => <svg />,
  XMarkIcon: () => <svg />,
}));

vi.mock("@/components/tables/bookings/BookingsOverview", () => ({
  default: () => null,
}));

vi.mock("@/components/tables/bookings/BookingsToolbar", () => ({
  default: () => null,
}));

vi.mock("@/components/tables/bookings/BookingsPagination", () => ({
  default: () => null,
}));

vi.mock("@/components/tables/bookings/BookingsDataTable", () => ({
  default: ({ bookings, onEdit, onDelete, t }) => (
    <>
      <button type="button" onClick={() => onEdit(bookings[0])}>
        Edit first booking
      </button>
      <button
        type="button"
        onClick={() => onDelete(bookings[0]._id || bookings[0].id)}
      >
        {t("actions.delete")}
      </button>
    </>
  ),
}));

import BookingsTable from "@/components/tables/BookingsTable";

describe("BookingsTable page-context lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleting = false;
    mocks.bookings = [mocks.booking];
    mocks.response = { bookings: mocks.bookings, totalCount: 1, totalPages: 1 };
    mocks.getBookings.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.deleteBooking.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
  });

  it("opens the dedicated editor without rendering a modal", async () => {
    render(<BookingsTable />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit first booking" }),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/app/bookings/507f1f77bcf86cd799439011/edit",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("supports canonical DTO IDs in row navigation", async () => {
    mocks.bookings = [{ id: "507f191e810c19729de860eb" }];
    mocks.response = { bookings: mocks.bookings, totalCount: 1, totalPages: 1 };
    render(<BookingsTable />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit first booking" }),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/app/bookings/507f191e810c19729de860eb/edit",
    );
  });

  const openCancellation = async () => {
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel booking" }),
    );
    return screen.getByRole("dialog", { name: "Cancel booking" });
  };

  it("discloses automatic refund options before staff confirms cancellation", async () => {
    render(<BookingsTable />);
    const dialog = await openCancellation();
    expect(dialog).toHaveTextContent("apply any refund automatically");
    expect(dialog).toHaveTextContent("studio credit");
    expect(dialog).toHaveTextContent("membership or voucher value");
    expect(dialog).toHaveTextContent("queue a card refund");
    expect(dialog).toHaveTextContent("remain in the history");
    expect(dialog).not.toHaveTextContent(/permanently delete/i);
    expect(mocks.deleteBooking).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Keep booking" }),
    );
    expect(mocks.deleteBooking).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    "Booking cancelled successfully! 200 CZK has been added to your credits.",
    "Booking cancelled successfully. The membership credit was restored.",
    "Booking cancelled. Voucher value was restored with its original expiry. The card refund has been queued.",
    "Booking was cancelled, but no refund amount could be calculated.",
  ])("shows the actual cancellation outcome: %s", async (message) => {
    mocks.deleteBooking.mockReturnValue({
      unwrap: () => Promise.resolve({ message }),
    });
    render(<BookingsTable />);
    const dialog = await openCancellation();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel booking" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Booking cancelled" }),
    ).toHaveTextContent(message);
    expect(mocks.deleteBooking).toHaveBeenCalledWith({ id: mocks.booking._id });
    expect(
      screen.queryByText(/deleted successfully|permanently delete/i),
    ).not.toBeInTheDocument();
  });

  it("does not accept another cancellation while the first is pending", async () => {
    let finish;
    mocks.deleteBooking.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    const { rerender } = render(<BookingsTable />);
    const dialog = await openCancellation();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel booking" }),
    );
    mocks.deleting = true;
    rerender(<BookingsTable />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.deleteBooking).toHaveBeenCalledTimes(1);
    finish({ message: "First booking cancellation completed." });
    expect(
      await screen.findByRole("dialog", { name: "Booking cancelled" }),
    ).toHaveTextContent("First booking cancellation completed.");
  });

  it("also reports a separate refund for added booking time", async () => {
    mocks.deleteBooking.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          message: "The membership credit was restored.",
          refundType: "membership_credit",
          extensionRefundAmount: 50,
          currency: "CZK",
        }),
    });
    render(<BookingsTable />);
    const dialog = await openCancellation();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel booking" }),
    );
    const result = await screen.findByRole("dialog", {
      name: "Booking cancelled",
    });
    expect(result).toHaveTextContent("The membership credit was restored.");
    expect(result).toHaveTextContent(
      /additional .*50.*added booking time.*customer's studio credits/,
    );
  });

  it.each([
    [
      { data: { message: "The access code has already been issued." } },
      "The access code has already been issued.",
    ],
    [{ status: 500 }, messages.Bookings.modals.cancelError],
  ])(
    "reports a rejected cancellation without showing success",
    async (error, message) => {
      mocks.deleteBooking.mockReturnValue({
        unwrap: () => Promise.reject(error),
      });
      render(<BookingsTable />);
      const dialog = await openCancellation();
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(
        screen.queryByRole("dialog", { name: "Booking cancelled" }),
      ).not.toBeInTheDocument();
      await openCancellation();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
});
