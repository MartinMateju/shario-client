const VIEWPORT_EDGE = 12;
const PANEL_GAP = 12;
const MOBILE_BREAKPOINT = 640;
const SHORT_VIEWPORT_HEIGHT = 560;

export const getWorkspaceTourViewport = () => {
  if (typeof window === "undefined") {
    return { height: 0, offsetLeft: 0, offsetTop: 0, width: 0 };
  }

  const visualViewport = window.visualViewport;
  return {
    height: visualViewport?.height || window.innerHeight,
    offsetLeft: visualViewport?.offsetLeft || 0,
    offsetTop: visualViewport?.offsetTop || 0,
    width: visualViewport?.width || window.innerWidth,
  };
};

export const isCompactWorkspaceTourViewport = () => {
  const viewport = getWorkspaceTourViewport();
  return (
    viewport.width < MOBILE_BREAKPOINT ||
    viewport.height < SHORT_VIEWPORT_HEIGHT
  );
};

export const getWorkspaceTourResponsiveSelectors = (step = {}) => {
  const { mobileSelectors = [], selectors = [] } = step || {};
  if (typeof window === "undefined") return selectors;
  return window.innerWidth < 1280 && mobileSelectors.length
    ? mobileSelectors
    : selectors;
};

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export const getWorkspaceTourPanelStyle = ({
  panelHeight = 0,
  panelWidth = 388,
  target,
} = {}) => {
  if (typeof window === "undefined") return {};

  const viewport = getWorkspaceTourViewport();
  const leftEdge = viewport.offsetLeft + VIEWPORT_EDGE;
  const topEdge = viewport.offsetTop + VIEWPORT_EDGE;
  const rightEdge = viewport.offsetLeft + viewport.width - VIEWPORT_EDGE;
  const bottomEdge = viewport.offsetTop + viewport.height - VIEWPORT_EDGE;
  const width = Math.min(panelWidth, viewport.width - VIEWPORT_EDGE * 2);
  const height = Math.min(
    panelHeight || 320,
    viewport.height - VIEWPORT_EDGE * 2,
  );
  const compact = isCompactWorkspaceTourViewport();

  if (compact) {
    const availableAbove = target ? target.top - topEdge : 0;
    const availableBelow = target ? bottomEdge - target.bottom : 0;
    const placeAbove =
      Boolean(target) &&
      availableAbove >= height + PANEL_GAP &&
      (availableBelow < height + PANEL_GAP ||
        target.top > viewport.offsetTop + viewport.height / 2);

    return {
      ...(placeAbove
        ? { top: Math.max(topEdge, target.top - height - PANEL_GAP) }
        : { bottom: `max(${VIEWPORT_EDGE}px, env(safe-area-inset-bottom))` }),
      left: `max(${VIEWPORT_EDGE}px, env(safe-area-inset-left))`,
      right: `max(${VIEWPORT_EDGE}px, env(safe-area-inset-right))`,
    };
  }

  if (!target) {
    return {
      left: Math.round(viewport.offsetLeft + (viewport.width - width) / 2),
      top: Math.round(
        clamp(
          viewport.offsetTop + (viewport.height - height) / 2,
          topEdge,
          bottomEdge - height,
        ),
      ),
      width,
    };
  }

  if (
    target.right < viewport.offsetLeft + viewport.width * 0.5 &&
    rightEdge - target.right >= width + 18
  ) {
    return {
      left: target.right + 18,
      top: clamp(target.top, topEdge, bottomEdge - height),
      width,
    };
  }

  const availableBelow = bottomEdge - target.bottom;
  const proposedTop =
    availableBelow >= height + 18
      ? target.bottom + 18
      : target.top - height - 18;

  return {
    left: clamp(
      target.left + target.width / 2 - width / 2,
      leftEdge,
      rightEdge - width,
    ),
    top: clamp(proposedTop, topEdge, bottomEdge - height),
    width,
  };
};

export const getWorkspaceTourScrollBlock = (panelHeight = 0) => {
  if (!isCompactWorkspaceTourViewport()) return "center";

  const viewport = getWorkspaceTourViewport();
  return panelHeight > viewport.height * 0.42 ? "start" : "center";
};

export const workspaceTourPanelMaxHeight =
  "calc(100dvh - max(24px, env(safe-area-inset-top)) - max(24px, env(safe-area-inset-bottom)))";
