"use client";

import styles from "./overview.module.css";

import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { Link } from "@/i18n/navigation";

import OverviewDateNavigation from "./OverviewDateNavigation";
import { cx } from "./overview.utils";

const ATTENDANCE_STYLES = {
  booked: {
    Icon: CalendarDaysIcon,
    panel: "border-[var(--studio-rule)] bg-[var(--overview-blue-soft)]",
    icon: "bg-[var(--studio-white)] text-[var(--studio-blue)] shadow-none",
  },
  arriving: {
    Icon: UserGroupIcon,
    panel: "border-transparent bg-transparent",
    icon: "bg-[var(--overview-sand-soft)] text-[var(--studio-muted)]",
  },
  inStudio: {
    Icon: BuildingOffice2Icon,
    panel: "border-transparent bg-transparent",
    icon: "bg-[var(--overview-success-soft)] text-[var(--overview-success)]",
  },
};

const STAGE_MODULES = {
  booked: "bookings",
  arriving: "bookings",
  inStudio: "bookings",
};

const FLOW_GROUPS = [
  {
    key: "visits",
    stageKeys: new Set(["booked", "arriving", "inStudio"]),
  },
];

export const getEnabledFlowStages = (stages, modules) =>
  (stages ?? []).filter((stage) => {
    const stageModule = STAGE_MODULES[stage.key];
    if (stageModule === "bookings") {
      return modules?.bookings !== false || modules?.courses !== false;
    }
    return false;
  });

export const getFlowStageState = (stage) => {
  if (
    stage?.available !== true ||
    typeof stage.value !== "number" ||
    !Number.isFinite(stage.value)
  ) {
    return "unavailable";
  }

  return stage.value > 0 ? "active" : "idle";
};

export const getFlowRailState = (stages) => {
  const states = (stages ?? []).map(getFlowStageState);

  if (states.length > 0 && states.every((state) => state === "idle")) {
    return "empty";
  }

  return states.some((state) => state === "active") ? "active" : "partial";
};

export const getVisibleFlowGroups = (stages) =>
  FLOW_GROUPS.map((group) => ({
    ...group,
    stages: stages.filter((stage) => group.stageKeys.has(stage.key)),
  })).filter((group) => group.stages.length > 0);

const stagePresentation = (stage, t) => {
  const stageState = getFlowStageState(stage);
  const stageLabel =
    stage.key === "booked"
      ? t("snapshot.bookings")
      : stage.key === "arriving" && stage.unit === "people"
        ? t("snapshot.expectedVisitors")
        : t(`flow.stages.${stage.key}`);
  const displayedValue = stageState === "unavailable" ? "—" : stage.value;

  return { displayedValue, stageLabel, stageState };
};

function AttendanceMetric({ stage, position, t }) {
  const style = ATTENDANCE_STYLES[stage.key] ?? ATTENDANCE_STYLES.booked;
  const { displayedValue, stageLabel, stageState } = stagePresentation(
    stage,
    t,
  );
  const Icon = style.Icon;
  const isLive =
    stage.key === "inStudio" &&
    stage.unit === "people" &&
    stageState !== "unavailable";
  const scopeLabel = t(
    stage.key === "inStudio" ? "snapshot.currentState" : "snapshot.date",
  );
  const countLabel = t(
    stageState === "unavailable" ? "flow.stageUnavailable" : "flow.stageCount",
    { count: displayedValue, stage: stageLabel },
  );

  return (
    <Link
      href={stage.href}
      data-flow-stage={stage.key}
      data-flow-state={stageState}
      aria-label={`${countLabel} · ${scopeLabel}`}
      className={cx(
        "group relative flex min-w-0 flex-col justify-center rounded-[14px] border px-2.5 py-2 text-left transition hover:bg-[var(--studio-white)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-200/60 sm:px-3",
        style.panel,
      )}
    >
      {position > 0 ? (
        <span
          className="absolute bottom-2.5 left-0 top-2.5 w-px -translate-x-[6px] bg-[var(--studio-rule)] sm:-translate-x-[7px]"
          aria-hidden="true"
        />
      ) : null}

      <span className="flex min-h-7 items-center justify-between gap-1.5">
        <span
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-[10px]",
            style.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--overview-success)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--overview-success)] ring-[3px] ring-success/10"
              aria-hidden="true"
            />
            {t("snapshot.live")}
          </span>
        ) : null}
      </span>

      <strong
        className={cx(
          "mt-1 text-[30px] font-medium leading-none tracking-[-0.055em] tabular-nums sm:text-[34px]",
          stageState === "unavailable"
            ? "text-[var(--studio-muted)]"
            : "text-[var(--studio-ink)]",
        )}
      >
        {displayedValue}
      </strong>
      <span className="mt-1 text-[12px] font-medium leading-4 text-[var(--studio-muted)] sm:text-[12px]">
        {stageLabel}
      </span>
      <span className="text-[10px] font-medium leading-3 text-[var(--studio-muted)] sm:text-[11px]">
        {scopeLabel}
      </span>
    </Link>
  );
}

