import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "item.groupedCount": `${values.count} events`,
        "item.markRead": `Mark notification as read: ${values.title}`,
        "item.open": `Open notification: ${values.title}`,
        "item.untitled": "Studio update",
      };

      return messages[key] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import WorkspaceNotificationItem from "@/components/notifications/WorkspaceNotificationItem";

describe("WorkspaceNotificationItem", () => {
  it("uses the canonical occurrence time and exposes a machine-readable timestamp", () => {
    const onMarkRead = vi.fn();
    const { container } = render(
      <WorkspaceNotificationItem
        notification={{
          id: "notification-1",
          category: "bookings",
          severity: "warning",
          title: { en: "Booking cancelled" },
          message: { en: "A customer cancelled an afternoon session." },
          actionUrl: "/app/bookings?bookingId=booking-1",
          location: { name: "Studio Grohova" },
          occurredAt: "2026-08-10T09:30:00.000Z",
          createdAt: "2026-08-12T12:00:00.000Z",
          occurrenceCount: 6,
          readAt: null,
        }}
        onMarkRead={onMarkRead}
      />,
    );

    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-08-10T09:30:00.000Z",
    );
    expect(screen.getByText("6 events")).toBeVisible();
    expect(screen.getByText("Studio Grohova")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Open notification: Booking cancelled",
      }),
    ).toHaveAttribute("href", "/app/bookings?bookingId=booking-1");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark notification as read: Booking cancelled",
      }),
    );
    expect(onMarkRead).toHaveBeenCalledWith("notification-1");
  });
});
