export const getSafeCheckoutUrl = (
  value,
  currentOrigin = typeof window === "undefined" ? "" : window.location.origin,
) => {
  try {
    const url = new URL(String(value || ""), currentOrigin);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return "";
    }
    if (url.protocol === "http:" && process.env.NODE_ENV === "production") {
      return "";
    }

    const isSameOrigin = Boolean(currentOrigin) && url.origin === currentOrigin;
    const isStripeCheckout =
      url.protocol === "https:" && url.hostname === "checkout.stripe.com";

    return isSameOrigin || isStripeCheckout ? url.href : "";
  } catch {
    return "";
  }
};
