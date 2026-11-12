import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  cart: [
    {
      id: "cart-item-1",
      bookingMode: "public",
      cartDate: "5 August 2026",
      cartTime: "08:00–09:00",
      locationName: "Studio Olivie",
      numberOfGuests: 2,
      quantity: 2,
      title: "Glazing Lab",
      product: {
        currency: "CZK",
        kind: "open-studio",
        price: 250,
      },
    },
  ],
  checkoutLoading: false,
  dispatch: vi.fn(),
  checkout: vi.fn(),
  creditCheckout: vi.fn(),
  membershipCheckout: vi.fn(),
  quoteData: undefined,
  quoteFetching: false,
  quoteError: false,
  quoteRefetch: vi.fn(),
  quoteRequest: vi.fn(),
  auth: null,
  checkoutKind: undefined,
  piecePanel: vi.fn(),
  replace: vi.fn(),
}));
const initialCart = mocks.cart;
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({
      auth: mocks.auth,
      cart: {
        cart: mocks.cart,
        isOpen: true,
        checkoutKind: mocks.checkoutKind,
      },
    }),
}));
vi.mock("@/components/pottery-pieces/PieceCheckoutPanel", () => ({
  default: (props) => {
    mocks.piecePanel(props);
    return <section data-testid="piece-checkout">Piece payment</section>;
  },
}));
vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogPanel: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  Transition: ({ children, show }) => (show ? children : null),
  TransitionChild: ({ children }) => children,
}));
vi.mock("next/image", () => ({
  default: () => <span data-testid="mock-image" />,
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));
vi.mock("@/components/credits/CartCreditSummary", () => ({
  default: () => <div>Credit balance: CZK 400</div>,
}));
vi.mock("@/components/credits/PaymentMethodSelector", () => ({
  default: ({ onMethodChange }) => (
    <>
      <button type="button" onClick={() => onMethodChange("card")}>
        Choose card
      </button>
      <button type="button" onClick={() => onMethodChange("credits")}>
        Choose credits
      </button>
    </>
  ),
}));
vi.mock("@/components/credits/CreditPurchaseModal", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({
    tenant: {},
  }),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => ({
    style: {
      "--tenant-accent": "#2748D8",
    },
  }),
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  clearCart: () => ({
    type: "cart/clear",
  }),
  removeBookingItems: () => ({
    type: "cart/removeBookings",
  }),
  selectCheckoutKind: (payload) => ({
    type: "cart/selectCheckoutKind",
    payload,
  }),
  closeCart: () => ({
    type: "cart/close",
  }),
  removeItem: (payload) => ({
    type: "cart/remove",
    payload,
  }),
  selectCartIsOpen: (state) => state.cart.isOpen,
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useCheckoutWithMembershipMutation: () => [
    mocks.membershipCheckout,
    {
      isLoading: false,
    },
  ],
  useGetCartCheckoutQuoteQuery: (request, options) => {
    mocks.quoteRequest(request, options);
    const { cart } = request;
    return {
      currentData: options.skip
        ? undefined
        : mocks.quoteData === undefined
          ? {
              quote: {
                currency: "CZK",
                subtotalMinor: Math.round(
                  cart.reduce(
                    (sum, item) => sum + getCartItemTotalMajor(item),
                    0,
                  ) * 100,
                ),
                discountMinor: 0,
                totalMinor: Math.round(
                  cart.reduce(
                    (sum, item) => sum + getCartItemTotalMajor(item),
                    0,
                  ) * 100,
                ),
              },
              paymentOptions: [
                {
                  method: "card",
                  available: true,
                },
                {
                  method: "money_credits",
                  available: true,
                  coversTotal: true,
                },
              ],
            }
          : mocks.quoteData,
      isFetching: mocks.quoteFetching,
      isError: mocks.quoteError,
      refetch: mocks.quoteRefetch,
    };
  },
  useCheckoutMutation: () => [
    mocks.checkout,
    {
      isLoading: mocks.checkoutLoading,
    },
  ],
}));
vi.mock("@/lib/features/checkout/checkout.errors", () => ({
  getCheckoutErrorMessage: () => "Checkout failed",
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useCheckoutWithCreditsMutation: () => [
    mocks.creditCheckout,
    {
      isLoading: false,
      isSuccess: false,
    },
  ],
  useGetMyCreditBalanceQuery: () => ({
    data: {
      balance: 400,
    },
  }),
}));
vi.mock("@/lib/features/credits/creditsSlice", () => ({
  setBalance: (payload) => ({
    type: "credits/balance",
    payload,
  }),
}));
vi.mock("@/translations/translation", () => ({
  default: {
    GO_TO_CHECKOUT: {
      EN: "Confirm order",
    },
    PAY_WITH_CREDITS: {
      EN: "Pay with credits",
    },
  },
}));
vi.mock("@/utils/checkoutUrl", () => ({
  getSafeCheckoutUrl: () => null,
}));
import CartModal from "@/components/modals/CartModal";
import { getCartItemTotalMajor } from "@/components/modals/cartModal.utils";
import { getAuthCacheIdentity } from "@/lib/features/auth/authSlice";
import { buildCustomerCourseCartItem } from "@/components/courses/customerCourses.utils";
beforeEach(() => {
  mocks.cart = initialCart;
  mocks.auth = null;
  mocks.checkoutKind = undefined;
  mocks.quoteData = undefined;
  mocks.quoteFetching = false;
  mocks.quoteError = false;
  mocks.quoteRefetch.mockReset();
  mocks.quoteRequest.mockReset();
  mocks.membershipCheckout.mockReset().mockImplementation(() => ({
    unwrap: () => Promise.reject(new Error("Membership changed")),
  }));
  mocks.checkout.mockReset().mockImplementation(() => ({
    unwrap: () => Promise.reject(new Error("Temporary checkout failure")),
  }));
  mocks.creditCheckout.mockReset().mockImplementation(() => ({
    unwrap: () => Promise.reject(new Error("Temporary checkout failure")),
  }));
  vi.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  mocks.checkoutLoading = false;
  mocks.dispatch.mockReset();
});
describe("customer cart modal interactions", () => {
  const membershipQuote = () => ({
    quote: {
      currency: "CZK",
      subtotalMinor: 100000,
      discountMinor: 10000,
      totalMinor: 90000,
    },
    paymentOptions: [
      {
        method: "card",
        available: true,
      },
      {
        method: "money_credits",
        coversTotal: true,
      },
      {
        method: "membership_credits",
        benefitKey: "personal_hours",
        unit: "minute",
        available: 480,
        required: 60,
        coversTotal: true,
      },
    ],
  });
  it("shows the server's course discount and uses its total for card and credit checkout", async () => {
    mocks.quoteData = membershipQuote();
    render(<CartModal />);
    expect(screen.getByText("Membership discount")).toBeVisible();
    expect(
      document.querySelector("[data-cart-membership-discount]"),
    ).toHaveTextContent("CZK 100");
    expect(document.querySelector("[data-cart-total]")).toHaveTextContent(
      "CZK 900",
    );
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Studio credits",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pay with credits",
      }),
    );
    await waitFor(() => expect(mocks.creditCheckout).toHaveBeenCalledOnce());
    expect(mocks.creditCheckout.mock.calls[0][0]).toMatchObject({
      cart: initialCart,
    });
    expect(mocks.creditCheckout.mock.calls[0][0]).not.toHaveProperty(
      "totalMinor",
    );
  });
  it("redeems included hours without a card and refreshes the membership on confirmed success", async () => {
    mocks.quoteData = membershipQuote();
    mocks.membershipCheckout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "confirmed",
          success: true,
          orderId: "member-order",
        }),
    });
    render(<CartModal />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Included studio hours/,
      }),
    );
    expect(
      screen.getByText("8 h available · 1 h used for this booking"),
    ).toBeVisible();
    expect(document.querySelector("[data-cart-total]")).toHaveTextContent(
      "CZK 0",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Book with membership",
      }),
    );
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/portal/success?orderId=member-order",
      ),
    );
    expect(mocks.membershipCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        cart: initialCart,
        membershipBenefitKey: "personal_hours",
        idempotencyKey: expect.any(String),
      }),
    );
    expect(mocks.membershipCheckout.mock.calls[0][0]).not.toHaveProperty(
      "membershipQuantity",
    );
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.creditCheckout).not.toHaveBeenCalled();
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/removeBookings",
    });
  });
  it("rechecks benefits after a failed redemption and preserves the retry key and cart", async () => {
    mocks.quoteData = membershipQuote();
    render(<CartModal />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Included studio hours/,
      }),
    );
    const submit = screen.getByRole("button", {
      name: "Book with membership",
    });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.quoteRefetch).toHaveBeenCalledOnce());
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.membershipCheckout).toHaveBeenCalledTimes(2),
    );
    expect(mocks.membershipCheckout.mock.calls[1][0].idempotencyKey).toBe(
      mocks.membershipCheckout.mock.calls[0][0].idempotencyKey,
    );
    expect(mocks.dispatch).not.toHaveBeenCalledWith({
      type: "cart/removeBookings",
    });
  });
  it.each(["loading", "error", "missing", "malformed"])(
    "blocks payment while the authoritative quote is %s",
    (state) => {
      mocks.quoteData =
        state === "missing"
          ? null
          : state === "malformed"
            ? {
                quote: {},
                paymentOptions: [],
              }
            : membershipQuote();
      mocks.quoteFetching = state === "loading";
      mocks.quoteError = state === "error";
      render(<CartModal />);
      expect(
        screen.getByRole("button", {
          name: "Continue to payment",
        }),
      ).toBeDisabled();
      expect(document.querySelector("[data-cart-total]")).toHaveTextContent(
        "—",
      );
      expect(mocks.checkout).not.toHaveBeenCalled();
      if (state !== "loading") {
        fireEvent.click(
          screen.getByRole("button", {
            name: "Try again",
          }),
        );
        expect(mocks.quoteRefetch).toHaveBeenCalledOnce();
      }
    },
  );
  it("does not silently switch a selected membership to a paid method when its balance changes", () => {
    mocks.quoteData = membershipQuote();
    const { rerender } = render(<CartModal />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Included studio hours/,
      }),
    );
    mocks.quoteData = membershipQuote();
    Object.assign(mocks.quoteData.paymentOptions[2], {
      coversTotal: false,
      available: 30,
      unavailableReason: "membership_insufficient_hours",
    });
    rerender(<CartModal />);
    expect(
      screen.getByRole("radio", {
        name: /Included studio hours/,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText("Not enough included hours for this booking."),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", {
        name: "Payment card",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Payment card",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    ).toBeEnabled();
  });
  it("separates quote cache keys when the signed-in customer changes", () => {
    mocks.auth = {
      token: "test",
      userInfo: {
        id: "customer-a",
        tenantId: "tenant-a",
      },
      authContext: "customer",
    };
    const { rerender } = render(<CartModal />);
    const firstScope = mocks.quoteRequest.mock.lastCall[0].ownerScope;
    mocks.auth = {
      ...mocks.auth,
      userInfo: {
        id: "customer-b",
        tenantId: "tenant-a",
      },
    };
    rerender(<CartModal />);
    expect(firstScope).toBeTruthy();
    expect(mocks.quoteRequest.mock.lastCall[0].ownerScope).toBeTruthy();
    expect(mocks.quoteRequest.mock.lastCall[0].ownerScope).not.toBe(firstScope);
  });
  it("keeps credit top-up available when the quoted balance is insufficient", () => {
    mocks.quoteData = membershipQuote();
    mocks.quoteData.paymentOptions[1].coversTotal = false;
    render(<CartModal />);
    expect(
      screen.getByRole("radio", {
        name: /Studio credits/,
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Add credits",
      }),
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "credits/showCreditPurchaseModal",
    });
  });
  it("explains when a late extension can only be paid with studio credits", () => {
    mocks.quoteData = membershipQuote();
    mocks.quoteData.paymentOptions[0] = {
      method: "card",
      available: false,
      unavailableReason: "customer_booking_extension_card_window",
    };
    render(<CartModal />);
    expect(
      screen.getByRole("radio", {
        name: /Payment card/,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Card payment is unavailable this close to the booking end. Use studio credits to extend your visit.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", {
        name: "Studio credits",
      }),
    ).toBeChecked();
  });
  it("clears a fulfilled membership selection so the next course can use card", async () => {
    mocks.quoteData = membershipQuote();
    mocks.membershipCheckout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "confirmed",
          orderId: "member-order",
        }),
    });
    const { rerender } = render(<CartModal />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Included studio hours/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Book with membership",
      }),
    );
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
    mocks.cart = [
      {
        id: "next-course",
        quantity: 1,
        product: {
          kind: "class",
          currency: "CZK",
          price: 1200,
        },
      },
    ];
    mocks.quoteData = {
      quote: {
        currency: "CZK",
        subtotalMinor: 120000,
        discountMinor: 12000,
        totalMinor: 108000,
      },
      paymentOptions: [
        {
          method: "card",
          available: true,
        },
      ],
    };
    rerender(<CartModal />);
    expect(
      screen.getByRole("radio", {
        name: "Payment card",
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    ).toBeEnabled();
  });
  it.each([undefined, "/en/portal/success?orderId=free-order-123"])(
    "completes a server-confirmed free cart through normal checkout (url: %s)",
    async (url) => {
      mocks.cart = initialCart.map((item) => ({
        ...item,
        product: {
          ...item.product,
          price: 0,
        },
      }));
      mocks.checkout.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            status: "confirmed",
            orderId: "free-order-123",
            success: true,
            url,
          }),
      });
      render(<CartModal />);
      fireEvent.click(
        screen.getByRole("button", {
          name: "Continue to payment",
        }),
      );
      await waitFor(() =>
        expect(mocks.replace).toHaveBeenCalledWith(
          "/portal/success?orderId=free-order-123",
        ),
      );
      expect(mocks.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: mocks.cart,
        }),
      );
      expect(mocks.creditCheckout).not.toHaveBeenCalled();
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "cart/removeBookings",
      });
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "cart/close",
      });
      expect(window.alert).not.toHaveBeenCalled();
    },
  );
  it("retains a zero-price cart and its retry key until the server confirms it", async () => {
    mocks.cart = initialCart.map((item) => ({
      ...item,
      product: {
        ...item.product,
        price: 0,
      },
    }));
    mocks.checkout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          status: "requires_payment",
          orderId: "pending-order-123",
        }),
    });
    render(<CartModal />);
    const submit = screen.getByRole("button", {
      name: "Continue to payment",
    });
    fireEvent.click(submit);
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
    expect(mocks.checkout.mock.calls[1][0].idempotencyKey).toBe(
      mocks.checkout.mock.calls[0][0].idempotencyKey,
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.creditCheckout).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalledWith({
      type: "cart/removeBookings",
    });
  });
  it("ignores a repeated tap that lands on checkout as the cart opens under the thumb", async () => {
    let now = 5000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    render(<CartModal />);
    const submit = screen.getByRole("button", {
      name: "Continue to payment",
    });

    // The second tap of a double tap on the booking drawer's "Add to cart".
    expect(
      fireEvent.click(submit, {
        detail: 1,
      }),
    ).toBe(false);
    expect(mocks.checkout).not.toHaveBeenCalled();

    // A deliberate tap once the checkout button has been on screen.
    now += 1100;
    fireEvent.click(submit, {
      detail: 1,
    });
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
  });
  it("lets the keyboard start checkout as soon as the cart opens", async () => {
    vi.spyOn(performance, "now").mockImplementation(() => 5000);
    render(<CartModal />);

    // Enter or Space on the button dispatches a click with detail 0.
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
      {
        detail: 0,
      },
    );
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
  });
  it("re-arms checkout when a slow quote enables the button under the thumb", async () => {
    let now = 5000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mocks.quoteFetching = true;
    const { rerender } = render(<CartModal />);
    const submit = screen.getByRole("button", {
      name: "Continue to payment",
    });
    expect(submit).toBeDisabled();

    // The quote returns two seconds after the cart opened, just as a
    // repeated tap lands on the button.
    now += 2000;
    mocks.quoteFetching = false;
    rerender(<CartModal />);
    expect(submit).toBeEnabled();
    expect(
      fireEvent.click(submit, {
        detail: 1,
      }),
    ).toBe(false);
    expect(mocks.checkout).not.toHaveBeenCalled();
    now += 1100;
    fireEvent.click(submit, {
      detail: 1,
    });
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
  });
  it("shows the course date, local time and studio while submitting the original course charge", async () => {
    const product = {
      id: "wheel",
      _id: "wheel",
      kind: "class",
      name: "Wheel Beginners",
      price: 2400,
      currency: "CZK",
    };
    const session = {
      id: "wheel-nov3",
      start: "2026-11-03T16:00:00Z",
      end: "2026-11-03T18:30:00Z",
      location: {
        id: "vaclavska",
        name: "Václavská",
        timeZone: "Europe/Prague",
      },
      remainingCapacity: 4,
      available: true,
    };
    const item = buildCustomerCourseCartItem({
      product,
      session,
      locationId: "vaclavska",
      quantity: 1,
      locale: "en",
      now: Date.parse("2026-10-20T10:00:00Z"),
    });
    mocks.cart = [item];
    render(<CartModal />);
    expect(screen.getByText("3 Nov 2026")).toBeVisible();
    expect(screen.getByText("17:00–19:30")).toBeVisible();
    expect(screen.getByText("Václavská")).toBeVisible();
    expect(document.querySelector("[data-cart-total]")).toHaveTextContent(
      /2[,.\s]?400/,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    );
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledOnce());
    const [submitted] = mocks.checkout.mock.calls[0][0].cart;
    expect(submitted).toMatchObject({
      bookingCourse: "wheel-nov3",
      locationId: "vaclavska",
      quantity: 1,
      start: session.start,
      end: session.end,
    });
    expect(submitted.product).toBe(product);
    expect(submitted).not.toHaveProperty("price");
  });
  it("does not mount piece checkout for saved cart items after My work is disabled", () => {
    mocks.auth = {
      token: "test",
      userInfo: {
        id: "customer-a",
        tenantId: "tenant-a",
      },
      authContext: "customer",
      tenant: {
        customerCapabilities: {
          myWork: false,
        },
      },
    };
    mocks.checkoutKind = "pieces";
    mocks.cart = [
      {
        id: "piece-a",
        potteryPieceId: "piece-a",
        type: "pottery-piece",
        ownerScope: getAuthCacheIdentity({
          auth: mocks.auth,
        }),
        quantity: 1,
        amountMinor: 2500,
        currency: "CZK",
        product: {
          name: "Saved cup",
        },
      },
    ];
    render(<CartModal />);
    expect(screen.queryByTestId("piece-checkout")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved cup")).not.toBeInTheDocument();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("excludes disabled time bookings while keeping an enabled standalone service payable", async () => {
    const service = {
      id: "firing-service",
      quantity: 1,
      product: {
        type: "service",
        name: "Extra firing",
        price: 120,
        currency: "CZK",
      },
    };
    mocks.cart = [...initialCart, service];
    render(<CartModal allowBookings={false} allowServices />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    );
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledOnce());
    expect(mocks.checkout.mock.calls[0][0].cart).toEqual([service]);
  });
  it.each(["card", "credits"])(
    "reuses the %s idempotency key when retrying an unchanged cart",
    async (method) => {
      const { rerender } = render(<CartModal />);
      if (method === "credits")
        fireEvent.click(
          screen.getByRole("radio", {
            name: "Studio credits",
          }),
        );
      const submit = () =>
        fireEvent.click(
          screen.getByRole("button", {
            name:
              method === "credits" ? "Pay with credits" : "Continue to payment",
          }),
        );
      const mutation =
        method === "credits" ? mocks.creditCheckout : mocks.checkout;
      submit();
      await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(1));
      mocks.cart = initialCart.map((item) => ({
        ...item,
      }));
      rerender(<CartModal />);
      submit();
      await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
      const first = mutation.mock.calls[0][0];
      const retry = mutation.mock.calls[1][0];
      expect(first.idempotencyKey).toMatch(/^[A-Za-z0-9._:-]{8,160}$/);
      expect(retry.idempotencyKey).toBe(first.idempotencyKey);
      expect(retry).toMatchObject({
        locale: "en",
        cart: initialCart,
      });
    },
  );
  it("uses new keys when the cart or payment method changes", async () => {
    const { rerender } = render(<CartModal />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    );
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(1));
    const firstKey = mocks.checkout.mock.calls[0][0].idempotencyKey;
    mocks.cart = initialCart.map((item) => ({
      ...item,
      quantity: 4,
    }));
    rerender(<CartModal />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    );
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
    const changedCartKey = mocks.checkout.mock.calls[1][0].idempotencyKey;
    expect(changedCartKey).not.toBe(firstKey);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Studio credits",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pay with credits",
      }),
    );
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(3));
    const creditsKey = mocks.creditCheckout.mock.calls[0][0].idempotencyKey;
    expect(creditsKey).not.toBe(changedCartKey);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Payment card",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to payment",
      }),
    );
    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(4));
    expect(mocks.checkout.mock.calls[2][0].idempotencyKey).not.toBe(creditsKey);
  });
  it("starts a fresh key after a completed credit purchase", async () => {
    mocks.creditCheckout.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          success: true,
        }),
    }));
    render(<CartModal />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Studio credits",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pay with credits",
      }),
    );
    await waitFor(() => expect(mocks.creditCheckout).toHaveBeenCalledTimes(1));
    const firstKey = mocks.creditCheckout.mock.calls[0][0].idempotencyKey;
    // Model a later purchase with the same selection after successful completion.
    await Promise.resolve();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pay with credits",
      }),
    );
    await waitFor(() => expect(mocks.creditCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.creditCheckout.mock.calls[1][0].idempotencyKey).not.toBe(
      firstKey,
    );
  });
  it("renders a localized order review and removes the intended item", () => {
    render(<CartModal />);
    expect(
      screen.getByRole("heading", {
        name: "Review your booking",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("1 item")).toHaveLength(2);
    expect(screen.getByText("Glazing Lab")).toBeVisible();
    expect(screen.getByText("Studio Olivie")).toBeVisible();
    expect(document.querySelector("[data-cart-total]")).toHaveTextContent(
      /1[,.\s]?000|1\s000/,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove: Glazing Lab",
      }),
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/remove",
      payload: "cart-item-1",
    });
  });
  it("keeps one payment label synchronized with the selected method", () => {
    render(<CartModal />);
    expect(screen.getAllByText("Continue to payment")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Studio credits",
      }),
    );
    expect(screen.getAllByText("Pay with credits")).toHaveLength(1);
  });
  it("uses action copy that accurately describes the external card step", () => {
    render(<CartModal />);
    expect(
      screen.getByRole("button", {
        name: /Continue to payment/i,
      }),
    ).toBeVisible();
    expect(screen.queryByText("Confirm order")).not.toBeInTheDocument();
  });
  it("closes through the accessible header action", () => {
    render(<CartModal />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Close cart",
      }),
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/close",
    });
  });
  it("announces and locks the modal while checkout is processing", () => {
    mocks.checkoutLoading = true;
    render(<CartModal />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing secure checkout…",
    );
    expect(
      screen.getByRole("button", {
        name: "Close cart",
      }),
    ).toBeDisabled();
    expect(document.querySelector("[data-cart-processing]")).toBeVisible();
  });
});
