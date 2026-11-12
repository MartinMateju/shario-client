import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeLocationId: "65b28f3d94e7a61c74f0a002",
  canUpdateWorkspace: true,
  locale: "en",
  overviewHasData: true,
  overviewHasCurrentData: true,
  overviewIsError: false,
  overviewIsFetching: false,
  overviewIsLoading: false,
  pathname: "/app",
  queryArgs: null,
  routerReplace: vi.fn(),
  searchParams: new URLSearchParams(),
  setupIsError: false,
  setupIsLoading: false,
  setupQueryOptions: null,
  stripeProps: null,
  updatePreferences: vi.fn(),
  setup: {
    phase: "launch",
    progress: { completed: 1, percentage: 25, total: 4 },
    recommendations: [],
    steps: [
      {
        id: "payments",
        applicable: true,
        requirement: "required",
        status: "incomplete",
      },
    ],
  },
  state: {
    auth: {
      tenant: {
        modules: {
          staff_tasks: true,
        },
      },
      workspaceAccess: {
        effectivePermissions: ["*"],
        permissions: ["*"],
        preferences: {},
        role: "owner",
        status: "active",
      },
      userInfo: {
        tenantId: "65b28f3d94e7a61c74f0a001",
      },
    },
    studioContext: {
      activeStudioId: "65b28f3d94e7a61c74f0a002",
      tenantId: "65b28f3d94e7a61c74f0a001",
    },
  },
  response: {
    metadata: {
      date: "2026-07-30",
      timezone: "Europe/Prague",
      generatedAt: "2026-07-30T08:42:00.000Z",
      locationId: "location-1",
      locationIds: ["location-1"],
      currency: "CZK",
    },
    coverage: {
      available: ["bookings", "firings", "inventory", "reports"],
      unavailable: [],
      limitations: [],
      complete: true,
    },
    milestones: {
      firstCustomerBooking: {
        applicable: true,
        available: true,
        achieved: false,
      },
    },
    today: {
      available: true,
      schedule: [
        {
          id: "booking-1",
          title: "Wheel course",
          productType: "course",
          start: "2026-07-30T08:00:00.000Z",
          end: "2026-07-30T10:00:00.000Z",
          locationName: "Studio Olivka",
          participantCount: 4,
          capacity: 6,
        },
      ],
    },
    flow: [
      {
        key: "booked",
        value: 18,
        unit: "bookings",
        available: true,
        href: "/app/bookings",
      },
      {
        key: "readyToFire",
        value: 12,
        unit: "pieces",
        available: true,
        href: "/app/firings?section=items",
      },
      {
        key: "readyForPickup",
        value: 0,
        unit: "pieces",
        available: true,
        href: "/app/firings?section=items",
      },
    ],
    attention: [
      {
        key: "lowStock",
        count: 1,
        available: true,
        severity: "warning",
        href: "/app/operations?section=inventory",
      },
    ],
    businessPulse: {
      occupancy: { available: true, value: 72, unit: "percent" },
      revenue: { available: true, valueMinor: 1840000, currency: "CZK" },
      bookings: { available: true, value: 14 },
      newCustomers: { available: true, value: 3 },
      series: {
        available: true,
        key: "utilization",
        points: [
          { label: "Mon", value: 40 },
          { label: "Tue", value: 65 },
          { label: "Wed", value: 58 },
        ],
      },
    },
    signals: {
      messages: {
        available: true,
        unreadCount: 1,
        items: [
          {
            id: "conversation-1",
            subject: "Glazing question",
            contactName: "Ada",
            preview: "Can I collect it tomorrow?",
            lastMessageAt: "2026-07-30T07:30:00.000Z",
            unreadCount: 1,
          },
        ],
      },
      tasks: {
        available: true,
        openCount: 1,
        items: [
          {
            id: "task-1",
            title: "Unload kiln",
            assigneeName: "Martin",
            priority: "urgent",
            dueDate: "2026-07-30T08:00:00.000Z",
          },
        ],
      },
    },
    opportunity: {
      available: true,
      key: "lowOccupancy",
      value: 35,
      href: "/app/products?action=create",
      actionKey: "createOffer",
      source: "deterministic",
    },
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const labels = {
        context: `${values.date} · Studio context`,
        dateLabel: "Overview date",
        eyebrow: "Living studio overview",
        "snapshot.title": "At a glance",
        "snapshot.bookings": "Bookings",
        "snapshot.expectedVisitors": "Expected visitors",
        "snapshot.actionablePieces": "Pieces requiring action",
        "snapshot.revenue": "Revenue",
        "snapshot.date": "Selected date",
        "snapshot.unavailable": "Unavailable",
        "snapshot.live": "Live",
        "snapshot.currentState": "Current",
        "dateNavigation.previousDay": "Previous day",
        "dateNavigation.nextDay": "Next day",
        "dateNavigation.today": "Today",
        "dateNavigation.backToToday": "Back to today",
        "dateNavigation.chooseDate": "Choose date",
        "error.description": "Overview data could not be loaded.",
        "error.retry": "Retry",
        "flow.title": "Studio operations",
        "flow.description": "Customers and pieces in one live view.",
        "flow.emptyTitle": "No studio activity is scheduled yet",
        "flow.emptyDescriptionAll": `No activity on ${values.date}`,
        "flow.emptyDescriptionSelected": `No activity on ${values.date}`,
        "flow.openCalendar": "Open calendar",
        "flow.dateUnavailable": "Selected date",
        "flow.allLocations": "All studios",
        "flow.selectedLocation": "Selected studio",
        "flow.groups.visits.title": "Bookings & attendance",
        "flow.groups.visits.description": "Selected-day plan and live presence",
        "flow.groups.pieces.title": "Pieces",
        "flow.groups.pieces.description": "Piece flow",
        "flow.stageCount": `${values.stage}: ${values.count}`,
        "flow.stageUnavailable": `${values.stage}: unavailable`,
        "flow.stages.booked": "Booked",
        "flow.stages.arriving": "Arriving",
        "flow.stages.inStudio": "In studio",
        "flow.stages.readyToFire": "Ready to fire",
        "flow.stages.inKiln": "In kiln",
        "flow.stages.readyForPickup": "Ready for pickup",
        "rhythm.title": "Today’s rhythm",
        "pulse.title": "Business pulse",
        "pulse.occupancy": "occupancy",
        "pulse.revenue": "today",
        "pulse.bookings": "bookings",
        "pulse.newCustomers": "new customers",
        "attention.title": "Needs your attention",
        "attention.items.lowStock": "low-stock items",
        "signals.messages.title": "Recent messages",
        "signals.messages.count": `${values.count} unread conversation`,
        "signals.messages.empty": "No recent messages",
        "signals.messages.untitled": "Customer conversation",
        "signals.messages.noPreview": "No preview",
        "signals.tasks.title": "Upcoming tasks",
        "signals.tasks.count": `${values.count} open task`,
        "signals.tasks.empty": "No upcoming tasks",
        "signals.tasks.untitled": "Studio task",
        "signals.tasks.unassigned": "Unassigned",
        "signals.tasks.priorities.urgent": "Urgent",
        "signals.open": "Open",
        "signals.unavailable": "Unavailable",
        "opportunity.eyebrow": "Business Advisor",
        "opportunity.items.lowOccupancy": `${values.value}% occupancy`,
        "opportunity.courseFallback": "This course",
        "opportunity.weekdays.saturday": "Saturday",
        "opportunity.items.repeatedCourseSaturation":
          `${values.course} averages ${values.value}% capacity on ` +
          `${values.day} at ${values.time}`,
        "opportunity.evidence": `Based on ${values.sessions} high-fill sessions`,
        "opportunity.actions.reviewCourseCapacity": "Review capacity",
        "firstBooking.title": "Your first booking is here",
        "firstBooking.description":
          "Your Overview will now start showing real studio activity and insights.",
        "firstBooking.dismiss": "Dismiss first booking celebration",
      };

      const resolvedKey =
        namespace === "Dashboard.overview.firstBooking"
          ? `firstBooking.${key}`
          : key;

      return labels[resolvedKey] || key;
    },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.studioContext.activeStudioId,
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: { WORKSPACE_UPDATE: "workspace:update" },
  hasPermission: () => mocks.canUpdateWorkspace,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.routerReplace }),
}));

