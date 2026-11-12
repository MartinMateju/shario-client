import { describe, expect, it, vi } from "vitest";

import { formatPlan } from "@/components/dashboard/dashboardPlan";

describe("dashboard plan formatting", () => {
  it("uses the localized label when the message is available", () => {
    const t = vi.fn(() => "Profesionální");
    t.has = vi.fn(() => true);

    expect(formatPlan("PROFESSIONAL", t)).toBe("Profesionální");
    expect(t.has).toHaveBeenCalledWith("plans.professional");
    expect(t).toHaveBeenCalledWith("plans.professional");
  });

  it.each([
    ["starter", "Starter"],
    [undefined, "Professional"],
    ["studio_plus", "Studio Plus"],
    ["enterprise", "Enterprise"],
  ])(
    "falls back to the built-in label for %s when messages are incomplete",
    (plan, expectedLabel) => {
      const t = vi.fn(() => {
        throw new Error("The missing message must not be formatted");
      });
      t.has = vi.fn(() => false);

      expect(formatPlan(plan, t)).toBe(expectedLabel);
      expect(t).not.toHaveBeenCalled();
    },
  );

  it("humanizes custom plan identifiers without querying the catalog", () => {
    const t = vi.fn();
    t.has = vi.fn();

    expect(formatPlan("custom_partner_plan", t)).toBe("custom partner plan");
    expect(t.has).not.toHaveBeenCalled();
    expect(t).not.toHaveBeenCalled();
  });
});
