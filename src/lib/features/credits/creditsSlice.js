import { createSlice } from "@reduxjs/toolkit";

const creditsSlice = createSlice({
  name: "credits",
  initialState: {
    balance: 0,
    paymentMethod: "card", // "card" or "credits"
    showCreditPurchase: false,
    transactions: [],
  },
  reducers: {
    setBalance: (state, action) => {
      state.balance = action.payload;
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    togglePaymentMethod: (state) => {
      state.paymentMethod = state.paymentMethod === "card" ? "credits" : "card";
    },
    showCreditPurchaseModal: (state) => {
      state.showCreditPurchase = true;
    },
    hideCreditPurchaseModal: (state) => {
      state.showCreditPurchase = false;
    },
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
  },
});

export const {
  setBalance,
  setPaymentMethod,
  togglePaymentMethod,
  showCreditPurchaseModal,
  hideCreditPurchaseModal,
  setTransactions,
  addTransaction,
  updateBalance,
} = creditsSlice.actions;

export default creditsSlice.reducer;

export const selectCreditBalance = (state) => state.credits.balance;
export const selectPaymentMethod = (state) => state.credits.paymentMethod;
export const selectShowCreditPurchase = (state) =>
  state.credits.showCreditPurchase;
export const selectCreditTransactions = (state) => state.credits.transactions;
