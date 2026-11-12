import { describe, expect, it } from "vitest";

import {
  normalizeDashboardScope,
  unwrapDashboardEnvelope,
} from "@/lib/features/dashboard/dashboardApiSlice";
import {
  FLOW_KEYS,
  buildPulsePath,
  getLocalDateKey,
  normalizeOverview,
} from "@/components/dashboard/overview/overview.utils";

describe("dashboard overview API contract", () => {
  it("uses a narrow date and location scope", () => {
    expect(
      normalizeDashboardScope({
        date: "2026-07-30",
        locationId: "location-1",
        tenantId: "must-not-be-sent",
      }),
    ).toEqual({
      date: "2026-07-30",
      locationId: "location-1",
    });
    expect(normalizeDashboardScope({ date: "2026-07-30" })).toEqual({
      date: "2026-07-30",
    });
  });

  it("unwraps the standard API envelope", () => {
    expect(
      unwrapDashboardEnvelope({ data: { metadata: { date: "2026-07-30" } } }),
    ).toEqual({ metadata: { date: "2026-07-30" } });
  });

  it("preserves unavailable metrics as null instead of turning them into zero", () => {
    const overview = normalizeOverview({
      flow: [
        { key: "booked", value: 0, available: true, unit: "bookings" },
        { key: "inStudio", value: null, available: false, unit: "people" },
      ],
      businessPulse: {
        occupancy: { available: false, value: null },
        bookings: { available: true, value: 0 },
      },
    });

    expect(overview.flow.map((item) => item.key)).toEqual(FLOW_KEYS);
    expect(overview.flow.find((item) => item.key === "booked")).toMatchObject({
      available: true,
      value: 0,
    });
    expect(overview.flow.find((item) => item.key === "inStudio")).toMatchObject(
      {
        available: false,
        value: null,
      },
    );
    expect(overview.businessPulse.occupancy).toEqual({
      available: false,
      value: null,
      unit: null,
    });
    expect(overview.businessPulse.bookings.value).toBe(0);
  });

  it("normalizes the explicit first-booking milestone without inferring it", () => {
    expect(
      normalizeOverview({
        businessPulse: { bookings: { available: true, value: 1 } },
      }).milestones.firstCustomerBooking,
    ).toEqual({
      applicable: false,
      available: false,
      achieved: null,
    });

    expect(
      normalizeOverview({
        milestones: {
          firstCustomerBooking: {
            applicable: true,
            available: true,
            achieved: true,
          },
        },
      }).milestones.firstCustomerBooking,
    ).toEqual({
      applicable: true,
      available: true,
      achieved: true,
    });
  });

  it("keeps operational signal availability separate from empty results", () => {
    const overview = normalizeOverview({
      signals: {
        messages: {
          available: true,
          unreadCount: 0,
          items: [],
        },
        tasks: {
          available: false,
          openCount: null,
          items: null,
        },
      },
    });

    expect(overview.signals.messages).toEqual({
      available: true,
      unreadCount: 0,
      items: [],
    });
    expect(overview.signals.tasks).toEqual({
      available: false,
      openCount: null,
      items: [],
    });
  });

  it("creates a bounded SVG trend path only when enough values exist", () => {
    expect(buildPulsePath([{ label: "Mon", value: 2 }])).toBe("");
    expect(
      buildPulsePath([
        { label: "Mon", value: 2 },
        { label: "Tue", value: 4 },
        { label: "Wed", value: 3 },
      ]),
    ).toMatch(/^M 0\.0 \d+\.\d L 230\.0 \d+\.\d L 460\.0 \d+\.\d$/);
  });

  it("derives today from the studio timezone rather than the browser timezone", () => {
    const instant = new Date("2026-07-30T23:30:00.000Z");

    expect(getLocalDateKey(instant, "Europe/Prague")).toBe("2026-07-31");
    expect(getLocalDateKey(instant, "America/New_York")).toBe("2026-07-30");
  });
});
