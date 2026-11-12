"use client";

import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import { useId, useRef, useState } from "react";
import { ChevronRightIcon, UserIcon } from "@heroicons/react/24/outline";

import CalendarBookingModeBadge from "./CalendarBookingModeBadge";
import CalendarActivityIcon from "./CalendarActivityIcon";
import { getCalendarBookingActivity } from "./calendar.activity";
import CalendarOwnBookingBadge, {
  ownBookingOutlineStyle,
} from "./CalendarOwnBookingBadge";
import CalendarTooltip, { useCalendarTooltip } from "./CalendarTooltip";
import {
  getCalendarBookingPresentation,
  getCalendarEventSurfaceStyle,
} from "./calendar.presentation";
import {
  bookingsForDay,
  cx,
  formatRange,
  formatTime,
  getCalendarDayAvailability,
  getCalendarDayState,
  getCustomerCalendarDaySurface,
  getMonthDays,
  localDateKey,
} from "./calendar.utils";

const availabilityLabel = (availability, t) => {
  switch (availability.state) {
    case "available":
      return t("availability.available");
    case "limited":
      return t("availability.limited");
    case "full":
      return t("events.full");
    case "closed":
      return t("events.closed");
    case "past":
      return t("month.past");
    default:
      return t("events.unavailable");
  }
};

const availabilityDot = (state) => {
  if (state === "available") return "bg-[#316544]";
  if (state === "limited") return "bg-[#D97706]";
  if (state === "full" || state === "blocked") return "bg-[#64748B]";
  return "border border-[#94A3B8] bg-transparent";
};

function AgendaBooking({ event, studio, locale, audience, onBookingClick, t }) {
  const tooltip = useCalendarTooltip();
  const presentation = getCalendarBookingPresentation(event, { t });
  const activity = getCalendarBookingActivity(event, studio, t);
  const interactive =
    typeof onBookingClick === "function" &&
    (audience === "customer" ||
      (!event.isClosure &&
        (event.actionable || event.isActionable || event.canOpen)));
  const Element = interactive ? "button" : "article";
  const range = formatRange(event.start, event.end, locale, studio?.timeZone);
  const label = [
    presentation.title,
    activity?.label,
    range,
    event.isMine && t("events.myBooking"),
    presentation.modeLabel,
    presentation.peopleLabel,
    presentation.customerReference,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Element
        {...tooltip.triggerProps}
        type={interactive ? "button" : undefined}
        onClick={
          interactive
            ? () => {
                tooltip.close();
                onBookingClick(event);
              }
            : undefined
        }
        aria-label={label}
        data-tenant-hover="preserve"
        data-calendar-event-card="true"
        data-calendar-booking-id={event.id}
        data-calendar-booking-mode={
          presentation.isBooking
            ? presentation.isPrivate
              ? "private"
              : "public"
            : undefined
        }
        data-calendar-my-booking={event.isMine ? "true" : undefined}
        data-calendar-event-interactive={interactive ? "true" : "false"}
        style={{
          ...getCalendarEventSurfaceStyle(event),
          ...(event.isMine ? ownBookingOutlineStyle : {}),
        }}
        className={cx(
          "grid min-h-20 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-3 text-left text-[var(--tenant-text-on-surface)] sm:gap-5 sm:p-4",
          event.isMine && "border-2",
          interactive &&
            "cursor-pointer transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)]",
        )}
      >
        <span
          className="flex min-w-[54px] flex-col gap-1 text-sm font-semibold tabular-nums"
          aria-hidden="true"
        >
          <span>{formatTime(event.start, locale, studio?.timeZone)}</span>
          <span className="font-normal">
            {formatTime(event.end, locale, studio?.timeZone)}
          </span>
        </span>
        <span className="min-w-0 space-y-1.5">
          {event.isMine && (
            <CalendarOwnBookingBadge label={t("events.myBooking")} />
          )}
          <span className="flex items-start gap-1.5 text-sm font-semibold sm:text-base">
            <CalendarActivityIcon
              activity={activity}
              className="mt-0.5 h-4 w-4"
            />
            <span className="min-w-0 break-words">{presentation.title}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {presentation.isBooking && (
              <CalendarBookingModeBadge
                isPrivate={presentation.isPrivate}
                label={presentation.modeLabel}
              />
            )}
            {presentation.peopleLabel && (
              <span>{presentation.peopleLabel}</span>
            )}
          </span>
          {presentation.customerReference && (
            <span
              data-calendar-customer-reference="true"
              className="block text-xs tabular-nums"
            >
              {presentation.customerReference}
            </span>
          )}
        </span>
        {interactive && (
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        )}
      </Element>
      <CalendarTooltip {...tooltip.tooltipProps}>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug">
            {presentation.title}
          </p>
          <p>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "full",
              timeZone: studio?.timeZone,
            }).format(new Date(event.start))}
          </p>
          <p className="font-semibold tabular-nums">{range}</p>
          {activity && (
            <p className="flex items-center gap-1.5">
              <CalendarActivityIcon activity={activity} />
              <span>{activity.label}</span>
            </p>
          )}
          {event.isMine && (
            <CalendarOwnBookingBadge label={t("events.myBooking")} />
          )}
          <p>
            {[presentation.modeLabel, presentation.peopleLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {presentation.customerReference && (
            <p className="tabular-nums">{presentation.customerReference}</p>
          )}
        </div>
      </CalendarTooltip>
    </>
  );
}

