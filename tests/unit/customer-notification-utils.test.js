import { describe, expect, it } from "vitest";

import {
  buildCustomerNotificationListParams,
  formatCustomerNotificationRelativeTime,
  getCustomerNotificationActionHref,
  getCustomerNotificationPagination,
  getCustomerNotifications,
  getCustomerUnreadCount,
  getLocalizedCustomerNotificationText,
  getSafeCustomerNotificationHref,
  isCustomerNotificationRead,
} from "@/components/notifications/customerNotification.utils";

describe("customer notification utilities", () => {
  it("resolves customer copy for the active locale with safe fallbacks", () => {
    const text = { en: "Booking confirmed", cs: "Rezervace potvrzena" };

    expect(getLocalizedCustomerNotificationText(text, "cs-CZ")).toBe(
      "Rezervace potvrzena",
    );
    expect(getLocalizedCustomerNotificationText(text, "en-US")).toBe(
      "Booking confirmed",
    );
    expect(
      getLocalizedCustomerNotificationText({ CZ: "Český text" }, "cs"),
    ).toBe("Český text");
    expect(
      getLocalizedCustomerNotificationText(null, "en", "Studio update"),
    ).toBe("Studio update");
  });

  it.each([
    ["/portal/bookings?bookingId=123", "/portal/bookings?bookingId=123"],
    ["/portal", "/portal"],
    ["/portal#updates", "/portal#updates"],
    ["https://example.com/portal", null],
    ["//example.com/portal", null],
    ["/app/notifications", null],
    ["/portals", null],
    ["/portal\\evil", null],
    ["/portal/../app", null],
    ["/portal/%2e%2e/app", null],
  ])(
    "normalizes portal action href %s without allowing boundary escapes",
    (href, expected) => {
      expect(getSafeCustomerNotificationHref(href)).toBe(expected);
    },
  );

  it("preserves the action URL's own location ahead of every fallback", () => {
    expect(
      getCustomerNotificationActionHref(
        {
          actionUrl:
            "/portal/bookings?bookingId=booking-1&location=atelier-prague",
          location: { slug: "atelier-brno" },
        },
        "atelier-ostrava",
      ),
    ).toBe("/portal/bookings?bookingId=booking-1&location=atelier-prague");

    expect(
      getCustomerNotificationActionHref(
        {
          actionUrl:
            "/portal/work?pieceId=piece-1&locationId=64b000000000000000000022#piece",
          locationId: "64b000000000000000000021",
        },
        "atelier-brno",
      ),
    ).toBe(
      "/portal/work?pieceId=piece-1&location=64b000000000000000000022#piece",
    );
  });

  it("falls back from notification location to the active portal location", () => {
    expect(
      getCustomerNotificationActionHref(
        {
          actionUrl: "/portal/work?pieceId=piece-1",
          location: {
            id: "64b000000000000000000022",
            slug: "atelier-prague",
          },
        },
        "atelier-brno",
      ),
    ).toBe("/portal/work?pieceId=piece-1&location=atelier-prague");

    expect(
      getCustomerNotificationActionHref(
        {
          actionUrl: "/portal/membership",
          locationId: "64b000000000000000000022",
        },
        "atelier-brno",
      ),
    ).toBe("/portal/membership?location=64b000000000000000000022");

    expect(
      getCustomerNotificationActionHref(
        { actionUrl: "/portal/account" },
        "atelier-brno",
      ),
    ).toBe("/portal/account?location=atelier-brno");
  });

  it("never turns a hostile action into a local customer link", () => {
    expect(
      getCustomerNotificationActionHref(
        { actionUrl: "https://evil.example/portal" },
        "atelier-brno",
      ),
    ).toBeNull();
    expect(
      getCustomerNotificationActionHref(
        { actionUrl: "/portal/%2e%2e/app" },
        "atelier-brno",
      ),
    ).toBeNull();
  });

  it("normalizes list, unread count and pagination response shapes", () => {
    const response = {
      data: {
        notifications: [{ id: "notification-1" }],
        unreadCount: 4,
        pagination: { page: 2, limit: 20, total: 41, pages: 3 },
      },
    };

    expect(getCustomerNotifications(response)).toEqual([
      { id: "notification-1" },
    ]);
    expect(getCustomerUnreadCount(response)).toBe(4);
    expect(getCustomerNotificationPagination(response)).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      pages: 3,
    });
  });

  it("builds bounded customer filters without a location-scoped inbox", () => {
    expect(
      buildCustomerNotificationListParams({
        page: -5,
        limit: 20,
        status: "unread",
        category: "memberships",
        locationId: "must-not-be-sent",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: "unread",
      category: "memberships",
    });
    expect(
      buildCustomerNotificationListParams({
        status: "all",
        category: "all",
      }),
    ).toEqual({ page: 1, limit: 20 });
  });

  it("detects read records and formats deterministic relative timestamps", () => {
    const now = new Date("2026-08-12T12:00:00.000Z").getTime();

    expect(isCustomerNotificationRead({ isRead: true })).toBe(true);
    expect(isCustomerNotificationRead({ readAt: "2026-08-12" })).toBe(true);
    expect(isCustomerNotificationRead({ isRead: false })).toBe(false);
    expect(
      formatCustomerNotificationRelativeTime("2026-08-12T11:55:00.000Z", "en", {
        now,
      }),
    ).toMatch(/5 min/);
  });
});
