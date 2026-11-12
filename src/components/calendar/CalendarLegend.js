import {
  LockClosedIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import CalendarOwnBookingBadge from "./CalendarOwnBookingBadge";
import CalendarActivityIcon from "./CalendarActivityIcon";
import {
  CALENDAR_BOOKING_ACTIVITIES,
  isCalendarActivityRequired,
} from "./calendar.activity";
import { getCalendarActivityName } from "./calendar.resources";
import { CALENDAR_BOOKING_COLORS } from "./calendar.presentation";
import { cx } from "./calendar.utils";

export default function CalendarLegend({ audience, studio, t }) {
  const customerThemed = ["customer", "public"].includes(audience);
  const shown = [
    { key: "public", label: t("events.bookingPublic"), Icon: UserGroupIcon },
    { key: "private", label: t("events.bookingPrivate"), Icon: LockClosedIcon },
  ];
  const availabilityItems = customerThemed
    ? [
        {
          key: "available",
          label: t("availability.available"),
          state: "available",
        },
        {
          key: "limited",
          label: t("availability.limited"),
          state: "limited",
        },
      ]
    : [];

  return (
    <div
      data-customer-calendar-legend={customerThemed || undefined}
      role="list"
      className={`flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-[11px] ${
        customerThemed
          ? "text-[var(--tenant-muted-on-surface)]"
          : "text-[#666663]"
      }`}
    >
      {customerThemed && (
        <span
          role="listitem"
          data-calendar-availability-legend="mine"
          className="inline-flex items-center gap-1.5"
        >
          <CalendarOwnBookingBadge label={t("events.myBooking")} />
        </span>
      )}
      {availabilityItems.map(({ key, label, state }) => (
        <span
          key={`availability:${key}`}
          role="listitem"
          data-calendar-availability-legend={state}
          className="inline-flex min-w-0 items-center gap-1.5"
        >
          <PlusIcon
            aria-hidden="true"
            className={cx(
              "h-3.5 w-3.5 shrink-0",
              state === "limited" ? "text-[#855500]" : "text-[#316544]",
            )}
          />
          <span className="min-w-0 break-words">{label}</span>
        </span>
      ))}
      {customerThemed && (
        <span
          aria-hidden="true"
          className="h-4 border-l border-[var(--tenant-border)]"
        />
      )}
      {shown.map(({ key, label, Icon }) => (
        <span
          key={key}
          role="listitem"
          data-calendar-mode-legend={key}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5"
        >
          <span
            aria-hidden="true"
            style={{
              backgroundColor: CALENDAR_BOOKING_COLORS[key].background,
              borderColor: CALENDAR_BOOKING_COLORS[key].border,
              color: CALENDAR_BOOKING_COLORS[key].text,
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 break-words font-medium">{label}</span>
        </span>
      ))}

      {isCalendarActivityRequired(studio) &&
        CALENDAR_BOOKING_ACTIVITIES.map((id) => {
          const activity = {
            id,
            label: getCalendarActivityName(studio, id, t),
          };
          return (
            <span
              key={id}
              role="listitem"
              data-calendar-activity-legend={id}
              className="inline-flex min-w-0 max-w-full items-center gap-1.5"
            >
              <CalendarActivityIcon activity={activity} className="h-4 w-4" />
              <span className="min-w-0 break-words">{activity.label}</span>
            </span>
          );
        })}

      {!customerThemed && (
        <>
          <span
            role="listitem"
            data-calendar-availability-legend="full"
            className="inline-flex items-center"
          >
            <span className="rounded bg-[#9F1239] px-1.5 py-0.5 font-semibold text-white">
              {t("events.full")}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