export default function CompactMonthCalendar({
  date,
  bookings,
  availabilityBookings = bookings,
  studio,
  locale,
  audience,
  selectedActivityId,
  onDateSelect,
  onBookingClick,
  pageScroll = false,
  t,
}) {
  const [selection, setSelection] = useState(null);
  const selectedDay = selection?.anchor === date ? selection.day : date;
  const selectedKey = localDateKey(selectedDay);
  const agendaHeadingId = useId();
  const dateButtons = useRef(new Map());
  const days = getMonthDays(date);
  const calendarNow = new Date();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 1 + index),
    ),
  );
  const selectDay = (day) => setSelection({ anchor: date, day });
  const handleDayKey = (event, index) => {
    const targetIndex = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - 7,
      ArrowDown: index + 7,
      Home: index - (index % 7),
      End: index + 6 - (index % 7),
    }[event.key];
    if (targetIndex === undefined) return;
    event.preventDefault();
    const day = days[targetIndex];
    if (!day) return;
    selectDay(day);
    dateButtons.current.get(localDateKey(day))?.focus();
  };
  const selectedBookings = bookingsForDay(bookings, selectedDay, studio)
    .slice()
    .sort(
      (first, second) =>
        new Date(first.start) - new Date(second.start) ||
        Number(Boolean(second.isMine)) - Number(Boolean(first.isMine)),
    );
  const selectedAvailability = getCalendarDayAvailability({
    studio,
    bookings: availabilityBookings,
    day: selectedDay,
    activityId: selectedActivityId || "",
    now: calendarNow,
  });

  return (
    <div
      data-calendar-month-scroll="true"
      className={`min-h-0 min-w-0 ${pageScroll ? "overflow-visible" : "flex-1 overflow-auto overscroll-contain"}`}
    >
      <div data-calendar-month-grid="true" className="min-w-0">
        <div
          data-calendar-grid-header="true"
          className="sticky top-0 z-30 grid grid-cols-7 border-b border-[var(--tenant-border)] bg-[var(--tenant-background)] backdrop-blur"
          style={
            pageScroll
              ? {
                  top: "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
                }
              : undefined
          }
        >
          {weekDays.map((label) => (
            <div
              key={label}
              className="px-0.5 py-2 text-center text-[10px] font-semibold uppercase text-[var(--tenant-muted-text)]"
            >
              <span className="sm:hidden">{label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayKey = localDateKey(day);
            const dayState = getCalendarDayState(
              day,
              calendarNow,
              studio?.timeZone,
            );
            const dayAvailability = getCalendarDayAvailability({
              studio,
              bookings: availabilityBookings,
              day,
              activityId: selectedActivityId || "",
              now: calendarNow,
            });
            const dayLabel = availabilityLabel(dayAvailability, t);
            const ownCount = bookingsForDay(bookings, day, studio).filter(
              (booking) => booking.isMine === true,
            ).length;
            const outsideMonth = day.getMonth() !== date.getMonth();
            const selected = dayKey === selectedKey;
            return (
              <button
                key={dayKey}
                ref={(element) => {
                  if (element) dateButtons.current.set(dayKey, element);
                  else dateButtons.current.delete(dayKey);
                }}
                type="button"
                onClick={() => selectDay(day)}
                onKeyDown={(event) => handleDayKey(event, index)}
                tabIndex={selected ? 0 : -1}
                aria-label={[
                  dateFormatter.format(day),
                  dayLabel,
                  ownCount > 0 &&
                    t("month.ownBookingCount", { count: ownCount }),
                ]
                  .filter(Boolean)
                  .join(", ")}
                aria-pressed={selected}
                aria-current={dayState === "today" ? "date" : undefined}
                data-calendar-month-day={dayKey}
                data-tenant-hover="preserve"
                data-calendar-month-selected={selected ? "true" : undefined}
                data-calendar-day-state={dayState}
                data-calendar-availability-state={dayAvailability.state}
                data-calendar-outside-month={outsideMonth ? "true" : "false"}
                data-calendar-has-own-booking={
                  ownCount > 0 ? "true" : undefined
                }
                className={cx(
                  "flex h-[84px] min-w-0 flex-col items-center justify-between border-b border-r border-[var(--tenant-border)] px-1 py-2 text-center text-[var(--tenant-text-on-surface)] transition hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--tenant-accent-on-surface)] sm:h-[96px] sm:px-2",
                  selected &&
                    "ring-2 ring-inset ring-[var(--tenant-accent-on-surface)]",
                  outsideMonth && "opacity-50",
                )}
                style={{
                  backgroundColor: getCustomerCalendarDaySurface(dayState),
                }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold sm:text-sm"
                  style={
                    dayState === "today"
                      ? {
                          backgroundColor: `var(--tenant-accent, ${SKAB_BRAND_COLORS.primary})`,
                          color: "var(--tenant-accent-foreground, #FFFFFF)",
                        }
                      : undefined
                  }
                >
                  {day.getDate()}
                </span>
                <span
                  className="flex h-4 items-center justify-center gap-1 text-[10px] font-semibold"
                  aria-hidden="true"
                >
                  {ownCount > 0 && (
                    <>
                      <UserIcon className="h-3 w-3" />
                      <span>{ownCount}</span>
                    </>
                  )}
                </span>
                <span
                  data-calendar-availability-label="true"
                  className="flex max-w-full items-center gap-1 text-[9px] sm:text-[10px]"
                  aria-hidden="true"
                >
                  <span
                    className={cx(
                      "hidden h-1.5 w-1.5 shrink-0 rounded-full sm:inline-block",
                      availabilityDot(dayAvailability.state),
                    )}
                  />
                  <span className="min-w-0 truncate">{dayLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <section
        data-calendar-month-agenda={selectedKey}
        aria-labelledby={agendaHeadingId}
        className="space-y-4 border-t border-[var(--tenant-border)] p-3 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3
              id={agendaHeadingId}
              aria-live="polite"
              aria-atomic="true"
              className="text-base font-semibold text-[var(--tenant-text-on-surface)] sm:text-lg"
            >
              {t("month.selectedDay", {
                date: dateFormatter.format(selectedDay),
              })}
            </h3>
            <p className="text-xs text-[var(--tenant-muted-on-surface)]">
              {availabilityLabel(selectedAvailability, t)}
            </p>
          </div>
          {typeof onDateSelect === "function" && (
            <button
              type="button"
              data-calendar-month-view-day="true"
              onClick={() => onDateSelect(selectedDay)}
              className="min-h-11 rounded-full border border-[var(--tenant-accent-on-surface)] px-4 text-sm font-semibold text-[var(--tenant-accent-on-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)]"
            >
              {t(
                selectedAvailability.isBookable
                  ? "month.findTime"
                  : "month.viewDay",
              )}
            </button>
          )}
        </div>
        {selectedBookings.length ? (
          <ul className="space-y-2">
            {selectedBookings.map((event) => (
              <li key={event.id}>
                <AgendaBooking
                  event={event}
                  studio={studio}
                  locale={locale}
                  audience={audience}
                  onBookingClick={onBookingClick}
                  t={t}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--tenant-border)] px-4 py-6 text-sm text-[var(--tenant-muted-on-surface)]">
            {t("month.noBookings")}
          </p>
        )}
      </section>
    </div>
  );
}
