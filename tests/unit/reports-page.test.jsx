import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tenantId = "64b000000000000000000001";
const grohovaId = "64b000000000000000000011";
const vaclavskaId = "64b000000000000000000012";

const mocks = vi.hoisted(() => ({
  search: "section=statistics&period=thisMonth&compare=true",
  replace: vi.fn(),
  queryArgs: [],
  queryCalls: [],
  activeStudioId: null,
  locationsLoading: false,
  denyConsolidated: false,
  locale: "en-GB",
  workspaceAccess: {
    role: "staff",
    status: "active",
    effectivePermissions: ["reports.view"],
    locationAccess: { mode: "selected", locationIds: [] },
  },
  aiAccess: {
    available: false,
    isLoading: false,
    moduleEnabled: false,
  },
  report: null,
  generate: vi.fn(() => ({
    unwrap: () => Promise.resolve({}),
  })),
}));

const translations = {
  "actions.refresh": "Refresh report",
  "actions.export": "Export CSV",
  "filters.period": "Period",
  "filters.from": "From",
  "filters.to": "To",
  "filters.location": "Location",
  "filters.allAccessibleLocations": "All accessible locations",
  "filters.active": "Active",
  "filters.granularity": "Chart interval",
  "filters.comparison": "Previous period",
  "filters.presets.last7Days": "Last 7 days",
  "filters.presets.last30Days": "Last 30 days",
  "filters.presets.thisMonth": "This month",
  "filters.presets.lastMonth": "Last month",
  "filters.presets.thisYear": "This year",
  "filters.presets.custom": "Custom range",
  "filters.granularities.auto": "Automatic",
  "filters.granularities.day": "Daily",
  "filters.granularities.week": "Weekly",
  "filters.granularities.month": "Monthly",
  "common.on": "On",
  "common.off": "Off",
  "common.unavailable": "Unavailable",
  "common.noTrendData": "No trend data",
  "metrics.netSales": "Net sales",
  "metrics.bookings": "Bookings KPI",
  "metrics.utilizationPercent": "Utilization",
  "metrics.returningCustomerPercent": "Returning customers",
  "comparison.previous": "vs. previous period",
  "comparison.noBaseline": "No comparable previous value",
  "overview.trendTitle": "Performance trend",
  "overview.trendDescription": "Verified values",
  "overview.chartMetric": "Chart metric",
  "overview.chartMetrics.netSales": "Net sales",
  "overview.chartMetrics.bookings": "Bookings",
  "overview.chartAccessibleDescription": "{metric} over time",
  "overview.topProducts": "Top products",
  "overview.topProductsDescription": "Ranked products",
  "overview.noProducts": "No products",
  "overview.coursePerformance": "Course fill",
  "overview.coursePerformanceDescription": "Course capacity",
  "overview.noCourses": "No courses",
  "tabs.label": "Report areas",
  "tabs.overview": "Overview",
  "tabs.sales": "Sales",
  "tabs.bookings": "Bookings",
  "tabs.customers": "Customers",
  "tabs.operations": "Operations",
  "ai.title": "AI studio briefing",
  "ai.description": "Optional AI explanation",
  "ai.optionalTitle": "AI is optional",
  "ai.optionalDescription": "Reports work without AI.",
  "ai.generate": "Generate AI briefing",
  "ai.ready": "Generate a verified briefing.",
  "insights.title": "Report insights",
  "insights.description": "Verified observations",
  "insights.empty": "No observations",
  "coverage.title": "Data coverage & freshness",
  "coverage.description": "Available data",
  "coverage.complete": "Complete coverage",
  "coverage.limited": "Limited coverage",
  "coverage.available": "Available sources",
  "coverage.unavailable": "Unavailable sources",
  "coverage.period": "Server-resolved period",
  "coverage.timezone": "Reporting timezone",
  "coverage.generated": "Last refreshed",
  "coverage.limitations": "Data limitations",
  "bookings.metrics.total": "Bookings",
  "bookings.metrics.participants": "Participants",
  "bookings.metrics.cancellations": "Cancellations",
  "bookings.metrics.noShows": "No-shows",
  "bookings.metrics.bookedHours": "Booked hours",
  "bookings.metrics.utilization": "Utilization",
  "bookings.heatmap": "Utilization by day and hour",
  "bookings.heatmapDescription": "Heatmap",
  "bookings.typeBreakdown": "Booking types",
  "bookings.noTypes": "No types",
  "bookings.courseFill": "Course fill rate",
  "bookings.table.type": "Type",
  "bookings.table.bookings": "Bookings",
  "bookings.table.participants": "Participants",
  "bookings.table.course": "Course",
  "bookings.table.sessions": "Sessions",
  "bookings.table.seats": "Booked / capacity",
  "bookings.table.fill": "Fill",
  "weekdays.mon": "Mon",
  "weekdays.tue": "Tue",
  "weekdays.wed": "Wed",
  "weekdays.thu": "Thu",
  "weekdays.fri": "Fri",
  "weekdays.sat": "Sat",
  "weekdays.sun": "Sun",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations:
    () =>
    (key, values = {}) =>
      (translations[key] || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: {
          id: tenantId,
          modules: { ai: false },
          settings: { currency: "CZK" },
        },
        userInfo: { tenant: tenantId },
        workspaceAccess: mocks.workspaceAccess,
      },
      studioContext: {
        tenantId,
        activeStudioId: mocks.activeStudioId,
      },
    }),
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => mocks.aiAccess,
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: {
      locations: [
        { _id: grohovaId, name: "Grohova", isActive: true },
        { _id: vaclavskaId, name: "Vaclavska", isActive: true },
      ],
    },
    isLoading: mocks.locationsLoading,
    isFetching: mocks.locationsLoading,
  }),
}));

