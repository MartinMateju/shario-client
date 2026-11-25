// A captured payment with a refund/reconciliation hold is not evidence that
// checkout delivered new benefits. Do not suggest paying again in this state.
export const hasPaymentRefundOutcome = (refund, reviewRequired = false) =>
  reviewRequired === true ||
  Boolean(
    refund &&
    (refund.reviewRequired === true ||
      refund.status === "review" ||
      Number(refund.succeededAmountMinor) > 0 ||
      Number(refund.pendingAmountMinor) > 0),
  );
