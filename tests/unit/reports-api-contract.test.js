import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/config/permissions";
import { dashboardNavigation } from "@/components/dashboard/dashboard.data";
import {
  formatReportDate,
  getReportDateRange,
  isCsvDownloadPayload,
  normalizeReportOverview,
} from "@/components/views/statistics/reports.utils";
import {
  normalizeReportFilters,
  reportsApiRoutes,
  unwrapReportsEnvelope,
} from "@/lib/features/reports/reportsApiSlice";

describe("reports API contract", () => {
  it("uses the settled report and AI endpoint paths", () => {
    expect(reportsApiRoutes).toEqual({
      overview: "/reports/overview",
      exportCsv: "/reports/export.csv",
      aiBriefing: "/ai/reports/briefing",
    });
  });

  it("sends only supported filters and omits an all-location scope", () => {
    expect(
      normalizeReportFilters({
        from: "2026-07-01",
        to: "2026-07-31",
        locationId: "",
        compare: false,
        granularity: "week",
        locale: "en-GB",
        unsupported: "ignored",
      }),
    ).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
      compare: false,
      granularity: "week",
      locale: "en-GB",
    });
  });

  it("accepts standard envelopes without converting unavailable sources to zero", () => {
    const report = normalizeReportOverview(
      unwrapReportsEnvelope({
        data: {
          summary: {
            netSales: {
              value: null,
              previous: null,
              changePercent: null,
            },
          },
          sales: null,
          bookings: null,
          customers: null,
          operations: { firings: null },
          coverage: {
            available: ["bookings"],
            unavailable: [{ source: "sales", reason: "permission" }],
            limitations: [],
            complete: false,
          },
        },
      }),
    );

    expect(report.summary.netSales.value).toBeNull();
    expect(report.sales).toBeNull();
    expect(report.operations.firings).toBeNull();
    expect(report.coverage.unavailable).toEqual([
      { source: "sales", reason: "permission" },
    ]);
  });
});

describe("report date and download safety", () => {
  it("creates inclusive calendar-date presets", () => {
    expect(getReportDateRange("last7Days", new Date(2026, 6, 28, 22))).toEqual({
      from: "2026-07-22",
      to: "2026-07-28",
    });
    expect(getReportDateRange("lastMonth", new Date(2026, 0, 10))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("resolves presets from the tenant calendar across a UTC boundary", () => {
    const instant = new Date("2026-01-01T00:30:00.000Z");

    expect(
      getReportDateRange("last7Days", instant, "America/Los_Angeles"),
    ).toEqual({
      from: "2025-12-25",
      to: "2025-12-31",
    });
    expect(getReportDateRange("thisMonth", instant, "Europe/Prague")).toEqual({
      from: "2026-01-01",
      to: "2026-01-01",
    });
  });

  it("formats date-only server boundaries as calendar dates", () => {
    expect(
      formatReportDate("2026-07-01", "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    ).toBe("01/07/2026");
  });

  it("rejects JSON, HTML and empty export bodies", () => {
    expect(
      isCsvDownloadPayload({
        csv: '{"error":"failed"}',
        contentType: "application/json",
      }),
    ).toBe(false);
    expect(
      isCsvDownloadPayload({
        csv: "<html>failed</html>",
        contentType: "text/html",
      }),
    ).toBe(false);
    expect(isCsvDownloadPayload({ csv: "", contentType: "text/csv" })).toBe(
      false,
    );
    expect(
      isCsvDownloadPayload({
        csv: "\uFEFFdate,bookings\n2026-07-01,2",
        contentType: "text/csv;charset=utf-8",
      }),
    ).toBe(true);
  });
});

describe("reports navigation", () => {
  it("is gated by REPORTS_VIEW and uses the compatible statistics section", () => {
    expect(
      dashboardNavigation.find((entry) => entry.key === "reports"),
    ).toMatchObject({
      href: "/app/operations?section=statistics",
      permissions: [PERMISSIONS.REPORTS_VIEW],
    });
  });
});
