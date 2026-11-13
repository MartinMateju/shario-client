import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/app",
  search: "",
  tenant: {
    modules: {
      bookings: true,
      payments: true,
      customers: true,
      memberships: true,
      firing: true,
      inventory: true,
      staff_tasks: true,
      communications: true,
      ai: true,
    },
    settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
  },
  workspaceAccess: {
    role: "owner",
    status: "active",
  },
}));

const labels = {
  sidebarLabel: "Studio management",
  settingsNavigationLabel: "Workspace settings",
  utilityNavigationLabel: "Studio setup and settings",
  expandGroup: "Expand {group}",
  collapseGroup: "Collapse {group}",
  expandSidebar: "Expand studio navigation",
  collapseSidebar: "Collapse studio navigation",
  setupCenter: "Launch Center",
  openSetupCenter: "Open Launch Center",
  launchCenterRequiredProgress:
    "{completed} of {total} required steps complete",
  launchCenterLiveBadge: "Live",
  launchCenterReadyBadge: "Ready",
  launchCenterIssueBadge: "{count} issue",
  launchCenterLiveStatus: "Public studio is live and launch checks are clear",
  launchCenterReadyStatus: "Operational launch setup is ready",
  launchCenterAttentionStatus: "{count} launch issue requires attention",
  "nav.overview": "Overview",
  "nav.bookings": "Bookings",
  "nav.calendar": "Calendar",
  "nav.allBookings": "All bookings",
  "nav.coursesEvents": "Courses & events",
  "nav.customers": "Customers",
  "nav.studio": "Studio",
  "nav.firing": "Kilns & Firings",
  "nav.lostFound": "Lost & Found",
  "nav.studioFlow": "Kilns & Firings",
  "nav.inventory": "Inventory",
  "nav.staffPlanning": "Staff planning",
  "nav.knowledge": "Knowledge Hub",
  "nav.sales": "Sales",
  "nav.salesOverview": "Sales overview",
  "nav.products": "Products & Classes",
  "nav.transactions": "Transactions",
  "nav.productsPricing": "Products & pricing",
  "nav.invoices": "Invoices",
  "nav.messages": "Communications",
  "nav.inbox": "Inbox",
  "nav.campaigns": "Campaigns",
  "nav.automations": "Automations",
  "nav.templates": "Templates",
  "nav.reports": "Reports",
  "nav.settings": "Settings",
};

vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    {
      useTranslations:
        () =>
        (key, values = {}) =>
          (labels[key] || key).replace(
            /\{(\w+)\}/g,
            (_, name) => values[name] ?? `{${name}}`,
          ),
    },
    ["Common"],
  );
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: mocks.tenant,
        workspaceAccess: mocks.workspaceAccess,
      },
      studioContext: {
        activeStudioId: null,
      },
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  Link: ({ children, href, onClick, ...props }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/dashboard/StudioSwitcher", () => ({
  default: () => <div data-testid="studio-switcher" />,
}));

vi.mock("@/components/dashboard/WorkspaceRouteScrollReset", () => ({
  resetWorkspaceScroll: vi.fn(),
}));

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import {
  buildDashboardNavigation,
  getActiveDashboardNavigation,
} from "@/components/dashboard/dashboard.navigation";

const renderSidebar = (props = {}) =>
  render(<DashboardSidebar tenantId="tenant-1" {...props} />);

