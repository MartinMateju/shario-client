"use client";

import styles from "./overview.module.css";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { buildPulsePath } from "./overview.utils";

function Metric({ value, label, available }) {
  return (
    <div className="min-w-0 border-r border-[var(--studio-rule)] px-3 first:pl-0 last:border-r-0 last:pr-0">
      <p className="break-words text-[24px] font-medium tracking-[-0.04em] text-[var(--studio-ink)]">
        {available ? value : "—"}
      </p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--studio-muted)]">
        {label}
      </p>
    </div>
  );
}

export function BusinessPulseCard({ pulse }) {
  const t = useTranslations("Dashboard.overview");
  const path = buildPulsePath(pulse.series.points ?? []);

  return (
    <section className={`${styles.module} ${styles.card}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-medium tracking-[-0.035em] text-[var(--studio-ink)]">
          {t("pulse.title")}
        </h2>
        <Link
          href="/app/operations?section=statistics"
          className="inline-flex min-h-11 items-center text-[13px] font-medium text-[var(--studio-blue)] transition hover:underline"
        >
          {t("pulse.openReports")}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-4">
        <Metric
          available={pulse.occupancy.available}
          value={`${Math.round(pulse.occupancy.value ?? 0)}%`}
          label={t("pulse.occupancy")}
        />
        <Metric
          available={pulse.newCustomers.available}
          value={pulse.newCustomers.value}
          label={t("pulse.newCustomers")}
        />
      </div>

      <div className="mt-4 h-[58px]">
        {pulse.series.available && path ? (
          <svg
            viewBox="0 0 460 68"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={t("pulse.chartLabel")}
          >
            <path
              d={path}
              fill="none"
              stroke="var(--studio-blue)"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              x2="460"
              y1="63"
              y2="63"
              stroke="var(--studio-rule)"
              strokeDasharray="4 4"
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[14px] border border-dashed border-[var(--studio-rule)] text-[12px] text-[var(--studio-muted)]">
            {t("pulse.noTrend")}
          </div>
        )}
      </div>
    </section>
  );
}

export function AiOpportunityCard({ opportunity, canOpenAdvisor = false }) {
  const t = useTranslations("Dashboard.overview");
  const details = opportunity?.details ?? {};
  const opportunityValues = {
    value: opportunity.value ?? 0,
    course: details.courseName || t("opportunity.courseFallback"),
    sessions: details.highFillSessionCount ?? details.sessionCount ?? 0,
    time: details.localStartTime || "—",
    day: details.weekdayKey
      ? t(`opportunity.weekdays.${details.weekdayKey}`)
      : t("opportunity.weekdays.unknown"),
  };

  if (!opportunity.available || !opportunity.key) {
    return (
      <section
        className={`${styles.module} ${styles.card} flex min-h-[96px] items-center gap-3`}
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--overview-success-soft)] text-[var(--overview-success)]"
        >
          <CheckCircleIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--overview-success)]">
            {t("opportunity.eyebrow")}
          </h2>
          <p className="mt-1 text-[14px] leading-5 text-[var(--studio-muted)]">
            {t("opportunity.none")}
          </p>
        </div>
      </section>
    );
  }

  const actionKey = opportunity.actionKey || "createOffer";
  const isCreateOfferAction = actionKey === "createOffer";
  const actionHref = isCreateOfferAction
    ? canOpenAdvisor
      ? "/app/ai?view=advisor"
      : null
    : opportunity.href;
  const actionLabel = isCreateOfferAction
    ? t("opportunity.openAdvisor")
    : t(`opportunity.actions.${actionKey}`);

  return (
    <section
      data-business-advisor-card
      className={`${styles.module} ${styles.card} ${styles.opportunity}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--studio-white)] text-[var(--studio-blue)] shadow-none"
        >
          <SparklesIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--studio-clay)]">
              {t("opportunity.eyebrow")}
            </h2>
            {actionHref ? (
              <Link
                href={actionHref}
                data-business-advisor-action="quiet"
                className="inline-flex min-h-11 items-center gap-1 rounded-[14px] px-1.5 text-[12px] font-medium text-[var(--studio-blue)] transition hover:text-[var(--studio-blue)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-300/60"
              >
                {actionLabel}
                <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
          <p className="max-w-[48rem] text-[15px] leading-5 text-[var(--studio-muted)]">
            {t(`opportunity.items.${opportunity.key}`, opportunityValues)}
          </p>
          {opportunity.key === "noBookings" ? (
            <p className="mt-1.5 max-w-[48rem] text-[12px] leading-4 text-[var(--studio-muted)]">
              {t("opportunity.guidance")}
            </p>
          ) : null}
          {opportunity.key === "repeatedCourseSaturation" ? (
            <p className="mt-1.5 max-w-[48rem] text-[12px] leading-4 text-[var(--studio-muted)]">
              {t("opportunity.evidence", opportunityValues)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
