import { beforeEach, describe, expect, it, vi } from "vitest";

const endpoints = vi.hoisted(() => ({}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints: create }) => {
      Object.assign(
        endpoints,
        create({ query: (value) => value, mutation: (value) => value }),
      );
      return {};
    },
  },
}));
import {
  handleStudioReportPdf,
  normalizeStudioReportInput,
} from "@/lib/features/dashboard/managementApiSlice";
import {
  formatManagementValue,
  getManagementHours,
  getManagementIssues,
  managementHref,
} from "@/components/dashboard/overview/management.utils";

describe("management API and saved PDF contract", () => {
  it("refreshes payment and subscriber metrics after their underlying records change", () => {
    for (const type of [
      "Order",
      "CouponOrder",
      "Membership",
      "MembershipInvoice",
    ])
      expect(endpoints.getDashboardManagement.providesTags).toContainEqual({
        type,
        id: "LIST",
      });
  });
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:saved-pdf");
  });

  it("sends only date, selected location and locale to the saved report endpoint", () => {
    expect(
      normalizeStudioReportInput({
        date: "2026-11-07",
        locationId: "",
        locale: "cs",
        tenantId: "ignored",
        snapshot: "ignored",
      }),
    ).toEqual({ date: "2026-11-07", locale: "cs" });
    expect(
      endpoints.getDashboardManagement.query({
        date: "2026-11-07",
        locationId: "studio",
      }),
    ).toEqual({
      url: "/dashboard/management",
      params: { date: "2026-11-07", locationId: "studio" },
    });
    expect(
      endpoints.generateStudioReport.query({
        date: "2026-11-07",
        locationId: "studio",
        locale: "cs",
      }),
    ).toEqual({
      url: "/dashboard/reports",
      method: "POST",
      body: { date: "2026-11-07", locationId: "studio", locale: "cs" },
    });
    expect(endpoints.downloadStudioReportPdf.query("saved/id").url).toBe(
      "/dashboard/reports/saved%2Fid/pdf",
    );
  });

  it("downloads only a successful PDF and retains a safe server filename", async () => {
    const result = await handleStudioReportPdf(
      new Response("%PDF-1.7 saved report", {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="studio-report.pdf"',
        },
      }),
    );
    expect(result).toEqual({
      downloadUrl: "blob:saved-pdf",
      filename: "studio-report.pdf",
    });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("preserves server errors without making an error document downloadable", async () => {
    expect(
      await handleStudioReportPdf(
        new Response('{"message":"Forbidden"}', {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).toEqual({ message: "Forbidden" });
    expect(
      await handleStudioReportPdf(new Response("Unavailable", { status: 503 })),
    ).toEqual({ message: "Unavailable" });
    await expect(
      handleStudioReportPdf(
        new Response("<html>Error</html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    ).rejects.toThrow("not a PDF");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("management metric meaning and navigation", () => {
  it("keeps unavailable figures separate from real zeroes", () => {
    expect(formatManagementValue({ value: null })).toBe("—");
    expect(formatManagementValue({ value: 0 })).toBe("0");
    expect(formatManagementValue({ value: Number.NaN })).toBe("—");
  });

  it("restricts issue links to workspace routes", () => {
    for (const href of [
      "https://outside.test",
      "//outside.test",
      "/app\\evil",
      "javascript:alert(1)",
      "/application",
    ])
      expect(managementHref(href)).toBe("/app");
    expect(managementHref("/app/orders?status=overdue")).toBe(
      "/app/orders?status=overdue",
    );
  });

  it("treats ordinary pickup stock as context and retains actual exceptions", () => {
    expect(
      getManagementIssues(
        {
          issues: [
            { key: "failedEmails", count: 2 },
            { key: "overdueOrders", count: 0 },
          ],
        },
        {
          attention: [
            { key: "readyForPickup", count: 95, available: true },
            { key: "overdueTasks", count: 1, available: true },
          ],
        },
      ).map((item) => item.key),
    ).toEqual(["failedEmails", "overdueTasks"]);
  });

  it("builds a 24-hour chart while rejecting malformed bins", () => {
    expect(
      getManagementHours({
        available: false,
        hours: [{ hour: 14, count: 99 }],
      }),
    ).toEqual([]);
    const hours = getManagementHours({
      available: true,
      hours: [
        { hour: 14, count: 7 },
        { hour: 25, count: 4 },
        { hour: 10, count: -1 },
      ],
    });
    expect(hours).toHaveLength(24);
    expect(hours[14].count).toBe(7);
    expect(hours[10].count).toBe(0);
  });
});
