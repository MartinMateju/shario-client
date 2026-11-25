import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  data: null,
  query: {},
  load: vi.fn(),
  dispatch: vi.fn(),
  guest: vi.fn(),
  membership: vi.fn(),
  refetch: vi.fn(),
  search: "",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({}),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectIsAuthenticated: () => true,
  getAuthCacheIdentity: () => "customer-a",
  selectCurrentTenant: () => ({}),
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/customer-shell/useCustomerPortalReturnHref", () => ({
  default: (path) => path,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: { slug: "studio-a" } }),
}));
vi.mock("@/components/pottery-pieces/PieceCheckoutResult", () => ({
  default: () => null,
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    util: { invalidateTags: (tags) => ({ type: "invalidate", payload: tags }) },
  },
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useLazyGetMyOrderConfirmationQuery: () => [mocks.load, { data: mocks.data }],
  useLazyGetCheckoutOrderStatusQuery: () => [
    mocks.load,
    {
      currentData: mocks.data,
      originalArgs: { orderId: mocks.data?.orderId, ownerScope: "customer-a" },
      ...mocks.query,
    },
  ],
  useGetGuestCheckoutOrderStatusQuery: (...args) => {
    mocks.guest(...args);
    return { currentData: mocks.data, refetch: mocks.refetch, ...mocks.query };
  },
}));
vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetMembershipCheckoutStatusQuery: (...args) => {
    mocks.membership(...args);
    return { data: mocks.data, refetch: mocks.refetch };
  },
}));
import BookingSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/success/page";
import CreditSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/purchase-success/page";
import GuestResult from "@/components/courses/GuestCourseCheckoutResult";
import MembershipSuccess from "@/components/memberships/MembershipCheckoutSuccess";

const orderId = "507f1f77bcf86cd799439011";
const show = (Component) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Component />
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.query = {};
  mocks.search = `orderId=${orderId}&session_id=cs_checkout`;
  history.replaceState(
    null,
    "",
    `/checkout/success?${mocks.search}#access_token=${"a".repeat(43)}`,
  );
  mocks.data = {
    orderId,
    orderType: "credit-purchase",
    status: "pending_order",
    isPaid: true,
    terminal: false,
    currency: "USD",
    membership: { id: "membership-a", status: "pending", currency: "USD" },
    refund: {
      status: "partial",
      succeededAmountMinor: 1500,
      pendingAmountMinor: 500,
      failedAmountMinor: 0,
      reviewRequired: true,
    },
  };
  mocks.refetch.mockImplementation(async () => ({ data: mocks.data }));
});
afterEach(() => vi.useRealTimers());

