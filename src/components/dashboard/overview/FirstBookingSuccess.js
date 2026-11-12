"use client";

import styles from "./overview.module.css";

import {
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function FirstBookingSuccess({ onDismiss }) {
  const t = useTranslations("Dashboard.overview.firstBooking");

  return (
    <section
      role="status"
      aria-live="polite"
      data-first-booking-success
      className={`${styles.module} ${styles.card} ${styles.success}`}
    >
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--studio-white)] text-[var(--overview-success)] shadow-none ring-1 ring-[#CFE8DA]">
          <SparklesIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              className="h-4 w-4 shrink-0 text-[var(--overview-success)]"
              aria-hidden="true"
            />
            <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--studio-ink)]">
              {t("title")}
            </h2>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-[var(--studio-muted)]">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("dismiss")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[var(--studio-muted)] transition hover:bg-[var(--studio-white)] hover:text-[var(--studio-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
