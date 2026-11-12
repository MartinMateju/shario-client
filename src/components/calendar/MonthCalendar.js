"use client";

import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import CalendarEventCard from "./CalendarEventCard";
import CalendarActivityIcon from "./CalendarActivityIcon";
import { getCalendarBookingActivity } from "./calendar.activity";
import CompactMonthCalendar from "./CompactMonthCalendar";
import CalendarOwnBookingBadge, {
  ownBookingOutlineStyle,
} from "./CalendarOwnBookingBadge";
import {
  getCalendarEventColor,
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
  getCustomerCalendarSlotSurface,
  getMonthDays,
  localDateKey,
} from "./calendar.utils";

const getAvailabilityLabel = (availability, t) => {
  if (availability.state === "closed") return t("events.closed");
  if (["blocked", "past"].includes(availability.state)) {
    return t("events.unavailable");
  }
  if (availability.isBookable && availability.remaining == null) {
    return t("toolbar.newBooking");
  }

  return t("events.availability", {
    remaining: Math.max(0, Number(availability.remaining) || 0),
  });
};

export default function MonthCalendar(props) {
  return ["customer", "public"].includes(props.audience) ? (
    <CompactMonthCalendar {...props} />
  ) : (
    <DetailedMonthCalendar {...props} />
  );
}

