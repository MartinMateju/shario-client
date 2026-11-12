import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("tenant session creation navigation", () => {
  it("routes every retained tenant creation CTA to the full-page composer", () => {
    const topbar = read("src", "components", "dashboard", "DashboardTopbar.js");
    const dashboardData = read(
      "src",
      "components",
      "dashboard",
      "dashboard.data.js",
    );
    const sales = read("src", "components", "sales", "SalesView.js");
    const bookings = read("src", "components", "tables", "BookingsTable.js");

    for (const source of [dashboardData, sales, bookings]) {
      expect(source).toContain("/app/bookings/new");
      expect(source).not.toContain("/app/bookings?action=create");
    }

    expect(topbar).not.toContain("/app/bookings/new");
    expect(topbar).not.toContain("/app/bookings?action=create");
  });

  it("preserves calendar slot context when opening the composer", () => {
    const calendarPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "app",
      "(workspace)",
      "calendar",
      "page.js",
    );

    expect(calendarPage).toContain('query.set("locationId", locationId)');
    expect(calendarPage).toContain(
      'query.set("activityId", selection.activityId)',
    );
    expect(calendarPage).toContain(
      'query.set("start", selection.start.toISOString())',
    );
    expect(calendarPage).toContain(
      'query.set("end", selection.end.toISOString())',
    );
    expect(calendarPage).toContain("router.push(`/app/bookings/new");
    expect(calendarPage).not.toContain('query.set("action", "create")');
  });
});
