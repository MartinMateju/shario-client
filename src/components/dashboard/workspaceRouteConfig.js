const ROUTE_TITLE_KEYS = [
  ["/app/settings/migration", "routeTitles.migration"],
  ["/app/settings/general", "routeTitles.generalSettings"],
  ["/app/settings/modules", "routeTitles.settings"],
  ["/app/settings/public-site", "routeTitles.publicSite"],
  ["/app/settings/invoicing", "routeTitles.invoicing"],
  ["/app/settings/locations", "routeTitles.locations"],
  ["/app/settings/payments", "routeTitles.payments"],
  ["/app/settings/billing", "routeTitles.billing"],
  ["/app/settings/roles", "routeTitles.roles"],
  ["/app/settings/team", "routeTitles.team"],
  ["/app/settings/ai", "routeTitles.aiSettings"],
  ["/app/finance/invoices", "routeTitles.invoices"],
  ["/app/finance/orders", "routeTitles.transactions"],
  ["/app/custom-orders", "routeTitles.customOrders"],
  ["/app/communications", "routeTitles.communications"],
  ["/app/notifications", "routeTitles.notifications"],
  ["/app/knowledge", "routeTitles.knowledge"],
  ["/app/memberships", "routeTitles.products"],
  ["/app/preferences", "routeTitles.preferences"],
  ["/app/management", "routeTitles.locations"],
  ["/app/bookings", "routeTitles.bookings"],
  ["/app/calendar", "routeTitles.calendar"],
  ["/app/products", "routeTitles.products"],
  ["/app/account", "routeTitles.account"],
  ["/app/commerce", "routeTitles.commerce"],
  ["/app/settings", "routeTitles.settings"],
  ["/app/finance", "routeTitles.finance"],
  ["/app/setup", "routeTitles.setup"],
  ["/app/users", "routeTitles.customers"],
  ["/app/sales", "routeTitles.salesOverview"],
  ["/app/ai", "routeTitles.ai"],
];

const OPERATIONS_TITLE_KEYS = {
  automations: "routeTitles.automations",
  events: "routeTitles.events",
  inventory: "routeTitles.inventory",
  suppliers: "routeTitles.suppliers",
  tasks: "routeTitles.tasks",
  memberships: "routeTitles.memberships",
  statistics: "routeTitles.reports",
};

const normalizePathname = (pathname) => {
  if (!pathname || pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
};

const matchesRoute = (pathname, route) => {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === route || normalizedPathname?.startsWith(`${route}/`)
  );
};

export const isWorkspaceOverviewRoute = (pathname) =>
  normalizePathname(pathname) === "/app";

export const isWorkspaceSettingsRoute = (pathname) =>
  matchesRoute(pathname, "/app/settings");

export const isWorkspaceSetupRoute = (pathname) =>
  matchesRoute(pathname, "/app/setup");

const WORKSPACE_BRUSH_ROUTE_GROUPS = Object.freeze([
  Object.freeze({
    routes: Object.freeze(["/app/calendar"]),
    variant: "calendarShell",
  }),
  Object.freeze({
    routes: Object.freeze(["/app/bookings"]),
    variant: "bookingShell",
  }),
  Object.freeze({
    routes: Object.freeze(["/app/users", "/app/management"]),
    variant: "peopleShell",
  }),
  Object.freeze({
    routes: Object.freeze([
      "/app/finance",
      "/app/sales",
      "/app/custom-orders",
      "/app/commerce",
      "/app/memberships",
      "/app/products",
    ]),
    variant: "bookingShell",
  }),
  Object.freeze({
    routes: Object.freeze(["/app/communications", "/app/knowledge"]),
    variant: "communicationsShell",
  }),
  Object.freeze({
    routes: Object.freeze(["/app/operations"]),
    variant: "operationsShell",
  }),
]);

export const getWorkspaceRouteBrushVariant = (pathname) => {
  if (
    !pathname ||
    isWorkspaceSettingsRoute(pathname) ||
    isWorkspaceSetupRoute(pathname)
  ) {
    return null;
  }

  if (isWorkspaceOverviewRoute(pathname)) {
    return "overviewShell";
  }

  return (
    WORKSPACE_BRUSH_ROUTE_GROUPS.find(({ routes }) =>
      routes.some((route) => matchesRoute(pathname, route)),
    )?.variant || "shell"
  );
};

export const getWorkspaceRouteTitleKey = (pathname, searchParams) => {
  if (!pathname || isWorkspaceOverviewRoute(pathname)) {
    return null;
  }

  if (matchesRoute(pathname, "/app/operations")) {
    const section = searchParams?.get?.("section") || "automations";

    return OPERATIONS_TITLE_KEYS[section] || "routeTitles.operations";
  }

  return (
    ROUTE_TITLE_KEYS.find(([route]) => matchesRoute(pathname, route))?.[1] ||
    "routeTitles.workspace"
  );
};
