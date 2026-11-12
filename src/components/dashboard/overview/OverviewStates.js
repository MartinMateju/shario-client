"use client";

import styles from "./overview.module.css";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export function OverviewSkeleton() {
  return (
    <div
      className={`${styles.module} space-y-5`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-[176px] animate-pulse rounded-[22px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
      <div className="h-[180px] animate-pulse rounded-[22px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(350px,0.8fr)]">
        <div className="h-[300px] animate-pulse rounded-[24px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
        <div className="space-y-4">
          <div className="h-[190px] animate-pulse rounded-[24px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
          <div className="h-[96px] animate-pulse rounded-[24px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
        </div>
      </div>
    </div>
  );
}

export function OverviewError({ onRetry }) {
  const t = useTranslations("Dashboard.overview");

  return (
    <section
      className={`${styles.module} ${styles.card} flex min-h-[320px] flex-col items-center justify-center text-center`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--overview-clay-soft)] text-[var(--studio-clay)]">
        <ExclamationTriangleIcon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[24px] font-medium tracking-[-0.035em] text-[var(--studio-ink)]">
        {t("error.title")}
      </h2>
      <p className="mt-2 max-w-md text-[12px] leading-5 text-[var(--studio-muted)]">
        {t("error.description")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`${styles.action} ${styles.primary} mt-5`}
      >
        <ArrowPathIcon className="h-4 w-4" />
        {t("error.retry")}
      </button>
    </section>
  );
}
