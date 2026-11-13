vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  isLoading: false,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({ auth: { tenant: { settings: { currency: "CZK" } } } }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));

vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetMyCreditBalanceQuery: () => ({
    data: mocks.isLoading ? undefined : { balance: 400 },
    isError: false,
    isLoading: mocks.isLoading,
  }),
}));

vi.mock("@/lib/features/credits/creditsSlice", () => ({
  setBalance: (payload) => ({ type: "credits/balance", payload }),
}));

vi.mock("@/translations/translation", () => ({
  default: {
    CREDIT_BALANCE: { EN: "Credit balance" },
  },
}));

import CartCreditSummary from "@/components/credits/CartCreditSummary";

afterEach(() => {
  cleanup();
  mocks.dispatch.mockReset();
  mocks.isLoading = false;
});

describe("compact customer cart credit balance", () => {
  it("shows a concise whole-crown balance", () => {
    render(
      <CartCreditSummary compact currency="CZK" showPurchaseButton={false} />,
    );

    expect(document.querySelector("[data-cart-credit-compact]")).toBeVisible();
    expect(screen.getByText("Credit Balance")).toBeVisible();
    expect(screen.getByText(/^CZK\s400$/)).toBeVisible();
    expect(document.body).not.toHaveTextContent("400.00");
  });

  it("uses a reduced-motion-safe compact skeleton", () => {
    mocks.isLoading = true;
    render(<CartCreditSummary compact currency="CZK" />);

    expect(
      document.querySelector("[data-cart-credit-compact]"),
    ).toHaveAttribute("aria-busy", "true");
    expect(document.body.innerHTML).toContain("motion-reduce:animate-none");
  });
});
