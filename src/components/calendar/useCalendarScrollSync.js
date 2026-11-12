"use client";

import { useCallback, useRef } from "react";

const SCROLL_TOLERANCE = 0.5;
const SCROLL_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  " ",
]);

export default function useCalendarScrollSync({ bodyRef, headerRef }) {
  const activeSourceRef = useRef(null);
  const expectedOffsetsRef = useRef(new Map());

  const writeScrollLeft = useCallback((target, scrollLeft) => {
    if (!target) return;

    const maximum = Math.max(0, target.scrollWidth - target.clientWidth);
    const next = Math.max(0, Math.min(scrollLeft, maximum));
    if (Math.abs(target.scrollLeft - next) <= SCROLL_TOLERANCE) return;

    expectedOffsetsRef.current.set(target, next);
    target.scrollLeft = next;
    // Browsers can clamp or round the requested offset. Its resulting scroll
    // event is a follower echo, not another user gesture.
    expectedOffsetsRef.current.set(target, target.scrollLeft);
  }, []);

  const handleScrollInputCapture = useCallback((event) => {
    activeSourceRef.current = event.currentTarget;
    expectedOffsetsRef.current.delete(event.currentTarget);
    // Native touch panning fires pointercancel before momentum finishes. Keep
    // this surface in control until input begins on the other surface.
  }, []);

  const handleScrollKeyDownCapture = useCallback(
    (event) => {
      if (SCROLL_KEYS.has(event.key)) handleScrollInputCapture(event);
    },
    [handleScrollInputCapture],
  );

  const handleScroll = useCallback(
    (event) => {
      const source = event.currentTarget;
      const expected = expectedOffsetsRef.current.get(source);
      expectedOffsetsRef.current.delete(source);
      if (
        expected !== undefined &&
        Math.abs(source.scrollLeft - expected) <= SCROLL_TOLERANCE
      ) {
        return;
      }
      if (activeSourceRef.current && activeSourceRef.current !== source) return;

      writeScrollLeft(
        source === bodyRef.current ? headerRef.current : bodyRef.current,
        source.scrollLeft,
      );
    },
    [bodyRef, headerRef, writeScrollLeft],
  );

  const syncScrollFromBody = useCallback(
    (scrollLeft = bodyRef.current?.scrollLeft || 0) => {
      const body = bodyRef.current;
      // A date/location change starts from the body again, regardless of which
      // surface controlled the previous view.
      activeSourceRef.current = body;
      expectedOffsetsRef.current.clear();
      writeScrollLeft(body, scrollLeft);
      writeScrollLeft(headerRef.current, body?.scrollLeft || 0);
    },
    [bodyRef, headerRef, writeScrollLeft],
  );

  return {
    handleBodyScroll: handleScroll,
    handleHeaderScroll: handleScroll,
    handleScrollInputCapture,
    handleScrollKeyDownCapture,
    syncScrollFromBody,
  };
}
