import { describe, expect, it } from "vitest";
import {
  canCreateCustomRolesForPlan,
  isAiFeaturePlanEntitled,
  isOpenStudioPlanEntitled,
} from "@/config/planEntitlements";

describe("versioned plan UI capabilities", () => {
  it("prefers authoritative Open Studio capability over the fallback tier rule", () => {
    expect(
      isOpenStudioPlanEntitled({
        plan: "starter",
        planVersion: 3,
        capabilities: { booking: { openStudio: true } },
      }),
    ).toBe(true);
    expect(
      isOpenStudioPlanEntitled({
        plan: "professional",
        planVersion: 3,
        capabilities: { booking: { openStudio: false } },
      }),
    ).toBe(false);
  });

  it("preserves legacy custom role access without treating V2 descriptive capabilities as new restrictions", () => {
    const tenant = {
      plan: "starter",
      planVersion: 2,
      capabilities: {
        enterprise: { customRolesAndPermissions: false },
      },
    };
    expect(canCreateCustomRolesForPlan(tenant)).toBe(true);
  });

  it("maps granular AI entitlements separately from the overall assistant", () => {
    const tenant = {
      capabilities: {
        ai: {
          studioAssistant: "full",
          dailyStudioBriefing: true,
          businessAdvisor: false,
          commandCenter: false,
        },
      },
    };
    expect(isAiFeaturePlanEntitled(tenant, "assistant")).toBe(true);
    expect(isAiFeaturePlanEntitled(tenant, "dailyBriefing")).toBe(true);
    expect(isAiFeaturePlanEntitled(tenant, "businessAdvisor")).toBe(false);
    expect(isAiFeaturePlanEntitled(tenant, "reportInsights")).toBe(false);
    expect(isAiFeaturePlanEntitled(tenant, "settings")).toBe(true);
  });
});
