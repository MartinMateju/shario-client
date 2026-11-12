import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const source = readFileSync(
  path.join(
    projectRoot,
    "src/lib/features/notification/notificationsApiSlice.js",
  ),
  "utf8",
);

describe("workspace notifications API contract", () => {
  it("uses the tenant-derived notification endpoints", () => {
    expect(source).toContain(
      'const WORKSPACE_NOTIFICATIONS_URL = "/tenants/current/notifications"',
    );
    expect(source).toContain("`${WORKSPACE_NOTIFICATIONS_URL}/summary`");
    expect(source).toContain(
      "`${WORKSPACE_NOTIFICATIONS_URL}/${encodeURIComponent(",
    );
    expect(source).toContain("`${WORKSPACE_NOTIFICATIONS_URL}/read-all`");
  });

  it("uses the expected write verbs and invalidates list and summary caches", () => {
    expect(source).toMatch(
      /markWorkspaceNotificationRead:[\s\S]*?method: "PATCH"/,
    );
    expect(source).toMatch(
      /markAllWorkspaceNotificationsRead:[\s\S]*?method: "POST"/,
    );
    expect(source).toContain('id: "WORKSPACE-LIST"');
    expect(source).toContain('id: "WORKSPACE-SUMMARY"');
  });

  it("does not expose the removed specialist reminder endpoint", () => {
    expect(source).not.toContain("/notifications/send-out-emails");
    expect(source).not.toContain("useSendOutNotificationsMutation");
  });
});
