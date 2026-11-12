import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenant: { slug: "studio-alpha" },
  listCalls: [],
  listData: {
    notifications: Array.from({ length: 10 }, (_, index) => ({
      id: `notification-${index + 1}`,
      title: { en: `Notification ${index + 1}` },
    })),
  },
  listError: false,
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
        "panel.label": "Customer portal notifications",
        "panel.title": "Notifications",
        "panel.unread": `${values.count} unread`,
        "panel.caughtUp": "You are all caught up",
        "panel.summaryLoading": "Checking for updates…",
        "panel.summaryUnavailable": "Unread status is temporarily unavailable",
        "actions.markAllRead": "Mark all as read",
        "actions.retry": "Try again",
        "actions.viewAll": "View all notifications",
        "errors.load": "Notifications could not be loaded.",
        "errors.refresh": "Showing your last updates.",
        "errors.markRead": "Could not mark notification as read.",
        "errors.markAllRead": "Could not mark notifications as read.",
        "empty.title": "Nothing new",
        "empty.description": "Studio updates will appear here.",
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

vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => ({
    activeLocationReference: "atelier-brno",
  }),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));

vi.mock("react-redux", () => ({ useSelector: () => null }));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => ({ style: {} }),
}));

vi.mock("@/lib/features/notification/notificationsApiSlice", () => ({
  useGetCustomerNotificationSummaryQuery: (args, options) => {
    mocks.summaryCalls.push({ args, options });
    return {
      currentData: mocks.summaryData,
      data: mocks.summaryData,
      isLoading: false,
      isError: mocks.summaryError,
    };
  },
  useGetCustomerNotificationsQuery: (args, options) => {
    mocks.listCalls.push({ args, options });
    const skipped = options?.skip === true;

    return {
      currentData: skipped ? undefined : mocks.listData,
      data: skipped ? undefined : mocks.listData,
      isLoading: false,
      isUninitialized: skipped,
      isError: skipped ? false : mocks.listError,
      refetch: vi.fn(),
    };
  },
  useMarkCustomerNotificationReadMutation: () => [mocks.markRead, {}],
  useMarkAllCustomerNotificationsReadMutation: () => [
    mocks.markAllRead,
    { isLoading: false },
  ],
}));

vi.mock("@/components/notifications/CustomerNotificationItem", () => ({
  default: ({ notification }) => <p>{notification.title.en}</p>,
}));

import CustomerNotificationMenu from "@/components/notifications/CustomerNotificationMenu";

describe("CustomerNotificationMenu", () => {
  beforeEach(() => {
    mocks.tenant = { slug: "studio-alpha" };
    mocks.listCalls.length = 0;
    mocks.summaryCalls.length = 0;
    mocks.summaryData = { unreadCount: 3 };
    mocks.summaryError = false;
    mocks.listError = false;
    mocks.markAllRead.mockReset();
    mocks.markAllRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ updatedCount: 3 }),
    });
    mocks.markRead.mockReset();
    mocks.markRead.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it("hides the notifications entry and skips polling when the page is disabled", () => {
    mocks.tenant = {
      publicSite: {
        customerPortal: { pages: { notifications: { enabled: false } } },
      },
    };
    const { container } = render(<CustomerNotificationMenu />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.summaryCalls.at(-1).options.skip).toBe(true);
    expect(mocks.listCalls).toHaveLength(0);
  });

  it("polls only the tenant-wide summary until the popover opens", async () => {
    render(<CustomerNotificationMenu />);

    const trigger = screen.getByRole("button", {
      name: "Open notifications, 3 unread notifications",
    });

    expect(trigger).toHaveClass("h-11", "w-11");
    expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
    expect(mocks.summaryCalls.at(-1).options).toMatchObject({
      pollingInterval: 45_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      skipPollingIfUnfocused: true,
    });
    expect(mocks.listCalls.at(-1)).toMatchObject({
      args: { page: 1, limit: 8 },
      options: {
        skip: true,
        pollingInterval: 45_000,
        skipPollingIfUnfocused: true,
      },
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
    ).toHaveAttribute("href", "/portal/notifications?location=atelier-brno");
  });

  it("marks all customer notifications globally from the menu", async () => {
    render(<CustomerNotificationMenu />);
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

  it("does not report caught-up state when the summary is unavailable", async () => {
    mocks.summaryData = undefined;
    mocks.summaryError = true;
    render(<CustomerNotificationMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));

    expect(
      await screen.findByText("Unread status is temporarily unavailable"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).toBeNull();
    expect(screen.queryByText("You are all caught up")).toBeNull();
  });

  it("keeps cached menu rows visible with a refresh warning", async () => {
    mocks.listError = true;
    render(<CustomerNotificationMenu />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open notifications, 3 unread notifications",
      }),
    );

    expect(await screen.findByText("Notification 1")).toBeVisible();
    expect(screen.getByText("Showing your last updates.")).toBeVisible();
  });

  it("renders no badge for a zero count and caps large counts at 99+", () => {
    mocks.summaryData = { unreadCount: 0 };
    const zero = render(<CustomerNotificationMenu />);

    expect(
      zero.container.querySelector("[data-customer-notification-badge]"),
    ).toBeNull();
    zero.unmount();

    mocks.summaryData = { unreadCount: 104 };
    render(<CustomerNotificationMenu />);
    expect(screen.getByText("99+")).toHaveAttribute("aria-hidden", "true");
  });

  it("closes the panel and restores trigger focus when Escape is pressed", async () => {
    render(<CustomerNotificationMenu />);
    const trigger = screen.getByRole("button", {
      name: "Open notifications, 3 unread notifications",
    });

    fireEvent.click(trigger);
    const panel = await screen.findByRole("dialog", {
      name: "Customer portal notifications",
    });
    expect(panel).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(panel).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
