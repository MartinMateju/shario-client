import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }) => children,
}));

import {
  getEnabledFlowStages,
  getFlowRailState,
  getFlowStageState,
} from "@/components/dashboard/overview/StudioFlowRail";
import { getEnabledSignalKeys } from "@/components/dashboard/overview/StudioSignals";

describe("module-aware dashboard overview", () => {
  it("omits legacy pottery stages and signals in an inventory workspace", () => {
    const modules = {
      bookings: false,
      courses: false,
      communications: false,
      staff_tasks: false,
      firing: true,
      inventory: true,
      reports: false,
    };
    const stages = [
      { key: "booked" },
      { key: "arriving" },
      { key: "readyToFire" },
      { key: "inKiln" },
      { key: "readyForPickup" },
    ];

    expect(
      getEnabledFlowStages(stages, modules).map((stage) => stage.key),
    ).toEqual([]);
    expect(getEnabledSignalKeys(modules)).toEqual([]);
  });

  it("keeps attendance flow for a course-only workspace", () => {
    const stages = [
      { key: "booked" },
      { key: "arriving" },
      { key: "inStudio" },
      { key: "readyToFire" },
    ];

    expect(
      getEnabledFlowStages(stages, {
        bookings: false,
        courses: true,
        firing: false,
      }).map((stage) => stage.key),
    ).toEqual(["booked", "arriving", "inStudio"]);
  });

  it("reserves brand color for active Operations stages", () => {
    expect(getFlowStageState({ available: true, value: 4 })).toBe("active");
    expect(getFlowStageState({ available: true, value: 0 })).toBe("idle");
    expect(getFlowStageState({ available: false, value: 0 })).toBe(
      "unavailable",
    );
    expect(getFlowStageState({ available: true, value: null })).toBe(
      "unavailable",
    );
    expect(getFlowStageState({ available: true, value: Number.NaN })).toBe(
      "unavailable",
    );
  });

  it("compacts Operations only when every enabled stage is a known zero", () => {
    expect(
      getFlowRailState([
        { available: true, value: 0 },
        { available: true, value: 0 },
      ]),
    ).toBe("empty");
    expect(
      getFlowRailState([
        { available: true, value: 0 },
        { available: true, value: 2 },
      ]),
    ).toBe("active");
    expect(
      getFlowRailState([
        { available: true, value: 0 },
        { available: false, value: null },
      ]),
    ).toBe("partial");
    expect(
      getFlowRailState([
        { available: true, value: null },
        { available: true, value: Number.NaN },
      ]),
    ).toBe("partial");
  });

  it("keeps payment, booking rhythm and booking opportunity UI module-aware", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/dashboard/DashboardOverview.js"),
      "utf8",
    );

    expect(source).toContain("<StripeConnectSetupBanner");
    expect(source).toContain("suppressSetupReminder=");
    expect(source).toContain("paymentsEnabled");
    expect(source).toContain("bookingWorkflowEnabled ? (");
    expect(source).toContain(
      "showOpportunity = aiEnabled && bookingWorkflowEnabled",
    );
  });
});