describe("simplified dashboard sidebar navigation", () => {
  beforeEach(() => {
    labels.setupCenter = "Launch Center";
    labels.openSetupCenter = "Open Launch Center";
    mocks.pathname = "/app";
    mocks.search = "";
    mocks.tenant = {
      modules: {
        bookings: true,
        payments: true,
        customers: true,
        memberships: true,
        firing: true,
        inventory: true,
        staff_tasks: true,
        communications: true,
        ai: true,
      },
      settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
    };
    mocks.workspaceAccess = {
      role: "owner",
      status: "active",
    };
  });

  it("keeps decorative brushes on the expanded desktop rail only", () => {
    const { container, rerender } = renderSidebar();
    const brushField = () =>
      container.querySelector('[data-workspace-brush-field="sidebar"]');

    expect(brushField()).toBeInTheDocument();
    expect(brushField()).toHaveAttribute("aria-hidden", "true");
    expect(brushField()).toHaveClass("pointer-events-none", "z-0");
    expect(
      container.querySelector('[data-workspace-sidebar="desktop"]'),
    ).toHaveAttribute("data-collapsed", "false");

    rerender(<DashboardSidebar tenantId="tenant-1" collapsed />);
    expect(brushField()).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-workspace-sidebar="desktop"]'),
    ).toHaveAttribute("data-collapsed", "true");

    rerender(<DashboardSidebar tenantId="tenant-1" mobile />);
    expect(brushField()).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-workspace-sidebar="mobile"]'),
    ).toBeInTheDocument();
  });

  it("keeps the desktop collapse control inside the sidebar header", () => {
    const onToggleCollapsed = vi.fn();
    const { container } = renderSidebar({ onToggleCollapsed });
    const header = container.querySelector("[data-workspace-sidebar-header]");
    const toggle = screen.getByRole("button", {
      name: "Collapse studio navigation",
    });

    expect(header).toContainElement(toggle);
    expect(header).toContainElement(
      screen.getByRole("link", { name: "shario.io dashboard" }),
    );
    expect(toggle).toHaveAttribute(
      "aria-controls",
      "workspace-navigation-desktop",
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveClass("h-11", "w-11", "touch-manipulation");
    expect(toggle).not.toHaveClass(
      "absolute",
      "translate-x-full",
      "rounded-r-[12px]",
      "border-l-0",
    );

    fireEvent.click(toggle);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it("presents the small set of primary destinations and separates Settings", () => {
    renderSidebar();

    const primaryNavigation = screen.getByRole("navigation", {
      name: "Studio management",
    });

    expect(
      within(primaryNavigation).getByRole("link", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole("link", { name: "Bookings" }),
    ).toBeInTheDocument();
    const expandBookings = within(primaryNavigation).getByRole("button", {
      name: "Expand Bookings",
    });
    expect(expandBookings).toHaveAttribute("aria-expanded", "false");
    expect(expandBookings).toHaveClass("h-11", "w-11", "touch-manipulation");
    expect(
      within(primaryNavigation).getByRole("link", { name: "Customers" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole("link", { name: "Studio" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole("button", {
        name: "Expand Studio",
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(primaryNavigation).getByRole("link", { name: "Sales" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole("button", {
        name: "Expand Sales",
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(primaryNavigation).getByRole("link", { name: "Communications" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNavigation).queryByRole("button", {
        name: "Expand Communications",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole("link", { name: "Reports" }),
    ).toBeInTheDocument();

    const settings = screen.getByRole("link", { name: "Settings" });
    const primaryList = primaryNavigation.querySelector(
      "[data-workspace-sidebar-primary-list]",
    );

    expect(primaryNavigation).not.toContainElement(settings);
    expect(primaryList).toHaveClass("space-y-px");
  });

  it("does not expose removed pottery destinations", () => {
    mocks.pathname = "/app/firings";
    mocks.search = "section=lost-found";
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Kilns & Firings" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Lost & Found" }),
    ).not.toBeInTheDocument();
  });

  it("groups Launch Center and Settings in one intentional footer", () => {
    const { container } = renderSidebar({ canUseSetupCenter: true });
    const footer = container.querySelector("[data-workspace-sidebar-footer]");
    const footerNavigation = screen.getByRole("navigation", {
      name: "Studio setup and settings",
    });
    const launchCenter = within(footerNavigation).getByRole("link", {
      name: "Open Launch Center",
    });
    const settings = within(footerNavigation).getByRole("link", {
      name: "Settings",
    });

    expect(footer).toBe(footerNavigation);
    expect(footer).toHaveClass(
      "border-t",
      "border-line/80",
      "bg-surface-panel",
    );
    expect(footer).toHaveAttribute("data-launch-center-navigation", "true");
    expect(launchCenter).toHaveAttribute("href", "/app/setup");
    expect(launchCenter).toHaveAttribute("data-launch-center-shortcut");
    expect(launchCenter).toHaveClass(
      "text-[var(--studio-clay)]",
      "hover:bg-[var(--studio-paper)]",
      "hover:text-[var(--studio-clay)]",
    );
    expect(
      launchCenter.compareDocumentPosition(settings) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      launchCenter.querySelector("[data-launch-center-progress]"),
    ).toBeNull();
  });

  it("shows truthful required progress with localized accessible context", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "progress",
        completed: 2,
        total: 5,
        issueCount: 0,
      },
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    const progress = launchCenter.querySelector(
      "[data-launch-center-progress]",
    );

    expect(progress).toHaveTextContent("2/5");
    expect(progress).toHaveAttribute("aria-hidden", "true");
    expect(progress).toHaveAttribute("data-complete", "false");
    expect(progress).toHaveClass(
      "tabular-nums",
      "block",
      "text-[var(--studio-clay)]",
    );
    expect(progress).not.toHaveClass("rounded-full");
    expect(
      launchCenter.querySelector("[data-launch-center-copy]"),
    ).toContainElement(progress);
    expect(launchCenter).toHaveAccessibleDescription(
      "2 of 5 required steps complete",
    );
  });

  it.each([
    ["missing", null],
    ["zero-total", { status: "progress", completed: 0, total: 0 }],
    ["invalid", { status: "progress", completed: Number.NaN, total: 5 }],
  ])("does not show %s required progress", (_case, launchCenterStatus) => {
    renderSidebar({ canUseSetupCenter: true, launchCenterStatus });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });

    expect(
      launchCenter.querySelector("[data-launch-center-progress]"),
    ).toBeNull();
    expect(launchCenter).not.toHaveAttribute("aria-describedby");
  });

  it("shows Live only for a healthy published setup", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "live",
        completed: 5,
        total: 5,
        issueCount: 0,
      },
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    expect(
      launchCenter.querySelector("[data-launch-center-progress]"),
    ).toBeNull();
    expect(launchCenter).toHaveAccessibleDescription(
      "Public studio is live and launch checks are clear",
    );
    expect(within(launchCenter).getByText("Launch Center")).toHaveClass(
      "block",
      "whitespace-nowrap",
    );
    expect(within(launchCenter).getByText("Launch Center")).not.toHaveClass(
      "truncate",
    );
  });

  it("keeps unfinished progress below the full Czech Launch Center label", () => {
    labels.setupCenter = "Centrum spuštění";
    labels.openSetupCenter = "Otevřít Centrum spuštění";

    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "progress",
        completed: 2,
        total: 5,
        issueCount: 0,
      },
    });

    const launchCenter = screen.getByRole("link", {
      name: "Otevřít Centrum spuštění",
    });
    const label = within(launchCenter).getByText("Centrum spuštění");
    const copy = launchCenter.querySelector("[data-launch-center-copy]");
    const progress = launchCenter.querySelector(
      "[data-launch-center-progress]",
    );

    expect(progress).toHaveTextContent("2/5");
    expect(progress).toHaveAttribute("data-launch-center-status", "progress");
    expect(progress).toHaveAttribute("data-complete", "false");
    expect(progress).toHaveClass(
      "block",
      "text-[var(--studio-clay)]",
      "tabular-nums",
    );
    expect(progress).not.toHaveClass("rounded-full");
    expect(copy).toContainElement(progress);
    expect(label).toHaveClass("block", "whitespace-nowrap");
    expect(label).not.toHaveClass("truncate");
    expect(launchCenter).toHaveAccessibleDescription(
      "2 of 5 required steps complete",
    );
  });

  it("replaces a contradictory completed badge with the issue count", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "attention",
        completed: 5,
        total: 5,
        issueCount: 1,
      },
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    const status = launchCenter.querySelector("[data-launch-center-progress]");

    expect(status).toHaveTextContent("1 issue");
    expect(status).toHaveAttribute("data-launch-center-status", "attention");
    expect(status).toHaveAttribute("data-complete", "false");
    expect(status).toHaveClass("block", "text-amber-800", "tabular-nums");
    expect(status).not.toHaveClass("rounded-full");
    expect(
      launchCenter.querySelector("[data-launch-center-copy]"),
    ).toContainElement(status);
    expect(launchCenter).toHaveAccessibleDescription(
      "1 launch issue requires attention",
    );
  });

  it("uses Ready for a complete operational setup without a public site", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "operational",
        completed: 4,
        total: 4,
        issueCount: 0,
      },
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    expect(
      launchCenter.querySelector("[data-launch-center-progress]"),
    ).toBeNull();
    expect(launchCenter).toHaveAccessibleDescription(
      "Operational launch setup is ready",
    );
  });

  it("keeps compact progress and context when the rail is collapsed", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "progress",
        completed: 2,
        total: 5,
        issueCount: 0,
      },
      collapsed: true,
      onToggleCollapsed: vi.fn(),
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    const progress = launchCenter.querySelector(
      "[data-launch-center-progress]",
    );

    expect(launchCenter).toHaveClass(
      "mx-auto",
      "h-11",
      "w-11",
      "justify-center",
    );
    expect(within(launchCenter).getByRole("tooltip")).toHaveTextContent(
      "Launch Center",
    );
    expect(within(launchCenter).getByRole("tooltip")).toHaveTextContent("2/5");
    expect(progress).toHaveTextContent("2/5");
    expect(progress).toHaveClass("absolute", "right-0", "top-0");
    expect(launchCenter).toHaveAccessibleDescription(
      "2 of 5 required steps complete",
    );
  });

  it("keeps a healthy collapsed status out of the permanent rail", () => {
    renderSidebar({
      canUseSetupCenter: true,
      launchCenterStatus: {
        status: "live",
        completed: 5,
        total: 5,
        issueCount: 0,
      },
      collapsed: true,
      onToggleCollapsed: vi.fn(),
    });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });

    expect(
      launchCenter.querySelector("[data-launch-center-progress]"),
    ).toBeNull();
    expect(within(launchCenter).getByRole("tooltip")).toHaveTextContent(
      "Launch Center",
    );
    expect(within(launchCenter).getByRole("tooltip")).toHaveTextContent("Live");
    expect(launchCenter).toHaveAccessibleDescription(
      "Public studio is live and launch checks are clear",
    );
  });

  it("marks only Launch Center active on its route", () => {
    mocks.pathname = "/app/setup";
    renderSidebar({ canUseSetupCenter: true });

    const launchCenter = screen.getByRole("link", {
      name: "Open Launch Center",
    });
    const settings = screen.getByRole("link", { name: "Settings" });

    expect(launchCenter).toHaveAttribute("aria-current", "page");
    expect(launchCenter).toHaveClass(
      "bg-[var(--studio-paper)]",
      "text-[var(--studio-clay)]",
    );
    expect(settings).not.toHaveAttribute("aria-current");
  });

  it("does not expose Launch Center without workspace-update access", () => {
    renderSidebar();

    expect(
      screen.queryByRole("link", { name: "Open Launch Center" }),
    ).toBeNull();
  });

  it("sends limited Settings access through the permission-aware overview", () => {
    const navigation = buildDashboardNavigation({
      tenant: mocks.tenant,
      workspaceAccess: {
        role: "staff",
        status: "active",
        effectivePermissions: ["locations.view"],
      },
    });
    const settings = navigation.utility.find((item) => item.key === "settings");

    expect(settings).toMatchObject({
      href: "/app/settings",
      resolvedHref: "/app/settings",
    });
  });

  it("keeps only one submenu expanded at a time", () => {
    renderSidebar();

    const bookings = screen.getByRole("button", {
      name: "Expand Bookings",
    });
    const studio = screen.getByRole("button", { name: "Expand Studio" });

    fireEvent.click(bookings);

    expect(bookings).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/app/calendar",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveClass(
      "min-h-11",
    );
    expect(screen.getByRole("link", { name: "All bookings" })).toHaveAttribute(
      "href",
      "/app/bookings",
    );
    expect(
      screen.queryByRole("link", { name: "Courses & events" }),
    ).not.toBeInTheDocument();

    fireEvent.click(studio);

    expect(studio).toHaveAttribute("aria-expanded", "true");
    expect(bookings).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("link", { name: "Calendar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Kilns & Firings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inventory" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Staff planning" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Knowledge Hub" }),
    ).toBeInTheDocument();
  });

  it("links Communications directly to the outbound email workspace", () => {
    renderSidebar();

    expect(
      screen.getByRole("link", { name: "Communications" }),
    ).toHaveAttribute("href", "/app/communications");
    expect(
      screen.queryByRole("link", { name: "Inbox" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Automations" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Communications destination active across workspace sections", () => {
    const navigation = buildDashboardNavigation({
      tenant: mocks.tenant,
      workspaceAccess: mocks.workspaceAccess,
    });

    expect(
      getActiveDashboardNavigation({
        pathname: "/app/communications",
        searchParams: new URLSearchParams("section=routing"),
        ...navigation,
      }),
    ).toEqual({
      activeGroupKey: null,
      activeItemKey: "messages",
    });

    expect(
      getActiveDashboardNavigation({
        pathname: "/app/communications",
        searchParams: new URLSearchParams("section=inbox"),
        ...navigation,
      }),
    ).toEqual({
      activeGroupKey: null,
      activeItemKey: "messages",
    });
  });

  it("exposes one sales screen and keeps the old transactions route active", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Expand Sales" }));

    expect(
      screen.getByRole("link", { name: "Sales overview" }),
    ).toHaveAttribute("href", "/app/sales");
    expect(
      screen.queryByRole("link", { name: "Transactions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Products & Classes" }),
    ).toHaveAttribute("href", "/app/products");

    const navigation = buildDashboardNavigation({
      tenant: mocks.tenant,
      workspaceAccess: mocks.workspaceAccess,
    });

    expect(
      getActiveDashboardNavigation({
        pathname: "/app/finance/orders",
        searchParams: new URLSearchParams(),
        ...navigation,
      }),
    ).toEqual({
      activeGroupKey: "sales",
      activeItemKey: "sales",
    });
  });

  it.each([
    {
      pathname: "/app/operations",
      search: "section=inventory",
      group: "Studio",
      child: "Inventory",
    },
  ])(
    "opens $group and marks $child active for a nested route",
    ({ pathname, search, group, child }) => {
      mocks.pathname = pathname;
      mocks.search = search;

      renderSidebar();

      expect(
        screen.getByRole("button", { name: `Collapse ${group}` }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: child })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );

  it.each([
    {
      pathname: "/app/operations",
      search: "section=inventory",
      activeGroupKey: "studio",
      activeItemKey: "inventory",
    },
    {
      pathname: "/app/operations",
      search: "section=tasks",
      activeGroupKey: "studio",
      activeItemKey: "staffPlanning",
    },
    {
      pathname: "/app/operations",
      search: "section=statistics",
      activeGroupKey: null,
      activeItemKey: "reports",
    },
    {
      pathname: "/app/products",
      search: "category=classesEvents",
      activeGroupKey: "sales",
      activeItemKey: "products",
    },
    {
      pathname: "/app/communications",
      search: "section=automations",
      activeGroupKey: null,
      activeItemKey: "messages",
    },
  ])(
    "chooses $activeItemKey when sibling destinations share a pathname",
    ({ pathname, search, activeGroupKey, activeItemKey }) => {
      const navigation = buildDashboardNavigation({
        tenant: mocks.tenant,
        workspaceAccess: mocks.workspaceAccess,
      });

      expect(
        getActiveDashboardNavigation({
          pathname,
          searchParams: new URLSearchParams(search),
          ...navigation,
        }),
      ).toEqual({
        activeGroupKey,
        activeItemKey,
      });
    },
  );

  it("prunes inaccessible children and sends a group to its first visible destination", () => {
    const navigation = buildDashboardNavigation({
      tenant: {
        modules: {
          bookings: true,
          payments: true,
          customers: true,
          firing: false,
          inventory: false,
          staff_tasks: false,
          communications: false,
        },
      },
      workspaceAccess: {
        role: "staff",
        status: "active",
        effectivePermissions: [
          "bookings.view",
          "invoices.view",
          "knowledge.view",
        ],
      },
    });

    const bookings = navigation.primary.find(
      (entry) => entry.key === "bookings",
    );
    const studio = navigation.primary.find((entry) => entry.key === "studio");
    const sales = navigation.primary.find((entry) => entry.key === "sales");

    expect(bookings).toMatchObject({
      resolvedHref: "/app/calendar",
      children: [
        expect.objectContaining({ key: "calendar" }),
        expect.objectContaining({ key: "bookings" }),
      ],
    });
    expect(studio).toMatchObject({
      resolvedHref: "/app/knowledge",
      children: [expect.objectContaining({ key: "knowledge" })],
    });
    // An old invoice grant cannot restore the disabled feature or its group.
    expect(sales).toBeUndefined();
    expect(
      navigation.primary.find((entry) => entry.key === "messages"),
    ).toBeUndefined();
  });

  it("filters complete groups and children by permissions and tenant modules", () => {
    mocks.pathname = "/app/bookings";
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["bookings.view"],
    };

    const { rerender } = renderSidebar();

    expect(screen.getByRole("link", { name: "Bookings" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Customers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Studio" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sales" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Communications" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Reports" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();

    mocks.tenant = {
      ...mocks.tenant,
      modules: {
        ...mocks.tenant.modules,
        bookings: false,
      },
    };

    rerender(<DashboardSidebar tenantId="tenant-1" />);

    expect(
      screen.queryByRole("link", { name: "Bookings" }),
    ).not.toBeInTheDocument();
  });

  it("calls the navigation callback after a sidebar destination is selected", () => {
    const onNavigate = vi.fn();

    renderSidebar({ mobile: true, onNavigate });

    fireEvent.click(screen.getByRole("link", { name: "Overview" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("applies hidden parent groups and individual leaves without hiding protected anchors", () => {
    mocks.tenant.settings.navigation = {
      hiddenGroups: ["bookings", "overview"],
      hiddenItems: ["knowledge", "overview", "settings"],
    };

    renderSidebar();

    expect(
      screen.queryByRole("link", { name: "Bookings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Studio" }));
    expect(
      screen.queryByRole("link", { name: "Knowledge Hub" }),
    ).not.toBeInTheDocument();
  });

  it("supports a focused inventory workspace", () => {
    mocks.tenant = {
      modules: {
        bookings: false,
        payments: false,
        customers: false,
        courses: false,
        memberships: false,
        firing: true,
        inventory: true,
        staff_tasks: false,
        communications: false,
        automations: false,
        ai: false,
      },
      settings: {
        navigation: {
          hiddenGroups: ["bookings", "sales", "messages"],
          hiddenItems: ["customers", "knowledge", "reports"],
        },
      },
    };

    renderSidebar();
    expect(screen.getByRole("link", { name: "Studio" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Bookings" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Customers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sales" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Communications" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Reports" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Studio" }));
    expect(
      screen.queryByRole("link", { name: "Kilns & Firings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inventory" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("keeps the direct Communications workspace visible when automations are disabled", () => {
    mocks.tenant.modules.automations = false;
    renderSidebar();

    expect(
      screen.getByRole("link", { name: "Communications" }),
    ).toHaveAttribute("href", "/app/communications");
    expect(
      screen.queryByRole("link", { name: "Inbox" }),
    ).not.toBeInTheDocument();
  });

  it("keeps class setup in Products & Classes instead of the Bookings group", () => {
    const navigation = buildDashboardNavigation({
      tenant: {
        modules: { bookings: false, courses: true },
        settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
      },
      workspaceAccess: mocks.workspaceAccess,
    });
    const bookings = navigation.primary.find(
      (entry) => entry.key === "bookings",
    );

    expect(bookings).toBeUndefined();

    const sales = navigation.primary.find((entry) => entry.key === "sales");
    expect(sales.children.map((item) => item.key)).toContain("products");
  });

  it("gates payment sales leaves while keeping Products core", () => {
    const navigation = buildDashboardNavigation({
      tenant: {
        modules: { payments: false },
        settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
      },
      workspaceAccess: mocks.workspaceAccess,
    });
    const sales = navigation.primary.find((entry) => entry.key === "sales");

    expect(sales.children.map((item) => item.key)).toEqual([
      "products",
      "customOrders",
    ]);
  });

  it("keeps membership management discoverable without product permissions", () => {
    const navigation = buildDashboardNavigation({
      tenant: {
        modules: { payments: false, memberships: true },
        settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
      },
      workspaceAccess: {
        role: "staff",
        status: "active",
        effectivePermissions: ["memberships.view"],
      },
    });
    const sales = navigation.primary.find((entry) => entry.key === "sales");

    expect(sales.children.map((item) => item.key)).toEqual(["products"]);
    expect(sales.children[0].resolvedHref).toBe("/app/products");
  });

  it("hides the catalog destination when a membership-only role has its module disabled", () => {
    const navigation = buildDashboardNavigation({
      tenant: {
        modules: { payments: false, memberships: false },
        settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
      },
      workspaceAccess: {
        role: "staff",
        status: "active",
        effectivePermissions: ["memberships.view"],
      },
    });

    expect(
      navigation.primary.find((entry) => entry.key === "sales"),
    ).toBeUndefined();
  });

  it("uses labelled icon destinations and opens grouped destinations when collapsed", async () => {
    const onToggleCollapsed = vi.fn();
    const { container } = renderSidebar({
      collapsed: true,
      onToggleCollapsed,
    });

    expect(container.firstChild).toHaveAttribute("data-collapsed", "true");
    expect(
      screen.getByRole("button", { name: "Bookings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Studio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Expand Bookings" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Calendar" }),
    ).not.toBeInTheDocument();

    const expandSidebar = screen.getByRole("button", {
      name: "Expand studio navigation",
    });
    const header = container.querySelector("[data-workspace-sidebar-header]");

    expect(header).toContainElement(expandSidebar);
    expect(expandSidebar).toHaveAttribute("aria-expanded", "false");
    expect(expandSidebar).toHaveAttribute(
      "aria-controls",
      "workspace-navigation-desktop",
    );
    expect(expandSidebar).toHaveClass(
      "h-11",
      "w-11",
      "touch-manipulation",
      "rounded-[var(--studio-control-radius)]",
    );
    expect(expandSidebar).not.toHaveClass(
      "absolute",
      "translate-x-full",
      "rounded-r-[12px]",
      "border-l-0",
    );
    expect(
      within(header).queryByRole("link", { name: "shario.io dashboard" }),
    ).toBeNull();

    fireEvent.click(expandSidebar);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Bookings" }));

    const calendar = await screen.findByRole("menuitem", { name: "Calendar" });
    const flyout = calendar.closest('[role="menu"]');

    expect(calendar).toHaveAttribute("href", "/app/calendar");
    expect(flyout).toHaveClass(
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    expect(
      screen.getByRole("menuitem", { name: "All bookings" }),
    ).toHaveAttribute("href", "/app/bookings");
    expect(
      screen.queryByRole("menuitem", { name: "Courses & events" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the studio switcher in the mobile drawer but removes it from the desktop rail", () => {
    const { rerender } = renderSidebar();

    expect(screen.queryByTestId("studio-switcher")).not.toBeInTheDocument();

    rerender(<DashboardSidebar tenantId="tenant-1" mobile />);

    expect(screen.getByTestId("studio-switcher")).toBeInTheDocument();
  });

  it("exposes stable product tour targets without changing destinations", () => {
    const { container } = renderSidebar({ canUseSetupCenter: true });

    expect(
      container.querySelector('[data-product-tour-target="navigation"]'),
    ).toHaveAttribute("data-workspace-sidebar-primary-list");
    expect(
      screen.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveAttribute("data-product-tour-target", "launch-center");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "data-product-tour-target",
      "settings",
    );
  });

  it("keeps the Launch Center utility shortcut in mobile navigation", () => {
    renderSidebar({ mobile: true, canUseSetupCenter: true });

    expect(
      screen.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveAttribute("href", "/app/setup");
  });

  it("keeps the active destination visually explicit inside a collapsed flyout", async () => {
    mocks.pathname = "/app/calendar";

    renderSidebar({ collapsed: true, onToggleCollapsed: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "Bookings" }));

    const calendar = await screen.findByRole("menuitem", {
      name: "Calendar",
    });

    expect(calendar).toHaveAttribute("aria-current", "page");
    expect(calendar.closest('[role="menu"]')).toHaveAttribute(
      "data-skab-workspace-surface",
    );
    expect(calendar).toHaveClass(
      "bg-[var(--color-primary-soft)]",
      "data-focus:ring-[var(--studio-blue)]",
    );
  });

  it("opens a collapsed group flyout from the keyboard", async () => {
    renderSidebar({ collapsed: true, onToggleCollapsed: vi.fn() });

    fireEvent.keyDown(screen.getByRole("button", { name: "Studio" }), {
      key: "Enter",
    });

    expect(
      await screen.findByRole("menuitem", { name: "Inventory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Inventory" }),
    ).toBeInTheDocument();
  });
});
