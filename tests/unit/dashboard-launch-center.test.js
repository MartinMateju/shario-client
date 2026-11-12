import { describe, expect, it } from "vitest";

import { hasLaunchCenterAttention } from "@/components/dashboard/dashboardLaunchCenter";

describe("dashboard Launch Center attention", () => {
  it("marks an incomplete visible setup step as actionable", () => {
    expect(
      hasLaunchCenterAttention({
        phase: "launch",
        steps: [{ id: "location", status: "incomplete", applicable: true }],
      }),
    ).toBe(true);
  });

  it("keeps a post-launch recommendation actionable at 100% required progress", () => {
    expect(
      hasLaunchCenterAttention({
        phase: "learning",
        progress: { percentage: 100 },
        steps: [{ id: "publish", status: "complete" }],
        recommendations: [
          {
            id: "external_firing_profile",
            complete: false,
            action: { enabled: true },
          },
        ],
      }),
    ).toBe(true);
  });

  it("ignores completed, unavailable and non-applicable work", () => {
    expect(
      hasLaunchCenterAttention({
        phase: "learning",
        progress: { percentage: 100 },
        steps: [
          { id: "publish", status: "complete" },
          { id: "payments", status: "incomplete", applicable: false },
          { id: "inventory", status: "not_applicable" },
        ],
        recommendations: [
          { id: "done", complete: true, action: { enabled: true } },
          { id: "disabled", complete: false, action: { enabled: false } },
        ],
      }),
    ).toBe(false);
  });

  it("supports the legacy progress response without showing a completed dot", () => {
    expect(
      hasLaunchCenterAttention({
        phase: "launch",
        progress: { percentage: 63 },
      }),
    ).toBe(true);
    expect(
      hasLaunchCenterAttention({
        phase: "learning",
        progress: { percentage: 100 },
      }),
    ).toBe(false);
    expect(hasLaunchCenterAttention(null)).toBe(false);
  });
});
