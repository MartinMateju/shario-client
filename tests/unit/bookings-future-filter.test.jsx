import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    currentUser: { _id: "owner-1", isOwner: true },
    activeStudioId: "studio-1",
  },
  locations: { locations: [{ _id: "studio-1", name: "Studio one" }] },
  getBookings: vi.fn(),
  deleteBooking: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.currentUser,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeStudioId,
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", async () => {
  const { useState, useCallback } = await import("react");
  return {
    useDeleteBookingMutation: () => [mocks.deleteBooking, { isLoading: false }],
    useGetBookingsWithFiltersMutation: () => {
      const [data, setData] = useState();
      const query = useCallback(
        (request) => ({
          unwrap: async () => {
            const result = await mocks.getBookings(request);
            setData(result);
            return result;
          },
        }),
        [],
      );
      return [query, { data, isLoading: false }];
    },
  };
});
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
  useGetLocationsQuery: () => ({ data: mocks.locations, isLoading: false }),
}));
vi.mock("@/components/loaders/Loader", () => ({
  default: () => <div>Loading</div>,
}));
vi.mock("@/components/modals/AlertModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/ResponsiveModal", () => ({ default: () => null }));
vi.mock("@/components/forms/bookings/EditBookingForm", () => ({
  default: () => null,
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/tables/bookings/BookingsOverview", () => ({
  default: ({ summary }) => (
    <output aria-label="Booking count">{summary.total}</output>
  ),
}));
vi.mock("@/components/tables/bookings/BookingsDataTable", () => ({
  default: ({ bookings, selectedIds, onToggleRow, onToggleSort }) => (
    <>
      <button type="button" onClick={onToggleSort}>
        Toggle date sort
      </button>
      <ul>
        {bookings.map((booking) => (
          <li key={booking._id}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.has(booking._id)}
                onChange={() => onToggleRow(booking._id)}
              />
              {booking._id}
            </label>
          </li>
        ))}
      </ul>
    </>
  ),
}));

import BookingsTable from "@/components/tables/BookingsTable";

const NOW = "2026-10-31T08:05:00.000Z"; // 09:05 in Prague.
const checkbox = () =>
  screen.getByRole("checkbox", { name: "filters.futureOnly" });
const lastRequest = () => mocks.getBookings.mock.calls.at(-1)?.[0];
const booking = (_id, start, end, locationId = "studio-1") => ({
  _id,
  start,
  end,
  locationId,
});
const fixtures = [
  booking(
    "historical-last-year",
    "2025-06-01T12:00:00.000Z",
    "2025-06-01T13:00:00.000Z",
  ),
  booking(
    "historical-yesterday",
    "2026-10-30T12:00:00.000Z",
    "2026-10-30T13:00:00.000Z",
  ),
  booking(
    "finished-earlier-today",
    "2026-10-31T06:00:00.000Z",
    "2026-10-31T07:00:00.000Z",
  ),
  booking("ending-exactly-now", "2026-10-31T07:00:00.000Z", NOW),
  booking(
    "ongoing-nine-to-twelve",
    "2026-10-31T08:00:00.000Z",
    "2026-10-31T11:00:00.000Z",
  ),
  booking("starting-exactly-now", NOW, "2026-10-31T09:05:00.000Z"),
  booking(
    "ending-one-millisecond-later",
    "2026-10-31T08:00:00.000Z",
    "2026-10-31T08:05:00.001Z",
  ),
  booking(
    "later-fifteen-to-seventeen",
    "2026-10-31T14:00:00.000Z",
    "2026-10-31T16:00:00.000Z",
  ),
  booking(
    "other-studio-ongoing",
    "2026-10-31T08:00:00.000Z",
    "2026-10-31T11:00:00.000Z",
    "studio-2",
  ),
  ...Array.from({ length: 12 }, (_, index) => ({
    _id: `future-${index + 1}`,
    start: new Date(Date.UTC(2026, 10, index + 1, 12)).toISOString(),
    end: new Date(Date.UTC(2026, 10, index + 1, 13)).toISOString(),
    locationId: "studio-1",
  })),
];

