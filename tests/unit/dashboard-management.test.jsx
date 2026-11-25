import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/en.json";
import ManagementDashboard from "@/components/dashboard/overview/ManagementDashboard";
import ManagementPerformance from "@/components/dashboard/overview/ManagementPerformance";
import { normalizeOverview } from "@/components/dashboard/overview/overview.utils";

const mocks = vi.hoisted(() => ({
  query: {},
  queryArgs: null,
  queryOptions: null,
  generate: vi.fn(),
  download: vi.fn(),
  generateLoading: false,
  downloadLoading: false,
  updatePreferences: vi.fn(),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [mocks.updatePreferences],
}));

vi.mock("@/lib/features/dashboard/managementApiSlice", () => ({
  useGetDashboardManagementQuery: (args, options) => {
    mocks.queryArgs = args;
    mocks.queryOptions = options;
    return mocks.query;
  },
  useGenerateStudioReportMutation: () => [
    mocks.generate,
    { isLoading: mocks.generateLoading },
  ],
  useDownloadStudioReportPdfMutation: () => [
    mocks.download,
    { isLoading: mocks.downloadLoading },
  ],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/dashboard/overview/StudioSignals", () => ({
  default: () => <div>Upcoming tasks and studio signals</div>,
}));
vi.mock("@/components/dashboard/overview/TodayRhythm", () => ({
  default: () => <div>Daily schedule</div>,
}));
vi.mock("@/components/dashboard/overview/OverviewDateNavigation", () => ({
  default: () => <div>Date navigation</div>,
}));

const metric = (value, previous = null) => ({
  value,
  previous,
  changePercent: null,
});
const snapshot = () => ({
  metadata: {
    timezone: "Europe/Prague",
    currency: "CZK",
    period: { from: "2026-11-01", to: "2026-11-07" },
    comparisonPeriod: { from: "2026-10-01", to: "2026-10-07" },
    arrivalPeriod: { from: "2026-10-09", to: "2026-11-07" },
    activeCustomerPeriod: { from: "2026-10-09", to: "2026-11-07" },
  },
  summary: {
    deliveredRevenueMinor: metric(null),
    visits: metric(42),
    newCustomers: metric(6),
    activeMemberships: metric(18),
  },
  customers: {
    available: true,
    total: metric(1601),
    new: metric(29, 12),
    activeLast30Days: metric(105),
    scope: "workspace",
    activeScope: "selected_locations",
  },
  memberships: {
    available: true,
    scope: "selected_locations",
    newSubscribers: metric(3, 2),
  },
  revenueBreakdown: { confirmedServicesMinor: metric(123400), complete: false },
  attendance: {
    available: true,
    source: "scheduled",
    sampleSize: 42,
    hours: [{ hour: 14, count: 42 }],
  },
  topClients: {
    available: true,
    revenueAvailable: false,
    revenueComplete: false,
    spendingAvailable: true,
    spendingScope: "workspace",
    spendingBasis: "recorded_net_payments",
    byVisits: [
      {
        id: "ada",
        name: "Ada Nováková",
        memberNumber: 127,
        visits: 4,
        spentMonthMinor: 123400,
        spentTotalMinor: 987600,
      },
    ],
    byRevenue: [],
  },
  topProducts: {
    available: true,
    complete: false,
    items: [
      { id: "course", name: "Wheel course", quantity: 3, revenueMinor: 123400 },
    ],
  },
  issues: [
    {
      key: "failed_emails",
      count: 2,
      href: "/app/communications?section=email",
    },
  ],
  coverage: {
    complete: false,
    limitations: ["Historical delivery records are unavailable."],
  },
});
const report = () => ({
  id: "saved-report-id",
  generatedAt: "2026-11-07T10:00:00Z",
  locale: "en",
  locationLabel: "Grohova",
  snapshot: snapshot(),
  narrative: {
    mode: "deterministic",
    headline: "Saved studio summary",
    summary: "A factual snapshot.",
    highlights: ["42 booked visits completed."],
    attention: [],
    recommendations: [],
    dataLimitations: ["Attendance is not verified."],
  },
  sections: [
    {
      key: "customers",
      title: "Saved customer section",
      columns: ["Metric", "Current", "Previous"],
      rows: [
        { label: "Registered customers", value: "1,601", previous: "1,572" },
        { label: "New registered customers", value: "29", previous: "12" },
        {
          label: "Active customers — last 30 days",
          value: "105",
          previous: "—",
        },
        { label: "Active subscribers", value: "18", previous: "—" },
        { label: "New subscribers", value: "3", previous: "2" },
      ],
      notes: [
        "Active customers created a booking from 9 Oct to 7 Nov; each person is counted once.",
      ],
    },
    {
      key: "revenue",
      title: "Saved financial section",
      columns: ["Metric", "Current", "Previous"],
      rows: [{ label: "Refunds", value: "CZK 120", previous: "CZK 90" }],
      notes: ["Cash refunds are separate from delivered revenue."],
    },
  ],
});
const props = () => ({
  overview: normalizeOverview({
    metadata: { timezone: "Europe/Prague" },
    flow: [
      { key: "booked", value: 3, available: true },
      { key: "arriving", value: 5, available: true },
      { key: "inStudio", value: 2, available: true },
    ],
  }),
  date: "2026-11-07",
  todayDate: "2026-11-07",
  locationId: "location-one",
  modules: { staff_tasks: true },
  workspaceAccess: {
    tenantId: "tenant-one",
    userId: "owner-one",
    role: "owner",
    status: "active",
    effectivePermissions: ["*"],
  },
  onDateChange: vi.fn(),
  onRetry: vi.fn(),
});
function renderWithIntl(node) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Europe/Prague"
    >
      {node}
    </NextIntlClientProvider>,
  );
}

