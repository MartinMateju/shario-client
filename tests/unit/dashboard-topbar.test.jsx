import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/app/bookings",
  search: "",
  aiAvailable: false,
  assistantOpen: false,
  closeAssistant: vi.fn(),
  openAssistant: vi.fn(),
  locale: "en",
  canViewCommunications: true,
  isOwner: true,
  communicationsOverview: { overview: { counts: { unread: 0 } } },
  communicationsPreviousData: null,
  communicationsQueryArgs: null,
  communicationsQueryOptions: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "routeTitles.ai": "Studio AI",
        "routeTitles.bookings": "Bookings",
        "routeTitles.calendar": "Calendar",
        "routeTitles.customers": "Customers",
        "routeTitles.invoices": "Invoices",
        "routeTitles.firings": "Kilns & Firings",
        "routeTitles.memberships": "Memberships",
        "routeTitles.communications": "Communications",
        "routeTitles.notifications": "Notifications",
        "routeTitles.knowledge": "Knowledge Hub",
        "routeTitles.products": "Products & Classes",
        "routeTitles.reports": "Reports",
        "routeTitles.inventory": "Inventory",
        "routeTitles.settings": "Settings",
        "routeTitles.generalSettings": "General settings",
        "routeTitles.payments": "Payments from customers",
        "routeTitles.setup": "Launch Center",
        "nav.overview": "Overview",
        greeting:
          mocks.locale === "cs"
            ? `Vítejte zpět, ${values.name || "uživateli"}`
            : `Welcome back, ${values.name || "there"}`,
        greetingMorning:
          mocks.locale === "cs"
            ? `Dobré ráno, ${values.name || "uživateli"}`
            : `Good morning, ${values.name || "there"}`,
        greetingAfternoon:
          mocks.locale === "cs"
            ? `Dobré odpoledne, ${values.name || "uživateli"}`
            : `Good afternoon, ${values.name || "there"}`,
        greetingEvening:
          mocks.locale === "cs"
            ? `Dobrý večer, ${values.name || "uživateli"}`
            : `Good evening, ${values.name || "there"}`,
        subheading: "Here’s what’s happening across your studio today.",
        openNavigation: "Open dashboard navigation",
        setupCenter: "Launch Center",
        openSetupCenter: "Open Launch Center",
        continueSetup: `Continue launch · ${values.percentage}%`,
        continueSetupLabel: `Continue launching your studio, ${values.percentage}% complete`,
        notifications: "Open notifications",
        notificationsUnread: `Open notifications, ${values.count} unread ${
          values.count === 1 ? "conversation" : "conversations"
        }`,
        fallbackFirstName: mocks.locale === "cs" ? "uživateli" : "there",
        aiAssistant: "AI assistant",
        openAiAssistant: "Open AI assistant",
        "help.open": "Help",
        "help.menuLabel": "Help menu",
        "help.title": "Help",
        "help.close": "Close Help",
        "help.productTour": "Product tour",
        "help.productTourDescription": "Learn the workspace essentials.",
        "help.productTourSection": "Workspace essentials",
        "help.startProductTour": "Start tour",
        "help.replayProductTour": "Replay tour",
        "guides.availableTitle": "Guides to explore",
        "guides.completedTitle": "Completed guides",
        "guides.startGuide": "Start guide",
        "guides.replayGuide": "Replay guide",
        "guides.summary": `${values.completed} of ${values.total} completed`,
      };

      return messages[key] || key;
    },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: () => ({
    role: "owner",
    status: "active",
    preferences: { displayTimezone: "UTC" },
    settings: { timezone: "Asia/Tokyo" },
    modules: { communications: true },
  }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: vi.fn(),
  selectCurrentWorkspaceAccess: vi.fn(),
}));

vi.mock("@/config/permissions", () => ({
  DATA_IMPORT_PERMISSIONS: ["data.import"],
  PERMISSIONS: { COMMUNICATIONS_VIEW: "communications.view" },
  hasPermission: () => mocks.canViewCommunications,
  isWorkspaceOwner: () => mocks.isOwner,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/headers/UserProfileMenu", () => ({
  default: () => (
    <button type="button" aria-label="User menu" data-testid="profile-menu" />
  ),
}));

