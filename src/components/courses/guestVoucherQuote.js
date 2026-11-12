export const normalizeGuestVoucherCode = (value) => value.trim().toUpperCase();

// Only reviewed server amounts may authorize spending a voucher. Never derive
// the discount from the public product price or retain a quote for another date.
export function getGuestVoucherQuoteExpectation(quote) {
  if (!quote || !/^[A-Z]{3}$/.test(quote.currency || "")) return null;
  const amounts = [
    quote.totalAmountMinor,
    quote.voucherAppliedMinor,
    quote.remainingToPayMinor,
  ];
  if (
    !amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0) ||
    quote.voucherAppliedMinor <= 0 ||
    quote.voucherAppliedMinor + quote.remainingToPayMinor !==
      quote.totalAmountMinor
  )
    return null;
  return {
    currency: quote.currency,
    totalAmountMinor: quote.totalAmountMinor,
    voucherAppliedMinor: quote.voucherAppliedMinor,
    remainingToPayMinor: quote.remainingToPayMinor,
  };
}
