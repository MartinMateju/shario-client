import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: null,
  generate: vi.fn(),
  generation: null,
  getRecommendations: vi.fn(),
  query: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const labels = {
        eyebrow: "Evidence-led guidance",
        title: "Business Advisor",
        description: "A calm shortlist",
        generate: "Analyze my studio",
        refresh: "Refresh analysis",
        preparing: "Analyzing",
        updated: `Updated ${values.date}`,
        coverage: `${values.count} verified data sources`,
        partialCoverage: `${values.count} required source unavailable`,
        "freshness.fresh": "Current",
        "freshness.stale": "Refresh recommended",
        "freshness.staleDescription": "Refresh before deciding",
        "recommendations.title": "Recommended now",
        "recommendations.description": `${values.count} recommendations worth reviewing`,
        "priority.high": "High priority",
        "priority.medium": "Medium priority",
        "categories.capacity": "Capacity",
        "categories.revenue": "Revenue",
        "actions.review": "Review recommendation",
        "actions.discuss": "Discuss with AI",
        "actions.openWorkspace": "Review in workspace",
        "evidence.count": `${values.count} evidence items`,
        "evidence.previous": `Previously ${values.value}`,
        "evidence.period": `${values.from} – ${values.to}`,
        "evidence.sources.bookings": "Bookings",
        "evidence.sources.reports": "Reports",
        "review.eyebrow": "Recommendation review",
        "review.close": "Close review",
        "review.why": "Why this matters",
        "review.evidence": "Verified evidence",
        "review.nextStep": "Suggested next step",
        "review.impact": `Impact: ${values.value}`,
        "review.effort": `Effort: ${values.value}`,
        "review.confidence": `Confidence: ${values.value}`,
        "review.advisoryOnly": "Reviewing it does not change studio data.",
        "levels.high": "High",
        "levels.medium": "Medium",
        "levels.low": "Low",
        "states.ready.title": "Ready to review your studio",
        "states.ready.description": "Run an analysis",
        "states.noSignal.title": "No meaningful change recommended",
        "states.noSignal.description": "No material recommendation",
        "unavailable.permission.title": "Advisor access is restricted",
        "unavailable.permission.description": "Reports access is required",
      };
      return labels[key] || key;
    },
}));

vi.mock("react-redux", () => ({
  useSelector: () => "507f1f77bcf86cd799439011",
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => mocks.access,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiAdvisorRecommendationsQuery: (...args) => {
    mocks.getRecommendations(...args);
    return mocks.query;
  },
  useGenerateAiAdvisorRecommendationsMutation: () => [
    mocks.generate,
    mocks.generation,
  ],
}));

import BusinessAdvisorPanel from "./BusinessAdvisorPanel";

const recommendation = {
  id: "adv_507f1f77bcf86cd799439011",
  key: "course_capacity",
  category: "capacity",
  kind: "opportunity",
  priority: "high",
  impact: "high",
  effort: "medium",
  confidence: "high",
  title: "Review Saturday wheel capacity",
  rationale: "Four recent sessions reached at least 90% occupancy.",
  nextStep: "Check staffing and equipment before increasing capacity.",
  href: "/app/products?category=classes",
  evidence: [
    {
      id: "fill-rate",
      source: "bookings",
      metric: "fill_rate",
      label: "Average fill rate",
      value: 96.7,
      previousValue: 81.2,
      changePercent: 15.5,
      unit: "percent",
      period: { from: "2026-06-01", to: "2026-07-31" },
    },
  ],
};

const snapshot = (overrides = {}) => ({
  id: "advisor-snapshot-1",
  status: "ready",
  headline: "One opportunity is worth reviewing",
  summary: "Start with recurring class demand.",
  recommendations: [recommendation],
  period: { timezone: "Europe/Prague" },
  coverage: {
    available: ["bookings", "reports"],
    unavailable: [{ source: "inventory", reason: "module_disabled" }],
    limitations: ["Inventory is not included in this analysis."],
    complete: false,
  },
  generatedAt: "2026-08-03T08:00:00.000Z",
  freshness: { state: "fresh", dataAsOf: "2026-08-03T08:00:00.000Z" },
  ...overrides,
});

