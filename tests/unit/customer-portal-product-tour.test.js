import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  CUSTOMER_PORTAL_TOUR_STEPS,
  CUSTOMER_PORTAL_TOUR_VERSION,
  getCustomerPortalTourStorageKey,
  hasAcknowledgedCustomerPortalTour,
  readCustomerPortalTourAcknowledgement,
  writeCustomerPortalTourAcknowledgement,
} from "@/components/customer-shell/customerPortalProductTour.config";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("customer portal product tour", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists a versioned acknowledgement per tenant and customer", () => {
    const key = getCustomerPortalTourStorageKey({
      tenantKey: "atelier-klei",
      customerKey: "customer-42",
    });

    expect(hasAcknowledgedCustomerPortalTour(null)).toBe(false);
    writeCustomerPortalTourAcknowledgement(key, "completed", "help");

    const saved = readCustomerPortalTourAcknowledgement(key);
    expect(saved).toMatchObject({
      version: CUSTOMER_PORTAL_TOUR_VERSION,
      status: "completed",
      lastStep: "help",
    });
    expect(hasAcknowledgedCustomerPortalTour(saved)).toBe(true);
  });

  it("covers the customer booking journey and mounts after location gating", () => {
    expect(CUSTOMER_PORTAL_TOUR_STEPS.map((step) => step.key)).toEqual([
      "overview",
      "studio",
      "calendarControls",
      "legend",
      "chooseTime",
      "help",
    ]);

    const layout = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/layout.js",
    );
    const help = read(
      "src/components/customer-shell/CustomerPortalHelpDrawer.js",
    );
    const calendar = read("src/components/calendar/StudioCalendar.js");
    const tour = read(
      "src/components/customer-shell/CustomerPortalProductTour.js",
    );

    expect(layout).toContain("<CustomerPortalProductTour");
    expect(layout.indexOf("<CustomerPortalLocationGate")).toBeLessThan(
      layout.indexOf("<CustomerPortalProductTour"),
    );
    expect(help).toContain("data-customer-portal-tour-replay");
    expect(calendar).toContain('!["customer", "public"].includes(audience)');
    expect(calendar).toContain(
      'setFiltersOpen(!window.matchMedia("(max-width: 639px)").matches)',
    );
    expect(tour).not.toContain("var(--tenant-secondary)");
    expect(tour.match(/data-tenant-hover="preserve"/g)).toHaveLength(8);
    expect(tour).toContain("bg-[var(--tenant-portal-button)]");
  });

  it("keeps suggested times client-only until the customer explicitly selects one", () => {
    const calendar = read("src/components/calendar/StudioCalendar.js");
    const menu = read("src/components/menu/Menu.js");
    const drawer = read("src/components/sidebars/Drawer.js");

    expect(calendar).toContain("pickSuggestedCalendarSlot({");
    expect(calendar).toContain("data-calendar-suggested-slot-action");
    expect(calendar).toContain("isSuggested: true");
    expect(calendar).toContain(
      "suggestion.bookingSnapshot === normalizedBookings",
    );
    expect(calendar).toContain("onSlotSelect?.({");
    expect(menu).toContain("setSuggestSlotRequest((request) => request + 1)");
    expect(menu).toContain("nextBooking?.canCancel === true");
    expect(menu).toContain("openCancelConfirmation");
    expect(drawer).toContain(
      "Boolean(open && openCancelConfirmation && canCancel)",
    );
  });
});
