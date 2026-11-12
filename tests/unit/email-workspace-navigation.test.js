import { describe, expect, it } from "vitest";

import {
  getEmailWorkspaceHref,
  resolveEmailWorkspaceSection,
} from "@/components/communications/email/emailWorkspaceNavigation";

describe("email workspace navigation", () => {
  it.each([
    ["inbox", null, "history"],
    ["routing", null, "history"],
    ["settings", null, "setup"],
    ["automations", "history", "history"],
    ["automations", "templates", "templates"],
    ["automations", "senders", "setup"],
  ])("maps legacy section %s / %s to %s", (section, tab, expected) => {
    expect(resolveEmailWorkspaceSection({ section, tab })).toBe(expected);
  });

  it("falls back when setup is hidden by permissions", () => {
    expect(
      resolveEmailWorkspaceSection({
        section: "setup",
        availableSections: ["history", "automations", "templates"],
      }),
    ).toBe("history");
  });

  it("keeps retired Inbox links on History even with stale available sections", () => {
    expect(
      resolveEmailWorkspaceSection({
        section: "inbox",
        availableSections: ["history", "inbox", "setup"],
      }),
    ).toBe("history");
  });

  it("preserves setup context while removing retired compose and nested tab state", () => {
    const href = getEmailWorkspaceHref(
      new URLSearchParams(
        "section=automations&tab=senders&compose=1&source=launch",
      ),
      "setup",
    );

    expect(href).toContain("section=setup");
    expect(href).not.toContain("compose=");
    expect(href).toContain("source=launch");
    expect(href).not.toContain("tab=");
  });
});