describe("BusinessAdvisorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = {
      available: true,
      cacheScope: "tenant-1|access-1",
      canReadCached: true,
      canUseAssistant: true,
      hasPermission: true,
      isLoading: false,
      moduleEnabled: true,
      usageBlocked: false,
    };
    mocks.generate.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mocks.generation = { isLoading: false };
    mocks.query = {
      currentData: snapshot(),
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  });

  it("renders a calm ordered shortlist and opens an evidence-first review", () => {
    render(<BusinessAdvisorPanel />);

    expect(
      screen.getByText("One opportunity is worth reviewing"),
    ).toBeVisible();
    expect(screen.getByText("Review Saturday wheel capacity")).toBeVisible();
    expect(screen.getByText(/1 required source unavailable/)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Review recommendation" }),
    );

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("96.7%")).toBeVisible();
    expect(screen.getByText("Bookings")).toBeVisible();
    expect(
      screen.getByText("Reviewing it does not change studio data."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Discuss with AI" }),
    ).toHaveAttribute(
      "href",
      "/app/ai?intent=review-business-advice&recommendationId=adv_507f1f77bcf86cd799439011",
    );
    expect(
      screen.getByRole("link", { name: /Review in workspace/ }),
    ).toHaveAttribute("href", "/app/products?category=classes");
  });

  it("shows a distinct healthy no-signal state", () => {
    mocks.query = {
      ...mocks.query,
      currentData: snapshot({
        status: "no_signal",
        headline: "Your current operating pattern looks stable",
        recommendations: [],
        coverage: { available: ["bookings"], unavailable: [], complete: true },
      }),
    };

    render(<BusinessAdvisorPanel />);

    expect(screen.getByText("No meaningful change recommended")).toBeVisible();
    expect(screen.queryByText("Review recommendation")).toBeNull();
  });

  it("does not offer an AI discussion for stale evidence", () => {
    mocks.query = {
      ...mocks.query,
      currentData: snapshot({
        freshness: {
          state: "stale",
          dataAsOf: "2026-08-01T08:00:00.000Z",
        },
      }),
    };

    render(<BusinessAdvisorPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: "Review recommendation" }),
    );

    expect(screen.queryByRole("link", { name: "Discuss with AI" })).toBeNull();
    expect(screen.getByText("Refresh before deciding")).toBeVisible();
  });

  it("refreshes only through the explicit server generation endpoint", async () => {
    render(<BusinessAdvisorPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh analysis" }));

    await waitFor(() =>
      expect(mocks.generate).toHaveBeenCalledWith({
        cacheScope: "tenant-1|access-1",
        force: true,
        locale: "en",
        locationId: "507f1f77bcf86cd799439011",
      }),
    );
  });

  it("does not query recommendations after reports access is lost", () => {
    mocks.access = {
      ...mocks.access,
      available: false,
      canReadCached: false,
      hasPermission: false,
    };

    render(<BusinessAdvisorPanel />);

    expect(mocks.getRecommendations).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );
    expect(screen.getByText("Advisor access is restricted")).toBeVisible();
  });

  it("explains a plan exclusion as an upgrade instead of a temporary service outage", () => {
    mocks.access = {
      ...mocks.access,
      available: false,
      canReadCached: false,
      planEntitled: false,
      canViewPlan: true,
    };
    render(<BusinessAdvisorPanel />);
    expect(screen.getByText("unavailable.plan.title")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "unavailable.plan.action" }),
    ).toHaveAttribute("href", "/app/settings/billing");
    expect(screen.queryByText("unavailable.service.title")).toBeNull();
    expect(mocks.getRecommendations).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );
  });
});
