"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  openingWindowAtMinute,
  openingWindowFirstStart,
} from "@/utils/openingHours";

import {
  getResizedSlotSelectionRange,
  getSlotSelectionRange,
} from "./calendar.interactions";

const isSamePointer = (session, event) =>
  session &&
  (session.pointerId === undefined ||
    event.pointerId === undefined ||
    session.pointerId === event.pointerId);

const pointerMinute = (event, elementTop, startMinute, pixelsPerMinute) =>
  startMinute + (Number(event.clientY) - elementTop) / pixelsPerMinute;

const AUTO_SCROLL_EDGE_PX = 64;
const AUTO_SCROLL_MAX_PX = 18;
// As with the browsers' own drag-and-drop autoscroll, the pointer rests near
// an edge briefly before scrolling starts. A drag still moving through the
// edge zone, or ending in it, then lands where it was released instead of
// running past it. Resting allows a finger's jitter of a few pixels.
const AUTO_SCROLL_DELAY_MS = 200;
const AUTO_SCROLL_REST_PX = 10;

const isWindowTarget = (target) => target?.window === target;

const getScrollTop = (target) => {
  if (!target) return 0;
  if (isWindowTarget(target)) {
    return Number(
      target.scrollY ?? target.document?.scrollingElement?.scrollTop ?? 0,
    );
  }

  return Number(target.scrollTop || 0);
};

// Calendar chrome that can stay stuck over the top of the scroll area: the
// command toolbar and the day headers (or their sticky wrappers).
const CALENDAR_STICKY_CHROME =
  "[data-calendar-command-bar], [data-calendar-grid-header], [data-calendar-day-header-scroll]";

const isStuckPosition = (view, element) =>
  ["sticky", "fixed"].includes(view.getComputedStyle(element)?.position);

// The grid only shows below chrome stuck over the scroll area's top edge, so
// the upward auto-scroll zone starts there. Otherwise a finger has to reach
// the site header before earlier times scroll into view.
const getVisibleScrollTop = (target, top, element) => {
  const view = element?.ownerDocument?.defaultView;
  const shell = element?.closest?.('[data-calendar-shell="true"]');
  if (!shell || !view?.getComputedStyle) return top;

  let visibleTop = top;
  if (isWindowTarget(target)) {
    // A page-scrolling calendar sits below the site's fixed header.
    const fixedHeaderBottom = Number.parseFloat(
      view
        .getComputedStyle(shell)
        .getPropertyValue("--calendar-command-toolbar-sticky-top"),
    );
    if (Number.isFinite(fixedHeaderBottom)) {
      visibleTop = Math.max(visibleTop, fixedHeaderBottom);
    }
  }

  for (const chrome of shell.querySelectorAll(CALENDAR_STICKY_CHROME)) {
    const stuck = isStuckPosition(view, chrome)
      ? chrome
      : chrome.parentElement && isStuckPosition(view, chrome.parentElement)
        ? chrome.parentElement
        : null;
    const bounds = stuck?.getBoundingClientRect?.();
    if (
      bounds?.height > 0 &&
      bounds.top <= visibleTop + 1 &&
      bounds.bottom > visibleTop
    ) {
      visibleTop = bounds.bottom;
    }
  }

  return visibleTop;
};

// The bottom edge of the calendar chrome stuck over the top of the page, such
// as the site header, the sticky toolbar and the day header.
export const getCalendarStickyChromeBottom = (element) => {
  const view = element?.ownerDocument?.defaultView;
  return view ? getVisibleScrollTop(view, 0, element) : 0;
};

const getScrollBounds = (target, element) => {
  if (isWindowTarget(target)) {
    const bottom = Number(target.innerHeight || 0);
    return {
      top: Math.min(bottom, getVisibleScrollTop(target, 0, element)),
      bottom,
    };
  }

  const bounds = target?.getBoundingClientRect?.();
  const view = target?.ownerDocument?.defaultView;
  const bottom = Math.min(
    Number(view?.innerHeight || bounds?.bottom || 0),
    Number(bounds?.bottom || 0),
  );
  return {
    top: Math.min(
      bottom,
      getVisibleScrollTop(
        target,
        Math.max(0, Number(bounds?.top || 0)),
        element,
      ),
    ),
    bottom,
  };
};

