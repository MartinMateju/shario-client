import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  query: {},
  ownerScope: "customer-a",
  language: "EN",
  tenant: {},
  location: null,
  loadOrder: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({}),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  getAuthCacheIdentity: () => mocks.ownerScope,
  selectCurrentTenant: () => mocks.tenant,
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => mocks.language,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useLazyGetCheckoutOrderStatusQuery: () => [mocks.loadOrder, mocks.query],
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    util: { invalidateTags: (tags) => ({ type: "invalidate", payload: tags }) },
  },
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.location,
}));

import CreditSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/purchase-success/page";
import CreditCancel from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/cancel/page";

const orderId = "64b000000000000000000001";
const nextOrderId = "64b000000000000000000002";
const paid = {
  orderId,
  orderType: "credit-purchase",
  status: "processed_order",
  isPaid: true,
  terminal: true,
};
const setQuery = (data, overrides = {}) => {
  mocks.query = {
    originalArgs: { orderId, ownerScope: mocks.ownerScope },
    data,
    currentData: data,
    ...overrides,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams({
    orderId,
    location: "vaclavska",
  });
  mocks.ownerScope = "customer-a";
  mocks.language = "EN";
  mocks.tenant = {};
  mocks.location = null;
  setQuery(paid);
});
afterEach(() => vi.useRealTimers());

describe("credit purchase verification", () => {
  it("refreshes balance and transactions once after a verified credit purchase", () => {
    const view = render(<CreditSuccess />);
    expect(
      screen.getByRole("heading", { name: "success.title" }),
    ).toBeVisible();
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "invalidate",
      payload: ["Credits", "CreditTransactions"],
    });
    view.rerender(<CreditSuccess />);
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    expect(mocks.loadOrder).not.toHaveBeenCalled();
  });

  it("loads the new order when navigating away from a terminal purchase", () => {
    const view = render(<CreditSuccess />);
    mocks.dispatch.mockClear();
    mocks.searchParams.set("orderId", nextOrderId);
    view.rerender(<CreditSuccess />);
    expect(screen.queryByText("success.title")).not.toBeInTheDocument();
    expect(mocks.loadOrder).toHaveBeenCalledWith({
      orderId: nextOrderId,
      ownerScope: "customer-a",
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("ignores retained data while the current order has no result", () => {
    setQuery(undefined, { data: paid, isFetching: true });
    render(<CreditSuccess />);
    expect(screen.queryByText("success.title")).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("does not reuse a prior customer's order result", () => {
    const view = render(<CreditSuccess />);
    mocks.dispatch.mockClear();
    mocks.ownerScope = "customer-b";
    view.rerender(<CreditSuccess />);
    expect(screen.queryByText("success.title")).not.toBeInTheDocument();
    expect(mocks.loadOrder).toHaveBeenCalledWith({
      orderId,
      ownerScope: "customer-b",
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("ignores a response for a different order", () => {
    setQuery({ ...paid, orderId: nextOrderId });
    render(<CreditSuccess />);
    expect(screen.queryByText("success.title")).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    { status: "pending_order", isPaid: true, terminal: false },
    { status: "failed_order", isPaid: false, terminal: true },
    { status: "cancelled_order", isPaid: false, terminal: true },
    { orderType: "commerce" },
  ])("does not refresh credits for an unverified result %j", (overrides) => {
    setQuery({ ...paid, ...overrides });
    render(<CreditSuccess />);
    expect(screen.queryByText("success.title")).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("polls pending payment and stops once the current order is verified", () => {
    vi.useFakeTimers();
    setQuery({
      ...paid,
      status: "pending_order",
      isPaid: false,
      terminal: false,
    });
    const view = render(<CreditSuccess />);
    expect(mocks.loadOrder).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(mocks.loadOrder).toHaveBeenCalledTimes(2);
    setQuery(paid);
    view.rerender(<CreditSuccess />);
    act(() => vi.advanceTimersByTime(4000));
    expect(mocks.loadOrder).toHaveBeenCalledTimes(2);
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
  });

  it("retries the current order after a status request fails", () => {
    setQuery(undefined, { isError: true });
    render(<CreditSuccess />);
    fireEvent.click(screen.getByRole("button", { name: "actions.retry" }));
    expect(mocks.loadOrder).toHaveBeenLastCalledWith({
      orderId,
      ownerScope: "customer-a",
    });
  });

  it("does not request or invalidate credit data for an invalid order reference", () => {
    mocks.searchParams.set("orderId", "../wrong");
    render(<CreditSuccess />);
    expect(
      screen.getByRole("heading", { name: "invalid.title" }),
    ).toBeVisible();
    expect(mocks.loadOrder).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});

describe("credit purchase return context", () => {
  it("renders all Czech cancellation copy for the normalized language", () => {
    mocks.language = "CZ";
    render(<CreditCancel />);
    expect(screen.getByText("Platba zrušena")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Co můžeš zkusit" }),
    ).toBeVisible();
    expect(screen.queryByText("Payment cancelled")).not.toBeInTheDocument();
  });

  it.each([
    ["success", CreditSuccess],
    ["cancel", CreditCancel],
  ])(
    "returns from %s to an enabled portal page with the same studio",
    (_name, Page) => {
      mocks.tenant = {
        publicSite: {
          customerPortal: { pages: { calendar: { enabled: false } } },
        },
      };
      render(<Page />);
      for (const link of screen.getAllByRole("link")) {
        expect(link.getAttribute("href")).not.toBe(
          "/portal?location=vaclavska",
        );
        expect(link.getAttribute("href")).toContain("location=vaclavska");
      }
    },
  );
});
