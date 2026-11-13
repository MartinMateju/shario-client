vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canAfford: false,
  deficit: 600,
  dispatch: vi.fn(),
  paymentMethod: "credits",
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: { settings: { currency: "CZK" } },
        userInfo: { id: "customer-1" },
      },
      credits: { balance: 400, paymentMethod: mocks.paymentMethod },
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentUser: (state) => state.auth.userInfo,
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));

vi.mock("@/lib/features/credits/creditsSlice", () => ({
  selectCreditBalance: (state) => state.credits.balance,
  selectPaymentMethod: (state) => state.credits.paymentMethod,
  setPaymentMethod: (payload) => ({ type: "credits/payment", payload }),
}));

vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useCheckCreditsForCartMutation: () => [
    vi.fn(),
    {
      data: {
        canAfford: mocks.canAfford,
        deficit: mocks.deficit,
      },
      isLoading: false,
    },
  ],
}));

import PaymentMethodSelector from "@/components/credits/PaymentMethodSelector";

afterEach(() => {
  cleanup();
  mocks.canAfford = false;
  mocks.deficit = 600;
  mocks.dispatch.mockReset();
  mocks.paymentMethod = "credits";
});

describe("customer cart payment method selector", () => {
  it("returns to card when a remembered credit choice no longer covers the cart", async () => {
    const onMethodChange = vi.fn();
    render(
      <PaymentMethodSelector
        cartTotal={1000}
        currency="CZK"
        onMethodChange={onMethodChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Studio credits/i }),
    ).toBeDisabled();
    expect(screen.queryByText("Available balance")).not.toBeInTheDocument();
    expect(document.querySelector("[data-credit-shortfall]")).toHaveTextContent(
      /CZK\s600 short/,
    );
    expect(
      document.querySelector("[data-credit-shortfall]"),
    ).not.toHaveTextContent(/[.,]\d{2}/);
    await waitFor(() =>
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "credits/payment",
        payload: "card",
      }),
    );
    expect(onMethodChange).toHaveBeenCalledWith("credits");
  });

  it("allows a covered order to select credits", () => {
    mocks.canAfford = true;
    mocks.deficit = 0;
    mocks.paymentMethod = "card";
    render(<PaymentMethodSelector cartTotal={300} currency="CZK" />);

    fireEvent.click(screen.getByRole("button", { name: /Studio credits/i }));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "credits/payment",
      payload: "credits",
    });
    expect(document.querySelector("[data-credit-coverage]")).toHaveAttribute(
      "data-credit-coverage",
      "covered",
    );
    expect(screen.getByText("Your credits cover this order.")).toBeVisible();
  });

  it("opens credit purchase from the shortfall treatment", () => {
    mocks.paymentMethod = "card";
    render(<PaymentMethodSelector cartTotal={1000} currency="CZK" />);

    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "credits/showCreditPurchaseModal",
    });
  });
});
