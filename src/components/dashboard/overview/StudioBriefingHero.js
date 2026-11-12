"use client";

import styles from "./overview.module.css";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { Link } from "@/i18n/navigation";

import {
  dailyBriefingPriorityItems,
  formatDailyBriefingTime,
} from "./daily-studio-briefing.utils";
import useDailyStudioBriefing from "./useDailyStudioBriefing";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const resolveBriefingHref = (href) => {
  if (typeof href !== "string" || !href.startsWith("/app/communications")) {
    return href;
  }

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [path, query = ""] = pathAndQuery.split("?", 2);
  const searchParams = new URLSearchParams(query);

  if (searchParams.get("section") !== "inbox") return href;

  searchParams.set("section", "history");
  return `${path}?${searchParams.toString()}${hash ? `#${hash}` : ""}`;
};

const ATTENTION_ICONS = {
  unpaidBookings: ReceiptPercentIcon,
  lowStock: CubeIcon,
  overdueTasks: ExclamationTriangleIcon,
};

const ATTENTION_STYLES = {
  unpaidBookings: "bg-[var(--overview-clay-soft)] text-[var(--studio-clay)]",
  lowStock: "bg-[var(--overview-success-soft)] text-[var(--overview-success)]",
  overdueTasks:
    "bg-[var(--overview-warning-soft)] text-[var(--overview-warning)]",
};

const availableAttentionItems = (overview) =>
  (Array.isArray(overview?.attention) ? overview.attention : []).filter(
    (item) => item.available && Number(item.count) > 0,
  );

const flowCount = (overview, key) => {
  const item = (Array.isArray(overview?.flow) ? overview.flow : []).find(
    (item) => item.key === key,
  );

  if (item?.available !== true) return null;

  const value = item.value;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const operationalSummary = (overview, t) => {
  const availableSourceCount = Array.isArray(overview?.coverage?.available)
    ? overview.coverage.available.length
    : 0;

  if (overview?.coverage?.complete !== true) {
    return t("briefing.partialSummary", { count: availableSourceCount });
  }

  const bookings = flowCount(overview, "booked");

  if (bookings === null) {
    return t("briefing.countsUnavailableSummary");
  }

  return t("briefing.deterministicSummary", {
    bookings,
    attention: availableAttentionItems(overview).length,
  });
};

function BriefingActions({
  canGenerate,
  canReview,
  className = "mt-4",
  dateKey,
  generated,
  hasReviewablePriorities,
  isToday,
  refreshing,
  scheduleAvailable,
  onRefresh,
}) {
  const t = useTranslations("Dashboard.overview");
  const primaryAction = hasReviewablePriorities
    ? {
        href: canReview
          ? "/app/ai?intent=review-daily-briefing"
          : "/app/operations?section=tasks",
        label: t("briefing.review"),
        type: "review",
      }
    : scheduleAvailable
      ? {
          href: dateKey
            ? `/app/calendar?date=${encodeURIComponent(dateKey)}`
            : "/app/calendar",
          label: t(
            isToday ? "briefing.viewTodaySchedule" : "briefing.viewSchedule",
          ),
          type: "schedule",
        }
      : {
          href: "/app/operations",
          label: t("briefing.openOperations"),
          type: "operations",
        };

  return (
    <div className={cx(styles.actions, className)}>
      <Link
        href={primaryAction.href}
        data-briefing-primary-action={primaryAction.type}
        className={`${styles.action} ${styles.primary}`}
      >
        {primaryAction.label}
      </Link>

      {canGenerate && onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className={`${styles.action} ${styles.secondary}`}
        >
          <ArrowPathIcon
            className={cx(
              "h-3.5 w-3.5",
              refreshing && "motion-safe:animate-spin",
            )}
          />
          {t(generated ? "briefing.refresh" : "briefing.generate")}
        </button>
      ) : null}
    </div>
  );
}

