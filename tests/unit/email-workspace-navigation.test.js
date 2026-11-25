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
        "section=automations&tab=senders&compose=1&source=launch&setupStep=communications",
      ),
      "setup",
    );

    expect(href).toBe(
      "/app/settings/communications?source=launch&setupStep=communications",
    );
    expect(href).not.toContain("compose=");
    expect(href).toContain("source=launch");
    expect(href).not.toContain("tab=");
  });

  it("uses one canonical setup page without an empty query", () => {
    expect(
      getEmailWorkspaceHref(new URLSearchParams("section=setup"), "setup"),
    ).toBe("/app/settings/communications");
  });

  it.each(["history", "automations", "templates", "setup"])(
    "does not carry a door-code editor into the %s section",
    (section) => {
      const href = getEmailWorkspaceHref(
        new URLSearchParams(
          "section=templates&doorLocation=location-a&source=settings&location=grohova",
        ),
        section,
      );
      const url = new URL(href, "https://studio.example");
      expect(url.searchParams.has("doorLocation")).toBe(false);
      expect(url.searchParams.get("source")).toBe("settings");
      expect(url.searchParams.get("location")).toBe("grohova");
      expect(url.pathname).toBe(
        section === "setup"
          ? "/app/settings/communications"
          : "/app/communications",
      );
    },
  );
});
