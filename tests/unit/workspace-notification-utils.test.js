import { describe, expect, it } from "vitest";

import {
  buildMarkAllNotificationsBody,
  buildWorkspaceNotificationListParams,
  formatNotificationRelativeTime,
  getLocalizedNotificationText,
  getSafeWorkspaceNotificationHref,
  getWorkspaceNotificationPagination,
  getWorkspaceNotifications,
  getWorkspaceUnreadCount,
  isWorkspaceNotificationRead,
} from "@/components/notifications/workspaceNotification.utils";

describe("workspace notification utilities", () => {
  it("resolves bilingual content for the active locale with safe fallbacks", () => {
    const text = { en: "New booking", cs: "Nová rezervace" };

    expect(getLocalizedNotificationText(text, "cs-CZ")).toBe("Nová rezervace");
    expect(getLocalizedNotificationText(text, "en-US")).toBe("New booking");
    expect(getLocalizedNotificationText({ CZ: "Český text" }, "cs")).toBe(
      "Český text",
    );
    expect(getLocalizedNotificationText(null, "en", "Fallback")).toBe(
      "Fallback",
    );
  });

  it.each([
    ["/app/bookings?bookingId=123", "/app/bookings?bookingId=123"],
    ["/app", "/app"],
    ["https://example.com/app", null],
    ["//example.com/app", null],
    ["/portal/notifications", null],
    ["/application", null],
    ["/app\\evil", null],
  ])(
    "normalizes action href %s without allowing external navigation",
    (href, expected) => {
      expect(getSafeWorkspaceNotificationHref(href)).toBe(expected);
    },
  );

  it("normalizes list, unread count and pagination response shapes", () => {
    const response = {
      data: {
        notifications: [{ id: "notification-1" }],
        unreadCount: 4,
        pagination: { page: 2, limit: 20, total: 41, pages: 3 },
      },
    };

    expect(getWorkspaceNotifications(response)).toEqual([
      { id: "notification-1" },
    ]);
    expect(getWorkspaceUnreadCount(response)).toBe(4);
    expect(getWorkspaceNotificationPagination(response)).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      pages: 3,
    });
  });

  it("builds bounded server filters and excludes all-filter sentinels", () => {
    expect(
      buildWorkspaceNotificationListParams({
        page: -5,
        limit: 20,
        status: "unread",
        category: "inventory",
        locationId: "location-1",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: "unread",
      category: "inventory",
      locationId: "location-1",
    });
    expect(
      buildWorkspaceNotificationListParams({
        status: "all",
        category: "all",
        locationId: "all",
      }),
    ).toEqual({ page: 1, limit: 20 });
    expect(
      buildMarkAllNotificationsBody({
        category: "migration",
        locationId: "location-2",
      }),
    ).toEqual({ category: "migration", locationId: "location-2" });
  });

  it("detects read records and formats deterministic relative timestamps", () => {
    const now = new Date("2026-08-12T12:00:00.000Z").getTime();

    expect(isWorkspaceNotificationRead({ isRead: true })).toBe(true);
    expect(isWorkspaceNotificationRead({ readAt: "2026-08-12" })).toBe(true);
    expect(isWorkspaceNotificationRead({ isRead: false })).toBe(false);
    expect(
      formatNotificationRelativeTime("2026-08-12T11:55:00.000Z", "en", {
        now,
      }),
    ).toMatch(/5 min/);
  });
});