function DeterministicBriefing({
  overview,
  briefingState,
  hideActions = false,
}) {
  const t = useTranslations("Dashboard.overview");
  const availableAttention = availableAttentionItems(overview);
  const partialCoverage = overview.coverage?.complete !== true;
  const countsAvailable = flowCount(overview, "booked") !== null;
  const operationallyClear =
    !availableAttention.length && !partialCoverage && countsAvailable;
  const headlineKey = availableAttention.length
    ? "briefing.attentionHeadline"
    : partialCoverage
      ? "briefing.partialHeadline"
      : "briefing.calmHeadline";

  return (
    <div className={styles.briefingCopy}>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--studio-blue)]">
        {t("briefing.operationalEyebrow")}
      </p>
      <h2 className="mt-2 break-words text-[30px] font-medium leading-[1.06] tracking-[-0.055em] text-[var(--studio-ink)] sm:text-[32px]">
        {t(headlineKey)}
      </h2>
      {operationallyClear ? null : (
        <p className="mt-2 break-words text-[13px] leading-5 text-[var(--studio-muted)]">
          {operationalSummary(overview, t)}
        </p>
      )}
      <div className={styles.briefingFooter}>
        <p className="inline-flex min-w-0 items-center gap-2 text-[12px] text-[var(--studio-muted)]">
          <CheckCircleIcon className="h-4 w-4 text-[var(--overview-success)]" />
          {overview.coverage.complete
            ? t("briefing.coverageComplete", {
                count: overview.coverage.available.length,
              })
            : t("briefing.coveragePartial", {
                count: overview.coverage.available.length,
              })}
        </p>
        {hideActions ? null : (
          <BriefingActions
            canGenerate={briefingState?.canGenerate}
            canReview={Boolean(briefingState?.access.canUseAssistant)}
            className="mt-0"
            dateKey={overview.metadata?.date}
            generated={false}
            hasReviewablePriorities={availableAttention.length > 0}
            isToday={briefingState?.isToday}
            refreshing={briefingState?.generation.isLoading}
            scheduleAvailable={overview.today?.available === true}
            onRefresh={briefingState?.refresh}
          />
        )}
      </div>
      {briefingState?.query.isLoading || briefingState?.generation.isLoading ? (
        <p
          className="mt-3 inline-flex items-center gap-2 text-[12px] text-[var(--studio-blue)]"
          role="status"
        >
          <ArrowPathIcon className="h-3.5 w-3.5 motion-safe:animate-spin" />
          {t("briefing.preparing")}
        </p>
      ) : null}
      {briefingState?.query.isError || briefingState?.generation.isError ? (
        <p
          className="mt-3 text-[12px] text-[var(--overview-danger)]"
          role="status"
        >
          {t("briefing.refreshError")}
        </p>
      ) : null}
    </div>
  );
}

