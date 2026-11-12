"use client";

import { UserIcon } from "@heroicons/react/24/outline";

import CalendarActivityIcon from "./CalendarActivityIcon";
import { getCalendarBookingActivity } from "./calendar.activity";
import CalendarBookingModeBadge from "./CalendarBookingModeBadge";
import CalendarOwnBookingBadge, {
  ownBookingOutlineStyle,
} from "./CalendarOwnBookingBadge";
import CalendarTooltip, { useCalendarTooltip } from "./CalendarTooltip";
import {
  getCalendarBookingPresentation,
  getCalendarEventColor,
  getCalendarProductKey,
} from "./calendar.presentation";
import { cx, formatRange, formatTime } from "./calendar.utils";

export default function CalendarEventCard({
  event,
  studio,
  locale,
  compact = false,
  audience = "tenant",
  t,
  fullLabel,
  style,
  className,
  onClick,
}) {
  const tooltip = useCalendarTooltip();
  const customerThemed = ["customer", "public"].includes(audience);
  const isMine = event.isMine === true || event.tone === "mine";
  const presentation = getCalendarBookingPresentation(event, { t, fullLabel });
  const activity = getCalendarBookingActivity(event, studio, t);
  const color =
    event.isSuggested && customerThemed
      ? {
          legacyTone: {
            dot: "bg-[var(--tenant-accent-on-surface)]",
            card: "border-[var(--tenant-accent-on-surface)]/45 bg-[color-mix(in_srgb,var(--tenant-accent)_13%,var(--tenant-surface))] text-[#202838]",
          },
        }
      : getCalendarEventColor(event);
  const range = formatRange(event.start, event.end, locale, studio?.timeZone);
  const startTime = formatTime(event.start, locale, studio?.timeZone);
  const supportingText =
    audience === "tenant"
      ? [event.customerName, event.teamMemberName].filter(Boolean).join(" · ")
      : event.subtitle;
  const accessibleLabel = [
    presentation.title,
    activity?.label,
    presentation.modeLabel,
    presentation.full && presentation.fullLabel,
    isMine && presentation.myBookingLabel,
    presentation.peopleLabel,
    presentation.attendanceLabel !== presentation.peopleLabel &&
      presentation.attendanceLabel,
    presentation.customerLabel,
    range,
    supportingText,
  ]
    .filter(Boolean)
    .join(", ");
  const hasFixedHeight =
    style && Object.prototype.hasOwnProperty.call(style, "height");
  const pixelHeight =
    typeof style?.height === "number"
      ? style.height
      : /^\d+(\.\d+)?px$/.test(style?.height || "")
        ? Number.parseFloat(style.height)
        : Infinity;
  const tight = pixelHeight < 44;
  const inlineOwnership = pixelHeight < 60;
  const showMode = pixelHeight >= (isMine ? 84 : 60);
  const showCustomer = pixelHeight >= (isMine ? 100 : 72);
  const showSupporting = !compact && pixelHeight >= (isMine ? 132 : 112);
  const interactive =
    typeof onClick === "function" &&
    (!customerThemed ||
      audience === "customer" ||
      event.isSuggested === true ||
      isMine ||
      event.actionable === true ||
      event.isActionable === true ||
      event.canOpen === true ||
      event.canCancel === true);
  const EventElement = interactive ? "button" : "article";
  const eventStyle = color.legacyTone
    ? undefined
    : {
        backgroundColor: color.background,
        borderColor: color.border,
        color: color.text,
      };

  return (
    <>
      <EventElement
        {...tooltip.triggerProps}
        type={interactive ? "button" : undefined}
        data-calendar-event-card="true"
        data-calendar-booking-id={event.id || undefined}
        data-calendar-product={getCalendarProductKey(event) || undefined}
        data-calendar-booking-mode={
          presentation.isBooking
            ? presentation.isPrivate
              ? "private"
              : "public"
            : undefined
        }
        data-calendar-suggested-event={event.isSuggested ? "true" : undefined}
        data-calendar-my-booking={isMine ? "true" : undefined}
        data-calendar-event-interactive={interactive ? "true" : "false"}
        data-tenant-hover={
          interactive && customerThemed ? "preserve" : undefined
        }
        onPointerDown={
          interactive
            ? (pointerEvent) => pointerEvent.stopPropagation()
            : undefined
        }
        onClick={
          interactive
            ? (clickEvent) => {
                clickEvent.stopPropagation();
                tooltip.close();
                if (audience === "customer" && clickEvent.detail > 0)
                  onClick(event, clickEvent);
                else onClick(event);
              }
            : undefined
        }
        style={{
          ...eventStyle,
          ...style,
          ...(isMine ? ownBookingOutlineStyle : {}),
        }}
        aria-label={accessibleLabel}
        className={cx(
          "group @container/calendar-card relative flex min-w-0 max-w-full flex-col items-stretch justify-start overflow-hidden rounded-[9px] border pl-3 pr-1 text-left shadow-[0_3px_9px_rgba(31,31,31,0.06)] transition [&>*]:shrink-0",
          tight && isMine
            ? "py-0"
            : tight || (isMine && pixelHeight < 76)
              ? "py-0.5"
              : "py-1",
          interactive &&
            "cursor-pointer hover:z-20 hover:shadow-[0_6px_16px_rgba(31,31,31,0.12)] focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202838]",
          color.legacyTone?.card,
          isMine && "border-2",
          !hasFixedHeight && (compact ? "min-h-[76px]" : "min-h-[82px]"),
          className,
        )}
      >
        <span
          data-calendar-event-accent="true"
          aria-hidden="true"
          style={color.accent ? { backgroundColor: color.accent } : undefined}
          className={cx(
            "absolute bottom-1 left-1 top-1 w-[3px] rounded-full",
            color.legacyTone?.dot,
          )}
        />

        <p
          data-calendar-event-time="true"
          className="min-w-0 truncate text-[10px] font-semibold leading-[12px] tabular-nums"
        >
          <span className="@[105px]/calendar-card:hidden">{startTime}</span>
          <span className="hidden @[105px]/calendar-card:inline">{range}</span>
        </p>

        <div
          className={cx("flex min-w-0 items-center gap-1", !tight && "mt-0.5")}
        >
          <CalendarActivityIcon
            activity={activity}
            className={tight ? "h-3 w-3" : "h-3.5 w-3.5"}
          />
          <p
            className={cx(
              "min-w-0 flex-1 truncate font-semibold tracking-[-0.015em]",
              tight
                ? "text-[10px] leading-[12px]"
                : compact
                  ? "text-[11px] leading-[14px]"
                  : "text-[12px] leading-[15px]",
            )}
          >
            {presentation.title}
          </p>
          {isMine && inlineOwnership && (
            <CalendarOwnBookingBadge
              label={presentation.myBookingLabel}
              tight
              iconOnly
            />
          )}
        </div>

        {isMine && !inlineOwnership && (
          <div className="mt-0.5 flex min-w-0">
            <CalendarOwnBookingBadge
              label={presentation.myBookingLabel}
              collapseLabel
            />
          </div>
        )}

        {presentation.isBooking && showMode && (
          <div
            className={cx(
              "mt-1 min-w-0 items-center gap-1 text-[10px] leading-[14px]",
              customerThemed ? "hidden @[84px]/calendar-card:flex" : "flex",
            )}
          >
            <CalendarBookingModeBadge
              isPrivate={presentation.isPrivate}
              label={presentation.modeLabel}
              compact
            />
            {presentation.full && (
              <span
                data-calendar-full-badge="true"
                className={cx(
                  "shrink-0 rounded bg-[#9F1239] px-1 text-[9px] font-semibold leading-[13px] text-white",
                  customerThemed && "hidden @[120px]/calendar-card:inline",
                )}
              >
                {presentation.fullLabel}
              </span>
            )}
            {presentation.attendanceLabel && (
              <span className="inline-flex min-w-0 items-center gap-0.5 font-semibold">
                <UserIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] leading-[12px] tabular-nums">
                  {presentation.attendanceLabel}
                </span>
              </span>
            )}
          </div>
        )}

        {showCustomer && presentation.customerReference && (
          <p
            data-calendar-customer-reference="true"
            className="mt-0.5 truncate text-[10px] font-medium leading-[12px] tabular-nums"
          >
            {presentation.customerReference}
          </p>
        )}

        {showSupporting && supportingText && (
          <p className="mt-1 truncate text-[10px] leading-[13px]">
            {supportingText}
          </p>
        )}
      </EventElement>
      <CalendarTooltip {...tooltip.tooltipProps}>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug">
            {presentation.title}
          </p>
          <p className="font-semibold tabular-nums">{range}</p>
          {activity && (
            <p className="flex items-center gap-1.5 text-[11px]">
              <CalendarActivityIcon activity={activity} />
              <span>{activity.label}</span>
            </p>
          )}
          {isMine && (
            <CalendarOwnBookingBadge label={presentation.myBookingLabel} />
          )}
          {presentation.isBooking && (
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
              <span>{presentation.modeLabel}</span>
              {presentation.peopleLabel && (
                <span>{presentation.peopleLabel}</span>
              )}
              {presentation.full && <span>{presentation.fullLabel}</span>}
            </p>
          )}
          {presentation.customerReference && (
            <p className="text-[11px] tabular-nums">
              {presentation.customerReference}
            </p>
          )}
          {audience === "tenant" && supportingText && (
            <p className="text-[11px]">{supportingText}</p>
          )}
        </div>
      </CalendarTooltip>
    </>
  );
}
