import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import styles from "./overview.module.css";

import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  state: null,
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) => {
      const labels = {
        "briefing.operationalEyebrow": "Studio briefing",
        "briefing.aiEyebrow": "AI studio briefing",
        "briefing.verifiedEyebrow": "Verified studio briefing",
        "briefing.calmHeadline": "Your studio is running smoothly.",
        "briefing.attentionHeadline": "A few things need your attention.",
        "briefing.partialHeadline": "Here’s what we can verify right now.",
        "briefing.deterministicSummary":
          `${values.bookings} bookings, ` +
          `and ${values.attention} priority areas.`,
        "briefing.countsUnavailableSummary":
          "Booking counts are not fully available. Unverified values are omitted.",
        "briefing.partialSummary": `${values.count} available sources · unknown values stay unknown`,
        "briefing.coverageComplete": `Based on ${values.count} studio signals`,
        "briefing.coveragePartial": `${values.count} available sources`,
        "briefing.updated": `Updated ${values.time}`,
        "briefing.sources": `Based on ${values.count} studio signals`,
        "briefing.review": "Review priorities",
        "briefing.viewTodaySchedule": "View today’s schedule",
        "briefing.viewSchedule": "View schedule",
        "briefing.openOperations": "Open operations",
        "briefing.generate": "Generate AI briefing",
        "briefing.refresh": "Refresh briefing",
        "briefing.preparing": "Preparing grounded briefing",
        "briefing.checkingFreshness": "Checking freshness",
        "briefing.prioritiesLabel": "Today’s verified priorities",
        "briefing.fresh": "Current",
        "briefing.stale": "Refresh recommended",
        "briefing.refreshError": "Verified overview remains available",
        "attention.title": "Needs your attention",
        "attention.clearHeading": "All clear",
        "attention.partialHeading": "Priority coverage",
        "attention.items.unpaidBookings": "unpaid bookings",
        "attention.items.completedFiringsAwaitingNotification":
          "firings awaiting customer notification",
        "attention.items.readyForPickup": "pieces ready for pickup",
        "attention.items.lowStock": "low-stock items",
        "attention.items.overdueTasks": "overdue staff tasks",
        "attention.viewAll": "View all priorities",
        "attention.clearTitle": "No urgent priorities",
        "attention.clearDescription": "Nothing needs immediate action.",
        "attention.partialTitle": "Some priorities may be unavailable",
        "attention.partialDescription": "Coverage is incomplete.",
      };
      return labels[key] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./useDailyStudioBriefing", () => ({
  default: () => mocks.state,
}));

import StudioBriefingHero from "./StudioBriefingHero";

const overview = {
  metadata: {
    date: "2026-08-03",
    timezone: "Europe/Prague",
  },
  coverage: {
    available: ["bookings", "tasks", "inventory"],
    unavailable: [],
    complete: true,
  },
  flow: [
    { key: "booked", value: 8, available: true },
    { key: "readyToFire", value: 3, available: true },
  ],
  attention: [
    {
      key: "lowStock",
      count: 2,
      available: true,
      href: "/app/operations?section=inventory",
    },
  ],
};

const state = (overrides = {}) => ({
  access: {
    available: true,
    canReadCached: true,
    canUseAssistant: true,
    hasPermission: true,
    moduleEnabled: true,
  },
  briefing: null,
  canGenerate: true,
  generation: { isLoading: false, isError: false },
  isToday: true,
  locale: "en",
  query: {
    isLoading: false,
    isFetching: false,
    isError: false,
  },
  refresh: mocks.refresh,
  stale: false,
  ...overrides,
});

