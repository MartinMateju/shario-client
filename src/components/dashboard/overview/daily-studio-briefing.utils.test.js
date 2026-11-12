import { describe, expect, it } from "vitest";

import {
  dailyBriefingIdentity,
  dailyBriefingPriorityItems,
  dailyBriefingPriorities,
  dailyBriefingRequest,
  formatDailyBriefingTime,
  isDailyBriefingCurrent,
  isDailyBriefingStale,
  shouldGenerateDailyBriefing,
  tenantDateKey,
  unwrapDailyBriefing,
} from "./daily-studio-briefing.utils";

describe("daily studio briefing client contract", () => {
  it("unwraps direct and enveloped briefing responses", () => {
    const briefing = { id: "briefing-1" };

    expect(unwrapDailyBriefing(briefing)).toBe(briefing);
    expect(unwrapDailyBriefing({ briefing })).toBe(briefing);
    expect(unwrapDailyBriefing({ data: { briefing } })).toBe(briefing);
    expect(unwrapDailyBriefing(null)).toBeNull();
  });

  it("uses the tenant timezone at UTC and DST day boundaries", () => {
    expect(tenantDateKey("2026-03-28T23:30:00.000Z", "Europe/Prague")).toBe(
      "2026-03-29",
    );
    expect(tenantDateKey("2026-10-25T22:30:00.000Z", "Europe/Prague")).toBe(
      "2026-10-25",
    );
    expect(tenantDateKey("2026-08-03T08:00:00.000Z", "Not/AZone")).toBe(
      "2026-08-03",
    );
  });

  it("keeps location and locale in request and generation identity", () => {
    expect(
      dailyBriefingRequest({
        locale: "cs",
        locationId: "location-1",
        cacheScope: "tenant-1|access-2",
      }),
    ).toEqual({
      cacheScope: "tenant-1|access-2",
      locale: "cs",
      locationId: "location-1",
    });
    expect(dailyBriefingRequest({ locale: "en", locationId: "" })).toEqual({
      locale: "en",
    });
    expect(
      dailyBriefingIdentity({
        locale: "en",
        locationId: "location-1",
        dateKey: "2026-08-03",
        snapshotHash: "facts-a",
      }),
    ).not.toBe(
      dailyBriefingIdentity({
        locale: "en",
        locationId: "location-2",
        dateKey: "2026-08-03",
        snapshotHash: "facts-a",
      }),
    );
  });

  it("rejects a cached briefing for the wrong locale or tenant-local day", () => {
    const briefing = { locale: "en", dateKey: "2026-08-03" };

    expect(
      isDailyBriefingCurrent(briefing, {
        locale: "EN",
        dateKey: "2026-08-03",
      }),
    ).toBe(true);
    expect(
      isDailyBriefingCurrent(briefing, {
        locale: "cs",
        dateKey: "2026-08-03",
      }),
    ).toBe(false);
    expect(
      isDailyBriefingCurrent(briefing, {
        locale: "en",
        dateKey: "2026-08-04",
      }),
    ).toBe(false);
  });

  it("prefers verified structured attention over free-form legacy priorities", () => {
    expect(
      dailyBriefingPriorities({
        attention: [
          { id: "a", description: "Review one overdue task." },
          { id: "b", title: "Partial coverage" },
          null,
        ],
        priorities: ["Legacy priority"],
      }),
    ).toEqual(["Review one overdue task.", "Partial coverage"]);
    expect(
      dailyBriefingPriorities({ priorities: ["Legacy priority", null] }),
    ).toEqual(["Legacy priority"]);
    expect(
      dailyBriefingPriorityItems({
        attention: [
          {
            id: "tasks",
            description: "Review one overdue task.",
            href: "/app/operations?section=tasks",
          },
          {
            id: "unsafe",
            description: "Ignore unsafe navigation.",
            href: "https://example.com",
          },
        ],
      }),
    ).toEqual([
      {
        id: "tasks",
        label: "Review one overdue task.",
        href: "/app/operations?section=tasks",
      },
      {
        id: "unsafe",
        label: "Ignore unsafe navigation.",
        href: null,
      },
    ]);
  });

  it.each([
    ["en", "Europe/Prague", "2026-08-03T07:30:00.000Z", "09:30 AM"],
    ["cs", "Europe/Prague", "2026-08-03T07:30:00.000Z", "09:30"],
    ["en", "Europe/Prague", "2026-12-03T07:30:00.000Z", "08:30 AM"],
    ["en", "Not/AZone", "2026-08-03T07:30:00.000Z", "07:30 AM"],
  ])(
    "formats %s update times in %s for %s",
    (locale, timezone, value, expected) => {
      expect(
        formatDailyBriefingTime(value, { locale, timezone }).replace(
          /\s/g,
          " ",
        ),
      ).toBe(expected);
    },
  );

  it("generates only when an eligible current-day briefing is absent or stale", () => {
    const base = {
      canGenerate: true,
      isToday: true,
      isLoading: false,
      isFetching: false,
      isError: false,
      locale: "en",
      dateKey: "2026-08-03",
    };
    expect(shouldGenerateDailyBriefing({ ...base, briefing: null })).toBe(true);
    expect(
      shouldGenerateDailyBriefing({
        ...base,
        briefing: {
          locale: "en",
          dateKey: "2026-08-03",
          freshness: { state: "stale" },
        },
      }),
    ).toBe(true);
    expect(
      shouldGenerateDailyBriefing({
        ...base,
        briefing: {
          locale: "en",
          dateKey: "2026-08-03",
          freshness: { state: "fresh" },
        },
      }),
    ).toBe(false);
    expect(
      shouldGenerateDailyBriefing({ ...base, briefing: null, isToday: false }),
    ).toBe(false);
    expect(
      shouldGenerateDailyBriefing({ ...base, briefing: null, isError: true }),
    ).toBe(false);
    expect(isDailyBriefingStale(null)).toBe(true);
  });
});
