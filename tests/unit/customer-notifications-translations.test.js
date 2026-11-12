import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const readMessages = (locale) =>
  JSON.parse(
    readFileSync(
      path.join(process.cwd(), `src/messages/${locale}.json`),
      "utf8",
    ),
  );

const flattenKeys = (value, prefix = "") =>
  Object.entries(value || {}).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child, next)
      : [next];
  });

describe("customer notification translations", () => {
  it("keeps complete EN and CS key parity", () => {
    const en = readMessages("en").CustomerNotifications;
    const cs = readMessages("cs").CustomerNotifications;

    expect(en).toBeTruthy();
    expect(cs).toBeTruthy();
    expect(flattenKeys(cs).sort()).toEqual(flattenKeys(en).sort());
  });

  it("covers only customer-facing categories in both locales", () => {
    const expected = [
      "account",
      "all",
      "bookings",
      "credits_vouchers",
      "memberships",
      "payments",
      "waitlist",
    ];

    for (const locale of ["en", "cs"]) {
      const messages = readMessages(locale).CustomerNotifications;

      expect(Object.keys(messages.categories).sort()).toEqual(expected);
      expect(messages.triggerUnread).toContain("{count, plural");
      expect(messages.page.unreadSummary).toContain("{count, plural");
      expect(JSON.stringify(messages)).not.toMatch(
        /inventory|migration|staff task/i,
      );
    }
  });
});