describe("customer payment refunds on checkout returns", () => {
  it.each([
    ["booking", BookingSuccess],
    ["credit purchase", CreditSuccess],
  ])(
    "stops automatic polling for a refunded %s without claiming fulfillment or changing the cart/balance",
    (_label, Component) => {
      vi.useFakeTimers();
      show(Component);
      expect(
        screen.getByRole("heading", {
          name: messages.PaymentRefundResult.title,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("$15")).toBeInTheDocument();
      expect(screen.getByText("$5")).toBeInTheDocument();
      expect(
        screen.getByText(messages.PaymentRefundResult.next),
      ).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(8000));
      expect(mocks.load).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Check status" }));
      expect(mocks.load).toHaveBeenCalledTimes(1);
    },
  );

  it.each([BookingSuccess, CreditSuccess])(
    "shows a recorded refund before an old processed/paid success result",
    (Component) => {
      mocks.data.status = "processed_order";
      mocks.data.terminal = true;
      show(Component);
      expect(screen.getByRole("heading")).toHaveTextContent(
        messages.PaymentRefundResult.title,
      );
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );

  it("starts loading the next booking order without showing the prior order's refund", () => {
    const view = show(BookingSuccess);
    mocks.search = "orderId=507f1f77bcf86cd799439012";
    view.rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BookingSuccess />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText("$15")).not.toBeInTheDocument();
    expect(
      screen.queryByText(messages.PaymentRefundResult.title),
    ).not.toBeInTheDocument();
    expect(mocks.load).toHaveBeenCalledWith({
      orderId: "507f1f77bcf86cd799439012",
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each([BookingSuccess, CreditSuccess, GuestResult, MembershipSuccess])(
    "keeps a failed, acknowledged refund in studio review while fulfillment is still withheld",
    async (Component) => {
      mocks.data.refund = {
        status: "failed",
        succeededAmountMinor: 0,
        pendingAmountMinor: 0,
        failedAmountMinor: 2000,
        reviewRequired: false,
      };
      mocks.data.refundReviewRequired = true;
      show(Component);
      expect(
        await screen.findByRole("heading", {
          name: messages.PaymentRefundResult.title,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("$20")).toBeInTheDocument();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );

  it.each([BookingSuccess, CreditSuccess])(
    "preserves normal fulfilled success after a failed refund is reviewed",
    (Component) => {
      mocks.data.status = "processed_order";
      mocks.data.terminal = true;
      mocks.data.refund = {
        status: "failed",
        succeededAmountMinor: 0,
        pendingAmountMinor: 0,
        failedAmountMinor: 2000,
        reviewRequired: false,
      };
      mocks.data.refundReviewRequired = false;
      show(Component);
      expect(
        screen.queryByText(messages.PaymentRefundResult.title),
      ).not.toBeInTheDocument();
      expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    },
  );

  it("uses the protected guest response to stop polling, including when the return URL says cancelled", async () => {
    show(() => <GuestResult cancelled />);
    expect(
      await screen.findByRole("heading", {
        name: messages.PaymentRefundResult.title,
      }),
    ).toBeInTheDocument();
    expect(mocks.guest.mock.lastCall[1]).toMatchObject({
      pollingInterval: 0,
      refetchOnFocus: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
    expect(mocks.guest.mock.lastCall[1].pollingInterval).toBe(0);
    expect(screen.queryByText("emailConfirmed")).not.toBeInTheDocument();
  });

  it("stops guest credit-purchase polling on a verified refund summary", async () => {
    show(GuestResult);
    expect(
      await screen.findByRole("heading", {
        name: messages.PaymentRefundResult.title,
      }),
    ).toBeInTheDocument();
    expect(mocks.guest.mock.lastCall[0]).toMatchObject({
      tenantSlug: "studio-a",
      orderId,
      accessToken: "a".repeat(43),
    });
    expect(mocks.guest.mock.lastCall[1].pollingInterval).toBe(0);
  });

  it("does not expose refund amounts from a mismatched guest order", async () => {
    mocks.data.orderId = "507f1f77bcf86cd799439012";
    show(GuestResult);
    await waitFor(() => expect(mocks.guest.mock.lastCall[1].skip).toBe(false));
    expect(screen.queryByText("$15")).not.toBeInTheDocument();
    expect(
      screen.queryByText(messages.PaymentRefundResult.title),
    ).not.toBeInTheDocument();
  });

  it.each([
    [false, "active"],
    [true, "active"],
    [false, "past_due"],
  ])(
    "stops membership polling and preserves checkout proof (incomplete mapping=%s, existing membership=%s)",
    async (incomplete, membershipStatus) => {
      mocks.data.status = "paid";
      mocks.data.membership.status = membershipStatus;
      if (incomplete) {
        mocks.data.refund = null;
        mocks.data.refundReviewRequired = true;
      }
      sessionStorage.setItem("shario:membership-checkout:existing", "keep-proof");
      show(MembershipSuccess);
      expect(screen.getByRole("heading")).toHaveTextContent(
        messages.PaymentRefundResult.title,
      );
      await waitFor(() =>
        expect(mocks.membership.mock.lastCall[1].pollingInterval).toBe(0),
      );
      expect(sessionStorage.getItem("shario:membership-checkout:existing")).toBe(
        "keep-proof",
      );
      expect(
        screen.queryByRole("link", { name: /plans|try again/i }),
      ).not.toBeInTheDocument();
    },
  );
});
