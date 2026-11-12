"use client";

import styles from "./overview.module.css";

import {
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

import {
  formatOverviewDateShort,
  shiftOverviewDateKey,
} from "./overview.utils";

export default function OverviewDateNavigation({
  dateValue,
  onDateChange,
  todayValue,
}) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.overview");
  const dateInputRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const formattedDate = formatOverviewDateShort(dateValue, locale);
  const resolvedTodayValue = todayValue || dateValue;
  const isToday = dateValue === resolvedTodayValue;
  const previousDate = shiftOverviewDateKey(dateValue, -1);
  const nextDate = shiftOverviewDateKey(dateValue, 1);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Some browsers expose showPicker but restrict it. Use the native click.
    }

    input.click();
  };

  return (
    <div
      data-overview-date-control
      role="group"
      aria-label={`${t("flow.title")}: ${formattedDate}`}
      lang={locale}
      className={`${styles.module} ${styles.dateControl} grid min-h-[54px] w-full shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center rounded-[16px] border border-[var(--studio-rule)] bg-[var(--studio-white)] px-1 sm:w-[260px]`}
    >
      <button
        type="button"
        aria-label={t("dateNavigation.previousDay")}
        disabled={!previousDate}
        onClick={() => previousDate && onDateChange(previousDate)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] text-[var(--studio-blue)] transition hover:bg-[var(--overview-blue-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cobalt-200/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-center justify-center">
        {isToday ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[var(--overview-blue-soft)] text-[var(--studio-blue)] max-[359px]:hidden">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <button
            type="button"
            title={t("dateNavigation.backToToday")}
            aria-label={t("dateNavigation.backToToday")}
            onClick={() => {
              onDateChange(resolvedTodayValue);
              queueMicrotask(() => dateTriggerRef.current?.focus());
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[var(--studio-blue)] transition hover:bg-[var(--overview-blue-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cobalt-200/70"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <button
          ref={dateTriggerRef}
          type="button"
          data-overview-date-trigger
          aria-label={`${t("dateNavigation.chooseDate")}: ${formattedDate}`}
          onClick={openDatePicker}
          className="group flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-[12px] px-1 text-left transition hover:bg-[var(--overview-blue-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cobalt-200/70"
        >
          <span className="min-w-0">
            <span
              className={`${styles.dateLabel} block truncate leading-3 text-[var(--studio-muted)]`}
            >
              {t(isToday ? "dateNavigation.today" : "snapshot.date")}
            </span>
            <span
              data-overview-date-label
              aria-live="polite"
              aria-atomic="true"
              className="block truncate text-[13px] font-medium leading-4 text-[var(--studio-ink)] tabular-nums"
            >
              {formattedDate}
            </span>
          </span>
        </button>
      </div>

      <button
        type="button"
        aria-label={t("dateNavigation.nextDay")}
        disabled={!nextDate}
        onClick={() => nextDate && onDateChange(nextDate)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] text-[var(--studio-blue)] transition hover:bg-[var(--overview-blue-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cobalt-200/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <input
        ref={dateInputRef}
        data-overview-date-input
        type="date"
        value={dateValue}
        lang={locale}
        aria-label={t("dateLabel")}
        onChange={(event) => {
          if (event.target.value) {
            onDateChange(event.target.value);
            queueMicrotask(() => dateTriggerRef.current?.focus());
          }
        }}
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
}