function AiBriefing({ overview, briefingState }) {
  const t = useTranslations("Dashboard.overview");
  const { briefing, generation, locale, query, refresh, stale } = briefingState;
  const priorities = dailyBriefingPriorityItems(briefing);
  const generatedAt = briefing?.generatedAt ?? briefing?.createdAt;
  const provider = briefing?.provenance?.provider ?? "deterministic";
  const aiNarrative = provider === "openai";
  const sourceCount = Number(
    briefing?.sourceCount ??
      briefing?.metrics?.sourceCount ??
      overview.coverage.available.length,
  );

  if (!briefing) {
    return (
      <DeterministicBriefing
        overview={overview}
        briefingState={briefingState}
      />
    );
  }

  return (
    <div className={styles.briefingCopy}>
      <p className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--studio-blue)]">
        {aiNarrative ? (
          <SparklesIcon className="h-4 w-4" />
        ) : (
          <CheckCircleIcon className="h-4 w-4" />
        )}
        {t(aiNarrative ? "briefing.aiEyebrow" : "briefing.verifiedEyebrow")}
      </p>
      <h2 className="mt-2 break-words text-[30px] font-medium leading-[1.06] tracking-[-0.055em] text-[var(--studio-ink)] sm:text-[32px]">
        {briefing.headline || t("briefing.calmHeadline")}
      </h2>
      <p className="mt-2 break-words text-[13px] leading-5 text-[var(--studio-muted)]">
        {briefing.summary ||
          priorities[0]?.label ||
          operationalSummary(overview, t)}
      </p>
      {priorities.length ? (
        <ol
          className={cx(
            "mt-3 grid gap-2 sm:grid-cols-2",
            priorities.length >= 3
              ? "lg:grid-cols-3"
              : priorities.length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-1",
          )}
          aria-label={t("briefing.prioritiesLabel")}
        >
          {priorities.slice(0, 3).map((priority, index) => (
            <li
              key={priority.id}
              className="rounded-[14px] border border-[var(--studio-rule)] bg-[var(--studio-white)] text-[12px] leading-4 text-[var(--studio-muted)] shadow-[0_2px_8px_rgb(40_48_78/0.03)]"
            >
              {priority.href ? (
                <Link
                  href={resolveBriefingHref(priority.href)}
                  className="flex min-h-11 items-start gap-2 rounded-[14px] px-3 py-2.5 transition hover:text-[var(--studio-blue)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-200/70"
                >
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--overview-blue-soft)] text-[11px] font-medium text-[var(--studio-blue)]">
                    {index + 1}
                  </span>
                  <span className="break-words">{priority.label}</span>
                </Link>
              ) : (
                <span className="flex min-h-11 items-start gap-2 px-3 py-2.5">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--overview-blue-soft)] text-[11px] font-medium text-[var(--studio-blue)]">
                    {index + 1}
                  </span>
                  <span className="break-words">{priority.label}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : null}
      <div className={styles.briefingFooter}>
        <p className="inline-flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-[var(--studio-muted)]">
          {generatedAt ? (
            <span>
              {t("briefing.updated", {
                time: formatDailyBriefingTime(generatedAt, {
                  locale,
                  timezone:
                    briefing?.timezone || overview.metadata?.timezone || "UTC",
                }),
              })}
            </span>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{t("briefing.sources", { count: sourceCount })}</span>
          <span
            className={cx(
              "rounded-full px-2 py-1 font-medium",
              stale
                ? "bg-[var(--overview-warning-soft)] text-[var(--overview-warning)]"
                : "bg-[var(--overview-success-soft)] text-[var(--overview-success)]",
            )}
          >
            {t(stale ? "briefing.stale" : "briefing.fresh")}
          </span>
        </p>
        <BriefingActions
          canGenerate={briefingState.canGenerate}
          canReview={Boolean(briefingState.access.canUseAssistant)}
          className="mt-0"
          dateKey={overview.metadata?.date}
          generated
          hasReviewablePriorities={
            priorities.length > 0 ||
            availableAttentionItems(overview).length > 0
          }
          isToday={briefingState.isToday}
          refreshing={generation.isLoading}
          scheduleAvailable={overview.today?.available === true}
          onRefresh={refresh}
        />
      </div>
      {query.isFetching && !generation.isLoading ? (
        <p
          className="mt-3 inline-flex items-center gap-2 text-[12px] text-[var(--studio-blue)]"
          role="status"
        >
          <ArrowPathIcon className="h-3.5 w-3.5 motion-safe:animate-spin" />
          {t("briefing.checkingFreshness")}
        </p>
      ) : null}
      {query.isError || generation.isError ? (
        <p
          className="mt-3 text-[12px] text-[var(--overview-danger)]"
          role="status"
        >
          {t("briefing.refreshError")}
        </p>
      ) : null}
    </div>
  );
}

function AttentionPanel({ items, coverage }) {
  const t = useTranslations("Dashboard.overview");
  const visibleItems = items.filter(
    (item) => item.available && Number(item.count) > 0,
  );
  const headingKey = visibleItems.length
    ? "attention.title"
    : coverage?.complete === true
      ? "attention.clearHeading"
      : "attention.partialHeading";

  return (
    <aside data-attention-density="expanded" className={styles.attention}>
      <h3 className="text-[15px] font-medium tracking-[-0.03em] text-[var(--studio-ink)]">
        {t(headingKey)}
      </h3>

      {visibleItems.length ? (
        <div className="mt-3 divide-y divide-[var(--studio-rule)]">
          {visibleItems.slice(0, 4).map((item) => {
            const Icon = ATTENTION_ICONS[item.key] ?? ExclamationTriangleIcon;

            return (
              <Link
                key={item.key}
                href={resolveBriefingHref(item.href)}
                className="group grid min-h-12 grid-cols-[34px_38px_minmax(0,1fr)_18px] items-center gap-2 text-[12px] text-[var(--studio-muted)]"
              >
                <span
                  className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    ATTENTION_STYLES[item.key] ??
                      "bg-[var(--overview-clay-soft)] text-[var(--studio-clay)]",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <strong className="text-[24px] font-medium tracking-[-0.04em] text-[var(--studio-clay)]">
                  {item.count}
                </strong>
                <span>{t(`attention.items.${item.key}`)}</span>
                <ChevronRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            );
          })}
          <Link
            href="/app/operations?section=tasks"
            className="group flex min-h-11 items-center justify-between pt-2 text-[12px] font-medium text-[var(--studio-clay)]"
          >
            {t("attention.viewAll")}
            <ChevronRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : coverage?.complete === true ? (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-[var(--overview-success)] bg-[var(--overview-success-soft)] px-4 py-3">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--overview-success)]" />
          <div>
            <p className="text-[12px] font-medium text-[var(--overview-success)]">
              {t("attention.clearTitle")}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-[var(--overview-success)]">
              {t("attention.clearDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-[var(--overview-warning)] bg-[var(--overview-warning-soft)] px-4 py-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--overview-warning)]" />
          <div>
            <p className="text-[12px] font-medium text-[var(--overview-warning)]">
              {t("attention.partialTitle")}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-[var(--overview-warning)]">
              {t("attention.partialDescription")}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

export default function StudioBriefingHero({ overview }) {
  const briefingState = useDailyStudioBriefing({ overview });
  const operationallyClear =
    overview.coverage?.complete === true &&
    availableAttentionItems(overview).length === 0;
  const briefingStateName = operationallyClear
    ? "all-clear"
    : overview.coverage?.complete === true
      ? "attention"
      : "partial";

  return (
    <section
      data-studio-briefing-hero
      data-briefing-state={briefingStateName}
      className={`${styles.module} ${styles.card} ${styles.briefing}`}
    >
      <WorkspaceBrushField variant="overviewHero" />
      <div
        aria-hidden="true"
        data-briefing-readability-scrim
        className={styles.briefingScrim}
      />
      <div
        className={cx(
          "relative z-10 grid",
          operationallyClear
            ? "grid-cols-1"
            : "xl:grid-cols-[minmax(0,1.72fr)_minmax(285px,0.72fr)]",
        )}
      >
        <div className={styles.briefingBody}>
          <AiBriefing overview={overview} briefingState={briefingState} />
        </div>
        {operationallyClear ? null : (
          <AttentionPanel
            items={overview.attention}
            coverage={overview.coverage}
          />
        )}
      </div>
    </section>
  );
}