describe("BookingsTable future-only filter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    mocks.getBookings.mockReset();
    mocks.getBookings.mockImplementation(
      async ({
        dateFrom,
        dateTo,
        endAfter,
        locationId,
        page,
        limit,
        sortOrder,
      }) => {
        // The server filters before counting and paginating. Exercise that contract
        // with mixed historical/future fixtures and more than one result page.
        const filtered = fixtures
          .filter(
            (booking) =>
              (!dateFrom || new Date(booking.start) >= new Date(dateFrom)) &&
              (!dateTo || booking.start.slice(0, 10) <= dateTo) &&
              (!endAfter || new Date(booking.end) > new Date(endAfter)) &&
              (!locationId || booking.locationId === locationId),
          )
          .sort((a, b) =>
            sortOrder === "asc"
              ? a.start.localeCompare(b.start)
              : b.start.localeCompare(a.start),
          );
        return {
          bookings: filtered.slice((page - 1) * limit, page * limit),
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
          summary: {
            totalBookings: filtered.length,
            todayBookings: filtered.filter((item) =>
              item.start.startsWith("2026-10-31"),
            ).length,
          },
        };
      },
    );
  });
  afterEach(() => vi.useRealTimers());

  it("keeps ongoing bookings across pagination and toggles finished history with correct totals", async () => {
    render(<BookingsTable />);
    expect(
      await screen.findByRole("checkbox", { name: "filters.futureOnly" }),
    ).toBeChecked();
    expect(lastRequest()).toMatchObject({
      endAfter: NOW,
      page: 1,
      locationId: "studio-1",
    });
    expect(lastRequest().dateFrom).toBeUndefined();
    expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^16$/);
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(await screen.findByText("ongoing-nine-to-twelve")).toBeVisible();
    expect(screen.getByText("starting-exactly-now")).toBeVisible();
    expect(screen.getByText("ending-one-millisecond-later")).toBeVisible();
    expect(screen.queryByText("ending-exactly-now")).toBeNull();
    expect(screen.queryByText("finished-earlier-today")).toBeNull();
    expect(screen.queryByText("other-studio-ongoing")).toBeNull();

    fireEvent.click(checkbox());
    await waitFor(() =>
      expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^20$/),
    );
    expect(lastRequest().dateFrom).toBeUndefined();
    expect(lastRequest().endAfter).toBeUndefined();
    expect(lastRequest().page).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(await screen.findByText("finished-earlier-today")).toBeVisible();
    expect(screen.getByText("ending-exactly-now")).toBeVisible();
    expect(screen.getByText("historical-last-year")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "2", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "historical-last-year" }),
    );
    expect(
      screen.getByRole("button", { name: "selection.clear" }),
    ).toBeVisible();

    fireEvent.click(checkbox());
    await waitFor(() =>
      expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^16$/),
    );
    expect(lastRequest()).toMatchObject({ endAfter: NOW, page: 1 });
    expect(
      screen.getByRole("button", { name: "1", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("finished-earlier-today")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "selection.clear" }),
    ).toBeNull();
  });

  it("keeps the ongoing booking in Today and restores all dates when the filters are broadened", async () => {
    render(<BookingsTable />);
    await screen.findByRole("checkbox", { name: "filters.futureOnly" });
    fireEvent.click(screen.getByRole("button", { name: /^views\.today/ }));
    expect(await screen.findByText("ongoing-nine-to-twelve")).toBeVisible();
    expect(screen.getByText("later-fifteen-to-seventeen")).toBeVisible();
    expect(screen.getByText("starting-exactly-now")).toBeVisible();
    expect(screen.getByText("ending-one-millisecond-later")).toBeVisible();
    expect(screen.queryByText("ending-exactly-now")).toBeNull();
    expect(screen.queryByText("future-1")).toBeNull();
    expect(screen.queryByText("other-studio-ongoing")).toBeNull();
    expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^4$/);
    expect(lastRequest()).toMatchObject({
      dateFrom: "2026-10-31",
      dateTo: "2026-10-31",
      endAfter: NOW,
      locationId: "studio-1",
      page: 1,
    });

    fireEvent.click(checkbox());
    expect(await screen.findByText("finished-earlier-today")).toBeVisible();
    expect(screen.getByText("ending-exactly-now")).toBeVisible();
    expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^6$/);
    expect(lastRequest()).toMatchObject({
      dateFrom: "2026-10-31",
      dateTo: "2026-10-31",
      locationId: "studio-1",
    });
    expect(lastRequest().endAfter).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: /^views\.all/ }));
    await waitFor(() =>
      expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^20$/),
    );
    expect(lastRequest().dateFrom).toBeUndefined();
    expect(lastRequest().dateTo).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(await screen.findByText("historical-yesterday")).toBeVisible();
    expect(screen.getByText("future-1")).toBeVisible();
    expect(screen.queryByText("other-studio-ongoing")).toBeNull();

    fireEvent.click(checkbox());
    await waitFor(() =>
      expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^16$/),
    );
    expect(lastRequest()).toMatchObject({
      endAfter: NOW,
      page: 1,
      locationId: "studio-1",
    });
    expect(lastRequest().dateTo).toBeUndefined();
  });

  it("removes the ongoing booking on the next request at its exact end time", async () => {
    render(<BookingsTable />);
    await screen.findByRole("checkbox", { name: "filters.futureOnly" });
    fireEvent.click(screen.getByRole("button", { name: /^views\.today/ }));
    expect(await screen.findByText("ongoing-nine-to-twelve")).toBeVisible();

    vi.setSystemTime(new Date("2026-10-31T11:00:00.000Z"));
    fireEvent.click(screen.getByRole("button", { name: /^views\.today/ }));
    await waitFor(() =>
      expect(screen.queryByText("ongoing-nine-to-twelve")).toBeNull(),
    );
    expect(screen.getByText("later-fifteen-to-seventeen")).toBeVisible();
    expect(screen.getByLabelText("Booking count")).toHaveTextContent(/^1$/);
    expect(lastRequest()).toMatchObject({
      endAfter: "2026-10-31T11:00:00.000Z",
      dateFrom: "2026-10-31",
      dateTo: "2026-10-31",
    });
  });

  it("preserves applied filters, sort and unapplied drafts when toggled, and resets to future-only on clear", async () => {
    render(<BookingsTable />);
    await screen.findByRole("checkbox", { name: "filters.futureOnly" });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "applied search" },
    });
    fireEvent.click(screen.getByRole("button", { name: "filters.apply" }));
    await waitFor(() => expect(lastRequest().search).toBe("applied search"));
    fireEvent.click(screen.getByRole("button", { name: "Toggle date sort" }));
    await waitFor(() => expect(lastRequest().sortOrder).toBe("asc"));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "unapplied draft" },
    });

    fireEvent.click(checkbox());
    await waitFor(() => expect(lastRequest().endAfter).toBeUndefined());
    expect(lastRequest()).toMatchObject({
      search: "applied search",
      sortOrder: "asc",
      locationId: "studio-1",
      page: 1,
    });
    expect(screen.getByRole("searchbox")).toHaveValue("unapplied draft");
    expect(checkbox()).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    fireEvent.click(screen.getByRole("button", { name: "filters.clear" }));
    await waitFor(() => expect(checkbox()).toBeChecked());
    expect(lastRequest()).toMatchObject({
      search: "",
      endAfter: NOW,
      page: 1,
      locationId: "studio-1",
    });
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
