"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export function useCalendarTooltip({ enabled = true } = {}) {
  const id = useId();
  const [anchor, setAnchor] = useState(null);
  const timerRef = useRef(null);
  const removeListenersRef = useRef(() => {});

  const close = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    removeListenersRef.current();
    setAnchor(null);
  }, []);

  const schedule = useCallback(
    (element, trigger = "pointer") => {
      if (!enabled) return;
      close();
      let pending = true;
      const open = () => {
        pending = false;
        timerRef.current = null;
        const bounds = element.getBoundingClientRect();
        const isVisible =
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.bottom > 0 &&
          bounds.top < window.innerHeight &&
          bounds.right > 0 &&
          bounds.left < window.innerWidth;
        if (
          !element.isConnected ||
          !isVisible ||
          (trigger === "focus" && document.activeElement !== element)
        ) {
          close();
          return;
        }
        setAnchor(element);
      };
      const dismissOnScroll = () => {
        // Tabbing to a calendar event can scroll it into view after focus.
        // Let that movement settle before opening; later scrolling dismisses.
        if (
          pending &&
          trigger === "focus" &&
          document.activeElement === element
        ) {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(open, 200);
          return;
        }
        close();
      };
      const dismissOnEscape = (event) => {
        if (event.key === "Escape") close();
      };
      window.addEventListener("scroll", dismissOnScroll, true);
      window.addEventListener("resize", close);
      window.addEventListener("keydown", dismissOnEscape);
      removeListenersRef.current = () => {
        window.removeEventListener("scroll", dismissOnScroll, true);
        window.removeEventListener("resize", close);
        window.removeEventListener("keydown", dismissOnEscape);
      };
      timerRef.current = setTimeout(open, 200);
    },
    [close, enabled],
  );

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      removeListenersRef.current();
    },
    [],
  );

  return {
    close,
    triggerProps: {
      "aria-describedby": enabled && anchor ? id : undefined,
      onPointerEnter: (event) => {
        if (
          event.pointerType === "mouse" &&
          window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ) {
          schedule(event.currentTarget);
        }
      },
      onPointerLeave: close,
      onFocus: (event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          schedule(event.currentTarget, "focus");
        }
      },
      onBlur: close,
    },
    tooltipProps: { id, anchor: enabled ? anchor : null },
  };
}

export default function CalendarTooltip({ id, anchor, children }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    const target = anchor.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const anchorStyle = window.getComputedStyle(anchor);
    const theme = Object.fromEntries(
      [
        "--tenant-surface",
        "--tenant-border",
        "--tenant-text-on-surface",
        "--tenant-accent",
        "--tenant-accent-foreground",
      ]
        .map((key) => [key, anchorStyle.getPropertyValue(key).trim()])
        .filter(([, value]) => value),
    );
    const margin = 12;
    const gap = 8;
    const below = target.bottom + gap;
    setPosition({
      ...theme,
      left: Math.max(
        margin,
        Math.min(
          target.left + (target.width - tooltip.width) / 2,
          window.innerWidth - tooltip.width - margin,
        ),
      ),
      top: Math.max(
        margin,
        below + tooltip.height <= window.innerHeight - margin
          ? below
          : target.top - tooltip.height - gap,
      ),
    });
  }, [anchor, children]);

  if (!anchor || !anchor.isConnected) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      data-calendar-tooltip="true"
      className="pointer-events-none fixed z-[100] w-max max-w-[min(19rem,calc(100vw-24px))] rounded-2xl border px-3.5 py-3 text-left text-[12px] leading-relaxed shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
      style={{
        ...position,
        visibility: position ? "visible" : "hidden",
        backgroundColor: "var(--tenant-surface, #FFFFFF)",
        borderColor: "var(--tenant-border, #CBD5E1)",
        color: "var(--tenant-text-on-surface, #1E293B)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
