import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listArgs: null,
  listOptions: null,
  listCurrentData: null,
  listHistoricalData: null,
  listError: false,
  markAllRead: vi.fn(),
  markRead: vi.fn(),
  replace: vi.fn(),
  search: "",
  summaryOptions: null,
  summaryData: { unreadCount: 2 },
  summaryError: false,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "page.eyebrow": "Your updates",
        "page.title": "Notifications",
        "page.description": "Studio and account updates.",
        "page.unreadSummary": `${values.count} unread notifications`,
        "page.caughtUp": "You have read every notification",
        "page.summaryLoading": "Checking your unread notifications…",
        "page.summaryUnavailable": "Unread status is temporarily unavailable",
        "page.loading": "Loading your notifications…",
        "actions.markAllRead": "Mark all as read",
        "actions.retry": "Try again",
        "filters.label": "Notification filters",
        "filters.status": "Status",
        "filters.category": "Category",
        "statuses.all": "All",
        "statuses.unread": "Unread",
        "statuses.read": "Read",
        "categories.all": "All categories",
        "categories.bookings": "Bookings",
        "categories.payments": "Payments",
        "categories.waitlist": "Waitlist",
        "categories.studio_flow": "Pieces and firing",
        "categories.memberships": "Memberships",
        "categories.credits_vouchers": "Credits and vouchers",
        "categories.account": "Account",
        "errors.loadTitle": "Your notifications could not be loaded",
        "errors.load": "Check your connection and try again.",
        "errors.refresh": "Showing your last updates.",
        "errors.markRead": "Could not mark notification as read.",
        "errors.markAllRead": "Could not mark notifications as read.",
        "empty.title": "No notifications yet",
        "empty.description": "Updates will appear here.",
        "empty.unreadTitle": "You are all caught up",
        "empty.unreadDescription": "There are no unread notifications.",
        "pagination.label": "Notification pages",
        "pagination.previous": "Previous page",
        "pagination.next": "Next page",
        "pagination.summary": `Page ${values.page} of ${values.pages}`,
      };

      return messages[key] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => ({
    activeLocationReference: "atelier-brno",
  }),
}));

vi.mock("@/lib/features/notification/notificationsApiSlice", () => ({
  useGetCustomerNotificationsQuery: (args, options) => {
    mocks.listArgs = args;
    mocks.listOptions = options;

    return {
      currentData: mocks.listCurrentData,
      data: mocks.listHistoricalData,
      isLoading: false,
      isFetching: false,
      isError: mocks.listError,
      refetch: vi.fn(),
    };
  },
  useGetCustomerNotificationSummaryQuery: (_args, options) => {
    mocks.summaryOptions = options;

    return {
      currentData: mocks.summaryData,
      data: mocks.summaryData,
      isError: mocks.summaryError,
    };
  },
  useMarkCustomerNotificationReadMutation: () => [mocks.markRead, {}],
  useMarkAllCustomerNotificationsReadMutation: () => [
    mocks.markAllRead,
    { isLoading: false },
  ],
}));

vi.mock("@/components/notifications/CustomerNotificationItem", () => ({
  default: ({ notification, currentLocationReference }) => (
    <p data-location-reference={currentLocationReference}>
      {notification.title.en}
    </p>
  ),
}));

import CustomerNotificationsPage from "@/components/notifications/CustomerNotificationsPage";

describe("CustomerNotificationsPage", () => {
  beforeEach(() => {
    mocks.search =
      "location=atelier-brno&status=unread&category=memberships&page=2";
    mocks.listArgs = null;
    mocks.listOptions = null;
    mocks.listCurrentData = {
      notifications: [
        { id: "notification-1", title: { en: "Membership renewed" } },
      ],
      pagination: { page: 2, limit: 20, total: 45, pages: 3 },
    };
    mocks.listHistoricalData = null;
    mocks.listError = false;
    mocks.summaryOptions = null;
    mocks.summaryData = { unreadCount: 2 };
    mocks.summaryError = false;
    mocks.replace.mockReset();
    mocks.markAllRead.mockReset();
    mocks.markAllRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ updatedCount: 2 }),
    });
    mocks.markRead.mockReset();
    mocks.markRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it("maps URL filters to a tenant-wide focus-aware polling request", () => {
    render(<CustomerNotificationsPage />);

    expect(mocks.listArgs).toEqual({
      page: 2,
      limit: 20,
      status: "unread",
      category: "memberships",
    });
    expect(mocks.listOptions).toMatchObject({
      pollingInterval: 45_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      skipPollingIfUnfocused: true,
    });
    expect(mocks.summaryOptions).toMatchObject({
      pollingInterval: 45_000,
      refetchOnFocus: true,
      skipPollingIfUnfocused: true,
    });
    expect(screen.getByText("Membership renewed")).toHaveAttribute(
      "data-location-reference",
      "atelier-brno",
    );
    expect(screen.getByText("2 unread notifications")).toBeVisible();
  });

  it("does not render stale rows from a previous filter after an error", () => {
    mocks.listCurrentData = undefined;
    mocks.listHistoricalData = {
      notifications: [
        { id: "old-notification", title: { en: "Old filtered result" } },
      ],
    };
    mocks.listError = true;

    render(<CustomerNotificationsPage />);

    expect(screen.queryByText("Old filtered result")).toBeNull();
    expect(
      screen.getByText("Your notifications could not be loaded"),
    ).toBeVisible();
  });

  it("keeps same-filter rows visible with a refresh warning", () => {
    mocks.listError = true;

    render(<CustomerNotificationsPage />);

    expect(screen.getByText("Membership renewed")).toBeVisible();
    expect(screen.getByText("Showing your last updates.")).toBeVisible();
  });

  it("keeps location in the URL and resets pagination when filters change", () => {
    render(<CustomerNotificationsPage />);

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "read" },
    });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal/notifications?location=atelier-brno&status=read&category=memberships",
      { scroll: false },
    );
  });

  it("marks all records in the visible customer category", async () => {
    render(<CustomerNotificationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(() =>
      expect(mocks.markAllRead).toHaveBeenCalledWith({
        category: "memberships",
      }),
    );
  });

  it("does not claim the inbox is caught up when summary loading fails", () => {
    mocks.summaryData = undefined;
    mocks.summaryError = true;

    render(<CustomerNotificationsPage />);

    expect(
      screen.getByText("Unread status is temporarily unavailable"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).toBeNull();
    expect(screen.queryByText("You have read every notification")).toBeNull();
  });
});
