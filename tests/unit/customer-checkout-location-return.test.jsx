import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  data: null,
  dispatch: vi.fn(),
  loadOrder: vi.fn(),
  replace: vi.fn(),
  checkout: vi.fn(),
  rememberLocation: vi.fn(),
  intentData: null,
  authenticated: true,
  tenant: {},
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({}),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  getAuthCacheIdentity: () => "customer-a",
  selectIsAuthenticated: () => mocks.authenticated,
  selectCurrentUser: () => ({}),
  selectCurrentTenant: () => mocks.tenant,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useLazyGetMyOrderConfirmationQuery: () => [
    mocks.loadOrder,
    { data: mocks.data },
  ],
  useLazyGetCheckoutOrderStatusQuery: () => [
    mocks.loadOrder,
    {
      currentData: mocks.data,
      originalArgs: {
        orderId: mocks.searchParams.get("orderId"),
        ownerScope: "customer-a",
      },
    },
  ],
}));
vi.mock("@/lib/features/potteryPieces/potteryPiecesApiSlice", () => ({
  useLazyGetPieceCheckoutOrderQuery: () => [mocks.loadOrder, {}],
  useResumePieceCheckoutMutation: () => [vi.fn(), {}],
  useCancelPieceCheckoutMutation: () => [vi.fn(), {}],
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: { util: { invalidateTags: () => ({ type: "invalidate" }) } },
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => ({
    rememberLocation: mocks.rememberLocation,
  }),
}));
vi.mock("@/lib/features/bookingIntents/bookingIntentsApiSlice", () => ({
  bookingPaymentOptionCoversTotal: () => true,
  getSafeBookingIntentToken: (value) => value,
  useGetBookingIntentQuery: () => ({ data: mocks.intentData }),
  useCheckoutBookingIntentMutation: () => [mocks.checkout, {}],
}));

import Success from "@/app/[locale]/tenants/[tenantSlug]/portal/success/page";
import Cancel from "@/app/[locale]/tenants/[tenantSlug]/portal/cancel/page";
import CreditCancel from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/cancel/page";
import CreditSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/purchase-success/page";
import CustomerBookingConfirmationPage from "@/components/bookings/CustomerBookingConfirmationPage";
import { getConfirmedOrderLocationReference } from "@/utils/customerCheckoutLocation";
import cartReducer from "@/lib/features/cart/cartSlice";

const studio = { id: "64b000000000000000000021", slug: "atelier-brno" };

