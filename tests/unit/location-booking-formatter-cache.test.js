import { describe, expect, it, vi } from "vitest";

describe("location booking formatter cache", () => {
  it("evicts an old formatter at the cache limit without changing timezone dates", async () => {
    vi.resetModules();
    const { formatZonedDate } = await import("@/utils/locationBookingUtils");
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const timeZones = Intl.supportedValuesOf("timeZone").slice(0, 65);
    const instant = new Date("2026-07-20T23:30:00.000Z");
    const expectedDates = timeZones.map((timeZone) =>
      new NativeDateTimeFormat("en-GB", {
        timeZone,
        dateStyle: "medium",
      }).format(instant),
    );
    const formatterSpy = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function createDateTimeFormat(...args) {
        return new NativeDateTimeFormat(...args);
      });

    try {
      expect(timeZones).toHaveLength(65);
      for (let index = 0; index < 64; index += 1) {
        expect(formatZonedDate(instant, timeZones[index])).toBe(
          expectedDates[index],
        );
      }
      expect(formatterSpy).toHaveBeenCalledTimes(64);

      // A full cache still reuses existing entries; only a new key evicts one.
      expect(formatZonedDate(instant, timeZones[0])).toBe(expectedDates[0]);
      expect(formatterSpy).toHaveBeenCalledTimes(64);
      expect(formatZonedDate(instant, timeZones[64])).toBe(expectedDates[64]);
      expect(formatterSpy).toHaveBeenCalledTimes(65);

      // The oldest entry was evicted, while the next and newest stay cached.
      expect(formatZonedDate(instant, timeZones[1])).toBe(expectedDates[1]);
      expect(formatterSpy).toHaveBeenCalledTimes(65);
      expect(formatZonedDate(instant, timeZones[0])).toBe(expectedDates[0]);
      expect(formatterSpy).toHaveBeenCalledTimes(66);
      expect(formatZonedDate(instant, timeZones[64])).toBe(expectedDates[64]);
      expect(formatterSpy).toHaveBeenCalledTimes(66);
    } finally {
      formatterSpy.mockRestore();
    }
  });
});
