import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STUDIO_CALENDAR_TAB, TABS } from "@/components/menu/menuConfig";
import {
  isAnyStudioModuleEnabled,
  isCustomerBookingCommerceEnabled,
  isCustomerBookingFlowEnabled,
  isServiceCatalogEnabled,
} from "@/utils/studioFlow";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

const getEnabledCustomerTabNames = (modules) =>
  TABS.filter(
    (tab) => !tab.adminOnly && isAnyStudioModuleEnabled(modules, tab.module),
  ).map((tab) => tab.name);

describe("customer portal module gating", () => {
  it("keeps the complete customer booking flow available for a course-only tenant", () => {
    const modules = {
      bookings: false,
      courses: true,
      firing: false,
      payments: true,
    };
    const enabledTabs = getEnabledCustomerTabNames(modules);

    expect(isCustomerBookingFlowEnabled(modules)).toBe(true);
    expect(isCustomerBookingCommerceEnabled(modules)).toBe(true);
    expect(isServiceCatalogEnabled(modules)).toBe(true);
    expect(enabledTabs).toEqual(
      expect.arrayContaining([STUDIO_CALENDAR_TAB, "MY_BOOKINGS"]),
    );
    expect(enabledTabs).not.toContain("SERVICES");
  });

  it("keeps course history visible but disables commerce without payments", () => {
    const modules = {
      bookings: false,
      courses: true,
      firing: false,
      payments: false,
    };
    const enabledTabs = getEnabledCustomerTabNames(modules);

    expect(isCustomerBookingFlowEnabled(modules)).toBe(true);
    expect(isCustomerBookingCommerceEnabled(modules)).toBe(false);
    expect(isServiceCatalogEnabled(modules)).toBe(false);
    expect(enabledTabs).toEqual(
      expect.arrayContaining([STUDIO_CALENDAR_TAB, "MY_BOOKINGS"]),
    );
  });

  it("does not invent a booking flow when bookings and courses are disabled", () => {
    const modules = {
      bookings: false,
      courses: false,
      firing: false,
      payments: true,
    };
    const enabledTabs = getEnabledCustomerTabNames(modules);

    expect(isCustomerBookingFlowEnabled(modules)).toBe(false);
    expect(isCustomerBookingCommerceEnabled(modules)).toBe(false);
    expect(isServiceCatalogEnabled(modules)).toBe(false);
    expect(enabledTabs).not.toContain(STUDIO_CALENDAR_TAB);
    expect(enabledTabs).not.toContain("MY_BOOKINGS");

    expect(TABS.map((tab) => tab.name)).not.toContain("SERVICES");
  });

  it("wires data queries, the drawer, and calendar actions to their matching capabilities", () => {
    const portal = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "portal",
      "page.js",
    );
    const menu = read("src", "components", "menu", "Menu.js");
    const dashboardQueries = read(
      "src",
      "components",
      "menu",
      "portalDashboardQueries.js",
    );
    const bookingsTable = read(
      "src",
      "components",
      "tables",
      "MyBookingsTable.js",
    );

    expect(portal).toContain("{ locationId: activeBookingLocationId }");
    expect(portal).toContain("skip: !bookingAvailabilityEnabled");
    expect(portal).toContain("skip: !serviceCatalogEnabled");
    expect(portal).toContain(
      "{bookingCommerceEnabled && activeBookingLocationId && (",
    );
    expect(menu).toContain("isAnyStudioModuleEnabled(modules, tab.module)");
    expect(menu).toContain(
      "canBookActiveLocation ? openBookingDrawer : undefined",
    );
    expect(menu).not.toContain("min-h-[560px]");
    expect(menu).not.toContain("h-[clamp(560px,72dvh,760px)]");
    expect(menu).toContain("pageScroll");
    expect(menu).toContain("getUpcomingBookingsQueryArgs(activeLocationId)");
    expect(dashboardQueries).toContain("locationId,");
    expect(portal).toContain(
      "useGetUserBookingsQuery(getUpcomingBookingsQueryArgs(activeLocationId)",
    );
    expect(menu).toContain(
      'if (fallbackTab !== DEFAULT_TAB) pushTabToUrl(fallbackTab, "replace")',
    );
    expect(menu).toContain(
      "getNextUpcomingBooking(upcomingData, new Date(), activeLocationId)",
    );
    expect(bookingsTable).toContain("skip: !userId || !serviceCatalogEnabled");
    expect(bookingsTable).toContain(
      "...(activeLocationId ? { locationId: activeLocationId } : {})",
    );
    expect(bookingsTable).toContain("getBookingLocationId(booking)");
    expect(bookingsTable).toContain(
      "serviceCatalogEnabled && isLoadingProducts",
    );
  });
});
