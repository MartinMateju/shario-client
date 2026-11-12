"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";

import {
  ChevronRightIcon,
  HandRaisedIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import CalendarEventCard from "./CalendarEventCard";
import CalendarSlotSelection from "./CalendarSlotSelection";
import CustomerSlotSurfaces from "./CustomerSlotSurfaces";
import MobileAgendaCalendar from "./MobileAgendaCalendar";
import NowMarker from "./NowMarker";
import {
  getBookingPreviewAvailability,
  getBookingPreviewConfirmation,
} from "./calendar.bookingSelection";
import { capacityTone, isGlobalBlockingKind } from "./calendar.config";
import { getInitialScrollMinute } from "./calendar.interactions";
import { getCalendarAvailabilityLabel as getAvailabilityLabel } from "./calendar.presentation";
import {
  getCalendarActivityName,
  localizeCalendarResource,
} from "./calendar.resources";
import {
  bookingsForDay,
  capacityAt,
  cx,
  dateKey,
  eventPosition,
  formatRange,
  getCalendarDayState,
  getCalendarDisplayHours,
  getCalendarHours,
  getCalendarSlotAvailability,
  getCapacityTone,
  getCustomerCalendarDaySurface,
  getStudioOpeningWindow,
  getTimeSlots,
  layoutOverlaps,
  localDateKey,
  makeSlotDate,
  overlaps,
  slotFitsOpeningHours,
  wallTimeMinutes,
} from "./calendar.utils";
import {
  cancelTouchTap,
  isTouchTapPointer,
  moveTouchTap,
  releaseTouchTap,
  startTouchTap,
  takeTouchTap,
} from "./calendar.touchTap";
import useCalendarSlotSelection from "./useCalendarSlotSelection";
import useCalendarScrollSync from "./useCalendarScrollSync";

const ROW_HEIGHT = 52;
const PIXELS_PER_MINUTE = ROW_HEIGHT / 30;
const TIME_RAIL = 64;
const CAPACITY_RAIL = 66;

const CUSTOMER_AUDIENCES = new Set(["customer", "public"]);
const NOOP = () => {};
const DEFAULT_SELECTION_COPY = Object.freeze({
  summary: "Selected time",
  continue: "Continue",
  clear: "Clear selected time",
});
function getAvailabilityForRange({
  studio,
  bookings,
  day,
  startMinute,
  endMinute,
  activityId,
  laneEvents,
}) {
  const availability = getCalendarSlotAvailability({
    studio,
    bookings,
    day,
    startMinute,
    endMinute,
    activityId: activityId || "",
  });

  if (
    !availability.isBookable ||
    !laneEvents?.some(
      (event) => event?.isSuggested !== true && overlaps(event, availability),
    )
  ) {
    return availability;
  }

  return {
    ...availability,
    state: "full",
    isBookable: false,
    remaining: 0,
    remainingAfterBooking: 0,
  };
}

function getPointerSlotMinute(event, startMinute, endMinute, stepMinutes) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const relativeMinute = (event.clientY - bounds.top) / PIXELS_PER_MINUTE;
  const minute =
    startMinute + Math.floor(relativeMinute / stepMinutes) * stepMinutes;

  return Math.max(startMinute, Math.min(endMinute - stepMinutes, minute));
}

function getEventLane(event, laneCount, layout) {
  const explicit =
    event?.laneIndex === null ||
    event?.laneIndex === undefined ||
    event?.laneIndex === ""
      ? Number.NaN
      : Number(event.laneIndex);
  const layoutEventId = layout?.[event?.id]
    ? event.id
    : event?.grouped?.find((groupedEvent) => layout?.[groupedEvent?.id])?.id;
  const calculated = layout?.[layoutEventId]?.column ?? 0;

  return Number.isFinite(explicit) ? explicit : calculated % laneCount;
}

function getFixedLaneEvents({ studio, bookings, day, laneIndex }) {
  const laneCount = Math.max(1, Number(studio?.publicLaneCount) || 1);
  const events = bookingsForDay(bookings, day, studio).filter(
    (event) => event?.isSuggested !== true && !isGlobalBlockingKind(event.kind),
  );
  const layout = layoutOverlaps(events);

  return events.filter(
    (event) => getEventLane(event, laneCount, layout) === laneIndex,
  );
}

function buildCustomerSlotModels({
  slots,
  studio,
  availabilityBookings,
  day,
  activityId,
  laneEvents,
  locale,
  t,
}) {
  const stepMinutes = Math.max(1, Number(studio?.slotStepMinutes) || 30);
  const bookingMinutes = Math.max(
    stepMinutes,
    Number(studio?.minBookingMinutes) || 60,
  );

  return slots.slice(0, -1).map((slot) => {
    const endMinute = slot.minute + bookingMinutes;
    const availability = getAvailabilityForRange({
      studio,
      bookings: availabilityBookings,
      day,
      startMinute: slot.minute,
      endMinute,
      activityId,
      laneEvents,
    });
    // Check the displayed interval independently of
    // whether a full minimum-duration booking can start in this interval.
    const surfaceAvailability = getAvailabilityForRange({
      studio,
      bookings: availabilityBookings,
      day,
      startMinute: slot.minute,
      endMinute: slot.minute + stepMinutes,
      activityId,
      laneEvents,
    });
    const range = formatRange(
      availability.start || makeSlotDate(day, slot.minute, studio?.timeZone),
      availability.end || makeSlotDate(day, endMinute, studio?.timeZone),
      locale,
      studio?.timeZone,
    );
    const availabilityLabel =
      !availability.isBookable && surfaceAvailability.isBookable
        ? t("availability.insufficientTime", { minutes: bookingMinutes })
        : getAvailabilityLabel(availability, t, studio);

    return {
      slot,
      availability,
      surfaceAvailability,
      availabilityLabel,
      range,
    };
  });
}

function CapacityCell({ usage, top, height }) {
  const tone = getCapacityTone(usage);
  return (
    <div
      className="absolute inset-x-1 flex items-center justify-center rounded-[7px] border text-center text-[10px] font-medium leading-tight"
      style={{ top: top + 2, height: height - 4 }}
    >
      <span
        className={cx(
          "flex h-full w-full items-center justify-center rounded-[6px]",
          capacityTone[tone],
        )}
      >
        {usage.limit ? `${usage.used}/${usage.limit}` : "—"}
      </span>
    </div>
  );
}

const TimeGrid = memo(function TimeGrid({
  slots,
  start,
  boardHeight,
  customerThemed = false,
}) {
  return (
    <div
      data-calendar-time-rail="true"
      className={cx(
        // Above the selection preview (z-24), below the headers.
        "sticky left-0 z-[25] border-r",
        customerThemed
          ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
          : "border-line bg-[#F1F5F9]",
      )}
      style={{ position: "sticky", left: 0, height: boardHeight }}
    >
      {slots.slice(0, -1).map((slot) => (
        <span
          key={slot.minute}
          data-calendar-first-time-label={
            slot.minute === start * 60 ? "true" : undefined
          }
          className={cx(
            "absolute right-2 -translate-y-1/2 tabular-nums",
            slot.isHour ? "text-[12px] font-medium" : "text-[11px]",
            customerThemed
              ? slot.isHour
                ? "text-[var(--tenant-text)]"
                : "text-[var(--tenant-muted-text)]"
              : slot.isHour
                ? "text-[#1E293B]"
                : "text-[#475569]",
          )}
          style={{
            top:
              slot.minute === start * 60
                ? 8
                : (slot.minute - start * 60) * PIXELS_PER_MINUTE,
          }}
        >
          {slot.label}
        </span>
      ))}
    </div>
  );
});

