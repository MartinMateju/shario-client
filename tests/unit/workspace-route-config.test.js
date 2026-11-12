import { describe, expect, it } from "vitest";

import {
  getWorkspaceRouteTitleKey,
  isWorkspaceOverviewRoute,
  isWorkspaceSettingsRoute,
} from "@/components/dashboard/workspaceRouteConfig";

describe("workspace route configuration", () => {
  it.each([
    ["/app/setup", "routeTitles.setup"],
    ["/app/ai", "routeTitles.ai"],
    ["/app/calendar", "routeTitles.calendar"],
    ["/app/bookings", "routeTitles.bookings"],
    ["/app/bookings/booking-123", "routeTitles.bookings"],
    ["/app/users", "routeTitles.customers"],
    ["/app/products", "routeTitles.products"],
    ["/app/finance", "routeTitles.finance"],
    ["/app/finance/orders", "routeTitles.transactions"],
    ["/app/finance/invoices", "routeTitles.invoices"],
    ["/app/memberships", "routeTitles.products"],
    ["/app/firings", "routeTitles.workspace"],
    ["/app/communications", "routeTitles.communications"],
    ["/app/notifications", "routeTitles.notifications"],
    ["/app/knowledge", "routeTitles.knowledge"],
    ["/app/settings", "routeTitles.settings"],
    ["/app/settings/general", "routeTitles.generalSettings"],
    ["/app/settings/modules", "routeTitles.settings"],
    ["/app/settings/public-site", "routeTitles.publicSite"],
    ["/app/settings/locations", "routeTitles.locations"],
    ["/app/settings/team", "routeTitles.team"],
    ["/app/settings/roles", "routeTitles.roles"],
    ["/app/settings/payments", "routeTitles.payments"],
    ["/app/settings/billing", "routeTitles.billing"],
    ["/app/settings/invoicing", "routeTitles.invoicing"],
    ["/app/settings/ai", "routeTitles.aiSettings"],
    ["/app/account", "routeTitles.account"],
    ["/app/preferences", "routeTitles.preferences"],
    ["/app/pieces", "routeTitles.workspace"],
    ["/app/management", "routeTitles.locations"],
    ["/app/sales", "routeTitles.salesOverview"],
    ["/app/commerce", "routeTitles.commerce"],
  ])("resolves %s to %s", (pathname, expectedKey) => {
    expect(getWorkspaceRouteTitleKey(pathname)).toBe(expectedKey);
  });

  it.each([
    ["automations", "routeTitles.automations"],
    ["events", "routeTitles.events"],
    ["inventory", "routeTitles.inventory"],
    ["suppliers", "routeTitles.suppliers"],
    ["tasks", "routeTitles.tasks"],
    ["memberships", "routeTitles.memberships"],
    ["statistics", "routeTitles.reports"],
  ])("uses the %s operations title", (section, expectedKey) => {
    expect(
      getWorkspaceRouteTitleKey(
        "/app/operations",
        new URLSearchParams({ section }),
      ),
    ).toBe(expectedKey);
  });

  it("keeps the Products & Classes title for a filtered catalogue", () => {
    expect(
      getWorkspaceRouteTitleKey(
        "/app/products",
        new URLSearchParams({ category: "classesEvents" }),
      ),
    ).toBe("routeTitles.products");
  });

  it("normalizes the overview trailing slash", () => {
    expect(isWorkspaceOverviewRoute("/app/")).toBe(true);
    expect(getWorkspaceRouteTitleKey("/app/")).toBeNull();
  });

  it.each([
    "/app/settings",
    "/app/settings/",
    "/app/settings/general",
    "/app/settings/payments",
  ])("uses the compact workspace sidebar for %s", (pathname) => {
    expect(isWorkspaceSettingsRoute(pathname)).toBe(true);
  });

  it("does not compact the workspace sidebar outside settings", () => {
    expect(isWorkspaceSettingsRoute("/app/setup")).toBe(false);
    expect(isWorkspaceSettingsRoute("/app")).toBe(false);
  });

  it("does not partially match similarly named routes", () => {
    expect(getWorkspaceRouteTitleKey("/app/bookings-old")).toBe(
      "routeTitles.workspace",
    );
  });
});
