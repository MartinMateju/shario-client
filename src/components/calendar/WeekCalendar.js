"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";

import CalendarEventCard from "./CalendarEventCard";
import CalendarSlotSelection from "./CalendarSlotSelection";
import CustomerSlotSurfaces from "./CustomerSlotSurfaces";
import MobileAgendaCalendar from "./MobileAgendaCalendar";
import NowMarker from "./NowMarker";
import {
  getBookingPreviewAvailability,
  getBookingPreviewConfirmation,
} from "./calendar.bookingSelection";
import { getInitialScrollMinute } from "./calendar.interactions";
import { getCalendarAvailabilityLabel as getAvailabilityLabel } from "./calendar.presentation";
import { getCalendarActivityName } from "./calendar.resources";
import {
  bookingsForDay,
  cx,
  dateKey,
  eventPosition,
  formatRange,
  getCalendarDayState,
  getCalendarDisplayHours,
  getCalendarSlotAvailability,
  getCustomerCalendarDaySurface,
  getTimeSlots,
  getWeekDays,
  getStudioOpeningWindow,
  layoutOverlaps,
  localDateKey,
  makeSlotDate,
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

const ROW_HEIGHT = 42;
const PIXELS_PER_MINUTE = ROW_HEIGHT / 30;
const TIME_RAIL = 64;
const WEEK_GRID_TEMPLATE =
  "var(--calendar-time-rail, 48px) repeat(7, minmax(var(--calendar-day-width, 136px), 1fr))";
const WEEK_GRID_MIN_WIDTH =
  "calc(var(--calendar-time-rail, 48px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px) + var(--calendar-day-width, 136px))";
const WEEK_GRID_CANVAS_STYLE = Object.freeze({
  width: "100%",
  minWidth: WEEK_GRID_MIN_WIDTH,
});
const WEEK_GRID_TRACK_STYLE = Object.freeze({
  display: "grid",
  gridTemplateColumns: WEEK_GRID_TEMPLATE,
});

const CUSTOMER_AUDIENCES = new Set(["customer", "public"]);
const DEFAULT_SELECTION_COPY = Object.freeze({
  summary: "Selected time",
  continue: "Continue",
  clear: "Clear selected time",
});

function getPointerSlotMinute(event, startMinute, endMinute, stepMinutes) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const relativeMinute = (event.clientY - bounds.top) / PIXELS_PER_MINUTE;
  const minute =
    startMinute + Math.floor(relativeMinute / stepMinutes) * stepMinutes;

  return Math.max(startMinute, Math.min(endMinute - stepMinutes, minute));
}

function WeekDayHeaders({ dayModels, customerThemed }) {
  return dayModels.map(({ day, dayState, shortDayLabel }) => {
    const isToday = dayState === "today";

    return (
      <div
        key={localDateKey(day)}
        data-calendar-day-state={dayState}
        aria-current={isToday ? "date" : undefined}
        data-tenant-hover={customerThemed ? "preserve" : undefined}
        className={cx(
          "flex h-11 items-center justify-center gap-1.5 border-r text-[10px] font-medium uppercase tracking-[0.07em] last:border-r-0",
          customerThemed
            ? "border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)]"
            : "border-[#CBD5E1] text-[#475569]",
        )}
        style={
          customerThemed
            ? {
                backgroundColor: getCustomerCalendarDaySurface(dayState),
              }
            : isToday
              ? {
                  backgroundColor:
                    "color-mix(in srgb, var(--color-brand-primary) 8%, white)",
                }
              : undefined
        }
      >
        {shortDayLabel}
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full font-semibold"
          style={
            isToday
              ? {
                  backgroundColor:
                    "var(--tenant-accent, var(--color-brand-primary))",
                  color: "var(--tenant-accent-foreground, #FFFFFF)",
                }
              : undefined
          }
        >
          {day.getDate()}
        </span>
      </div>
    );
  });
}

