export const PRODUCT_TOUR_VERSION = 1;
export const PRODUCT_TOUR_REPLAY_PARAM = "productTour";
export const PRODUCT_TOUR_REPLAY_VALUE = "1";
export const PRODUCT_TOUR_TOTAL_STEPS = 6;

export const PRODUCT_TOUR_ENTRY_POINT = Object.freeze({
  AUTOMATIC: "automatic",
  HELP_REPLAY: "help_replay",
});

export const PRODUCT_TOUR_STEPS = Object.freeze([
  {
    key: "overview",
    event: "product_tour_overview_viewed",
    selectors: [
      "[data-studio-briefing-hero]",
      '[data-product-tour-target="overview"]',
    ],
  },
  {
    key: "launch_center",
    event: "product_tour_launch_center_viewed",
    mobileSelectors: ["[data-mobile-navigation-trigger]"],
    selectors: [
      '[data-product-tour-target="launch-center"]',
      "[data-launch-center-shortcut]",
    ],
  },
  {
    key: "studio_switcher",
    event: "product_tour_studio_switcher_viewed",
    mobileSelectors: ["[data-mobile-navigation-trigger]"],
    selectors: [
      '[data-product-tour-target="studio-switcher"]',
      "[data-studio-switcher-slot]",
    ],
  },
  {
    key: "navigation",
    event: "product_tour_navigation_viewed",
    mobileSelectors: ["[data-mobile-navigation-trigger]"],
    selectors: [
      '[data-product-tour-target="navigation"]',
      "[data-workspace-sidebar-primary-list]",
      "[data-mobile-navigation-trigger]",
    ],
  },
  {
    key: "ai_assistant",
    event: "product_tour_ai_assistant_viewed",
    selectors: ['[data-product-tour-target="ai-assistant"]'],
  },
  {
    key: "settings",
    event: "product_tour_settings_viewed",
    mobileSelectors: ["[data-mobile-navigation-trigger]"],
    selectors: ['[data-product-tour-target="settings"]'],
  },
]);

export const createProductTourId = (prefix = "tour") => {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
          (
            Number(digit) ^
            ((Math.random() * 16) >> (Number(digit) / 4))
          ).toString(16),
        );

  return prefix === "event" ? id : `${prefix}_${id.replaceAll("-", "")}`;
};

export const getProductTourViewport = (width) => {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export const isVisibleProductTourTarget = (element) => {
  if (!element || typeof element.getBoundingClientRect !== "function") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style =
    typeof window !== "undefined" && window.getComputedStyle
      ? window.getComputedStyle(element)
      : null;

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style?.display !== "none" &&
    style?.visibility !== "hidden"
  );
};

export const findProductTourTarget = (selectors = []) => {
  if (typeof document === "undefined") return null;

  for (const selector of selectors) {
    const visible = Array.from(document.querySelectorAll(selector)).find(
      isVisibleProductTourTarget,
    );
    if (visible) return visible;
  }

  return null;
};

export const getProductTourStepSelectors = (step, width) => {
  if (!step) return [];

  const viewportWidth =
    width ?? (typeof window === "undefined" ? 1024 : window.innerWidth);

  return viewportWidth < 1280 && step.mobileSelectors?.length
    ? step.mobileSelectors
    : step.selectors;
};

export const buildProductTourEvent = ({
  entryPoint,
  event,
  position,
  sessionId,
  step,
  studioCount,
}) => {
  const width = typeof window === "undefined" ? 1024 : window.innerWidth;

  return {
    eventId: createProductTourId("event"),
    sessionId,
    event,
    source: "product_tour",
    metadata: {
      tourVersion: PRODUCT_TOUR_VERSION,
      ...(step ? { tourStep: step } : {}),
      ...(entryPoint ? { tourEntryPoint: entryPoint } : {}),
      ...(position ? { position, total: PRODUCT_TOUR_TOTAL_STEPS } : {}),
      studioCount: Math.max(0, Math.min(100, Number(studioCount) || 0)),
      viewport: getProductTourViewport(width),
    },
  };
};
