import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("booking and course module combinations", () => {
  it("keeps the booking composer route permission-based for course scheduling", () => {
    const route = read(
      "src/app/[locale]/tenants/[tenantSlug]/app/(workspace)/bookings/new/page.js",
    );
    expect(route).toContain("PERMISSIONS.BOOKINGS_CREATE");
    expect(route).not.toContain("modules?.bookings");
  });

  it("treats courses as a booking workflow in the overview", () => {
    const overview = read("src/components/dashboard/DashboardOverview.js");
    expect(overview).toContain(
      "bookingWorkflowEnabled = bookingsEnabled || coursesEnabled",
    );
    expect(overview).toContain("bookingWorkflowEnabled ? (");
  });
});
