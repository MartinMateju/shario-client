import { describe, expect, it } from "vitest";

import {
  dashboardNavigation,
  dashboardNavigationGroups,
} from "@/components/dashboard/dashboard.data";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

const controlKeys = [
  "sidebarLabel",
  "settingsNavigationLabel",
  "utilityNavigationLabel",
  "closeNavigation",
  "setupCenter",
  "openSetupCenter",
  "launchCenterRequiredProgress",
  "launchCenterLiveBadge",
  "launchCenterReadyBadge",
  "launchCenterIssueBadge",
  "launchCenterLiveStatus",
  "launchCenterReadyStatus",
  "launchCenterAttentionStatus",
  "expandGroup",
  "collapseGroup",
  "expandSidebar",
  "collapseSidebar",
];

const navigationLabelKeys = [
  ...new Set([
    ...dashboardNavigation.map((item) => item.labelKey || item.key),
    ...dashboardNavigationGroups
      .filter((entry) => entry.type === "group")
      .map((entry) => entry.labelKey),
  ]),
];

describe.each([
  ["English", messagesEn],
  ["Czech", messagesCs],
])("dashboard sidebar %s translations", (_language, messages) => {
  it("provides every control and navigation label used by the sidebar", () => {
    for (const key of controlKeys) {
      expect(messages.Dashboard[key], `Dashboard.${key}`).toEqual(
        expect.any(String),
      );
      expect(messages.Dashboard[key].trim(), `Dashboard.${key}`).not.toBe("");
    }

    for (const key of navigationLabelKeys) {
      expect(messages.Dashboard.nav[key], `Dashboard.nav.${key}`).toEqual(
        expect.any(String),
      );
      expect(
        messages.Dashboard.nav[key].trim(),
        `Dashboard.nav.${key}`,
      ).not.toBe("");
    }
  });
});
