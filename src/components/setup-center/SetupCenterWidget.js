"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useGetSetupCenterQuery } from "@/lib/features/setup-center/setupCenterApiSlice";
import { useUpdateWorkspacePreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

import {
  getNextBestSetupStep,
  getLaunchSetupProgress,
  getOverviewSetupPresentation,
  getPrimaryAction,
  getSetupActionHref,
  getSetupStepEstimatedMinutes,
} from "./setupCenter.utils";
import styles from "./SetupCenterWidget.module.css";

export default function SetupCenterWidget({ onDismiss, presentation }) {
  const t = useTranslations("SetupCenter");
  const access = useSelector(selectCurrentWorkspaceAccess);
  const allowed = hasPermission(access, PERMISSIONS.WORKSPACE_UPDATE);
  const preferenceDismissed =
    access?.preferences?.overviewLaunchCenterDismissed === true;
  const [locallyDismissed, setLocallyDismissed] = useState(false);
  const [dismissError, setDismissError] = useState(false);
  const dismissed = preferenceDismissed || locallyDismissed;
  const query = useGetSetupCenterQuery(undefined, {
    skip: !allowed || dismissed,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const [updatePreferences, { isLoading: isDismissing }] =
    useUpdateWorkspacePreferencesMutation();
  const setup = query.currentData ?? query.data;

  const dismiss = async () => {
    setDismissError(false);

    try {
      await updatePreferences({
        overviewLaunchCenterDismissed: true,
      }).unwrap();
      setLocallyDismissed(true);
      onDismiss?.();
    } catch {
      setDismissError(true);
    }
  };

  if (!allowed || dismissed || query.isError) return null;

  if (query.isLoading || !setup) {
    const loadingPresentation = presentation ?? "guided";

    return (
      <div
        data-setup-center-presentation={loadingPresentation}
        role="status"
        aria-live="polite"
        aria-label={t("loading")}
        className={
          loadingPresentation === "compact"
            ? `h-[76px] animate-pulse motion-reduce:animate-none ${styles.loading}`
            : `h-[126px] w-full animate-pulse motion-reduce:animate-none ${styles.loading}`
        }
      >
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  const resolvedPresentation =
    presentation ?? getOverviewSetupPresentation(setup);

  if (resolvedPresentation === "hidden") return null;

  const launchProgress = getLaunchSetupProgress(setup);
  const nextStep = getNextBestSetupStep(setup);
  const nextRecommendation = nextStep
    ? null
    : ((setup.recommendations ?? []).find(
        (item) => !item.complete && item.action?.enabled,
      ) ?? null);
  const nextAction = nextStep
    ? getPrimaryAction(nextStep)
    : nextRecommendation?.action;
  const nextHref =
    nextAction?.enabled && nextAction.href
      ? (nextStep
          ? getSetupActionHref(nextStep, nextAction)
          : nextAction.href) || "/app/setup"
      : "/app/setup";
  const nextLabel = nextStep
    ? t(`steps.${nextStep.id}.outcome`)
    : nextRecommendation
      ? t(`learning.items.${nextRecommendation.id}`)
      : null;
  const nextEstimate = nextStep ? getSetupStepEstimatedMinutes(nextStep) : 2;

  const dismissButton = (
    <button
      type="button"
      onClick={dismiss}
      disabled={isDismissing}
      aria-label={t("widget.hide")}
      aria-busy={isDismissing}
      title={t("widget.hide")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface hover:text-ink focus:outline-none focus:ring-4 focus:ring-cobalt-500/10 disabled:cursor-wait disabled:opacity-60"
    >
      {isDismissing ? (
        <ArrowPathIcon
          aria-hidden="true"
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <XMarkIcon aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );

  const dismissErrorMessage = dismissError ? (
    <p
      role="alert"
      className="rounded-[10px] bg-coral-50 px-3 py-2 text-[10px] font-medium text-terracotta-700"
    >
      {t("widget.hideError")}
    </p>
  ) : null;

  return (
    <section
      data-setup-center-presentation={resolvedPresentation}
      className={`w-full ${styles.widget}`}
    >
      <div className={styles.header}>
        <div className="min-w-0">
          <p className={styles.eyebrow}>
            <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
            {t("widget.eyebrow")}
          </p>
          <h2 className={styles.title}>{t("widget.title")}</h2>
          <div className={styles.progressRow}>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={t("widget.eyebrow")}
              aria-valuemin={0}
              aria-valuemax={launchProgress.total || 1}
              aria-valuenow={launchProgress.completed}
              aria-valuetext={t("widget.checklistComplete", {
                completed: launchProgress.completed,
                total: launchProgress.total,
              })}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${launchProgress.percentage}%` }}
              />
            </div>
            <span>
              {t("widget.checklistComplete", {
                completed: launchProgress.completed,
                total: launchProgress.total,
              })}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <Link
            href="/app/setup"
            className={`min-h-11 min-w-11 ${styles.openButton}`}
          >
            {t(
              resolvedPresentation === "compact"
                ? "widget.review"
                : "widget.open",
            )}
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
          {dismissButton}
        </div>
      </div>

      {nextLabel ? (
        <div className={styles.nextStep}>
          <p className={styles.nextLabel}>{t("widget.next")}</p>
          <Link href={nextHref} className={`min-h-12 ${styles.nextLink}`}>
            <span className="min-w-0 break-words">{nextLabel}</span>
            <span className={styles.estimate}>
              {t("widget.estimate", { minutes: nextEstimate })}
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {dismissErrorMessage ? (
        <div className="mt-3">{dismissErrorMessage}</div>
      ) : null}
    </section>
  );
}