vi.mock("@/components/notifications/WorkspaceNotificationMenu", () => ({
  default: () => (
    <button
      type="button"
      aria-label="Open notifications"
      data-workspace-notification-trigger
      className="inline-flex h-11 w-11"
    />
  ),
}));

vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    assistantOpen: mocks.assistantOpen,
    available: mocks.aiAvailable,
    closeAssistant: mocks.closeAssistant,
    openAssistant: mocks.openAssistant,
  }),
}));

vi.mock("@/lib/features/communications/communicationsApiSlice", () => ({
  useGetCommunicationsOverviewQuery: (args, options) => {
    mocks.communicationsQueryArgs = args;
    mocks.communicationsQueryOptions = options;

    return {
      currentData: mocks.communicationsOverview,
      data: mocks.communicationsPreviousData ?? mocks.communicationsOverview,
    };
  },
}));

vi.mock("@/components/dashboard/StudioSwitcher", () => ({
  default: ({ studios, tenantId, variant }) => (
    <div
      data-testid="studio-switcher"
      data-tenant-id={tenantId}
      data-studio-count={studios.length}
      data-variant={variant}
    />
  ),
}));

import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import styles from "@/components/dashboard/dashboardShell.module.css";

const createTopbar = (props = {}) => (
  <DashboardTopbar
    firstName="Martin"
    initials="MM"
    studioName="Studio Olivka"
    studios={[{ _id: "studio-1", name: "Studio Olivka" }]}
    activeStudioId="studio-1"
    tenantId="tenant-1"
    canUseProductTour
    onOpenNavigation={vi.fn()}
    {...props}
  />
);

const renderTopbar = (props = {}) => render(createTopbar(props));