const getAutoScrollDelta = (target, clientY, element) => {
  const { top, bottom } = getScrollBounds(target, element);
  const height = bottom - top;
  if (height <= 0) return 0;

  const edge = Math.min(AUTO_SCROLL_EDGE_PX, Math.max(24, height / 3));
  if (clientY < top + edge) {
    return -Math.max(
      1,
      Math.ceil(AUTO_SCROLL_MAX_PX * (1 - Math.max(0, clientY - top) / edge)),
    );
  }
  if (clientY > bottom - edge) {
    return Math.max(
      1,
      Math.ceil(
        AUTO_SCROLL_MAX_PX * (1 - Math.max(0, bottom - clientY) / edge),
      ),
    );
  }

  return 0;
};

const scrollTargetBy = (target, delta) => {
  const before = getScrollTop(target);
  if (isWindowTarget(target)) {
    // "auto" would inherit the page's smooth scroll-behavior. Each step then
    // animates asynchronously, reads as no progress and stalls the drag.
    target.scrollBy?.({ top: delta, left: 0, behavior: "instant" });
  } else if (target) {
    target.scrollTop = before + delta;
  }
  return getScrollTop(target) - before;
};

const findVerticalScrollTarget = (element) => {
  const view = element?.ownerDocument?.defaultView;
  let candidate = element?.parentElement;

  while (candidate) {
    if (
      candidate === element?.ownerDocument?.body ||
      candidate === element?.ownerDocument?.documentElement
    ) {
      break;
    }
    const styles = view?.getComputedStyle?.(candidate);
    const scrollableOverflow = /^(auto|scroll|overlay)$/.test(
      styles?.overflowY || "",
    );
    if (
      scrollableOverflow &&
      Number(candidate.scrollHeight || 0) >
        Number(candidate.clientHeight || 0) + 1
    ) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }

  return view;
};

const pointerDeltaMinutes = (clientY, session, pixelsPerMinute) =>
  (Number(clientY) -
    session.anchorClientY +
    getScrollTop(session.scrollTarget) -
    session.anchorScrollTop) /
  pixelsPerMinute;

const isSameSelectionRange = (left, right) => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.scopeKey === right.scopeKey &&
    left.selectionKey === right.selectionKey &&
    left.startMinute === right.startMinute &&
    left.endMinute === right.endMinute &&
    left.phase === right.phase &&
    left.resizingEdge === right.resizingEdge
  );
};

const safelyCapturePointer = (element, pointerId) => {
  if (!element?.setPointerCapture || pointerId === undefined) return false;

  try {
    element.setPointerCapture(pointerId);
    return true;
  } catch {
    // Pointer capture can fail when the pointer ended between browser events.
    return false;
  }
};

