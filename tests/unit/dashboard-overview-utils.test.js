import { describe, expect, it } from "vitest";

import {
  formatOverviewDate,
  formatOverviewDateShort,
} from "@/components/dashboard/overview/overview.utils";

describe("dashboard overview date formatting", () => {
  it("formats the visible date control for Czech readers", () => {
    expect(formatOverviewDateShort("2026-08-05", "cs")).toBe("5. 8. 2026");
    expect(formatOverviewDate("2026-08-05", "cs")).toBe("středa 5. srpna 2026");
  });

  it("formats the visible date control with the English workspace locale", () => {
    expect(formatOverviewDateShort("2026-08-05", "en")).toBe("8/5/2026");
    expect(formatOverviewDate("2026-08-05", "en")).toBe(
      "Wednesday, August 5, 2026",
    );
  });
});
