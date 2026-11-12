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
        "page.title": "Notifications",
        "page.heading": "Your operational updates",
        "page.unreadSummary": `${values.count} unread notifications`,
        "page.caughtUp": "You are caught up",
        "page.summaryLoading": "Checking your unread notifications…",
        "page.summaryUnavailable": "Unread status is temporarily unavailable",
        "actions.preferences": "Notification preferences",
        "actions.markAllRead": "Mark all as read",
        "actions.retry": "Try again",
        "filters.label": "Notification filters",
        "filters.status": "Status",
        "filters.category": "Category",
        "filters.location": "Studio location",
        "statuses.all": "All",
        "statuses.unread": "Unread",
        "statuses.read": "Read",
        "categories.all": "All categories",
        "categories.bookings": "Bookings",
        "categories.payments": "Payments",
        "categories.waitlist": "Waitlist",
        "categories.studio_flow": "Studio flow",
        "categories.tasks": "Tasks",
        "categories.inventory": "Inventory",
        "categories.migration": "Migration",
        "categories.communications": "Communications",
        "categories.account": "Account",
        "locations.all": "All locations",
        "errors.load": "Notifications could not be loaded.",
        "errors.markRead": "Could not mark notification as read.",
        "errors.markAllRead": "Could not mark notifications as read.",
        "empty.title": "No notifications yet",
        "empty.description": "Updates will appear here.",
        "empty.unreadTitle": "You are caught up",
        "empty.unreadDescription": "There are no unread notifications.",
        "pagination.label": "Notification pages",
        "pagination.previous": "Previous",
        "pagination.next": "Next",
        "pagination.summary": `Page ${values.page} of ${values.pages}`,
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
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: { locations: [{ id: "loc-1", name: "Studio Grohova" }] },
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/locations/location.utils", () => ({
  getLocationId: (location) => location.id,
  normalizeLocationsResponse: (response) => response?.locations || [],
}));

vi.mock("@/lib/features/notification/notificationsApiSlice", () => ({
  useGetWorkspaceNotificationsQuery: (args, options) => {
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
  useGetWorkspaceNotificationSummaryQuery: (_args, options) => {
    mocks.summaryOptions = options;

    return {
      currentData: mocks.summaryData,
      data: mocks.summaryData,
      isError: mocks.summaryError,
    };
  },
  useMarkWorkspaceNotificationReadMutation: () => [mocks.markRead, {}],
  useMarkAllWorkspaceNotificationsReadMutation: () => [
    mocks.markAllRead,
    { isLoading: false },
  ],
}));

vi.mock("@/components/notifications/WorkspaceNotificationItem", () => ({
  default: ({ notification }) => <p>{notification.title.en}</p>,
}));

import WorkspaceNotificationsPage from "@/components/notifications/WorkspaceNotificationsPage";

describe("WorkspaceNotificationsPage", () => {
  beforeEach(() => {
    mocks.search = "status=unread&category=inventory&locationId=loc-1&page=2";
    mocks.listArgs = null;
    mocks.listOptions = null;
    mocks.listCurrentData = {
      notifications: [
        { id: "notification-1", title: { en: "Low clay stock" } },
      ],
      unreadCount: 99,
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

  it("maps URL filters to a scoped, polling list request", () => {
    render(<WorkspaceNotificationsPage />);

    expect(mocks.listArgs).toEqual({
      page: 2,
      limit: 20,
      status: "unread",
      category: "inventory",
      locationId: "loc-1",
    });
    expect(mocks.listOptions).toMatchObject({
      pollingInterval: 60_000,
      refetchOnFocus: true,
      skipPollingIfUnfocused: true,
    });
    expect(mocks.summaryOptions).toMatchObject({
      pollingInterval: 45_000,
      refetchOnFocus: true,
      skipPollingIfUnfocused: true,
    });
    expect(screen.getByText("Low clay stock")).toBeVisible();
    expect(screen.getByText("2 unread notifications")).toBeVisible();
  });

  it("does not render stale rows from a previous filter after the current request fails", () => {
    mocks.listCurrentData = undefined;
    mocks.listHistoricalData = {
      notifications: [
        { id: "old-notification", title: { en: "Old filtered result" } },
      ],
    };
    mocks.listError = true;

    render(<WorkspaceNotificationsPage />);

    expect(screen.queryByText("Old filtered result")).toBeNull();
    expect(
      screen.getByText("Notifications could not be loaded."),
    ).toBeVisible();
  });

  it("does not report caught-up state when the unread summary fails", () => {
    mocks.summaryData = undefined;
    mocks.summaryError = true;

    render(<WorkspaceNotificationsPage />);

    expect(
      screen.getByText("Unread status is temporarily unavailable"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).toBeNull();
  });

  it("keeps filter state in the URL and resets pagination", () => {
    render(<WorkspaceNotificationsPage />);

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "read" },
    });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/app/notifications?status=read&category=inventory&locationId=loc-1",
      { scroll: false },
    );
  });

  it("marks all workspace notifications from the global unread summary", async () => {
    render(<WorkspaceNotificationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(() => expect(mocks.markAllRead).toHaveBeenCalledWith({}));
  });

  it("uses the localized route and exposes notification preferences", () => {
    render(<WorkspaceNotificationsPage />);

    expect(
      screen.getByRole("link", { name: "Notification preferences" }),
    ).toHaveAttribute("href", "/app/preferences");
    expect(
      screen.getByRole("navigation", { name: "Notification pages" }),
    ).toBeVisible();
  });
});