function buildCustomerSlotModels({
  slots,
  studio,
  availabilityBookings,
  day,
  activityId,
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
    const availability = getCalendarSlotAvailability({
      studio,
      bookings: availabilityBookings,
      day,
      startMinute: slot.minute,
      endMinute,
      activityId: activityId || "",
    });
    // A start must fit the whole minimum booking. Check the displayed interval
    // separately so the tooltip can explain insufficient consecutive time.
    const surfaceAvailability = getCalendarSlotAvailability({
      studio,
      bookings: availabilityBookings,
      day,
      startMinute: slot.minute,
      endMinute: slot.minute + stepMinutes,
      activityId: activityId || "",
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

export default function WeekCalendar({
  date,
  bookings = [],
  availabilityBookings = bookings,
  studio: sourceStudio,
  locale,
  audience,
  selectedActivityId,
  onDateChange,
  onBookingClick,
  onSlotSelect,
  bookingPreviewRequest,
  selectionCopy = DEFAULT_SELECTION_COPY,
  mobileOverlayBlocked = false,
  pageScroll = false,
  t,
}) {
  const days = useMemo(() => getWeekDays(date), [date]);
  const matchingPreviewRequest = useMemo(
    () =>
      audience === "customer" &&
      onSlotSelect &&
      bookingPreviewRequest?.id != null &&
      days.some(
        (day) => localDateKey(day) === localDateKey(bookingPreviewRequest.day),
      )
        ? bookingPreviewRequest
        : null,
    [audience, bookingPreviewRequest, days, onSlotSelect],
  );
  const displayHours = useMemo(() => {
    const hours = getCalendarDisplayHours(sourceStudio, days);
    const previewStart = Number(matchingPreviewRequest?.startMinute);
    const previewEnd = Number(matchingPreviewRequest?.endMinute);
    if (
      !matchingPreviewRequest ||
      !Number.isFinite(previewStart) ||
      !Number.isFinite(previewEnd) ||
      previewStart < 0 ||
      previewEnd > 24 * 60 ||
      previewEnd <= previewStart
    ) {
      return hours;
    }
    return {
      start: Math.min(hours.start, Math.floor(previewStart / 60)),
      end: Math.max(hours.end, Math.ceil(previewEnd / 60)),
    };
  }, [days, matchingPreviewRequest, sourceStudio]);
  const studio = useMemo(
    () =>
      sourceStudio
        ? { ...sourceStudio, displayCalendarHours: displayHours }
        : sourceStudio,
    [displayHours, sourceStudio],
  );
  const slots = useMemo(() => getTimeSlots(studio), [studio]);
  // Keep the visual half-hour rhythm independent of the booking increment.
  const gridSlots = useMemo(
    () => getTimeSlots({ ...studio, slotStepMinutes: 30 }),
    [studio],
  );
  const { start, end } = displayHours;
  const slotStepMinutes = Number(studio?.slotStepMinutes || 30);
  const selectionMinutes = Math.max(
    slotStepMinutes,
    Number(studio?.minBookingMinutes || 60),
  );
  const maximumSelectionMinutes =
    Number(studio?.maxBookingMinutes || 0) || undefined;
  const boardHeight = (end - start) * 60 * PIXELS_PER_MINUTE;
  const calendarNow = new Date();
  const todayKey = dateKey(calendarNow, studio?.timeZone);
  const customerThemed = CUSTOMER_AUDIENCES.has(audience);
  const dayModels = useMemo(() => {
    const modelNow = new Date();
    const dayLabelFormatter = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const shortDayFormatter = new Intl.DateTimeFormat(locale, {
      weekday: "short",
    });

    return days.map((day) => {
      const events = bookingsForDay(bookings, day, studio).filter(
        (event) => !event.allDay,
      );
      const slotModels = customerThemed
        ? buildCustomerSlotModels({
            slots,
            studio,
            availabilityBookings,
            day,
            activityId: selectedActivityId,
            locale,
            t,
          })
        : [];

      return {
        day,
        dayLabel: dayLabelFormatter.format(day),
        shortDayLabel: shortDayFormatter.format(day),
        dayState: getCalendarDayState(day, modelNow, studio?.timeZone),
        events,
        layout: layoutOverlaps(events),
        openingWindow: getStudioOpeningWindow(studio, day),
        slotModels,
        firstBookableSlot: slotModels.find(
          ({ availability }) => availability.isBookable,
        )?.slot,
      };
    });
  }, [
    availabilityBookings,
    bookings,
    customerThemed,
    days,
    locale,
    selectedActivityId,
    slots,
    studio,
    t,
  ]);
  const weekScrollRef = useRef(null);
  const mobileHeaderScrollRef = useRef(null);
  const mobileSelectionOriginRef = useRef(null);
  const mobileContinueRef = useRef(null);
  const focusMobileContinueRef = useRef(false);
  const touchTapRef = useRef(null);
  const autoScrollKeyRef = useRef("");
  const consumedBookingPreviewRef = useRef(null);
  const scrolledBookingPreviewRef = useRef(null);
  const weekKey = localDateKey(days[0]);
  const slotSelection = useCalendarSlotSelection({
    enabled: Boolean(onSlotSelect),
    scopeKey: `${studio?.id || "studio"}:${weekKey}:${selectedActivityId || "all"}:${studio?.timeZone || "local"}:${onSlotSelect ? "enabled" : "disabled"}:${start}:${end}:${slotStepMinutes}:${selectionMinutes}:${maximumSelectionMinutes || "none"}:${JSON.stringify(studio?.openingHours || {})}`,
    startMinute: start * 60,
    pixelsPerMinute: PIXELS_PER_MINUTE,
    stepMinutes: slotStepMinutes,
    minimumMinutes: selectionMinutes,
    maximumMinutes: maximumSelectionMinutes,
  });
  const { seedSelection } = slotSelection;
  useEffect(() => {
    if (
      !matchingPreviewRequest ||
      consumedBookingPreviewRef.current === matchingPreviewRequest.id
    ) {
      return;
    }
    const day = days.find(
      (candidate) =>
        localDateKey(candidate) === localDateKey(matchingPreviewRequest.day),
    );
    if (!day) return;

    const seeded = seedSelection({
      day,
      selectionKey: localDateKey(day),
      startMinute: matchingPreviewRequest.startMinute,
      endMinute: matchingPreviewRequest.endMinute,
      openingWindow: {
        isOpen: true,
        openMinutes: start * 60,
        closeMinutes: Math.max(
          end * 60,
          getStudioOpeningWindow(studio, day).closeMinutes,
        ),
      },
      metadata: {
        activityId: matchingPreviewRequest.activityId || undefined,
        courseIntent: matchingPreviewRequest.courseIntent,
      },
    });
    if (seeded) {
      consumedBookingPreviewRef.current = matchingPreviewRequest.id;
      const bookingTrigger = matchingPreviewRequest.trigger?.isConnected
        ? matchingPreviewRequest.trigger
        : Array.from(
            weekScrollRef.current?.querySelectorAll(
              "[data-calendar-booking-id]",
            ) || [],
          ).find(
            (element) =>
              element.dataset.calendarBookingId ===
              String(matchingPreviewRequest.originBookingId),
          );
      mobileSelectionOriginRef.current =
        bookingTrigger || document.activeElement;
    }
  }, [days, end, matchingPreviewRequest, seedSelection, start, studio]);
  const selectedMobileDate =
    days.find((day) => localDateKey(day) === localDateKey(date)) ||
    days.find((day) => localDateKey(day) === todayKey) ||
    days[0];
  const handleMobileDateChange = useCallback(
    (day) => {
      onDateChange?.(day);
    },
    [onDateChange],
  );
  const {
    handleBodyScroll: handleWeekScroll,
    handleHeaderScroll: handleMobileHeaderScroll,
    handleScrollInputCapture,
    handleScrollKeyDownCapture,
    syncScrollFromBody,
  } = useCalendarScrollSync({
    bodyRef: weekScrollRef,
    headerRef: mobileHeaderScrollRef,
  });

  useEffect(() => {
    const isCurrentWeek = days.some((day) => localDateKey(day) === todayKey);
    const focusedDateKey = localDateKey(date);
    const anchorKey = days.some((day) => localDateKey(day) === focusedDateKey)
      ? focusedDateKey
      : isCurrentWeek
        ? todayKey
        : localDateKey(days[0]);
    const key = `${studio?.id || ""}:${weekKey}:${anchorKey}`;
    const container = weekScrollRef.current;
    if (!container || autoScrollKeyRef.current === key) return undefined;

    const eventMinutes = days.flatMap((day) =>
      bookingsForDay(bookings, day, studio).map((event) =>
        wallTimeMinutes(event.start, studio?.timeZone),
      ),
    );
    const targetMinute = getInitialScrollMinute({
      isToday: isCurrentWeek,
      nowMinute: wallTimeMinutes(new Date(), studio?.timeZone),
      eventMinutes,
      openingMinute: start * 60,
      closingMinute: end * 60,
    });

    const frame = requestAnimationFrame(() => {
      // Mark the scroll done only once it runs. A re-run before the frame,
      // such as React StrictMode's development remount, cancels the frame,
      // and a key consumed up front then skipped the scroll to today.
      autoScrollKeyRef.current = key;
      if (!pageScroll) {
        container.scrollTop = Math.max(
          0,
          (targetMinute - start * 60) * PIXELS_PER_MINUTE,
        );
      }

      if (container.scrollWidth > container.clientWidth) {
        const anchorIndex = Math.max(
          0,
          days.findIndex((day) => localDateKey(day) === anchorKey),
        );
        const railWidth =
          container
            .querySelector('[data-calendar-time-rail="true"]')
            ?.getBoundingClientRect().width || TIME_RAIL;
        const anchorColumn = container.querySelectorAll(
          '[data-calendar-week-day-column="true"]',
        )[anchorIndex];
        const measuredColumnWidth = Number(anchorColumn?.offsetWidth || 0);
        const approximateColumnWidth =
          measuredColumnWidth || (container.scrollWidth - railWidth) / 7;
        const anchorCenter = measuredColumnWidth
          ? anchorColumn.offsetLeft + measuredColumnWidth / 2
          : railWidth +
            approximateColumnWidth * anchorIndex +
            approximateColumnWidth / 2;
        const visibleDaysWidth = Math.max(0, container.clientWidth - railWidth);
        const maximumScrollLeft = Math.max(
          0,
          container.scrollWidth - container.clientWidth,
        );
        syncScrollFromBody(
          Math.min(
            maximumScrollLeft,
            Math.max(0, anchorCenter - railWidth - visibleDaysWidth / 2),
          ),
        );
      } else {
        syncScrollFromBody();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [
    bookings,
    date,
    days,
    end,
    pageScroll,
    start,
    studio,
    syncScrollFromBody,
    todayKey,
    weekKey,
  ]);

  useEffect(() => {
    const requestId = matchingPreviewRequest?.id;
    if (
      requestId == null ||
      consumedBookingPreviewRef.current !== requestId ||
      scrolledBookingPreviewRef.current === requestId ||
      !slotSelection.selection
    ) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      const preview = weekScrollRef.current?.querySelector(
        '[data-calendar-slot-preview="true"]',
      );
      if (!preview) return;
      scrolledBookingPreviewRef.current = requestId;
      preview.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      syncScrollFromBody();
    });
    return () => cancelAnimationFrame(frame);
  }, [matchingPreviewRequest?.id, slotSelection.selection, syncScrollFromBody]);

  const clearMobileSelection = useCallback(() => {
    const origin = mobileSelectionOriginRef.current;
    slotSelection.clearSelection();
    window.requestAnimationFrame?.(() =>
      origin?.focus?.({ preventScroll: true }),
    );
  }, [slotSelection]);

  const getSelectionAvailability = (selection, now = new Date()) => {
    if (!selection) return null;
    const availability = getCalendarSlotAvailability({
      studio,
      bookings: availabilityBookings,
      day: selection.day,
      startMinute: selection.startMinute,
      endMinute: selection.endMinute,
      activityId: selection.metadata.activityId || "",
      now,
    });
    return getBookingPreviewAvailability({
      selection,
      studio,
      bookings: availabilityBookings,
      availability,
      now,
    });
  };

  const confirmSelection = () => {
    const selection = slotSelection.selection;
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

    mobileSelectionOriginRef.current?.focus?.({ preventScroll: true });
    slotSelection.clearSelection();
    onSlotSelect?.({
      studio: sourceStudio,
      activityId:
        selection.metadata.activityId || availability?.activityId || undefined,
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
  const mobileSelectionAvailability = getSelectionAvailability(
    mobileSelection,
    calendarNow,
  );
  const mobileSelectionDayLabel = mobileSelection
    ? new Intl.DateTimeFormat(locale, {
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
        locale,
        studio?.timeZone,
      )
    : "";
  const mobileSelectionActivity = mobileSelection
    ? getCalendarActivityName(
        studio,
        mobileSelection.metadata.activityId ||
          mobileSelectionAvailability?.activityId,
        t,
      )
    : "";
  const mobileSelectionAvailabilityLabel = mobileSelectionAvailability
    ? getAvailabilityLabel(mobileSelectionAvailability, t, studio)
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

  return (
    <div
      className={`flex min-h-0 flex-col ${pageScroll ? "overflow-visible" : "flex-1 overflow-hidden"}`}
    >
      <div
        data-calendar-mobile-week-grid={customerThemed ? "true" : undefined}
        className={cx(
          "calendar-week-grid-layout min-h-0 min-w-0",
          pageScroll ? "overflow-visible" : "flex flex-1 flex-col",
        )}
      >
        {!customerThemed && (
          <MobileAgendaCalendar
            days={days}
            selectedDate={selectedMobileDate}
            onDateChange={handleMobileDateChange}
            bookings={bookings}
            availabilityBookings={availabilityBookings}
            studio={sourceStudio}
            locale={locale}
            audience={audience}
            selectedActivityId={selectedActivityId}
            onBookingClick={onBookingClick}
            onSlotSelect={onSlotSelect}
            selectionCopy={selectionCopy}
            mobileOverlayBlocked={mobileOverlayBlocked}
            t={t}
            pageScroll={pageScroll}
          />
        )}

        {customerThemed && (
          <div
            ref={mobileHeaderScrollRef}
            data-calendar-grid-header="true"
            data-calendar-mobile-grid-header="true"
            data-calendar-header-scroll="true"
            role="region"
            aria-label={t("views.week")}
            tabIndex={0}
            onScroll={handleMobileHeaderScroll}
            onPointerDownCapture={handleScrollInputCapture}
            onFocusCapture={handleScrollInputCapture}
            onWheelCapture={handleScrollInputCapture}
            onKeyDownCapture={handleScrollKeyDownCapture}
            className={cx(
              "calendar-week-header-scroll sticky z-40 h-11 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] touch-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)] lg:hidden",
            )}
            style={{
              top: pageScroll
                ? "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))"
                : "0px",
            }}
          >
            <div
              className="calendar-week-grid-canvas calendar-week-grid-columns"
              style={{ ...WEEK_GRID_CANVAS_STYLE, ...WEEK_GRID_TRACK_STYLE }}
            >
              <div
                data-calendar-header-time-rail="true"
                className="sticky left-0 z-10 border-r border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
                style={{ left: 0 }}
              />
              <WeekDayHeaders
                dayModels={dayModels}
                customerThemed={customerThemed}
              />
            </div>
          </div>
        )}

        <div
          ref={weekScrollRef}
          data-calendar-desktop-week="true"
          data-calendar-desktop-grid="true"
          data-calendar-week-scroll="true"
          data-calendar-start-minute={start * 60}
          data-calendar-end-minute={end * 60}
          onScroll={handleWeekScroll}
          onPointerDownCapture={handleScrollInputCapture}
          onFocusCapture={handleScrollInputCapture}
          onWheelCapture={handleScrollInputCapture}
          onKeyDownCapture={handleScrollKeyDownCapture}
          className={cx(
            "min-h-0",
            customerThemed ? "block" : "hidden lg:block",
            pageScroll
              ? "overflow-x-auto overscroll-x-contain overscroll-y-auto overflow-y-clip touch-auto"
              : "flex-1 overflow-auto overscroll-contain",
          )}
        >
          <div
            className="calendar-week-grid-canvas"
            style={WEEK_GRID_CANVAS_STYLE}
          >
            <div
              data-calendar-grid-header="true"
              className={cx(
                `${pageScroll ? "relative" : "sticky top-0"} z-30 border-b backdrop-blur calendar-week-grid-columns`,
                customerThemed ? "hidden lg:grid" : "grid",
                customerThemed
                  ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
                  : "border-[#CBD5E1] bg-white/95",
              )}
              style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
            >
              <div
                className={cx(
                  "border-r",
                  customerThemed
                    ? "border-[var(--tenant-border)]"
                    : "border-[#CBD5E1]",
                )}
              />
              <WeekDayHeaders
                dayModels={dayModels}
                customerThemed={customerThemed}
              />
            </div>

            <div
              className="calendar-week-grid-columns relative grid"
              style={WEEK_GRID_TRACK_STYLE}
            >
              <div
                data-calendar-time-rail="true"
                className={cx(
                  // Above the selection preview (z-24), below the headers.
                  "sticky left-0 z-[25] border-r",
                  customerThemed
                    ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
                    : "border-[#CBD5E1] bg-[#F1F5F9]",
                )}
                style={{ position: "sticky", left: 0, height: boardHeight }}
              >
                {gridSlots.slice(0, -1).map((slot) => (
                  <span
                    key={slot.minute}
                    data-calendar-first-time-label={
                      slot.minute === start * 60 ? "true" : undefined
                    }
                    className={cx(
                      "absolute right-2 -translate-y-1/2 tabular-nums text-[11px] font-medium",
                      customerThemed
                        ? slot.isHour
                          ? "text-[var(--tenant-text)]"
                          : "text-[color-mix(in_srgb,var(--tenant-text)_72%,var(--tenant-background))]"
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

              {dayModels.map(
                ({
                  day,
                  dayLabel,
                  dayState,
                  events,
                  layout,
                  openingWindow,
                  slotModels,
                  firstBookableSlot,
                }) => {
                  const isToday = dayState === "today";
                  const selectionKey = localDateKey(day);
                  const draft =
                    slotSelection.selection?.selectionKey === selectionKey
                      ? slotSelection.selection
                      : null;
                  const draftAvailability =
                    customerThemed && draft
                      ? getSelectionAvailability(draft, calendarNow)
                      : null;
                  const canSelect =
                    Boolean(onSlotSelect) &&
                    openingWindow.isOpen &&
                    (!customerThemed || Boolean(firstBookableSlot));
                  const selectionConfig = {
                    day,
                    openingWindow,
                    selectionKey,
                    metadata: {
                      activityId: selectedActivityId || undefined,
                    },
                  };

                  return (
                    <div
                      key={localDateKey(day)}
                      data-calendar-day-state={dayState}
                      data-calendar-week-day-column="true"
                      data-calendar-start-minute={start * 60}
                      data-calendar-pixels-per-minute={PIXELS_PER_MINUTE}
                      role="group"
                      tabIndex={canSelect ? 0 : -1}
                      aria-label={dayLabel}
                      aria-disabled={!canSelect ? "true" : undefined}
                      className={cx(
                        "relative touch-manipulation select-none border-r outline-none [-webkit-tap-highlight-color:transparent] last:border-r-0 focus-visible:ring-2 focus-visible:ring-inset",
                        customerThemed
                          ? "border-[var(--tenant-border)] focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
                          : "border-[#CBD5E1] focus-visible:ring-brand-primary/25",
                        canSelect && "cursor-crosshair",
                        !customerThemed &&
                          (isToday ? "bg-skab-cobalt-50" : "bg-white"),
                      )}
                      style={{
                        height: boardHeight,
                        ...(customerThemed
                          ? {
                              backgroundColor:
                                getCustomerCalendarDaySurface(dayState),
                            }
                          : {}),
                      }}
                      onPointerDown={(event) => {
                        touchTapRef.current = null;
                        if (
                          !canSelect ||
                          event.target?.closest?.(
                            "[data-calendar-event-card], [data-calendar-slot-confirm], [data-calendar-slot-resize]",
                          )
                        ) {
                          return;
                        }
                        if (isTouchTapPointer(event)) {
                          startTouchTap(touchTapRef, event);
                          focusMobileContinueRef.current = false;
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
                          const availability = getCalendarSlotAvailability({
                            studio,
                            bookings: availabilityBookings,
                            day,
                            startMinute: pointerMinute,
                            endMinute: pointerMinute + selectionMinutes,
                            activityId: selectedActivityId || "",
                          });
                          if (!availability.isBookable) return;
                          pressedSlotMinute = pointerMinute;
                        }
                        mobileSelectionOriginRef.current = event.currentTarget;
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
                        const availability = getCalendarSlotAvailability({
                          studio,
                          bookings: availabilityBookings,
                          day,
                          startMinute: pointerMinute,
                          endMinute: pointerMinute + selectionMinutes,
                          activityId: selectedActivityId || "",
                          now: new Date(),
                        });
                        if (customerThemed && !availability.isBookable) return;

                        mobileSelectionOriginRef.current = touchTap.element;
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
                          if (customerThemed) clearMobileSelection();
                          else slotSelection.clearSelection();
                          return;
                        }
                        if (!canSelect || !["Enter", " "].includes(event.key)) {
                          return;
                        }
                        event.preventDefault();
                        mobileSelectionOriginRef.current = event.currentTarget;
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
                                  mobileSelectionOriginRef.current = trigger;
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
                      {gridSlots.map((slot) => (
                        <span
                          key={slot.minute}
                          aria-hidden="true"
                          className={cx(
                            // Above availability controls, below bookings.
                            "pointer-events-none absolute inset-x-0 z-[2] border-t",
                            customerThemed
                              ? slot.isHour
                                ? "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)]"
                                : "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_7%,transparent)]"
                              : slot.isHour
                                ? "border-[#94A3B8]"
                                : "border-[#CBD5E1]",
                          )}
                          style={{
                            top: (slot.minute - start * 60) * PIXELS_PER_MINUTE,
                            height: slot.minute < end * 60 ? ROW_HEIGHT : 0,
                          }}
                        />
                      ))}

                      {!openingWindow.isOpen && (
                        <div
                          className={cx(
                            "pointer-events-none absolute inset-0 z-[5] flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em]",
                            customerThemed
                              ? "text-[var(--tenant-muted-text)]"
                              : "text-[#475569]",
                          )}
                        >
                          {t("events.closed")}
                        </div>
                      )}

                      {draft && (
                        <CalendarSlotSelection
                          selection={draft}
                          calendarStartMinute={start * 60}
                          calendarEndMinute={end * 60}
                          pixelsPerMinute={PIXELS_PER_MINUTE}
                          studio={studio}
                          locale={locale}
                          onConfirm={confirmSelection}
                          onCancel={
                            customerThemed
                              ? clearMobileSelection
                              : slotSelection.clearSelection
                          }
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
                        const itemLayout = layout[event.id] || {
                          left: 0,
                          width: 100,
                        };
                        const gap = itemLayout.columns > 1 ? 3 : 5;
                        return (
                          <CalendarEventCard
                            key={event.id}
                            event={event}
                            t={t}
                            studio={studio}
                            locale={locale}
                            audience={audience}
                            compact={position.height < 58}
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
                              top: position.top + 2,
                              height: Math.max(30, position.height - 4),
                              left: `calc(${itemLayout.left}% + ${gap}px)`,
                              width: `calc(${itemLayout.width}% - ${gap + 2}px)`,
                            }}
                          />
                        );
                      })}

                      <NowMarker
                        day={day}
                        studio={studio}
                        pixelsPerMinute={PIXELS_PER_MINUTE}
                      />
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </div>

      {audience === "customer" && (
        <p className="shrink-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 py-2 text-[10px] text-[var(--tenant-muted-text)] sm:px-4">
          {t("week.privacyNote")}
        </p>
      )}

      {mobileSelection && onSlotSelect && !mobileOverlayBlocked ? (
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