const safelyReleasePointer = (element, pointerId) => {
  if (!element?.releasePointerCapture || pointerId === undefined) return;

  try {
    if (!element.hasPointerCapture || element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // The browser may already have released capture after pointerup/cancel.
  }
};

const stopTrackingScroll = (session) => {
  session?.scrollView?.removeEventListener?.(
    "scroll",
    session.handleScroll,
    true,
  );
};

const stopTrackingPointerFallback = (session) => {
  const target = session?.pointerFallbackTarget;
  if (!target) return;

  target.removeEventListener?.(
    "pointermove",
    session.handleFallbackPointerMove,
    true,
  );
  target.removeEventListener?.(
    "pointerup",
    session.handleFallbackPointerUp,
    true,
  );
  target.removeEventListener?.(
    "pointercancel",
    session.handleFallbackPointerCancel,
    true,
  );
};

const finishPointerSession = (session) => {
  const view = session?.element?.ownerDocument?.defaultView;
  if (session?.autoScrollFrame !== undefined) {
    view?.cancelAnimationFrame?.(session.autoScrollFrame);
  }
  stopTrackingPointerFallback(session);
  stopTrackingScroll(session);
  safelyReleasePointer(session?.element, session?.pointerId);
};

export default function useCalendarSlotSelection({
  enabled,
  scopeKey,
  startMinute,
  pixelsPerMinute,
  stepMinutes = 30,
  minimumMinutes = 60,
  maximumMinutes,
}) {
  const sessionRef = useRef(null);
  const selectionValueRef = useRef({ scopeKey, value: null });
  const [selectionState, setSelectionState] = useState(() => ({
    scopeKey,
    value: null,
  }));
  if (selectionState.scopeKey !== scopeKey) {
    setSelectionState({ scopeKey, value: null });
  }
  const selection =
    selectionState.scopeKey === scopeKey ? selectionState.value : null;
  const storeSelection = useCallback(
    (value, { dedupeRange = false } = {}) => {
      const currentState = selectionValueRef.current;
      if (
        currentState.scopeKey === scopeKey &&
        (currentState.value === value ||
          (dedupeRange && isSameSelectionRange(currentState.value, value)))
      ) {
        return;
      }

      selectionValueRef.current = { scopeKey, value };
      setSelectionState({ scopeKey, value });
    },
    [scopeKey],
  );

  useEffect(() => {
    selectionValueRef.current = selectionState;
  }, [selectionState]);

  useEffect(
    () => () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) finishPointerSession(session);
    },
    [scopeKey],
  );

  const buildRange = (anchorMinute, nextPointerMinute, openingWindow) =>
    getSlotSelectionRange({
      anchorMinute,
      pointerMinute: nextPointerMinute,
      stepMinutes,
      minimumMinutes,
      maximumMinutes,
      openMinute: openingWindow.openMinutes,
      closeMinute: openingWindow.closeMinutes,
    });

  const buildResizedRange = (current, edge, deltaMinutes) =>
    getResizedSlotSelectionRange({
      startMinute: current.startMinute,
      endMinute: current.endMinute,
      edge,
      deltaMinutes,
      stepMinutes,
      minimumMinutes,
      maximumMinutes,
      openMinute: current.openingWindow.openMinutes,
      closeMinute: current.openingWindow.closeMinutes,
    });

  const buildMovedRange = (current, deltaMinutes) => {
    const openMinute = Number(current.openingWindow?.openMinutes);
    const closeMinute = Number(current.openingWindow?.closeMinutes);
    const currentStart = Number(current.startMinute);
    const currentEnd = Number(current.endMinute);
    const step = Math.max(1, Number(stepMinutes) || 30);
    const duration = currentEnd - currentStart;

    if (
      !Number.isFinite(openMinute) ||
      !Number.isFinite(closeMinute) ||
      !Number.isFinite(currentStart) ||
      !Number.isFinite(currentEnd) ||
      duration <= 0 ||
      closeMinute - openMinute < duration
    ) {
      return null;
    }

    const parsedDelta = Number(deltaMinutes);
    const snappedDelta =
      Math.round((Number.isFinite(parsedDelta) ? parsedDelta : 0) / step) *
      step;
    const nextStart = Math.min(
      closeMinute - duration,
      Math.max(openMinute, currentStart + snappedDelta),
    );

    return {
      startMinute: nextStart,
      endMinute: nextStart + duration,
    };
  };

  const buildDraftRange = (session, deltaMinutes) =>
    session.kind === "resize"
      ? buildResizedRange(session.originalSelection, session.edge, deltaMinutes)
      : buildMovedRange(session.originalSelection, deltaMinutes);

  // Scrolling further only helps while the draft can follow it. Once the
  // dragged edge is clamped by opening hours or the minimum/maximum length,
  // more scrolling would carry the selection away from the finger. Ranges
  // snap to the nearest step, so one more step changes any unclamped range.
  const canDraftFollowScroll = (session, scrollDelta) => {
    const deltaMinutes = pointerDeltaMinutes(
      session.latestClientY,
      session,
      pixelsPerMinute,
    );
    const step = Math.max(1, Number(stepMinutes) || 30);
    const current = buildDraftRange(session, deltaMinutes);
    const further = buildDraftRange(
      session,
      deltaMinutes + Math.sign(scrollDelta) * step,
    );

    return Boolean(
      current &&
      further &&
      (current.startMinute !== further.startMinute ||
        current.endMinute !== further.endMinute),
    );
  };

  const updateDraftPointerRange = (session, clientY) => {
    const deltaMinutes = pointerDeltaMinutes(clientY, session, pixelsPerMinute);
    const range = buildDraftRange(session, deltaMinutes);
    if (!range) return;

    storeSelection(
      {
        ...session.originalSelection,
        ...range,
        phase: session.kind === "resize" ? "resizing" : "moving",
        resizingEdge: session.kind === "resize" ? session.edge : undefined,
      },
      { dedupeRange: true },
    );
  };

  const updateDraftAutoScroll = (session, clientY) => {
    session.latestClientY = Number(clientY);
    const view = session.element?.ownerDocument?.defaultView;
    if (!view?.requestAnimationFrame) return;

    const delta = getAutoScrollDelta(
      session.scrollTarget,
      session.latestClientY,
      session.element,
    );
    if (!delta) {
      session.autoScrollSince = undefined;
      session.autoScrolling = false;
      session.autoScrollRestY = undefined;
      if (session.autoScrollFrame !== undefined) {
        view.cancelAnimationFrame?.(session.autoScrollFrame);
        session.autoScrollFrame = undefined;
      }
      return;
    }
    if (Math.sign(delta) !== session.autoScrollDirection) {
      session.autoScrollDirection = Math.sign(delta);
      session.autoScrollSince = undefined;
      session.autoScrolling = false;
      session.autoScrollRestY = undefined;
    }
    // Until scrolling has started, moving on through the zone restarts the
    // wait. Once it scrolls, moving closer to the edge only speeds it up.
    if (
      !session.autoScrolling &&
      (session.autoScrollRestY === undefined ||
        Math.abs(session.latestClientY - session.autoScrollRestY) >
          AUTO_SCROLL_REST_PX)
    ) {
      session.autoScrollRestY = session.latestClientY;
      session.autoScrollSince = undefined;
    }
    if (session.autoScrollFrame !== undefined) return;

    const autoScroll = (frameTime) => {
      session.autoScrollFrame = undefined;
      if (sessionRef.current !== session) return;

      const nextDelta = getAutoScrollDelta(
        session.scrollTarget,
        session.latestClientY,
        session.element,
      );
      if (!nextDelta || !canDraftFollowScroll(session, nextDelta)) return;

      const now = Number.isFinite(frameTime)
        ? frameTime
        : (view.performance?.now?.() ?? Date.now());
      session.autoScrollSince ??= now;
      if (now - session.autoScrollSince < AUTO_SCROLL_DELAY_MS) {
        session.autoScrollFrame = view.requestAnimationFrame(autoScroll);
        return;
      }

      const scrolledBy = scrollTargetBy(session.scrollTarget, nextDelta);
      if (!scrolledBy) return;

      session.autoScrolling = true;
      updateDraftPointerRange(session, session.latestClientY);
      session.autoScrollFrame = view.requestAnimationFrame(autoScroll);
    };

    session.autoScrollFrame = view.requestAnimationFrame(autoScroll);
  };

  const cancelPointerSession = (event) => {
    const session = sessionRef.current;
    if (!session || (event && !isSamePointer(session, event))) return;

    sessionRef.current = null;
    finishPointerSession(session);
    storeSelection(
      ["move", "resize"].includes(session.kind)
        ? { ...session.originalSelection, phase: "ready" }
        : null,
    );
  };

  const beginSelection = (event, config) => {
    const target = event.target;
    if (
      !enabled ||
      event.button !== 0 ||
      event.pointerType === "touch" ||
      target?.closest?.(
        "[data-calendar-event-card], [data-calendar-slot-confirm], [data-calendar-slot-resize]",
      )
    ) {
      return;
    }

    const { day, selectionKey, metadata = {} } = config;
    const element = event.currentTarget;
    const elementTop = element.getBoundingClientRect().top;
    // A caller may anchor the press on the slot it has already checked.
    // Otherwise the range starts from the nearest step to the pointer.
    const anchorMinute = Number.isFinite(config.anchorMinute)
      ? config.anchorMinute
      : pointerMinute(event, elementTop, startMinute, pixelsPerMinute);
    const openingWindow = openingWindowAtMinute(
      config.openingWindow,
      anchorMinute,
    );
    if (openingWindow)
      openingWindow.openMinutes = openingWindowFirstStart(
        openingWindow,
        stepMinutes,
      );

    if (
      !openingWindow?.isOpen ||
      anchorMinute < openingWindow.openMinutes ||
      anchorMinute >= openingWindow.closeMinutes
    ) {
      return;
    }

    const range = buildRange(anchorMinute, anchorMinute, openingWindow);
    if (!range) return;

    const previousSession = sessionRef.current;
    sessionRef.current = null;
    if (previousSession) finishPointerSession(previousSession);

    event.preventDefault();
    safelyCapturePointer(element, event.pointerId);

    const session = {
      kind: "create",
      anchorMinute,
      day,
      element,
      elementTop,
      metadata,
      openingWindow,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      scopeKey,
      selectionKey,
    };
    const scrollView = element.ownerDocument?.defaultView;
    session.scrollView = scrollView;
    session.handleScroll = () => {
      if (sessionRef.current === session) {
        session.elementTop = element.getBoundingClientRect().top;
      }
    };
    scrollView?.addEventListener?.("scroll", session.handleScroll, true);
    sessionRef.current = session;
    storeSelection({
      ...session,
      ...range,
      phase: "dragging",
    });
  };

  const updateSelection = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "create" || !isSamePointer(session, event)) {
      return;
    }
    if (
      session.pointerType !== "touch" &&
      event.buttons !== undefined &&
      event.buttons !== 1
    ) {
      cancelPointerSession(event);
      return;
    }

    const nextPointerMinute = pointerMinute(
      event,
      session.elementTop,
      startMinute,
      pixelsPerMinute,
    );
    const range = buildRange(
      session.anchorMinute,
      nextPointerMinute,
      session.openingWindow,
    );
    if (!range) return;

    event.preventDefault();
    storeSelection(
      {
        ...session,
        ...range,
        phase: "dragging",
      },
      { dedupeRange: true },
    );
  };

  const finishSelection = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "create" || !isSamePointer(session, event)) return;

    const finalPointerMinute = pointerMinute(
      event,
      session.elementTop,
      startMinute,
      pixelsPerMinute,
    );
    const range = buildRange(
      session.anchorMinute,
      finalPointerMinute,
      session.openingWindow,
    );

    sessionRef.current = null;
    finishPointerSession(session);

    if (!range) {
      storeSelection(null);
      return;
    }

    event.preventDefault();
    storeSelection({
      ...session,
      ...range,
      phase: "ready",
    });
  };

  const cancelSelection = cancelPointerSession;

  const beginResize = (event, edge) => {
    if (
      !enabled ||
      selection?.phase !== "ready" ||
      !["start", "end"].includes(edge) ||
      event.button !== 0
    ) {
      return;
    }

    const element = event.currentTarget;
    const pointerCaptured = safelyCapturePointer(element, event.pointerId);

    event.preventDefault();
    event.stopPropagation();
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus?.();
    }

    const previousSession = sessionRef.current;
    sessionRef.current = null;
    if (previousSession) finishPointerSession(previousSession);

    const scrollTarget = findVerticalScrollTarget(element);
    const session = {
      kind: "resize",
      edge,
      element,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      anchorClientY: Number(event.clientY) || 0,
      latestClientY: Number(event.clientY) || 0,
      scrollTarget,
      anchorScrollTop: getScrollTop(scrollTarget),
      originalSelection: selection,
    };
    sessionRef.current = session;
    if (!pointerCaptured) {
      const view = element.ownerDocument?.defaultView;
      session.pointerFallbackTarget = view;
      session.handleFallbackPointerMove = (nextEvent) =>
        updateResize(nextEvent);
      session.handleFallbackPointerUp = (nextEvent) => finishResize(nextEvent);
      session.handleFallbackPointerCancel = (nextEvent) =>
        cancelResize(nextEvent);
      view?.addEventListener?.(
        "pointermove",
        session.handleFallbackPointerMove,
        true,
      );
      view?.addEventListener?.(
        "pointerup",
        session.handleFallbackPointerUp,
        true,
      );
      view?.addEventListener?.(
        "pointercancel",
        session.handleFallbackPointerCancel,
        true,
      );
    }
    storeSelection({
      ...selection,
      phase: "resizing",
      resizingEdge: edge,
    });
    return true;
  };

  const updateResize = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "resize" || !isSamePointer(session, event)) return;

    event.preventDefault();
    event.stopPropagation();
    if (
      session.pointerType !== "touch" &&
      event.buttons !== undefined &&
      event.buttons !== 1
    ) {
      cancelPointerSession(event);
      return;
    }

    updateDraftPointerRange(session, event.clientY);
    updateDraftAutoScroll(session, event.clientY);
  };

  const finishResize = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "resize" || !isSamePointer(session, event)) return;

    event.preventDefault();
    event.stopPropagation();
    const deltaMinutes = pointerDeltaMinutes(
      event.clientY,
      session,
      pixelsPerMinute,
    );
    const range = buildResizedRange(
      session.originalSelection,
      session.edge,
      deltaMinutes,
    );

    sessionRef.current = null;
    finishPointerSession(session);
    storeSelection({
      ...session.originalSelection,
      ...(range || {}),
      phase: "ready",
      resizingEdge: undefined,
    });
  };

  const cancelResize = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    cancelPointerSession(event);
  };

  const resizeByStep = (edge, deltaMinutes) => {
    if (
      !enabled ||
      selection?.phase !== "ready" ||
      !["start", "end"].includes(edge)
    ) {
      return;
    }

    const range = buildResizedRange(selection, edge, deltaMinutes);
    if (!range) return;
    storeSelection({
      ...selection,
      ...range,
      phase: "ready",
      resizingEdge: undefined,
    });
  };

  const beginMove = (event) => {
    if (
      !enabled ||
      selection?.phase !== "ready" ||
      event.button !== 0 ||
      event.target?.closest?.("[data-calendar-slot-control]")
    ) {
      return;
    }

    const element = event.currentTarget;
    const pointerCaptured = safelyCapturePointer(element, event.pointerId);

    event.preventDefault();
    event.stopPropagation();
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus?.();
    }

    const previousSession = sessionRef.current;
    sessionRef.current = null;
    if (previousSession) finishPointerSession(previousSession);

    const scrollTarget = findVerticalScrollTarget(element);
    const session = {
      kind: "move",
      element,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      anchorClientY: Number(event.clientY) || 0,
      latestClientY: Number(event.clientY) || 0,
      scrollTarget,
      anchorScrollTop: getScrollTop(scrollTarget),
      originalSelection: selection,
    };
    sessionRef.current = session;
    if (!pointerCaptured) {
      const view = element.ownerDocument?.defaultView;
      session.pointerFallbackTarget = view;
      session.handleFallbackPointerMove = (nextEvent) => updateMove(nextEvent);
      session.handleFallbackPointerUp = (nextEvent) => finishMove(nextEvent);
      session.handleFallbackPointerCancel = (nextEvent) =>
        cancelMove(nextEvent);
      view?.addEventListener?.(
        "pointermove",
        session.handleFallbackPointerMove,
        true,
      );
      view?.addEventListener?.(
        "pointerup",
        session.handleFallbackPointerUp,
        true,
      );
      view?.addEventListener?.(
        "pointercancel",
        session.handleFallbackPointerCancel,
        true,
      );
    }
    storeSelection({
      ...selection,
      phase: "moving",
      resizingEdge: undefined,
    });
    return true;
  };

  const updateMove = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "move" || !isSamePointer(session, event)) return;

    event.preventDefault();
    event.stopPropagation();
    if (
      session.pointerType !== "touch" &&
      event.buttons !== undefined &&
      event.buttons !== 1
    ) {
      cancelPointerSession(event);
      return;
    }

    updateDraftPointerRange(session, event.clientY);
    updateDraftAutoScroll(session, event.clientY);
  };

  const finishMove = (event) => {
    const session = sessionRef.current;
    if (session?.kind !== "move" || !isSamePointer(session, event)) return;

    event.preventDefault();
    event.stopPropagation();
    const range = buildMovedRange(
      session.originalSelection,
      pointerDeltaMinutes(event.clientY, session, pixelsPerMinute),
    );

    sessionRef.current = null;
    finishPointerSession(session);
    storeSelection({
      ...session.originalSelection,
      ...(range || {}),
      phase: "ready",
      resizingEdge: undefined,
    });
  };

  const cancelMove = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    cancelPointerSession(event);
  };

  const moveByStep = (deltaMinutes) => {
    if (!enabled || selection?.phase !== "ready") return;

    const range = buildMovedRange(selection, deltaMinutes);
    if (!range) return;
    storeSelection({
      ...selection,
      ...range,
      phase: "ready",
      resizingEdge: undefined,
    });
  };

  const selectRange = ({
    day,
    openingWindow,
    selectionKey,
    metadata = {},
    anchorMinute = openingWindow?.openMinutes,
  }) => {
    openingWindow = openingWindowAtMinute(openingWindow, anchorMinute);
    if (!enabled || !openingWindow) return;
    openingWindow.openMinutes = openingWindowFirstStart(
      openingWindow,
      stepMinutes,
    );

    const range = buildRange(anchorMinute, anchorMinute, openingWindow);
    if (!range) return;

    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) finishPointerSession(session);
    storeSelection({
      day,
      metadata,
      openingWindow,
      scopeKey,
      selectionKey,
      ...range,
      phase: "ready",
    });
  };

  const seedSelection = useCallback(
    ({
      day,
      openingWindow,
      selectionKey,
      metadata = {},
      startMinute: requestedStart,
      endMinute: requestedEnd,
    }) => {
      const numericStart = Number(requestedStart);
      const numericEnd = Number(requestedEnd);
      const open = Number(openingWindow?.openMinutes);
      const close = Number(openingWindow?.closeMinutes);
      if (
        !enabled ||
        !selectionKey ||
        !Number.isFinite(new Date(day).getTime()) ||
        ![numericStart, numericEnd, open, close].every(Number.isFinite) ||
        open < 0 ||
        close > 48 * 60 ||
        close <= open ||
        numericStart < open ||
        numericStart >= 24 * 60 ||
        numericEnd > close ||
        numericEnd <= numericStart
      ) {
        return false;
      }

      // An occupancy click can preview unavailable time. The geometry window
      // controls dragging; the calendar checks actual availability separately.
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) finishPointerSession(session);
      storeSelection({
        day,
        metadata,
        openingWindow: { ...openingWindow, isOpen: true },
        scopeKey,
        selectionKey,
        startMinute: numericStart,
        endMinute: numericEnd,
        phase: "ready",
      });
      return true;
    },
    [enabled, scopeKey, storeSelection],
  );

  const clearSelection = () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) finishPointerSession(session);
    storeSelection(null);
  };

  return {
    selection,
    beginSelection,
    updateSelection,
    finishSelection,
    cancelSelection,
    beginResize,
    updateResize,
    finishResize,
    cancelResize,
    resizeByStep,
    beginMove,
    updateMove,
    finishMove,
    cancelMove,
    moveByStep,
    clearSelection,
    selectRange,
    seedSelection,
  };
}
