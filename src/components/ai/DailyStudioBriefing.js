"use client";

import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import AiFeatureBoundary, {
  useAiAccess,
} from "@/components/auth/AiFeatureBoundary";
import {
  useGenerateAiBriefingMutation,
  useGetLatestAiBriefingQuery,
} from "@/lib/features/ai/aiApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import { getAiErrorMessage } from "./ai.utils";

const getItems = (briefing, key) => {
  const value =
    briefing?.[key] ??
    briefing?.sections?.[key] ??
    briefing?.content?.[key] ??
    [];
  return Array.isArray(value) ? value : [];
};

const itemText = (item) =>
  typeof item === "string"
    ? item
    : (item?.title ?? item?.label ?? item?.description ?? item?.text ?? "");

const getMetrics = (briefing) => {
  const metrics = briefing?.metrics;

  if (Array.isArray(metrics)) {
    return metrics
      .map((metric) => ({
        key: metric?.key,
        label: metric?.label ?? metric?.name ?? metric?.key,
        value: metric?.value ?? metric?.count,
      }))
      .filter((metric) => metric.label && metric.value != null);
  }

  if (!metrics || typeof metrics !== "object") return [];

  return Object.entries(metrics)
    .map(([key, value]) => ({
      key,
      label: key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase(),
      value:
        value && typeof value === "object"
          ? (value.value ?? value.count)
          : value,
    }))
    .filter((metric) => metric.value != null);
};

function BriefingContent() {
  const t = useTranslations("DailyBriefing");
  const locale = useLocale();
  const locationId = useSelector(selectActiveStudioId);
  const access = useAiAccess({ feature: "dailyBriefing" });
  const request = {
    cacheScope: access.cacheScope,
    locale,
    ...(locationId ? { locationId } : {}),
  };
  const query = useGetLatestAiBriefingQuery(request, {
    skip: !access.canReadCached,
  });
  const [generate, generateState] = useGenerateAiBriefingMutation();
  const briefing = query.currentData?.briefing ?? query.currentData ?? null;
  const priorities = getItems(briefing, "priorities");
  const attention = getItems(briefing, "attention");
  const nextSteps = getItems(briefing, "nextSteps");
  const highlights = getItems(briefing, "highlights");
  const metrics = getMetrics(briefing);
  const generatedAt = briefing?.generatedAt ?? briefing?.createdAt;
  const sourceCount = Number(
    briefing?.sourceCount ??
      briefing?.sources?.length ??
      briefing?.coverage?.sources ??
      0,
  );
  const requestError = query.error ?? generateState.error;

  const refresh = async () => {
    try {
      await generate({
        ...request,
        force: true,
      }).unwrap();
    } catch {
      // Mutation state renders the server error below.
    }
  };

  return (
    <section className="mb-4 overflow-hidden rounded-[22px] border border-cobalt-200 bg-[linear-gradient(135deg,#FFFFFF_0%,var(--color-skab-blue-50)_62%,var(--color-skab-offset-50)_100%)] shadow-[0_16px_45px_rgb(var(--skab-blue-rgb)/0.07)]">
      <header className="flex flex-col gap-4 border-b border-cobalt-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
            <SparklesIcon className="h-4 w-4" />
            {t("eyebrow")}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-ink">
            {briefing?.headline ?? briefing?.title ?? t("title")}
          </h2>
          {generatedAt ? (
            <p className="mt-1.5 text-[10px] text-ink-muted">
              {t("generated", {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(generatedAt)),
                count: sourceCount,
              })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={generateState.isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-cobalt-200 bg-white px-4 text-[12px] font-semibold text-cobalt-700 transition hover:border-cobalt-300 hover:bg-cobalt-50 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={
              generateState.isLoading
                ? "h-3.5 w-3.5 animate-spin"
                : "h-3.5 w-3.5"
            }
          />
          {briefing ? t("refresh") : t("generate")}
        </button>
      </header>

      {query.isLoading ? (
        <div className="flex min-h-36 items-center justify-center gap-2 px-6 text-xs text-ink-muted">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : briefing ? (
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div className="p-5 sm:p-6">
            <p className="max-w-3xl text-sm leading-6 text-ink-soft">
              {briefing.summary ?? briefing.overview ?? t("fallbackSummary")}
            </p>
            {metrics.length ? (
              <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {metrics.slice(0, 4).map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[13px] border border-white/80 bg-white/75 px-3 py-3"
                  >
                    <dd className="text-lg font-semibold tracking-[-0.03em] text-ink">
                      {metric.value}
                    </dd>
                    <dt className="mt-1 text-[10px] capitalize text-ink-muted">
                      {metric.key && t.has(`metrics.${metric.key}`)
                        ? t(`metrics.${metric.key}`)
                        : metric.label}
                    </dt>
                  </div>
                ))}
              </dl>
            ) : null}
            {highlights.length ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {highlights.slice(0, 4).map((item, index) => (
                  <div
                    key={item?.id ?? `${itemText(item)}-${index}`}
                    className="flex items-start gap-2 rounded-[14px] border border-white/80 bg-white/70 px-3 py-3 text-[12px] leading-5 text-ink-soft"
                  >
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {itemText(item)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="border-t border-cobalt-100 bg-white/55 p-5 lg:border-l lg:border-t-0 sm:p-6">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-ink">
              <ExclamationTriangleIcon className="h-4 w-4 text-terracotta-600" />
              {t("attention")}
            </h3>
            <div className="mt-3 space-y-2">
              {(attention.length
                ? attention
                : priorities.length
                  ? priorities
                  : nextSteps
              )
                .slice(0, 4)
                .map((item, index) => (
                  <div
                    key={item?.id ?? `${itemText(item)}-${index}`}
                    className="flex items-start gap-2 rounded-[12px] bg-white px-3 py-2.5 text-[12px] leading-5 text-ink-soft ring-1 ring-inset ring-line"
                  >
                    <ChevronRightIcon className="mt-1 h-3 w-3 shrink-0 text-cobalt-600" />
                    {itemText(item)}
                  </div>
                ))}
              {!attention.length && !priorities.length && !nextSteps.length ? (
                <p className="text-[12px] leading-5 text-ink-muted">
                  {t("noAttention")}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center px-6 py-7 text-center">
          <CalendarDaysIcon className="h-6 w-6 text-cobalt-500" />
          <p className="mt-3 text-sm font-semibold text-ink">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 max-w-md text-xs leading-5 text-ink-muted">
            {t("emptyDescription")}
          </p>
        </div>
      )}

      {requestError ? (
        <p className="border-t border-danger/15 bg-danger-soft px-5 py-3 text-[12px] text-danger">
          {getAiErrorMessage(requestError, t("error"))}
        </p>
      ) : null}
    </section>
  );
}

export default function DailyStudioBriefing() {
  return (
    <AiFeatureBoundary feature="dailyBriefing" compact fallback={null}>
      <BriefingContent />
    </AiFeatureBoundary>
  );
}