describe("customer checkout studio return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated = true;
    mocks.tenant = {};
    mocks.searchParams = new URLSearchParams("orderId=order-12345678");
    mocks.data = {
      orderId: "order-12345678",
      status: "processed_order",
      isPaid: true,
      terminal: true,
      confirmation: { bookings: [{ location: studio }] },
    };
    mocks.intentData = {
      intent: { location: studio, productId: "product-1" },
      quote: { totalMinor: 100, subtotalMinor: 100, currency: "CZK" },
      paymentOptions: [{ optionId: "credits", method: "money_credits" }],
    };
    mocks.checkout.mockReturnValue({
      unwrap: () => Promise.resolve({ orderId: "order-12345678" }),
    });
  });

  it("returns to the confirmed booking studio after a card payment", () => {
    render(<Success />);
    expect(mocks.rememberLocation).toHaveBeenCalledWith("atelier-brno");
    expect(
      screen.getByRole("link", { name: "Proceed to bookings" }),
    ).toHaveAttribute("href", "/portal?location=atelier-brno");
  });

  it("clears the completed cart including unsupported imported rows", () => {
    render(<Success />);
    const action = mocks.dispatch.mock.calls.find(
      ([value]) => value.type === "cart/removeBookingItems",
    )?.[0];
    expect(action).toBeDefined();
    const state = cartReducer(
      {
        isOpen: false,
        cart: [
          { id: "booking", product: { type: "workshop" } },
          {
            id: "piece",
            type: "pottery-piece",
            potteryPieceId: "64b000000000000000000001",
          },
        ],
      },
      action,
    );
    expect(state.cart.map((item) => item.id)).toEqual([]);
  });

  it("lets the explicit URL studio take priority over the confirmation", () => {
    mocks.searchParams.set("location", "atelier-prague");
    render(<Success />);
    expect(mocks.rememberLocation).toHaveBeenCalledWith("atelier-prague");
    expect(
      screen.getByRole("link", { name: "Proceed to bookings" }),
    ).toHaveAttribute("href", "/portal?location=atelier-prague");
  });

  it("retains a legacy locationId return parameter", () => {
    mocks.searchParams.set("locationId", studio.id);
    render(<Success />);
    expect(
      screen.getByRole("link", { name: "Proceed to bookings" }),
    ).toHaveAttribute("href", `/portal?location=${studio.id}`);
  });

  it("does not guess a studio for an order with multiple locations", () => {
    mocks.data.confirmation.bookings.push({ locationId: "studio-prague" });
    render(<Success />);
    expect(mocks.rememberLocation).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Proceed to bookings" }),
    ).toHaveAttribute("href", "/portal");
  });

  it("keeps confirmation available when the order has no location", () => {
    mocks.data.confirmation = {};
    render(<Success />);
    expect(
      screen.getByRole("link", { name: "Proceed to bookings" }),
    ).toHaveAttribute("href", "/portal");
  });

  it("does not infer a destination from an unconfirmed booking", () => {
    mocks.data.status = "failed_order";
    mocks.data.isPaid = false;
    render(<Success />);
    expect(mocks.rememberLocation).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Back to portal" }),
    ).toHaveAttribute("href", "/portal");
  });

  it("keeps the guest home destination unchanged", () => {
    mocks.authenticated = false;
    render(<Success />);
    expect(mocks.rememberLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it.each(["pending_order", "failed_order", "cancelled_order"])(
    "does not remember checkout context before payment succeeds (%s)",
    (status) => {
      mocks.searchParams.set("location", "atelier-prague");
      mocks.data.status = status;
      mocks.data.isPaid = false;
      mocks.data.terminal = status !== "pending_order";
      render(<Success />);
      expect(mocks.rememberLocation).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["booking", Cancel],
    ["credit purchase", CreditCancel],
  ])("retains the URL studio when a %s payment is cancelled", (_kind, Page) => {
    mocks.searchParams.set("location", "atelier-prague");
    render(<Page />);
    expect(
      screen.getByRole("link", { name: "Back to bookings" }),
    ).toHaveAttribute("href", "/portal?location=atelier-prague");
  });

  it("retains the URL studio in both credit purchase return actions", () => {
    mocks.searchParams.set("location", "atelier-prague");
    render(<CreditSuccess />);
    expect(
      screen.getByRole("link", { name: "actions.portal" }),
    ).toHaveAttribute("href", "/portal?location=atelier-prague");
    expect(
      screen.getByRole("link", { name: "actions.viewCredits" }),
    ).toHaveAttribute("href", "/portal/credits?location=atelier-prague");
  });

  it("keeps credit payment recovery usable when the credits and calendar pages are disabled", () => {
    mocks.searchParams.set("location", "atelier-prague");
    mocks.tenant = {
      publicSite: {
        customerPortal: {
          pages: {
            credits: { enabled: false },
            calendar: { enabled: false },
          },
        },
      },
    };
    render(<CreditSuccess />);
    expect(
      screen.getByRole("link", { name: "actions.portal" }),
    ).toHaveAttribute("href", "/portal/courses?location=atelier-prague");
    expect(
      screen.queryByRole("link", { name: "actions.viewCredits" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["", "atelier-brno"],
    ["&location=atelier-prague", "atelier-prague"],
  ])(
    "preserves studio context after paying with credits (%s)",
    async (query, expected) => {
      mocks.searchParams = new URLSearchParams(`intent=booking-intent${query}`);
      const user = userEvent.setup();
      render(<CustomerBookingConfirmationPage />);
      await user.click(screen.getByRole("button", { name: "payment.confirm" }));
      await waitFor(() =>
        expect(mocks.replace).toHaveBeenCalledWith(
          `/portal/success?orderId=order-12345678&location=${expected}`,
        ),
      );
    },
  );

  it("opens a confirmed free booking even when the customer selected card", async () => {
    mocks.searchParams = new URLSearchParams("intent=booking-intent");
    mocks.intentData.quote = {
      totalMinor: 0,
      subtotalMinor: 0,
      currency: "CZK",
    };
    mocks.intentData.paymentOptions = [{ optionId: "card", method: "card" }];
    mocks.checkout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "confirmed",
          orderId: "free-order-123",
          confirmationUrl: "/en/portal/success?orderId=free-order-123",
        }),
    });
    render(<CustomerBookingConfirmationPage />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "payment.continueToCard" }));
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/portal/success?orderId=free-order-123&location=atelier-brno",
      ),
    );
    expect(mocks.checkout).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "card" }),
    );
  });

  it("does not infer a confirmed card booking from a zero quote or an order id", async () => {
    mocks.searchParams = new URLSearchParams("intent=booking-intent");
    mocks.intentData.quote = {
      totalMinor: 0,
      subtotalMinor: 0,
      currency: "CZK",
    };
    mocks.intentData.paymentOptions = [{ optionId: "card", method: "card" }];
    mocks.checkout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "requires_payment",
          orderId: "pending-order-123",
          url: "javascript:alert(1)",
        }),
    });
    render(<CustomerBookingConfirmationPage />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "payment.continueToCard" }));
    await screen.findByRole("alert");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("accepts a single-booking confirmation and an unpopulated location id", () => {
    expect(
      getConfirmedOrderLocationReference({ booking: { location: studio.id } }),
    ).toBe(studio.id);
  });

  it("does not infer a studio when part of the confirmation lacks one", () => {
    expect(
      getConfirmedOrderLocationReference({
        bookings: [{ location: studio }, {}],
      }),
    ).toBe("");
  });
});
