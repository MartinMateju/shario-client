import { describe, expect, it } from "vitest";

import {
  buildCustomerCourseCartItem,
  getCourseImageUrls,
  getCourseName,
  getUpcomingLocationSessions,
} from "@/components/courses/customerCourses.utils";

const now = Date.parse("2026-10-20T10:00:00Z");
const product = { id: "wheel", name: "Wheel", price: 2000, currency: "CZK" };
const session = {
  id: "canonical-date",
  location: { id: "vaclavska" },
  start: "2026-10-21T10:00:00Z",
  end: "2026-10-21T12:00:00Z",
  capacity: 4,
  remainingCapacity: 2,
  available: true,
};
const makeItem = (overrides = {}) =>
  buildCustomerCourseCartItem({
    product,
    session,
    locationId: "vaclavska",
    quantity: 1,
    locale: "en",
    now,
    ...overrides,
  });

describe("location-safe canonical course checkout", () => {
  it("uses the existing course and session, without creating or repricing products", () => {
    const item = makeItem({ quantity: 2 });
    expect(item.product).toBe(product);
    expect(item).toMatchObject({
      bookingCourse: "canonical-date",
      bookingRef: "canonical-date",
      bookingProduct: "wheel",
      locationId: "vaclavska",
      quantity: 2,
      numberOfGuests: 2,
    });
    expect(item.guests).toHaveLength(1);
    expect(item).not.toHaveProperty("price");
  });

  it("supplies cart labels in the course studio timezone without changing canonical dates or price", () => {
    const studioSession = {
      ...session,
      start: "2026-11-03T16:00:00Z",
      end: "2026-11-03T18:30:00Z",
      location: {
        id: "vaclavska",
        name: "Václavská",
        timeZone: "Europe/Prague",
      },
    };
    const item = makeItem({ session: studioSession });
    expect(item).toMatchObject({
      cartDate: "3 Nov 2026",
      cartTime: "17:00–19:30",
      locationName: "Václavská",
      start: studioSession.start,
      end: studioSession.end,
      quantity: 1,
    });
    expect(item.product).toBe(product);
    expect(makeItem({ session: studioSession, locale: "cs" }).cartDate).toBe(
      "3. 11. 2026",
    );
  });

  it("uses matching selected-studio metadata when a session contains only a location ID", () => {
    const item = makeItem({
      session: {
        ...session,
        start: "2026-11-04T00:00:00Z",
        end: "2026-11-04T02:30:00Z",
      },
      location: {
        id: "vaclavska",
        name: "Václavská",
        booking: { timezone: "America/Los_Angeles" },
      },
    });
    expect(item).toMatchObject({
      cartDate: "3 Nov 2026",
      cartTime: "16:00–18:30",
      locationName: "Václavská",
    });
    expect(
      makeItem({ location: { id: "grohova", name: "Grohova" } }).locationName,
    ).toBe("");
  });

  it.each([
    { session: undefined },
    { locationId: "grohova" },
    { quantity: 3 },
    { quantity: 1.5 },
    { quantity: 0 },
    { product: {} },
    { session: { ...session, available: false } },
    { session: { ...session, remainingCapacity: 0 } },
    { session: { ...session, start: "2026-10-19T10:00:00Z" } },
    { session: { ...session, end: "2026-10-21T09:00:00Z" } },
  ])(
    "rejects stale, invalid, full or out-of-location selections: %j",
    (change) => {
      expect(makeItem(change)).toBeNull();
    },
  );

  it("orders only future dates of the requested studio, retaining full dates for waitlists", () => {
    const full = {
      ...session,
      id: "later",
      start: "2026-10-22T10:00:00Z",
      end: "2026-10-22T12:00:00Z",
      available: false,
      remainingCapacity: 0,
    };
    const dates = getUpcomingLocationSessions(
      [
        full,
        { ...session, id: "foreign", location: { id: "grohova" } },
        { ...session, id: "past", start: "2026-10-19T10:00:00Z" },
        { ...session, id: "invalid", start: "not a date" },
        session,
      ],
      "vaclavska",
      now,
    );
    expect(dates.map(({ id }) => id)).toEqual(["canonical-date", "later"]);
  });

  it("uses translated course content without losing legacy data and rejects unsafe images", () => {
    expect(
      getCourseName(
        {
          ...product,
          courseContent: { name: { cs: "Točení", en: "Throwing" } },
        },
        "cs",
      ),
    ).toBe("Točení");
    expect(getCourseName(product, "cs")).toBe("Wheel");
    expect(
      getCourseImageUrls({
        imageSrc: "/wheel.jpg",
        courseContent: {
          images: [
            "/wheel.jpg",
            "https://cdn.example.test/bowl.jpg",
            "javascript:alert(1)",
            "//untrusted.example/image",
          ],
        },
      }),
    ).toEqual(["/wheel.jpg", "https://cdn.example.test/bowl.jpg"]);
  });

  it("keeps the configured gallery order and uses the product cover only when no gallery is available", () => {
    expect(
      getCourseImageUrls({
        imageSrc: "/old-cover.jpg",
        courseContent: {
          images: ["/new-cover.jpg", "/second.jpg", "/new-cover.jpg"],
        },
      }),
    ).toEqual(["/new-cover.jpg", "/second.jpg"]);
    expect(
      getCourseImageUrls({
        imageSrc: "/old-cover.jpg",
        courseContent: { images: [] },
      }),
    ).toEqual(["/old-cover.jpg"]);
  });
});
