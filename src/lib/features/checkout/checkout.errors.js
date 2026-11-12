export const TENANT_PAYMENT_ERROR_CODES = Object.freeze([
  "TENANT_PAYMENTS_NOT_CONNECTED",
  "TENANT_PAYMENTS_NOT_READY",
  // Compatibility with the current backend service naming. The public API
  // should eventually standardize on the two codes above.
  "TENANT_PAYMENT_ACCOUNT_NOT_CONNECTED",
  "TENANT_PAYMENT_ACCOUNT_NOT_READY",
]);

export const getApiErrorCode = (error) =>
  String(error?.data?.code ?? error?.data?.error?.code ?? error?.code ?? "")
    .trim()
    .toUpperCase();

export const isTenantPaymentsUnavailableError = (error) =>
  TENANT_PAYMENT_ERROR_CODES.includes(getApiErrorCode(error));

export const getCheckoutErrorMessage = ({
  error,
  language,
  translations,
  fallback,
}) => {
  if (isTenantPaymentsUnavailableError(error)) {
    return (
      translations?.CUSTOMER_PAYMENTS_UNAVAILABLE?.[language] ||
      (language === "CZ"
        ? "Online platby tohoto studia jsou momentálně nedostupné. Kontaktujte prosím studio nebo to zkuste později."
        : "Online payments for this studio are currently unavailable. Please contact the studio or try again later.")
    );
  }

  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.error ||
    error?.message ||
    fallback
  );
};
