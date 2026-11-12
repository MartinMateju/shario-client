"use client";

import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import { memo, useEffect, useRef, useState } from "react";
import { openingWindowFirstStart } from "@/utils/openingHours";

import {
  CheckIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import CalendarEventCard from "./CalendarEventCard";
import { getCalendarAvailabilityLabel as getAvailabilityLabel } from "./calendar.presentation";
import { getCalendarActivityName } from "./calendar.resources";
import {
  bookingsForDay,
  cx,
  formatRange,
  getBookableSlotsForDay,
  getCalendarDayAvailability,
  getCalendarDayState,
  getCalendarSlotAvailability,
  getCustomerCalendarDaySurface,
  getCustomerCalendarSlotSurface,
  getStudioOpeningWindow,
  localDateKey,
} from "./calendar.utils";

export function getQuickSelection(
  day,
  studio,
  bookings = [],
  selectedActivityId = "",
  now = new Date(),
) {
  const slot = getBookableSlotsForDay({
    studio,
    bookings,
    day,
    activityId: selectedActivityId,
    now,
    limit: 1,
  })[0];

  return slot ? { start: slot.start, end: slot.end } : null;
}

export function getMobileSlotOptions({
  day,
  studio,
  bookings = [],
  selectedActivityId = "",
  now = new Date(),
}) {
  const openingWindow = getStudioOpeningWindow(studio, day);
  if (!openingWindow.isOpen) return [];

  const step = Math.max(15, Number(studio?.slotStepMinutes || 30));
  const duration = Math.max(step, Number(studio?.minBookingMinutes || 60));
  const options = [];
  for (const window of openingWindow.windows || [openingWindow]) {
    const latestStart = Math.min(24 * 60 - 1, window.closeMinutes - duration);
    for (
      let startMinute = openingWindowFirstStart(window, step);
      startMinute <= latestStart;
      startMinute += step
    ) {
      options.push(
        getCalendarSlotAvailability({
          studio,
          bookings,
          day,
          startMinute,
          endMinute: startMinute + duration,
          activityId: selectedActivityId,
          now,
        }),
      );
    }
  }

  return options;
}

const getMobileSlotKey = (slot, selectedActivityId = "") =>
  `${slot.start instanceof Date ? slot.start.toISOString() : slot.start || slot.startMinute}-${slot.activityId || selectedActivityId || "all"}`;

const DEFAULT_SELECTION_COPY = Object.freeze({
  summary: "Selected time",
  continue: "Continue",
  clear: "Clear selected time",
});

function MobileAgendaCalendar({
  days,
  selectedDate,
  onDateChange,
  bookings,
  availabilityBookings = bookings,
  studio,
  locale,
  audience,
  selectedActivityId,
  onBookingClick,
  onSlotSelect,
  selectionCopy = DEFAULT_SELECTION_COPY,
  mobileOverlayBlocked = false,
  pageScroll = false,
  t,
}) {
  const dayEvents = bookingsForDay(bookings, selectedDate, studio).sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );
  const calendarNow = new Date();
  const dayAvailability = getCalendarDayAvailability({
    studio,
    bookings: availabilityBookings,
    day: selectedDate,
    activityId: selectedActivityId || "",
    now: calendarNow,
  });
  const slotOptions = ["blocked", "closed", "past"].includes(
    dayAvailability.state,
  )
    ? []
    : getMobileSlotOptions({
        day: selectedDate,
        studio,
        bookings: availabilityBookings,
        selectedActivityId: selectedActivityId || "",
        now: calendarNow,
      }).filter((slot) => slot.state !== "past");
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selectedDate);
  const customerThemed = ["customer", "public"].includes(audience);
  const deferredSelection = audience === "customer";
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const weekStripRef = useRef(null);
  const selectedDayRef = useRef(null);
  const continueButtonRef = useRef(null);
  const selectionOriginRef = useRef(null);
  const focusContinueRef = useRef(false);
  const selectionScope = `${studio?.id || "studio"}:${localDateKey(selectedDate)}:${selectedActivityId || "all"}`;
  const selectedSlotCandidate = slotOptions.find(
    (slot) => getMobileSlotKey(slot, selectedActivityId) === selectedSlotKey,
  );
  const selectedSlot = selectedSlotCandidate?.isBookable
    ? selectedSlotCandidate
    : null;
  const selectedSlotRange = selectedSlot
    ? formatRange(
        selectedSlot.start,
        selectedSlot.end,
        locale,
        studio?.timeZone,
      )
    : "";
  const selectedSlotActivity = selectedSlot
    ? getCalendarActivityName(
        studio,
        selectedSlot.activityId || selectedActivityId,
        t,
      )
    : "";
  const selectedSlotAvailability = selectedSlot
    ? getAvailabilityLabel(selectedSlot, t, studio, { includeActivity: false })
    : "";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSelectedSlotKey(""));
    return () => window.cancelAnimationFrame(frame);
  }, [selectionScope]);

  useEffect(() => {
    if (
      !selectedSlot ||
      !deferredSelection ||
      mobileOverlayBlocked ||
      !focusContinueRef.current ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    focusContinueRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      continueButtonRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [deferredSelection, mobileOverlayBlocked, selectedSlot]);

  const clearSelectedSlot = () => {
    const origin = selectionOriginRef.current;
    setSelectedSlotKey("");
    window.requestAnimationFrame?.(() =>
      origin?.focus({ preventScroll: true }),
    );
  };

  useEffect(() => {
    if (selectedSlotKey && !selectedSlot) {
      const origin = selectionOriginRef.current;
      const frame = window.requestAnimationFrame(() => {
        setSelectedSlotKey("");
        origin?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [selectedSlot, selectedSlotKey]);

  useEffect(() => {
    const container = weekStripRef.current;
    const selectedDay = selectedDayRef.current;
    if (!container || !selectedDay || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      const left = Math.max(
        0,
        selectedDay.offsetLeft -
          (container.clientWidth - selectedDay.offsetWidth) / 2,
      );
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      container.scrollTo?.({
        left,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectionScope]);

  const selectDate = (day) => {
    setSelectedSlotKey("");
    onDateChange?.(day);
  };

  const continueWithSelectedSlot = () => {
    if (!selectedSlot?.isBookable) return;

    const latestAvailability = getCalendarSlotAvailability({
      studio,
      bookings: availabilityBookings,
      day: selectedDate,
      startMinute: selectedSlot.startMinute,
      endMinute: selectedSlot.endMinute,
      activityId: selectedSlot.activityId || selectedActivityId || "",
      now: new Date(),
    });
    if (!latestAvailability.isBookable) {
      clearSelectedSlot();
      return;
    }

    onSlotSelect?.({
      studio,
      activityId:
        latestAvailability.activityId || selectedActivityId || undefined,
      start: latestAvailability.start,
      end: latestAvailability.end,
    });
  };

  return (
    <div
      data-calendar-mobile-agenda="true"
      data-calendar-availability-state={dayAvailability.state}
      className={`min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden lg:hidden ${customerThemed ? "bg-[var(--tenant-background)] text-[var(--tenant-text)]" : "bg-canvas"} ${pageScroll ? "flex overflow-y-visible" : "flex flex-1 overflow-y-hidden"}`}
    >
      {days.length > 1 && (
        <div
          ref={weekStripRef}
          data-calendar-mobile-week-strip="true"
          role="group"
          aria-label={t("views.week")}
          className={`shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain border-b px-1.5 py-2 ${
            customerThemed
              ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
              : "border-[#CBD5E1] bg-white"
          }`}
        >
          <div className="grid min-w-[308px] grid-cols-7">
            {days.map((day) => {
              const key = localDateKey(day);
              const isSelected = key === localDateKey(selectedDate);
              const dayState = getCalendarDayState(
                day,
                calendarNow,
                studio?.timeZone,
              );
              const isToday = dayState === "today";
              const availability = getCalendarDayAvailability({
                studio,
                bookings: availabilityBookings,
                day,
                activityId: selectedActivityId || "",
                now: calendarNow,
              });
              const dateLabel = new Intl.DateTimeFormat(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(day);
              return (
                <button
                  ref={isSelected ? selectedDayRef : undefined}
                  key={key}
                  type="button"
                  onClick={() => selectDate(day)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  data-calendar-mobile-day="true"
                  data-calendar-day-state={dayState}
                  data-calendar-availability-state={availability.state}
                  data-tenant-hover={customerThemed ? "preserve" : undefined}
                  aria-label={`${dateLabel}, ${getAvailabilityLabel(
                    availability,
                    t,
                    studio,
                  )}`}
                  className={`group flex min-h-11 min-w-11 snap-center flex-col items-center justify-center gap-0.5 rounded-[10px] px-0.5 text-[9px] font-medium uppercase tracking-[0.05em] transition focus-visible:outline-none focus-visible:ring-2 ${
                    customerThemed
                      ? "text-[var(--tenant-muted-on-surface)] hover:brightness-[0.985] hover:text-[var(--tenant-text-on-surface)] focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
                      : "text-[#475569] hover:bg-[#F8FAFC] focus-visible:ring-brand-primary/25"
                  }`}
                  style={
                    customerThemed
                      ? {
                          backgroundColor:
                            getCustomerCalendarDaySurface(dayState),
                        }
                      : undefined
                  }
                >
                  <span>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "narrow",
                    }).format(day)}
                  </span>
                  <span
                    className={
                      isSelected
                        ? `inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                            customerThemed
                              ? "shadow-[0_4px_10px_color-mix(in_srgb,var(--tenant-accent)_20%,transparent)]"
                              : "shadow-[0_4px_10px_rgb(var(--skab-blue-rgb)/0.2)]"
                          }`
                        : `inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                            customerThemed
                              ? "text-[var(--tenant-text-on-surface)] group-hover:text-[var(--tenant-text)]"
                              : "text-[#31312F]"
                          }`
                    }
                    style={
                      isSelected
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
                  <span
                    className={cx(
                      "h-1.5 w-1.5 rounded-full",
                      availability.isBookable
                        ? customerThemed
                          ? "bg-[var(--tenant-accent)]"
                          : "bg-brand-primary"
                        : customerThemed
                          ? "bg-[var(--tenant-muted-on-surface)]/45"
                          : "bg-[#94A3B8]",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        data-calendar-mobile-selected-day="true"
        className={`flex shrink-0 items-center gap-3 border-b px-3 py-2.5 ${
          customerThemed
            ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)]"
            : "border-line bg-surface"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`truncate text-[13px] font-semibold capitalize ${
              customerThemed
                ? "text-[var(--tenant-text-on-surface)]"
                : "text-[#252524]"
            }`}
          >
            {selectedLabel}
          </p>
          <p
            className={`mt-0.5 text-[10px] ${
              customerThemed
                ? "text-[var(--tenant-muted-on-surface)]"
                : "text-[#475569]"
            }`}
          >
            {t("footer.bookingCount", { count: dayEvents.length })}
          </p>
        </div>
      </div>

      <div
        className={`min-h-0 min-w-0 max-w-full px-3 py-3 ${selectedSlot && deferredSelection ? "pb-32" : ""} ${pageScroll ? "overflow-visible" : "flex-1 overflow-y-auto overscroll-contain"}`}
      >
        {onSlotSelect && (
          <section
            data-calendar-mobile-slot-picker="true"
            data-calendar-availability-state={dayAvailability.state}
            aria-labelledby={`mobile-slot-picker-${localDateKey(selectedDate)}`}
            className="min-w-0 max-w-full"
          >
            <div className="mb-2.5 flex min-w-0 items-end justify-between gap-3">
              <h3
                id={`mobile-slot-picker-${localDateKey(selectedDate)}`}
                className={cx(
                  "min-w-0 truncate text-[12px] font-semibold",
                  customerThemed
                    ? "text-[var(--tenant-text-on-surface)]"
                    : "text-[#252524]",
                )}
              >
                {t("toolbar.newBooking")}
              </h3>
              <span
                className={cx(
                  "min-w-0 truncate text-right text-[10px] font-medium",
                  dayAvailability.isBookable
                    ? customerThemed
                      ? "text-[var(--tenant-accent-on-surface)]"
                      : "text-primary-text"
                    : customerThemed
                      ? "text-[var(--tenant-muted-on-surface)]"
                      : "text-[#475569]",
                )}
              >
                {getAvailabilityLabel(dayAvailability, t, studio)}
              </span>
            </div>

            {slotOptions.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {slotOptions.map((slot) => {
                  const slotLabel = getAvailabilityLabel(slot, t, studio, {
                    includeActivity: false,
                  });
                  const available = slot.state === "available";
                  const slotKey = getMobileSlotKey(slot, selectedActivityId);
                  const selected =
                    deferredSelection && slotKey === selectedSlotKey;
                  const range = formatRange(
                    slot.start,
                    slot.end,
                    locale,
                    studio?.timeZone,
                  );
                  const activityName = getCalendarActivityName(
                    studio,
                    slot.activityId || selectedActivityId,
                    t,
                  );

                  return (
                    <button
                      key={slotKey}
                      type="button"
                      disabled={!slot.isBookable}
                      aria-pressed={deferredSelection ? selected : undefined}
                      data-calendar-mobile-slot-selected={
                        deferredSelection
                          ? selected
                            ? "true"
                            : "false"
                          : undefined
                      }
                      aria-label={[
                        t("toolbar.newBooking"),
                        range,
                        activityName,
                        slotLabel,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      data-calendar-mobile-slot="true"
                      data-calendar-slot-start-minute={slot.startMinute}
                      data-calendar-availability-state={slot.state}
                      data-tenant-hover={
                        slot.isBookable && customerThemed
                          ? "preserve"
                          : undefined
                      }
                      onClick={(event) => {
                        if (!slot.isBookable) return;
                        if (deferredSelection) {
                          selectionOriginRef.current = event.currentTarget;
                          focusContinueRef.current = event.detail === 0;
                          setSelectedSlotKey(slotKey);
                          return;
                        }
                        onSlotSelect?.({
                          studio,
                          activityId:
                            slot.activityId || selectedActivityId || undefined,
                          start: slot.start,
                          end: slot.end,
                        });
                      }}
                      className={cx(
                        "flex min-h-[68px] w-full min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-[11px] border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2",
                        slot.isBookable
                          ? customerThemed
                            ? available
                              ? "border-[var(--tenant-calendar-available-accent)]/20 text-[var(--tenant-calendar-available-text)] hover:border-[var(--tenant-calendar-available-accent)]/40 hover:brightness-[0.985] focus-visible:ring-[var(--tenant-calendar-available-accent)]"
                              : "border-[var(--tenant-accent-on-surface)]/20 text-[var(--tenant-text-on-surface)] hover:border-[var(--tenant-accent-on-surface)]/40 hover:brightness-[0.985] focus-visible:ring-[var(--tenant-accent-on-surface)]"
                            : "border-skab-cobalt-200 bg-white text-[#252524] hover:bg-skab-cobalt-50 focus-visible:ring-brand-primary/25"
                          : customerThemed
                            ? "cursor-not-allowed border-[var(--tenant-border)] text-[var(--tenant-muted-on-surface)] opacity-65"
                            : "cursor-not-allowed border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] opacity-75",
                        selected &&
                          "ring-2 ring-[var(--tenant-accent-on-surface)] ring-offset-1 ring-offset-[var(--tenant-background)]",
                      )}
                      style={
                        customerThemed
                          ? {
                              backgroundColor: getCustomerCalendarSlotSurface(
                                slot.state,
                              ),
                              ...(available
                                ? {
                                    borderColor: `color-mix(in srgb, var(--tenant-calendar-available-accent, ${SKAB_BRAND_COLORS.primary}) 20%, transparent)`,
                                    color:
                                      "var(--tenant-calendar-available-text, #111827)",
                                  }
                                : {}),
                            }
                          : undefined
                      }
                    >
                      <span
                        className={cx(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                          slot.isBookable
                            ? customerThemed
                              ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]"
                              : "border-skab-cobalt-200 bg-skab-cobalt-50 text-primary-text"
                            : customerThemed
                              ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
                              : "border-[#CBD5E1] bg-white",
                        )}
                        style={
                          customerThemed && available
                            ? {
                                borderColor: `var(--tenant-calendar-available-accent, ${SKAB_BRAND_COLORS.primary})`,
                              }
                            : undefined
                        }
                        aria-hidden="true"
                      >
                        {selected ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : slot.isBookable ? (
                          <PlusIcon className="h-4 w-4" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-55" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold tabular-nums">
                          {range}
                        </span>
                        {activityName && (
                          <span
                            className={cx(
                              "mt-0.5 block truncate text-[10px]",
                              !slot.isBookable && "opacity-70",
                            )}
                          >
                            {activityName}
                          </span>
                        )}
                        <span className="mt-1 block text-[9px] font-semibold leading-tight opacity-80">
                          {slotLabel}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                data-calendar-mobile-slot-empty="true"
                data-calendar-availability-state={dayAvailability.state}
                className={cx(
                  "flex min-h-12 items-center rounded-[9px] border border-dashed px-3 text-[11px] font-medium",
                  customerThemed
                    ? "border-[var(--tenant-border)] text-[var(--tenant-muted-on-surface)]"
                    : "border-[#CBD5E1] bg-white text-[#475569]",
                )}
                style={
                  customerThemed
                    ? {
                        backgroundColor: getCustomerCalendarSlotSurface(
                          dayAvailability.state,
                        ),
                        ...(dayAvailability.state === "available"
                          ? {
                              borderColor: `color-mix(in srgb, var(--tenant-calendar-available-accent, ${SKAB_BRAND_COLORS.primary}) 28%, transparent)`,
                              color:
                                "var(--tenant-calendar-available-text, #111827)",
                            }
                          : {}),
                      }
                    : undefined
                }
              >
                {getAvailabilityLabel(dayAvailability, t, studio)}
              </div>
            )}
          </section>
        )}

        <section
          data-calendar-mobile-events="true"
          className={cx(
            "min-w-0 max-w-full",
            onSlotSelect &&
              (customerThemed
                ? "mt-4 border-t border-[var(--tenant-border)] pt-4"
                : "mt-4 border-t border-[#CBD5E1] pt-4"),
          )}
        >
          {dayEvents.length > 0 ? (
            <div className="min-w-0 space-y-2">
              {dayEvents.map((event) => (
                <CalendarEventCard
                  t={t}
                  key={event.id}
                  event={event}
                  studio={studio}
                  locale={locale}
                  audience={audience}
                  onClick={onBookingClick}
                  fullLabel={t("events.availability", { remaining: 0 })}
                  className="w-full max-w-full"
                />
              ))}
            </div>
          ) : (
            <div
              className={`flex min-h-20 items-center justify-center rounded-[10px] border border-dashed px-5 text-center ${
                customerThemed
                  ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
                  : "border-[#CBD5E1] bg-white"
              }`}
            >
              <p
                className={`text-[12px] ${
                  customerThemed
                    ? "text-[var(--tenant-muted-on-surface)]"
                    : "text-[#475569]"
                }`}
              >
                {t("footer.bookingCount", { count: 0 })}
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedSlot &&
      deferredSelection &&
      onSlotSelect &&
      !mobileOverlayBlocked ? (
        <div
          data-calendar-mobile-selection-summary="true"
          role="region"
          aria-label={selectionCopy.summary}
          data-tenant-surface="panel"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-[480px] items-center gap-3 rounded-[16px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-2.5 text-[var(--tenant-text-on-surface)] shadow-[0_18px_48px_color-mix(in_srgb,var(--tenant-text)_18%,transparent)] lg:hidden"
        >
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-accent-on-surface)]">
              {selectionCopy.summary}
            </p>
            {/* The time comes first: a narrow bar truncates the end of this line. */}
            <p className="mt-0.5 truncate text-[12px] font-semibold capitalize tabular-nums">
              {selectedSlotRange} · {selectedLabel}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-[var(--tenant-muted-on-surface)]">
              {[selectedSlotActivity, selectedSlotAvailability]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <span className="sr-only" aria-live="polite">
              {selectionCopy.summary}: {selectedLabel}, {selectedSlotRange}
            </span>
          </div>
          <button
            ref={continueButtonRef}
            type="button"
            data-calendar-mobile-continue="true"
            data-tenant-hover="preserve"
            onClick={continueWithSelectedSlot}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--tenant-accent)] px-3.5 text-[11px] font-semibold text-[var(--tenant-accent-foreground)] shadow-[0_8px_20px_color-mix(in_srgb,var(--tenant-accent)_22%,transparent)] transition hover:-translate-y-0.5 hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] motion-reduce:transform-none"
          >
            {selectionCopy.continue}
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={selectionCopy.clear}
            data-tenant-hover="preserve"
            onClick={clearSelectedSlot}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default memo(MobileAgendaCalendar);
