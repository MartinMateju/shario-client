"use client";

import { useEffect, useRef } from "react";

import { ChevronUpDownIcon, PlusIcon } from "@heroicons/react/24/outline";

import { formatRange, formatTime, makeSlotDate } from "./calendar.utils";
import { getCalendarAvailabilityLabel } from "./calendar.presentation";
import { getCalendarStickyChromeBottom } from "./useCalendarSlotSelection";

const MINUTES_PER_DAY = 24 * 60;

// Keep a selection clear of the calendar's sticky headers, the sticky time
// rail and the fixed Continue bar, so it can be seen and adjusted. A tap near
// the bottom of a phone screen otherwise leaves it under the Continue bar.
function revealSelection(element) {
  const view = element?.ownerDocument?.defaultView;
  if (!view || typeof element.scrollIntoView !== "function") return;

  const summary = element.ownerDocument.querySelector(
    "[data-calendar-mobile-selection-summary]",
  );
  const summaryTop = summary?.getClientRects().length
    ? summary.getBoundingClientRect().top - 8
    : view.innerHeight;
  const timeRail = element
    .closest("[data-calendar-week-scroll], [data-calendar-day-scroll]")
    ?.querySelector("[data-calendar-time-rail]");
  // The resize handles stick out past the selection; keep them grabbable.
  const bounds = element.getBoundingClientRect();
  const overhang = (edge, outside) => {
    const handle = element
      .querySelector(`[data-calendar-slot-resize="${edge}"]`)
      ?.getBoundingClientRect();
    return handle ? Math.max(0, outside(handle)) : 0;
  };
  const topOverhang = overhang("start", (handle) => bounds.top - handle.top);
  const bottomOverhang = overhang(
    "end",
    (handle) => handle.bottom - bounds.bottom,
  );

  element.style.scrollMarginTop = `${getCalendarStickyChromeBottom(element) + topOverhang}px`;
  element.style.scrollMarginBottom = `${Math.max(0, view.innerHeight - summaryTop) + bottomOverhang}px`;
  element.style.scrollMarginLeft = `${timeRail?.getBoundingClientRect().width || 0}px`;
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function ResizeHandle({
  edge,
  label,
  active,
  inset,
  compactBoundary,
  stepMinutes,
  onResizeBegin,
  onResizeMove,
  onResizeEnd,
  onResizeCancel,
  onResizeByStep,
  onCancel,
  hint,
  customerThemed = false,
}) {
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    const delta =
      event.key === "ArrowUp"
        ? -stepMinutes
        : event.key === "ArrowDown"
          ? stepMinutes
          : event.key === "Home"
            ? -MINUTES_PER_DAY
            : event.key === "End"
              ? MINUTES_PER_DAY
              : null;
    if (delta === null) return;

    event.preventDefault();
    event.stopPropagation();
    onResizeByStep(edge, delta);
  };

  return (
    <button
      type="button"
      data-calendar-slot-control="true"
      data-calendar-slot-resize={edge}
      data-tenant-hover={customerThemed ? "preserve" : undefined}
      aria-label={`${label}. ${hint}`}
      aria-keyshortcuts="ArrowUp ArrowDown Home End Escape"
      title={`${label}. ${hint}`}
      onPointerDown={(event) => onResizeBegin(event, edge)}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeEnd}
      onPointerCancel={onResizeCancel}
      onLostPointerCapture={onResizeCancel}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={onKeyDown}
      className={`group pointer-events-auto absolute z-[26] inline-flex h-11 w-11 -translate-x-1/2 cursor-ns-resize touch-none items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
        customerThemed
          ? "focus-visible:ring-[var(--tenant-accent-on-surface)]/35"
          : "focus-visible:ring-brand-primary/35"
      } ${
        compactBoundary
          ? edge === "start"
            ? "left-[30%]"
            : "left-[60%]"
          : "left-1/2"
      } ${
        edge === "start"
          ? inset
            ? "top-0"
            : "-top-[22px]"
          : inset
            ? "bottom-0"
            : "-bottom-[22px]"
      }`}
    >
      <span
        className={`inline-flex h-[18px] w-9 items-center justify-center rounded-full border transition ${
          customerThemed
            ? active
              ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] shadow-[0_4px_10px_color-mix(in_srgb,var(--tenant-accent)_18%,transparent)]"
              : "border-[var(--tenant-accent-on-surface)]/35 bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)] shadow-[0_4px_10px_color-mix(in_srgb,var(--tenant-accent)_18%,transparent)] group-hover:border-[var(--tenant-accent-on-surface)]/60 group-hover:bg-[var(--tenant-background)]"
            : active
              ? "border-brand-primary bg-brand-primary text-white shadow-[0_4px_10px_rgb(var(--skab-blue-rgb)/0.18)]"
              : "border-brand-primary/35 bg-white text-primary-text shadow-[0_4px_10px_rgb(var(--skab-blue-rgb)/0.18)] group-hover:border-brand-primary/60 group-hover:bg-skab-cobalt-50"
        }`}
      >
        <ChevronUpDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </button>
  );
}