describe("StudioBriefingHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = state();
  });

  it("keeps the verified operational overview visible while proactively loading", () => {
    mocks.state = state({
      query: { isLoading: true, isFetching: true, isError: false },
    });

    render(<StudioBriefingHero overview={overview} />);

    expect(screen.getByText("A few things need your attention.")).toBeVisible();
    expect(screen.getByText(/8 bookings/)).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Needs your attention",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { level: 3, name: "All clear" }),
    ).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing grounded briefing",
    );
    const review = screen.getByRole("link", { name: "Review priorities" });
    expect(review).toHaveAttribute(
      "href",
      "/app/ai?intent=review-daily-briefing",
    );
    expect(review).toHaveClass(styles.primary);
    expect(review).not.toHaveClass("bg-[#191A18]");
  });

  it("shows a cached deterministic briefing even when generation credits are unavailable", () => {
    mocks.state = state({
      canGenerate: false,
      access: {
        available: false,
        canReadCached: true,
        canUseAssistant: false,
        hasPermission: true,
        moduleEnabled: true,
        usageBlocked: true,
      },
      briefing: {
        headline: "Verified morning priorities",
        summary: "The studio facts were refreshed at opening time.",
        locale: "en",
        dateKey: "2026-08-03",
        sourceCount: 3,
        generatedAt: "2026-08-03T07:30:00.000Z",
        provenance: { provider: "deterministic" },
        freshness: { state: "fresh" },
        attention: [{ id: "overdue", description: "Review one overdue task." }],
      },
    });

    render(<StudioBriefingHero overview={overview} />);

    expect(screen.getByText("Verified studio briefing")).toBeVisible();
    expect(screen.getByText("Verified morning priorities")).toBeVisible();
    expect(screen.getByText("Review one overdue task.")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Today’s verified priorities" }),
    ).toHaveClass("lg:grid-cols-1");
    expect(
      screen.queryByRole("button", { name: "Refresh briefing" }),
    ).toBeNull();
  });

  it("labels AI enrichment honestly and keeps refresh explicit", () => {
    mocks.state = state({
      briefing: {
        headline: "Three priorities before opening",
        summary: "Start with the urgent customer conversation.",
        locale: "en",
        dateKey: "2026-08-03",
        sourceCount: 4,
        generatedAt: "2026-08-03T07:30:00.000Z",
        provenance: { provider: "openai" },
        freshness: { state: "fresh" },
        attention: [
          {
            id: "urgent",
            description: "Review one urgent conversation.",
            href: "/app/communications?section=inbox",
          },
          { id: "stock", description: "Review two low-stock items." },
        ],
      },
    });

    render(
      <StudioBriefingHero
        overview={{
          ...overview,
          flow: [{ key: "booked", value: 8, available: true }],
        }}
      />,
    );

    expect(screen.getByText("AI studio briefing")).toBeVisible();
    expect(
      screen.getByText("Start with the urgent customer conversation."),
    ).toBeVisible();
    expect(
      screen.queryByText(
        "Booking counts are not fully available. Unverified values are omitted.",
      ),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /Review one urgent conversation/ }),
    ).toHaveAttribute("href", "/app/communications?section=history");
    expect(
      screen.getByRole("list", { name: "Today’s verified priorities" }),
    ).toHaveClass("lg:grid-cols-2");
    fireEvent.click(screen.getByRole("button", { name: "Refresh briefing" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("uses neutral copy instead of zero or calm claims under partial coverage", () => {
    mocks.state = state();
    render(
      <StudioBriefingHero
        overview={{
          ...overview,
          coverage: {
            available: ["tasks"],
            unavailable: [{ source: "bookings" }],
            complete: false,
          },
          flow: [
            { key: "booked", value: null, available: false },
            { key: "readyToFire", value: null, available: false },
          ],
          attention: [],
        }}
      />,
    );

    expect(
      screen.getByText("Here’s what we can verify right now."),
    ).toBeVisible();
    expect(screen.getByText(/unknown values stay unknown/)).toBeVisible();
    expect(
      screen.getByText("Some priorities may be unavailable"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Priority coverage",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { level: 3, name: "All clear" }),
    ).toBeNull();
    expect(screen.queryByText("Your studio is running smoothly.")).toBeNull();
  });

  it("uses one all-clear headline and one dated schedule action", () => {
    const { container } = render(
      <StudioBriefingHero
        overview={{
          ...overview,
          attention: [],
          today: { available: true, schedule: [] },
        }}
      />,
    );
    const hero = container.querySelector("[data-studio-briefing-hero]");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your studio is running smoothly.",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Nothing needs immediate action.")).toBeNull();
    expect(screen.queryByText(/8 bookings/)).toBeNull();
    expect(hero).toHaveAttribute("data-briefing-state", "all-clear");
    expect(hero.querySelector("[data-attention-density]")).toBeNull();
    expect(
      screen.getByRole("link", { name: "View today’s schedule" }),
    ).toHaveAttribute("href", "/app/calendar?date=2026-08-03");
    expect(
      screen.getByRole("link", { name: "View today’s schedule" }),
    ).toHaveAttribute("data-briefing-primary-action", "schedule");
    expect(
      screen.queryByRole("link", { name: "Review priorities" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: "Needs your attention",
      }),
    ).toBeNull();
    expect(screen.getByText("Studio briefing")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Generate AI briefing" }),
    ).toBeVisible();

    const brush = hero.querySelector(
      '[data-workspace-brush-field="overviewHero"]',
    );
    expect(brush).toHaveAttribute("aria-hidden", "true");
    expect(brush).toHaveClass("pointer-events-none", "z-0");
    expect(hero.querySelector("[data-briefing-readability-scrim]")).toHaveClass(
      styles.briefingScrim,
    );
    expect(hero).toHaveClass(styles.card, styles.briefing);
  });

  it("uses a dated schedule action without today-only copy for another date", () => {
    mocks.state = state({ isToday: false });

    render(
      <StudioBriefingHero
        overview={{
          ...overview,
          attention: [],
          today: { available: true, schedule: [] },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View schedule" })).toHaveAttribute(
      "href",
      "/app/calendar?date=2026-08-03",
    );
    expect(screen.queryByText(/Today:/i)).not.toBeInTheDocument();
  });

  it("keeps an expanded attention pane and review action for active priorities", () => {
    const { container } = render(<StudioBriefingHero overview={overview} />);
    const hero = container.querySelector("[data-studio-briefing-hero]");

    expect(hero).toHaveAttribute("data-briefing-state", "attention");
    expect(
      hero.querySelector('[data-attention-density="expanded"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review priorities" }),
    ).toHaveAttribute("data-briefing-primary-action", "review");
  });

  it("omits an unverified booking count instead of rendering a malformed summary", () => {
    render(
      <StudioBriefingHero
        overview={{
          ...overview,
          attention: [],
          flow: [{ key: "booked", value: 8, available: false }],
        }}
      />,
    );

    expect(
      screen.getByText(
        "Booking counts are not fully available. Unverified values are omitted.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/undefined|null/)).toBeNull();
    expect(screen.queryByText(/pieces ready to fire/)).toBeNull();
  });

  it("keeps dense priorities and attention items available in the compact desktop hero", () => {
    mocks.state = state({
      briefing: {
        headline:
          "Three carefully verified priorities before the studio opens this morning",
        summary:
          "Start with the customer conversation, then review the firing queue and restore the low-stock materials before the first session begins.",
        locale: "en",
        dateKey: "2026-08-03",
        sourceCount: 7,
        generatedAt: "2026-08-03T07:30:00.000Z",
        provenance: { provider: "openai" },
        freshness: { state: "fresh" },
        attention: [
          {
            id: "customer",
            description: "Review the urgent customer conversation.",
            href: "/app/communications?section=inbox",
          },
          {
            id: "firing",
            description: "Confirm the next firing queue.",
            href: "/app/firings",
          },
          {
            id: "inventory",
            description: "Restore the low-stock materials.",
            href: "/app/operations?section=inventory",
          },
        ],
      },
    });
    const denseAttention = [
      {
        key: "unpaidBookings",
        count: 3,
        available: true,
        href: "/app/bookings",
      },
      {
        key: "completedFiringsAwaitingNotification",
        count: 2,
        available: true,
        href: "/app/firings",
      },
      {
        key: "readyForPickup",
        count: 4,
        available: true,
        href: "/app/firings?section=items",
      },
      {
        key: "lowStock",
        count: 5,
        available: true,
        href: "/app/operations?section=inventory",
      },
    ];

    const { container } = render(
      <StudioBriefingHero
        overview={{ ...overview, attention: denseAttention }}
      />,
    );

    const hero = container.querySelector("[data-studio-briefing-hero]");
    const headline = screen.getByRole("heading", {
      level: 2,
      name: /Three carefully verified priorities/,
    });
    const priorityList = screen.getByRole("list", {
      name: "Today’s verified priorities",
    });

    expect(hero).toBeInTheDocument();
    expect(headline).toHaveClass("break-words");
    expect(headline).not.toHaveClass("line-clamp-2");
    expect(priorityList).toHaveClass("lg:grid-cols-3");
    expect(within(priorityList).getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getByText("Review the urgent customer conversation."),
    ).toBeVisible();
    expect(screen.getByText("Confirm the next firing queue.")).toBeVisible();
    expect(screen.getByText("Restore the low-stock materials.")).toBeVisible();
    expect(screen.getByText("unpaid bookings")).toBeVisible();
    expect(
      screen.getByText("firings awaiting customer notification"),
    ).toBeVisible();
    expect(screen.getByText("pieces ready for pickup")).toBeVisible();
    expect(screen.getByText("low-stock items")).toBeVisible();
    expect(screen.getByRole("link", { name: "Review priorities" })).toHaveClass(
      styles.action,
    );
    expect(
      screen.getByRole("button", { name: "Refresh briefing" }),
    ).toHaveClass(styles.action);
  });
});

describe("StudioBriefingHero localized copy", () => {
  it.each([
    [
      "English",
      "en",
      messagesEn,
      { bookings: 1, ready: 2, attention: 0 },
      "All clear",
      "Priority coverage",
      ["1 booking"],
      /\bToday\b/i,
    ],
    [
      "Czech",
      "cs",
      messagesCs,
      { bookings: 1, ready: 2, attention: 5 },
      "Vše v pořádku",
      "Pokrytí priorit",
      ["1 rezervace", "5"],
      /\bDnes\b/i,
    ],
  ])(
    "keeps the %s all-clear and count summary grammatical",
    (
      _label,
      locale,
      catalog,
      values,
      clearHeading,
      partialHeading,
      summaryFragments,
      todayPattern,
    ) => {
      const copy = catalog.Dashboard.overview;

      expect(copy.attention.clearHeading).toBe(clearHeading);
      expect(copy.attention.partialHeading).toBe(partialHeading);
      expect(copy.briefing.countsUnavailableSummary).toEqual(
        expect.any(String),
      );
      expect(copy.briefing.countsUnavailableSummary).not.toMatch(todayPattern);

      return vi.importActual("next-intl").then(({ createTranslator }) => {
        const t = createTranslator({ locale, messages: catalog });

        const summary = t(
          "Dashboard.overview.briefing.deterministicSummary",
          values,
        );

        for (const fragment of summaryFragments) {
          expect(summary).toContain(fragment);
        }
        expect(summary).not.toMatch(todayPattern);
      });
    },
  );
});
