import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ tenant: null, sessionTenant: {} }));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      `${key} ${values.title || ""}`.trim(),
}));
vi.mock("react-redux", () => ({ useSelector: () => mocks.sessionTenant }));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.tenant ? { tenant: mocks.tenant } : null,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import CustomerNotificationItem from "@/components/notifications/CustomerNotificationItem";
import { CUSTOMER_PORTAL_PAGE_IDS } from "@/components/customer-shell/customerPortalVisibility";

const tenantWithPages = (pages) => ({
  publicSite: { customerPortal: { pages } },
});
const notification = {
  id: "notification-1",
  title: { en: "Your studio booking" },
  message: { en: "Your reservation is confirmed." },
  actionUrl: "/portal/bookings",
  category: "bookings",
  occurredAt: "2026-10-13T09:00:00Z",
};

describe("customer notification destination visibility", () => {
  beforeEach(() => {
    mocks.tenant = null;
    mocks.sessionTenant = {};
  });

  it("keeps notification content and marking read when its published destination is disabled", () => {
    mocks.tenant = tenantWithPages({ bookings: { enabled: false } });
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CustomerNotificationItem
        notification={notification}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Your studio booking")).toBeInTheDocument();
    expect(
      screen.getByText("Your reservation is confirmed."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "item.markRead Your studio booking" }),
    );
    expect(onMarkRead).toHaveBeenCalledWith("notification-1");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("keeps an enabled action's location and read/navigation behavior, overriding stale session settings", () => {
    mocks.sessionTenant = tenantWithPages({ bookings: { enabled: false } });
    mocks.tenant = tenantWithPages({ bookings: { enabled: true } });
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CustomerNotificationItem
        notification={notification}
        currentLocationReference="atelier-brno"
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/portal/bookings?location=atelier-brno",
    );
    fireEvent.click(link);
    expect(onMarkRead).toHaveBeenCalledWith("notification-1");
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("uses session settings without a public context, including legacy tab aliases", () => {
    mocks.sessionTenant = tenantWithPages({ bookings: { enabled: false } });
    render(
      <CustomerNotificationItem
        notification={{ ...notification, actionUrl: "/portal?tab=MY_BOOKINGS" }}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("preserves payment recovery actions even when all portal pages are disabled", () => {
    mocks.tenant = tenantWithPages(
      Object.fromEntries(
        CUSTOMER_PORTAL_PAGE_IDS.map((id) => [id, { enabled: false }]),
      ),
    );
    render(
      <CustomerNotificationItem
        notification={{
          ...notification,
          actionUrl: "/portal/credits/purchase-success?orderId=existing-order",
        }}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/portal/credits/purchase-success?orderId=existing-order",
    );
  });
});
