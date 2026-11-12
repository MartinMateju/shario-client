import { describe, expect, it } from "vitest";

import { normalizeBookingToCalendarEvent } from "../../src/components/calendar/calendar.adapters.js";
import {
  calendarEventSemantics,
  calendarLegendItems,
  getCalendarEventTone,
  isGlobalBlockingKind,
} from "../../src/components/calendar/calendar.config.js";
import {
  buildCustomerEvents,
  getCalendarEventCapacity,
} from "../../src/components/calendar/calendar.utils.js";

const booking = (overrides = {}) => ({
  _id: "booking-1",
  location: "location-1",
  start: "2026-08-10T08:00:00.000Z",
  end: "2026-08-10T09:00:00.000Z",
  status: "processed",
  ...overrides,
});

describe("calendar product-kind distinctions", () => {
  it.each([
    [
      "open-studio",
      "public",
      "sharedOpenStudio",
      "Shared Open Studio",
      "olive",
    ],
    [
      "open-studio",
      "private",
      "exclusiveOpenStudio",
      "Exclusive Open Studio",
      "coral",
    ],
    ["class", "public", "class", "Class", "cobalt"],
    ["private-studio", "private", "privateStudio", "Private Studio", "neutral"],
  ])("maps %s/%s to %s", (tag, bookingMode, kind, title, tone) => {
    expect(
      normalizeBookingToCalendarEvent(
        booking({ tag, bookingMode, bookingType: "public" }),
      ),
    ).toMatchObject({ kind, title, tone });
  });

  it("keeps the legend and normalized event colours on one semantic map", () => {
    expect(calendarLegendItems).toEqual(
      Object.values(calendarEventSemantics).map(({ legendKey, tone }) => ({
        key: legendKey,
        tone,
      })),
    );

    expect(getCalendarEventTone("class")).toBe("cobalt");
    expect(getCalendarEventTone("sharedOpenStudio")).toBe("olive");
    expect(getCalendarEventTone("exclusiveOpenStudio")).toBe("coral");
    expect(getCalendarEventTone("privateStudio")).toBe("neutral");
    expect(getCalendarEventTone("unknown-kind")).toBe("cobalt");
  });

  it.each([
    ["private", true],
    ["block", true],
    ["privateStudio", true],
    ["exclusiveOpenStudio", true],
    ["sharedOpenStudio", false],
    ["class", false],
    [undefined, false],
  ])("identifies %s as global blocking: %s", (kind, expected) => {
    expect(isGlobalBlockingKind(kind)).toBe(expected);
  });

  it("preserves an explicit supported custom tone", () => {
    expect(
      normalizeBookingToCalendarEvent(booking({ tag: "class", tone: "rose" }))
        .tone,
    ).toBe("rose");
  });

  it("keeps legacy aliases readable without conflating exclusive and internal", () => {
    expect(
      normalizeBookingToCalendarEvent(
        booking({ tag: "workshop", bookingType: "private" }),
      ).kind,
    ).toBe("exclusiveOpenStudio");
    expect(
      normalizeBookingToCalendarEvent(
        booking({ tag: "private-session", bookingType: "public" }),
      ).kind,
    ).toBe("privateStudio");
  });

  it("shows private product names while reserving unavailable for closures", () => {
    const events = [
      normalizeBookingToCalendarEvent(
        booking({
          _id: "exclusive",
          tag: "open-studio",
          bookingMode: "private",
          bookingProduct: { _id: "wheel", name: { en: "Photography session" } },
        }),
      ),
      normalizeBookingToCalendarEvent(
        booking({ _id: "internal", tag: "private-studio" }),
      ),
    ];
    const t = (key) => key;

    expect(buildCustomerEvents(events, {}, t)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "exclusiveOpenStudio",
          title: "Photography session",
          bookingMode: "private",
          isClosure: false,
          privacySafe: true,
        }),
        expect.objectContaining({
          kind: "privateStudio",
          title: "events.unavailable",
          isClosure: true,
          privacySafe: true,
        }),
      ]),
    );
  });

  it("uses the localized product name ahead of generic titles and internal descriptions", () => {
    expect(
      normalizeBookingToCalendarEvent(
        booking({
          bookingProduct: "wheel",
          title: "Studio unavailable",
          description: "Internal details",
          author: {
            name: "Customer name",
            memberNumber: 42,
            customId: "legacy",
          },
          numberOfGuests: 6,
        }),
        {
          locale: "cs-CZ",
          productsById: new Map([
            [
              "wheel",
              {
                _id: "wheel",
                name: { en: "Photography session", cs: "Točení na kruhu" },
              },
            ],
          ]),
        },
      ),
    ).toMatchObject({
      productId: "wheel",
      productName: "Točení na kruhu",
      title: "Točení na kruhu",
      customerIds: ["42"],
      guests: 6,
      bookingMode: "public",
    });
  });

  it("preserves explicit customer references and does not substitute database booking IDs", () => {
    expect(
      normalizeBookingToCalendarEvent(
        booking({
          customerIds: [
            "#42",
            "42",
            " 105 ",
            "GUEST",
            null,
            { name: "private" },
          ],
          author: { memberNumber: 999 },
        }),
      ).customerIds,
    ).toEqual(["42", "105"]);
    expect(
      normalizeBookingToCalendarEvent(
        booking({
          createdBy: "507f1f77bcf86cd799439011",
        }),
      ).customerIds,
    ).toEqual([]);
  });

  it("uses class attendees and product capacity without treating staff as a customer", () => {
    const event = normalizeBookingToCalendarEvent(
      booking({
        tag: "class",
        author: { memberNumber: 1 },
        numberOfGuests: 0,
        participants: [],
        bookingProduct: {
          _id: "class-product",
          name: "Wheel basics",
          maxNumberOfParticipants: 8,
        },
      }),
    );
    expect(event).toMatchObject({ guests: 0, capacity: 8, customerIds: [] });
    expect(buildCustomerEvents([event], {}, (key) => key)[0]).toMatchObject({
      used: 0,
      capacity: 8,
    });
    expect(
      normalizeBookingToCalendarEvent(
        booking({
          tag: "class",
          author: { memberNumber: 1 },
          numberOfGuests: 3,
          participants: [
            { memberNumber: 42 },
            { memberNumber: 42 },
            { customId: "OLD-9" },
          ],
        }),
      ),
    ).toMatchObject({ guests: 3, customerIds: ["42"] });
  });

  it.each([
    "U-MTZS38CU-AQ76",
    "507f1f77bcf86cd799439011",
    "000000000000000000000001",
    "c27f98d8-5ba1-4ab6-9139-47f0614e0241",
    "GUEST",
    "0",
    { _id: "private-user" },
  ])("does not expose internal customer reference %j", (reference) => {
    for (const fields of [
      { customerIds: [reference] },
      { customerId: reference },
      { author: { customId: reference } },
      { createdBy: { customId: reference } },
      { participants: [{ customId: reference }] },
    ]) {
      expect(
        normalizeBookingToCalendarEvent(booking(fields)).customerIds,
      ).toEqual([]);
    }
  });

  it("keeps numeric legacy references and their leading zeros", () => {
    expect(
      normalizeBookingToCalendarEvent(
        booking({ author: { customId: "#0873" } }),
      ).customerIds,
    ).toEqual(["0873"]);
  });

  it("fills a missing own session reference only after ownership is established", () => {
    const options = {
      currentUserId: "customer-1",
      currentUserMemberNumber: 9999,
    };
    for (const ownership of [{ isMine: true }, { createdBy: "customer-1" }]) {
      expect(
        normalizeBookingToCalendarEvent(
          booking({ customerIds: ["U-INTERNAL"], ...ownership }),
          options,
        ).customerIds,
      ).toEqual(["9999"]);
    }
    for (const fields of [
      { createdBy: "someone-else" },
      { isMine: true, tag: "class", participants: [] },
      { isMine: true, tag: "blocker" },
    ]) {
      expect(
        normalizeBookingToCalendarEvent(booking(fields), options).customerIds,
      ).toEqual([]);
    }
  });

  it("keeps private products and closures distinct even with legacy private-studio tags", () => {
    const privateProduct = normalizeBookingToCalendarEvent(
      booking({
        tag: "private-studio",
        bookingProduct: { _id: "rental", name: "Studio rental" },
      }),
    );
    const closure = normalizeBookingToCalendarEvent(
      booking({
        tag: "blocker",
        title: "Kiln maintenance",
        bookingProduct: { _id: "internal", name: "Internal block" },
      }),
    );
    expect(privateProduct.isClosure).toBe(false);
    expect(closure.isClosure).toBe(true);
    expect(closure.title).toBe("Kiln maintenance");
    expect(
      buildCustomerEvents([privateProduct, closure], {}, (key) => key).map(
        ({ title }) => title,
      ),
    ).toEqual(["Studio rental", "events.unavailable"]);
  });

  it("groups shared products without losing customers, people, or concurrent lane usage", () => {
    const events = [
      {
        _id: "a",
        product: "wheel",
        name: "Photography session",
        guests: 3,
        customer: "42",
      },
      {
        _id: "b",
        product: "wheel",
        name: "Photography session",
        guests: 2,
        customer: "51",
      },
      {
        _id: "c",
        product: "paint",
        name: "Ceramic painting",
        guests: 4,
        customer: "67",
      },
    ].map((item) =>
      normalizeBookingToCalendarEvent(
        booking({
          _id: item._id,
          bookingProduct: { _id: item.product, name: item.name },
          bookingMode: "public",
          numberOfGuests: item.guests,
          customerIds: [item.customer],
        }),
      ),
    );
    const cards = buildCustomerEvents(
      events,
      {
        availabilityMode: "lanes",
        allowPublicSoloOverlap: true,
        publicLaneCount: 3,
      },
      (key) => key,
    );
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      title: "Photography session",
      guests: 5,
      customerIds: ["42", "51"],
      capacityUsed: 5,
      used: 3,
      capacity: 3,
    });
    expect(cards[1]).toMatchObject({
      title: "Ceramic painting",
      guests: 4,
      used: 3,
      capacity: 3,
    });
  });

  it("keeps private bookings separate and preserves the owner's product headline", () => {
    const events = ["first", "second", "mine"].map((id) =>
      normalizeBookingToCalendarEvent(
        booking({
          _id: id,
          bookingProduct: { _id: "wheel", name: "Photography session" },
          bookingMode: "private",
          isMine: id === "mine",
        }),
      ),
    );
    const cards = buildCustomerEvents(events, {}, (key) => key);
    expect(cards).toHaveLength(3);
    expect(cards.every(({ title }) => title === "Photography session")).toBe(
      true,
    );
    expect(cards.find(({ isMine }) => isMine)).toMatchObject({
      id: "mine",
      title: "Photography session",
      bookingMode: "private",
    });
  });

  it("keeps simultaneous class sessions and their attendee capacities separate", () => {
    const sessions = [
      { _id: "session-a", numberOfGuests: 3, customerIds: ["42"] },
      { _id: "session-b", numberOfGuests: 5, customerIds: ["51"] },
    ].map((session) =>
      normalizeBookingToCalendarEvent(
        booking({
          ...session,
          tag: "class",
          bookingProduct: {
            _id: "wheel-class",
            name: "Wheel class",
            maxNumberOfParticipants: 6,
          },
        }),
      ),
    );
    expect(buildCustomerEvents(sessions, {}, (key) => key)).toEqual([
      expect.objectContaining({
        id: "session-a",
        guests: 3,
        used: 3,
        capacity: 6,
        customerIds: ["42"],
      }),
      expect.objectContaining({
        id: "session-b",
        guests: 5,
        used: 5,
        capacity: 6,
        customerIds: ["51"],
      }),
    ]);
  });

  it("counts global capacity from other activities when display cards are filtered", () => {
    const bookings = ["WHEEL", "TABLE"].map((activity) =>
      normalizeBookingToCalendarEvent(
        booking({
          _id: activity,
          plannedActivity: activity,
          bookingProduct: { _id: activity, name: activity },
          numberOfGuests: 1,
        }),
      ),
    );
    const studio = {
      id: "location-1",
      availabilityMode: "capacity",
      globalCapacity: 2,
      resources: [
        { id: "WHEEL", capacity: 4 },
        { id: "TABLE", capacity: 4 },
      ],
    };
    const cards = buildCustomerEvents(
      [bookings[0]],
      studio,
      (key) => key,
      bookings,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      productId: "WHEEL",
      guests: 1,
      used: 2,
      capacity: 2,
    });
  });

  it("uses peak concurrent capacity without adding adjacent bookings together", () => {
    const events = [
      {
        _id: "long",
        start: "2026-08-10T08:00:00.000Z",
        end: "2026-08-10T10:00:00.000Z",
      },
      {
        _id: "early",
        start: "2026-08-10T08:00:00.000Z",
        end: "2026-08-10T09:00:00.000Z",
      },
      {
        _id: "late",
        start: "2026-08-10T09:00:00.000Z",
        end: "2026-08-10T10:00:00.000Z",
      },
    ].map((item) =>
      normalizeBookingToCalendarEvent(
        booking({
          ...item,
          bookingProduct: { _id: item._id, name: item._id },
          numberOfGuests: 1,
        }),
      ),
    );
    const cards = buildCustomerEvents(
      events,
      {
        availabilityMode: "lanes",
        allowPublicSoloOverlap: true,
        publicLaneCount: 3,
      },
      (key) => key,
    );
    expect(cards.find(({ productId }) => productId === "long")).toMatchObject({
      used: 2,
      capacity: 3,
      guests: 1,
    });
    expect(
      getCalendarEventCapacity(events[0], events, {
        availabilityMode: "lanes",
        allowPublicSoloOverlap: true,
        publicLaneCount: 3,
      }),
    ).toEqual({ capacity: 3, used: 2 });
  });
});
