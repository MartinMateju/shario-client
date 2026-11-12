import { describe, expect, it } from "vitest";

import {
  formatGreetingName,
  getGreetingPeriod,
  getGreetingTranslationKey,
  getTimeOfDayIcon,
  resolveDashboardTimeZone,
} from "@/lib/features/dashboard/dashboardGreeting";

describe("dashboard greeting utilities", () => {
  it.each([
    ["2026-08-03T04:59:00.000Z", "lateNight"],
    ["2026-08-03T05:00:00.000Z", "morning"],
    ["2026-08-03T11:59:00.000Z", "morning"],
    ["2026-08-03T12:00:00.000Z", "afternoon"],
    ["2026-08-03T17:59:00.000Z", "afternoon"],
    ["2026-08-03T18:00:00.000Z", "evening"],
    ["2026-08-03T21:59:00.000Z", "evening"],
    ["2026-08-03T22:00:00.000Z", "lateNight"],
  ])("maps the UTC boundary at %s to %s", (instant, expected) => {
    expect(getGreetingPeriod(new Date(instant), "UTC")).toBe(expected);
  });

  it("calculates the period in the resolved display timezone", () => {
    const instant = new Date("2026-08-03T16:30:00.000Z");

    expect(getGreetingPeriod(instant, "Europe/Prague")).toBe("evening");
    expect(getGreetingPeriod(instant, "America/New_York")).toBe("afternoon");
  });

  it("resolves user preference, browser, tenant, then UTC", () => {
    expect(
      resolveDashboardTimeZone({
        workspaceTimeZone: "America/New_York",
        browserTimeZone: "Asia/Tokyo",
        tenantTimeZone: "Europe/London",
      }),
    ).toBe("America/New_York");

    expect(
      resolveDashboardTimeZone({
        workspaceTimeZone: "Not/A-Timezone",
        browserTimeZone: "Asia/Tokyo",
        tenantTimeZone: "Europe/London",
      }),
    ).toBe("Asia/Tokyo");

    expect(
      resolveDashboardTimeZone({
        browserTimeZone: "Invalid/Browser",
        tenantTimeZone: "Europe/London",
      }),
    ).toBe("Europe/London");

    expect(resolveDashboardTimeZone({ browserTimeZone: "Asia/Tokyo" })).toBe(
      "Asia/Tokyo",
    );
    expect(resolveDashboardTimeZone()).toBe("UTC");
  });

  it("uses a neutral translation at night", () => {
    expect(getGreetingTranslationKey("morning")).toBe("greetingMorning");
    expect(getGreetingTranslationKey("afternoon")).toBe("greetingAfternoon");
    expect(getGreetingTranslationKey("evening")).toBe("greetingEvening");
    expect(getGreetingTranslationKey("lateNight")).toBe("greeting");
    expect(getGreetingTranslationKey("neutral")).toBe("greeting");
  });

  it("maps greeting periods to minimal time icons", () => {
    expect(getTimeOfDayIcon("morning")).toBe("sun");
    expect(getTimeOfDayIcon("afternoon")).toBe("sun");
    expect(getTimeOfDayIcon("evening")).toBe("moon");
    expect(getTimeOfDayIcon("lateNight")).toBe("moon");
    expect(getTimeOfDayIcon("neutral")).toBeNull();
    expect(getTimeOfDayIcon("unknown")).toBeNull();
  });

  it("normalizes greeting-name casing without flattening mixed-case names", () => {
    expect(formatGreetingName("martin", "en")).toBe("Martin");
    expect(formatGreetingName("MARTIN", "en")).toBe("Martin");
    expect(formatGreetingName("McDonald", "en")).toBe("McDonald");
    expect(formatGreetingName("", "en")).toBe("");
    expect(formatGreetingName(null, "en")).toBe("");
  });

  it("uses the Czech vocative for localized greetings", () => {
    expect(formatGreetingName("martin", "cs")).toBe("Martine");
    expect(formatGreetingName("Petr", "cs-CZ")).toBe("Petře");
    expect(formatGreetingName("Jana", "cs")).toBe("Jano");
    expect(formatGreetingName("uživateli", "cs")).toBe("Uživateli");
  });
});
