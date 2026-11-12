import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { findProductTourTarget } from "@/components/product-tour/productTour.config";

import {
  getWorkspaceTourPanelStyle,
  getWorkspaceTourResponsiveSelectors,
  getWorkspaceTourScrollBlock,
  getWorkspaceTourViewport,
} from "./workspaceTourGeometry";

const SPOTLIGHT_PADDING = 8;
const TARGET_REVEAL_WINDOW_MS = 500;
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "ArrowLeft",
  "ArrowRight",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
]);

const rectanglesMatch = (previous, next) =>
  previous === next ||
  (previous &&
    next &&
    Object.keys(next).every((key) => previous[key] === next[key]));

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

const getPaddedRect = (rect) => {
  if (!rect || typeof window === "undefined") return null;

  const visualViewport = window.visualViewport;
  const offsetLeft = visualViewport?.offsetLeft || 0;
  const offsetTop = visualViewport?.offsetTop || 0;
  const viewportWidth = visualViewport?.width || window.innerWidth;
  const viewportHeight = visualViewport?.height || window.innerHeight;
  const leftEdge = offsetLeft + 8;
  const topEdge = offsetTop + 8;
  const rightEdge = offsetLeft + viewportWidth - 8;
  const bottomEdge = offsetTop + viewportHeight - 8;
  const left = clamp(rect.left - SPOTLIGHT_PADDING, leftEdge, rightEdge);
  const top = clamp(rect.top - SPOTLIGHT_PADDING, topEdge, bottomEdge);
  const right = clamp(rect.right + SPOTLIGHT_PADDING, left, rightEdge);
  const bottom = clamp(rect.bottom + SPOTLIGHT_PADDING, top, bottomEdge);

  return {
    bottom,
    height: Math.max(0, bottom - top),
    left,
    right,
    top,
    width: Math.max(0, right - left),
  };
};

export default function useWorkspaceTourLayout({
  active,
  selectors = [],
  step = null,
}) {
  const panelRef = useRef(null);
  const [panelSize, setPanelSize] = useState({ height: 0, width: 0 });
  const [targetRect, setTargetRect] = useState(null);

  const defaultSelectorsKey = selectors.join("\u001f");

  useLayoutEffect(() => {
    if (!active || !panelRef.current) return undefined;

    const panel = panelRef.current;
    const measurePanel = () => {
      const rect = panel.getBoundingClientRect();
      setPanelSize((current) =>
        current.height === rect.height && current.width === rect.width
          ? current
          : { height: rect.height, width: rect.width },
      );
    };

    measurePanel();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measurePanel);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active || (!step && !defaultSelectorsKey)) return undefined;

    let frame = null;
    let observedTarget = null;
    let revealUntil = 0;
    let userInteracted = false;
    const scheduleFrame =
      window.requestAnimationFrame?.bind(window) ??
      ((callback) => window.setTimeout(callback, 16));
    const cancelFrame =
      window.cancelAnimationFrame?.bind(window) ??
      window.clearTimeout.bind(window);

    const revealTarget = (target) => {
      const targetChanged = target !== observedTarget;

      if (targetChanged) {
        observedTarget = target;
        revealUntil = performance.now() + TARGET_REVEAL_WINDOW_MS;
      }
      if (!target || userInteracted || performance.now() > revealUntil) return;

      const rect = target.getBoundingClientRect();
      const viewport = getWorkspaceTourViewport();
      const targetIntersectsViewport =
        rect.bottom > viewport.offsetTop &&
        rect.top < viewport.offsetTop + viewport.height &&
        rect.right > viewport.offsetLeft &&
        rect.left < viewport.offsetLeft + viewport.width;

      if (targetChanged || !targetIntersectsViewport) {
        target.scrollIntoView?.({
          // Reveal atomically: route layout can interrupt a smooth scroll
          // while the modal is opening and leave its target offscreen.
          behavior: "instant",
          block: getWorkspaceTourScrollBlock(panelSize.height),
          inline: "nearest",
        });
      }
    };

    function measure() {
      const responsiveSelectors = step
        ? getWorkspaceTourResponsiveSelectors(step)
        : defaultSelectorsKey.split("\u001f");
      const target = findProductTourTarget(responsiveSelectors);
      revealTarget(target);
      const nextRect = target
        ? getPaddedRect(target.getBoundingClientRect())
        : null;
      setTargetRect((previous) =>
        rectanglesMatch(previous, nextRect) ? previous : nextRect,
      );
      frame = scheduleFrame(measure);
    }

    const stopReveal = (event) => {
      if (event.type !== "keydown" || SCROLL_KEYS.has(event.key)) {
        userInteracted = true;
      }
    };

    // A sibling or font can move the target without changing its size or
    // emitting a scroll/DOM event. Track position only while this guide is open.
    frame = scheduleFrame(measure);
    window.addEventListener("wheel", stopReveal, { passive: true });
    window.addEventListener("touchmove", stopReveal, { passive: true });
    window.addEventListener("pointerdown", stopReveal);
    window.addEventListener("keydown", stopReveal);

    return () => {
      if (frame !== null) cancelFrame(frame);
      window.removeEventListener("wheel", stopReveal);
      window.removeEventListener("touchmove", stopReveal);
      window.removeEventListener("pointerdown", stopReveal);
      window.removeEventListener("keydown", stopReveal);
    };
  }, [active, defaultSelectorsKey, panelSize.height, step]);

  const resolvedSelectors = step
    ? getWorkspaceTourResponsiveSelectors(step)
    : selectors;
  const hasSelectors = resolvedSelectors.length > 0;

  return {
    panelRef,
    panelStyle: getWorkspaceTourPanelStyle({
      panelHeight: panelSize.height,
      panelWidth: panelSize.width || 388,
      target: active && hasSelectors ? targetRect : null,
    }),
    targetRect: active && hasSelectors ? targetRect : null,
  };
}
