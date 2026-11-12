import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listCalls: [],
  listData: {
    notifications: Array.from({ length: 10 }, (_, index) => ({
      id: `notification-${index + 1}`,
      title: { en: `Notification ${index + 1}` },
    })),
  },
  markAllRead: vi.fn(),
  markRead: vi.fn(),
  summaryCalls: [],
  summaryData: { unreadCount: 3 },
  summaryError: false,
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        trigger: "Open notifications",
        triggerUnread: `Open notifications, ${values.count} unread notifications`,
        "panel.label": "Workspace notifications",
        "panel.title": "Notifications",
        "panel.unread": `${values.count} unread`,
        "panel.caughtUp": "You are caught up",
        "panel.summaryLoading": "Checking for updates…",
        "panel.summaryUnavailable": "Unread status is temporarily unavailable",
        "actions.markAllRead": "Mark all as read",
        "actions.retry": "Try again",
        "actions.viewAll": "View all notifications",
        "errors.load": "Notifications could not be loaded.",
        "errors.markRead": "Could not mark notification as read.",
        "errors.markAllRead": "Could not mark notifications as read.",
        "empty.title": "Nothing new",
        "empty.description": "Operational updates will appear here.",
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

vi.mock("@/lib/features/notification/notificationsApiSlice", () => ({
  useGetWorkspaceNotificationSummaryQuery: (args, options) => {
    mocks.summaryCalls.push({ args, options });
    return {
      currentData: mocks.summaryData,
      data: mocks.summaryData,
      isLoading: false,
      isError: mocks.summaryError,
    };
  },
  useGetWorkspaceNotificationsQuery: (args, options) => {
    mocks.listCalls.push({ args, options });
    const skipped = options?.skip === true;

    return {
      currentData: skipped ? undefined : mocks.listData,
      data: skipped ? undefined : mocks.listData,
      isLoading: false,
      isUninitialized: skipped,
      isError: false,
      refetch: vi.fn(),
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

import WorkspaceNotificationMenu from "@/components/notifications/WorkspaceNotificationMenu";

describe("WorkspaceNotificationMenu", () => {
  beforeEach(() => {
    mocks.listCalls.length = 0;
    mocks.summaryCalls.length = 0;
    mocks.summaryData = { unreadCount: 3 };
    mocks.summaryError = false;
    mocks.markAllRead.mockReset();
    mocks.markAllRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ updatedCount: 3 }),
    });
    mocks.markRead.mockReset();
    mocks.markRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it("polls only the lightweight summary until the popover is opened", async () => {
    render(<WorkspaceNotificationMenu />);

    const trigger = screen.getByRole("button", {
      name: "Open notifications, 3 unread notifications",
    });

    expect(trigger).toHaveClass("h-11", "w-11");
    const tooltip = trigger.querySelector("[data-topbar-tooltip]");
    expect(tooltip).toHaveTextContent("Notifications");
    expect(tooltip).toHaveAttribute("aria-hidden", "true");
    expect(tooltip).toHaveClass("hidden", "md:block");
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
    expect(mocks.summaryCalls.at(-1).options).toMatchObject({
      pollingInterval: 45_000,
      refetchOnFocus: true,
      skipPollingIfUnfocused: true,
    });
    expect(mocks.listCalls.at(-1)).toMatchObject({
      args: { page: 1, limit: 8 },
      options: { skip: true },
    });

    fireEvent.click(trigger);

    await waitFor(() =>
      expect(
        mocks.listCalls.some(({ options }) => options.skip === false),
      ).toBe(true),
    );
    expect(await screen.findByText("Notification 1")).toBeVisible();
    expect(screen.getByText("Notification 8")).toBeVisible();
    expect(screen.queryByText("Notification 9")).toBeNull();
    expect(
      screen.getByRole("link", { name: "View all notifications" }),
    ).toHaveAttribute("href", "/app/notifications");
  });

  it("offers a real mark-all action when unread records exist", async () => {
    render(<WorkspaceNotificationMenu />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open notifications, 3 unread notifications",
      }),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Mark all as read" }),
    );

    await waitFor(() => expect(mocks.markAllRead).toHaveBeenCalledWith({}));
  });

  it("does not claim the inbox is caught up when the summary is unavailable", async () => {
    mocks.summaryData = undefined;
    mocks.summaryError = true;
    render(<WorkspaceNotificationMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));

    expect(
      await screen.findByText("Unread status is temporarily unavailable"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).toBeNull();
    expect(screen.queryByText("You are caught up")).toBeNull();
  });

  it("does not render a fake badge when the unread count is zero", () => {
    mocks.summaryData = { unreadCount: 0 };
    const { container } = render(<WorkspaceNotificationMenu />);

    expect(
      screen.getByRole("button", { name: "Open notifications" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-workspace-notification-badge]"),
    ).toBeNull();
  });

  it("closes the panel and restores trigger focus when Escape is pressed", async () => {
    render(<WorkspaceNotificationMenu />);
    const trigger = screen.getByRole("button", {
      name: "Open notifications, 3 unread notifications",
    });

    fireEvent.click(trigger);
    const panel = await screen.findByLabelText("Workspace notifications");
    expect(panel).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(panel).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
