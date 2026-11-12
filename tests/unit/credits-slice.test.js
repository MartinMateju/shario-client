import { describe, expect, it } from "vitest";

import creditsReducer, {
  addTransaction,
  hideCreditPurchaseModal,
  selectCreditBalance,
  selectCreditTransactions,
  selectPaymentMethod,
  selectShowCreditPurchase,
  setBalance,
  setPaymentMethod,
  setTransactions,
  showCreditPurchaseModal,
  togglePaymentMethod,
  updateBalance,
} from "@/lib/features/credits/creditsSlice";

const initialState = {
  balance: 0,
  paymentMethod: "card",
  showCreditPurchase: false,
  transactions: [],
};

describe("credit state", () => {
  it("updates and replaces the balance", () => {
    expect(creditsReducer(initialState, setBalance(500)).balance).toBe(500);
    expect(creditsReducer(initialState, updateBalance(750)).balance).toBe(750);
  });

  it("sets and toggles payment methods", () => {
    const credits = creditsReducer(initialState, setPaymentMethod("credits"));

    expect(credits.paymentMethod).toBe("credits");
    expect(creditsReducer(credits, togglePaymentMethod()).paymentMethod).toBe(
      "card",
    );
    expect(
      creditsReducer(initialState, togglePaymentMethod()).paymentMethod,
    ).toBe("credits");
  });

  it("opens and closes the credit-purchase modal", () => {
    const opened = creditsReducer(initialState, showCreditPurchaseModal());

    expect(opened.showCreditPurchase).toBe(true);
    expect(
      creditsReducer(opened, hideCreditPurchaseModal()).showCreditPurchase,
    ).toBe(false);
  });

  it("replaces transactions and prepends a new transaction", () => {
    const seeded = creditsReducer(
      initialState,
      setTransactions([{ id: "older" }]),
    );
    const updated = creditsReducer(seeded, addTransaction({ id: "newer" }));

    expect(updated.transactions).toEqual([{ id: "newer" }, { id: "older" }]);
  });

  it("provides selectors for the public credit state contract", () => {
    const state = {
      credits: {
        balance: 1000,
        paymentMethod: "credits",
        showCreditPurchase: true,
        transactions: [{ id: "transaction-1" }],
      },
    };

    expect(selectCreditBalance(state)).toBe(1000);
    expect(selectPaymentMethod(state)).toBe("credits");
    expect(selectShowCreditPurchase(state)).toBe(true);
    expect(selectCreditTransactions(state)).toEqual([{ id: "transaction-1" }]);
  });
});
