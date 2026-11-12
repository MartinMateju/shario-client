import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.selectorState),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.currentUser,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeLocationId,
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useDeleteBookingMutation: () => [mocks.deleteBooking, { isLoading: false }],
  useGetBookingsWithFiltersMutation: () => [
    mocks.getBookings,
    {
      data: {
        bookings: mocks.bookings,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
    },
  ],
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
    data: {
      locations: [{ _id: "507f1f77bcf86cd799439013" }],
    },
    isLoading: false,
  }),
}));

vi.mock("@/components/loaders/Loader", () => ({
  default: () => <div>Loading bookings</div>,
}));

vi.mock("@/components/modals/AlertModal", () => ({
  default: () => null,
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
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
  default: ({ bookings, onEdit }) => (
    <button type="button" onClick={() => onEdit(bookings[0])}>
      Edit first booking
    </button>
  ),
}));

import BookingsTable from "@/components/tables/BookingsTable";

describe("BookingsTable page-context lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bookings = [mocks.booking];
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
    render(<BookingsTable />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit first booking" }),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/app/bookings/507f191e810c19729de860eb/edit",
    );
  });
});
