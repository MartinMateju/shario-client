export const CUSTOMER_PORTAL_HELP_OPEN_EVENT =
  "shario:customer-portal-help-open";

export const CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT =
  "shario:customer-portal-concierge-open";

export const CUSTOMER_PORTAL_TOUR_START_EVENT =
  "shario:customer-portal-tour-start";

export const emitCustomerPortalOverlayEvent = (eventName) => {
  if (typeof window === "undefined" || !eventName) return;

  window.dispatchEvent(new Event(eventName));
};
