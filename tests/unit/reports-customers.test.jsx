import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  calls: [],
  response: null,
  search: "section=statistics&reportTab=customers",
  replace: vi.fn(),
  export: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
const translate =
  (namespace) =>
  (key, values = {}) =>
    String(
      key
        .split(".")
        .reduce((value, part) => value?.[part], messages[namespace]) ?? key,
    ).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
vi.mock("next-intl", () => ({
  useTranslations: (namespace) => translate(namespace),
}));
vi.mock("@/lib/features/reports/reportsApiSlice", () => ({
  useGetReportCustomersQuery: (args, options) => {
    mocks.calls.push({ args, options });
    return { refetch: vi.fn(), ...mocks.response(args) };
  },
  useExportReportCustomersCsvMutation: () => [
    mocks.export,
    { isLoading: false },
  ],
}));
import ReportCustomers, {
  cancellationCountLabel,
} from "@/components/views/statistics/ReportCustomers";
import useReportSearchParams from "@/components/views/statistics/useReportSearchParams";

function CustomerReport(props) {
  const navigation = useReportSearchParams();
  return <ReportCustomers {...props} {...navigation} />;
}
const filters = {
  cacheScope: "tenantA:owner",
  from: "2026-01-01",
  to: "2026-12-31",
  locationId: "studioA",
  locale: "en",
};
const payload = (page = 1) => ({
  data: [
    {
      id: `row${page}`,
      name: `Customer ${page}`,
      email: `customer${page}@example.test`,
      paidSpendMinor: 12345,
      currentCreditMinor: 5000,
      cancelledBookings: 2,
      lastActivityAt: "2026-01-01",
    },
  ],
  totalCount: 21,
  totalPages: 3,
  currentPage: page,
  pageSize: 10,
  metadata: { currency: "CZK", cancellationCoverage: { complete: false } },
  suggested: { inactive90DaysWithCredits: 3 },
});
const view = (reportFilters = filters) => (
  <CustomerReport
    reportFilters={reportFilters}
    currency="CZK"
    locale="en"
    canExport
    enabled
    t={translate("Reports")}
  />
);
const input = (key, value) =>
  fireEvent.change(screen.getByTestId(`report-customer-${key}`), {
    target: { value },
  });
const apply = () =>
  fireEvent.submit(screen.getByTestId("reports-customer-filters"));
