"use client";

import styles from "./overview.module.css";

import {
  ChevronRightIcon,
  MapPinIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import {
  cx,
  formatOverviewDate,
  formatOverviewTime,
  getScheduleTone,
} from "./overview.utils";

const TONES = {
  cobalt: "border-[var(--studio-rule)] bg-[var(--overview-blue-soft)]",
  sand: "border-[var(--studio-rule)] bg-[var(--overview-sand-soft)]",
  sage: "border-[#DCE7D8] bg-[#F1F6EF]",
  coral: "border-[var(--studio-rule)] bg-[var(--overview-clay-soft)]",
};

const DOTS = {
  cobalt: "bg-[var(--studio-blue)]",
  sand: "bg-[var(--overview-sand-soft)]",
  sage: "bg-[#8EB09B]",
  coral: "bg-[var(--overview-clay-soft)]",
};

export default function TodayRhythm({
  dateValue,
  isToday = true,
  today,
  timezone,
}) {
  const t = useTranslations("Dashboard.overview");
  const locale = useLocale();
  const schedule = Array.isArray(today.schedule)
    ? [...today.schedule].sort(
        (left, right) =>
          new Date(left.start).getTime() - new Date(right.start).getTime(),
      )
    : null;

  return (
    <section className={`${styles.module} ${styles.card}`}>
      <div>
        <h2 className="text-[20px] font-medium tracking-[-0.035em] text-[var(--studio-ink)]">
          {isToday ? t("rhythm.title") : formatOverviewDate(dateValue, locale)}
        </h2>
        <p className="mt-1 text-[12px] text-[var(--studio-muted)]">
          {t("rhythm.subtitle")}
        </p>
      </div>

      {!today.available || schedule === null ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-[var(--studio-rule)] bg-[var(--studio-paper)] px-4 py-8 text-center text-[12px] text-[var(--studio-muted)]">
          {t("rhythm.unavailable")}
        </div>
      ) : schedule.length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-[var(--studio-rule)] bg-[var(--studio-paper)] px-4 py-8 text-center">
          <p className="text-[12px] font-medium text-[var(--studio-ink)]">
            {t("rhythm.emptyTitle")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--studio-muted)]">
            {t("rhythm.emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="relative mt-5 space-y-2">
          <span
            className="absolute bottom-5 left-[74px] top-5 hidden w-px bg-[var(--studio-rule)] sm:block"
            aria-hidden="true"
          />
          {schedule.slice(0, 6).map((item, index) => {
            const tone = getScheduleTone(item.productType, index);
            const participants = Number(item.participantCount ?? 0);
            const capacity =
              typeof item.capacity === "number" ? item.capacity : null;

            return (
              <Link
                key={item.id || `${item.start}-${index}`}
                href={
                  item.id
                    ? `/app/bookings?bookingId=${encodeURIComponent(item.id)}`
                    : "/app/calendar"
                }
                className="group grid gap-2 sm:grid-cols-[76px_minmax(0,1fr)] sm:items-center"
              >
                <div className="relative hidden pr-3 text-right sm:block">
                  <span className="text-[12px] font-medium text-[var(--studio-muted)]">
                    {formatOverviewTime(item.start, locale, timezone)}
                  </span>
                  <span
                    className={cx(
                      "absolute right-[-4px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-4 ring-white",
                      DOTS[tone],
                    )}
                    aria-hidden="true"
                  />
                </div>
                <div
                  className={cx(
                    "flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border px-4 py-3 transition",
                    TONES[tone],
                  )}
                >
                  <div className="min-w-0 flex-1 basis-[180px]">
                    <p className="break-words text-[14px] font-medium text-[var(--studio-ink)]">
                      {item.title || t("rhythm.untitled")}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--studio-muted)] sm:hidden">
                      <span>
                        {formatOverviewTime(item.start, locale, timezone)}–
                        {formatOverviewTime(item.end, locale, timezone)}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--studio-rule)] bg-[var(--studio-white)] px-2 py-1 text-[12px] text-[var(--studio-muted)]">
                    <MapPinIcon className="h-3 w-3" />
                    {item.locationName || t("rhythm.locationFallback")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--studio-muted)]">
                    <UserGroupIcon className="h-3.5 w-3.5" />
                    {capacity !== null
                      ? `${participants}/${capacity}`
                      : t("rhythm.guests", { count: participants })}
                    <ChevronRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
