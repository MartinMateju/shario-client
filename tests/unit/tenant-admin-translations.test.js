import { describe, expect, it } from "vitest";

import {
  BOOKING_OPTIONS,
  CONFIRMATION_OPTIONS,
  ONBOARDING_STEPS,
  STUDIO_TYPES,
  TEAM_SIZES,
} from "@/components/onboarding/onboarding.constants";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

function collectLeafPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? collectLeafPaths(child, path)
      : [path];
  });
}

function readPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

describe("tenant admin translation catalog", () => {
  it("keeps the English and Czech catalogs structurally aligned", () => {
    expect(collectLeafPaths(messagesCs).sort()).toEqual(
      collectLeafPaths(messagesEn).sort(),
    );
  });

  it.each([
    "Dashboard.expandSidebar",
    "Dashboard.collapseSidebar",
    "Dashboard.settingsNavigationLabel",
    "Dashboard.continueSetupLabel",
    "Dashboard.openSetupCenter",
    "Dashboard.continueSetup",
    "Dashboard.setupCenter",
    "Dashboard.notificationsUnread",
    "Dashboard.routeTitles.notifications",
    "WorkspaceNotifications.triggerUnread",
    "WorkspaceNotifications.page.heading",
    "WorkspaceNotifications.actions.markAllRead",
    "WorkspacePreferences.notifications.eventsTitle",
    "WorkspacePreferences.notifications.channelsTitle",
    "AI.assistant.openRecommendedScreen",
    "Dashboard.routeTitles.migration",
    "WorkspaceSettingsNav.items.migration",
    "MigrationCenter.hero.title",
    "MigrationCenter.actions.downloadTemplate",
    "MigrationCenter.validation.confirmTitle",
    "MigrationCenter.history.title",
    "MigrationCenter.entities.products.title",
    "MigrationCenter.entities.bookings.limitation",
    "MigrationCenter.importers.products.mapping.fields.kind",
    "MigrationCenter.importers.products.mapping.fields.registrationPolicy",
    "MigrationCenter.importers.products.validation.issueCodes.kindAmbiguous",
    "MigrationCenter.importers.bookings.mapping.fields.start",
    "MigrationCenter.importers.bookings.validation.issueCodes.classEnrollmentUnsupported",
    "MigrationCenter.importers.bookings.validation.issueCodes.locationDefaulted",
    "MigrationCenter.importers.bookings.validation.issueCodes.localTimeAmbiguous",
    "MigrationCenter.entities.memberships.modes.plans",
    "MigrationCenter.entities.vouchers.modes.issued",
    "MigrationCenter.entities.guidance.memberships",
    "MigrationCenter.importers.membership-plans.mapping.fields.billingType",
    "MigrationCenter.importers.memberships.mapping.fields.planVersion",
    "MigrationCenter.importers.memberships.mapping.fields.periodStart",
    "MigrationCenter.importers.credits.validation.issueCodes.ledgerBalanceMismatch",
    "MigrationCenter.importers.voucher-products.validation.issueCodes.templateRequired",
    "MigrationCenter.importers.vouchers.validation.issueCodes.legacySnapshotRequired",
  ])("provides the runtime key %s in both locales", (path) => {
    expect(readPath(messagesEn, path)).toEqual(expect.any(String));
    expect(readPath(messagesCs, path)).toEqual(expect.any(String));
  });

  it("pluralizes unread notification labels in both locales", () => {
    expect(messagesEn.Dashboard.notificationsUnread).toContain("plural, one");
    expect(messagesCs.Dashboard.notificationsUnread).toContain("plural, one");
    expect(messagesCs.Dashboard.notificationsUnread).toContain("few {");
  });

  it.each([
    "Bookings.title",
    "Bookings.filters.searchPlaceholder",
    "Bookings.status.awaitingPayment",
    "Bookings.modals.deleteText",
    "People.title",
    "People.tabs.staff",
    "People.actions.addCustomer",
    "People.pagination.rowsPerPage",
  ])("provides localized Czech admin copy for %s", (path) => {
    expect(readPath(messagesCs, path)).not.toBe(readPath(messagesEn, path));
  });

  it("uses Czech plural categories for customer and booking counts", () => {
    expect(messagesCs.Bookings.guests).toContain("few");
    expect(messagesCs.Bookings.selection.selected).toContain("few");
    expect(messagesCs.People.counts.customers).toContain("few");
    expect(messagesCs.People.counts.staff).toContain("few");
  });

  it("provides every dynamically selected onboarding label", () => {
    const dynamicPaths = [
      ...ONBOARDING_STEPS.map((key) => `Onboarding.sidebar.steps.${key}`),
      ...STUDIO_TYPES.map(({ value }) => `Onboarding.studio.types.${value}`),
      ...TEAM_SIZES.map(({ value }) => `Onboarding.studio.teamSizes.${value}`),
      ...BOOKING_OPTIONS.flatMap(({ value }) => [
        `Onboarding.booking.types.${value}.label`,
        `Onboarding.booking.types.${value}.description`,
      ]),
      ...CONFIRMATION_OPTIONS.flatMap(({ value }) => [
        `Onboarding.booking.confirmationModes.${value}.label`,
        `Onboarding.booking.confirmationModes.${value}.description`,
      ]),
    ];

    for (const path of dynamicPaths) {
      expect(readPath(messagesEn, path), `${path} in English`).toEqual(
        expect.any(String),
      );
      expect(readPath(messagesCs, path), `${path} in Czech`).toEqual(
        expect.any(String),
      );
    }
  });

  it.each([
    "Common.optional",
    "Communications.actions.close",
    "Onboarding.header.exit",
    "Onboarding.headings.titles.studio",
    "Onboarding.booking.question",
    "Onboarding.team.ownerDescription",
    "Reports.common.date",
    "Reports.common.time",
    "MigrationCenter.entities.memberships.description",
    "MigrationCenter.importers.memberships.mapping.fields.allowanceBalances",
    "MigrationCenter.importers.credits.validation.issueCodes.ledgerBalanceMismatch",
    "MigrationCenter.importers.vouchers.validation.issueCodes.legacySnapshotRequired",
  ])("provides localized Czech supporting copy for %s", (path) => {
    expect(readPath(messagesCs, path)).not.toBe(readPath(messagesEn, path));
  });
});