function DetailedMonthCalendar({
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
  const days = getMonthDays(date);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 1 + index),
    ),
  );
  const calendarNow = new Date();
  const customerThemed = ["customer", "public"].includes(audience);

  return (
    <div
      data-calendar-month-scroll="true"
      className={`min-h-0 min-w-0 ${
        pageScroll
          ? "overflow-visible"
          : "flex-1 overflow-auto overscroll-contain"
      }`}
    >
      <div data-calendar-month-grid="true" className="min-w-0 lg:min-w-[760px]">
        <div
          data-calendar-grid-header="true"
          className={cx(
            "sticky top-0 z-30 grid grid-cols-7 border-b backdrop-blur",
            customerThemed
              ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
              : "border-[#CBD5E1] bg-[#F8FAFC]/95",
          )}
          style={
            pageScroll && customerThemed
              ? {
                  top: "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
                }
              : undefined
          }
        >
          {weekDays.map((label) => (
            <div
              key={label}
              className={cx(
                "border-r px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.04em] last:border-r-0 sm:px-3 sm:py-3 sm:tracking-[0.12em]",
                customerThemed
                  ? "border-[var(--tenant-border)] text-[var(--tenant-muted-text)]"
                  : "border-[#CBD5E1] text-[#475569]",
              )}
            >
              <span className="sm:hidden">{label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayBookings = bookingsForDay(bookings, day, studio);
            const orderedBookings = [...dayBookings].sort(
              (a, b) => Number(Boolean(b.isMine)) - Number(Boolean(a.isMine)),
            );
            const outsideMonth = day.getMonth() !== date.getMonth();
            const dayState = getCalendarDayState(
              day,
              calendarNow,
              studio?.timeZone,
            );
            const isToday = dayState === "today";
            const dayAvailability = getCalendarDayAvailability({
              studio,
              bookings: availabilityBookings,
              day,
              activityId: selectedActivityId || "",
              now: calendarNow,
            });
            const availabilityText = getAvailabilityLabel(dayAvailability, t);
            const nextAvailableTime = dayAvailability.nextAvailable
              ? formatTime(
                  dayAvailability.nextAvailable.start,
                  locale,
                  studio?.timeZone,
                )
              : "";
            const availabilityDisplayText = nextAvailableTime
              ? `${nextAvailableTime} · ${availabilityText}`
              : availabilityText;
            const hasOwnBooking = dayBookings.some((booking) => booking.isMine);
            const bookingPreviewLimit = customerThemed ? 2 : 3;
            const dateLabel = new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(day);

            return (
              <div
                key={localDateKey(day)}
                data-calendar-month-day={localDateKey(day)}
                data-calendar-outside-month={outsideMonth ? "true" : "false"}
                className={cx(
                  "group relative min-w-0 border-b border-r p-1 text-left transition sm:p-2.5",
                  customerThemed
                    ? "min-h-[82px] sm:min-h-[132px] border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)] hover:brightness-[0.985]"
                    : "min-h-[68px] sm:min-h-[124px] border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]",
                  !customerThemed && !outsideMonth && "bg-white",
                  outsideMonth &&
                    (customerThemed
                      ? "opacity-[0.58] grayscale-[0.25]"
                      : "bg-[#F1F5F9] text-[#475569]"),
                )}
                style={
                  customerThemed
                    ? {
                        backgroundColor:
                          getCustomerCalendarDaySurface(dayState),
                      }
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => onDateSelect(day)}
                  aria-label={`${dateLabel}, ${availabilityDisplayText}${
                    hasOwnBooking ? `, ${t("events.myBooking")}` : ""
                  }`}
                  aria-current={isToday ? "date" : undefined}
                  data-calendar-day-state={dayState}
                  data-calendar-availability-state={dayAvailability.state}
                  data-calendar-outside-month={outsideMonth ? "true" : "false"}
                  data-calendar-has-own-booking={
                    hasOwnBooking ? "true" : undefined
                  }
                  data-tenant-hover={customerThemed ? "preserve" : undefined}
                  className={cx(
                    "min-h-11 w-full min-w-0 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset",
                    customerThemed
                      ? "focus-visible:after:ring-[var(--tenant-accent-on-surface)]/25"
                      : "focus-visible:after:ring-brand-primary/25",
                  )}
                >
                  <div className="flex min-w-0 items-center justify-between gap-1">
                    <span
                      className={cx(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium sm:text-[11px]",
                      )}
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

                    {dayBookings.length > 0 && (
                      <span
                        className={cx(
                          "hidden min-w-0 truncate text-right text-[9px] sm:block",
                          customerThemed
                            ? outsideMonth
                              ? "text-[var(--tenant-muted-text)]"
                              : "text-[var(--tenant-muted-on-surface)] group-hover:text-[var(--tenant-muted-text)]"
                            : "text-[#475569]",
                        )}
                      >
                        {t("month.bookingCount", { count: dayBookings.length })}
                      </span>
                    )}
                  </div>

                  {customerThemed && (
                    <div className="mt-1.5 min-w-0 space-y-1">
                      <span
                        data-calendar-availability-label="true"
                        className={cx(
                          "flex min-h-5 w-full min-w-0 items-center rounded-[6px] border px-1 py-0.5 text-[9px] font-semibold leading-tight sm:min-h-6 sm:px-1.5 sm:text-[10px]",
                          dayAvailability.isBookable
                            ? "border-[var(--tenant-accent-on-surface)]/20 text-[var(--tenant-accent-on-surface)]"
                            : "border-[var(--tenant-border)] text-[var(--tenant-muted-on-surface)]",
                        )}
                        style={{
                          backgroundColor: getCustomerCalendarSlotSurface(
                            dayAvailability.state,
                          ),
                          ...(dayAvailability.state === "available"
                            ? {
                                borderColor: `color-mix(in srgb, var(--tenant-calendar-available-accent, ${SKAB_BRAND_COLORS.primary}) 20%, transparent)`,
                                color: `var(--tenant-calendar-available-accent, ${SKAB_BRAND_COLORS.primary})`,
                              }
                            : {}),
                        }}
                      >
                        <span className="truncate sm:hidden">
                          {availabilityText}
                        </span>
                        <span className="hidden truncate sm:inline">
                          {availabilityDisplayText}
                        </span>
                      </span>

                      {hasOwnBooking && (
                        <span
                          className={cx(
                            "min-h-5 w-full min-w-0 items-center",
                            audience === "customer" &&
                              typeof onBookingClick === "function"
                              ? "hidden sm:flex"
                              : "flex",
                          )}
                        >
                          <CalendarOwnBookingBadge
                            label={t("events.myBooking")}
                          />
                        </span>
                      )}
                    </div>
                  )}

                  {dayBookings.length > 0 && (
                    <div className="mt-1 flex min-w-0 items-center gap-1 sm:hidden">
                      <div className="flex shrink-0 gap-0.5" aria-hidden="true">
                        {orderedBookings.slice(0, 3).map((booking) => {
                          const color = getCalendarEventColor(booking);
                          return (
                            <span
                              key={booking.id}
                              style={
                                color.accent
                                  ? {
                                      backgroundColor:
                                        color.border || color.accent,
                                    }
                                  : undefined
                              }
                              className={cx(
                                "h-1.5 w-1.5 rounded-full",
                                color.legacyTone?.dot,
                              )}
                            />
                          );
                        })}
                      </div>
                      <span
                        className={cx(
                          "min-w-0 truncate text-[8px] font-medium",
                          customerThemed
                            ? "text-[var(--tenant-muted-on-surface)]"
                            : "text-[#475569]",
                        )}
                      >
                        {t("month.bookingCount", { count: dayBookings.length })}
                      </span>
                    </div>
                  )}
                </button>

                {audience === "customer" &&
                  typeof onBookingClick === "function" &&
                  hasOwnBooking && (
                    <div className="relative z-10 mt-1 space-y-1 sm:hidden">
                      {orderedBookings
                        .filter((booking) => booking.isMine === true)
                        .map((booking) => {
                          const activity = getCalendarBookingActivity(
                            booking,
                            studio,
                            t,
                          );
                          return (
                            <button
                              key={booking.id}
                              type="button"
                              data-calendar-month-own-booking={booking.id}
                              onClick={() => onBookingClick(booking)}
                              aria-label={[
                                t("events.myBooking"),
                                booking.title,
                                activity?.label,
                                formatRange(
                                  booking.start,
                                  booking.end,
                                  locale,
                                  studio?.timeZone,
                                ),
                              ]
                                .filter(Boolean)
                                .join(", ")}
                              style={{
                                ...getCalendarEventSurfaceStyle(booking),
                                ...ownBookingOutlineStyle,
                              }}
                              className="flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md border-2 px-0.5 py-1 text-[9px] font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)]"
                            >
                              <CalendarOwnBookingBadge
                                label={t("events.myBooking")}
                              />
                              <span className="inline-flex items-center gap-1">
                                <CalendarActivityIcon
                                  activity={activity}
                                  className="h-3 w-3"
                                />
                                {formatTime(
                                  booking.start,
                                  locale,
                                  studio?.timeZone,
                                )}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}

                <div className="relative z-10 mt-2 hidden space-y-1 sm:block">
                  {orderedBookings
                    .slice(0, bookingPreviewLimit)
                    .map((booking) => (
                      <CalendarEventCard
                        key={booking.id}
                        event={booking}
                        studio={studio}
                        locale={locale}
                        audience={audience}
                        t={t}
                        compact
                        onClick={onBookingClick}
                        className="w-full"
                        fullLabel={t("events.availability", { remaining: 0 })}
                      />
                    ))}
                  {dayBookings.length > bookingPreviewLimit && (
                    <button
                      type="button"
                      onClick={() => onDateSelect(day)}
                      className={cx(
                        "min-h-11 w-full px-1 text-left text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                        customerThemed
                          ? outsideMonth
                            ? "text-[var(--tenant-accent-link)]"
                            : "text-[var(--tenant-accent-on-surface)] group-hover:text-[var(--tenant-accent-link)]"
                          : "text-primary-text",
                      )}
                    >
                      {t("month.more", {
                        count: dayBookings.length - bookingPreviewLimit,
                      })}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
