import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  requests: [],
  respond: null,
  products: vi.fn(),
  lecturers: vi.fn(),
  options: {},
  push: vi.fn(),
  blobs: [],
  stores: [],
}));
vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "directoryApi",
      tagTypes: ["Booking", "User", "Product"],
      endpoints: () => ({}),
      baseQuery: async (request) => {
        if (request.url === "/bookings/filter-options") {
          mocks.optionRequests.push(request);
          return mocks.optionsResult || { data: mocks.optionsData };
        }
        mocks.requests.push(request);
        return mocks.respond(request);
      },
    }),
  };
});
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const value = key
        .split(".")
        .reduce((source, part) => source?.[part], messages.Bookings);
      return (value || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? name,
      );
    },
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.fixture.user,
  getAuthCacheIdentity: (state) => state.fixture.scope,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.fixture.location,
}));
vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useGetUsersQuery: () => {
    throw new Error(
      "Booking directory must never download the full customer list",
    );
  },
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetProductsQuery: (args, options) => {
    mocks.products(args, options);
    return mocks.options;
  },
}));
vi.mock("@/lib/features/lecturers/lecturersApiSlice", () => ({
  useGetAllLecturersQuery: (args, options) => {
    mocks.lecturers(args, options);
    return mocks.options;
  },
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => {
  const currentData = {
    locations: [
      { _id: "studio-a", name: "Studio A" },
      { _id: "studio-b", name: "Studio B" },
    ],
  };
  return {
    useGetLocationsQuery: () => mocks.locationOverride || { currentData },
  };
});
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useDeleteBookingMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/modals/AlertModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
import { apiSlice } from "@/lib/features/api/apiSlice";
import BookingsTable from "@/components/tables/BookingsTable";

const booking = (index, location = "studio-a") => ({
  _id: `${location}-booking-${index}`,
  createdBy: {
    _id: `customer-${index}`,
    firstname: `Customer${index}`,
    lastname: location,
    email: `${index}@example.test`,
  },
  bookingProduct: {
    _id: "product-1",
    name: "Historical pottery",
    kind: "OPEN_STUDIO",
    price: 9999,
  },
  location: { _id: location, name: location },
  start: "2030-01-01T12:00:00.000Z",
  end: "2030-01-01T13:00:00.000Z",
  paymentStatus: "CONFIRMED",
  status: "active",
  totalPrice: 125,
  currency: "EUR",
});
const page = (request, count = 11) => ({
  data: {
    bookings: Array.from({ length: count }, (_, index) =>
      booking(index, request.body.locationId),
    ).slice(
      (request.body.page - 1) * request.body.limit,
      request.body.page * request.body.limit,
    ),
    currentPage: request.body.page,
    totalCount: count,
    totalPages: Math.ceil(count / request.body.limit),
    summary: {
      totalBookings: count,
      todayBookings: 7,
      awaitingPaymentBookings: 3,
      cancelledBookings: 2,
    },
  },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const open = () => {
  const fixture = {
    user: { _id: "owner-1", isOwner: true },
    scope: "tenant-a:owner",
    location: "studio-a",
  };
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      fixture: (state = fixture, action) =>
        action.type === "switch" ? { ...state, ...action.payload } : state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
  mocks.stores.push(store);
  return {
    ...render(
      <Provider store={store}>
        <BookingsTable />
      </Provider>,
    ),
    store,
  };
};
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
const previous = () =>
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
const loaded = () => screen.findAllByText("Customer0 studio-a");

beforeEach(() => {
  mocks.requests = [];
  mocks.blobs = [];
  mocks.stores = [];
  mocks.options = {};
  mocks.optionRequests = [];
  mocks.optionsResult = null;
  mocks.optionsData = { products: [], lecturers: [] };
  mocks.locationOverride = null;
  mocks.respond = async (request) => page(request);
  vi.clearAllMocks();
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    mocks.blobs.push(blob);
    return "blob:bookings";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  for (const store of mocks.stores)
    store.dispatch(apiSlice.util.resetApiState());
  vi.restoreAllMocks();
});

describe("booking directory page loading and cache", () => {
  it("loads only a bounded booking page, shares the loader, and reuses cached pages with one captured cutoff", async () => {
    const first = deferred();
    const second = deferred();
    mocks.respond = (request) =>
      request.body.page === 1 ? first.promise : second.promise;
    open();
    expect(screen.getByTestId("table-loading-state")).toHaveAttribute(
      "data-mode",
      "initial",
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    await waitFor(() => expect(mocks.requests).toHaveLength(1));
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.lecturers).not.toHaveBeenCalled();
    expect(mocks.optionRequests).toHaveLength(0);
    expect(mocks.requests[0].body).toMatchObject({
      page: 1,
      limit: 10,
      locationId: "studio-a",
    });
    expect(mocks.requests[0].body).not.toHaveProperty("cacheScope");
    await act(async () => first.resolve(page(mocks.requests[0])));
    await loaded();
    next();
    expect(screen.queryByText("Customer0 studio-a")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-loading-state")).toHaveAttribute(
      "data-mode",
      "initial",
    );
    expect(screen.getByRole("searchbox")).toBeEnabled();
    await waitFor(() => expect(mocks.requests).toHaveLength(2));
    expect(mocks.requests[1].body.endAfter).toBe(
      mocks.requests[0].body.endAfter,
    );
    await act(async () => second.resolve(page(mocks.requests[1])));
    expect(await screen.findAllByText("Customer10 studio-a")).toHaveLength(2);
    previous();
    expect(screen.getAllByText("Customer0 studio-a")).toHaveLength(2);
    expect(screen.queryByTestId("table-loading-state")).not.toBeInTheDocument();
    expect(mocks.requests).toHaveLength(2);
  });

  it("keeps rows usable during same-query refresh/error, but hides cached rows on denied access", async () => {
    const { store, container } = open();
    await loaded();
    const refresh = deferred();
    mocks.respond = () => refresh.promise;
    act(() =>
      store.dispatch(
        apiSlice.util.invalidateTags([{ type: "Booking", id: "LIST" }]),
      ),
    );
    expect(await screen.findByTestId("table-loading-state")).toHaveAttribute(
      "data-mode",
      "refreshing",
    );
    expect(screen.getAllByText("Customer0 studio-a")).toHaveLength(2);
    expect(container.querySelector(".absolute.inset-0")).toBeNull();
    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Select booking for Customer0 studio-a",
      })[0],
    );
    expect(
      screen.getByRole("button", { name: "Export selected" }),
    ).toBeEnabled();
    await act(async () => refresh.resolve({ error: { status: 503 } }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load bookings",
    );
    expect(screen.getAllByText("Customer0 studio-a")).toHaveLength(2);
    mocks.respond = async () => ({ error: { status: 403 } });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.queryByText("Customer0 studio-a")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("never publishes a late page/location response into a new authenticated context and resets controls", async () => {
    const { store } = open();
    await loaded();
    fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
      target: { value: "50" },
    });
    await waitFor(() => expect(mocks.requests.at(-1).body.limit).toBe(50));
    const late = deferred();
    mocks.respond = (request) =>
      request.body.locationId === "studio-a"
        ? late.promise
        : Promise.resolve(page(request));
    fireEvent.click(await screen.findByRole("button", { name: "Date & time" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.sortOrder).toBe("asc"),
    );
    const oldRequest = mocks.requests.at(-1);
    act(() =>
      store.dispatch({
        type: "switch",
        payload: { location: "studio-b", scope: "tenant-b:owner" },
      }),
    );
    expect(await screen.findAllByText("Customer0 studio-b")).toHaveLength(2);
    expect(mocks.requests.at(-1).body).toMatchObject({
      limit: 10,
      page: 1,
      sortOrder: "desc",
      locationId: "studio-b",
    });
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveValue(
      "10",
    );
    await act(async () => late.resolve(page(oldRequest)));
    expect(screen.queryByText("Customer0 studio-a")).not.toBeInTheDocument();
    expect(screen.getAllByText("Customer0 studio-b")).toHaveLength(2);
  });

  it("does not show the previous page when a new page fails and can retry it", async () => {
    open();
    await loaded();
    mocks.respond = async () => ({ error: { status: 503 } });
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load bookings",
    );
    expect(screen.queryByText("Customer0 studio-a")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    mocks.respond = async (request) => page(request);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findAllByText("Customer10 studio-a")).toHaveLength(2);
  });

  it("requests the actual last page after invalidation shrinks the result", async () => {
    mocks.respond = async (request) => page(request, 51);
    const { store } = open();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "6", exact: true }));
    expect(await screen.findAllByText("Customer50 studio-a")).toHaveLength(2);
    mocks.respond = async (request) => page(request, 21);
    act(() =>
      store.dispatch(
        apiSlice.util.invalidateTags([{ type: "Booking", id: "LIST" }]),
      ),
    );
    expect(await screen.findAllByText("Customer20 studio-a")).toHaveLength(2);
    expect(mocks.requests.at(-1).body.page).toBe(3);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("hides cached all-location rows when location access is denied", async () => {
    const emptyLocations = { locations: [] };
    mocks.locationOverride = { currentData: emptyLocations };
    const { store, rerender } = open();
    expect(await screen.findAllByText("Customer0 studio-a")).toHaveLength(2);
    mocks.locationOverride = {
      currentData: emptyLocations,
      isError: true,
      error: { status: 403 },
      refetch: vi.fn(),
    };
    rerender(
      <Provider store={store}>
        <BookingsTable />
      </Provider>,
    );
    expect(screen.queryByText("Customer0 studio-a")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load bookings",
    );
  });

  it("loads every historical activity and exact lecturer name without catalog/staff permissions", async () => {
    mocks.optionsData = {
      products: Array.from({ length: 151 }, (_, index) => ({
        _id: `product-${index}`,
        name: `Historical activity ${index}`,
        kind: "OPEN_STUDIO",
      })),
      lecturers: [{ value: "Anna (Guest).*", label: "Anna (Guest).*" }],
    };
    open();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(
      await screen.findByRole("option", { name: "Historical activity 150" }),
    ).toHaveValue("product-150");
    expect(screen.getByRole("option", { name: "Anna (Guest).*" })).toHaveValue(
      "Anna (Guest).*",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Activity" }), {
      target: { value: "product-150" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Lecturer" }), {
      target: { value: "Anna (Guest).*" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Customer / custom ID" }),
      { target: { value: "#234" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body).toMatchObject({
        productId: "product-150",
        lecturerName: "Anna (Guest).*",
        authorId: "#234",
      }),
    );
    expect(mocks.requests.at(-1).body).not.toHaveProperty("lecturerId");
    expect(mocks.optionRequests).toHaveLength(1);
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.lecturers).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Location" }), {
      target: { value: "studio-b" },
    });
    await waitFor(() =>
      expect(mocks.optionRequests.at(-1).params).toEqual({
        locationId: "studio-b",
      }),
    );
    expect(screen.getByRole("combobox", { name: "Activity" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Lecturer" })).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.locationId).toBe("studio-b"),
    );
    expect(mocks.requests.at(-1).body).not.toHaveProperty("productId");
    expect(mocks.requests.at(-1).body).not.toHaveProperty("lecturerName");
  });

  it("removes cached product and lecturer names after an options access denial", async () => {
    mocks.optionsData = {
      products: [
        {
          _id: "private-product",
          name: "Private activity",
          kind: "OPEN_STUDIO",
        },
      ],
      lecturers: [{ value: "Private teacher", label: "Private teacher" }],
    };
    const { store } = open();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(
      await screen.findByRole("option", { name: "Private activity" }),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: "Private teacher" }),
    ).toBeVisible();
    mocks.optionsResult = { error: { status: 403 } };
    act(() =>
      store.dispatch(
        apiSlice.util.invalidateTags([{ type: "Product", id: "LIST" }]),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Private activity" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("option", { name: "Private teacher" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Some filter options");
  });

  it("applies advanced status/payment/date choices instead of silently keeping a conflicting quick view", async () => {
    open();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /^Cancelled/ }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.status).toBe("cancelled"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Booking status" }), {
      target: { value: "completed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.status).toBe("completed"),
    );
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /^Awaiting payment/ }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.paymentStatus).toBe("PENDING_PAYMENT"),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Payment status" }), {
      target: { value: "CONFIRMED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body).toMatchObject({
        paymentStatus: "CONFIRMED",
        status: "completed",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Today/ }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body.dateScope).toBe("today"),
    );
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2024-01-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(mocks.requests.at(-1).body).toMatchObject({
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
        status: "completed",
        paymentStatus: "CONFIRMED",
      }),
    );
    expect(mocks.requests.at(-1).body).not.toHaveProperty("dateScope");
  });

  it("loads advanced options independently and preserves embedded row/export data if options fail", async () => {
    mocks.optionsResult = { error: { status: 503 } };
    open();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some filter options",
    );
    expect(mocks.optionRequests).toEqual([
      { url: "/bookings/filter-options", params: { locationId: "studio-a" } },
    ]);
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.lecturers).not.toHaveBeenCalled();
    expect(screen.getAllByText("Historical pottery")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(mocks.blobs).toHaveLength(1);
    const csv = await mocks.blobs[0].text();
    expect(csv.split("\n")).toHaveLength(11);
    expect(csv).toContain("Customer0 studio-a");
    expect(csv).toContain("0@example.test");
    expect(csv).toContain("Historical pottery");
    expect(csv).toContain("€125");
    expect(csv).not.toContain("9999");
    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Select booking for Customer0 studio-a",
      })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Export selected" }));
    expect((await mocks.blobs[1].text()).split("\n")).toHaveLength(2);
  });
});