vi.mock("@/components/setup-center/SetupCenterWidget", () => ({
  default: ({ onDismiss, presentation, setup } = {}) => {
    if (
      mocks.state.auth.workspaceAccess.preferences
        ?.overviewLaunchCenterDismissed
    ) {
      return null;
    }

    const snapshot = setup ?? mocks.setup;
    const resolvedPresentation =
      presentation ??
      (Number(snapshot?.progress?.percentage) >= 100 ? "compact" : "guided");

    return (
      <section
        data-testid="setup-center-widget"
        data-setup-center-presentation={resolvedPresentation}
      >
        Setup center
        {onDismiss ? (
          <button type="button" onClick={onDismiss}>
            Dismiss setup center
          </button>
        ) : null}
      </section>
    );
  },
}));

vi.mock("@/components/dashboard/StripeConnectSetupBanner", () => ({
  default: (props) => {
    mocks.stripeProps = props;
    return <aside data-testid="stripe-connect-banner" />;
  },
}));

vi.mock("@/components/dashboard/overview/StudioBriefingHero", () => ({
  default: () => {
    const inventoryHref = "/app/operations?section=inventory";

    return (
      <section data-studio-briefing-hero>
        <p>Studio briefing</p>
        <a href={inventoryHref}>low-stock items</a>
      </section>
    );
  },
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: (_args, options) => {
    mocks.setupQueryOptions = options;
    return {
      currentData: mocks.setup,
      data: mocks.setup,
      isError: mocks.setupIsError,
      isLoading: mocks.setupIsLoading,
      isSuccess: !mocks.setupIsError && !mocks.setupIsLoading,
    };
  },
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  default: ({ fallback }) => fallback,
  useAiAccess: () => ({
    available: false,
    cacheScope: "workspace",
    canReadCached: false,
  }),
}));

vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    available: false,
    openAssistant: vi.fn(),
  }),
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGenerateAiBriefingMutation: () => [
    vi.fn(),
    { isError: false, isLoading: false, reset: vi.fn() },
  ],
  useGetLatestAiBriefingQuery: () => ({
    currentData: null,
    isError: false,
    isFetching: false,
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [
    (body) => {
      mocks.updatePreferences(body);
      return { unwrap: () => Promise.resolve({}) };
    },
  ],
}));

vi.mock("@/lib/features/dashboard/dashboardApiSlice", () => ({
  useGetDashboardOverviewQuery: (args) => {
    mocks.queryArgs = args;
    return {
      currentData: mocks.overviewHasCurrentData ? mocks.response : null,
      data: mocks.overviewHasData ? mocks.response : null,
      isFetching: mocks.overviewIsFetching,
      isLoading: mocks.overviewIsLoading,
      isError: mocks.overviewIsError,
      refetch: vi.fn(),
    };
  },
}));

import DashboardOverview from "@/components/dashboard/DashboardOverview";
import { getLocalDateKey } from "@/components/dashboard/overview/overview.utils";

describe("DashboardOverview", () => {
  beforeEach(() => {
    mocks.canUpdateWorkspace = true;
    mocks.locale = "en";
    mocks.overviewHasData = true;
    mocks.overviewHasCurrentData = true;
    mocks.overviewIsError = false;
    mocks.overviewIsFetching = false;
    mocks.overviewIsLoading = false;
    mocks.pathname = "/app";
    mocks.queryArgs = null;
    mocks.routerReplace.mockReset();
    mocks.searchParams = new URLSearchParams();
    mocks.setupIsError = false;
    mocks.setupIsLoading = false;
    mocks.setupQueryOptions = null;
    mocks.stripeProps = null;
    mocks.updatePreferences.mockReset();
    mocks.response.milestones = {
      firstCustomerBooking: {
        applicable: true,
        available: true,
        achieved: false,
      },
    };
    mocks.setup = {
      phase: "launch",
      progress: { completed: 1, percentage: 25, total: 4 },
      recommendations: [],
      steps: [
        {
          id: "payments",
          applicable: true,
          requirement: "required",
          status: "incomplete",
        },
      ],
    };
    mocks.state.auth.workspaceAccess = {
      effectivePermissions: ["*"],
      permissions: ["*"],
      preferences: {},
      role: "owner",
      status: "active",
    };
    mocks.state.auth.tenant.modules = { staff_tasks: true };
    delete mocks.state.auth.tenant.settings;
    mocks.response.opportunity = {
      available: true,
      key: "lowOccupancy",
      value: 35,
      href: "/app/products?action=create",
      actionKey: "createOffer",
      source: "deterministic",
    };
  });

  it("renders operational values and scopes the request to the selected location", () => {
    const { container } = render(<DashboardOverview />);

    expect(mocks.queryArgs).toMatchObject({
      locationId: mocks.activeLocationId,
    });
    expect(
      container.querySelector('[data-workspace-brush-field="overviewHero"]'),
    ).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Studio operations")).toBeInTheDocument();
    expect(container.querySelector("[data-overview-snapshot]")).toBeNull();
    expect(
      container.querySelectorAll("[data-overview-snapshot-metric]"),
    ).toHaveLength(0);
    expect(
      screen.getByRole("link", { name: "Bookings: 18 · Selected date" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Ready to fire: 12" }),
    ).toBeNull();
    expect(screen.getByText("Wheel course")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.queryByText("Glazing question")).not.toBeInTheDocument();
    expect(screen.getByText("Unload kiln")).toBeInTheDocument();
    expect(screen.getByText("35% occupancy")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /low-stock items/i }),
    ).toHaveAttribute("href", "/app/operations?section=inventory");
  });

  it("celebrates the first real booking once and persists dismissal", () => {
    mocks.response.milestones.firstCustomerBooking.achieved = true;

    const { container } = render(<DashboardOverview />);
    const operations = container.querySelector("[data-studio-flow-rail]");
    const celebration = screen
      .getByRole("heading", { name: "Your first booking is here" })
      .closest("section");

    expect(
      screen.getByRole("heading", { name: "Your first booking is here" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your Overview will now start showing real studio activity and insights.",
      ),
    ).toBeInTheDocument();
    expect(operations).not.toBeNull();
    expect(celebration).not.toBeNull();
    expect(
      operations.compareDocumentPosition(celebration) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss first booking celebration",
      }),
    );

    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      firstBookingCelebrationSeen: true,
    });
    expect(
      screen.queryByRole("heading", { name: "Your first booking is here" }),
    ).not.toBeInTheDocument();
  });

  it("does not celebrate a date-scoped booking count without the milestone", () => {
    mocks.response.milestones.firstCustomerBooking.available = false;
    mocks.response.milestones.firstCustomerBooking.achieved = null;

    render(<DashboardOverview />);

    expect(
      screen.getByRole("link", { name: "Bookings: 18 · Selected date" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Your first booking is here" }),
    ).not.toBeInTheDocument();
  });

  it("makes briefing the first card with studio operations directly below", () => {
    const { container } = render(<DashboardOverview />);

    const operations = container.querySelector("[data-studio-flow-rail]");
    const briefing = screen.getByText("Studio briefing").closest("section");
    const loadedStack = briefing?.parentElement;

    expect(
      screen.queryByText("Living studio overview"),
    ).not.toBeInTheDocument();
    expect(container.querySelector("[data-overview-toolbar]")).toBeNull();
    expect(container.querySelector("[data-overview-snapshot]")).toBeNull();
    expect(briefing).not.toBeNull();
    expect(operations).not.toBeNull();
    expect(loadedStack?.firstElementChild).toBe(briefing);
    expect(briefing?.nextElementSibling).toBe(operations);
    expect(operations).toContainElement(screen.getByLabelText("Overview date"));
  });

  it("renders a qualified Business Advisor recommendation with evidence", () => {
    mocks.response.opportunity = {
      available: true,
      key: "repeatedCourseSaturation",
      value: 96.7,
      href: "/app/products?category=classesEvents",
      actionKey: "reviewCourseCapacity",
      source: "deterministic",
      details: {
        courseName: "Saturday wheel",
        weekdayKey: "saturday",
        localStartTime: "18:00",
        highFillSessionCount: 4,
      },
    };

    render(<DashboardOverview />);

    expect(
      screen.getByText(
        "Saturday wheel averages 96.7% capacity on Saturday at 18:00",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Based on 4 high-fill sessions"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review capacity/i }),
    ).toHaveAttribute("href", "/app/products?category=classesEvents");
  });

  it("keeps guided launch work below the operational foundation and suppresses its duplicate payment reminder", () => {
    const { container } = render(<DashboardOverview />);
    const setup = screen.getByTestId("setup-center-widget");
    const hero = container.querySelector("[data-studio-briefing-hero]");
    const operations = container.querySelector("[data-studio-flow-rail]");

    expect(setup).toHaveAttribute("data-setup-center-presentation", "guided");
    expect(hero).not.toBeNull();
    expect(operations).not.toBeNull();
    expect(hero?.nextElementSibling).toBe(operations);
    expect(
      operations.compareDocumentPosition(setup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: true });
  });

  it("moves launch progress into a compact status after the first setup outcomes", () => {
    mocks.setup = {
      phase: "launch",
      progress: {
        completed: 2,
        percentage: 50,
        total: 4,
        launch: { completed: 2, percentage: 50, total: 4 },
      },
      launchReview: {
        launchComplete: false,
        testBooking: { applicable: true, complete: false },
      },
      recommendations: [],
      steps: [
        {
          id: "payments",
          applicable: true,
          requirement: "required",
          status: "complete",
        },
      ],
    };

    const { container } = render(<DashboardOverview />);
    const setup = screen.getByTestId("setup-center-widget");
    const hero = container.querySelector("[data-studio-briefing-hero]");
    const operations = container.querySelector("[data-studio-flow-rail]");

    expect(setup).toHaveAttribute("data-setup-center-presentation", "compact");
    expect(hero).not.toBeNull();
    expect(operations).not.toBeNull();
    expect(hero?.nextElementSibling).toBe(operations);
    expect(
      operations.compareDocumentPosition(setup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: false });
  });

  it("removes launch guidance from Overview after setup is complete", () => {
    mocks.setup = {
      phase: "learning",
      progress: {
        completed: 4,
        percentage: 100,
        total: 4,
        launch: { completed: 4, percentage: 100, total: 4 },
      },
      launchReview: {
        launchComplete: true,
        testBooking: { applicable: true, complete: true },
      },
      recommendations: [],
      steps: [
        {
          id: "payments",
          applicable: true,
          requirement: "required",
          status: "complete",
        },
      ],
    };

    render(<DashboardOverview />);

    expect(screen.queryByTestId("setup-center-widget")).not.toBeInTheDocument();
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: false });
  });

  it("keeps setup guidance and suppresses its payment duplicate while setup is loading", () => {
    mocks.setup = null;
    mocks.setupIsLoading = true;

    const { container } = render(<DashboardOverview />);
    const setup = screen.getByTestId("setup-center-widget");
    const hero = container.querySelector("[data-studio-briefing-hero]");
    const operations = container.querySelector("[data-studio-flow-rail]");

    expect(setup).toHaveAttribute("data-setup-center-presentation", "guided");
    expect(hero).not.toBeNull();
    expect(operations).not.toBeNull();
    expect(hero?.nextElementSibling).toBe(operations);
    expect(
      operations.compareDocumentPosition(setup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: true });
  });

  it("hides failed setup guidance and restores the independent payment reminder", () => {
    mocks.setupIsError = true;

    render(<DashboardOverview />);

    expect(screen.queryByTestId("setup-center-widget")).not.toBeInTheDocument();
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: false });
  });

  it("keeps a dismissed Launch Center out of the Overview", () => {
    mocks.state.auth.workspaceAccess.preferences = {
      overviewLaunchCenterDismissed: true,
    };

    render(<DashboardOverview />);

    expect(screen.queryByTestId("setup-center-widget")).not.toBeInTheDocument();
    expect(mocks.setupQueryOptions).toEqual(
      expect.objectContaining({ skip: true }),
    );
  });

  it("does not query or show launch controls without workspace update access", () => {
    mocks.canUpdateWorkspace = false;

    render(<DashboardOverview />);

    expect(screen.queryByTestId("setup-center-widget")).not.toBeInTheDocument();
    expect(mocks.setupQueryOptions).toEqual(
      expect.objectContaining({ skip: true }),
    );
  });

  it("removes the Launch Center immediately after a successful local dismissal", () => {
    render(<DashboardOverview />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss setup center" }),
    );

    expect(screen.queryByTestId("setup-center-widget")).not.toBeInTheDocument();
    expect(mocks.setupQueryOptions).toEqual(
      expect.objectContaining({ skip: true }),
    );
    expect(mocks.stripeProps).toMatchObject({ suppressSetupReminder: false });
  });

  it("shows a localized date while retaining an accessible native date input", () => {
    mocks.locale = "cs";
    mocks.searchParams = new URLSearchParams("date=2026-07-30");

    render(<DashboardOverview />);

    expect(screen.getAllByText("30. 7. 2026")).toHaveLength(1);
    expect(screen.getByLabelText("Overview date")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-30");
  });

  it("initializes the overview request from a valid date in the URL", () => {
    mocks.searchParams = new URLSearchParams("date=2026-07-29&view=compact");

    render(<DashboardOverview />);

    expect(mocks.queryArgs).toMatchObject({
      date: "2026-07-29",
      locationId: mocks.activeLocationId,
    });
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-29");
    expect(
      screen.queryByRole("link", { name: "Ready to fire: 12" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Wednesday, July 29, 2026" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Today’s rhythm" }),
    ).not.toBeInTheDocument();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("ignores an invalid date in the URL", () => {
    const today = getLocalDateKey(new Date());
    mocks.searchParams = new URLSearchParams("date=2026-02-29");

    render(<DashboardOverview />);

    expect(mocks.queryArgs).toMatchObject({ date: today });
    expect(screen.getByLabelText("Overview date")).toHaveValue(today);
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("advances the rolling today date after tenant-local midnight", () => {
    vi.useFakeTimers();
    let view;

    try {
      vi.setSystemTime(new Date("2026-08-18T21:59:30.000Z"));
      mocks.state.auth.tenant.settings = { timezone: "Europe/Prague" };
      view = render(<DashboardOverview />);

      expect(mocks.queryArgs).toMatchObject({ date: "2026-08-18" });

      act(() => {
        vi.setSystemTime(new Date("2026-08-18T22:00:30.000Z"));
        vi.advanceTimersByTime(60_000);
      });

      expect(mocks.queryArgs).toMatchObject({ date: "2026-08-19" });
      expect(screen.getByLabelText("Overview date")).toHaveValue("2026-08-19");
    } finally {
      view?.unmount();
      vi.useRealTimers();
    }
  });

  it("preserves unrelated URL state when selecting another date", () => {
    mocks.searchParams = new URLSearchParams("view=compact&date=2026-07-29");
    render(<DashboardOverview />);

    fireEvent.change(screen.getByLabelText("Overview date"), {
      target: { value: "2026-07-31" },
    });

    expect(mocks.queryArgs).toMatchObject({ date: "2026-07-31" });
    expect(mocks.routerReplace).toHaveBeenLastCalledWith(
      "/app?view=compact&date=2026-07-31",
      { scroll: false },
    );
  });

  it("moves to the next day and preserves unrelated URL state", () => {
    mocks.searchParams = new URLSearchParams("view=compact&date=2026-07-29");
    render(<DashboardOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));

    expect(mocks.queryArgs).toMatchObject({ date: "2026-07-30" });
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-30");
    expect(mocks.routerReplace).toHaveBeenLastCalledWith(
      "/app?view=compact&date=2026-07-30",
      { scroll: false },
    );
  });

  it("follows date changes from browser history without rewriting the URL", () => {
    const { rerender } = render(<DashboardOverview />);
    mocks.searchParams = new URLSearchParams("date=2026-07-28");

    rerender(<DashboardOverview />);

    expect(mocks.queryArgs).toMatchObject({ date: "2026-07-28" });
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-28");
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("removes the date parameter when returning to today", () => {
    const today = getLocalDateKey(new Date());
    mocks.searchParams = new URLSearchParams("date=2026-07-29&view=compact");
    render(<DashboardOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));

    expect(mocks.queryArgs).toMatchObject({ date: today });
    expect(screen.getByLabelText("Overview date")).toHaveValue(today);
    expect(mocks.routerReplace).toHaveBeenLastCalledWith("/app?view=compact", {
      scroll: false,
    });
    expect(
      screen.queryByRole("button", { name: "Back to today" }),
    ).not.toBeInTheDocument();
  });

  it("keeps date navigation stable without showing stale overview content", async () => {
    const { container } = render(<DashboardOverview />);

    mocks.overviewHasCurrentData = false;
    mocks.overviewIsFetching = true;
    fireEvent.change(screen.getByLabelText("Overview date"), {
      target: { value: "2026-07-31" },
    });

    expect(mocks.queryArgs).toMatchObject({ date: "2026-07-31" });
    expect(container.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "data-flow-state",
      "loading",
    );
    expect(container.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelector("[data-overview-briefing-loading]"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Bookings: 18 · Selected date" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "View today’s schedule" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-31");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Choose date:/ }),
      ).toHaveFocus(),
    );
  });

  it("keeps date recovery available when a selected date fails", () => {
    mocks.searchParams = new URLSearchParams("date=2026-07-29");
    render(<DashboardOverview />);

    mocks.overviewHasCurrentData = false;
    mocks.overviewIsError = true;
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));

    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-30");
    expect(screen.getByRole("button", { name: "Back to today" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(document.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "data-flow-state",
      "unavailable",
    );
  });

  it("keeps date recovery mounted after a deep-linked date fails initially", async () => {
    mocks.searchParams = new URLSearchParams("date=2026-07-29");
    mocks.overviewHasCurrentData = false;
    mocks.overviewHasData = false;
    mocks.overviewIsError = true;

    render(<DashboardOverview />);

    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-29");
    expect(screen.getByRole("button", { name: "Back to today" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(document.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "data-flow-state",
      "unavailable",
    );

    mocks.overviewIsError = false;
    mocks.overviewIsFetching = true;
    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));

    expect(document.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "data-flow-state",
      "loading",
    );
    expect(screen.getByLabelText("Overview date")).toHaveValue(
      getLocalDateKey(new Date()),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Choose date:/ }),
      ).toHaveFocus(),
    );
  });

  it("keeps the Studio Operations shell when no flow module is enabled", () => {
    mocks.state.auth.tenant.modules = {
      bookings: false,
      courses: false,
      firing: false,
    };

    const { container } = render(<DashboardOverview />);

    expect(container.querySelector("[data-studio-flow-rail]")).toHaveAttribute(
      "data-flow-state",
      "empty",
    );
    expect(screen.getByLabelText("Overview date")).toBeInTheDocument();
    expect(
      screen.getByText("Studio briefing").closest("section")
        ?.nextElementSibling,
    ).toBe(container.querySelector("[data-studio-flow-rail]"));
  });
});
