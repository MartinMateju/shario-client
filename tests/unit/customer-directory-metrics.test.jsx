import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: { user: { _id: "owner-1", isOwner: true }, scope: "tenant-a:owner-1" },
  users: [],
  directoryQuery: vi.fn(),
  summaryQuery: vi.fn(),
  exportDirectory: vi.fn(),
  directoryOverride: null,
  summaryOverride: null,
}));

const filterRows = (args) =>
  mocks.users.filter(
    (row) =>
      (!args.search ||
        `${row.firstname} ${row.lastname} ${row.email}`
          .toLowerCase()
          .includes(args.search.toLowerCase())) &&
      (!args.status || (row.customerStatus || "active") === args.status) &&
      (!args.membership || row.membership === args.membership),
  );
const responseFor = (args) => {
  const rows = filterRows(args);
  return {
    data: rows.slice((args.page - 1) * args.limit, args.page * args.limit),
    totalCount: rows.length,
    currentPage: args.page,
    pageSize: args.limit,
    totalPages: Math.max(1, Math.ceil(rows.length / args.limit)),
  };
};

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key, values) =>
    values?.name
      ? `${key}:${values.name}`
      : values?.count !== undefined
        ? `${key}:${values.count}`
        : key,
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.user,
  getAuthCacheIdentity: (state) => state.scope,
}));
vi.mock("@/lib/features/users/customerDirectoryApiSlice", () => ({
  useGetCustomerDirectoryQuery: (args, options) => {
    mocks.directoryQuery(args, options);
    if (options.skip) return {};
    return (
      mocks.directoryOverride?.(args) ?? {
        currentData: responseFor(args),
        isFetching: false,
        isError: false,
      }
    );
  },
  useGetCustomerDirectorySummaryQuery: (args, options) => {
    mocks.summaryQuery(args, options);
    return (
      mocks.summaryOverride ?? {
        currentData: {
          currency: "CZK",
          spendingAvailable: true,
          summary: {
            totalCustomers: 2305,
            credits: 4321,
            activeMemberships: 91,
            newThisMonth: 4,
          },
          membershipOptions: [{ value: "club", label: "Whole studio club" }],
        },
      }
    );
  },
  useExportCustomerDirectoryMutation: () => [mocks.exportDirectory],
}));
vi.mock("@/lib/features/lecturers/lecturersApiSlice", () => ({
  useGetAllLecturersQuery: () => ({
    data: [
      {
        id: "staff-1",
        firstname: "Local",
        lastname: "Teacher",
        tenantRole: "staff",
      },
    ],
  }),
  useDeleteLecturerMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/components/forms/lecturers/NewLecturerForm", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/AlertModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/ErrorModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ResponsiveModal", () => ({ default: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

import UsersAndStaffTable from "@/components/tables/UsersAndStaffTable";

const customer = {
  id: "customer-with-metrics",
  firstname: "Metric",
  lastname: "Customer",
  email: "metric@example.test",
  lastBookingAt: "2025-01-02T12:00:00.000Z",
  totalSpentByCurrency: [{ currency: "EUR", amountMinor: 12345 }],
  totalSpent: 123.45,
  totalSpentCurrency: "EUR",
};
const rows = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `customer-${index}`,
    firstname: `Customer${index}`,
    lastname: "Maker",
    email: `customer${index}@example.test`,
    moneyCredits: index,
    lastBookingAt: null,
    totalSpentByCurrency: [],
    totalSpentCurrency: "CZK",
  }));
const directory = (props = {}) => (
  <UsersAndStaffTable
    showStaff={false}
    showInsights={false}
    showCreateButton={false}
    {...props}
  />
);
const selectFirstRow = () =>
  fireEvent.click(within(screen.getAllByRole("row")[1]).getByRole("checkbox"));
const lastQuery = () => mocks.directoryQuery.mock.calls.at(-1)[0];
const settleSearch = async (value) => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  vi.useRealTimers();
};
const readCsv = async () => {
  const blob = URL.createObjectURL.mock.calls.at(-1)[0];
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

describe("remote customer directory", () => {
  beforeEach(() => {
    mocks.state.scope = "tenant-a:owner-1";
    mocks.users = [customer];
    mocks.directoryOverride = null;
    mocks.summaryOverride = null;
    mocks.exportDirectory.mockImplementation((args) => ({
      unwrap: async () => {
        const data = args.ids
          ? mocks.users.filter((row) => args.ids.includes(row.id))
          : filterRows(args);
        return { data, totalCount: data.length, complete: true };
      },
    }));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:customer-export");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.useRealTimers());

  it("does not label or export credit balances using a guessed currency while summary metadata is unavailable", () => {
    mocks.users = [{ ...customer, moneyCredits: 123 }];
    mocks.summaryOverride = {};
    const { rerender } = render(directory());
    const creditCell = () =>
      within(screen.getAllByRole("row")[1]).getAllByRole("cell")[4];
    expect(creditCell()).toHaveTextContent(/^—$/);
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeDisabled();
    selectFirstRow();
    expect(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    ).toBeDisabled();
    mocks.summaryOverride = {
      currentData: {
        currency: "EUR",
        spendingAvailable: true,
        summary: { totalCustomers: 1 },
        membershipOptions: [],
      },
    };
    rerender(directory());
    expect(creditCell()).toHaveTextContent("€123.00");
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeEnabled();
  });

  it("applies financial drafts together, resets page and selection, and exports the same filters", async () => {
    mocks.users = rows(21);
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    selectFirstRow();
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    for (const [key, value] of Object.entries({
      spendMin: "100,50",
      spendMax: "200",
      spendFrom: "2026-11-01",
      spendTo: "2026-11-17",
      creditMin: "0",
      creditMax: "500",
    })) {
      fireEvent.change(screen.getByLabelText(`filters.${key}`), {
        target: { value },
      });
    }
    expect(lastQuery().page).toBe(2);
    expect(lastQuery()).not.toHaveProperty("spendMin");
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "filters.applyFinancial" }),
    );
    expect(lastQuery()).toEqual(
      expect.objectContaining({
        page: 1,
        spendMin: "100.5",
        spendMax: "200",
        spendFrom: "2026-11-01",
        spendTo: "2026-11-17",
        creditMin: "0",
        creditMax: "500",
        timeZone: expect.any(String),
      }),
    );
    expect(screen.queryByText("selection.selected:1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "columns.periodSpent" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    expect(mocks.exportDirectory).toHaveBeenCalledWith(
      expect.objectContaining({
        spendMin: "100.5",
        spendTo: "2026-11-17",
        creditMin: "0",
        creditMax: "500",
        timeZone: expect.any(String),
      }),
    );
    const csv = await readCsv();
    expect(csv).toContain("exportColumns.periodSpent");
    fireEvent.click(screen.getByRole("button", { name: "filters.clear" }));
    expect(lastQuery()).not.toHaveProperty("spendMin");
    expect(lastQuery()).not.toHaveProperty("timeZone");
    expect(screen.getByLabelText("filters.creditMin")).toHaveValue("");
    expect(
      screen.getByRole("columnheader", { name: "columns.totalSpent" }),
    ).toBeVisible();
  });

  it("rejects reversed ranges before requesting a different page", () => {
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    fireEvent.change(screen.getByLabelText("filters.spendMin"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("filters.spendMax"), {
      target: { value: "99" },
    });
    expect(screen.getByText("errors.spendingRange")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "filters.applyFinancial" }),
    ).toBeDisabled();
    expect(lastQuery()).not.toHaveProperty("spendMin");
  });

  it("retains date context when exporting selected customers, and shows period spending", async () => {
    mocks.users = [
      {
        ...customer,
        periodSpentByCurrency: [{ currency: "CZK", amountMinor: 25000 }],
        periodSpentCurrency: "CZK",
      },
    ];
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    fireEvent.change(screen.getByLabelText("filters.spendFrom"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "filters.applyFinancial" }),
    );
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[6]).toHaveTextContent("250");
    expect(cells[6]).not.toHaveTextContent("123.45");
    selectFirstRow();
    fireEvent.click(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    expect(mocks.exportDirectory).toHaveBeenCalledWith({
      cacheScope: "tenant-a:owner-1",
      ids: [customer.id],
      spendFrom: "2026-11-01",
      timeZone: expect.any(String),
    });
    expect(await readCsv()).toContain("exportColumns.periodSpent");
  });

  it("keeps credit filters usable when spending visibility is denied", () => {
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: false,
        summary: { totalCustomers: 1 },
        membershipOptions: [],
      },
    };
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    expect(screen.getByLabelText("filters.spendMin")).toBeDisabled();
    expect(screen.getByLabelText("filters.spendFrom")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("filters.creditMax"), {
      target: { value: "0" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "filters.applyFinancial" }),
    );
    expect(lastQuery().creditMax).toBe("0");
    expect(lastQuery()).not.toHaveProperty("spendMin");
  });

  it("requests ten customers and independently preserves global totals, facets and per-customer metrics", () => {
    const { container } = render(directory());
    expect(mocks.directoryQuery).toHaveBeenCalledWith(
      {
        cacheScope: "tenant-a:owner-1",
        page: 1,
        limit: 10,
        search: "",
        status: "",
        membership: "",
      },
      { skip: false, refetchOnMountOrArgChange: 60 },
    );
    expect(mocks.summaryQuery).toHaveBeenCalledWith(
      { cacheScope: "tenant-a:owner-1", timeZone: expect.any(String) },
      { skip: false, refetchOnMountOrArgChange: 60, refetchOnFocus: true },
    );
    expect(screen.getAllByText("2305")).toHaveLength(2);
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent("Jan 2, 2025");
    expect(cells[6]).toHaveTextContent(/^€123\.45$/);
    const mobile = container.querySelector("article dl").closest("article");
    expect(
      within(mobile).getByText("columns.totalSpent").nextElementSibling,
    ).toHaveTextContent(/^€123\.45$/);
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    expect(
      screen.getByRole("option", { name: "Whole studio club" }),
    ).toBeInTheDocument();
  });

  it("keeps the authoritative subscriber count when filters remove all visible rows", async () => {
    render(directory());
    const card = screen
      .getByText("overview.activeMemberships")
      .closest("article");
    expect(card).toHaveTextContent("91");
    await settleSearch("no-matching-customer");
    expect(screen.getByText("empty.customersTitle")).toBeVisible();
    expect(card).toHaveTextContent("91");
  });

  it("preserves a verified zero but hides stale summary counts after a failed refresh", () => {
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: true,
        summary: {
          totalCustomers: 1,
          activeMemberships: 0,
          credits: 0,
          newThisMonth: 0,
        },
        membershipOptions: [],
      },
    };
    const { rerender } = render(directory());
    const card = () =>
      screen.getByText("overview.activeMemberships").closest("article");
    expect(within(card()).getByText("0")).toBeVisible();
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: true,
        summary: {
          totalCustomers: 1,
          activeMemberships: 42,
          credits: 0,
          newThisMonth: 0,
        },
        membershipOptions: [],
      },
      isError: true,
      error: { status: 503 },
      refetch: vi.fn(),
    };
    rerender(directory());
    expect(within(card()).getByText("—")).toBeVisible();
    expect(within(card()).getByText("overview.unavailable")).toBeVisible();
    expect(within(card()).queryByText("42")).not.toBeInTheDocument();
    expect(screen.getAllByText("Metric Customer")).toHaveLength(2);
  });

  it("changes remote page and debounces search without searching only the loaded page", async () => {
    mocks.users = [...rows(10), customer];
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(lastQuery()).toMatchObject({ page: 2, limit: 10 });
    expect(screen.getAllByText("€123.45")).toHaveLength(2);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "met" },
    });
    await act(() => vi.advanceTimersByTimeAsync(150));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "metric@example.test" },
    });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(lastQuery()).toMatchObject({ page: 2, search: "" });
    expect(screen.queryByText("Metric Customer")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(lastQuery()).toMatchObject({
      page: 1,
      search: "metric@example.test",
    });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "pagination.previous" }),
    ).toBeDisabled();
    expect(screen.getAllByText("2305")).toHaveLength(2);
  });

  it("sends membership/status filters to the server and resets pagination", () => {
    mocks.users = rows(25);
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "filters.membership" }),
      { target: { value: "club" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "filters.status" }), {
      target: { value: "inactive" },
    });
    expect(lastQuery()).toMatchObject({
      page: 1,
      membership: "club",
      status: "inactive",
    });
    expect(screen.getAllByText("2305")).toHaveLength(2);
  });

  it("fetches the real last page when a refreshed count shrinks, including an empty tenant", () => {
    mocks.users = rows(51);
    const { rerender } = render(directory());
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    expect(lastQuery()).toMatchObject({ page: 6 });
    expect(screen.getAllByText("Customer50 Maker")).toHaveLength(2);

    mocks.users = rows(21);
    rerender(directory());
    expect(lastQuery()).toMatchObject({ page: 3 });
    expect(screen.getAllByText("Customer20 Maker")).toHaveLength(2);
    expect(screen.queryByText("Customer50 Maker")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "pagination.next" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "pagination.previous" }),
    );
    expect(lastQuery()).toMatchObject({ page: 2 });

    mocks.users = [];
    rerender(directory());
    expect(lastQuery()).toMatchObject({ page: 1 });
    expect(screen.getByText("empty.customersTitle")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "pagination.previous" }),
    ).toBeDisabled();
  });

  it("renders an unavailable membership total as unknown while preserving known zeros", () => {
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: true,
        summary: {
          totalCustomers: 1,
          activeMemberships: null,
          credits: 0,
          newThisMonth: 0,
        },
        membershipOptions: [],
      },
    };
    render(directory());
    const membershipCard = screen
      .getByText("overview.activeMemberships")
      .closest("article");
    expect(within(membershipCard).getByText("—")).toBeVisible();
    expect(within(membershipCard).queryByText("0")).not.toBeInTheDocument();
    expect(
      within(membershipCard).getByText("overview.unavailable"),
    ).toBeVisible();
    expect(
      within(
        screen.getByText("overview.newThisMonth").closest("article"),
      ).getByText("0"),
    ).toBeVisible();
  });

  it("hides unavailable membership facets and exports unknown rows without leaking stale membership snapshots", async () => {
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: true,
        membershipAvailable: false,
        summary: {
          totalCustomers: 1,
          activeMemberships: 91,
          credits: 0,
          newThisMonth: 0,
        },
        membershipOptions: [{ value: "secret", label: "Hidden facet" }],
      },
    };
    mocks.users = [
      {
        ...customer,
        membershipAvailable: false,
        activeMembership: null,
        membership: "Stale membership",
        currentMembership: { name: "Stale current" },
      },
    ];
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    expect(
      screen.getByRole("combobox", { name: "filters.membership" }),
    ).toBeDisabled();
    expect(screen.queryByText("Hidden facet")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale membership")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale current")).not.toBeInTheDocument();
    const membershipCard = screen
      .getByText("overview.activeMemberships")
      .closest("article");
    expect(within(membershipCard).getByText("—")).toBeVisible();
    expect(within(membershipCard).queryByText("91")).not.toBeInTheDocument();
    expect(
      screen
        .queryAllByText("membership.none")
        .filter((element) => element.tagName !== "OPTION"),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    const csv = await URL.createObjectURL.mock.calls[0][0].text();
    expect(csv.split("\n")[1].split(",")[4]).toBe("—");
    expect(csv).not.toContain("Stale membership");
    expect(csv).not.toContain("membership.none");
  });

  it("clears a no-longer-available membership filter, page and selection without clearing other filters", () => {
    mocks.users = rows(21).map((row) => ({ ...row, membership: "club" }));
    const { rerender } = render(directory());
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "filters.membership" }),
      { target: { value: "club" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "filters.status" }), {
      target: { value: "active" },
    });
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    selectFirstRow();
    expect(lastQuery()).toMatchObject({
      membership: "club",
      page: 2,
      status: "active",
    });
    expect(screen.getByText("selection.selected:1")).toBeVisible();
    mocks.summaryOverride = {
      currentData: {
        membershipAvailable: false,
        summary: {
          totalCustomers: 21,
          activeMemberships: null,
          credits: 0,
          newThisMonth: 0,
        },
        membershipOptions: [],
      },
    };
    rerender(directory());
    expect(lastQuery()).toMatchObject({
      membership: "",
      page: 1,
      status: "active",
    });
    expect(
      screen.getByRole("combobox", { name: "filters.membership" }),
    ).toBeDisabled();
    expect(screen.queryByText("selection.selected:1")).not.toBeInTheDocument();
  });

  it("renders authoritative no-membership rows without falling back to old customer fields", () => {
    mocks.users = [
      {
        ...customer,
        membershipAvailable: true,
        activeMembership: null,
        membership: "Old plan",
      },
    ];
    render(directory());
    expect(screen.getAllByText("membership.none")).toHaveLength(2);
    expect(screen.queryByText("Old plan")).not.toBeInTheDocument();
  });

  it("does not label the previous page as the requested page while a response is pending or failed", () => {
    mocks.users = rows(11);
    const firstPage = responseFor({ page: 1, limit: 10 });
    const { rerender } = render(directory());
    mocks.directoryOverride = (args) =>
      args.page === 2
        ? { data: firstPage, currentData: undefined, isFetching: true }
        : null;
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(screen.queryByText("Customer0 Maker")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("loading");
    expect(screen.getByRole("searchbox")).toBeEnabled();
    mocks.directoryOverride = () => ({
      data: firstPage,
      currentData: undefined,
      isError: true,
      refetch: vi.fn(),
    });
    rerender(directory());
    expect(screen.queryByText("Customer0 Maker")).not.toBeInTheDocument();
    expect(screen.getByText("errors.customers")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeDisabled();
  });

  it("keeps same-query cached rows and actions usable during refresh or a transient error", () => {
    const currentData = responseFor({ page: 1, limit: 10 });
    mocks.directoryOverride = () => ({ currentData, isFetching: true });
    const onOpenCustomer = vi.fn();
    const { container, rerender } = render(directory({ onOpenCustomer }));
    expect(screen.getAllByText("Metric Customer")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("profile.refreshing");
    expect(container.querySelector(".absolute.inset-0")).toBeNull();
    expect(screen.getByRole("searchbox")).toBeEnabled();
    selectFirstRow();
    expect(screen.getByText("selection.selected:1")).toBeVisible();
    mocks.directoryOverride = () => ({
      currentData,
      isError: true,
      error: { status: 503 },
      refetch: vi.fn(),
    });
    rerender(directory({ onOpenCustomer }));
    expect(screen.getAllByText("Metric Customer")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.customers");
  });

  it("keeps selection across pages and page sizes, updates refreshed rows, and exports exactly the selected IDs", async () => {
    mocks.users = rows(21);
    const onAddCreditsToCustomers = vi.fn();
    const { rerender } = render(directory({ onAddCreditsToCustomers }));
    selectFirstRow();
    mocks.users[0] = {
      ...mocks.users[0],
      firstname: "Updated",
      moneyCredits: 500,
    };
    rerender(directory({ onAddCreditsToCustomers }));
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    selectFirstRow();
    fireEvent.change(
      screen.getByRole("combobox", { name: "pagination.rowsPerPage" }),
      { target: { value: "20" } },
    );
    expect(screen.getByText("selection.selected:2")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "actions.addCredits" }));
    expect(onAddCreditsToCustomers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "customer-0",
        firstname: "Updated",
        moneyCredits: 500,
      }),
      expect.objectContaining({ id: "customer-10" }),
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    expect(mocks.exportDirectory).toHaveBeenCalledWith({
      cacheScope: "tenant-a:owner-1",
      ids: ["customer-0", "customer-10"],
    });
    const csv = await readCsv();
    expect(csv).toContain("customer0@example.test");
    expect(csv).toContain("customer10@example.test");
    expect(csv).not.toContain("customer1@example.test");
  });

  it("exports every matching customer beyond 2,000 only after a complete response", async () => {
    mocks.users = [
      ...rows(2105),
      customer,
      { ...customer, id: "excluded", email: "hidden@outside.test" },
    ];
    render(directory());
    await settleSearch("@example.test");
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    expect(mocks.exportDirectory).toHaveBeenCalledWith({
      cacheScope: "tenant-a:owner-1",
      search: "@example.test",
      status: "",
      membership: "",
    });
    const csv = await readCsv();
    expect(csv.split("\n")).toHaveLength(2107);
    expect(csv).toContain("customer2104@example.test");
    expect(csv).toContain('"Jan 2, 2025",€123.45,');
    expect(csv).not.toContain("hidden@outside.test");
  });

  it("starts only one export for rapid repeated clicks and saves nothing before completion", async () => {
    let finishExport;
    mocks.exportDirectory.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          finishExport = resolve;
        }),
    });
    render(directory());
    const button = screen.getByRole("button", { name: "actions.export" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.exportDirectory).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "actions.exporting" }),
    ).toBeDisabled();
    await act(async () =>
      finishExport({ data: [customer], totalCount: 1, complete: true }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("hides cached customer rows and summary after an authorization denial", () => {
    mocks.directoryOverride = () => ({
      currentData: responseFor({ page: 1, limit: 10 }),
      isError: true,
      error: { status: 403 },
      refetch: vi.fn(),
    });
    mocks.summaryOverride = {
      currentData: {
        currency: "CZK",
        spendingAvailable: true,
        summary: { totalCustomers: 2305, credits: 4321 },
        membershipOptions: [],
      },
      isError: true,
      error: { status: 403 },
      refetch: vi.fn(),
    };
    render(directory());
    expect(screen.queryByText("Metric Customer")).not.toBeInTheDocument();
    expect(screen.queryByText("2305")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeDisabled();
  });

  it.each([
    { data: [customer], totalCount: 2, complete: true },
    { data: [customer], totalCount: 1, complete: false },
    { data: [customer, customer], totalCount: 2, complete: true },
  ])("never saves a partial or invalid export: %j", async (response) => {
    mocks.exportDirectory.mockReturnValue({ unwrap: async () => response });
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.export");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "actions.export" }),
    ).toBeEnabled();
  });

  it("does not save any file when export transport fails", async () => {
    mocks.exportDirectory.mockReturnValue({
      unwrap: async () => {
        throw new Error("Stream interrupted");
      },
    });
    render(directory());
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.export");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects a selected export that omitted or substituted a customer", async () => {
    mocks.users = rows(11);
    mocks.exportDirectory.mockReturnValue({
      unwrap: async () => ({
        data: [mocks.users[1]],
        totalCount: 1,
        complete: true,
      }),
    });
    render(directory());
    selectFirstRow();
    fireEvent.click(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.export");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("clears selection on filter and tenant changes and ignores an export that finishes after switching tenants", async () => {
    mocks.users = rows(11);
    let finishExport;
    const abort = vi.fn();
    mocks.exportDirectory.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          finishExport = resolve;
        }),
      abort,
    });
    const { rerender } = render(directory());
    selectFirstRow();
    fireEvent.click(
      screen.getByRole("button", { name: "selection.exportSelected" }),
    );
    expect(
      screen.getAllByRole("button", { name: "actions.exporting" }),
    ).toHaveLength(2);
    mocks.state.scope = "tenant-b:owner-1";
    mocks.users = [{ ...customer, firstname: "New tenant" }];
    rerender(directory());
    expect(screen.queryByText("selection.selected:1")).not.toBeInTheDocument();
    expect(lastQuery()).toMatchObject({
      cacheScope: "tenant-b:owner-1",
      page: 1,
      search: "",
    });
    expect(abort).toHaveBeenCalledOnce();
    await act(async () =>
      finishExport({ data: rows(1), totalCount: 1, complete: true }),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    selectFirstRow();
    await settleSearch("different");
    expect(screen.queryByText("selection.selected:1")).not.toBeInTheDocument();
  });

  it("does not substitute page totals for unavailable global summary cards or facets", () => {
    mocks.summaryOverride = { isError: true, refetch: vi.fn() };
    render(directory());
    expect(screen.getAllByText("Metric Customer")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.summary");
    expect(screen.queryByText("2305")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "filters.button" }));
    expect(
      screen.getByRole("combobox", { name: "filters.membership" }),
    ).toBeDisabled();
  });

  it("keeps the staff tab local and resets customer selection on tab changes", () => {
    render(directory({ showStaff: true }));
    selectFirstRow();
    fireEvent.click(screen.getByRole("tab", { name: /tabs.staff/ }));
    expect(screen.getAllByText("Local Teacher")).toHaveLength(2);
    expect(mocks.directoryQuery.mock.calls.at(-1)[1].skip).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: /tabs.customers/ }));
    expect(screen.queryByText("selection.selected:1")).not.toBeInTheDocument();
  });
});
