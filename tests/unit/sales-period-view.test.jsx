import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  hookIndex: 0,
  loadOrders: vi.fn(),
  loadSummary: vi.fn(),
  loadExport: vi.fn(),
  pageResponse: vi.fn(),
  summaryResponse: vi.fn(),
  downloadCsv: vi.fn(),
  push: vi.fn(),
  tenant: { settings: { currency: "CZK" } },
  user: { tenantName: "Test studio" },
  access: { role: "owner", status: "active" },
  locationId: "64b000000000000000000011",
  locations: [
    { _id: "64b000000000000000000011", name: "Test studio", isActive: true },
  ],
}));

vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentUser: () => mocks.user,
  selectCurrentWorkspaceAccess: () => mocks.access,
  selectIsAuthenticated: () => true,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => mocks.locationId,
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: mocks.locations, isLoading: false }),
}));
vi.mock("@/lib/features/orders/ordersApiSlice", () => ({
  useGetOrdersWithFiltersMutation: () => {
    const trigger = [mocks.loadOrders, mocks.loadSummary, mocks.loadExport][
      mocks.hookIndex++ % 3
    ];
    return [trigger, { isLoading: false }];
  },
}));
vi.mock("@/lib/features/invoices/invoicesApiSlice", () => ({
  useCreateInvoiceFromOrderMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/components/dashboard/WorkspaceSectionHeader", () => ({
  default: ({ title, actions }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));
vi.mock("@/components/sales/OrderDetailsDialog", () => ({
  default: () => null,
}));
vi.mock("@/components/sales/OrdersCatalog", () => ({
  default: ({ orders }) => (
    <section aria-label="Order results">
      {orders.length ? (
        orders.map((order) => <p key={order.id}>{order.label}</p>)
      ) : (
        <p>No matching orders</p>
      )}
    </section>
  ),
}));
vi.mock("@/components/sales/sales.utils", async (importOriginal) => ({
  ...(await importOriginal()),
  downloadOrdersCsv: (...args) => mocks.downloadCsv(...args),
}));

import SalesView from "@/components/sales/SalesView";

const copy = messages.Sales;
const localBounds = (fromMonth, fromDay, toMonth = 9, toDay = 19) => ({
  dateFrom: new Date(2026, fromMonth, fromDay, 0, 0, 0, 0).toISOString(),
  dateTo: new Date(2026, toMonth, toDay, 23, 59, 59, 999).toISOString(),
});
const last30 = localBounds(8, 20);
const last7 = localBounds(9, 13);
const last90 = localBounds(6, 22);
const pageResult = (orders = []) => ({
  orders,
  totalCount: orders.length,
  totalPages: 1,
});
const summaryResult = (query, amount = 1875) => {
  if (query.status) return pageResult([]);
  return pageResult([
    { id: "paid-order", isPaid: true, currency: "CZK", total: amount },
  ]);
};
const money = (amount) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "CZK" })
    .format(amount)
    .replace(/\s/g, " ");
const revenueCard = () =>
  within(screen.getByRole("region", { name: copy.overview.label }))
    .getByText(copy.overview.revenue)
    .closest("article");
const choosePeriod = (value) =>
  fireEvent.change(
    screen.getByRole("combobox", { name: copy.period.presetLabel }),
    { target: { value } },
  );
const mount = () =>
  render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Europe/Prague"
    >
      <SalesView />
    </NextIntlClientProvider>,
  );
const waitForRevenue = async (amount) =>
  waitFor(() => expect(revenueCard()).toHaveTextContent(money(amount)));
const expectQueriesFor = (trigger, bounds) => {
  expect(trigger).toHaveBeenCalled();
  for (const [query] of trigger.mock.calls) {
    expect(query).toMatchObject({ ...bounds, locationId: mocks.locationId });
  }
};
const clearQueryCalls = () => {
  mocks.loadOrders.mockClear();
  mocks.loadSummary.mockClear();
  mocks.loadExport.mockClear();
};