describe("DashboardTopbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T08:30:00.000Z"));
    mocks.pathname = "/app/bookings";
    mocks.search = "";
    mocks.aiAvailable = false;
    mocks.assistantOpen = false;
    mocks.closeAssistant.mockReset();
    mocks.openAssistant.mockReset();
    mocks.locale = "en";
    mocks.canViewCommunications = true;
    mocks.isOwner = true;
    mocks.communicationsOverview = { overview: { counts: { unread: 0 } } };
    mocks.communicationsPreviousData = null;
    mocks.communicationsQueryArgs = null;
    mocks.communicationsQueryOptions = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("places the shared studio switcher in the desktop header", () => {
    const { container } = renderTopbar();

    expect(container.querySelector("[data-workspace-topbar]")).toHaveClass(
      styles.topbar,
      "border-line",
    );

    expect(screen.getByTestId("studio-switcher")).toHaveAttribute(
      "data-variant",
      "topbar",
    );
    expect(screen.getByTestId("studio-switcher")).toHaveAttribute(
      "data-tenant-id",
      "tenant-1",
    );
    expect(screen.getByTestId("studio-switcher")).toHaveAttribute(
      "data-studio-count",
      "1",
    );
    expect(container.querySelector("header > div")).toHaveClass(
      "max-w-[1680px]",
      "flex-nowrap",
      "min-w-0",
    );
    expect(container.querySelector("[data-studio-switcher-slot]")).toHaveClass(
      "hidden",
      "lg:block",
      "w-[clamp(220px,22vw,320px)]",
    );
  });

  it("keeps the overview greeting and studio picker in one compact header above decorative brushes", () => {
    mocks.pathname = "/app";
    const { container, rerender } = renderTopbar();
    const header = container.querySelector("[data-workspace-topbar]");
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Good morning, Martin",
    });
    const picker = screen.getByTestId("studio-switcher");
    const brush = container.querySelector(
      '[data-workspace-brush-field="overviewTopbar"]',
    );

    expect(header).toContainElement(heading);
    expect(header).toContainElement(picker);
    expect(
      heading.compareDocumentPosition(picker) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(header).toContainElement(
      screen.getByRole("button", { name: "Open notifications" }),
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("[data-workspace-greeting]")).toBeNull();
    expect(brush).toHaveAttribute("aria-hidden", "true");
    expect(brush).toHaveClass("pointer-events-none", "z-0");
    expect(container.querySelector("[data-workspace-topbar-row]")).toHaveClass(
      "relative",
      "z-10",
    );

    mocks.pathname = "/app/bookings";
    rerender(createTopbar());
    expect(header).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Bookings" }),
    );
    expect(container.querySelector("[data-workspace-brush-field]")).toBeNull();
  });

  it("allows full-width routes to opt out of the centered shell", () => {
    const { container } = renderTopbar({ fullWidth: true });

    expect(container.querySelector("header > div")).not.toHaveClass(
      "max-w-[1680px]",
    );
  });

  it("wires the mobile navigation trigger to its controlled dialog", () => {
    const onOpenNavigation = vi.fn();
    const { rerender } = renderTopbar({
      mobileNavigationId: "workspace-navigation-test",
      navigationOpen: false,
      onOpenNavigation,
    });
    const trigger = screen.getByRole("button", {
      name: "Open dashboard navigation",
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute(
      "aria-controls",
      "workspace-navigation-test",
    );
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveClass(
      "h-11",
      "w-11",
      "touch-manipulation",
      "active:scale-[0.97]",
    );

    fireEvent.click(trigger);
    expect(onOpenNavigation).toHaveBeenCalledTimes(1);

    rerender(
      createTopbar({
        mobileNavigationId: "workspace-navigation-test",
        navigationOpen: true,
        onOpenNavigation,
      }),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps Launch Center out of the global command header", () => {
    renderTopbar();

    expect(screen.queryByRole("link", { name: /Launch Center/i })).toBeNull();
    expect(screen.queryByText(/Continue launch/i)).toBeNull();
  });

  it("keeps mobile context and commands clear at narrow widths", () => {
    mocks.aiAvailable = true;
    const { container } = renderTopbar();

    const actionRow = container.querySelector("header > div");
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Bookings",
    });
    const help = screen.getByRole("button", { name: "Help" });
    const notifications = screen.getByRole("button", {
      name: "Open notifications",
    });
    const ai = screen.getByRole("button", { name: "Open AI assistant" });
    const profile = screen.getByRole("button", { name: "User menu" });
    const profileWrapper = profile.parentElement;
    const navigation = screen.getByRole("button", {
      name: "Open dashboard navigation",
    });
    const mobileTitle = container.querySelector("[data-mobile-topbar-title]");

    expect(actionRow).toHaveClass("min-h-16", "px-3", "md:min-h-[72px]");
    expect(heading.parentElement.parentElement).toHaveClass(
      "min-w-0",
      "flex-1",
    );
    expect(heading).toHaveAttribute("aria-label", "Bookings");
    expect(mobileTitle).toHaveTextContent("Bookings");
    expect(mobileTitle).toHaveClass("block", "truncate", "md:hidden");
    expect(help).toHaveClass(
      "inline-flex",
      "h-11",
      "w-11",
      "touch-manipulation",
    );
    expect(ai).toHaveAttribute("data-product-tour-target", "ai-assistant");
    expect(ai).toHaveClass(
      "inline-flex",
      "h-11",
      "w-11",
      "touch-manipulation",
      "active:scale-[0.97]",
    );
    expect(ai).toHaveClass(styles.utilityButton, styles.aiButton);
    expect(ai).not.toHaveClass("md:hover:-translate-y-0.5");
    expect(ai).not.toHaveClass("hover:-translate-y-0.5");
    const aiTooltip = ai.querySelector("[data-topbar-tooltip]");
    expect(aiTooltip).toHaveTextContent("AI assistant");
    expect(aiTooltip).toHaveAttribute("aria-hidden", "true");
    expect(aiTooltip).toHaveClass("hidden", "md:block");
    expect(notifications).toHaveClass("inline-flex", "h-11", "w-11");
    expect(profileWrapper).toHaveClass("block", "shrink-0");
    expect(profileWrapper).not.toHaveClass("hidden", "md:block");

    for (const [current, next] of [
      [navigation, help],
      [help, notifications],
      [notifications, ai],
      [ai, profile],
    ]) {
      expect(
        current.compareDocumentPosition(next) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    fireEvent.click(ai);
    expect(mocks.openAssistant).toHaveBeenCalledTimes(1);
  });

  it("replays the tour from the Help menu", async () => {
    vi.useRealTimers();
    renderTopbar();

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    const helpDialog = await screen.findByRole("dialog", { name: "Help" });
    expect(
      helpDialog.querySelector('[data-dialog-layout="drawer"]'),
    ).toHaveAttribute("data-workspace-guide-center");
    expect(mocks.closeAssistant).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("link", { name: /Product tour/ }),
    ).toHaveAttribute("href", "/app?productTour=1");
  });

  it("keeps Help available while hiding an ineligible setup tour", async () => {
    vi.useRealTimers();
    renderTopbar({ canUseProductTour: false });

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(
      await screen.findByRole("dialog", { name: "Help" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Product tour/ }),
    ).not.toBeInTheDocument();
  });

  it("closes Help when the AI drawer opens", async () => {
    vi.useRealTimers();
    const view = renderTopbar();

    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    await screen.findByRole("dialog", { name: "Help" });

    mocks.assistantOpen = true;
    view.rerender(createTopbar());

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Help" }),
      ).not.toBeInTheDocument();
    });
  });

  it("truncates long overview greetings without widening the utility bar", () => {
    mocks.pathname = "/app";
    renderTopbar({
      firstName:
        "Martin With an Exceptionally Long Name That Must Not Widen the Header",
    });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("min-w-0", "truncate");
    expect(heading.closest("[data-workspace-topbar]")).not.toBeNull();
  });

  it("capitalizes lowercase names in English greetings", () => {
    mocks.pathname = "/app";
    renderTopbar({ firstName: "martin" });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good morning, Martin",
      }),
    ).toBeInTheDocument();
  });

  it("uses the Czech vocative without a trailing full stop", () => {
    mocks.pathname = "/app";
    mocks.locale = "cs";
    renderTopbar({ firstName: "martin" });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Dobré ráno, Martine",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dobré ráno, Martine.")).toBeNull();
  });

  it("preserves the localized fallback when a first name is unavailable", () => {
    mocks.pathname = "/app";
    renderTopbar({ firstName: "" });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good morning, there",
      }),
    ).toBeInTheDocument();
  });

  it("exposes the tenant notification centre independently of conversations", () => {
    mocks.communicationsOverview = {
      overview: { counts: { unread: 7 } },
    };
    renderTopbar();

    expect(
      screen.getByRole("button", { name: "Open notifications" }),
    ).toHaveAttribute("data-workspace-notification-trigger");
    expect(mocks.communicationsQueryArgs).toBeNull();
    expect(mocks.communicationsQueryOptions).toBeNull();
  });

  it("uses the compact section title on Bookings", () => {
    renderTopbar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Bookings" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Here’s what’s happening across your studio today."),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["/app/setup", "Launch Center"],
    ["/app/ai", "Studio AI"],
    ["/app/calendar", "Calendar"],
    ["/app/users", "Customers"],
    ["/app/products", "Products & Classes"],
    ["/app/memberships", "Products & Classes"],
    ["/app/communications", "Communications"],
    ["/app/notifications", "Notifications"],
    ["/app/knowledge", "Knowledge Hub"],
    ["/app/settings", "Settings"],
    ["/app/settings/general", "General settings"],
  ])("uses the compact section title for %s", (pathname, title) => {
    mocks.pathname = pathname;
    renderTopbar();

    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Here’s what’s happening across your studio today."),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["/app/bookings/booking-123", "Bookings"],
    ["/app/finance/invoices", "Invoices"],
    ["/app/settings/payments", "Payments from customers"],
  ])("uses the parent section title for nested route %s", (pathname, title) => {
    mocks.pathname = pathname;
    renderTopbar();

    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Here’s what’s happening across your studio today."),
    ).not.toBeInTheDocument();
  });

  it("uses the active operations section title", () => {
    mocks.pathname = "/app/operations";
    mocks.search = "section=statistics";
    renderTopbar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeInTheDocument();
  });

  it("uses the inventory title for the direct Inventory navigation entry", () => {
    mocks.pathname = "/app/operations";
    mocks.search = "section=inventory";
    renderTopbar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Inventory" }),
    ).toBeInTheDocument();
  });

  it("retains the greeting treatment on the overview", () => {
    mocks.pathname = "/app";
    renderTopbar();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good morning, Martin",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Here’s what’s happening across your studio today."),
    ).toBeInTheDocument();
    const timeIcon = document.querySelector('[data-dashboard-icon="time"]');

    expect(timeIcon).toHaveAttribute("data-time-icon", "sun");
    expect(timeIcon.querySelector("svg")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good morning, Martin",
      }),
    ).not.toHaveClass("flex-1");
    expect(timeIcon.parentElement).toHaveClass("flex", "items-center", "gap-2");
    expect(timeIcon).not.toHaveTextContent("☀️");
    expect(timeIcon).toHaveAttribute("aria-hidden", "true");
    expect(timeIcon).not.toHaveAttribute("role");
    expect(timeIcon).not.toHaveAttribute("title");
  });

  it("uses neutral server markup before the mounted clock is available", () => {
    mocks.pathname = "/app";

    const markup = renderToString(createTopbar());

    expect(markup).toContain("Welcome back, Martin");
    expect(markup).not.toContain("☀️");
    expect(markup).not.toContain("🌙");
    expect(markup).not.toContain('data-dashboard-icon="time"');
    expect(markup).not.toContain("Studio greeting");
    expect(markup).not.toContain("Good morning, Martin");
  });

  it.each([
    ["2026-08-03T04:59:00.000Z", "Welcome back, Martin", "moon"],
    ["2026-08-03T05:00:00.000Z", "Good morning, Martin", "sun"],
    ["2026-08-03T12:00:00.000Z", "Good afternoon, Martin", "sun"],
    ["2026-08-03T18:00:00.000Z", "Good evening, Martin", "moon"],
    ["2026-08-03T22:00:00.000Z", "Welcome back, Martin", "moon"],
  ])("uses the correct greeting and icon at %s", (instant, greeting, icon) => {
    mocks.pathname = "/app";
    vi.setSystemTime(new Date(instant));

    const { container } = renderTopbar();
    const timeIcon = container.querySelector('[data-dashboard-icon="time"]');

    expect(
      screen.getByRole("heading", { level: 1, name: greeting }),
    ).toBeInTheDocument();
    expect(timeIcon).toHaveAttribute("data-time-icon", icon);
    expect(timeIcon.querySelector("svg")).toBeInTheDocument();
    expect(timeIcon).toHaveAttribute("aria-hidden", "true");
  });

  it("refreshes the greeting when the page becomes visible", () => {
    mocks.pathname = "/app";
    vi.setSystemTime(new Date("2026-08-03T17:59:30.000Z"));
    renderTopbar();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good afternoon, Martin",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-dashboard-icon="time"]'),
    ).toHaveAttribute("data-time-icon", "sun");

    vi.setSystemTime(new Date("2026-08-03T18:00:30.000Z"));
    fireEvent(document, new Event("visibilitychange"));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good evening, Martin",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-dashboard-icon="time"]'),
    ).toHaveAttribute("data-time-icon", "moon");
  });

  it("refreshes the greeting on the next minute boundary", () => {
    mocks.pathname = "/app";
    vi.setSystemTime(new Date("2026-08-03T17:59:30.000Z"));
    renderTopbar();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good afternoon, Martin",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-dashboard-icon="time"]'),
    ).toHaveAttribute("data-time-icon", "sun");

    act(() => {
      vi.advanceTimersByTime(30_100);
    });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Good evening, Martin",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-dashboard-icon="time"]'),
    ).toHaveAttribute("data-time-icon", "moon");
  });
});
