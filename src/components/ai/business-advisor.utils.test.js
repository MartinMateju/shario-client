import { describe, expect, it } from "vitest";

import {
  formatAdvisorEvidenceValue,
  getAdvisorDiscussHref,
  getAdvisorEmptyState,
  isAdvisorRecommendationId,
  normalizeAdvisorSnapshot,
} from "./business-advisor.utils";

const recommendation = (index, overrides = {}) => ({
  id: `adv_${String(index).padStart(24, "a")}`,
  key: `signal-${index}`,
  category: "capacity",
  kind: "opportunity",
  priority: "medium",
  impact: "high",
  effort: "low",
  confidence: "high",
  title: `Recommendation ${index}`,
  rationale: "Verified rationale",
  nextStep: "Review capacity",
  href: "/app/products?category=classes",
  evidence: [],
  ...overrides,
});

describe("Business Advisor normalization", () => {
  it("keeps at most five authorized cards and preserves structured evidence", () => {
    const snapshot = normalizeAdvisorSnapshot({
      data: {
        status: "ready",
        recommendations: Array.from({ length: 7 }, (_, index) =>
          recommendation(index, {
            evidence: [
              {
                id: `metric-${index}`,
                label: "Revenue",
                value: 184000,
                previousValue: null,
                changePercent: 12.4,
                unit: "minor_currency",
                currency: "CZK",
                period: { from: "2026-07-01", to: "2026-07-31" },
              },
            ],
          }),
        ),
        coverage: { available: ["reports"], complete: true },
      },
    });

    expect(snapshot.recommendations).toHaveLength(5);
    expect(snapshot.recommendations[0]).toMatchObject({
      confidence: "high",
      href: "/app/products?category=classes",
      evidence: [
        {
          value: 184000,
          previousValue: null,
          unit: "minor_currency",
          period: { from: "2026-07-01", to: "2026-07-31" },
        },
      ],
    });
    expect(
      formatAdvisorEvidenceValue(snapshot.recommendations[0].evidence[0], {
        locale: "en",
      }),
    ).toContain("1,840");
  });

  it("fails closed for forged recommendation IDs and external navigation", () => {
    const snapshot = normalizeAdvisorSnapshot({
      recommendations: [
        recommendation(1, {
          id: "../../another-tenant",
          href: "https://attacker.example/collect",
        }),
      ],
      coverage: { complete: false },
    });

    expect(snapshot.recommendations[0].id).toBe("");
    expect(snapshot.recommendations[0].href).toBe("");
    expect(getAdvisorDiscussHref(snapshot.recommendations[0])).toBe("");
    expect(isAdvisorRecommendationId("adv_507f1f77bcf86cd799439011")).toBe(
      true,
    );
  });

  it("preserves every server-controlled evidence source used by Advisor cards", () => {
    const snapshot = normalizeAdvisorSnapshot({
      recommendations: [
        recommendation(1, {
          evidence: [
            { source: "sales", metric: "netSales", value: 1, unit: "count" },
            {
              source: "staffTasks",
              metric: "overdueTasks",
              value: 3,
              unit: "count",
            },
          ],
        }),
      ],
    });

    expect(
      snapshot.recommendations[0].evidence.map(({ source }) => source),
    ).toEqual(["sales", "stafftasks"]);
  });

  it("maps ready, learning, healthy and unavailable result states honestly", () => {
    expect(getAdvisorEmptyState(null)).toBe("ready");
    expect(
      getAdvisorEmptyState(
        normalizeAdvisorSnapshot({
          status: "learning",
          needsMoreData: true,
          recommendations: [],
        }),
      ),
    ).toBe("learning");
    expect(
      getAdvisorEmptyState(
        normalizeAdvisorSnapshot({
          status: "no_signal",
          recommendations: [],
          coverage: { complete: true },
        }),
      ),
    ).toBe("noSignal");
    expect(
      getAdvisorEmptyState(
        normalizeAdvisorSnapshot({
          status: "unavailable",
          recommendations: [],
          coverage: { complete: false },
        }),
      ),
    ).toBe("unavailable");
  });

  it("builds a fixed allowlisted Discuss with AI route", () => {
    expect(getAdvisorDiscussHref({ id: "adv_507f1f77bcf86cd799439011" })).toBe(
      "/app/ai?intent=review-business-advice&recommendationId=adv_507f1f77bcf86cd799439011",
    );
  });
});
