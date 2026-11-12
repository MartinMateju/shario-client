"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import { PERMISSIONS } from "@/config/permissions";
import { resolveIntlLocale } from "@/i18n/formatting";
import { Link } from "@/i18n/navigation";
import {
  useGenerateAiAdvisorRecommendationsMutation,
  useGetAiAdvisorRecommendationsQuery,
} from "@/lib/features/ai/aiApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import {
  formatAdvisorDateTime,
  formatAdvisorEvidenceValue,
  getAdvisorDiscussHref,
  getAdvisorEmptyState,
  isAdvisorRecommendationId,
  normalizeAdvisorSnapshot,
} from "./business-advisor.utils";
import { cx, getAiErrorMessage } from "./ai.utils";

const PRIORITY_TONES = {
  high: "border-terracotta-200 bg-coral-50 text-terracotta-700",
  medium: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
  low: "border-line bg-sand-50 text-ink-muted",
};

const LEVEL_TONES = {
  high: "bg-cobalt-50 text-cobalt-700",
  medium: "bg-sand-100 text-sand-700",
  low: "bg-surface-muted text-ink-muted",
};

function AdvisorLoading() {
  const t = useTranslations("AI.businessAdvisor");

  return (
    <div className="space-y-4" role="status">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-44 motion-safe:animate-pulse rounded-[24px] border border-line bg-white" />
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-48 motion-safe:animate-pulse rounded-[20px] border border-line bg-white"
        />
      ))}
    </div>
  );
}

function AdvisorUnavailable({ reason, canViewPlan, canManageModules }) {
  const t = useTranslations("AI.businessAdvisor");
  const aiT = useTranslations("AI");
  const copy = reason === "disabled" ? aiT : t;
  const action =
    reason === "disabled" && canManageModules
      ? { href: "/app/settings/modules", key: "disabled" }
      : reason === "plan" && canViewPlan
        ? { href: "/app/settings/billing", key: "plan" }
        : null;

  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-[24px] border border-line bg-white p-6 text-center shadow-card">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
        <LightBulbIcon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">
        {copy(`unavailable.${reason}.title`)}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {copy(`unavailable.${reason}.description`)}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white"
        >
          {copy(`unavailable.${action.key}.action`)}
        </Link>
      ) : null}
    </div>
  );
}