export default function CalendarSlotSelection({
  selection,
  calendarStartMinute,
  calendarEndMinute,
  pixelsPerMinute,
  studio,
  locale,
  onConfirm,
  onCancel,
  onResizeBegin,
  onResizeMove,
  onResizeEnd,
  onResizeCancel,
  onResizeByStep,
  onMoveBegin,
  onMoveMove,
  onMoveEnd,
  onMoveCancel,
  onMoveByStep,
  availability,
  audience = "tenant",
  mobileDeferred = false,
  t,
}) {
  const previewRef = useRef(null);
  const confirmRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const revealPhaseRef = useRef(null);
  const stepMinutes = Math.max(1, Number(studio?.slotStepMinutes) || 30);
  const startDate = makeSlotDate(
    selection.day,
    selection.startMinute,
    studio?.timeZone,
  );
  const endDate = makeSlotDate(
    selection.day,
    selection.endMinute,
    studio?.timeZone,
  );
  const range = formatRange(startDate, endDate, locale, studio?.timeZone);
  const startTime = formatTime(startDate, locale, studio?.timeZone);
  const endTime = formatTime(endDate, locale, studio?.timeZone);
  const customerThemed = ["customer", "public"].includes(audience);
  const availabilityLabel = getCalendarAvailabilityLabel(
    availability,
    t,
    studio,
  );
  const bookingAllowed =
    !customerThemed || !availability || availability.isBookable;
  const canResize = ["ready", "resizing"].includes(selection.phase);
  const canMove =
    ["ready", "moving"].includes(selection.phase) &&
    typeof onMoveBegin === "function";
  const canInteract = canResize || canMove;
  const canConfirm = selection.phase === "ready" && bookingAllowed;
  const resizingEdge = selection.resizingEdge;
  const resizeHint = t("selection.resizeHint");
  const selectionHeight = Math.max(
    2,
    (selection.endMinute - selection.startMinute) * pixelsPerMinute,
  );
  const compact = selectionHeight < 56;
  const startHandleInset = selection.startMinute <= calendarStartMinute;
  const endHandleInset = selection.endMinute >= calendarEndMinute;
  const compactBoundary = compact && (startHandleInset || endHandleInset);

  useEffect(() => {
    // The inline action stays visible on mobile; preserve deferred focus so
    // selecting a slot by touch does not unexpectedly scroll the calendar.
    // Touch screens keep the Continue bar at desktop widths too (iPad
    // landscape), so only a desktop pointer makes the inline action primary.
    const shouldFocusInlineConfirmation =
      !mobileDeferred ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(min-width: 1024px) and (pointer: fine)")
          ?.matches);
    if (
      shouldFocusInlineConfirmation &&
      selection.phase === "ready" &&
      !["moving", "resizing"].includes(previousPhaseRef.current)
    ) {
      confirmRef.current?.focus();
    }
    previousPhaseRef.current = selection.phase;
  }, [mobileDeferred, selection.phase]);

  useEffect(() => {
    // A drop leaves the selection where the finger or pointer put it. New
    // selections and keyboard adjustments are brought into the open.
    const dropped = ["moving", "resizing"].includes(revealPhaseRef.current);
    revealPhaseRef.current = selection.phase;
    if (
      selection.phase !== "ready" ||
      dropped ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() =>
      revealSelection(previewRef.current),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [
    selection.endMinute,
    selection.phase,
    selection.selectionKey,
    selection.startMinute,
  ]);

  return (
    <div
      ref={previewRef}
      data-calendar-slot-preview="true"
      data-calendar-slot-phase={selection.phase}
      data-calendar-slot-resizing-edge={resizingEdge || undefined}
      data-calendar-slot-moving={selection.phase === "moving" || undefined}
      data-calendar-slot-state={availability?.state}
      data-calendar-slot-bookable={bookingAllowed ? "true" : "false"}
      role="group"
      tabIndex={canMove ? 0 : undefined}
      aria-label={[range, availabilityLabel].filter(Boolean).join(", ")}
      aria-keyshortcuts={canMove ? "ArrowUp ArrowDown Escape" : undefined}
      title={[range, availabilityLabel].filter(Boolean).join(" · ")}
      onPointerDown={(event) => {
        if (
          canMove &&
          !event.target?.closest?.("[data-calendar-slot-control]")
        ) {
          onMoveBegin(event);
          event.stopPropagation();
          return;
        }
        if (canInteract) event.stopPropagation();
      }}
      onPointerMove={(event) => {
        if (selection.phase === "moving") onMoveMove?.(event);
      }}
      onPointerUp={(event) => {
        if (selection.phase === "moving") onMoveEnd?.(event);
      }}
      onPointerCancel={(event) => {
        if (selection.phase === "moving") onMoveCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        if (selection.phase === "moving") onMoveCancel?.(event);
      }}
      onClick={(event) => {
        if (canInteract) event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (!canMove || event.target !== event.currentTarget) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
          return;
        }
        const delta =
          event.key === "ArrowUp"
            ? -stepMinutes
            : event.key === "ArrowDown"
              ? stepMinutes
              : null;
        if (delta === null) return;
        event.preventDefault();
        event.stopPropagation();
        onMoveByStep?.(delta);
      }}
      className={`absolute inset-x-1 z-[24] rounded-[9px] border ${
        customerThemed
          ? bookingAllowed
            ? "border-[var(--tenant-accent-on-surface)] ring-1 ring-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_12%,var(--tenant-surface))] text-[var(--tenant-accent-on-surface)] shadow-[0_8px_20px_color-mix(in_srgb,var(--tenant-accent)_14%,transparent)]"
            : "border-[var(--tenant-border)] bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_7%,var(--tenant-background))] text-[var(--tenant-muted-text)] shadow-none"
          : "border-brand-primary/45 bg-skab-cobalt-100/92 text-primary-text shadow-[0_8px_20px_rgb(var(--skab-blue-rgb)/0.14)]"
      } ${
        canInteract ? "pointer-events-auto" : "pointer-events-none"
      } ${canMove ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
        selection.phase === "moving"
          ? customerThemed
            ? "ring-2 ring-[var(--tenant-accent-on-surface)]/20"
            : "ring-2 ring-brand-primary/20"
          : ""
      } ${
        resizingEdge
          ? customerThemed
            ? "ring-2 ring-[var(--tenant-accent-on-surface)]/20"
            : "ring-2 ring-brand-primary/20"
          : ""
      }`}
      style={{
        top: (selection.startMinute - calendarStartMinute) * pixelsPerMinute,
        height: selectionHeight,
      }}
    >
      <span
        aria-live="polite"
        className={
          compact
            ? "sr-only"
            : `pointer-events-none absolute left-2 right-10 truncate text-[10px] font-semibold tabular-nums ${
                startHandleInset ? "top-7" : "top-2"
              }`
        }
      >
        {range}
      </span>

      {!compact && availabilityLabel && (
        <span className="pointer-events-none absolute bottom-2 left-2 right-10 truncate text-[10px] font-medium opacity-80">
          {availabilityLabel}
        </span>
      )}

      {canResize && (
        <>
          <ResizeHandle
            edge="start"
            label={t("selection.adjustStart", { time: startTime })}
            active={resizingEdge === "start"}
            inset={startHandleInset}
            compactBoundary={compactBoundary}
            stepMinutes={stepMinutes}
            onResizeBegin={onResizeBegin}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
            onResizeCancel={onResizeCancel}
            onResizeByStep={onResizeByStep}
            onCancel={onCancel}
            hint={resizeHint}
            customerThemed={customerThemed}
          />

          <button
            ref={confirmRef}
            data-calendar-slot-control="true"
            data-calendar-slot-confirm="true"
            data-tenant-hover={customerThemed ? "preserve" : undefined}
            type="button"
            disabled={!canConfirm}
            aria-label={`${t("toolbar.newBooking")}: ${[
              range,
              availabilityLabel,
            ]
              .filter(Boolean)
              .join(", ")}`}
            title={t("toolbar.newBooking")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canConfirm) onConfirm();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
            className={`absolute right-1 inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 pointer-coarse:before:absolute ${
              customerThemed
                ? "bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] shadow-[0_5px_12px_color-mix(in_srgb,var(--tenant-accent)_25%,transparent)] focus-visible:ring-[var(--tenant-accent-on-surface)]/35"
                : "bg-brand-primary text-white shadow-[0_5px_12px_rgb(var(--skab-blue-rgb)/0.25)] focus-visible:ring-brand-primary/35"
            } ${
              // Fingers get a 44px target; the visible button stays compact.
              compact
                ? "top-1/2 h-6 w-6 -translate-y-1/2 rounded-[6px] pointer-coarse:before:-inset-2.5"
                : "top-1 h-7 w-7 rounded-[7px] pointer-coarse:before:-inset-2"
            } ${
              canConfirm
                ? customerThemed
                  ? "pointer-events-auto hover:brightness-[0.97]"
                  : "pointer-events-auto hover:bg-skab-cobalt-600"
                : "pointer-events-none opacity-45"
            }`}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          <ResizeHandle
            edge="end"
            label={t("selection.adjustEnd", { time: endTime })}
            active={resizingEdge === "end"}
            inset={endHandleInset}
            compactBoundary={compactBoundary}
            stepMinutes={stepMinutes}
            onResizeBegin={onResizeBegin}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
            onResizeCancel={onResizeCancel}
            onResizeByStep={onResizeByStep}
            onCancel={onCancel}
            hint={resizeHint}
            customerThemed={customerThemed}
          />
        </>
      )}
    </div>
  );
}
