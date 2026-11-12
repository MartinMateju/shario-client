export const CUSTOMER_PORTAL_TOUR_VERSION = 1;

export const CUSTOMER_PORTAL_TOUR_STEPS = Object.freeze([
  Object.freeze({
    key: "overview",
    selectors: ["[data-customer-portal-overview]"],
  }),
  Object.freeze({
    key: "studio",
    selectors: ["[data-customer-calendar-studio-selector]"],
  }),
  Object.freeze({
    key: "calendarControls",
    selectors: ["[data-calendar-command-bar]"],
  }),
  Object.freeze({
    key: "legend",
    selectors: ["[data-customer-calendar-legend]"],
  }),
  Object.freeze({
    key: "chooseTime",
    selectors: ["[data-calendar-scroll-region]"],
  }),
  Object.freeze({
    key: "help",
    selectors: ["[data-customer-portal-help-trigger]"],
  }),
]);

export const getCustomerPortalTourStorageKey = ({ customerKey, tenantKey }) =>
  `shario:customer-portal-tour:${encodeURIComponent(
    String(tenantKey || "tenant"),
  )}:${encodeURIComponent(String(customerKey || "customer"))}`;

export const readCustomerPortalTourAcknowledgement = (storageKey) => {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
};

export const writeCustomerPortalTourAcknowledgement = (
  storageKey,
  status,
  lastStep,
) => {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: CUSTOMER_PORTAL_TOUR_VERSION,
        status,
        lastStep,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Storage can be unavailable in private browsing; the tour still works.
  }
};

export const hasAcknowledgedCustomerPortalTour = (saved) =>
  Number(saved?.version) >= CUSTOMER_PORTAL_TOUR_VERSION &&
  ["completed", "skipped"].includes(saved?.status);
