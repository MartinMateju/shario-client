import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatSalesPeriod,
  getSalesPeriod,
} from "@/components/sales/sales-period.utils";

describe("sales reporting periods", () => {
  beforeEach(() => vi.stubEnv("TZ", "Europe/Prague"));
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["7", "2026-10-13"],
    ["30", "2026-09-20"],
    ["90", "2026-07-22"],
    ["month", "2026-10-01"],
  ])(
    "includes exactly the requested calendar days for %s",
    (dateRange, from) => {
      const period = getSalesPeriod(
        { dateRange },
        new Date("2026-10-19T12:00:00"),
      );
      expect(period.from).toBe(from);
      expect(period.to).toBe("2026-10-19");
      expect(new Date(period.dateFrom).getHours()).toBe(0);
      expect(new Date(period.dateTo).getHours()).toBe(23);
      expect(new Date(period.dateTo).getMilliseconds()).toBe(999);
    },
  );

  it("clears both API bounds for all time, even after a custom range", () => {
    expect(
      getSalesPeriod({
        dateRange: "all",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
      }),
    ).toEqual({
      from: "",
      to: "",
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it.each([
    ["2026-03-29", "2026-03-28T23:00:00.000Z", "2026-03-29T21:59:59.999Z"],
    ["2026-10-25", "2026-10-24T22:00:00.000Z", "2026-10-25T22:59:59.999Z"],
  ])(
    "includes the complete %s day across daylight saving changes",
    (date, dateFrom, dateTo) => {
      expect(
        getSalesPeriod({ dateRange: "custom", dateFrom: date, dateTo: date }),
      ).toEqual({ from: date, to: date, dateFrom, dateTo });
    },
  );

  it("uses calendar arithmetic across DST in a preset", () => {
    const period = getSalesPeriod(
      { dateRange: "7" },
      new Date("2026-03-31T12:00:00"),
    );
    expect(period).toEqual({
      from: "2026-03-25",
      to: "2026-03-31",
      dateFrom: "2026-03-24T23:00:00.000Z",
      dateTo: "2026-03-31T21:59:59.999Z",
    });
  });

  it.each([
    ["", "2026-10-19"],
    ["2026-02-30", "2026-10-19"],
    ["2026-10-20", "2026-10-19"],
  ])("rejects invalid custom dates %s to %s", (dateFrom, dateTo) => {
    expect(() =>
      getSalesPeriod({ dateRange: "custom", dateFrom, dateTo }),
    ).toThrow(RangeError);
  });

  it.each(["en", "cs"])(
    "formats the actual dates in %s without shifting a day",
    (locale) => {
      const period = getSalesPeriod({
        dateRange: "custom",
        dateFrom: "2026-09-20",
        dateTo: "2026-10-19",
      });
      const label = formatSalesPeriod(period, locale);
      expect(label).toContain("20");
      expect(label).toContain("19");
      expect(label).toContain("2026");
      expect(
        formatSalesPeriod(getSalesPeriod({ dateRange: "all" }), locale),
      ).toBe("");
    },
  );
});