vi.mock("@/lib/features/reports/reportsApiSlice", () => ({
  useGetReportsOverviewQuery: (args, options) => {
    mocks.queryCalls.push({ args, options });
    if (!options?.skip) mocks.queryArgs.push(args);
    const denied = mocks.denyConsolidated && !args.locationId;
    return {
      currentData: mocks.report,
      data: mocks.report,
      isLoading: false,
      isFetching: false,
      isError: denied,
      error: denied
        ? { status: 403, data: { code: "CONSOLIDATED_REPORTING_NOT_ENTITLED" } }
        : undefined,
      refetch: vi.fn(),
    };
  },
  useExportReportsCsvMutation: () => [
    vi.fn(() => ({
      unwrap: () =>
        Promise.resolve({
          csv: "date,bookings\n2026-07-01,2",
          contentType: "text/csv",
          filename: "report.csv",
        }),
    })),
    { isLoading: false },
  ],
  useGenerateReportsBriefingMutation: () => [
    mocks.generate,
    { isLoading: false },
  ],
}));

import StatisticsPage from "@/components/views/statistics/StatisticsPage";

const createReport = () => ({
  metadata: {
    consolidatedLocations: true,
    timezone: "Europe/Prague",
    currency: "CZK",
    period: { from: "2026-07-01", to: "2026-07-28" },
    comparisonPeriod: { from: "2026-06-03", to: "2026-06-30" },
    granularity: "day",
    generatedAt: "2026-07-28T08:00:00.000Z",
    locationId: grohovaId,
  },
  coverage: {
    available: ["sales", "bookings", "inventory"],
    unavailable: [{ source: "customers", reason: "permission" }],
    limitations: ["No-show tracking is unavailable."],
    complete: false,
  },
  summary: {
    netSales: { value: 123400, previous: 100000, changePercent: 23.4 },
    bookings: { value: 12, previous: 0, changePercent: null },
    participants: { value: 18, previous: 11, changePercent: 63.6 },
    utilizationPercent: {
      value: null,
      previous: null,
      changePercent: null,
    },
    returningCustomerPercent: {
      value: null,
      previous: null,
      changePercent: null,
    },
  },
  timeSeries: [
    {
      periodStart: "2026-07-01",
      periodEnd: "2026-07-01",
      netSalesMinor: 123400,
      bookings: 12,
      participants: 18,
      utilizationPercent: null,
    },
  ],
  sales: {
    currency: "CZK",
    grossSalesMinor: 149314,
    discountsMinor: 0,
    taxMinor: 25914,
    netSalesMinor: 123400,
    orders: 12,
    averageOrderValueMinor: 10283,
    refundsMinor: null,
    paymentMethods: [],
    totalsByCurrency: [],
    topProducts: [],
    limitations: [],
  },
  bookings: {
    total: 12,
    participants: 18,
    cancellations: 2,
    noShows: null,
    bookedHours: 24,
    utilizationPercent: null,
    bookingTypes: [],
    heatmap: [
      {
        weekday: 0,
        hour: 10,
        bookings: 3,
        participants: 4,
        capacity: 6,
        utilizationPercent: 66.7,
      },
      {
        weekday: 1,
        hour: 10,
        bookings: 2,
        participants: 2,
        capacity: 6,
        utilizationPercent: 33.3,
      },
    ],
    courseFill: [],
    limitations: ["Utilization excludes products without capacity."],
  },
  customers: null,
  operations: {
    firings: null,
    inventory: {
      asOf: "2026-07-28T08:00:00.000Z",
      consumptionByUnit: [{ unit: "kg", quantity: 10 }],
      purchasesByUnit: [{ unit: "kg", quantity: 20 }],
      purchaseCostWithoutVatMinor: 50000,
      openReorders: 1,
      lowStockItems: 2,
      stocktakeDifferenceByUnit: [],
      limitations: [],
    },
    staffTasks: null,
  },
  insights: {
    highlights: ["Net sales increased."],
    attention: ["Two inventory items are low."],
    recommendations: ["Review the open reorder."],
  },
});