const last = () => mocks.calls.at(-1).args;
beforeEach(() => {
  mocks.calls = [];
  mocks.replace.mockClear();
  mocks.search = "section=statistics&reportTab=customers";
  mocks.response = (args) => ({
    currentData: payload(args.page),
    isFetching: false,
    isError: false,
  });
  mocks.export.mockReset().mockImplementation(() => ({
    unwrap: () =>
      Promise.resolve({
        csv: "name,amount\nCustomer,123",
        contentType: "text/csv",
        filename: "customers.csv",
      }),
    abort: vi.fn(),
  }));
  URL.createObjectURL = vi.fn(() => "blob:customers");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
describe("Reports customer segments", () => {
  it("combines major-unit spend, credit, cancellation dates/actor and inactivity before pagination", () => {
    render(view());
    for (const [key, value] of Object.entries({
      spendMin: "3000",
      spendMax: "6000",
      spendFrom: "2026-02-01",
      spendTo: "2026-02-28",
      creditMin: "100",
      creditMax: "200",
      cancelledMin: "2",
      cancelledMax: "4",
      cancellationFrom: "2026-03-01",
      cancellationTo: "2026-03-31",
      inactiveDays: "90",
    }))
      input(key, value);
    fireEvent.change(screen.getByLabelText("Cancelled by"), {
      target: { value: "customer" },
    });
    expect(last().spendMin).toBe("");
    apply();
    expect(last()).toMatchObject({
      spendMin: "3000",
      spendMax: "6000",
      creditMin: "100",
      creditMax: "200",
      cancelledMin: "2",
      cancelledMax: "4",
      spendFrom: "2026-02-01",
      spendTo: "2026-02-28",
      cancellationFrom: "2026-03-01",
      cancellationTo: "2026-03-31",
      cancellationActor: "customer",
      inactiveDays: "90",
      page: 1,
      locationId: "studioA",
    });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(last().page).toBe(2);
    expect(last().spendMin).toBe("3000");
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("customerSpendMin=3000"),
      { scroll: false },
    );
  });
  it("blocks reversed bounds and preserves the previously applied query", () => {
    render(view());
    input("spendMin", "6000");
    input("spendMax", "3000");
    apply();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter valid numbers");
    expect(last().spendMin).toBe("");
    input("spendMax", "9000");
    input("cancellationFrom", "2027-01-01");
    apply();
    expect(last().spendMin).toBe("");
  });
  it("exports the complete applied filter and ignores unapplied draft edits", async () => {
    render(view());
    input("creditMin", "100");
    apply();
    input("creditMin", "900");
    fireEvent.click(
      screen.getByRole("button", { name: "Export all matching customers" }),
    );
    await act(async () => {});
    expect(mocks.export).toHaveBeenCalledWith(
      expect.objectContaining({
        creditMin: "100",
        from: filters.from,
        to: filters.to,
      }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
  it("distinguishes unknown money, exact zero and known cancellation lower bounds", () => {
    mocks.response = () => ({
      currentData: {
        ...payload(),
        data: [
          {
            id: "unknown",
            name: "Unknown customer",
            paidSpendMinor: null,
            currentCreditMinor: null,
            cancelledBookings: null,
            recordedCancelledBookings: 2,
          },
          {
            id: "zero",
            name: "Zero customer",
            paidSpendMinor: 0,
            currentCreditMinor: 0,
            cancelledBookings: 0,
          },
        ],
      },
    });
    render(view());
    const row = screen.getByText("Unknown customer").closest("tr");
    expect(within(row).getAllByText("Unavailable")).toHaveLength(2);
    expect(within(row).getByText("2+")).toBeVisible();
    expect(
      cancellationCountLabel(
        { cancelledBookings: null, recordedCancelledBookings: 0 },
        "en",
        "unknown",
      ),
    ).toBe("unknown");
    expect(
      within(screen.getByText("Zero customer").closest("tr")).getByText("0"),
    ).toBeVisible();
    expect(
      screen
        .getAllByRole("note")
        .some((note) => note.textContent.includes("known minimum")),
    ).toBe(true);
  });
  it("does not show a stale previous page during loading or a permission failure", () => {
    const { rerender } = render(view());
    mocks.response = (args) =>
      args.page === 2
        ? { data: payload(1), currentData: undefined, isFetching: true }
        : { currentData: payload(1) };
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.queryByText("Customer 1")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-loading-state")).toHaveAttribute(
      "data-mode",
      "initial",
    );
    mocks.response = () => ({
      currentData: payload(2),
      isError: true,
      error: { status: 403, data: { message: "Denied" } },
    });
    rerender(view());
    expect(screen.queryByText("Customer 2")).not.toBeInTheDocument();
  });
  it("clamps a removed last page by fetching the real remaining page", () => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    mocks.response = () => ({
      currentData: { ...payload(1), totalPages: 1, totalCount: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(last().page).toBe(1);
  });
  it("restores filter URL navigation and applies inactive-credit quick action", () => {
    const { rerender } = render(view());
    mocks.search += "&customerSpendMin=2500&customerCancellationActor=staff";
    rerender(view());
    expect(last()).toMatchObject({
      spendMin: "2500",
      cancellationActor: "staff",
    });
    fireEvent.click(screen.getByRole("button", { name: "Show customers" }));
    expect(last()).toMatchObject({
      inactiveDays: "90",
      creditMin: "0.01",
      spendMin: "",
      page: 1,
    });
  });
  it("aborts and ignores an export after its authorization or location context changes", async () => {
    let resolve;
    const abort = vi.fn();
    mocks.export.mockImplementation(() => ({
      unwrap: () =>
        new Promise((done) => {
          resolve = done;
        }),
      abort,
    }));
    const { rerender } = render(view());
    fireEvent.click(
      screen.getByRole("button", { name: "Export all matching customers" }),
    );
    rerender(
      view({ ...filters, cacheScope: "tenantB:owner", locationId: "studioB" }),
    );
    expect(abort).toHaveBeenCalled();
    await act(async () =>
      resolve({ csv: "name,amount\nA,123", contentType: "text/csv" }),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("shows localized studio source limits and disables unavailable activity filters", () => {
    mocks.response = () => ({
      currentData: {
        ...payload(),
        metadata: {
          currency: "CZK",
          spendingScope: "location",
          activityAvailable: false,
          limitations: ["Internal English evidence"],
        },
      },
    });
    render(view());
    expect(screen.getByTestId("report-customer-inactiveDays")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Show customers" }),
    ).toBeDisabled();
    expect(
      screen.getByText(messages.Reports.analytics.locationScope),
    ).toBeVisible();
    expect(
      screen.queryByText("Internal English evidence"),
    ).not.toBeInTheDocument();
  });
  it("refreshes the mounted customer segment once when the report is manually refreshed", () => {
    const refetch = vi.fn();
    mocks.response = () => ({ currentData: payload(), refetch });
    const { rerender } = render(view());
    expect(refetch).not.toHaveBeenCalled();
    rerender(
      <CustomerReport
        reportFilters={filters}
        currency="CZK"
        locale="en"
        canExport
        enabled
        refreshVersion={1}
        t={translate("Reports")}
      />,
    );
    expect(refetch).toHaveBeenCalledOnce();
  });
});
