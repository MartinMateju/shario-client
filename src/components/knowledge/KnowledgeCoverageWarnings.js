"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { useGetAiKnowledgeCoverageQuery } from "@/lib/features/ai/aiApiSlice";
import { mapKnowledgeCoverageCategory } from "@/lib/features/ai/aiApi.utils";

const KNOWLEDGE_COVERAGE_QUESTION_IDS = Object.freeze({
  booking_price: true,
  booking_cancellation: true,
  booking_reschedule: true,
  studio_inclusions: true,
  studio_arrival: true,
  course_preparation: true,
  membership_usage: true,
  accessibility: true,
});

const formatCheckedAt = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function KnowledgeCoverageWarnings({
  enabled,
  cacheScope,
  locationId,
  canManage,
  onAddSource,
}) {
  const t = useTranslations("KnowledgeHub");
  const locale = useLocale();
  const coverageQuery = useGetAiKnowledgeCoverageQuery(
    { cacheScope, locale, locationId },
    { skip: !enabled, refetchOnMountOrArgChange: true },
  );

  if (!enabled) return null;

  const coverage = coverageQuery.currentData;

  if (coverageQuery.isLoading || (coverageQuery.isFetching && !coverage)) {
    return (
      <section
        className="mt-5 rounded-[20px] border border-line bg-white p-5 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
          <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("management.coverage.loading")}
        </p>
      </section>
    );
  }

  if (coverageQuery.isError || !coverage) {
    return (
      <section
        className="mt-5 rounded-[20px] border border-line bg-white p-5"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">
              {t("management.coverage.errorTitle")}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
              {t("management.coverage.errorDescription")}
            </p>
            <button
              type="button"
              onClick={coverageQuery.refetch}
              className="mt-3 min-h-10 rounded-full px-3.5 py-2 text-[13px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30"
            >
              {t("actions.retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const warnings = Array.isArray(coverage.warnings) ? coverage.warnings : [];
  const checkedAt = formatCheckedAt(coverage.generatedAt, locale);
  const ready =
    coverage.totalCount > 0 &&
    coverage.answeredCount === coverage.totalCount &&
    coverage.score === 100 &&
    coverage.complete === true &&
    coverage.truncated !== true &&
    warnings.length === 0;
  const partialScan = coverage.complete !== true || coverage.truncated === true;

  return (
    <section
      className="mt-5 rounded-[22px] border border-line bg-white p-5 sm:p-6"
      aria-labelledby="knowledge-coverage-title"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={
              ready
                ? "inline-flex h-6 w-6 shrink-0 items-center justify-center text-success"
                : "inline-flex h-6 w-6 shrink-0 items-center justify-center text-warning"
            }
          >
            {ready ? (
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="knowledge-coverage-title"
              className="text-sm font-semibold text-ink"
            >
              {ready
                ? t("management.coverage.readyTitle")
                : t("management.coverage.title")}
            </h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-ink-muted">
              {ready
                ? t("management.coverage.readyDescription")
                : t("management.coverage.description")}
            </p>
            {checkedAt ? (
              <p className="mt-1 text-[13px] text-ink-muted">
                {t("management.coverage.updated", { date: checkedAt })}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-inset ring-line">
          {t("management.coverage.score", { score: coverage.score })}
        </div>
      </div>

      <p className="mt-4 text-[13px] font-medium text-ink-soft">
        {t("management.coverage.summary", {
          answered: coverage.answeredCount,
          total: coverage.totalCount,
        })}
      </p>

      {partialScan ? (
        <p className="mt-3 text-[13px] leading-5 text-warning">
          {t("management.coverage.partialScan")}
        </p>
      ) : null}

      {warnings.length ? (
        <ul
          className="mt-4 divide-y divide-line border-t border-line"
          role="list"
        >
          {warnings.map((warning) => {
            const category = mapKnowledgeCoverageCategory(warning.category);
            return (
              <li key={warning.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning">
                    {t("management.coverage.missing")}
                  </span>
                  <span className="text-[12px] font-medium text-ink-muted">
                    {t(`categories.${category}`)}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] font-medium leading-5 text-ink">
                  {t(
                    `management.coverage.questions.${Object.hasOwn(KNOWLEDGE_COVERAGE_QUESTION_IDS, warning.id) ? warning.id : "unknown"}`,
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!ready && canManage ? (
        <button
          type="button"
          onClick={onAddSource}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("management.coverage.addSource")}
        </button>
      ) : null}
    </section>
  );
}