describe("owner and manager dashboard", () => {
  beforeEach(() => {
    mocks.query = { currentData: snapshot(), refetch: vi.fn() };
    mocks.generate.mockReset();
    mocks.download.mockReset();
    mocks.generateLoading = false;
    mocks.downloadLoading = false;
    mocks.updatePreferences.mockReset();
    mocks.updatePreferences.mockImplementation(() => ({
      unwrap: () => Promise.resolve({}),
    }));
    URL.revokeObjectURL = vi.fn();
  });

  it("shows recorded payments with the payment basis and workspace scope", () => {
    const data = snapshot();
    data.metadata.revenueBasis = "recorded_net_payments";
    data.metadata.revenueScope = "workspace";
    data.summary.recordedPaymentsMinor = metric(385000, 210000);
    renderWithIntl(<ManagementPerformance management={data} />);
    const card = screen.getByText("Recorded payments").parentElement;
    expect(card).toHaveTextContent("3,850");
    expect(card).toHaveTextContent("2,100");
    expect(card).toHaveTextContent(/net of recorded refunds.*All studios/);
    expect(card).not.toHaveTextContent("delivery records");
  });

  it("defaults the new customer ranking to actual spending and explains incomplete histories", () => {
    const data = snapshot();
    data.topClients.revenueBasis = "recorded_net_payments";
    data.topClients.revenueAvailable = true;
    data.topClients.revenueComplete = false;
    data.topClients.byRevenue = [
      {
        ...data.topClients.byVisits[0],
        revenueMinor: 420000,
        spentMonthMinor: 420000,
        spentMonthComplete: false,
        spentTotalMinor: null,
      },
    ];
    renderWithIntl(<ManagementPerformance management={data} />);
    const panel = screen.getByRole("region", { name: "Top 5 clients" });
    expect(
      within(panel).getByRole("button", { name: "Amount spent" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getAllByText(/4,200/)).toHaveLength(2);
    expect(
      within(panel).getByText("Total spent").nextElementSibling,
    ).toHaveTextContent("—");
    expect(panel).toHaveTextContent(
      "Some totals are unavailable because the payment history is incomplete.",
    );
    expect(panel).toHaveTextContent("Ranking uses verified payment amounts");
    expect(within(panel).getAllByText(/Known amount/)).toHaveLength(2);
    expect(panel).not.toHaveTextContent("confirmed completed");
  });

  it("shows product purchase counts and their own rolling period rather than unit quantities", () => {
    const data = snapshot();
    data.topProducts = {
      available: true,
      complete: true,
      basis: "paid_purchases",
      scope: "workspace",
      period: { from: "2026-10-09", to: "2026-11-07" },
      items: [
        {
          id: "course",
          name: "Wheel course",
          quantity: 12,
          purchaseCount: 5,
          revenueMinor: null,
        },
      ],
    };
    renderWithIntl(<ManagementPerformance management={data} />);
    const panel = screen.getByRole("region", { name: "Top 3 products" });
    expect(panel).toHaveTextContent("Last 30 days: Oct 9 – Nov 7");
    expect(panel).toHaveTextContent("All studios");
    expect(
      within(panel).getByText("purchases").parentElement,
    ).toHaveTextContent("5");
    expect(within(panel).queryByText("12")).not.toBeInTheDocument();
    expect(within(panel).queryByText("—")).not.toBeInTheDocument();
    expect(panel).not.toHaveTextContent("confirmed completed");
  });

  it("labels location-restricted product purchases with their selected-studio scope", () => {
    const data = snapshot();
    data.topProducts = {
      available: true,
      complete: false,
      basis: "paid_purchases",
      scope: "selected_locations",
      period: { from: "2026-10-09", to: "2026-11-07" },
      items: [],
    };
    renderWithIntl(<ManagementPerformance management={data} />);
    const panel = screen.getByRole("region", { name: "Top 3 products" });
    expect(panel).toHaveTextContent("Selected studios");
    expect(panel).not.toHaveTextContent("All studios");
    expect(panel).toHaveTextContent("this ranking may be incomplete");
  });

  it("keeps unavailable recorded payments separate from a verified zero", () => {
    const data = snapshot();
    data.metadata.revenueBasis = "recorded_net_payments";
    data.summary.recordedPaymentsMinor = metric(null);
    const view = renderWithIntl(<ManagementPerformance management={data} />);
    expect(
      screen.getByText("Recorded payments").parentElement,
    ).toHaveTextContent("Payment data unavailable.");
    view.unmount();
    data.summary.recordedPaymentsMinor = metric(0);
    renderWithIntl(<ManagementPerformance management={data} />);
    const card = screen.getByText("Recorded payments").parentElement;
    expect(card).toHaveTextContent(/CZK\s*0/);
    expect(card).not.toHaveTextContent("Unavailable");
  });

  it("labels known payment subtotals and suppresses comparison with incomplete amounts", () => {
    const data = snapshot();
    data.metadata.revenueBasis = "recorded_net_payments";
    data.summary.recordedPaymentsMinor = metric(210000, 100000);
    data.summary.recordedPaymentsComplete = false;
    renderWithIntl(<ManagementPerformance management={data} />);
    const card = screen.getByText("Recorded payments").parentElement;
    expect(card).toHaveTextContent("2,100");
    expect(card).toHaveTextContent(
      "Known payments only; some payment records are incomplete.",
    );
    expect(card).not.toHaveTextContent("Previous period");
    expect(card).not.toHaveTextContent("1,000");
  });

  it("shows distinct customer and subscriber counts", () => {
    renderWithIntl(<ManagementPerformance management={snapshot()} />);
    const customers = screen.getByRole("region", { name: "Total customers" });
    expect(within(customers).getByText("1,601")).toBeVisible();
    expect(within(customers).getByText("29")).toBeVisible();
    expect(within(customers).getByText("105")).toBeVisible();
    expect(within(customers).getByText("Active customers")).toBeVisible();
    expect(
      within(customers).getByText(/Booked in the last 30 days/),
    ).toHaveTextContent("Oct 9 – Nov 7");
    const subscribers = screen.getByRole("region", {
      name: "Active subscribers",
    });
    expect(within(subscribers).getByText("18")).toBeVisible();
    expect(within(subscribers).getByText("3")).toBeVisible();
    expect(
      within(subscribers).getByText(/renewals are excluded/),
    ).toBeVisible();
    expect(screen.queryByText(/firing/i)).not.toBeInTheDocument();
  });

  it("keeps permitted active customers visible when workspace totals or subscribers are unavailable", () => {
    const data = snapshot();
    data.customers.available = false;
    data.customers.total = metric(null);
    data.customers.new = metric(null);
    data.summary.activeMemberships = metric(null);
    data.memberships.newSubscribers = metric(null);
    renderWithIntl(<ManagementPerformance management={data} />);
    const customers = screen.getByRole("region", { name: "Total customers" });
    expect(within(customers).getByText("105")).toBeVisible();
    expect(within(customers).queryByText("0")).not.toBeInTheDocument();
    const subscribers = screen.getByRole("region", {
      name: "Active subscribers",
    });
    expect(within(subscribers).queryByText("0")).not.toBeInTheDocument();
    expect(within(subscribers).getByText("— Data unavailable")).toBeVisible();
  });

  it("shows a small previous count without a misleading percentage", () => {
    const data = snapshot();
    data.summary.visits = { value: 89, previous: 1, changePercent: 8800 };
    renderWithIntl(<ManagementPerformance management={data} />);
    expect(screen.getByText("Previous period: 1")).toBeVisible();
    expect(screen.queryByText(/8800/)).not.toBeInTheDocument();
  });

  it("does not substitute old booking counts or membership renewals for missing new metrics", () => {
    const data = snapshot();
    delete data.customers;
    data.memberships = { new: metric(17) };
    renderWithIntl(<ManagementPerformance management={data} />);
    const customers = screen.getByRole("region", { name: "Total customers" });
    expect(within(customers).queryByText("6")).not.toBeInTheDocument();
    expect(within(customers).getByText("— Data unavailable")).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Active subscribers" }),
      ).queryByText("17"),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Active subscribers" }),
      ).queryByText("18"),
    ).not.toBeInTheDocument();
  });

  it("loads the selected studio scope without automatically requesting an AI report", () => {
    renderWithIntl(<ManagementDashboard {...props()} />);
    expect(mocks.queryArgs).toEqual({
      date: "2026-11-07",
      locationId: "location-one",
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(
      screen.getByText("In the studio now (estimated)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "People with a booking in progress; presence is not confirmed",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Next booking")).toBeInTheDocument();
    expect(
      screen.getByText("Upcoming tasks and studio signals"),
    ).toBeInTheDocument();
    expect(screen.getByText("When visits are scheduled")).toBeInTheDocument();
    expect(screen.getByText("2 failed emails").closest("a")).toHaveAttribute(
      "href",
      "/app/communications?section=email",
    );
  });

  it("refreshes current-day metrics while focused, without polling a historical date", () => {
    const input = props();
    const view = renderWithIntl(<ManagementDashboard {...input} />);
    expect(mocks.queryOptions).toMatchObject({
      pollingInterval: 60_000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    });
    view.rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ManagementDashboard {...input} date="2026-11-06" />
      </NextIntlClientProvider>,
    );
    expect(mocks.queryOptions.pollingInterval).toBe(0);
  });

  const booking = (id, start, end) => ({ id, title: id, start, end });
  const ongoing = booking(
    "Booking in progress",
    "2026-11-07T09:00:00Z",
    "2026-11-07T11:00:00Z",
  );
  const upcoming = booking(
    "Upcoming booking",
    "2026-11-07T11:00:00Z",
    "2026-11-07T12:00:00Z",
  );
  const renderNextBooking = (today, input = {}) =>
    renderWithIntl(
      <ManagementDashboard
        {...props()}
        overview={normalizeOverview({
          metadata: { timezone: "Europe/Prague" },
          today: { available: true, ...today },
        })}
        now={Date.parse("2026-11-07T10:00:00Z")}
        {...input}
      />,
    );

  it("uses the next booking from the full day even when it is outside the schedule preview", () => {
    renderNextBooking({ schedule: [ongoing], nextBooking: upcoming });
    const card = screen.getByRole("link", { name: /Next booking/ });
    expect(card).toHaveTextContent("12:00");
    expect(card).toHaveTextContent(upcoming.title);
    expect(card).not.toHaveTextContent(ongoing.title);
    expect(card).toHaveAttribute(
      "href",
      "/app/bookings?bookingId=Upcoming%20booking",
    );
  });

  it("never calls an already-started booking the next booking in older responses", () => {
    renderNextBooking({ schedule: [ongoing, upcoming] });
    const card = screen.getByRole("link", { name: /Next booking/ });
    expect(card).toHaveTextContent(upcoming.title);
    expect(card).not.toHaveTextContent(ongoing.title);
  });

  it("does not label a historical day's first booking as upcoming", () => {
    renderNextBooking(
      { schedule: [ongoing, upcoming] },
      {
        date: "2026-11-07",
        todayDate: "2026-11-08",
        now: Date.parse("2026-11-08T10:00:00Z"),
      },
    );
    expect(
      screen.getByRole("link", { name: /Next booking/ }),
    ).toHaveTextContent(messages.StudioManagement.noUpcomingSession);
  });

  it.each([{ nextBooking: null }, { nextBooking: ongoing }])(
    "does not fall back to the schedule when nextBooking is $nextBooking",
    (today) => {
      renderNextBooking({ schedule: [upcoming], ...today });
      const card = screen.getByRole("link", { name: /Next booking/ });
      expect(card).toHaveTextContent(
        messages.StudioManagement.noUpcomingSession,
      );
      expect(card).not.toHaveTextContent(upcoming.title);
    },
  );

  it("does not show stale next-booking content while a location is loading", () => {
    renderNextBooking(
      { schedule: [], nextBooking: upcoming },
      { isLoading: true },
    );
    expect(
      screen.getByRole("link", { name: /Next booking/ }),
    ).not.toHaveTextContent(upcoming.title);
  });

  it("links every attention issue and uses generic copy for unknown issue keys", () => {
    const href = "/app/orders?status=review&locationId=location-one";
    mocks.query.currentData.issues.push(
      { key: "overdue_invoices", count: 1, href: "/app/orders" },
      { key: "overdue_custom_orders", count: 1, href: "/app/orders" },
      { key: "future_issue", count: 2, href },
    );
    renderWithIntl(<ManagementDashboard {...props()} />);
    const attention = screen.getByRole("region", {
      name: messages.StudioManagement.attentionTitle,
    });
    expect(
      within(attention).getByRole("link", { name: /2 items need review/ }),
    ).toHaveAttribute("href", href);
    expect(within(attention).getAllByRole("link")).toHaveLength(4);
  });

  it("saves dismissal and explicit restoration without changing the issues", async () => {
    renderWithIntl(<ManagementDashboard {...props()} />);
    const toggle = screen.getByRole("button", { name: "Hide attention card" });
    toggle.focus();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Show alerts (1)" }),
      ).toHaveAttribute("aria-busy", "false"),
    );
    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      overviewAttentionDismissed: true,
    });
    expect(
      screen.getByRole("button", { name: "Show alerts (1)" }),
    ).toHaveFocus();
    expect(
      screen.queryByRole("link", { name: /2 failed emails/ }),
    ).not.toBeInTheDocument();
    expect(mocks.query.currentData.issues[0].count).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Show alerts (1)" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Hide attention card" }),
      ).toHaveAttribute("aria-busy", "false"),
    );
    expect(mocks.updatePreferences).toHaveBeenLastCalledWith({
      overviewAttentionDismissed: false,
    });
    expect(screen.getByRole("link", { name: /2 failed emails/ })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Hide attention card" }),
    ).toHaveFocus();
  });

  it.each(["date", "location", "user", "tenant", "membership", "issue"])(
    "preserves dismissal for the same account when the %s changes",
    async (change) => {
      const initial = props();
      const content = (values) => (
        <NextIntlClientProvider
          locale="en"
          messages={messages}
          timeZone="Europe/Prague"
        >
          <ManagementDashboard {...values} />
        </NextIntlClientProvider>
      );
      const view = render(content(initial));
      fireEvent.click(
        screen.getByRole("button", { name: "Hide attention card" }),
      );
      await screen.findByRole("button", { name: "Show alerts (1)" });
      const updated = {
        ...initial,
        workspaceAccess: { ...initial.workspaceAccess },
      };
      if (change === "date") updated.date = "2026-11-06";
      if (change === "location") updated.locationId = "location-two";
      if (change === "user") updated.workspaceAccess.userId = "owner-two";
      if (change === "tenant") updated.workspaceAccess.tenantId = "tenant-two";
      if (change === "membership")
        updated.workspaceAccess.membershipId = "membership-two";
      if (change === "issue") mocks.query.currentData.issues[0].count = 3;
      view.rerender(content(updated));
      if (["user", "tenant", "membership"].includes(change)) {
        expect(
          screen.getByRole("button", { name: "Hide attention card" }),
        ).toHaveAttribute("aria-expanded", "true");
        expect(
          screen.getByRole("link", { name: /failed emails/ }),
        ).toBeVisible();
      } else {
        expect(
          screen.getByRole("button", { name: "Show alerts (1)" }),
        ).toHaveAttribute("aria-expanded", "false");
        expect(
          screen.queryByRole("link", { name: /failed emails/ }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it("restores the saved dismissal after leaving and reopening the dashboard", async () => {
    const view = renderWithIntl(<ManagementDashboard {...props()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Hide attention card" }),
    );
    await screen.findByRole("button", { name: "Show alerts (1)" });
    view.unmount();

    const fresh = props();
    fresh.workspaceAccess.preferences = { overviewAttentionDismissed: true };
    mocks.query.currentData.issues[0].count = 5;
    renderWithIntl(<ManagementDashboard {...fresh} date="2026-11-08" />);

    expect(
      screen.getByRole("button", { name: "Show alerts (1)" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: /failed emails/ }),
    ).not.toBeInTheDocument();
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(1);
  });

  it("keeps alerts visible if saving fails and allows another attempt", async () => {
    mocks.updatePreferences.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error("offline")),
    }));
    renderWithIntl(<ManagementDashboard {...props()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Hide attention card" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.Common.bannerPreferenceSaveError,
    );
    expect(screen.getByRole("link", { name: /2 failed emails/ })).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Hide attention card" }),
    );
    await screen.findByRole("button", { name: "Show alerts (1)" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows customer member IDs and monthly and total spending in both rankings", () => {
    const data = snapshot();
    data.topClients.revenueAvailable = true;
    data.topClients.byRevenue = [
      { ...data.topClients.byVisits[0], revenueMinor: 420000 },
    ];
    renderWithIntl(<ManagementPerformance management={data} />);
    const panel = screen.getByRole("region", { name: "Top 5 clients" });
    expect(within(panel).getByText("Customer ID #127")).toBeInTheDocument();
    expect(within(panel).getByText(/1,234/)).toBeInTheDocument();
    expect(within(panel).getByText(/9,876/)).toBeInTheDocument();
    expect(
      within(panel).getByText(/across all studios.*Nov 1 – Nov 7/),
    ).toBeInTheDocument();
    fireEvent.click(
      within(panel).getByRole("button", { name: "Delivered revenue" }),
    );
    expect(within(panel).getByText("Customer ID #127")).toBeInTheDocument();
    expect(within(panel).getByText(/1,234/)).toBeInTheDocument();
    expect(within(panel).getByText(/9,876/)).toBeInTheDocument();
  });

  it("preserves missing spending and IDs without replacing them with zero or database IDs", () => {
    const data = snapshot();
    data.topClients.byVisits = [
      {
        id: "internal-database-id",
        name: "Guest",
        memberNumber: null,
        visits: 1,
        spentMonthMinor: null,
        spentTotalMinor: 0,
      },
    ];
    renderWithIntl(<ManagementPerformance management={data} />);
    const row = within(
      screen.getByRole("region", { name: "Top 5 clients" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Customer ID —");
    expect(row).not.toHaveTextContent("internal-database-id");
    expect(
      within(row).getByText("Spent in selected month").nextElementSibling,
    ).toHaveTextContent("—");
    expect(
      within(row).getByText("Total spent").nextElementSibling,
    ).toHaveTextContent(/CZK\s*0/);
  });

  it("does not display spending values when financial coverage is unavailable", () => {
    const data = snapshot();
    data.topClients.spendingAvailable = false;
    renderWithIntl(<ManagementPerformance management={data} />);
    const panel = screen.getByRole("region", { name: "Top 5 clients" });
    expect(within(panel).queryByText(/1,234|9,876/)).not.toBeInTheDocument();
    expect(
      within(panel).getByText(/Spending data is unavailable/),
    ).toBeInTheDocument();
  });

  it("generates on demand, renders the saved sections, and exports that report id", async () => {
    mocks.generate.mockReturnValue({
      unwrap: () => Promise.resolve(report()),
      abort: vi.fn(),
    });
    mocks.download.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          downloadUrl: "blob:report",
          filename: "studio-report.pdf",
        }),
      abort: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    renderWithIntl(<ManagementDashboard {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI report" }));
    await screen.findByText("Saved studio summary");
    expect(mocks.generate).toHaveBeenCalledWith({
      date: "2026-11-07",
      locationId: "location-one",
      locale: "en",
    });
    expect(screen.getByText("Saved financial section")).toBeInTheDocument();
    expect(screen.getByText("CZK 120")).toBeInTheDocument();
    expect(screen.getByText("Saved customer section")).toBeVisible();
    expect(screen.getByText("Active customers — last 30 days")).toBeVisible();
    expect(screen.getByText("105")).toBeVisible();
    expect(screen.getByText("New subscribers")).toBeVisible();
    expect(screen.getByText(/each person is counted once/)).toBeVisible();
    expect(screen.getByText("Attendance is not verified.")).toBeInTheDocument();
    expect(screen.getByText("Studio data report")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await waitFor(() =>
      expect(mocks.download).toHaveBeenCalledWith("saved-report-id"),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Back to dashboard" }));
    expect(
      screen.getByRole("button", { name: "Generate AI report" }),
    ).toBeInTheDocument();
  });

  it("enforces AI generation and report export permissions independently", async () => {
    const access = {
      role: "manager",
      status: "active",
      effectivePermissions: ["reports.view"],
    };
    const view = renderWithIntl(
      <ManagementDashboard {...props()} workspaceAccess={access} />,
    );
    expect(
      screen.getByRole("button", { name: "Generate AI report" }),
    ).toBeDisabled();
    expect(mocks.generate).not.toHaveBeenCalled();
    view.unmount();
    mocks.generate.mockReturnValue({ unwrap: () => Promise.resolve(report()) });
    renderWithIntl(
      <ManagementDashboard
        {...props()}
        workspaceAccess={{
          ...access,
          effectivePermissions: ["reports.view", "ai.use"],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate AI report" }));
    await screen.findByText("Saved studio summary");
    expect(
      screen.queryByRole("button", { name: "Export PDF" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose cached data from a previously selected studio", () => {
    mocks.query = {
      data: snapshot(),
      currentData: undefined,
      isFetching: true,
    };
    renderWithIntl(<ManagementDashboard {...props()} isLoading />);
    expect(
      screen.getByRole("button", { name: "Generate AI report" }),
    ).toBeDisabled();
    expect(screen.queryByText("Ada Nováková")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading studio performance",
    );
  });

  it("shows a generation failure and aborts an in-flight request when the scope unmounts", async () => {
    const abort = vi.fn();
    mocks.generate.mockReturnValue({
      unwrap: () => Promise.reject(new Error("failed")),
      abort,
    });
    const view = renderWithIntl(<ManagementDashboard {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI report" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The report could not be generated",
    );
    view.unmount();
    expect(abort).toHaveBeenCalledOnce();
  });

  it("distinguishes unavailable revenue rankings from an empty ranked list", () => {
    renderWithIntl(<ManagementPerformance management={snapshot()} />);
    const panel = screen
      .getByRole("heading", { name: "Top 5 clients" })
      .closest("section");
    expect(within(panel).getByText("Ada Nováková")).toBeInTheDocument();
    fireEvent.click(
      within(panel).getByRole("button", { name: "Delivered revenue" }),
    );
    expect(within(panel).getByText("Data unavailable")).toBeInTheDocument();
    expect(
      within(panel).queryByText("No clients recorded for this period."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Confirmed completed services:/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Unavailable — delivery records are incomplete."),
    ).toBeInTheDocument();
  });

  it("hides disabled workflows and their financial rankings", () => {
    renderWithIntl(
      <ManagementPerformance
        management={snapshot()}
        modules={{
          payments: false,
          bookings: false,
          courses: false,
          customers: false,
          memberships: false,
        }}
      />,
    );
    expect(screen.queryByText("Top 5 clients")).not.toBeInTheDocument();
    expect(screen.queryByText("Top 3 products")).not.toBeInTheDocument();
    expect(screen.queryByText("Delivered revenue")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Total customers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Active subscribers" }),
    ).not.toBeInTheDocument();
  });

  it("returns to visit rankings if the payments module is disabled while mounted", () => {
    const data = snapshot();
    data.topClients.revenueAvailable = true;
    data.topClients.byRevenue = [
      { id: "ada", name: "Ada Nováková", revenueMinor: 900000 },
    ];
    const content = (modules) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Prague"
      >
        <ManagementPerformance management={data} modules={modules} />
      </NextIntlClientProvider>
    );
    const view = render(content({ payments: true }));
    const panel = screen
      .getByRole("heading", { name: "Top 5 clients" })
      .closest("section");
    fireEvent.click(
      within(panel).getByRole("button", { name: "Delivered revenue" }),
    );
    expect(within(panel).getByText(/9,000/)).toBeInTheDocument();
    view.rerender(content({ payments: false }));
    expect(within(panel).queryByText(/9,000/)).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", {
        name: "Participants in past bookings",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByText("4")).toBeInTheDocument();
  });
});