const GridLines = memo(function GridLines({
  slots,
  start,
  customerThemed = false,
}) {
  return slots
    .slice(0, -1)
    .map((slot) => (
      <span
        key={slot.minute}
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-x-0 z-[2] border-t",
          customerThemed
            ? slot.isHour
              ? "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)]"
              : "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_7%,transparent)]"
            : slot.isHour
              ? "border-[#94A3B8]"
              : "border-[#CBD5E1]",
        )}
        style={{ top: (slot.minute - start * 60) * PIXELS_PER_MINUTE }}
      />
    ));
});

function ClosedDayLabel({
  studio,
  date,
  t,
  left = TIME_RAIL,
  customerThemed = false,
}) {
  const openingWindow = getStudioOpeningWindow(studio, date);

  if (!openingWindow.isOpen) {
    return (
      <div
        className={cx(
          "pointer-events-none absolute bottom-0 right-0 top-0 z-[5] flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em]",
          customerThemed ? "text-[var(--tenant-muted-text)]" : "text-[#475569]",
        )}
        style={{ left }}
      >
        {t("events.closed")}
      </div>
    );
  }

  return null;
}

function ResourceGridHeader({
  resources,
  customerThemed,
  responsiveGridStyle,
  t,
}) {
  return (
    <div
      data-calendar-grid-header="true"
      className={cx(
        "calendar-day-responsive-grid z-30 grid border-b backdrop-blur",
        customerThemed
          ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)]"
          : "border-[#CBD5E1] bg-white/95",
      )}
      style={responsiveGridStyle}
    >
      <div
        className={cx(
          "sticky left-0 z-20 border-r",
          customerThemed
            ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)]"
            : "border-[#CBD5E1]",
        )}
        style={{ position: "sticky", left: 0 }}
      />
      {resources.map((resource) => (
        <div key={resource.id} className="contents">
          <div
            className={cx(
              "flex h-12 min-w-0 items-center justify-center gap-2 border-r px-2 text-[11px] font-medium",
              customerThemed
                ? "border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)]"
                : "border-[#CBD5E1] text-[#252524]",
            )}
          >
            <span className="min-w-0 truncate" title={resource.name}>
              {resource.name}
            </span>
            <span
              className={cx(
                "shrink-0 text-[10px] font-normal",
                customerThemed
                  ? "text-[var(--tenant-muted-on-surface)]"
                  : "text-[#475569]",
              )}
            >
              {t("day.places", { count: resource.capacity })}
            </span>
          </div>
          {!customerThemed && (
            <div
              className={cx(
                "hidden items-center justify-center border-r text-[10px] uppercase tracking-[0.08em] lg:flex",
                customerThemed
                  ? "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-muted-text)]"
                  : "border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]",
              )}
            >
              {t("day.capacity")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FixedLaneGridHeader({
  lanes,
  customerThemed,
  responsiveGridStyle,
  t,
}) {
  return (
    <div
      data-calendar-grid-header="true"
      className={cx(
        "calendar-day-responsive-grid z-30 grid border-b backdrop-blur",
        customerThemed
          ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)]"
          : "border-[#CBD5E1] bg-white/95",
      )}
      style={responsiveGridStyle}
    >
      <div
        className={cx(
          "sticky left-0 z-20 border-r",
          customerThemed
            ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)]"
            : "border-[#CBD5E1]",
        )}
        style={{ position: "sticky", left: 0 }}
      />
      {lanes.map((lane) => (
        <div
          key={lane}
          className={cx(
            "flex h-12 items-center justify-center border-r text-[11px] font-medium last:border-r-0",
            customerThemed
              ? "border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)]"
              : "border-[#CBD5E1] text-[#252524]",
          )}
        >
          {t("day.publicLane", { number: lane + 1 })}
        </div>
      ))}
    </div>
  );
}

function ResourceDay({
  date,
  bookings,
  availabilityBookings,
  studio,
  locale,
  audience,
  onBookingClick,
  onSlotSelect,
  slotSelection,
  getSelectionAvailability,
  confirmSelection,
  cancelSelection,
  selectionOriginRef,
  focusMobileContinueRef,
  touchTapRef,
  headerScrollRef,
  onBodyScroll,
  onHeaderScroll,
  onScrollInputCapture,
  onScrollKeyDownCapture,
  stickyHeaderTop,
  scrollRef,
  pageScroll,
  t,
}) {
  const slots = useMemo(() => getTimeSlots(studio), [studio]);
  const { start, end } = getCalendarHours(studio);
  const slotStepMinutes = Math.max(1, Number(studio?.slotStepMinutes) || 30);
  const selectionMinutes = Math.max(
    slotStepMinutes,
    Number(studio?.minBookingMinutes) || 60,
  );
  const boardHeight = (end - start) * 60 * PIXELS_PER_MINUTE;
  const resources = useMemo(() => studio?.resources || [], [studio]);
  const dayBookings = useMemo(
    () => bookingsForDay(bookings, date, studio),
    [bookings, date, studio],
  );
  const globalEvents = useMemo(
    () => dayBookings.filter((event) => isGlobalBlockingKind(event.kind)),
    [dayBookings],
  );
  const unassignedOwnBookings = useMemo(
    () =>
      dayBookings
        .filter(
          (event) =>
            event.isMine &&
            !isGlobalBlockingKind(event.kind) &&
            !resources.some((resource) => resource.id === event.activityId),
        )
        .sort(
          (first, second) => new Date(first.start) - new Date(second.start),
        ),
    [dayBookings, resources],
  );
  const openingWindow = getStudioOpeningWindow(studio, date);
  const customerThemed = ["customer", "public"].includes(audience);
  const dayState = getCalendarDayState(date, new Date(), studio?.timeZone);
  const customerDaySurface = getCustomerCalendarDaySurface(dayState);
  const resourceModels = useMemo(
    () =>
      resources.map((resource) => {
        const events = dayBookings.filter(
          (event) =>
            event.activityId === resource.id &&
            !isGlobalBlockingKind(event.kind),
        );
        const slotModels = customerThemed
          ? buildCustomerSlotModels({
              slots,
              studio,
              availabilityBookings,
              day: date,
              activityId: resource.id,
              locale,
              t,
            })
          : [];

        return {
          resource,
          events,
          overlapLayout: layoutOverlaps(events),
          slotModels,
          capacitySlots: slots.slice(0, -1).map((slot) => ({
            slot,
            usage: capacityAt(
              availabilityBookings,
              studio,
              resource.id,
              makeSlotDate(date, slot.minute, studio?.timeZone),
              makeSlotDate(
                date,
                slot.minute + slotStepMinutes,
                studio?.timeZone,
              ),
            ),
          })),
          firstBookableSlot: slotModels.find(
            ({ availability }) => availability.isBookable,
          )?.slot,
        };
      }),
    [
      availabilityBookings,
      customerThemed,
      date,
      dayBookings,
      locale,
      resources,
      slotStepMinutes,
      slots,
      studio,
      t,
    ],
  );

  const desktopGridTemplate = `${TIME_RAIL}px ${resources
    .map(() =>
      customerThemed
        ? "minmax(280px, 1fr)"
        : `minmax(280px, 1fr) ${CAPACITY_RAIL}px`,
    )
    .join(" ")}`;
  const mobileGridTemplate = `${TIME_RAIL}px ${resources
    .map(() => "minmax(180px, 1fr)")
    .join(" ")}`;
  const responsiveGridStyle = customerThemed
    ? {
        "--calendar-day-mobile-columns": mobileGridTemplate,
        "--calendar-day-desktop-columns": desktopGridTemplate,
        gridTemplateColumns: `var(--calendar-day-columns, ${desktopGridTemplate})`,
      }
    : { gridTemplateColumns: desktopGridTemplate };
  const detachedHeader = customerThemed && pageScroll;
  const customerCanvasStyle = {
    "--calendar-day-mobile-min-width": `max(100%, ${TIME_RAIL + resources.length * 180}px)`,
    "--calendar-day-surface": customerDaySurface,
  };

  return (
    <>
      <div
        className={cx(
          "flex flex-wrap items-center gap-2 border-b px-4 py-3",
          customerThemed
            ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
            : "border-[#CBD5E1] bg-[#F1F5F9]",
        )}
      >
        <div
          className={cx(
            "inline-flex min-w-0 max-w-full items-center gap-2 rounded-[9px] border px-3 py-2 text-[10px]",
            customerThemed
              ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)]"
              : "border-skab-cobalt-200 bg-skab-cobalt-50 text-skab-cobalt-700",
          )}
        >
          <InformationCircleIcon
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{t("day.overlapInfo")}</span>
        </div>
        {resources.map((resource) => (
          <span
            key={resource.id}
            className={cx(
              "inline-flex min-w-0 max-w-full items-center gap-2 rounded-[9px] border px-3 py-2 text-[10px]",
              customerThemed
                ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)]"
                : "border-[#CBD5E1] bg-white text-[#475569]",
            )}
          >
            <HandRaisedIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              {resource.name} · {t("day.max", { count: resource.capacity })}
            </span>
          </span>
        ))}
      </div>

      {unassignedOwnBookings.length > 0 && (
        <section
          data-calendar-unassigned-bookings="true"
          aria-label={t("events.myBooking")}
          className={cx(
            "shrink-0 border-b px-4 py-3",
            customerThemed
              ? "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]"
              : "border-[#CBD5E1] bg-[#F1F5F9] text-[#252524]",
          )}
        >
          <h3 className="mb-2 text-xs font-semibold">
            {t("events.myBooking")}
          </h3>
          <ul className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unassignedOwnBookings.map((event) => (
              <li key={event.id} className="min-w-0">
                <CalendarEventCard
                  event={event}
                  studio={studio}
                  locale={locale}
                  audience={audience}
                  t={t}
                  compact
                  className="w-full"
                  onClick={onBookingClick}
                  fullLabel={t("events.availability", { remaining: 0 })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {detachedHeader && (
        <div
          ref={headerScrollRef}
          data-calendar-day-header-scroll="true"
          onScroll={onHeaderScroll}
          onPointerDownCapture={onScrollInputCapture}
          onFocusCapture={onScrollInputCapture}
          onWheelCapture={onScrollInputCapture}
          onKeyDownCapture={onScrollKeyDownCapture}
          className="calendar-day-header-scroll sticky z-40 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-[var(--calendar-day-surface)] touch-auto"
          style={{ ...customerCanvasStyle, top: stickyHeaderTop }}
        >
          <div
            data-calendar-day-header-canvas="true"
            className="w-full [min-width:var(--calendar-day-mobile-min-width)]"
          >
            <ResourceGridHeader
              resources={resources}
              customerThemed={customerThemed}
              responsiveGridStyle={responsiveGridStyle}
              t={t}
            />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        data-calendar-day-scroll="true"
        data-calendar-day-state={dayState}
        onScroll={onBodyScroll}
        onPointerDownCapture={onScrollInputCapture}
        onFocusCapture={onScrollInputCapture}
        onWheelCapture={onScrollInputCapture}
        onKeyDownCapture={onScrollKeyDownCapture}
        className={`min-h-0 ${
          pageScroll
            ? "overflow-x-auto overscroll-x-contain overscroll-y-auto overflow-y-clip touch-auto"
            : "flex-1 overflow-auto overscroll-contain"
        }`}
        style={customerThemed ? customerCanvasStyle : undefined}
      >
        <div
          data-calendar-day-canvas={customerThemed ? "true" : undefined}
          className={cx(
            customerThemed
              ? "w-full [min-width:var(--calendar-day-mobile-min-width)]"
              : "min-w-[850px]",
          )}
          style={customerThemed ? customerCanvasStyle : undefined}
        >
          {!detachedHeader && (
            <div className={pageScroll ? "relative z-30" : "sticky top-0 z-30"}>
              <ResourceGridHeader
                resources={resources}
                customerThemed={customerThemed}
                responsiveGridStyle={responsiveGridStyle}
                t={t}
              />
            </div>
          )}

          <div
            className={cx(
              "relative grid",
              customerThemed && "calendar-day-responsive-grid",
            )}
            style={responsiveGridStyle}
          >
            <TimeGrid
              slots={slots}
              start={start}
              boardHeight={boardHeight}
              customerThemed={customerThemed}
            />

            {resourceModels.map(
              ({
                resource,
                events,
                overlapLayout,
                slotModels,
                capacitySlots,
                firstBookableSlot,
              }) => {
                const selectionKey = `resource:${resource.id}`;
                const draft =
                  slotSelection.selection?.selectionKey === selectionKey
                    ? slotSelection.selection
                    : null;
                const draftAvailability =
                  customerThemed && draft
                    ? getSelectionAvailability(draft)
                    : null;
                const canSelect =
                  Boolean(onSlotSelect) &&
                  openingWindow.isOpen &&
                  (!customerThemed || Boolean(firstBookableSlot));
                const selectionConfig = {
                  day: date,
                  openingWindow,
                  selectionKey,
                  metadata: { activityId: resource.id },
                };
                return (
                  <div key={resource.id} className="contents">
                    <div
                      data-calendar-day-column="true"
                      data-calendar-start-minute={start * 60}
                      data-calendar-pixels-per-minute={PIXELS_PER_MINUTE}
                      role="group"
                      tabIndex={canSelect ? 0 : -1}
                      aria-label={resource.name}
                      aria-disabled={!canSelect ? "true" : undefined}
                      className={cx(
                        "relative touch-manipulation select-none border-r outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-inset",
                        customerThemed
                          ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)] focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
                          : "border-[#CBD5E1] bg-white focus-visible:ring-brand-primary/25",
                        canSelect && "cursor-crosshair",
                      )}
                      style={{ height: boardHeight }}
                      onPointerDown={(event) => {
                        touchTapRef.current = null;
                        if (
                          !canSelect ||
                          event.target?.closest?.(
                            "[data-calendar-event-card], [data-calendar-slot-control]",
                          )
                        ) {
                          return;
                        }
                        // A customer's click starts on the slot whose
                        // availability was just checked, as a tap does.
                        let pressedSlotMinute;
                        if (customerThemed) {
                          const pointerMinute = getPointerSlotMinute(
                            event,
                            start * 60,
                            end * 60,
                            slotStepMinutes,
                          );
                          const availability = getAvailabilityForRange({
                            studio,
                            bookings: availabilityBookings,
                            day: date,
                            startMinute: pointerMinute,
                            endMinute: pointerMinute + selectionMinutes,
                            activityId: resource.id,
                          });
                          if (!availability.isBookable) return;
                          pressedSlotMinute = pointerMinute;
                        }
                        if (isTouchTapPointer(event)) {
                          focusMobileContinueRef.current = false;
                          startTouchTap(touchTapRef, event);
                          return;
                        }
                        selectionOriginRef.current = event.currentTarget;
                        slotSelection.beginSelection(event, {
                          ...selectionConfig,
                          anchorMinute: pressedSlotMinute,
                        });
                      }}
                      onPointerMove={(event) => {
                        if (moveTouchTap(touchTapRef, event)) return;
                        slotSelection.updateSelection(event);
                      }}
                      onPointerUp={(event) => {
                        // A finger tap selects on the click that follows.
                        if (releaseTouchTap(touchTapRef, event)) return;
                        slotSelection.finishSelection(event);
                      }}
                      onPointerCancel={(event) => {
                        if (cancelTouchTap(touchTapRef, event)) return;
                        slotSelection.cancelSelection(event);
                      }}
                      onClick={(event) => {
                        const touchTap = takeTouchTap(touchTapRef, event);
                        if (
                          !touchTap ||
                          !canSelect ||
                          event.target?.closest?.(
                            "[data-calendar-event-card], [data-calendar-slot-control]",
                          )
                        ) {
                          return;
                        }

                        const pointerMinute = getPointerSlotMinute(
                          {
                            currentTarget: event.currentTarget,
                            clientY: touchTap.clientY,
                          },
                          start * 60,
                          end * 60,
                          slotStepMinutes,
                        );
                        const availability = getAvailabilityForRange({
                          studio,
                          bookings: availabilityBookings,
                          day: date,
                          startMinute: pointerMinute,
                          endMinute: pointerMinute + selectionMinutes,
                          activityId: resource.id,
                        });
                        if (customerThemed && !availability.isBookable) return;

                        selectionOriginRef.current = touchTap.element;
                        slotSelection.selectRange({
                          ...selectionConfig,
                          anchorMinute: pointerMinute,
                        });
                      }}
                      onLostPointerCapture={slotSelection.cancelSelection}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;

                        if (event.key === "Escape" && draft) {
                          event.preventDefault();
                          cancelSelection();
                          return;
                        }
                        if (!canSelect || !["Enter", " "].includes(event.key)) {
                          return;
                        }
                        event.preventDefault();
                        selectionOriginRef.current = event.currentTarget;
                        focusMobileContinueRef.current = customerThemed;
                        slotSelection.selectRange(
                          customerThemed && firstBookableSlot
                            ? {
                                ...selectionConfig,
                                openingWindow: {
                                  ...openingWindow,
                                  openMinutes: firstBookableSlot.minute,
                                },
                              }
                            : selectionConfig,
                        );
                      }}
                    >
                      {customerThemed && (
                        <CustomerSlotSurfaces
                          slotModels={slotModels}
                          calendarStartMinute={start * 60}
                          stepMinutes={slotStepMinutes}
                          pixelsPerMinute={PIXELS_PER_MINUTE}
                          t={t}
                          onSelect={
                            canSelect
                              ? (slot, trigger) => {
                                  selectionOriginRef.current = trigger;
                                  focusMobileContinueRef.current = true;
                                  slotSelection.selectRange({
                                    ...selectionConfig,
                                    anchorMinute: slot.minute,
                                  });
                                }
                              : undefined
                          }
                        />
                      )}
                      <GridLines
                        slots={slots}
                        start={start}
                        customerThemed={customerThemed}
                      />
                      {draft && (
                        <CalendarSlotSelection
                          selection={draft}
                          calendarStartMinute={start * 60}
                          calendarEndMinute={end * 60}
                          pixelsPerMinute={PIXELS_PER_MINUTE}
                          studio={studio}
                          locale={locale}
                          onConfirm={confirmSelection}
                          onCancel={cancelSelection}
                          onResizeBegin={slotSelection.beginResize}
                          onResizeMove={slotSelection.updateResize}
                          onResizeEnd={slotSelection.finishResize}
                          onResizeCancel={slotSelection.cancelResize}
                          onResizeByStep={slotSelection.resizeByStep}
                          onMoveBegin={slotSelection.beginMove}
                          onMoveMove={slotSelection.updateMove}
                          onMoveEnd={slotSelection.finishMove}
                          onMoveCancel={slotSelection.cancelMove}
                          onMoveByStep={slotSelection.moveByStep}
                          audience={audience}
                          availability={draftAvailability}
                          t={t}
                          mobileDeferred={customerThemed}
                        />
                      )}
                      {events.map((event) => {
                        const position = eventPosition(
                          event,
                          studio,
                          PIXELS_PER_MINUTE,
                        );
                        const layout = overlapLayout[event.id] || {
                          left: 0,
                          width: 100,
                        };
                        return (
                          <CalendarEventCard
                            t={t}
                            key={event.id}
                            event={event}
                            studio={studio}
                            locale={locale}
                            audience={audience}
                            compact={position.height < 60}
                            onClick={onBookingClick}
                            fullLabel={t("events.availability", {
                              remaining: 0,
                            })}
                            formatAvailability={(remaining) =>
                              t("events.availability", { remaining })
                            }
                            style={{
                              position: "absolute",
                              zIndex: 10,
                              top: position.top + 3,
                              height: Math.max(32, position.height - 6),
                              left: `calc(${layout.left}% + 4px)`,
                              width: `calc(${layout.width}% - 7px)`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {!customerThemed && (
                      <div
                        data-calendar-capacity-rail="true"
                        className={cx(
                          "relative hidden border-r lg:block",
                          customerThemed
                            ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
                            : "border-[#CBD5E1] bg-[#F1F5F9]",
                        )}
                        style={{ height: boardHeight }}
                      >
                        {capacitySlots.map(({ slot, usage }) => (
                          <CapacityCell
                            key={slot.minute}
                            usage={usage}
                            top={(slot.minute - start * 60) * PIXELS_PER_MINUTE}
                            height={slotStepMinutes * PIXELS_PER_MINUTE}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            )}

            {globalEvents.map((event) => {
              const position = eventPosition(event, studio, PIXELS_PER_MINUTE);
              return (
                <CalendarEventCard
                  t={t}
                  key={event.id}
                  event={event}
                  studio={studio}
                  locale={locale}
                  audience={audience}
                  compact={position.height < 60}
                  onClick={onBookingClick}
                  fullLabel={t("events.availability", { remaining: 0 })}
                  formatAvailability={(remaining) =>
                    t("events.availability", { remaining })
                  }
                  style={{
                    position: "absolute",
                    zIndex: 22,
                    top: position.top + 3,
                    height: Math.max(32, position.height - 6),
                    left: TIME_RAIL + 4,
                    right: 4,
                  }}
                />
              );
            })}

            <ClosedDayLabel
              studio={studio}
              date={date}
              t={t}
              customerThemed={customerThemed}
            />

            <NowMarker
              day={date}
              studio={studio}
              pixelsPerMinute={PIXELS_PER_MINUTE}
              left={TIME_RAIL}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function FixedLaneDay({
  date,
  bookings,
  availabilityBookings,
  studio,
  locale,
  audience,
  onBookingClick,
  onSlotSelect,
  selectedActivityId,
  slotSelection,
  getSelectionAvailability,
  confirmSelection,
  cancelSelection,
  selectionOriginRef,
  focusMobileContinueRef,
  touchTapRef,
  headerScrollRef,
  onBodyScroll,
  onHeaderScroll,
  onScrollInputCapture,
  onScrollKeyDownCapture,
  stickyHeaderTop,
  scrollRef,
  pageScroll,
  t,
}) {
  const slots = useMemo(() => getTimeSlots(studio), [studio]);
  const { start, end } = getCalendarHours(studio);
  const slotStepMinutes = Math.max(1, Number(studio?.slotStepMinutes) || 30);
  const selectionMinutes = Math.max(
    slotStepMinutes,
    Number(studio?.minBookingMinutes) || 60,
  );
  const boardHeight = (end - start) * 60 * PIXELS_PER_MINUTE;
  const laneCount = studio.publicLaneCount || 2;
  const lanes = useMemo(
    () => Array.from({ length: laneCount }, (_, index) => index),
    [laneCount],
  );
  const dayBookings = useMemo(
    () => bookingsForDay(bookings, date, studio),
    [bookings, date, studio],
  );
  const publicEvents = useMemo(
    () => dayBookings.filter((event) => !isGlobalBlockingKind(event.kind)),
    [dayBookings],
  );
  const availabilityPublicEvents = useMemo(
    () =>
      bookingsForDay(availabilityBookings, date, studio).filter(
        (event) =>
          event?.isSuggested !== true && !isGlobalBlockingKind(event.kind),
      ),
    [availabilityBookings, date, studio],
  );
  const globalEvents = useMemo(
    () => dayBookings.filter((event) => isGlobalBlockingKind(event.kind)),
    [dayBookings],
  );
  const openingWindow = getStudioOpeningWindow(studio, date);
  const customerThemed = ["customer", "public"].includes(audience);
  const dayState = getCalendarDayState(date, new Date(), studio?.timeZone);
  const customerDaySurface = getCustomerCalendarDaySurface(dayState);
  const assigned = useMemo(() => layoutOverlaps(publicEvents), [publicEvents]);
  const availabilityAssigned = useMemo(
    () => layoutOverlaps(availabilityPublicEvents),
    [availabilityPublicEvents],
  );
  const laneModels = useMemo(
    () =>
      lanes.map((lane) => {
        const laneEvents = publicEvents.filter(
          (event) =>
            getEventLane(
              event,
              laneCount,
              availabilityAssigned[event.id] ? availabilityAssigned : assigned,
            ) === lane,
        );
        const laneAvailabilityEvents = availabilityPublicEvents.filter(
          (event) =>
            getEventLane(event, laneCount, availabilityAssigned) === lane,
        );
        const slotModels = customerThemed
          ? buildCustomerSlotModels({
              slots,
              studio,
              availabilityBookings,
              day: date,
              activityId: selectedActivityId,
              laneEvents: laneAvailabilityEvents,
              locale,
              t,
            })
          : [];

        return {
          lane,
          laneEvents,
          laneAvailabilityEvents,
          slotModels,
          firstBookableSlot: slotModels.find(
            ({ availability }) => availability.isBookable,
          )?.slot,
        };
      }),
    [
      assigned,
      availabilityAssigned,
      availabilityBookings,
      availabilityPublicEvents,
      customerThemed,
      date,
      laneCount,
      lanes,
      locale,
      publicEvents,
      selectedActivityId,
      slots,
      studio,
      t,
    ],
  );
  const desktopGridTemplate = `${TIME_RAIL}px repeat(${laneCount}, minmax(260px, 1fr))`;
  const mobileGridTemplate = `${TIME_RAIL}px repeat(${laneCount}, minmax(156px, 1fr))`;
  const responsiveGridStyle = customerThemed
    ? {
        "--calendar-day-mobile-columns": mobileGridTemplate,
        "--calendar-day-desktop-columns": desktopGridTemplate,
        gridTemplateColumns: `var(--calendar-day-columns, ${desktopGridTemplate})`,
      }
    : { gridTemplateColumns: desktopGridTemplate };
  const detachedHeader = customerThemed && pageScroll;
  const customerCanvasStyle = {
    "--calendar-day-mobile-min-width": `max(100%, ${TIME_RAIL + laneCount * 156}px)`,
    "--calendar-day-surface": customerDaySurface,
  };

  return (
    <>
      {detachedHeader && (
        <div
          ref={headerScrollRef}
          data-calendar-day-header-scroll="true"
          onScroll={onHeaderScroll}
          onPointerDownCapture={onScrollInputCapture}
          onFocusCapture={onScrollInputCapture}
          onWheelCapture={onScrollInputCapture}
          onKeyDownCapture={onScrollKeyDownCapture}
          className="calendar-day-header-scroll sticky z-40 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-[var(--calendar-day-surface)] touch-auto"
          style={{ ...customerCanvasStyle, top: stickyHeaderTop }}
        >
          <div
            data-calendar-day-header-canvas="true"
            className="w-full [min-width:var(--calendar-day-mobile-min-width)]"
          >
            <FixedLaneGridHeader
              lanes={lanes}
              customerThemed={customerThemed}
              responsiveGridStyle={responsiveGridStyle}
              t={t}
            />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        data-calendar-day-scroll="true"
        data-calendar-day-state={dayState}
        onScroll={onBodyScroll}
        onPointerDownCapture={onScrollInputCapture}
        onFocusCapture={onScrollInputCapture}
        onWheelCapture={onScrollInputCapture}
        onKeyDownCapture={onScrollKeyDownCapture}
        className={`min-h-0 ${
          pageScroll
            ? "overflow-x-auto overscroll-x-contain overscroll-y-auto overflow-y-clip touch-auto"
            : "flex-1 overflow-auto overscroll-contain"
        }`}
        style={customerThemed ? customerCanvasStyle : undefined}
      >
        <div
          data-calendar-day-canvas={customerThemed ? "true" : undefined}
          className={cx(
            customerThemed
              ? "w-full [min-width:var(--calendar-day-mobile-min-width)]"
              : "min-w-[760px]",
          )}
          style={customerThemed ? customerCanvasStyle : undefined}
        >
          {!detachedHeader && (
            <div className={pageScroll ? "relative z-30" : "sticky top-0 z-30"}>
              <FixedLaneGridHeader
                lanes={lanes}
                customerThemed={customerThemed}
                responsiveGridStyle={responsiveGridStyle}
                t={t}
              />
            </div>
          )}

          <div
            className={cx(
              "relative grid",
              customerThemed && "calendar-day-responsive-grid",
            )}
            style={responsiveGridStyle}
          >
            <TimeGrid
              slots={slots}
              start={start}
              boardHeight={boardHeight}
              customerThemed={customerThemed}
            />
            {laneModels.map(
              ({
                lane,
                laneEvents,
                laneAvailabilityEvents,
                slotModels,
                firstBookableSlot,
              }) => {
                const selectionKey = `lane:${lane}`;
                const draft =
                  slotSelection.selection?.selectionKey === selectionKey
                    ? slotSelection.selection
                    : null;
                const draftAvailability =
                  customerThemed && draft
                    ? getSelectionAvailability(draft)
                    : null;
                const canSelect =
                  Boolean(onSlotSelect) &&
                  openingWindow.isOpen &&
                  (!customerThemed || Boolean(firstBookableSlot));
                const selectionConfig = {
                  day: date,
                  openingWindow,
                  selectionKey,
                  metadata: {
                    activityId: selectedActivityId || undefined,
                    laneIndex: lane,
                  },
                };

                return (
                  <div
                    key={lane}
                    data-calendar-day-column="true"
                    data-calendar-start-minute={start * 60}
                    data-calendar-pixels-per-minute={PIXELS_PER_MINUTE}
                    role="group"
                    tabIndex={canSelect ? 0 : -1}
                    aria-label={t("day.publicLane", { number: lane + 1 })}
                    aria-disabled={!canSelect ? "true" : undefined}
                    className={cx(
                      "relative touch-manipulation select-none border-r outline-none [-webkit-tap-highlight-color:transparent] last:border-r-0 focus-visible:ring-2 focus-visible:ring-inset",
                      customerThemed
                        ? "border-[var(--tenant-border)] bg-[var(--calendar-day-surface)] focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
                        : "border-[#CBD5E1] bg-white focus-visible:ring-brand-primary/25",
                      canSelect && "cursor-crosshair",
                    )}
                    style={{ height: boardHeight }}
                    onPointerDown={(event) => {
                      touchTapRef.current = null;
                      if (
                        !canSelect ||
                        event.target?.closest?.(
                          "[data-calendar-event-card], [data-calendar-slot-control]",
                        )
                      ) {
                        return;
                      }
                      // A customer's click starts on the slot whose
                      // availability was just checked, as a tap does.
                      let pressedSlotMinute;
                      if (customerThemed) {
                        const pointerMinute = getPointerSlotMinute(
                          event,
                          start * 60,
                          end * 60,
                          slotStepMinutes,
                        );
                        const availability = getAvailabilityForRange({
                          studio,
                          bookings: availabilityBookings,
                          day: date,
                          startMinute: pointerMinute,
                          endMinute: pointerMinute + selectionMinutes,
                          activityId: selectedActivityId,
                          laneEvents: laneAvailabilityEvents,
                        });
                        if (!availability.isBookable) return;
                        pressedSlotMinute = pointerMinute;
                      }
                      if (isTouchTapPointer(event)) {
                        focusMobileContinueRef.current = false;
                        startTouchTap(touchTapRef, event);
                        return;
                      }
                      selectionOriginRef.current = event.currentTarget;
                      slotSelection.beginSelection(event, {
                        ...selectionConfig,
                        anchorMinute: pressedSlotMinute,
                      });
                    }}
                    onPointerMove={(event) => {
                      if (moveTouchTap(touchTapRef, event)) return;
                      slotSelection.updateSelection(event);
                    }}
                    onPointerUp={(event) => {
                      // A finger tap selects on the click that follows.
                      if (releaseTouchTap(touchTapRef, event)) return;
                      slotSelection.finishSelection(event);
                    }}
                    onPointerCancel={(event) => {
                      if (cancelTouchTap(touchTapRef, event)) return;
                      slotSelection.cancelSelection(event);
                    }}
                    onClick={(event) => {
                      const touchTap = takeTouchTap(touchTapRef, event);
                      if (
                        !touchTap ||
                        !canSelect ||
                        event.target?.closest?.(
                          "[data-calendar-event-card], [data-calendar-slot-control]",
                        )
                      ) {
                        return;
                      }

                      const pointerMinute = getPointerSlotMinute(
                        {
                          currentTarget: event.currentTarget,
                          clientY: touchTap.clientY,
                        },
                        start * 60,
                        end * 60,
                        slotStepMinutes,
                      );
                      const availability = getAvailabilityForRange({
                        studio,
                        bookings: availabilityBookings,
                        day: date,
                        startMinute: pointerMinute,
                        endMinute: pointerMinute + selectionMinutes,
                        activityId: selectedActivityId,
                        laneEvents: laneAvailabilityEvents,
                      });
                      if (customerThemed && !availability.isBookable) return;

                      selectionOriginRef.current = touchTap.element;
                      slotSelection.selectRange({
                        ...selectionConfig,
                        anchorMinute: pointerMinute,
                      });
                    }}
                    onLostPointerCapture={slotSelection.cancelSelection}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;

                      if (event.key === "Escape" && draft) {
                        event.preventDefault();
                        cancelSelection();
                        return;
                      }
                      if (!canSelect || !["Enter", " "].includes(event.key)) {
                        return;
                      }
                      event.preventDefault();
                      selectionOriginRef.current = event.currentTarget;
                      focusMobileContinueRef.current = customerThemed;
                      slotSelection.selectRange(
                        customerThemed && firstBookableSlot
                          ? {
                              ...selectionConfig,
                              openingWindow: {
                                ...openingWindow,
                                openMinutes: firstBookableSlot.minute,
                              },
                            }
                          : selectionConfig,
                      );
                    }}
                  >
                    {customerThemed && (
                      <CustomerSlotSurfaces
                        slotModels={slotModels}
                        calendarStartMinute={start * 60}
                        stepMinutes={slotStepMinutes}
                        pixelsPerMinute={PIXELS_PER_MINUTE}
                        t={t}
                        onSelect={
                          canSelect
                            ? (slot, trigger) => {
                                selectionOriginRef.current = trigger;
                                focusMobileContinueRef.current = true;
                                slotSelection.selectRange({
                                  ...selectionConfig,
                                  anchorMinute: slot.minute,
                                });
                              }
                            : undefined
                        }
                      />
                    )}
                    <GridLines
                      slots={slots}
                      start={start}
                      customerThemed={customerThemed}
                    />
                    {draft && (
                      <CalendarSlotSelection
                        selection={draft}
                        calendarStartMinute={start * 60}
                        calendarEndMinute={end * 60}
                        pixelsPerMinute={PIXELS_PER_MINUTE}
                        studio={studio}
                        locale={locale}
                        onConfirm={confirmSelection}
                        onCancel={cancelSelection}
                        onResizeBegin={slotSelection.beginResize}
                        onResizeMove={slotSelection.updateResize}
                        onResizeEnd={slotSelection.finishResize}
                        onResizeCancel={slotSelection.cancelResize}
                        onResizeByStep={slotSelection.resizeByStep}
                        onMoveBegin={slotSelection.beginMove}
                        onMoveMove={slotSelection.updateMove}
                        onMoveEnd={slotSelection.finishMove}
                        onMoveCancel={slotSelection.cancelMove}
                        onMoveByStep={slotSelection.moveByStep}
                        audience={audience}
                        availability={draftAvailability}
                        t={t}
                        mobileDeferred={customerThemed}
                      />
                    )}
                    {laneEvents.map((event) => {
                      const position = eventPosition(
                        event,
                        studio,
                        PIXELS_PER_MINUTE,
                      );
                      return (
                        <CalendarEventCard
                          t={t}
                          key={event.id}
                          event={event}
                          studio={studio}
                          locale={locale}
                          audience={audience}
                          compact={position.height < 60}
                          onClick={onBookingClick}
                          fullLabel={t("events.availability", { remaining: 0 })}
                          formatAvailability={(remaining) =>
                            t("events.availability", { remaining })
                          }
                          style={{
                            position: "absolute",
                            zIndex: 10,
                            top: position.top + 3,
                            height: Math.max(32, position.height - 6),
                            left: 5,
                            right: 5,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              },
            )}

            {globalEvents.map((event) => {
              const position = eventPosition(event, studio, PIXELS_PER_MINUTE);
              return (
                <CalendarEventCard
                  t={t}
                  key={event.id}
                  event={event}
                  studio={studio}
                  locale={locale}
                  audience={audience}
                  compact={position.height < 60}
                  onClick={onBookingClick}
                  fullLabel={t("events.availability", { remaining: 0 })}
                  formatAvailability={(remaining) =>
                    t("events.availability", { remaining })
                  }
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    top: position.top + 3,
                    height: Math.max(30, position.height - 6),
                    left: TIME_RAIL + 5,
                    right: 5,
                  }}
                />
              );
            })}

            <ClosedDayLabel
              studio={studio}
              date={date}
              t={t}
              customerThemed={customerThemed}
            />

            <NowMarker
              day={date}
              studio={studio}
              pixelsPerMinute={PIXELS_PER_MINUTE}
              left={TIME_RAIL}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function DayCalendar(props) {
  const scrollRef = useRef(null);
  const headerScrollRef = useRef(null);
  const autoScrollKeyRef = useRef("");
  const selectionOriginRef = useRef(null);
  const mobileContinueRef = useRef(null);
  const focusMobileContinueRef = useRef(false);
  const touchTapRef = useRef(null);
  const consumedBookingPreviewRef = useRef(null);
  const scrolledBookingPreviewRef = useRef(null);
  const {
    bookings = [],
    availabilityBookings = bookings,
    bookingPreviewRequest,
    date,
    mobileOverlayBlocked = false,
    pageScroll = false,
    selectionCopy = DEFAULT_SELECTION_COPY,
    studio: sourceStudio,
    t,
  } = props;
  const customerThemed = CUSTOMER_AUDIENCES.has(props.audience);
  const currentBookingPreview =
    props.audience === "customer" &&
    props.onSlotSelect &&
    bookingPreviewRequest?.id != null &&
    localDateKey(bookingPreviewRequest.day) === localDateKey(date)
      ? bookingPreviewRequest
      : null;
  const stickyHeaderTop =
    "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))";
  const {
    handleBodyScroll,
    handleHeaderScroll,
    handleScrollInputCapture,
    handleScrollKeyDownCapture,
    syncScrollFromBody,
  } = useCalendarScrollSync({ bodyRef: scrollRef, headerRef: headerScrollRef });
  const displayHours = useMemo(() => {
    const hours = getCalendarDisplayHours(sourceStudio, [date]);
    if (
      !currentBookingPreview ||
      !Number.isFinite(currentBookingPreview.startMinute) ||
      !Number.isFinite(currentBookingPreview.endMinute)
    ) {
      return hours;
    }
    return {
      start: Math.max(
        0,
        Math.min(
          hours.start,
          Math.floor(currentBookingPreview.startMinute / 60),
        ),
      ),
      end: Math.min(
        24,
        Math.max(hours.end, Math.ceil(currentBookingPreview.endMinute / 60)),
      ),
    };
  }, [currentBookingPreview, date, sourceStudio]);
  const studio = useMemo(
    () =>
      sourceStudio
        ? {
            ...sourceStudio,
            displayCalendarHours: displayHours,
            resources: sourceStudio.resources?.map((resource) =>
              localizeCalendarResource(resource, t),
            ),
          }
        : sourceStudio,
    [displayHours, sourceStudio, t],
  );
  const { start, end } = displayHours;
  const slotStepMinutes = Number(studio?.slotStepMinutes || 30);
  const selectionMinutes = Math.max(
    slotStepMinutes,
    Number(studio?.minBookingMinutes || 60),
  );
  const maximumSelectionMinutes =
    Number(studio?.maxBookingMinutes || 0) || undefined;
  const slotSelection = useCalendarSlotSelection({
    enabled: Boolean(props.onSlotSelect),
    scopeKey: `${studio?.id || "studio"}:${localDateKey(date)}:${studio?.availabilityMode || "lanes"}:${props.selectedActivityId || "all"}:${studio?.timeZone || "local"}:${props.onSlotSelect ? "enabled" : "disabled"}:${start}:${end}:${slotStepMinutes}:${selectionMinutes}:${maximumSelectionMinutes || "none"}:${JSON.stringify(studio?.openingHours || {})}`,
    startMinute: start * 60,
    pixelsPerMinute: PIXELS_PER_MINUTE,
    stepMinutes: slotStepMinutes,
    minimumMinutes: selectionMinutes,
    maximumMinutes: maximumSelectionMinutes,
  });
  const { seedSelection } = slotSelection;

  const getSelectionAvailability = useCallback(
    (selection) => {
      if (!selection) return null;

      const { activityId, laneIndex } = selection.metadata || {};
      const laneEvents =
        customerThemed &&
        laneIndex !== undefined &&
        studio?.availabilityMode !== "capacity"
          ? getFixedLaneEvents({
              studio,
              bookings: availabilityBookings,
              day: selection.day,
              laneIndex,
            })
          : undefined;

      const availability = getAvailabilityForRange({
        studio,
        bookings: availabilityBookings,
        day: selection.day,
        startMinute: selection.startMinute,
        endMinute: selection.endMinute,
        activityId,
        laneEvents,
      });
      return getBookingPreviewAvailability({
        selection,
        studio,
        bookings: availabilityBookings,
        availability,
        now: new Date(),
      });
    },
    [availabilityBookings, customerThemed, studio],
  );

  useEffect(() => {
    if (
      !currentBookingPreview ||
      consumedBookingPreviewRef.current === currentBookingPreview.id
    ) {
      return;
    }
    let activityId =
      currentBookingPreview.activityId || props.selectedActivityId || undefined;
    const metadata = {
      activityId,
      ...(currentBookingPreview.courseIntent
        ? { courseIntent: currentBookingPreview.courseIntent }
        : {}),
    };
    let selectionKey;
    if (studio?.availabilityMode === "capacity") {
      const resource =
        studio.resources?.find((item) => item.id === activityId) ||
        studio.resources?.find(
          (item) => item.id === props.selectedActivityId,
        ) ||
        studio.resources?.[0];
      if (!resource) return;
      activityId = resource.id;
      metadata.activityId = activityId;
      selectionKey = `resource:${activityId}`;
    } else {
      const laneCount = Math.max(1, Number(studio?.publicLaneCount) || 2);
      let laneIndex = 0;
      for (let lane = 0; lane < laneCount; lane += 1) {
        if (
          getSelectionAvailability({
            ...currentBookingPreview,
            metadata: { ...metadata, laneIndex: lane },
          })?.isBookable
        ) {
          laneIndex = lane;
          break;
        }
      }
      metadata.laneIndex = laneIndex;
      selectionKey = `lane:${laneIndex}`;
    }
    const seeded = seedSelection({
      day: currentBookingPreview.day,
      startMinute: currentBookingPreview.startMinute,
      endMinute: currentBookingPreview.endMinute,
      openingWindow: {
        isOpen: true,
        openMinutes: start * 60,
        closeMinutes: Math.max(
          end * 60,
          getStudioOpeningWindow(studio, currentBookingPreview.day)
            .closeMinutes,
        ),
      },
      selectionKey,
      metadata,
    });
    if (seeded) {
      consumedBookingPreviewRef.current = currentBookingPreview.id;
      const bookingTrigger = currentBookingPreview.trigger?.isConnected
        ? currentBookingPreview.trigger
        : Array.from(
            scrollRef.current?.querySelectorAll("[data-calendar-booking-id]") ||
              [],
          ).find(
            (element) =>
              element.dataset.calendarBookingId ===
              String(currentBookingPreview.originBookingId),
          );
      selectionOriginRef.current = bookingTrigger || document.activeElement;
    }
  }, [
    currentBookingPreview,
    end,
    getSelectionAvailability,
    props.selectedActivityId,
    seedSelection,
    start,
    studio,
  ]);

  const clearMobileSelection = useCallback(() => {
    const origin = selectionOriginRef.current;
    slotSelection.clearSelection();
    window.requestAnimationFrame?.(() =>
      origin?.focus?.({ preventScroll: true }),
    );
  }, [slotSelection]);

  const confirmSelection = () => {
    const selection = slotSelection.selection;
    const { activityId, laneIndex } = selection?.metadata || {};
    const availability = getSelectionAvailability(selection);
    if (
      !selection ||
      selection.phase !== "ready" ||
      !slotFitsOpeningHours(
        studio,
        selection.day,
        selection.startMinute,
        selection.endMinute,
      ) ||
      (customerThemed && !availability?.isBookable)
    ) {
      if (customerThemed && selection?.phase === "ready") {
        clearMobileSelection();
      }
      return;
    }

    selectionOriginRef.current?.focus?.({ preventScroll: true });
    slotSelection.clearSelection();
    props.onSlotSelect?.({
      studio: sourceStudio,
      activityId: activityId || undefined,
      ...(laneIndex !== undefined ? { laneIndex } : {}),
      start:
        availability?.start ||
        makeSlotDate(selection.day, selection.startMinute, studio?.timeZone),
      end:
        availability?.end ||
        makeSlotDate(selection.day, selection.endMinute, studio?.timeZone),
      ...getBookingPreviewConfirmation(selection, availability),
    });
  };

  const mobileSelection =
    customerThemed && slotSelection.selection?.phase === "ready"
      ? slotSelection.selection
      : null;
  const mobileSelectionAvailability = getSelectionAvailability(mobileSelection);
  const mobileSelectionDayLabel = mobileSelection
    ? new Intl.DateTimeFormat(props.locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(mobileSelection.day)
    : "";
  const mobileSelectionRange = mobileSelection
    ? formatRange(
        mobileSelectionAvailability?.start ||
          makeSlotDate(
            mobileSelection.day,
            mobileSelection.startMinute,
            studio?.timeZone,
          ),
        mobileSelectionAvailability?.end ||
          makeSlotDate(
            mobileSelection.day,
            mobileSelection.endMinute,
            studio?.timeZone,
          ),
        props.locale,
        studio?.timeZone,
      )
    : "";
  const mobileSelectionActivity = mobileSelection
    ? getCalendarActivityName(
        studio,
        mobileSelection.metadata?.activityId ||
          mobileSelectionAvailability?.activityId,
        t,
      )
    : "";
  const mobileSelectionAvailabilityLabel = mobileSelectionAvailability
    ? getAvailabilityLabel(mobileSelectionAvailability, props.t, props.studio)
    : "";

  useEffect(() => {
    if (
      !mobileSelection ||
      mobileOverlayBlocked ||
      !focusMobileContinueRef.current
    ) {
      return undefined;
    }

    focusMobileContinueRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      mobileContinueRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileOverlayBlocked, mobileSelection]);

  useEffect(() => {
    const container = scrollRef.current;
    const key = `${studio?.id || "studio"}:${localDateKey(date)}`;

    if (!container || autoScrollKeyRef.current === key) return undefined;

    const todayKey = dateKey(new Date(), studio?.timeZone);
    const isToday = localDateKey(date) === todayKey;
    const eventMinutes = bookingsForDay(bookings, date, studio).map((event) =>
      wallTimeMinutes(event.start, studio?.timeZone),
    );
    const targetMinute = getInitialScrollMinute({
      isToday,
      nowMinute: wallTimeMinutes(new Date(), studio?.timeZone),
      eventMinutes,
      openingMinute: start * 60,
      closingMinute: end * 60,
    });

    const frame = requestAnimationFrame(() => {
      // Marked only once it runs, so a re-run that cancels the frame, such
      // as StrictMode's development remount, does not skip the scroll.
      autoScrollKeyRef.current = key;
      if (!pageScroll) {
        container.scrollTop = Math.max(
          0,
          (targetMinute - start * 60) * PIXELS_PER_MINUTE,
        );
      }
      syncScrollFromBody();
    });

    return () => cancelAnimationFrame(frame);
  }, [bookings, date, end, pageScroll, start, studio, syncScrollFromBody]);

  useEffect(() => {
    const requestId = currentBookingPreview?.id;
    if (
      requestId == null ||
      consumedBookingPreviewRef.current !== requestId ||
      scrolledBookingPreviewRef.current === requestId ||
      !slotSelection.selection
    ) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      const preview = scrollRef.current?.querySelector(
        '[data-calendar-slot-preview="true"]',
      );
      if (!preview) return;
      scrolledBookingPreviewRef.current = requestId;
      preview.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      syncScrollFromBody();
    });
    return () => cancelAnimationFrame(frame);
  }, [currentBookingPreview?.id, slotSelection.selection, syncScrollFromBody]);

  const timeGridCalendar =
    studio?.availabilityMode === "capacity" ? (
      <ResourceDay
        {...props}
        studio={studio}
        availabilityBookings={availabilityBookings}
        slotSelection={slotSelection}
        getSelectionAvailability={getSelectionAvailability}
        confirmSelection={confirmSelection}
        cancelSelection={
          customerThemed ? clearMobileSelection : slotSelection.clearSelection
        }
        selectionOriginRef={selectionOriginRef}
        focusMobileContinueRef={focusMobileContinueRef}
        touchTapRef={touchTapRef}
        headerScrollRef={headerScrollRef}
        onBodyScroll={handleBodyScroll}
        onHeaderScroll={handleHeaderScroll}
        onScrollInputCapture={handleScrollInputCapture}
        onScrollKeyDownCapture={handleScrollKeyDownCapture}
        stickyHeaderTop={stickyHeaderTop}
        scrollRef={scrollRef}
      />
    ) : (
      <FixedLaneDay
        {...props}
        studio={studio}
        availabilityBookings={availabilityBookings}
        slotSelection={slotSelection}
        getSelectionAvailability={getSelectionAvailability}
        confirmSelection={confirmSelection}
        cancelSelection={
          customerThemed ? clearMobileSelection : slotSelection.clearSelection
        }
        selectionOriginRef={selectionOriginRef}
        focusMobileContinueRef={focusMobileContinueRef}
        touchTapRef={touchTapRef}
        headerScrollRef={headerScrollRef}
        onBodyScroll={handleBodyScroll}
        onHeaderScroll={handleHeaderScroll}
        onScrollInputCapture={handleScrollInputCapture}
        onScrollKeyDownCapture={handleScrollKeyDownCapture}
        stickyHeaderTop={stickyHeaderTop}
        scrollRef={scrollRef}
      />
    );

  return (
    <div
      className={`flex min-h-0 flex-col ${pageScroll ? "overflow-visible" : "flex-1"}`}
    >
      {!customerThemed && (
        <MobileAgendaCalendar
          days={[date]}
          selectedDate={date}
          onDateChange={NOOP}
          bookings={bookings}
          availabilityBookings={availabilityBookings}
          studio={sourceStudio}
          locale={props.locale}
          audience={props.audience}
          selectedActivityId={props.selectedActivityId}
          onBookingClick={props.onBookingClick}
          onSlotSelect={props.onSlotSelect}
          selectionCopy={selectionCopy}
          mobileOverlayBlocked={mobileOverlayBlocked}
          pageScroll={pageScroll}
          t={props.t}
        />
      )}

      <div
        data-calendar-mobile-day-grid={customerThemed ? "true" : undefined}
        data-calendar-desktop-grid="true"
        data-calendar-start-minute={start * 60}
        data-calendar-end-minute={end * 60}
        className={cx(
          "min-h-0 flex-col",
          customerThemed ? "flex" : "hidden lg:flex",
          pageScroll ? "overflow-visible" : "flex-1",
        )}
      >
        {timeGridCalendar}
      </div>

      {mobileSelection && props.onSlotSelect && !mobileOverlayBlocked ? (
        <div
          data-calendar-mobile-selection-summary="true"
          role="region"
          aria-label={selectionCopy.summary}
          data-tenant-surface="panel"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-[480px] items-center gap-3 rounded-[16px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-2.5 text-[var(--tenant-text-on-surface)] shadow-[0_18px_48px_color-mix(in_srgb,var(--tenant-text)_18%,transparent)] lg:pointer-fine:hidden [@media(max-height:500px)]:hidden"
        >
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-accent-on-surface)]">
              {selectionCopy.summary}
            </p>
            {/* The time comes first: a narrow bar truncates the end of this line. */}
            <p className="mt-0.5 truncate text-[12px] font-semibold capitalize tabular-nums">
              {mobileSelectionRange} · {mobileSelectionDayLabel}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-[var(--tenant-muted-on-surface)]">
              {[mobileSelectionActivity, mobileSelectionAvailabilityLabel]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <span className="sr-only" aria-live="polite">
              {selectionCopy.summary}: {mobileSelectionDayLabel},{" "}
              {mobileSelectionRange}
            </span>
          </div>
          <button
            ref={mobileContinueRef}
            type="button"
            data-calendar-mobile-continue="true"
            data-tenant-hover="preserve"
            disabled={!mobileSelectionAvailability?.isBookable}
            onClick={confirmSelection}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--tenant-accent)] px-3.5 text-[11px] font-semibold text-[var(--tenant-accent-foreground)] shadow-[0_8px_20px_color-mix(in_srgb,var(--tenant-accent)_22%,transparent)] transition hover:-translate-y-0.5 hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] disabled:pointer-events-none disabled:opacity-45 motion-reduce:transform-none"
          >
            {selectionCopy.continue}
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={selectionCopy.clear}
            data-tenant-hover="preserve"
            onClick={clearMobileSelection}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