function FlowGroup({ group, t }) {
  return (
    <div data-flow-group={group.key} className={styles.flowGroup}>
      <div className="mb-1 px-0.5">
        <h3 className="text-[13px] font-medium text-[var(--studio-ink)]">
          {t(`flow.groups.${group.key}.title`)}
        </h3>
        <p className="mt-0.5 text-[12px] leading-4 text-[var(--studio-muted)]">
          {t(`flow.groups.${group.key}.description`)}
        </p>
      </div>
      <div
        className="grid auto-cols-fr grid-flow-col mt-2 min-h-[104px] gap-3"
        role="list"
        aria-label={t(`flow.groups.${group.key}.title`)}
      >
        {group.stages.map((stage, index) => (
          <div key={stage.key} role="listitem" className="min-w-0">
            <AttendanceMetric stage={stage} position={index} t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudioFlowRail({
  dateValue,
  isUnavailable = false,
  isLoading = false,
  isToday = true,
  modules,
  onDateChange,
  onRetry,
  stages,
  todayValue,
}) {
  const t = useTranslations("Dashboard.overview");
  const visibleStages = getEnabledFlowStages(stages, modules).filter(
    (stage) => {
      if (isToday) return true;
      if (stage.key === "arriving" || stage.key === "inStudio") {
        return stage.unit === "people";
      }
      return true;
    },
  );
  const railState = visibleStages.length
    ? getFlowRailState(visibleStages)
    : "empty";
  const compact = railState === "empty";
  const visibleGroups = getVisibleFlowGroups(visibleStages);
  const hasBookingStages = visibleStages.some(
    (stage) => STAGE_MODULES[stage.key] === "bookings",
  );

  return (
    <section
      data-studio-flow-rail
      data-flow-state={
        isUnavailable ? "unavailable" : isLoading ? "loading" : railState
      }
      data-flow-density={
        isUnavailable
          ? "unavailable"
          : isLoading
            ? "loading"
            : compact
              ? "compact"
              : "standard"
      }
      aria-busy={isLoading || undefined}
      className={`${styles.module} ${styles.card} ${styles.flow}`}
    >
      <WorkspaceBrushField
        className={styles.flowBrushes}
        variant="overviewHero"
      />
      <div
        aria-hidden="true"
        data-studio-flow-readability-scrim
        className={styles.flowScrim}
      />
      <div data-studio-flow-header className={styles.sectionHeader}>
        <div className="min-w-0 max-w-[620px] flex-1">
          <h2 className="text-[24px] font-medium tracking-[-0.045em] text-[var(--studio-ink)] sm:text-[22px]">
            {t("flow.title")}
          </h2>
          <p className="mt-0.5 text-[12px] leading-5 text-[var(--studio-muted)] sm:text-[13px]">
            {t("flow.description")}
          </p>
        </div>

        {dateValue && onDateChange ? (
          <OverviewDateNavigation
            dateValue={dateValue}
            onDateChange={onDateChange}
            todayValue={todayValue}
          />
        ) : null}
      </div>

      {isUnavailable ? (
        <div
          data-flow-error-state
          className="relative z-10 mt-3 flex flex-col gap-3 rounded-[16px] border border-[var(--studio-rule)] bg-[var(--overview-clay-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-live="polite"
        >
          <p className="text-[12px] leading-5 text-[var(--studio-muted)] sm:text-[13px]">
            {t("error.description")}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-[12px] font-medium text-[var(--studio-blue)] transition hover:bg-[var(--studio-white)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cobalt-200/70"
            >
              {t("error.retry")}
            </button>
          ) : null}
        </div>
      ) : isLoading ? (
        <div
          data-flow-loading-state
          className="relative z-10 mt-3 grid gap-3 md:grid-cols-2"
          aria-hidden="true"
        >
          <div className="h-[164px] animate-pulse rounded-[16px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
          <div className="h-[164px] animate-pulse rounded-[16px] border border-[var(--studio-rule)] bg-[var(--studio-white)]" />
        </div>
      ) : compact ? (
        <div data-flow-empty-state className={styles.emptyFlow}>
          <p className="text-[12px] font-medium text-[var(--studio-ink)] sm:text-[13px]">
            {t("flow.emptyTitle")}
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {visibleGroups.map((group) => (
              <span
                key={group.key}
                data-flow-empty-group={group.key}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--studio-rule)] bg-[var(--studio-white)] px-3 text-[12px] text-[var(--studio-muted)]"
              >
                <span>{t(`flow.groups.${group.key}.title`)}</span>
                <strong className="font-medium tabular-nums text-[var(--studio-ink)]">
                  0
                </strong>
              </span>
            ))}

            {hasBookingStages ? (
              <Link
                href="/app/calendar"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-[var(--studio-blue)] transition hover:bg-[var(--studio-white)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-200/60"
              >
                {t("flow.openCalendar")}
                <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cx(
            "relative z-10 mt-3 grid gap-3",
            visibleGroups.length > 1 &&
              "md:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]",
          )}
        >
          {visibleGroups.map((group) => (
            <FlowGroup key={group.key} group={group} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