describe("Sales reporting period integration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 19, 12));
    mocks.hookIndex = 0;
    mocks.downloadCsv.mockReset();
    mocks.pageResponse
      .mockReset()
      .mockImplementation(() =>
        pageResult([{ id: "visible-order", label: "Current order" }]),
      );
    mocks.summaryResponse
      .mockReset()
      .mockImplementation((query) => summaryResult(query));
    mocks.loadOrders.mockReset().mockImplementation((query) => ({
      unwrap: () => Promise.resolve().then(() => mocks.pageResponse(query)),
    }));
    mocks.loadSummary.mockReset().mockImplementation((query) => ({
      unwrap: () => Promise.resolve().then(() => mocks.summaryResponse(query)),
    }));
    mocks.loadExport.mockReset().mockImplementation(() => ({
      unwrap: async () => pageResult([{ id: "exported-order", total: 25 }]),
    }));
  });

  afterEach(() => vi.useRealTimers());

  it("starts with thirty calendar dates and changes every summary and table request to the chosen seven-day period", async () => {
    mount();
    await waitForRevenue(1875);
    expectQueriesFor(mocks.loadOrders, last30);
    expectQueriesFor(mocks.loadSummary, last30);
    expect(
      screen.getByRole("combobox", { name: copy.period.presetLabel }),
    ).toHaveValue("30");
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    expect(
      screen.getByText(
        `Showing ${formatter.formatRange(new Date(2026, 8, 20), new Date(2026, 9, 19))}`.replace(
          /\s/g,
          " ",
        ),
      ),
    ).toBeInTheDocument();

    clearQueryCalls();
    mocks.summaryResponse.mockImplementation((query) =>
      summaryResult(query, 700),
    );
    choosePeriod("7");
    await waitForRevenue(700);

    expectQueriesFor(mocks.loadOrders, last7);
    expectQueriesFor(mocks.loadSummary, last7);
    expect(
      screen.getByText(
        `Showing ${formatter.formatRange(new Date(2026, 9, 13), new Date(2026, 9, 19))}`.replace(
          /\s/g,
          " ",
        ),
      ),
    ).toBeInTheDocument();
  });

  it("fetches custom dates only after Apply and uses the same range for cards, orders and export", async () => {
    mount();
    await waitForRevenue(1875);
    clearQueryCalls();
    choosePeriod("custom");
    fireEvent.change(screen.getByLabelText(copy.filters.dateFrom), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText(copy.filters.dateTo), {
      target: { value: "2026-10-15" },
    });
    await act(async () => {});
    expect(mocks.loadSummary).not.toHaveBeenCalled();
    expect(mocks.loadOrders).not.toHaveBeenCalled();
    expect(revenueCard()).toHaveTextContent(money(1875));

    mocks.summaryResponse.mockImplementation((query) =>
      summaryResult(query, 1500),
    );
    fireEvent.click(screen.getByRole("button", { name: copy.period.apply }));
    await waitForRevenue(1500);
    const customBounds = localBounds(9, 1, 9, 15);
    expectQueriesFor(mocks.loadSummary, customBounds);
    expectQueriesFor(mocks.loadOrders, customBounds);
    fireEvent.click(screen.getByRole("button", { name: copy.export }));
    await waitFor(() => expect(mocks.downloadCsv).toHaveBeenCalledTimes(1));
    expectQueriesFor(mocks.loadExport, customBounds);

    clearQueryCalls();
    mocks.summaryResponse.mockImplementation((query) =>
      summaryResult(query, 3000),
    );
    choosePeriod("all");
    await waitForRevenue(3000);
    const unbounded = { dateFrom: undefined, dateTo: undefined };
    expectQueriesFor(mocks.loadSummary, unbounded);
    expectQueriesFor(mocks.loadOrders, unbounded);
    expect(
      screen.getByText(`Showing ${copy.period.allTime}`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.export }));
    await waitFor(() => expect(mocks.loadExport).toHaveBeenCalled());
    expectQueriesFor(mocks.loadExport, unbounded);
  });

  it("hides the previous period's revenue during a failed refresh and restores it only after a successful retry", async () => {
    mount();
    await waitForRevenue(1875);
    let rejectSummary;
    const pending = new Promise((_resolve, reject) => {
      rejectSummary = reject;
    });
    mocks.summaryResponse.mockImplementation(() => pending);

    choosePeriod("7");
    await screen.findByText(copy.overview.updating);
    expect(revenueCard()).not.toHaveTextContent(money(1875));
    expect(revenueCard()).toHaveTextContent("—");
    await act(async () => {
      rejectSummary(new Error("Summary unavailable"));
    });
    expect(await screen.findByText(copy.overview.error)).toBeInTheDocument();
    expect(revenueCard()).not.toHaveTextContent(money(1875));
    expect(screen.getByText("Current order")).toBeInTheDocument();

    clearQueryCalls();
    mocks.summaryResponse.mockImplementation((query) =>
      summaryResult(query, 750),
    );
    fireEvent.click(screen.getByRole("button", { name: copy.overview.retry }));
    await waitForRevenue(750);
    expectQueriesFor(mocks.loadSummary, last7);
    expect(screen.queryByText(copy.overview.error)).not.toBeInTheDocument();
  });

  it("ignores a late summary response for a period that is no longer selected", async () => {
    mount();
    await waitForRevenue(1875);
    let resolveOldSummary;
    const oldSummary = new Promise((resolve) => {
      resolveOldSummary = resolve;
    });
    mocks.summaryResponse.mockImplementation((query) =>
      query.dateFrom === last7.dateFrom
        ? oldSummary
        : summaryResult(query, 9000),
    );
    choosePeriod("7");
    await screen.findByText(copy.overview.updating);
    choosePeriod("90");
    await waitForRevenue(9000);

    await act(async () => {
      resolveOldSummary(summaryResult({}, 7));
    });
    expect(revenueCard()).toHaveTextContent(money(9000));
    expect(revenueCard()).not.toHaveTextContent(money(7));
    expect(mocks.loadOrders).toHaveBeenLastCalledWith(
      expect.objectContaining(last90),
    );
  });

  it.each([false, true])(
    "keeps the period editable through a table failure (initially empty: %s)",
    async (empty) => {
      mocks.pageResponse.mockImplementation(() =>
        pageResult(
          empty ? [] : [{ id: "old-order", label: "Old period order" }],
        ),
      );
      mount();
      await waitForRevenue(1875);
      expect(
        screen.getByRole("combobox", { name: copy.period.presetLabel }),
      ).toBeEnabled();
      if (empty)
        expect(screen.getByText("No matching orders")).toBeInTheDocument();

      mocks.pageResponse.mockRejectedValue({
        data: { message: "Orders unavailable" },
      });
      choosePeriod("7");
      expect(await screen.findByText("Orders unavailable")).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: copy.period.presetLabel }),
      ).toBeEnabled();
      expect(screen.queryByText("Old period order")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: copy.export })).toBeDisabled();

      mocks.pageResponse.mockImplementation(() =>
        pageResult([{ id: "new-order", label: "Recovered order" }]),
      );
      choosePeriod("90");
      expect(await screen.findByText("Recovered order")).toBeInTheDocument();
      expect(mocks.loadOrders).toHaveBeenLastCalledWith(
        expect.objectContaining(last90),
      );
      expect(screen.getByRole("button", { name: copy.export })).toBeEnabled();
    },
  );
});
