import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTOMATED_EMAIL_TAB,
  resolveAutomatedCommunicationsView,
} from "@/components/views/automated_communications/automatedCommunicationsTabs";

const availableTabs = ["automations", "history", "senders"];

describe("automated communications navigation", () => {
  it("opens sent-email history when the URL has no tab", () => {
    expect(DEFAULT_AUTOMATED_EMAIL_TAB).toBe("history");
    expect(resolveAutomatedCommunicationsView(null, availableTabs)).toEqual({
      activeTab: "history",
      templatesOpen: false,
    });
  });

  it("preserves valid tab deep links", () => {
    expect(
      resolveAutomatedCommunicationsView("automations", availableTabs),
    ).toEqual({ activeTab: "automations", templatesOpen: false });
    expect(
      resolveAutomatedCommunicationsView("senders", availableTabs),
    ).toEqual({ activeTab: "senders", templatesOpen: false });
  });

  it("opens Templates as a dedicated subpage without selecting an unrelated tab", () => {
    expect(
      resolveAutomatedCommunicationsView("templates", availableTabs),
    ).toEqual({ activeTab: null, templatesOpen: true });
  });

  it("falls back to History for unavailable or unknown tabs", () => {
    expect(
      resolveAutomatedCommunicationsView("senders", ["automations", "history"]),
    ).toEqual({ activeTab: "history", templatesOpen: false });
    expect(
      resolveAutomatedCommunicationsView("unknown", availableTabs),
    ).toEqual({ activeTab: "history", templatesOpen: false });
  });
});