function EvidenceValue({ evidence, locale, t }) {
  const value = formatAdvisorEvidenceValue(evidence, {
    locale,
    fallback: t("evidence.unavailable"),
  });
  const previous =
    evidence.previousValue === null
      ? ""
      : formatAdvisorEvidenceValue(
          { ...evidence, value: evidence.previousValue },
          { locale, fallback: "" },
        );
  const change = evidence.changePercent;

  return (
    <div className="rounded-[14px] border border-line bg-sand-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            {evidence.label || evidence.metric || t("evidence.metric")}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-ink">
            {value}
          </p>
        </div>
        {change !== null ? (
          <span
            className={cx(
              "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
              change > 0
                ? "bg-success-soft text-success"
                : change < 0
                  ? "bg-danger-soft text-danger"
                  : "bg-surface-muted text-ink-muted",
            )}
          >
            {change > 0 ? "+" : ""}
            {new Intl.NumberFormat(resolveIntlLocale(locale), {
              maximumFractionDigits: 1,
            }).format(change)}
            %
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] leading-4 text-ink-muted">
        {previous ? (
          <span>{t("evidence.previous", { value: previous })}</span>
        ) : null}
        {evidence.period?.from && evidence.period?.to ? (
          <span>
            {t("evidence.period", {
              from: evidence.period.from,
              to: evidence.period.to,
            })}
          </span>
        ) : null}
        {evidence.source ? (
          <span>{t(`evidence.sources.${evidence.source}`)}</span>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, onReview }) {
  const t = useTranslations("AI.businessAdvisor");

  return (
    <article
      className={cx(
        "rounded-[20px] border bg-white p-4 shadow-sm transition sm:p-5",
        recommendation.priority === "high"
          ? "border-terracotta-200"
          : "border-line",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cx(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full",
            recommendation.kind === "risk"
              ? "bg-coral-100 text-terracotta-700"
              : "bg-cobalt-50 text-cobalt-600",
          )}
        >
          {recommendation.kind === "risk" ? (
            <ExclamationTriangleIcon className="h-5 w-5" />
          ) : (
            <LightBulbIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "inline-flex min-h-7 items-center rounded-full border px-2.5 text-[9px] font-semibold uppercase tracking-[0.09em]",
                PRIORITY_TONES[recommendation.priority],
              )}
            >
              {t(`priority.${recommendation.priority}`)}
            </span>
            <span className="text-[10px] font-medium text-ink-subtle">
              {t(`categories.${recommendation.category}`)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.035em] text-ink">
            {recommendation.title}
          </h3>
          {recommendation.rationale ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
              {recommendation.rationale}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onReview(recommendation.id || recommendation.key)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("actions.review")}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-ink-subtle">
              {t("evidence.count", { count: recommendation.evidence.length })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyAdvisorState({ state, canGenerate, isGenerating, onGenerate }) {
  const t = useTranslations("AI.businessAdvisor");
  const Icon =
    state === "noSignal"
      ? CheckCircleIcon
      : state === "unavailable"
        ? ExclamationTriangleIcon
        : InformationCircleIcon;

  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[22px] border border-line bg-white p-6 text-center shadow-sm">
      <span
        className={cx(
          "inline-flex h-12 w-12 items-center justify-center rounded-full",
          state === "noSignal"
            ? "bg-success-soft text-success"
            : state === "unavailable"
              ? "bg-warning-soft text-warning"
              : "bg-cobalt-50 text-cobalt-600",
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">
        {t(`states.${state}.title`)}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">
        {t(`states.${state}.description`)}
      </p>
      {state === "ready" && canGenerate ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <SparklesIcon className="h-4 w-4" />
          {isGenerating ? t("preparing") : t("generate")}
        </button>
      ) : null}
    </section>
  );
}

function RecommendationReview({
  recommendation,
  open,
  onClose,
  onDiscuss,
  canDiscuss,
}) {
  const t = useTranslations("AI.businessAdvisor");
  const locale = useLocale();
  const discussHref = getAdvisorDiscussHref(recommendation);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div
        data-dialog-backdrop
        className="fixed inset-0 bg-ink/35 backdrop-blur-[2px]"
        aria-hidden
      />
      <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
        <div className="flex min-h-full items-end justify-center sm:items-center">
          <DialogPanel
            data-dialog-layout="modal"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="flex items-start gap-4 border-b border-line px-5 py-5 sm:px-6">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
                <LightBulbIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
                  {t("review.eyebrow")}
                </p>
                <DialogTitle className="mt-2 text-xl font-semibold tracking-[-0.035em] text-ink sm:text-2xl">
                  {recommendation?.title}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("review.close")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {[
                  ["impact", recommendation?.impact],
                  ["effort", recommendation?.effort],
                  ["confidence", recommendation?.confidence],
                ].map(([key, value]) => (
                  <span
                    key={key}
                    className={cx(
                      "rounded-full px-2.5 py-1.5 text-[10px] font-semibold",
                      LEVEL_TONES[value] ?? LEVEL_TONES.medium,
                    )}
                  >
                    {t(`review.${key}`, {
                      value: t(`levels.${value || "medium"}`),
                    })}
                  </span>
                ))}
              </div>

              {recommendation?.rationale ? (
                <section className="mt-5">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("review.why")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                    {recommendation.rationale}
                  </p>
                </section>
              ) : null}

              <section className="mt-6">
                <div className="flex items-center gap-2">
                  <ChartBarSquareIcon className="h-5 w-5 text-cobalt-600" />
                  <h3 className="text-sm font-semibold text-ink">
                    {t("review.evidence")}
                  </h3>
                </div>
                {recommendation?.evidence?.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {recommendation.evidence.map((evidence) => (
                      <EvidenceValue
                        key={evidence.id}
                        evidence={evidence}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    {t("review.noEvidence")}
                  </p>
                )}
              </section>

              {recommendation?.nextStep ? (
                <section className="mt-6 rounded-[16px] border border-cobalt-100 bg-cobalt-50/55 p-4">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("review.nextStep")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {recommendation.nextStep}
                  </p>
                </section>
              ) : null}

              <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-ink-subtle">
                <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {t("review.advisoryOnly")}
              </p>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-line bg-sand-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink-muted"
              >
                {t("review.close")}
              </button>
              {discussHref && canDiscuss ? (
                <Link
                  href={discussHref}
                  onClick={onDiscuss}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-cobalt-200 bg-white px-4 text-xs font-semibold text-cobalt-700"
                >
                  {t("actions.discuss")}
                </Link>
              ) : null}
              {recommendation?.href ? (
                <Link
                  href={recommendation.href}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white"
                >
                  {t("actions.openWorkspace")}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </footer>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default function BusinessAdvisorPanel({
  selectedRecommendationId = "",
  onDiscuss,
}) {
  const t = useTranslations("AI.businessAdvisor");
  const locale = useLocale();
  const locationId = useSelector(selectActiveStudioId);
  const aiUseAccess = useAiAccess({ feature: "businessAdvisor" });
  const reportsAccess = useAiAccess({
    feature: "businessAdvisor",
    permission: PERMISSIONS.REPORTS_VIEW,
  });
  const access = {
    ...reportsAccess,
    available: reportsAccess.available && aiUseAccess.available,
    canReadCached: reportsAccess.canReadCached && aiUseAccess.canReadCached,
    canUseAssistant:
      reportsAccess.canUseAssistant && aiUseAccess.canUseAssistant,
    hasPermission: reportsAccess.hasPermission && aiUseAccess.hasPermission,
    isLoading: reportsAccess.isLoading || aiUseAccess.isLoading,
    moduleEnabled: reportsAccess.moduleEnabled && aiUseAccess.moduleEnabled,
    usageBlocked: reportsAccess.usageBlocked || aiUseAccess.usageBlocked,
  };
  const request = useMemo(
    () => ({
      cacheScope: access.cacheScope,
      locale,
      ...(locationId ? { locationId } : {}),
    }),
    [access.cacheScope, locale, locationId],
  );
  const query = useGetAiAdvisorRecommendationsQuery(request, {
    skip: !access.canReadCached,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [generate, generation] = useGenerateAiAdvisorRecommendationsMutation();
  const snapshot = normalizeAdvisorSnapshot(query.currentData);
  const recommendations = (snapshot?.recommendations ?? []).slice(0, 5);
  const deepLinkedId = isAdvisorRecommendationId(selectedRecommendationId)
    ? selectedRecommendationId
    : "";
  const [selection, setSelection] = useState(() => ({
    deepLinkedId,
    selectedId: deepLinkedId,
  }));
  if (selection.deepLinkedId !== deepLinkedId) {
    setSelection({ deepLinkedId, selectedId: deepLinkedId });
  }
  const setSelectedId = (selectedId) =>
    setSelection({ deepLinkedId, selectedId });
  const effectiveSelectedId = selection.selectedId;
  const [error, setError] = useState("");
  const selectedRecommendation = recommendations.find(
    (item) =>
      item.id === effectiveSelectedId || item.key === effectiveSelectedId,
  );
  const timezone = String(snapshot?.period?.timezone || "UTC");
  const generatedAt = formatAdvisorDateTime(snapshot?.generatedAt, {
    locale,
    timezone,
  });
  const state = getAdvisorEmptyState(snapshot);
  const isWorking = query.isFetching || generation.isLoading;
  const limitationCount = new Set(
    [
      ...(snapshot?.coverage.limitations ?? []),
      ...(snapshot?.dataLimitations ?? []),
    ].filter(Boolean),
  ).size;

  const refresh = async () => {
    if (!access.available || generation.isLoading) return;
    setError("");
    try {
      await generate({
        ...request,
        force: Boolean(snapshot),
      }).unwrap();
    } catch (requestError) {
      setError(getAiErrorMessage(requestError, t("refreshError")));
    }
  };

  if (access.isLoading) return <AdvisorLoading />;

  if (!access.canReadCached) {
    const reason = !access.hasPermission
      ? "permission"
      : !access.moduleEnabled
        ? access.moduleUnavailableReason || "disabled"
        : access.planEntitled === false
          ? "plan"
          : "service";
    return (
      <AdvisorUnavailable
        reason={reason}
        canViewPlan={access.canViewPlan}
        canManageModules={access.canManageModules}
      />
    );
  }

  if (query.isLoading && !query.currentData) return <AdvisorLoading />;

  if (query.isError && !query.currentData) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-[24px] border border-line bg-white p-6 text-center shadow-card">
        <ExclamationTriangleIcon className="h-8 w-8 text-warning" />
        <h2 className="mt-4 text-base font-semibold text-ink">
          {t("loadError.title")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {t("loadError.description")}
        </p>
        <button
          type="button"
          onClick={query.refetch}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-[24px] border border-cobalt-200 bg-[linear-gradient(120deg,#FFFFFF_0%,var(--color-skab-blue-50)_58%,var(--color-skab-offset-50)_100%)] p-5 shadow-[0_16px_44px_rgb(var(--skab-blue-rgb)/0.065)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
              <SparklesIcon className="h-4 w-4" />
              {t("eyebrow")}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-ink sm:text-3xl">
              {snapshot?.headline || t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              {snapshot?.summary || t("description")}
            </p>
            {snapshot ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-ink-muted">
                <span
                  className={cx(
                    "rounded-full px-2.5 py-1.5 font-semibold",
                    snapshot.freshness.state === "stale"
                      ? "bg-warning-soft text-warning"
                      : "bg-success-soft text-success",
                  )}
                >
                  {t(`freshness.${snapshot.freshness.state}`)}
                </span>
                {generatedAt ? (
                  <span>{t("updated", { date: generatedAt })}</span>
                ) : null}
                <span>
                  {t("coverage", { count: snapshot.coverage.available.length })}
                </span>
              </div>
            ) : null}
          </div>
          {access.available && state !== "ready" ? (
            <button
              type="button"
              onClick={refresh}
              disabled={isWorking}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-cobalt-200 bg-white/90 px-4 text-xs font-semibold text-cobalt-700 transition hover:bg-white disabled:opacity-50"
            >
              <ArrowPathIcon
                className={cx(
                  "h-4 w-4",
                  isWorking && "motion-safe:animate-spin",
                )}
              />
              {t(snapshot ? "refresh" : "generate")}
            </button>
          ) : null}
        </div>
        {snapshot?.freshness.state === "stale" ? (
          <p className="mt-4 flex items-start gap-2 rounded-[13px] border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {t("freshness.staleDescription")}
          </p>
        ) : null}
        {snapshot && !snapshot.coverage.complete ? (
          <div className="mt-4 rounded-[13px] border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
            <p>
              {t("partialCoverage", {
                count: snapshot.coverage.unavailable.length,
              })}
            </p>
            {limitationCount ? (
              <p className="mt-1">
                {t("limitations", { count: limitationCount })}
              </p>
            ) : null}
          </div>
        ) : null}
        {access.usageBlocked ? (
          <p className="mt-4 text-xs leading-5 text-ink-muted">
            {t("allowanceUsed")}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-[13px] border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </header>

      {state === "recommendations" ? (
        <section aria-labelledby="business-advisor-recommendations">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2
                id="business-advisor-recommendations"
                className="text-base font-semibold tracking-[-0.03em] text-ink"
              >
                {t("recommendations.title")}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {t("recommendations.description", {
                  count: recommendations.length,
                })}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id || recommendation.key}
                recommendation={recommendation}
                onReview={setSelectedId}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyAdvisorState
          state={state}
          canGenerate={access.available}
          isGenerating={generation.isLoading}
          onGenerate={refresh}
        />
      )}

      <RecommendationReview
        recommendation={selectedRecommendation}
        open={Boolean(selectedRecommendation)}
        onClose={() => setSelectedId("")}
        onDiscuss={onDiscuss}
        canDiscuss={
          access.canUseAssistant && snapshot?.freshness.state !== "stale"
        }
      />
    </div>
  );
}
