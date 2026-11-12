import { describe, expect, it } from "vitest";

import {
  formatOverviewDate,
  formatOverviewDateShort,
  formatOverviewTime,
  formatSignalDate,
  normalizeOverviewDateKey,
  shiftOverviewDateKey,
} from "@/components/dashboard/overview/overview.utils";
import { formatDailyBriefingTime } from "@/components/dashboard/overview/daily-studio-briefing.utils";

describe("dashboard locale formatting", () => {
  it("validates overview date keys instead of accepting normalized overflow", () => {
    expect(normalizeOverviewDateKey("2026-02-28")).toBe("2026-02-28");
    expect(normalizeOverviewDateKey("2028-02-29")).toBe("2028-02-29");
    expect(normalizeOverviewDateKey("2026-02-29")).toBeNull();
    expect(normalizeOverviewDateKey("2026-13-01")).toBeNull();
    expect(normalizeOverviewDateKey("July 30, 2026")).toBeNull();
  });

  it("moves by calendar days across month, year, and leap-day boundaries", () => {
    expect(shiftOverviewDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftOverviewDateKey("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftOverviewDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftOverviewDateKey("not-a-date", 1)).toBeNull();
  });

  it.each([
    ["de", "Montag", "17.8.2026"],
    ["pl", "poniedziałek", "17.08.2026"],
    ["sk", "pondelok", "17. 8. 2026"],
    ["da", "mandag", "17.8.2026"],
    ["fr", "lundi", "17/08/2026"],
    ["es", "lunes", "17/8/2026"],
    ["it", "lunedì", "17/08/2026"],
    ["pt_PT", "segunda-feira", "17/08/2026"],
    ["sv", "måndag", "2026-08-17"],
    ["no_NO", "mandag", "17.8.2026"],
    ["fi", "maanantaina", "17.8.2026"],
    ["hu-HU", "hétfő", "2026. 08. 17."],
    ["el_GR", "Δευτέρα", "17/8/2026"],
    ["tr", "Pazartesi", "17.08.2026"],
    ["nl_NL", "maandag", /^17-0?8-2026$/],
    ["ro_RO", "luni", "17.08.2026"],
  ])(
    "formats overview dates with the canonical Intl locale for %s",
    (locale, weekday, shortDate) => {
      const fullDate = formatOverviewDate("2026-08-17", locale);

      expect(fullDate.toLocaleLowerCase()).toContain(weekday.toLowerCase());
      expect(fullDate).not.toContain("Monday");
      const formattedShortDate = formatOverviewDateShort("2026-08-17", locale);
      if (shortDate instanceof RegExp) {
        expect(formattedShortDate).toMatch(shortDate);
      } else {
        expect(formattedShortDate).toBe(shortDate);
      }
    },
  );

  it("uses locale-specific time punctuation throughout the overview", () => {
    const value = "2026-08-17T08:05:00.000Z";

    expect(formatOverviewTime(value, "da", "Europe/Prague")).toBe("10.05");
    expect(
      formatDailyBriefingTime(value, {
        locale: "da-DK",
        timezone: "Europe/Prague",
      }),
    ).toBe("10.05");
    expect(formatOverviewTime(value, "sv", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "nb", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "fi", "Europe/Prague")).toBe("10.05");
    expect(formatOverviewTime(value, "hu", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "el", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "tr", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "nl", "Europe/Prague")).toBe("10:05");
    expect(formatOverviewTime(value, "ro", "Europe/Prague")).toBe("10:05");
  });

  it("uses the active locale for signal dates", () => {
    expect(
      formatSignalDate("2026-08-17T08:05:00.000Z", "de", "Europe/Prague", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    ).toContain("Montag");
  });

  it("falls back safely when legacy workspace time zones are invalid", () => {
    const value = "2026-08-17T08:05:00.000Z";

    expect(formatOverviewTime(value, "de", "Legacy/Invalid")).not.toBe("—");
    expect(
      formatSignalDate(value, "de", "Legacy/Invalid", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    ).not.toBe("");
    expect(
      formatDailyBriefingTime(value, {
        locale: "de",
        timezone: "Legacy/Invalid",
      }),
    ).not.toBe("");
  });
});
