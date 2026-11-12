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

describe("customer notifications API contract", () => {
  it("uses only the authenticated customer inbox routes", () => {
    expect(source).toContain(
      'const CUSTOMER_NOTIFICATIONS_URL = "/notifications/mine"',
    );
    expect(source).toContain("`${CUSTOMER_NOTIFICATIONS_URL}/summary`");
    expect(source).toContain(
      "`${CUSTOMER_NOTIFICATIONS_URL}/${encodeURIComponent(",
    );
    expect(source).toContain("`${CUSTOMER_NOTIFICATIONS_URL}/read-all`");
  });

  it("uses the expected write verbs and customer-only cache tags", () => {
    expect(source).toMatch(
      /markCustomerNotificationRead:[\s\S]*?method: "PATCH"/,
    );
    expect(source).toMatch(
      /markAllCustomerNotificationsRead:[\s\S]*?method: "POST"/,
    );
    expect(source).toContain('id: "CUSTOMER-LIST"');
    expect(source).toContain('id: "CUSTOMER-SUMMARY"');
    expect(source).toContain("id: `CUSTOMER-${String(notificationId)}`");
  });

  it("exports the four customer hooks without changing workspace hooks", () => {
    for (const hook of [
      "useGetCustomerNotificationsQuery",
      "useGetCustomerNotificationSummaryQuery",
      "useMarkCustomerNotificationReadMutation",
      "useMarkAllCustomerNotificationsReadMutation",
      "useGetWorkspaceNotificationsQuery",
    ]) {
      expect(source).toContain(hook);
    }
  });
});
