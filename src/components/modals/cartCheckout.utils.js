import { normalizeCurrency } from "@/config/currencies";

// An absent or malformed quote must never become a payable, zero-price cart.
export const getVerifiedCartQuote = (response) => {
  const quote = response?.quote;
  if (
    !quote ||
    !normalizeCurrency(quote.currency) ||
    ![quote.subtotalMinor, quote.discountMinor, quote.totalMinor].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    quote.subtotalMinor - quote.discountMinor !== quote.totalMinor ||
    !Array.isArray(response.paymentOptions)
  )
    return null;
  return quote;
};

export const getCartPaymentOptions = (response) =>
  (Array.isArray(response?.paymentOptions) ? response.paymentOptions : [])
    .filter((option) =>
      ["card", "money_credits", "membership_credits"].includes(option?.method),
    )
    .map((option) => ({
      ...option,
      optionId: `${option.method}:${option.benefitKey || "default"}`,
      selectable:
        option.available !== false &&
        option.enabled !== false &&
        option.eligible !== false &&
        (option.method === "card" || option.coversTotal === true),
    }));
