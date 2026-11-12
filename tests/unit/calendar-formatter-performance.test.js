import { describe, expect, it, vi } from "vitest";

import {
  dateKey,
  formatTime,
  wallTimeMinutes,
} from "@/components/calendar/calendar.utils";
import {
  formatWallDate,
  formatWallTime,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";

describe("calendar formatter performance", () => {
  it("preserves timezone-specific output when a busy multi-studio session replaces cached formatters", () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function createDateTimeFormat(...args) {
        return new NativeDateTimeFormat(...args);
      });
    try {
      const instant = new Date("2030-07-15T23:45:00.000Z");
      const original = [
        formatTime(instant, "en-GB", "UTC"),
        formatWallTime(instant, "UTC"),
      ];

      for (const timeZone of Intl.supportedValuesOf("timeZone").slice(0, 80)) {
        const expected = new NativeDateTimeFormat("en-GB", {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(instant);
        expect(formatTime(instant, "en-GB", timeZone)).toBe(expected);
        expect(formatWallTime(instant, timeZone)).toBe(expected);
      }

      formatterSpy.mockClear();
      expect([
        formatTime(instant, "en-GB", "UTC"),
        formatWallTime(instant, "UTC"),
      ]).toEqual(original);
      expect(formatterSpy).toHaveBeenCalledTimes(2);

      formatTime(instant, "en-GB", "UTC");
      formatWallTime(instant, "UTC");
      expect(formatterSpy).toHaveBeenCalledTimes(2);
    } finally {
      formatterSpy.mockRestore();
    }
  });

  it("evicts old formatter entries while reusing the most recent locale", () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function createDateTimeFormat(...args) {
        return new NativeDateTimeFormat(...args);
      });
    try {
      const instant = new Date("2099-08-04T10:15:00.000Z");
      const locale = (index) => `en-GB-x-cache${index}`;
      for (let index = 0; index < 65; index += 1) {
        expect(formatTime(instant, locale(index), "UTC")).toBe("10:15");
      }
      expect(formatterSpy).toHaveBeenCalledTimes(65);

      expect(formatTime(instant, locale(64), "UTC")).toBe("10:15");
      expect(formatterSpy).toHaveBeenCalledTimes(65);
      expect(formatTime(instant, locale(0), "UTC")).toBe("10:15");
      expect(formatterSpy).toHaveBeenCalledTimes(66);
    } finally {
      formatterSpy.mockRestore();
    }
  });

  it("reuses timezone formatters for repeated slot calculations", () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function createDateTimeFormat(...args) {
        return new NativeDateTimeFormat(...args);
      });
    try {
      const timeZone = "Pacific/Chatham";
      const instant = new Date("2099-08-04T10:15:00.000Z");
      const calculate = () => {
        dateKey(instant, timeZone);
        wallTimeMinutes(instant, timeZone);
        formatTime(instant, "en-NZ", timeZone);
        formatWallDate(instant, timeZone);
        formatWallTime(instant, timeZone);
        zonedDateTimeToUtc("2099-08-04", "22:45", timeZone);
      };

      calculate();
      const formatterCountAfterFirstPass = formatterSpy.mock.calls.length;

      for (let index = 0; index < 25; index += 1) calculate();

      expect(formatterCountAfterFirstPass).toBeGreaterThan(0);
      expect(formatterCountAfterFirstPass).toBeLessThanOrEqual(6);
      expect(formatterSpy).toHaveBeenCalledTimes(formatterCountAfterFirstPass);
    } finally {
      formatterSpy.mockRestore();
    }
  });
});