describe("Reports & insights workspace", () => {
  beforeEach(() => {
    mocks.search = "section=statistics&period=thisMonth&compare=true";
    mocks.replace.mockReset();
    mocks.queryArgs.length = 0;
    mocks.queryCalls.length = 0;
    mocks.activeStudioId = grohovaId;
    mocks.locationsLoading = false;
    mocks.denyConsolidated = false;
    mocks.locale = "en-GB";
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["reports.view"],
      locationAccess: {
        mode: "selected",
        locationIds: [grohovaId],
      },
    };
    mocks.aiAccess = {
      available: false,
      isLoading: false,
      moduleEnabled: false,
    };
    mocks.report = createReport();
    mocks.generate.mockClear();
  });

  it("renders only available report tabs and keeps unavailable metrics explicit", () => {
    render(<StatisticsPage />);

    expect(screen.getByRole("tab", { name: "Overview" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Sales" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Bookings" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Operations" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Customers" })).toBeNull();

    const utilizationCard = screen.getByText("Utilization").closest("article");
    expect(within(utilizationCard).getByText("Unavailable")).toBeVisible();
    expect(screen.getByText("No comparable previous value")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Reports & insights" }),
    ).toBeNull();
  });

  it("gates CSV export with REPORTS_EXPORT", () => {
    const { rerender } = render(<StatisticsPage />);
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();

    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: ["reports.view", "reports.export"],
    };
    rerender(<StatisticsPage />);

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeVisible();
  });

  it("queries the active assigned location and exposes only assigned locations", () => {
    render(<StatisticsPage />);

    expect(mocks.queryArgs.at(-1)).toMatchObject({
      locationId: grohovaId,
      compare: true,
      granularity: "auto",
    });
    const location = screen.getByLabelText("Location");
    expect(
      within(location).getByRole("option", { name: /Grohova/ }),
    ).toBeVisible();
    expect(
      within(location).queryByRole("option", { name: "Vaclavska" }),
    ).toBeNull();

    fireEvent.change(location, { target: { value: "" } });
    expect(mocks.queryArgs.at(-1)).not.toHaveProperty("locationId");
    expect(mocks.replace).toHaveBeenCalled();
  });

  it("waits for locations and never defaults an unresolved active location to all locations", () => {
    mocks.activeStudioId = null;
    mocks.locationsLoading = true;
    const { rerender } = render(<StatisticsPage />);
    expect(mocks.queryArgs).toHaveLength(0);
    expect(mocks.queryCalls.at(-1).options.skip).toBe(true);
    mocks.locationsLoading = false;
    mocks.activeStudioId = grohovaId;
    rerender(<StatisticsPage />);
    expect(mocks.queryArgs.at(-1)).toMatchObject({ locationId: grohovaId });
    expect(mocks.queryArgs.every((args) => args.locationId === grohovaId)).toBe(
      true,
    );
  });

  it("falls back to the first assigned location when the active or URL location is inaccessible", () => {
    mocks.search += `&locationId=${grohovaId}&locationScope=all`;
    mocks.workspaceAccess.locationAccess.locationIds = [vaclavskaId];
    mocks.report.metadata.consolidatedLocations = false;
    render(<StatisticsPage />);
    expect(
      mocks.queryArgs.every((args) => args.locationId === vaclavskaId),
    ).toBe(true);
    expect(screen.getByLabelText("Location")).toHaveValue(vaclavskaId);
    expect(
      screen.queryByRole("option", { name: "All accessible locations" }),
    ).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining(`locationId=${vaclavskaId}`),
      { scroll: false },
    );
    expect(mocks.replace.mock.calls.at(-1)[0]).not.toContain(
      "locationScope=all",
    );
  });

  it("does not re-enable consolidated scope from cached metadata after an API entitlement denial", () => {
    mocks.workspaceAccess.locationAccess = { mode: "all", locationIds: [] };
    mocks.denyConsolidated = true;
    render(<StatisticsPage />);
    expect(
      screen.getByRole("option", { name: "All accessible locations" }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "" },
    });
    expect(mocks.queryArgs.some((args) => !args.locationId)).toBe(true);
    expect(mocks.queryArgs.at(-1).locationId).toBe(grohovaId);
    expect(
      screen.queryByRole("option", { name: "All accessible locations" }),
    ).toBeNull();
    expect(screen.getByLabelText("Location")).toHaveValue(grohovaId);
  });

  it("includes the current UI locale in overview requests and updates it when language changes", () => {
    const { rerender } = render(<StatisticsPage />);
    expect(mocks.queryArgs.at(-1).locale).toBe("en-GB");
    mocks.locale = "cs-CZ";
    rerender(<StatisticsPage />);
    expect(mocks.queryArgs.at(-1).locale).toBe("cs-CZ");
  });

  it("uses the stable Monday-first heatmap contract", () => {
    render(<StatisticsPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Bookings" }));

    expect(screen.getByRole("columnheader", { name: "Mon" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Tue" })).toBeVisible();
  });

  it("keeps deterministic insights available when AI is disabled", () => {
    render(<StatisticsPage />);

    expect(screen.getByText("AI is optional")).toBeVisible();
    expect(screen.getAllByText("Net sales increased.").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole("button", { name: "Generate AI briefing" }),
    ).toBeNull();
  });

  it("calls the AI briefing endpoint only from an available AI state", () => {
    mocks.aiAccess = {
      available: true,
      isLoading: false,
      moduleEnabled: true,
      capabilities: {
        features: { reportInsights: true },
      },
    };
    render(<StatisticsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Generate AI briefing" }),
    );

    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        locationId: grohovaId,
        compare: true,
        granularity: "auto",
        locale: "en-GB",
      }),
    );
  });
});
