import { describe, expect, it } from "vitest";

import { parsePublicBookingIntent } from "@/utils/publicBookingIntent";

describe("authenticated public booking intent", () => {
  it("preserves an explicit private choice and activity through the calendar handoff", () => {
    expect(
      parsePublicBookingIntent(
        new URLSearchParams({
          productId: "product",
          locationId: "location",
          start: "2026-11-10T10:00:00Z",
          end: "2026-11-10T11:00:00Z",
          bookingMode: "private",
          activity: "WORKSTATION",
          quantity: "8",
        }),
      ),
    ).toMatchObject({
      bookingMode: "private",
      activity: "WORKSTATION",
      quantity: 8,
    });
  });

  it("accepts a complete bounded selection and normalizes timestamps", () => {
    const intent = parsePublicBookingIntent(
      new URLSearchParams({
        productId: "product-1",
        locationId: "location-1",
        start: "2026-08-03T08:00:00Z",
        end: "2026-08-03T10:00:00Z",
        courseSessionId: "session-1",
        quantity: "3",
      }),
    );

    expect(intent).toEqual({
      productId: "product-1",
      locationId: "location-1",
      start: "2026-08-03T08:00:00.000Z",
      end: "2026-08-03T10:00:00.000Z",
      courseSessionId: "session-1",
      quantity: 3,
    });
  });

  it.each([
    {
      productId: "../product",
      locationId: "location-1",
      start: "2026-08-03T08:00:00Z",
      end: "2026-08-03T10:00:00Z",
    },
    {
      productId: "product-1",
      locationId: "location-1",
      start: "not-a-date",
      end: "2026-08-03T10:00:00Z",
    },
    {
      productId: "product-1",
      locationId: "location-1",
      start: "2026-08-03T10:00:00Z",
      end: "2026-08-03T08:00:00Z",
    },
  ])("ignores a malformed public intent", (value) => {
    expect(parsePublicBookingIntent(new URLSearchParams(value))).toBeNull();
  });

  it("bounds quantity while preserving an otherwise valid intent", () => {
    const intent = parsePublicBookingIntent(
      new URLSearchParams({
        productId: "product-1",
        locationId: "location-1",
        start: "2026-08-03T08:00:00Z",
        end: "2026-08-03T10:00:00Z",
        quantity: "5000",
      }),
    );

    expect(intent?.quantity).toBe(1);
  });
});
