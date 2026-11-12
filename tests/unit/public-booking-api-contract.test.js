import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      captured.endpoints = endpoints({ query: (definition) => definition });
      return {
        useGetPublicBookingLocationsQuery: vi.fn(),
        useGetPublicBookingOccupancyLocationsQuery: vi.fn(),
        useGetPublicBookingAvailabilityQuery: vi.fn(),
        useGetPublicBookingOccupancyQuery: vi.fn(),
        useGetPublicCourseSessionsQuery: vi.fn(),
      };
    },
  },
}));

import {
  normalizePublicAvailability,
  normalizePublicCourseSessions,
  normalizePublicLocations,
  normalizePublicOccupancy,
} from "@/lib/features/publicBooking/publicBookingApiSlice";

describe("public booking API contracts", () => {
  it("requests availability for the chosen mode and whole party", () => {
    const query = captured.endpoints.getPublicBookingAvailability.query({
      tenantSlug: "studio",
      productId: "product",
      locationId: "location",
      date: "2026-11-10",
      bookingMode: "private",
      numberOfGuests: 8,
    });
    expect(query.params).toMatchObject({
      bookingMode: "private",
      numberOfGuests: 8,
    });
    const location = normalizePublicLocations([
      { id: "location", booking: { globalCapacity: 8 } },
    ])[0];
    expect(location.booking.globalCapacity).toBe(8);
  });

  it("keeps public calendar requests anonymous at both header and cookie boundaries", () => {
    const bookingSource = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/features/publicBooking/publicBookingApiSlice.js",
      ),
      "utf8",
    );
    const productSource = readFileSync(
      resolve(process.cwd(), "src/lib/features/products/productsApiSlice.js"),
      "utf8",
    );
    const baseSource = readFileSync(
      resolve(process.cwd(), "src/lib/features/api/apiSlice.js"),
      "utf8",
    );

    for (const endpoint of [
      "getPublicBookingLocations",
      "getPublicBookingOccupancyLocations",
      "getPublicBookingOccupancy",
    ]) {
      expect(baseSource).toContain(`"${endpoint}"`);
    }
    expect(
      bookingSource.match(/credentials: "omit"/g)?.length,
    ).toBeGreaterThanOrEqual(4);
    expect(bookingSource).toContain(
      "url: `${publicBookingBase(tenantSlug)}/occupancy-locations`",
    );
    expect(productSource).toContain("getPublicProducts: builder.query");
    expect(productSource).toContain('credentials: "omit"');
    expect(baseSource).toContain(
      "if (ANONYMOUS_API_ENDPOINTS.has(api.endpoint))",
    );
  });

  it("normalizes only public location fields needed by booking", () => {
    expect(
      normalizePublicLocations({
        locations: [
          {
            id: "location-1",
            name: "Main studio",
            timezone: "Europe/Prague",
            booking: {
              enabled: true,
              timezone: "Europe/Prague",
              privateCapacityRule: "do-not-ship",
            },
            openingHours: {
              monday: {
                isOpen: true,
                openTime: "08:00",
                closeTime: "20:00",
                privateStaffNote: "do-not-ship",
              },
              privateOverride: { note: "do-not-ship" },
            },
            privateDoorCode: "do-not-ship",
            access: { internalInstructions: "private" },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        id: "location-1",
        _id: "location-1",
        name: "Main studio",
        timeZone: "Europe/Prague",
        booking: expect.objectContaining({
          enabled: true,
          timezone: "Europe/Prague",
        }),
        openingHours: {
          monday: {
            isOpen: true,
            openTime: "08:00",
            closeTime: "20:00",
          },
        },
      }),
    ]);
    const serialized = JSON.stringify(
      normalizePublicLocations({
        locations: [
          {
            id: "location-1",
            name: "Main studio",
            privateDoorCode: "do-not-ship",
            access: { internalInstructions: "private" },
          },
        ],
      }),
    );

    expect(serialized).not.toContain("do-not-ship");
    expect(serialized).not.toContain("internalInstructions");
  });

  it("rejects id-only occupancy locations and invalid timezone values", () => {
    expect(
      normalizePublicOccupancy({
        location: "location-1",
        timeZone: "Not/A_Real_Zone",
        blocks: [],
      }),
    ).toMatchObject({
      location: null,
      timeZone: "",
    });

    expect(
      normalizePublicLocations({
        locations: [
          {
            id: "location-1",
            name: { private: "not text" },
            booking: {
              enabled: true,
              timezone: "Not/A_Real_Zone",
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        id: "location-1",
        name: "",
        booking: expect.objectContaining({ timezone: "" }),
      }),
    ]);
  });

  it("normalizes availability and preserves server capacity decisions", () => {
    const result = normalizePublicAvailability({
      date: "2026-08-03",
      timeZone: "Europe/Prague",
      slots: [
        {
          start: "2026-08-03T08:00:00.000Z",
          end: "2026-08-03T10:00:00.000Z",
          available: false,
          remainingCapacity: 0,
        },
      ],
    });

    expect(result.slots).toEqual([
      expect.objectContaining({
        available: false,
        remainingCapacity: 0,
      }),
    ]);
  });

  it("keeps only anonymous occupancy fields", () => {
    const result = normalizePublicOccupancy({
      location: { id: "location-1", name: "Main studio" },
      from: "2026-08-03",
      to: "2026-08-09",
      timeZone: "Europe/Prague",
      blocks: [
        {
          start: "2026-08-03T08:00:00.000Z",
          end: "2026-08-03T10:00:00.000Z",
          kind: "occupied",
          bookingId: "private-booking-id",
          customerName: "Private Customer",
          email: "private@example.test",
          paymentStatus: "CONFIRMED",
        },
      ],
    });

    expect(result.blocks).toEqual([
      {
        start: "2026-08-03T08:00:00.000Z",
        end: "2026-08-03T10:00:00.000Z",
        kind: "occupied",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("private-booking-id");
    expect(JSON.stringify(result)).not.toContain("Private Customer");
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(JSON.stringify(result)).not.toContain("CONFIRMED");
  });

  it("normalizes the published course session DTO", () => {
    expect(
      normalizePublicCourseSessions({
        sessions: [
          {
            id: "session-1",
            start: "2026-08-03T08:00:00.000Z",
            end: "2026-08-03T10:00:00.000Z",
            language: "CS",
            location: "location-1",
            capacity: 8,
            remainingCapacity: 3,
            available: true,
            waitlist: {
              enabled: true,
              accepting: false,
              joinDeadline: "2026-08-03T06:00:00.000Z",
              reason: "available",
              privateQueueCount: 12,
            },
            participants: [
              { name: "Private Customer", email: "private@example.test" },
            ],
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        id: "session-1",
        language: "cs",
        location: expect.objectContaining({ id: "location-1" }),
        capacity: 8,
        remainingCapacity: 3,
        available: true,
        waitlist: {
          enabled: true,
          accepting: false,
          joinDeadline: "2026-08-03T06:00:00.000Z",
          reason: "available",
        },
      }),
    ]);
    const serialized = JSON.stringify(
      normalizePublicCourseSessions({
        sessions: [
          {
            id: "session-1",
            start: "2026-08-03T08:00:00.000Z",
            end: "2026-08-03T10:00:00.000Z",
            participants: [
              { name: "Private Customer", email: "private@example.test" },
            ],
            waitlist: {
              enabled: true,
              accepting: true,
              privateQueueCount: 12,
            },
          },
        ],
      }),
    );
    expect(serialized).not.toContain("Private Customer");
    expect(serialized).not.toContain("private@example.test");
    expect(serialized).not.toContain("privateQueueCount");
  });

  it("tags the course list and each normalized session for waitlist refreshes", () => {
    expect(
      captured.endpoints.getPublicCourseSessions.providesTags(
        [{ id: "session-1" }, { id: "session-2" }],
        undefined,
        { tenantSlug: "studio-one", productId: "course-1" },
      ),
    ).toEqual([
      {
        type: "PublicBooking",
        id: "COURSE_SESSIONS:studio-one:course-1",
      },
      { type: "PublicBooking", id: "COURSE_SESSION:session-1" },
      { type: "PublicBooking", id: "COURSE_SESSION:session-2" },
    ]);
  });
});
