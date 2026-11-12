"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PlayIcon,
  RocketLaunchIcon,
  StarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import { Link, useRouter } from "@/i18n/navigation";
import { useAiWorkspace } from "@/components/ai/AiWorkspaceProvider";
import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import {
  WORKSPACE_WORKFLOW_QUESTIONS,
  getWorkspaceWorkflowAnswers,
  hasStoredWorkspaceWorkflowAnswers,
} from "@/components/views/settings/workspaceWorkflowQuestions";
import {
  buildContextualGuideHref,
  getEligibleContextualGuideForSetupStep,
} from "@/components/guides/contextualGuides.config";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  setupCenterApiSlice,
  useAbandonSetupPracticeMutation,
  useAdvanceSetupPracticeMutation,
  useConfirmSetupPracticeMutation,
  useGetSetupCenterQuery,
  usePublishStudioMutation,
  useRemoveSetupPracticeConfirmationMutation,
  useStartSetupPracticeMutation,
  useUnpublishStudioMutation,
  useTrackSetupEventMutation,
} from "@/lib/features/setup-center/setupCenterApiSlice";
import { useGetWorkspaceConfigurationQuery } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import {
  PRACTICE_ACTION_ORDER,
  getLaunchCenterSections,
  getLaunchReadinessItems,
  getLaunchSetupProgress,
  getNextBestSetupStep,
  getPaymentSetupProgress,
  getPracticeBookingBlockingSteps,
  getPrimaryAction,
  getSetupActionHref,
  getSetupDisplayState,
  getSetupErrorMessage,
  getStep,
  hasCoreBookableOffer,
  isLaunchJourneyComplete,
  isLaunchReadyToPublish,
  isPaymentSetupReady,
  isStepApplicable,
  isStepDone,
  isTestBookingRetestRecommended,
  makePracticeIdempotencyKey,
  orderSetupSteps,
} from "./setupCenter.utils";
import { buildLaunchEvent } from "./useGuidedSetupStep";
const cx = (...classes) => classes.filter(Boolean).join(" ");
const LAUNCH_CENTER_DETAIL_ANCHOR = "launch-center-step-detail";
const BOOKABLE_OFFER_CHOICES = Object.freeze([
  ["openStudio", "openStudio", "open-studio", "open_studio"],
  ["class", "classes", "class", "class"],
]);
const getInactiveSetupHref = () => "/app/settings/modules?from=launch-center";
const GROWTH_STEP_PERMISSION_REQUIREMENTS = Object.freeze({
  studio: [PERMISSIONS.WORKSPACE_UPDATE],
  location: [PERMISSIONS.LOCATIONS_VIEW, PERMISSIONS.LOCATIONS_MANAGE],
  payments: [PERMISSIONS.PAYMENTS_CONNECT_MANAGE],
  communications: [PERMISSIONS.COMMUNICATIONS_MANAGE],
  public_site: [PERMISSIONS.WORKSPACE_UPDATE],
  publish: [PERMISSIONS.WORKSPACE_PUBLISH],
  practice_booking: [
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.BOOKINGS_CREATE,
  ],
  membership: [PERMISSIONS.MEMBERSHIPS_VIEW, PERMISSIONS.MEMBERSHIPS_MANAGE],
  inventory: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE],
  team: [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_MANAGE],
});
const canUseGrowthStepAction = (workspaceAccess, step, action) => {
  const requirements =
    step?.id === "bookable_offer"
      ? action?.key === "schedule_offer"
        ? [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE]
        : [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE]
      : GROWTH_STEP_PERMISSION_REQUIREMENTS[step?.id];
  return (
    !requirements ||
    requirements.every((permission) =>
      hasPermission(workspaceAccess, permission),
    )
  );
};
const GROWTH_RECOMMENDATION_PERMISSION_REQUIREMENTS = Object.freeze({
  reminders: [PERMISSIONS.COMMUNICATIONS_MANAGE],
  membership: [PERMISSIONS.MEMBERSHIPS_VIEW, PERMISSIONS.MEMBERSHIPS_MANAGE],
  check_in: [PERMISSIONS.ACCESS_CODES_VIEW],
  customers: [PERMISSIONS.CUSTOMERS_IMPORT],
});
const canUseGrowthRecommendation = (workspaceAccess, recommendation) => {
  const requirements =
    GROWTH_RECOMMENDATION_PERMISSION_REQUIREMENTS[recommendation?.id];
  return (
    !requirements ||
    requirements.every((permission) =>
      hasPermission(workspaceAccess, permission),
    )
  );
};
const statusIcon = (step) => {
  const displayState = getSetupDisplayState(step);
  if (displayState === "ready") return CheckCircleIcon;
  if (displayState === "waiting" || displayState === "not_enabled") {
    return LockClosedIcon;
  }
  return InformationCircleIcon;
};
function LoadingState({ t }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[26px] border border-line bg-white">
      <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <ArrowPathIcon className="h-4 w-4 animate-spin" />
        {t("loading")}
      </span>
    </div>
  );
}
function PracticePrerequisites({ steps, t, workspaceAccess, context }) {
  if (!steps.length) return null;
  return (
    <div
      data-practice-prerequisites={context}
      className={cx("mt-4", context === "detail" && "mb-5")}
    >
      <p className="text-[11px] font-semibold text-ink">
        {t("practice.prerequisitesTitle")}
      </p>
      <ul className="mt-2 space-y-3">
        {steps.map((step) => {
          const action = getPrimaryAction(step);
          const directHref = action?.enabled
            ? getSetupActionHref(step, action)
            : null;
          const href = directHref ?? `/app/setup?step=${step.id}`;
          const permitted = canUseGrowthStepAction(
            workspaceAccess,
            step,
            action,
          );
          const missingCheck = step.checks?.find(
            (check) => !check.complete && !check.optional,
          );
          const reasonCode = missingCheck?.reasonCode ?? step.reasonCode;
          const label = directHref
            ? t(`actions.${action.key}`)
            : t("completion.reviewNext");
          return (
            <li
              key={step.id}
              data-practice-prerequisite={step.id}
              className="rounded-xl border border-amber-200 bg-white/70 p-3"
            >
              <p className="text-[11px] font-semibold text-ink">
                {missingCheck
                  ? t(`checks.${missingCheck.id}`)
                  : t(`steps.${step.id}.question`)}
              </p>
              <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                {reasonCode
                  ? t(`reasons.${reasonCode}`)
                  : t(`steps.${step.id}.description`)}
              </p>
              {permitted ? (
                <Link
                  href={href}
                  data-readiness-action={
                    context === "readiness" ? "customerJourney" : undefined
                  }
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-900 px-4 text-[10px] font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50"
                >
                  {label}
                  <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="mt-2 inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-amber-300 px-4 text-[10px] font-semibold text-amber-900/65"
                  >
                    <LockClosedIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                  <p className="mt-2 text-[9px] leading-4 text-ink-muted">
                    {t("readiness.permissionRequired")}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
function PracticeMode({ setup, t, onChanged, canStart, workspaceAccess }) {
  const practice = setup.practice ?? {};
  const needsRetest =
    practice.status === "complete" && practice.retestRecommended === true;
  const canManagePractice = canUseGrowthStepAction(workspaceAccess, {
    id: "practice_booking",
  });
  const completed = new Set(practice.completedActions ?? []);
  const nextAction = PRACTICE_ACTION_ORDER.find((item) => !completed.has(item));
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startPractice, startState] = useStartSetupPracticeMutation();
  const [advancePractice, advanceState] = useAdvanceSetupPracticeMutation();
  const [abandonPractice, abandonState] = useAbandonSetupPracticeMutation();
  const working =
    starting ||
    startState.isLoading ||
    advanceState.isLoading ||
    abandonState.isLoading;
  const start = async () => {
    if (working || !canStart || !canManagePractice) return;
    setError("");
    setStarting(true);
    try {
      if (needsRetest) {
        // The API requires the old completed session to be reset first.
        // Apply that snapshot even if starting the new session then fails.
        const resetResponse = await abandonPractice().unwrap();
        onChanged?.(resetResponse);
      }
      const response = await startPractice(
        makePracticeIdempotencyKey(),
      ).unwrap();
      onChanged?.(response);
    } catch (requestError) {
      setError(getSetupErrorMessage(requestError, t("errors.practice")));
    } finally {
      setStarting(false);
    }
  };
  const advance = async (action) => {
    setError("");
    try {
      const response = await advancePractice({
        runId: practice.runId,
        action,
      }).unwrap();
      onChanged?.(response);
    } catch (requestError) {
      setError(getSetupErrorMessage(requestError, t("errors.practice")));
    }
  };
  const reset = async () => {
    setError("");
    try {
      const response = await abandonPractice().unwrap();
      onChanged?.(response);
    } catch (requestError) {
      setError(getSetupErrorMessage(requestError, t("errors.practice")));
    }
  };
  return (
    <section className="mt-6 overflow-hidden rounded-[20px] border border-cobalt-200 bg-cobalt-50/50">
      <div className="flex flex-col gap-4 border-b border-cobalt-100 bg-cobalt-600 px-5 py-5 text-white sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/14">
          <PlayIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
            {t("practice.eyebrow")}
          </p>
          <h3 className="mt-1 text-[18px] font-semibold">
            {t("practice.title")}
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-white/80">
            {t("practice.safety")}
          </p>
        </div>
        {practice.status !== "not_started" && !needsRetest ? (
          <button
            type="button"
            onClick={reset}
            disabled={working || !canManagePractice}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/25 px-4 text-[10px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {t("practice.reset")}
          </button>
        ) : null}
      </div>

      <div className="p-5">
        {!canManagePractice ? (
          <p className="text-[10px] leading-5 text-ink-muted">
            {t("readiness.permissionRequired")}
          </p>
        ) : null}
        {!canStart ? (
          <PracticePrerequisites
            steps={getPracticeBookingBlockingSteps(setup)}
            t={t}
            workspaceAccess={workspaceAccess}
            context="detail"
          />
        ) : null}
        {practice.status === "not_started" ||
        practice.status === "expired" ||
        needsRetest ? (
          <div>
            <p className="max-w-2xl text-[12px] leading-6 text-ink-muted">
              {t(
                needsRetest
                  ? "readiness.items.customerJourney.descriptions.retest"
                  : "practice.description",
              )}
            </p>
            <button
              type="button"
              onClick={start}
              disabled={working || !canStart || !canManagePractice}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-cobalt-200 bg-white px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50 disabled:opacity-50"
            >
              {working ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {needsRetest
                ? t("readiness.runAgain")
                : practice.status === "expired"
                  ? t("practice.restart")
                  : t("practice.start")}
            </button>
          </div>
        ) : (
          <>
            <ol className="grid gap-2 md:grid-cols-2">
              {PRACTICE_ACTION_ORDER.map((action, index) => {
                const done = completed.has(action);
                const active = action === nextAction;
                return (
                  <li
                    key={action}
                    className={cx(
                      "flex min-h-[62px] items-center gap-3 rounded-[14px] border px-3.5 py-3",
                      done
                        ? "border-success/20 bg-success-soft"
                        : active
                          ? "border-cobalt-200 bg-white shadow-sm"
                          : "border-line bg-white/55",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        done
                          ? "bg-success text-white"
                          : active
                            ? "bg-cobalt-500 text-white"
                            : "bg-surface-muted text-ink-subtle",
                      )}
                    >
                      {done ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] font-medium text-ink">
                      {t(`practice.actions.${action}`)}
                    </span>
                    {active ? (
                      <button
                        type="button"
                        onClick={() => advance(action)}
                        disabled={working || !canStart || !canManagePractice}
                        className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-cobalt-50 px-3 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100 disabled:opacity-50"
                      >
                        {working ? t("practice.working") : t("practice.try")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {practice.artifacts?.length ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                  {t("practice.artifactsTitle")}
                </p>
                <div className="mt-2 grid gap-2">
                  {practice.artifacts.map((artifact, index) => (
                    <div
                      key={`${artifact.kind}-${artifact.createdAt ?? index}`}
                      className="rounded-[13px] border border-line bg-white px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-success" />
                        <p className="text-[10px] font-semibold text-ink">
                          {t(`practice.artifacts.${artifact.kind}`)}
                        </p>
                      </div>
                      <p className="mt-1 pl-6 text-[10px] leading-5 text-ink-muted">
                        {t(`practice.artifactDescriptions.${artifact.kind}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {practice.status === "complete" ? (
              <div className="mt-4 flex items-start gap-3 rounded-[14px] border border-success/20 bg-success-soft p-4 text-success">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold">
                    {t("practice.completedTitle")}
                  </p>
                  <p className="mt-1 text-[10px] leading-5">
                    {t("practice.completedDescription")}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[12px] border border-danger/20 bg-danger-soft px-3 py-2 text-[10px] text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
function SetupOutcomeSection({
  canConfigureWorkspace,
  canManageProducts,
  defaultOpen = false,
  description,
  id,
  onOpenChange,
  recommendations = [],
  steps,
  selectedStep,
  title,
  t,
  onSelect,
}) {
  const containsSelected = steps.some((item) => item.id === selectedStep?.id);
  const [open, setOpen] = useState(defaultOpen || containsSelected);
  const total = steps.length + recommendations.length;
  const completed =
    steps.filter(isStepDone).length +
    recommendations.filter((item) => item.complete).length;
  const progressLabel =
    id === "availableLater"
      ? t("sections.optionalCount", {
          count: total,
        })
      : completed === total
        ? t("sections.progressComplete", {
            completed,
            total,
          })
        : t("sections.progress", {
            completed,
            total,
          });
  if (!steps.length && !recommendations.length) return null;
  return (
    <details
      data-launch-section={id === "availableLater" ? "available-later" : id}
      className="group overflow-hidden rounded-[20px] border border-line bg-white shadow-card"
      open={open}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}
    >
      <summary className="flex min-h-[72px] cursor-pointer list-none items-center gap-3 px-4 py-3 marker:content-none sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">
            {title}
          </span>
          <span className="mt-0.5 block text-[10px] leading-5 text-ink-muted">
            {description}
          </span>
        </span>
        <span
          aria-label={progressLabel}
          className={cx(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums",
            id !== "availableLater" && completed === total
              ? "bg-success-soft text-success"
              : "bg-surface-muted text-ink-muted",
          )}
        >
          {progressLabel}
        </span>
        <ChevronRightIcon
          className="h-4 w-4 shrink-0 text-ink-subtle transition group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <ol
        id={`launch-center-${id}`}
        className="space-y-1 border-t border-line p-2 sm:p-3"
      >
        {steps.map((item) => {
          const Icon = statusIcon(item);
          const selected = item.id === selectedStep?.id;
          const displayState = getSetupDisplayState(item);
          const ready = displayState === "ready";
          const selectable = isStepApplicable(item);
          const inactiveHref = getInactiveSetupHref(item);
          const canOpenInactive = canConfigureWorkspace;
          const rowTitle = t(
            `steps.${item.id}.${ready ? "outcome" : "question"}`,
          );
          const rowState = t(`viewStates.${displayState}`);
          const rowContent = (
            <>
              <span
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  ready
                    ? "bg-success-soft text-success"
                    : selected
                      ? "bg-white text-terracotta-700 shadow-sm"
                      : "bg-surface text-ink-muted",
                )}
              >
                <Icon className="h-4 w-4 lg:h-4.5 lg:w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold leading-5 text-ink">
                  {rowTitle}
                </span>
                <span
                  className={cx(
                    "mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em]",
                    ready ? "text-success" : "text-ink-subtle",
                  )}
                >
                  {rowState}
                </span>
              </span>
              {selectable || canOpenInactive ? (
                <ChevronRightIcon
                  className={cx(
                    "h-4 w-4 shrink-0 transition",
                    selected ? "text-terracotta-700" : "text-ink-subtle",
                  )}
                />
              ) : null}
            </>
          );
          const rowClassName = cx(
            "flex min-h-[62px] w-full items-center gap-3 rounded-[14px] px-3 text-left transition sm:px-4",
            selected
              ? "bg-coral-100"
              : selectable || canOpenInactive
                ? "hover:bg-surface-muted"
                : "cursor-default",
          );
          return (
            <li key={item.id}>
              {selectable ? (
                <button
                  type="button"
                  aria-controls={LAUNCH_CENTER_DETAIL_ANCHOR}
                  aria-current={selected ? "step" : undefined}
                  aria-expanded={selected}
                  aria-label={`${rowTitle}. ${rowState}`}
                  onClick={() => onSelect(item)}
                  className={rowClassName}
                >
                  {rowContent}
                </button>
              ) : canOpenInactive ? (
                <Link
                  href={inactiveHref}
                  aria-label={`${rowTitle}. ${rowState}`}
                  className={rowClassName}
                >
                  {rowContent}
                </Link>
              ) : (
                <div
                  aria-label={`${rowTitle}. ${rowState}`}
                  className={rowClassName}
                >
                  {rowContent}
                </div>
              )}
            </li>
          );
        })}
        {recommendations.map((item) => {
          const itemTitle = t(`learning.items.${item.id}`);
          const itemState = item.complete
            ? t("viewStates.ready")
            : t("viewStates.recommended");
          const content = (
            <>
              {item.complete ? (
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <InformationCircleIcon className="h-5 w-5 shrink-0 text-ink-muted" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold leading-5 text-ink">
                  {itemTitle}
                </span>
                <span
                  className={cx(
                    "mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em]",
                    item.complete ? "text-success" : "text-ink-subtle",
                  )}
                >
                  {itemState}
                </span>
              </span>
              {item.action?.enabled ? (
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
              ) : (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  {t("learning.comingSoon")}
                </span>
              )}
            </>
          );
          const className =
            "flex min-h-[62px] w-full items-center gap-3 rounded-[14px] px-3 text-left transition sm:px-4";
          return (
            <li key={`recommendation-${item.id}`}>
              {item.action?.enabled ? (
                <Link
                  href={item.action.href}
                  aria-label={`${itemTitle}. ${itemState}`}
                  className={`${className} hover:bg-surface-muted`}
                >
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
function WorkflowIntentAction({ t }) {
  return (
    <section className="mt-5 overflow-hidden rounded-[22px] border border-coral-200 bg-white shadow-[0_18px_48px_rgb(var(--skab-coral-rgb)/0.12)]">
      <div className="grid md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-terracotta-700">
            <StarIcon className="h-4 w-4" aria-hidden="true" />
            {t("viewStates.setup_needed")}
          </p>
          <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.045em] text-ink">
            {t("workflowIntent.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-ink-muted">
            {t("workflowIntent.description")}
          </p>
        </div>
        <div className="flex items-center border-t border-coral-100 bg-coral-50/55 p-5 md:min-w-[210px] md:border-l md:border-t-0">
          <Link
            href="/app/settings/modules?from=launch-center"
            data-launch-primary-action="true"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-skab-coral-700 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-skab-coral-800"
          >
            {t("workflowIntent.action")}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
const READINESS_STATUS_STYLES = Object.freeze({
  ready: "border-success/20 bg-success-soft/35 text-success",
  action_required: "border-amber-200 bg-amber-50 text-amber-900",
  pending: "border-cobalt-200 bg-cobalt-50 text-cobalt-800",
  not_needed: "border-line bg-surface text-ink-muted",
});
const formatReadinessTimestamp = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};
function ManualPracticeConfirmation({
  setup,
  locale,
  t,
  permitted,
  onChanged,
  onRefresh,
}) {
  const confirmation = setup.practice?.manualConfirmation;
  const fingerprint = setup.diagnostics?.readinessFingerprint;
  const testBooking = setup.launchReview?.testBooking;
  const current = confirmation?.current === true;
  const prerequisitesReady =
    setup.launchReview?.required?.complete === true &&
    (setup.launchReview?.publicSite?.published === true ||
      setup.publication?.status === "live") &&
    testBooking?.canStart !== false;
  const [checkedFingerprint, setCheckedFingerprint] = useState(null);
  const checked = Boolean(fingerprint && checkedFingerprint === fingerprint);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const pending = useRef(false);
  const [confirmPractice] = useConfirmSetupPracticeMutation();
  const [removeConfirmation] = useRemoveSetupPracticeConfirmationMutation();
  const canConfirm = permitted && prerequisitesReady && Boolean(fingerprint);
  const save = async (remove = false) => {
    if (
      pending.current ||
      !permitted ||
      (remove ? !confirmation : !canConfirm || !checked)
    ) {
      return;
    }
    pending.current = true;
    setWorking(true);
    setError("");
    try {
      const response = await (
        remove ? removeConfirmation() : confirmPractice(fingerprint)
      ).unwrap();
      setCheckedFingerprint(null);
      onChanged(response);
    } catch (requestError) {
      const code = requestError?.data?.code ?? requestError?.data?.error?.code;
      if (code === "SETUP_PRACTICE_CONFIGURATION_CHANGED") {
        setCheckedFingerprint(null);
        setError(t("practice.manual.configurationChanged"));
        await Promise.resolve(onRefresh?.()).catch(() => null);
      } else {
        setError(
          t(remove ? "practice.manual.undoError" : "practice.manual.error"),
        );
      }
    } finally {
      pending.current = false;
      setWorking(false);
    }
  };
  return (
    <div
      data-practice-manual-confirmation="true"
      className="mt-4 rounded-xl border border-current/15 bg-white/70 p-3 text-ink"
    >
      <p className="text-[11px] font-semibold">{t("practice.manual.title")}</p>
      {current ? (
        <p role="status" className="mt-2 text-[10px] leading-5 text-success">
          {t("practice.manual.confirmed", {
            date: formatReadinessTimestamp(confirmation.confirmedAt, locale),
          })}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[10px] leading-5 text-ink-muted">
            {t(
              confirmation
                ? "practice.manual.stale"
                : "practice.manual.description",
            )}
          </p>
          <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-2 py-2 text-[11px] leading-5">
            <input
              type="checkbox"
              checked={checked}
              disabled={working || !canConfirm}
              onChange={(event) =>
                setCheckedFingerprint(event.target.checked ? fingerprint : null)
              }
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-cobalt-600 focus:ring-cobalt-500 disabled:cursor-not-allowed"
            />
            <span>{t("practice.manual.checkbox")}</span>
          </label>
          <button
            type="button"
            onClick={() => save()}
            disabled={working || !canConfirm || !checked}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cobalt-600 px-4 text-[10px] font-semibold text-white transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {t(working ? "practice.manual.saving" : "practice.manual.confirm")}
          </button>
          <p className="mt-2 text-[9px] leading-4 text-ink-muted">
            {t("practice.manual.note")}
          </p>
        </>
      )}
      {confirmation ? (
        <button
          type="button"
          onClick={() => save(true)}
          disabled={working || !permitted}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line bg-white px-4 text-[10px] font-semibold text-ink-muted transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {t(
            working && current
              ? "practice.manual.saving"
              : "practice.manual.undo",
          )}
        </button>
      ) : null}
      {!permitted ? (
        <p className="mt-2 text-[9px] leading-4 text-ink-muted">
          {t("readiness.permissionRequired")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[10px] leading-5 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
const READINESS_STEP_IDS = Object.freeze({
  publicSite: "public_site",
  bookings: "bookable_offer",
  payments: "payments",
  emails: "communications",
  customerJourney: "practice_booking",
});
const READINESS_FALLBACK_HREFS = Object.freeze({
  publicSite: "/app/settings/public-site",
  bookings: "/app/products?setupStep=bookable_offer",
  payments: "/app/setup?step=payments",
  emails: "/app/communications?section=setup&setupStep=communications",
  customerJourney: "/app/setup?step=practice_booking",
});
const getReadinessAction = ({ canPublish, item, permissions, setup, t }) => {
  if (!["action_required", "pending"].includes(item.status)) return null;
  if (item.descriptionVariant === "blocked") return null;
  if (item.id === "publicSite" && isLaunchReadyToPublish(setup)) {
    return {
      href: "/app/setup?step=publish",
      label: t("completion.launchStudio"),
      permitted: canPublish,
    };
  }
  if (item.id === "customerJourney" && item.retestRecommended) {
    return {
      href: "/app/setup?step=practice_booking&review=ready",
      label: t("readiness.runAgain"),
      permitted: permissions.customerJourney,
    };
  }
  if (item.id === "customerJourney") {
    const launchReview = setup?.launchReview ?? {};
    const publicSiteAvailable =
      launchReview.publicSite?.published === true ||
      setup?.publication?.status === "live";
    const testBooking = launchReview.testBooking;
    const canStart =
      launchReview.required?.complete === true &&
      publicSiteAvailable &&
      testBooking?.applicable !== false &&
      testBooking?.canStart !== false &&
      testBooking?.action?.enabled !== false;
    if (!canStart) return null;
  }
  const stepId = READINESS_STEP_IDS[item.id];
  const step = getStep(setup, stepId);
  const stepAction = getPrimaryAction(step);
  if (stepAction?.enabled === false) return null;
  const permitted =
    item.id === "bookings" && stepAction?.key === "schedule_offer"
      ? permissions.bookingsSchedule
      : permissions[item.id];
  const customerJourneyHref =
    item.id === "customerJourney"
      ? setup?.launchReview?.testBooking?.action?.href
      : null;
  const href =
    customerJourneyHref ??
    getSetupActionHref(step, stepAction) ??
    READINESS_FALLBACK_HREFS[item.id];
  if (!href) return null;
  return {
    href,
    label: t(`readiness.items.${item.id}.action`),
    permitted,
  };
};
function ReadinessCard({
  action,
  compact = false,
  item,
  number,
  locale,
  t,
  blockingSteps = [],
  workspaceAccess,
  onAction,
  children,
}) {
  const status = item.status;
  const StatusIcon =
    status === "ready" || status === "not_needed"
      ? CheckCircleIcon
      : status === "action_required"
        ? ExclamationTriangleIcon
        : status === "pending"
          ? ArrowPathIcon
          : InformationCircleIcon;
  const descriptionVariant =
    item.descriptionVariant ??
    (item.id === "publicSite" && item.hasUnpublishedChanges
      ? "changes"
      : item.id === "customerJourney" && item.retestRecommended
        ? "retest"
        : status);
  const completedAt = formatReadinessTimestamp(item.completedAt, locale);
  return (
    <li
      data-readiness-item={item.id}
      data-readiness-status={status}
      className={cx(
        "flex min-w-0 flex-col rounded-[15px] border",
        compact ? "p-2.5" : "p-4",
        READINESS_STATUS_STYLES[status],
      )}
    >
      <div className="flex items-start gap-2.5">
        <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-ink-muted">
            {t("stepNumber", {
              number,
            })}
          </p>
          <p className="text-[11px] font-semibold leading-5 text-ink">
            {t(`readiness.items.${item.id}.title`)}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
            {t(`readiness.status.${status}`)}
          </p>
        </div>
      </div>
      <p
        className={cx(
          "text-[10px] leading-[18px] text-ink-muted",
          compact ? "mt-1.5" : "mt-2",
        )}
      >
        {t(`readiness.items.${item.id}.descriptions.${descriptionVariant}`)}
      </p>
      <PracticePrerequisites
        steps={blockingSteps}
        t={t}
        workspaceAccess={workspaceAccess}
        context="readiness"
      />
      {completedAt ? (
        <p className="mt-1 text-[9px] leading-4 text-ink-muted">
          {t(
            item.id === "customerJourney"
              ? "readiness.lastChecked"
              : "readiness.publishedAt",
            {
              value: completedAt,
            },
          )}
        </p>
      ) : null}
      {children}
      {action?.permitted ? (
        <Link
          href={action.href}
          onClick={onAction}
          data-readiness-action={item.id}
          data-readiness-action-permitted="true"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 self-start rounded-full bg-amber-900 px-4 text-[10px] font-semibold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50 sm:w-auto"
        >
          {action.label}
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : action ? (
        <div className="mt-4">
          <button
            type="button"
            disabled
            data-readiness-action={item.id}
            data-readiness-action-permitted="false"
            className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-amber-300 bg-white/60 px-4 text-[10px] font-semibold text-amber-900/65 sm:w-auto"
          >
            <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {action.label}
          </button>
          <p className="mt-2 text-[9px] leading-4 text-amber-900/75">
            {t("readiness.permissionRequired")}
          </p>
        </div>
      ) : null}
    </li>
  );
}
function StudioProfileCard({ configuration, locale, t, workflowT }) {
  if (configuration?.intent?.configured !== true) return null;
  const hasExactAnswers = hasStoredWorkspaceWorkflowAnswers(configuration);
  const answers = getWorkspaceWorkflowAnswers(configuration);
  const selectedQuestions = WORKSPACE_WORKFLOW_QUESTIONS.filter((question) =>
    question.options
      ? question.options.includes(answers[question.id])
      : answers[question.id] === true,
  );
  const visibleSelectedQuestions = selectedQuestions.slice(0, 4);
  const hiddenSelectedCount = Math.max(
    selectedQuestions.length - visibleSelectedQuestions.length,
    0,
  );
  const updatedAt = formatReadinessTimestamp(
    configuration.intent.updatedAt,
    locale,
  );
  return (
    <section
      data-studio-profile="true"
      data-studio-profile-source={
        hasExactAnswers ? "questionnaire" : "inferred"
      }
      className="overflow-hidden rounded-[22px] border border-cobalt-100 bg-[linear-gradient(120deg,rgba(235,241,255,0.92),rgba(255,254,251,0.98)_58%,rgba(255,239,231,0.7))] shadow-card"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-cobalt-600 text-white shadow-cobalt">
            <StarIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
              {t(
                hasExactAnswers ? "profile.eyebrow" : "profile.inferredEyebrow",
              )}
            </p>
            <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.04em] text-ink">
              {t("profile.title")}
            </h2>
            <p className="mt-1.5 max-w-3xl text-[11px] leading-5 text-ink-muted">
              {t(
                hasExactAnswers
                  ? "profile.description"
                  : "profile.inferredDescription",
              )}
            </p>
            {!hasExactAnswers ? (
              <span className="mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[9px] font-semibold text-amber-900">
                <ExclamationTriangleIcon
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                {t("profile.inferredBadge")}
              </span>
            ) : null}
          </div>
          <Link
            href="/app/settings/modules?from=launch-center&workflow=edit"
            data-studio-profile-edit="true"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[10px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-700 sm:w-auto"
          >
            {t("profile.edit")}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {visibleSelectedQuestions.length ? (
            visibleSelectedQuestions.map((question) => (
              <span
                key={question.id}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-cobalt-100 bg-white/85 px-3.5 text-[10px] font-semibold text-cobalt-900 shadow-sm"
              >
                <CheckCircleIcon
                  className="h-4 w-4 text-success"
                  aria-hidden="true"
                />
                {question.options
                  ? workflowT(
                      `workflowQuestions.pricingModes.${answers[question.id]}`,
                    )
                  : t(`profile.items.${question.id}`)}
              </span>
            ))
          ) : (
            <p className="rounded-[13px] border border-line bg-white/80 px-4 py-3 text-[10px] text-ink-muted">
              {t("profile.noneSelected")}
            </p>
          )}
          {hiddenSelectedCount ? (
            <span className="inline-flex min-h-9 items-center rounded-full border border-cobalt-100 bg-cobalt-50 px-3.5 text-[10px] font-semibold text-cobalt-700">
              {t("profile.more", {
                count: hiddenSelectedCount,
              })}
            </span>
          ) : null}
        </div>
      </div>

      <details className="group border-t border-cobalt-100/80 bg-white/60">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 text-[10px] font-semibold text-cobalt-700 marker:content-none sm:px-6">
          <span className="min-w-0 flex-1">{t("profile.viewAnswers")}</span>
          {updatedAt ? (
            <span className="hidden font-normal text-ink-subtle sm:inline">
              {t("profile.updatedAt", {
                value: updatedAt,
              })}
            </span>
          ) : null}
          <ChevronRightIcon
            className="h-4 w-4 shrink-0 transition group-open:rotate-90"
            aria-hidden="true"
          />
        </summary>
        <ul className="grid gap-2 border-t border-cobalt-100/70 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {WORKSPACE_WORKFLOW_QUESTIONS.map((question) => {
            const enabled = question.options
              ? question.options.includes(answers[question.id])
              : answers[question.id] === true;
            return (
              <li
                key={question.id}
                className="flex min-h-[58px] items-start gap-2.5 rounded-[13px] border border-line bg-white px-3.5 py-3"
              >
                <CheckCircleIcon
                  className={cx(
                    "mt-0.5 h-4 w-4 shrink-0",
                    enabled ? "text-success" : "text-ink-subtle",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold leading-4 text-ink">
                    {workflowT(
                      `workflowQuestions.items.${question.id}.question`,
                    )}
                  </span>
                  <span
                    className={cx(
                      "mt-1 block text-[9px] font-semibold uppercase tracking-[0.08em]",
                      enabled ? "text-success" : "text-ink-subtle",
                    )}
                  >
                    {question.options
                      ? workflowT(
                          enabled
                            ? `workflowQuestions.pricingModes.${answers[question.id]}`
                            : "workflowQuestions.pricingNotSelected",
                        )
                      : t(enabled ? "profile.enabled" : "profile.notEnabled")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
function GrowthStudioSection({
  canConfigureWorkspace,
  canManageProducts,
  canManageTeam,
  recommendations,
  steps,
  t,
  workspaceAccess,
}) {
  const stepItems = steps
    .filter((step) => step.status !== "complete")
    .map((step) => {
      const action = getPrimaryAction(step);
      const activeHref =
        isStepApplicable(step) &&
        action?.enabled !== false &&
        canUseGrowthStepAction(workspaceAccess, step, action)
          ? getSetupActionHref(step, action)
          : null;
      const canOpenInactive = !isStepApplicable(step) && canConfigureWorkspace;
      const href =
        activeHref ?? (canOpenInactive ? getInactiveSetupHref(step) : null);
      return {
        id: step.id,
        title: t(`steps.${step.id}.question`),
        href,
        enabled: Boolean(href),
      };
    });
  const recommendationItems = recommendations
    .filter((item) => !item.complete)
    .map((item) => {
      const href = item.action?.href;
      return {
        id: `recommendation-${item.id}`,
        title: t(`learning.items.${item.id}`),
        href,
        enabled:
          Boolean(href) &&
          item.action?.enabled !== false &&
          canUseGrowthRecommendation(workspaceAccess, item),
      };
    });
  const items = [...stepItems, ...recommendationItems];
  if (canManageTeam && !items.some((item) => item.id === "team")) {
    items.push({
      id: "team",
      title: t("growth.inviteTeam"),
      href: "/app/settings/team?action=add",
      enabled: true,
    });
  }
  if (
    canConfigureWorkspace &&
    !items.some((item) => item.enabled && item.href)
  ) {
    items.push({
      id: "workspace",
      title: t("growth.reviewWorkspace"),
      href: "/app/settings/modules?from=launch-center",
      enabled: true,
    });
  }
  const primaryItem = items.find((item) => item.enabled && item.href) ??
    items[0] ?? {
      id: "complete",
      title: t("growth.allSet"),
      enabled: false,
    };
  return (
    <section
      data-growth-studio="true"
      className="relative isolate overflow-hidden rounded-[24px] bg-skab-cobalt-900 text-white shadow-[0_24px_70px_rgb(var(--skab-blue-rgb)/0.22)]"
    >
      <WorkspaceBrushField variant="launchHero" />
      <div className="relative z-10 p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-coral-200">
              {t("growth.eyebrow")}
            </p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.045em] text-white sm:text-[28px]">
              {t("growth.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-white/72">
              {t("growth.description")}
            </p>
          </div>
          <span className="inline-flex min-h-8 shrink-0 items-center self-start rounded-full border border-white/15 bg-white/10 px-3 text-[10px] font-semibold text-white/80">
            {t("growth.opportunityCount", {
              count: items.length,
            })}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-[18px] border border-white/12 bg-[#FFF8EA] p-4 text-ink shadow-[0_18px_45px_rgba(15,29,76,0.2)] sm:flex-row sm:items-center sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-coral-100 text-terracotta-800">
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-terracotta-700">
              {t("growth.next")}
            </p>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-ink">
              {primaryItem.title}
            </p>
          </div>
          {primaryItem.enabled && primaryItem.href ? (
            <Link
              href={primaryItem.href}
              data-growth-primary-action={primaryItem.id}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[10px] font-semibold text-white transition hover:bg-cobalt-700 sm:w-auto"
            >
              {t("growth.explore")}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
              {t("growth.unavailable")}
            </span>
          )}
        </div>
      </div>

      {items.length > 1 ? (
        <details className="group relative z-10 border-t border-white/10 bg-white/[0.04]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-[10px] font-semibold text-white/80 marker:content-none sm:px-7">
            <span className="min-w-0 flex-1">{t("growth.viewAll")}</span>
            <ChevronRightIcon
              className="h-4 w-4 shrink-0 transition group-open:rotate-90"
              aria-hidden="true"
            />
          </summary>
          <ul className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                {item.enabled && item.href ? (
                  <Link
                    href={item.href}
                    data-growth-opportunity={item.id}
                    className="flex min-h-[58px] items-center gap-3 rounded-[14px] border border-white/12 bg-white/[0.07] px-4 text-[10px] font-semibold leading-5 text-white transition hover:bg-white/[0.12]"
                  >
                    <StarIcon
                      className="h-4 w-4 shrink-0 text-coral-200"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">{item.title}</span>
                    <ArrowRightIcon
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <div className="flex min-h-[58px] items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[10px] leading-5 text-white/60">
                    <StarIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{item.title}</span>
                    <span className="text-[8px] font-semibold uppercase tracking-[0.08em]">
                      {t("growth.unavailable")}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
function CompletionCelebration({
  canPublish,
  canUpdateWorkspace,
  locale,
  readinessActionPermissions,
  setup,
  t,
  workspaceAccess,
  onPublicSiteOpened,
  onTestBookingOpened,
  onChanged,
  onRefresh,
}) {
  const publicLinkRef = useRef(null);
  const [publicSiteUrl, setPublicSiteUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");
  const bookableOfferStep = getStep(setup, "bookable_offer");
  const bookableOfferReady =
    isStepApplicable(bookableOfferStep) &&
    bookableOfferStep.status === "complete";
  const launchReview = setup.launchReview ?? {};
  const launchPrerequisitesComplete = launchReview.required?.complete === true;
  const paymentReady = isPaymentSetupReady(setup);
  const readyToPublish = isLaunchReadyToPublish(setup);
  const launchComplete = isLaunchJourneyComplete(setup);
  const publicSiteApplicable = launchReview.publicSite?.applicable !== false;
  const publicSiteAvailable =
    launchReview.publicSite?.published === true ||
    launchReview.publicSite?.available === true ||
    setup.publication?.status === "live";
  const publicSiteHref =
    launchReview.publicSite?.publicPath ?? launchReview.publicSite?.path ?? "/";
  const testBookingAvailable = launchReview.testBooking
    ? launchPrerequisitesComplete &&
      launchReview.testBooking.applicable !== false &&
      launchReview.testBooking.complete !== true &&
      launchReview.testBooking.canStart !== false &&
      launchReview.testBooking.action?.enabled !== false &&
      publicSiteAvailable
    : launchPrerequisitesComplete && bookableOfferReady && publicSiteAvailable;
  const testBookingHref =
    launchReview.testBooking?.action?.href ??
    "/app/setup?step=practice_booking";
  const launched = publicSiteApplicable && launchComplete;
  const publishedAwaitingTest =
    publicSiteApplicable &&
    publicSiteAvailable &&
    launchPrerequisitesComplete &&
    !launchComplete;
  const operationalComplete = launchComplete && !publicSiteApplicable;
  const publishStep = getStep(setup, "publish");
  const publishAction = getPrimaryAction(publishStep);
  const canLaunchStudio =
    canPublish &&
    readyToPublish &&
    publicSiteApplicable &&
    isStepApplicable(publishStep) &&
    publishAction?.enabled === true;
  const nextStep = getNextBestSetupStep(setup);
  const nextAction = getPrimaryAction(nextStep);
  const nextHref = getSetupActionHref(nextStep, nextAction);
  const nextActionPermitted = nextStep?.id !== "publish" || canPublish;
  const readinessItems = getLaunchReadinessItems(setup);
  const attentionReadinessItems = readinessItems.filter((item) =>
    ["action_required", "pending"].includes(item.status),
  );
  const completedReadinessItems = readinessItems.filter((item) =>
    ["ready", "not_needed"].includes(item.status),
  );
  const nonJourneyNeedsAttention = readinessItems.some(
    (item) =>
      item.id !== "customerJourney" &&
      ["action_required", "pending"].includes(item.status),
  );
  const readinessAllClear = readinessItems.every((item) =>
    ["ready", "not_needed"].includes(item.status),
  );
  useEffect(() => {
    if (!publicSiteAvailable) return;
    const resolvedHref = publicLinkRef.current?.href;
    if (resolvedHref) {
      setPublicSiteUrl(resolvedHref);
      return;
    }
    try {
      setPublicSiteUrl(
        new URL(publicSiteHref, window.location.origin).toString(),
      );
    } catch {
      setPublicSiteUrl(publicSiteHref);
    }
  }, [publicSiteAvailable, publicSiteHref]);
  const practiceRetestRecommended = isTestBookingRetestRecommended(setup);
  const liveSetupNeedsAttention =
    publicSiteAvailable &&
    (setup.health === "needs_attention" ||
      practiceRetestRecommended ||
      nonJourneyNeedsAttention);
  const copyVariant = liveSetupNeedsAttention
    ? "attention"
    : launched
      ? "launched"
      : operationalComplete
        ? "operational"
        : publishedAwaitingTest || publicSiteAvailable
          ? "published"
          : readyToPublish
            ? "ready"
            : "payments";
  const paymentOnly = copyVariant === "payments";
  const needsAttention =
    copyVariant === "attention" || attentionReadinessItems.length > 0;
  const readinessCompact =
    !needsAttention && launchComplete && readinessAllClear;
  let primaryActionConfig;
  if (practiceRetestRecommended && publicSiteAvailable) {
    primaryActionConfig = {
      href: "/app/setup?step=practice_booking&review=ready",
      label: t("readiness.runAgain"),
      kind: "test",
      Icon: ArrowPathIcon,
    };
  } else if (canLaunchStudio) {
    primaryActionConfig = {
      href: "/app/setup?step=publish",
      label: t("completion.launchStudio"),
      kind: "launch",
      Icon: RocketLaunchIcon,
    };
  } else if (testBookingAvailable) {
    primaryActionConfig = {
      href: testBookingHref,
      label: t("completion.testBooking"),
      kind: "test",
      Icon: ArrowTopRightOnSquareIcon,
    };
  } else if (
    (!launchComplete || needsAttention) &&
    nextStep &&
    nextActionPermitted &&
    nextAction?.enabled &&
    nextHref
  ) {
    primaryActionConfig = {
      href: nextHref,
      label: t(`actions.${nextAction.key}`),
      kind: "next",
      Icon: ArrowRightIcon,
    };
  } else if (
    (!launchComplete || needsAttention) &&
    nextStep &&
    nextActionPermitted
  ) {
    primaryActionConfig = {
      href: `/app/setup?step=${nextStep.id}`,
      label: t("completion.reviewNext"),
      kind: "next",
      Icon: ArrowRightIcon,
    };
  } else if (publicSiteAvailable) {
    primaryActionConfig = {
      href: publicSiteHref,
      label: t("completion.viewPublicStudio"),
      kind: "public",
      Icon: ArrowTopRightOnSquareIcon,
    };
  } else {
    primaryActionConfig = {
      href: "/app",
      label: t("completion.dashboard"),
      kind: "dashboard",
      Icon: ArrowRightIcon,
    };
  }
  const showStandalonePrimaryAction =
    !["dashboard", "public"].includes(primaryActionConfig.kind) &&
    attentionReadinessItems.length === 0;
  const copyPublicSiteLink = async () => {
    const value = publicSiteUrl || publicSiteHref;
    setCopyStatus("idle");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const activeElement = document.activeElement;
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        textArea.remove();
        activeElement?.focus?.();
        if (!copied) throw new Error("Copy command failed");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };
  const PrimaryIcon = primaryActionConfig.Icon;
  return (
    <section
      data-launch-final-review={paymentOnly ? undefined : "true"}
      data-payment-readiness={paymentReady ? "ready" : undefined}
      data-launch-health={needsAttention ? "needs-attention" : "healthy"}
      data-readiness-density={readinessCompact ? "compact" : "standard"}
      className={cx(
        "overflow-hidden rounded-[24px] border shadow-card",
        needsAttention
          ? "border-line bg-white"
          : "border-success/20 bg-success-soft",
      )}
    >
      {needsAttention ? (
        <div
          data-launch-attention-accent="true"
          className="h-0.5 bg-amber-300/70"
          aria-hidden="true"
        />
      ) : null}
      <div className="p-4 sm:p-5 lg:px-6 lg:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p
              className={cx(
                "text-[10px] font-semibold uppercase tracking-[0.17em]",
                needsAttention ? "text-amber-800" : "text-success",
              )}
            >
              {t(`completion.${copyVariant}Eyebrow`)}
            </p>
            <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.045em] text-ink sm:text-[28px]">
              {needsAttention &&
              publicSiteAvailable &&
              attentionReadinessItems.length
                ? t("completion.attentionTitleCount", {
                    count: attentionReadinessItems.length,
                  })
                : t(`completion.${copyVariant}Title`)}
            </h2>
            <p className="mt-1.5 max-w-3xl text-[11px] leading-5 text-ink-muted sm:text-[12px] sm:leading-6">
              {t(`completion.${copyVariant}Description`)}
            </p>
          </div>
          <span
            className={cx(
              "inline-flex min-h-8 shrink-0 items-center self-start rounded-full px-3 text-[10px] font-semibold",
              needsAttention
                ? "bg-amber-100 text-amber-900"
                : "bg-white/70 text-success",
            )}
          >
            {t(
              needsAttention
                ? "readiness.issueCount"
                : launchComplete && readinessAllClear
                  ? "readiness.overallReady"
                  : "readiness.overallProgress",
              needsAttention
                ? {
                    count: Math.max(1, attentionReadinessItems.length),
                  }
                : undefined,
            )}
          </span>
        </div>

        <div className="mt-3.5 border-t border-black/5 pt-3.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">
                {t("readiness.title")}
              </h3>
              <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                {t("readiness.scope")}
              </p>
            </div>
          </div>

          <p
            data-readiness-summary="true"
            className="mt-3 text-[10px] font-semibold text-ink-muted"
          >
            {t("readiness.completedSummary", {
              completed: completedReadinessItems.length,
              total: readinessItems.length,
            })}
          </p>
          <ol
            data-readiness-checklist="true"
            aria-label={t("readiness.title")}
            className="mt-3 grid gap-3 md:grid-cols-2"
          >
            {readinessItems.map((item, index) => (
              <ReadinessCard
                key={item.id}
                item={item}
                number={index + 1}
                compact={readinessCompact}
                locale={locale}
                t={t}
                blockingSteps={
                  item.descriptionVariant === "blocked"
                    ? getPracticeBookingBlockingSteps(setup)
                    : []
                }
                workspaceAccess={workspaceAccess}
                action={getReadinessAction({
                  canPublish,
                  item,
                  permissions: readinessActionPermissions,
                  setup,
                  t,
                })}
                onAction={
                  item.id === "customerJourney"
                    ? onTestBookingOpened
                    : undefined
                }
              >
                {item.id === "customerJourney" &&
                item.status !== "not_needed" &&
                (item.status !== "ready" ||
                  setup.practice?.manualConfirmation) ? (
                  <ManualPracticeConfirmation
                    setup={setup}
                    locale={locale}
                    t={t}
                    permitted={readinessActionPermissions.customerJourney}
                    onChanged={onChanged}
                    onRefresh={onRefresh}
                  />
                ) : null}
              </ReadinessCard>
            ))}
          </ol>
        </div>

        {showStandalonePrimaryAction ? (
          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryActionConfig.href}
              target={
                primaryActionConfig.kind === "public" ? "_blank" : undefined
              }
              rel={
                primaryActionConfig.kind === "public"
                  ? "noopener noreferrer"
                  : undefined
              }
              data-launch-primary-action="true"
              data-launch-test-booking={
                primaryActionConfig.kind === "test" ? "true" : undefined
              }
              onClick={
                primaryActionConfig.kind === "public"
                  ? onPublicSiteOpened
                  : primaryActionConfig.kind === "test"
                    ? onTestBookingOpened
                    : undefined
              }
              className={cx(
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[11px] font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto",
                needsAttention
                  ? "bg-amber-800 hover:bg-amber-900 focus-visible:ring-amber-600"
                  : "bg-success hover:brightness-95 focus-visible:ring-success",
              )}
            >
              {primaryActionConfig.label}
              <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>

      {publicSiteAvailable ? (
        <div className="border-t border-black/5 bg-surface/50 px-5 py-3 lg:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("completion.publicAddress")}
              </p>
              <Link
                ref={publicLinkRef}
                href={publicSiteHref}
                data-launch-public-url="true"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onPublicSiteOpened}
                aria-label={t("completion.openPublicAddress")}
                className="mt-1 flex min-h-11 min-w-0 items-center gap-2 rounded-[10px] text-[11px] font-medium text-ink transition hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35"
              >
                <span className="truncate">
                  {publicSiteUrl || publicSiteHref}
                </span>
                <ArrowTopRightOnSquareIcon
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={publicSiteHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onPublicSiteOpened}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[10px] font-semibold text-ink-muted transition hover:border-success/30 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35"
              >
                <ArrowTopRightOnSquareIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {t("completion.openSite")}
              </Link>
              <button
                type="button"
                onClick={copyPublicSiteLink}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[10px] font-semibold text-ink-muted transition hover:border-success/30 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35"
              >
                {copyStatus === "copied" ? (
                  <CheckIcon
                    className="h-4 w-4 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <ClipboardDocumentIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                )}
                {t(
                  copyStatus === "copied"
                    ? "completion.linkCopied"
                    : "completion.copyLink",
                )}
              </button>
              {canUpdateWorkspace ? (
                <Link
                  href="/app/settings/public-site"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[10px] font-semibold text-ink-muted transition hover:border-cobalt-200 hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
                >
                  <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
                  {t("completion.domainSettings")}
                </Link>
              ) : null}
            </div>
          </div>
          <p
            className={
              copyStatus === "error"
                ? "mt-2 text-[10px] leading-5 text-danger"
                : "sr-only"
            }
            role="status"
            aria-live="polite"
          >
            {copyStatus === "copied"
              ? t("completion.copySuccess")
              : copyStatus === "error"
                ? t("completion.copyError")
                : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
export default function SetupCenterPage() {
  const t = useTranslations("SetupCenter");
  const workflowT = useTranslations("WorkspaceModules");
  const locale = useLocale();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiWorkspace = useAiWorkspace();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canPublish = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_PUBLISH,
  );
  const canUpdateWorkspace = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_UPDATE,
  );
  const canConfigureWorkspace = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
  );
  const canViewProducts = hasPermission(
    workspaceAccess,
    PERMISSIONS.PRODUCTS_VIEW,
  );
  const canManageProducts =
    canViewProducts &&
    hasPermission(workspaceAccess, PERMISSIONS.PRODUCTS_MANAGE);
  const canManagePayments = hasPermission(
    workspaceAccess,
    PERMISSIONS.PAYMENTS_CONNECT_MANAGE,
  );
  const canManageCommunications = hasPermission(
    workspaceAccess,
    PERMISSIONS.COMMUNICATIONS_MANAGE,
  );
  const canCreateBookings = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_CREATE,
  );
  const canViewBookings = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_VIEW,
  );
  const canImportCustomers = hasPermission(
    workspaceAccess,
    PERMISSIONS.CUSTOMERS_IMPORT,
  );
  const canManageTeam =
    hasPermission(workspaceAccess, PERMISSIONS.TEAM_VIEW) &&
    hasPermission(workspaceAccess, PERMISSIONS.TEAM_MANAGE);
  const query = useGetSetupCenterQuery(undefined, {
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const workspaceConfigurationQuery = useGetWorkspaceConfigurationQuery(
    undefined,
    {
      skip: !canConfigureWorkspace,
      refetchOnMountOrArgChange: true,
    },
  );
  const detailRef = useRef(null);
  const focusDetailAfterSelectionRef = useRef(false);
  const selectedStepId = searchParams.get("step") || "";
  const [feedback, setFeedback] = useState("");
  const [publishStudio, publishState] = usePublishStudioMutation();
  const [unpublishStudio, unpublishState] = useUnpublishStudioMutation();
  const [trackSetupEvent] = useTrackSetupEventMutation();
  const viewTrackedRef = useRef(false);
  const readyTrackedRef = useRef(false);
  const openedStepTrackedRef = useRef("");
  const setup = query.data;
  const workflowIntentNeedsConfirmation =
    canConfigureWorkspace &&
    workspaceConfigurationQuery.data?.intent?.configured === false;
  const workflowIntentIsLoading =
    canConfigureWorkspace &&
    !workspaceConfigurationQuery.data &&
    (workspaceConfigurationQuery.isLoading ||
      workspaceConfigurationQuery.isFetching);
  const sections = useMemo(() => getLaunchCenterSections(setup), [setup]);
  const paymentProgress = useMemo(
    () => getPaymentSetupProgress(setup),
    [setup],
  );
  const launchProgress = useMemo(() => getLaunchSetupProgress(setup), [setup]);
  const nextBestStep = useMemo(() => getNextBestSetupStep(setup), [setup]);
  const paymentRequirementsRemaining = Math.max(
    paymentProgress.total - paymentProgress.completed,
    0,
  );
  const launchRemaining = Math.max(
    launchProgress.total - launchProgress.completed,
    0,
  );
  const applySetupResponse = (response) => {
    dispatch(
      setupCenterApiSlice.util.upsertQueryData(
        "getSetupCenter",
        undefined,
        response,
      ),
    );
  };
  const selectSetupStep = (item) => {
    focusDetailAfterSelectionRef.current = true;
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("step", item.id);
    if (isStepDone(item)) {
      nextSearchParams.set("review", "ready");
    } else {
      nextSearchParams.delete("review");
    }
    router.replace(`/app/setup?${nextSearchParams.toString()}`, {
      scroll: false,
    });
    setFeedback("");
  };
  const requestedStep = getStep(setup, selectedStepId);
  const completedStepId = searchParams.get("completedStep") || "";
  const savedStepId = searchParams.get("saved") === "1" ? selectedStepId : "";
  const reviewingReadyStep = searchParams.get("review") === "ready";
  const launchJourneyComplete = isLaunchJourneyComplete(setup);
  const publicSiteLive =
    setup?.launchReview?.publicSite?.published === true ||
    setup?.publication?.status === "live";
  const postLaunch = launchJourneyComplete || publicSiteLive;
  const selectedStep =
    (isStepApplicable(requestedStep) &&
    (!isStepDone(requestedStep) || reviewingReadyStep)
      ? requestedStep
      : null) ??
    (postLaunch ? null : nextBestStep) ??
    null;
  const primaryAction = getPrimaryAction(selectedStep);
  const selectedActionHref = getSetupActionHref(selectedStep, primaryAction);
  const selectedActionEnabled = primaryAction?.enabled === true;
  const selectedActionPermitted = canUseGrowthStepAction(
    workspaceAccess,
    selectedStep,
    primaryAction,
  );
  const selectedActionKey = primaryAction?.key;
  const contextualGuide = useMemo(() => {
    if (!selectedStep || isStepDone(selectedStep) || !selectedActionEnabled) {
      return null;
    }
    const locationGuideMatchesAction =
      selectedStep.id !== "location" ||
      selectedActionHref?.split("?")[0] === "/app/settings/locations/new";
    const offerGuideMatchesAction =
      selectedStep.id !== "bookable_offer" ||
      selectedActionKey === "create_offer";
    if (!locationGuideMatchesAction || !offerGuideMatchesAction) return null;
    return getEligibleContextualGuideForSetupStep(selectedStep.id, {
      aiAvailable: aiWorkspace.available === true,
      tenant,
      workspaceAccess,
    });
  }, [
    aiWorkspace.available,
    selectedActionEnabled,
    selectedActionHref,
    selectedActionKey,
    selectedStep,
    tenant,
    workspaceAccess,
  ]);
  const contextualGuideHref = contextualGuide
    ? buildContextualGuideHref(contextualGuide)
    : null;
  const showSelectedExternalAction =
    selectedActionEnabled &&
    selectedActionPermitted &&
    !isStepDone(selectedStep);
  const paymentReady = isPaymentSetupReady(setup);
  const launchReadyToPublish = isLaunchReadyToPublish(setup);
  const showCompletion =
    !workflowIntentNeedsConfirmation &&
    (paymentReady ||
      launchReadyToPublish ||
      launchJourneyComplete ||
      publicSiteLive);
  const safeTestBooking = setup?.launchReview?.testBooking;
  const safeBookableOfferStep = getStep(setup, "bookable_offer");
  const safeLaunchPrerequisitesComplete =
    setup?.launchReview?.required?.complete === true;
  const safeTestBookingHref =
    safeTestBooking?.action?.href ?? "/app/setup?step=practice_booking";
  const safeTestBookingAvailable = safeTestBooking
    ? safeLaunchPrerequisitesComplete &&
      safeTestBooking.applicable !== false &&
      (safeTestBooking.complete !== true ||
        isTestBookingRetestRecommended(setup)) &&
      safeTestBooking.canStart !== false &&
      safeTestBooking.action?.enabled !== false &&
      publicSiteLive
    : safeLaunchPrerequisitesComplete &&
      isStepApplicable(safeBookableOfferStep) &&
      safeBookableOfferStep.status === "complete" &&
      publicSiteLive;
  const coreBookableOfferReady = hasCoreBookableOffer(selectedStep);
  const missingChecks = useMemo(
    () =>
      selectedStep?.checks?.filter(
        (item) => !item.complete && !item.optional,
      ) ?? [],
    [selectedStep],
  );
  useEffect(() => {
    if (!setup || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackSetupEvent(
      buildLaunchEvent({
        event: "launch_center_viewed",
        source: "launch_center",
        metadata: {
          phase: setup.phase ?? "launch",
        },
      }),
    )
      .unwrap()
      .catch(() => null);
  }, [setup, trackSetupEvent]);
  useEffect(() => {
    if (!selectedStep?.id || openedStepTrackedRef.current === selectedStep.id) {
      return;
    }
    openedStepTrackedRef.current = selectedStep.id;
    trackSetupEvent(
      buildLaunchEvent({
        event: "step_opened",
        stepId: selectedStep.id,
        source: "launch_center",
      }),
    )
      .unwrap()
      .catch(() => null);
  }, [selectedStep?.id, trackSetupEvent]);
  useEffect(() => {
    if (
      (!launchReadyToPublish && !launchJourneyComplete) ||
      readyTrackedRef.current
    ) {
      return;
    }
    readyTrackedRef.current = true;
    trackSetupEvent(
      buildLaunchEvent({
        event: "studio_ready",
        source: "final_review",
      }),
    )
      .unwrap()
      .catch(() => null);
  }, [launchJourneyComplete, launchReadyToPublish, trackSetupEvent]);
  useEffect(() => {
    if (!focusDetailAfterSelectionRef.current || !selectedStep) return;
    detailRef.current?.focus();
    focusDetailAfterSelectionRef.current = false;
  }, [selectedStep, selectedStepId]);
  useEffect(() => {
    if (
      !selectedStepId ||
      reviewingReadyStep ||
      !requestedStep ||
      !isStepDone(requestedStep)
    ) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("step");
    nextSearchParams.delete("review");
    const queryString = nextSearchParams.toString();
    router.replace(`/app/setup${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [requestedStep, reviewingReadyStep, router, searchParams, selectedStepId]);
  if ((query.isLoading && !setup) || workflowIntentIsLoading) {
    return <LoadingState t={t} />;
  }
  if (query.isError && !setup) {
    return (
      <div className="rounded-[22px] border border-danger/20 bg-danger-soft p-6">
        <p className="text-sm text-danger">{t("errors.load")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 rounded-full bg-white px-4 py-2 text-[10px] font-semibold text-danger shadow-sm"
        >
          {t("retry")}
        </button>
      </div>
    );
  }
  if (!setup?.steps?.length) {
    return (
      <div className="rounded-[22px] border border-line bg-white p-6 text-[12px] text-ink-muted shadow-card">
        {t("empty")}
      </div>
    );
  }
  const askForHelp = () => {
    const assistantSubject = workflowIntentNeedsConfirmation
      ? t("workflowIntent.title")
      : selectedStep
        ? t(`steps.${selectedStep.id}.question`)
        : nextBestStep
          ? t(`steps.${nextBestStep.id}.question`)
          : t("hero.launchTitle");
    aiWorkspace.openSetupAssistant({
      context: {
        surface: "setup_center",
        setupStepId: workflowIntentNeedsConfirmation
          ? undefined
          : (selectedStep?.id ?? nextBestStep?.id),
        route: workflowIntentNeedsConfirmation
          ? "/app/settings/modules?from=launch-center"
          : (selectedStep ?? nextBestStep)
            ? `/app/setup?step=${selectedStep?.id ?? nextBestStep?.id}`
            : "/app/setup",
      },
      starterPrompt: t("assistant.prompt", {
        step: assistantSubject,
      }),
    });
  };
  const publish = async () => {
    setFeedback("");
    try {
      const response = await publishStudio(setup.definitionVersion).unwrap();
      await applySetupResponse(response);
      setFeedback(t("publish.success"));
    } catch (error) {
      setFeedback(getSetupErrorMessage(error, t("errors.publish")));
    }
  };
  const unpublish = async () => {
    setFeedback("");
    try {
      const response = await unpublishStudio().unwrap();
      await applySetupResponse(response);
      setFeedback(t("publish.unpublished"));
    } catch (error) {
      setFeedback(getSetupErrorMessage(error, t("errors.publish")));
    }
  };
  return (
    <div className="mx-auto max-w-[1380px]">
      {!showCompletion ? (
        <section className="relative isolate overflow-hidden rounded-[28px] bg-skab-cobalt-900 px-5 py-6 text-white shadow-[0_24px_70px_rgb(var(--skab-blue-rgb)/0.2)] sm:px-7 lg:px-8">
          <WorkspaceBrushField variant="launchHero" />

          <div className="relative z-10 flex items-start gap-4 sm:items-center sm:gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/15 bg-white/10 text-coral-200 sm:h-14 sm:w-14">
              <RocketLaunchIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-coral-200">
                {t("hero.launchEyebrow")}
              </p>
              <h2 className="mt-2 text-[25px] font-semibold tracking-[-0.05em] text-white sm:text-[32px]">
                {workflowIntentNeedsConfirmation
                  ? t("hero.launchTitle")
                  : launchJourneyComplete
                    ? t("hero.completeTitle")
                    : t("hero.remainingTitle", {
                        count: launchRemaining,
                      })}
              </h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-white/72">
                {workflowIntentNeedsConfirmation
                  ? t("hero.launchDescription")
                  : launchJourneyComplete
                    ? t("hero.completeDescription")
                    : t(
                        launchRemaining
                          ? "hero.remainingDescription"
                          : "hero.readyDescription",
                      )}
              </p>
              {canConfigureWorkspace && !workflowIntentNeedsConfirmation ? (
                <Link
                  href="/app/settings/modules?from=launch-center"
                  className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-[10px] font-semibold text-white transition hover:bg-white/16"
                >
                  {t("hero.adjustModules")}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {!workflowIntentNeedsConfirmation ? (
                <div
                  className="mt-4 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={launchProgress.percentage}
                  aria-label={t("hero.checklistComplete")}
                >
                  <span
                    className="block h-full rounded-full bg-coral-300 transition-[width]"
                    style={{
                      width: `${launchProgress.percentage}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <CompletionCelebration
          canPublish={canPublish}
          canUpdateWorkspace={canUpdateWorkspace}
          locale={locale}
          readinessActionPermissions={{
            publicSite: canUpdateWorkspace,
            bookings: canViewProducts && canManageProducts,
            bookingsSchedule: canViewBookings && canCreateBookings,
            payments: canManagePayments,
            emails: canManageCommunications,
            customerJourney:
              canUpdateWorkspace && canViewProducts && canCreateBookings,
          }}
          setup={setup}
          t={t}
          workspaceAccess={workspaceAccess}
          onChanged={applySetupResponse}
          onRefresh={query.refetch}
          onPublicSiteOpened={() =>
            trackSetupEvent(
              buildLaunchEvent({
                event: "public_site_opened",
                source: "final_review",
              }),
            )
          }
          onTestBookingOpened={() =>
            trackSetupEvent(
              buildLaunchEvent({
                event: "test_booking_opened",
                source: "final_review",
              }),
            )
          }
        />
      )}

      {setup.health === "needs_attention" && !showCompletion ? (
        <div className="mt-4 flex gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold">{t("health.title")}</p>
            <p className="mt-1 text-[10px] leading-5">
              {t("health.description")}
            </p>
          </div>
        </div>
      ) : null}

      {completedStepId || savedStepId ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-3 rounded-[16px] border border-success/20 bg-success-soft p-4 text-success"
        >
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold">
              {t("guided.savedTitle")}
            </p>
            <p className="mt-1 text-[10px] leading-5">
              {t(
                completedStepId
                  ? "guided.completedDescription"
                  : "guided.savedDescription",
              )}
            </p>
          </div>
        </div>
      ) : null}

      {!workflowIntentNeedsConfirmation &&
      !postLaunch &&
      canConfigureWorkspace ? (
        <div className="mt-5">
          <StudioProfileCard
            configuration={workspaceConfigurationQuery.data}
            locale={locale}
            t={t}
            workflowT={workflowT}
          />
        </div>
      ) : null}

      {workflowIntentNeedsConfirmation ? (
        <WorkflowIntentAction t={t} />
      ) : postLaunch ? (
        <div className="mt-5 space-y-5">
          {canConfigureWorkspace ? (
            <StudioProfileCard
              configuration={workspaceConfigurationQuery.data}
              locale={locale}
              t={t}
              workflowT={workflowT}
            />
          ) : null}
          <GrowthStudioSection
            canConfigureWorkspace={canConfigureWorkspace}
            canManageProducts={canManageProducts}
            canManageTeam={canManageTeam}
            recommendations={(setup.recommendations ?? []).filter(
              (item) => item.id !== "customers" || canImportCustomers,
            )}
            steps={sections.availableLater}
            t={t}
            workspaceAccess={workspaceAccess}
          />
          <SetupOutcomeSection
            key={`all-tasks-${selectedStep?.id ?? "collapsed"}`}
            id="all-tasks"
            title={t("sections.allTasks.title")}
            description={t("sections.allTasks.description")}
            steps={orderSetupSteps(setup.steps ?? [])}
            selectedStep={selectedStep}
            canConfigureWorkspace={canConfigureWorkspace}
            canManageProducts={canManageProducts}
            t={t}
            onSelect={selectSetupStep}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {[
            ["required", sections.required, paymentRequirementsRemaining > 0],
            ["recommended", sections.recommended, false],
            [
              "availableLater",
              sections.availableLater,
              false,
              (setup.recommendations ?? []).filter(
                (item) => item.id !== "customers" || canImportCustomers,
              ),
            ],
          ].map(([id, steps, defaultOpen, recommendations = []]) => (
            <SetupOutcomeSection
              key={[
                id,
                steps.length,
                recommendations.length,
                steps.some((item) => item.id === selectedStep?.id)
                  ? selectedStep.id
                  : "collapsed",
              ].join("-")}
              id={id}
              title={t(`sections.${id}.title`)}
              description={t(`sections.${id}.description`)}
              steps={steps}
              recommendations={recommendations}
              defaultOpen={defaultOpen}
              selectedStep={selectedStep}
              canConfigureWorkspace={canConfigureWorkspace}
              canManageProducts={canManageProducts}
              t={t}
              onOpenChange={(isOpen) => {
                if (
                  isOpen ||
                  id !== "required" ||
                  !steps.some((item) => item.id === selectedStep?.id)
                ) {
                  return;
                }
                const nextSearchParams = new URLSearchParams(
                  searchParams.toString(),
                );
                nextSearchParams.delete("step");
                nextSearchParams.delete("review");
                const queryString = nextSearchParams.toString();
                router.replace(
                  `/app/setup${queryString ? `?${queryString}` : ""}`,
                  {
                    scroll: false,
                  },
                );
                setFeedback("");
              }}
              onSelect={selectSetupStep}
            />
          ))}
        </div>
      )}

      {!workflowIntentNeedsConfirmation && selectedStep ? (
        <main
          ref={detailRef}
          id={LAUNCH_CENTER_DETAIL_ANCHOR}
          tabIndex={-1}
          className="mt-5 min-w-0 scroll-mt-[112px] rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <h2 className="text-[26px] font-semibold tracking-[-0.05em] text-ink">
                {t(
                  `steps.${selectedStep.id}.${isStepDone(selectedStep) ? "outcome" : "question"}`,
                )}
              </h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
                {t(`steps.${selectedStep.id}.description`)}
              </p>
            </div>
            <span
              className={cx(
                "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.1em]",
                isStepDone(selectedStep)
                  ? "bg-success-soft text-success"
                  : selectedStep.status === "blocked"
                    ? "bg-surface-muted text-ink-muted"
                    : "bg-amber-50 text-amber-800",
              )}
            >
              {t(`viewStates.${getSetupDisplayState(selectedStep)}`)}
            </span>
          </div>

          {selectedStep.id === "payments" ? (
            <div className="mt-5 rounded-[16px] border border-cobalt-100 bg-cobalt-50/45 p-4">
              <p className="text-[11px] font-semibold text-cobalt-900">
                {t("payments.whatYouNeed")}
              </p>
              <ul className="mt-3 grid gap-2 text-[10px] text-cobalt-900/75 sm:grid-cols-2">
                {["business", "bank", "identity", "time"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cobalt-500" />
                    {t(`payments.requirements.${item}`)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] leading-5 text-cobalt-800/70">
                {t("payments.security")}
              </p>
            </div>
          ) : null}

          {selectedStep.id === "bookable_offer" &&
          !coreBookableOfferReady &&
          canManageProducts ? (
            <div className="mt-5 rounded-[16px] border border-coral-200 bg-coral-50/55 p-4">
              <p className="text-[11px] font-semibold text-terracotta-800">
                {t("offer.whatAreYouCreating")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BOOKABLE_OFFER_CHOICES.map(
                  ([label, category, productType, template]) => (
                    <Link
                      key={label}
                      href={`/app/products/new?category=${category}&productType=${productType}&setupTemplate=${template}&setupStep=bookable_offer`}
                      className="inline-flex min-h-9 items-center rounded-full border border-coral-200 bg-white px-3.5 text-[10px] font-semibold text-terracotta-700 transition hover:border-coral-300 hover:bg-coral-100"
                    >
                      {t(`offer.types.${label}`)}
                    </Link>
                  ),
                )}
              </div>
              <p className="mt-3 text-[10px] leading-5 text-terracotta-700/75">
                {t("offer.help")}
              </p>
            </div>
          ) : null}

          {selectedStep.id === "bookable_offer" &&
          coreBookableOfferReady &&
          selectedStep.status === "incomplete" ? (
            <div className="mt-5 flex gap-3 rounded-[16px] border border-cobalt-100 bg-cobalt-50/45 p-4 text-cobalt-900">
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-[11px] font-semibold">
                  {t("offer.productReadyTitle")}
                </p>
                <p className="mt-1 text-[10px] leading-5 text-cobalt-900/75">
                  {t("offer.productReadyDescription")}
                </p>
              </div>
            </div>
          ) : null}

          {selectedStep.checks?.length ? (
            <div className="mt-5">
              <h3 className="text-[11px] font-semibold text-ink">
                {t(
                  isStepDone(selectedStep) ? "readyChecksTitle" : "checksTitle",
                )}
              </h3>
              <div className="mt-3 grid gap-2">
                {selectedStep.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex min-h-[48px] items-center gap-3 rounded-[13px] border border-line bg-surface/35 px-3.5"
                  >
                    {check.complete ? (
                      <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border-2 border-line-strong" />
                    )}
                    <span className="min-w-0 flex-1 text-[10px] font-medium text-ink">
                      {t(`checks.${check.id}`)}
                    </span>
                    {check.optional ? (
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                        {t("optional")}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {missingChecks.length ? (
            <div className="mt-5 flex gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[10px] leading-5">
                {t(`reasons.${missingChecks[0].reasonCode}`)}
              </p>
            </div>
          ) : null}

          {selectedStep.id === "practice_booking" ? (
            <PracticeMode
              setup={setup}
              t={t}
              onChanged={applySetupResponse}
              canStart={safeTestBookingAvailable}
              workspaceAccess={workspaceAccess}
            />
          ) : null}

          {selectedStep.id === "publish" &&
          setup.publication.status === "live" ? (
            <div className="mt-6 rounded-[18px] border border-success/20 bg-success-soft p-5">
              <div className="flex items-start gap-3 text-success">
                <RocketLaunchIcon className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold">
                    {t("publish.liveTitle")}
                  </p>
                  <p className="mt-1 text-[10px] leading-5">
                    {t("publish.liveDescription")}
                  </p>
                </div>
              </div>
              {!showCompletion ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-success/25 bg-white/60 px-4 text-[10px] font-semibold text-success transition hover:bg-white"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    {t("publish.viewPublicSite")}
                  </Link>
                  {safeTestBookingAvailable ? (
                    <Link
                      href={safeTestBookingHref}
                      data-launch-test-booking="true"
                      onClick={() =>
                        trackSetupEvent(
                          buildLaunchEvent({
                            event: "test_booking_opened",
                            source: "final_review",
                          }),
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-success/25 bg-white/60 px-4 text-[10px] font-semibold text-success transition hover:bg-white"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      {t("publish.testBooking")}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {canPublish ? (
                <button
                  type="button"
                  onClick={unpublish}
                  disabled={unpublishState.isLoading}
                  className="mt-4 inline-flex min-h-9 items-center rounded-full border border-success/25 px-4 text-[10px] font-semibold text-success transition hover:bg-white/60 disabled:opacity-50"
                >
                  {t("publish.unpublish")}
                </button>
              ) : (
                <p className="mt-3 text-[10px] leading-5 text-success/80">
                  {t("publish.ownerOnly")}
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
            {selectedStep.id === "publish" &&
            setup.publication.status !== "live" ? (
              canPublish ? (
                <button
                  type="button"
                  onClick={publish}
                  disabled={!primaryAction?.enabled || publishState.isLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-white px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishState.isLoading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <RocketLaunchIcon className="h-4 w-4" />
                  )}
                  {t("publish.action")}
                </button>
              ) : (
                <p className="text-[10px] leading-5 text-ink-muted">
                  {t("publish.ownerOnly")}
                </p>
              )
            ) : showSelectedExternalAction ? (
              <Link
                href={selectedActionHref}
                data-launch-step-action={selectedStep.id}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-white px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50"
              >
                {t(`actions.${primaryAction.key}`)}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            ) : null}

            {contextualGuideHref ? (
              <Link
                href={contextualGuideHref}
                data-launch-guide-action={contextualGuide.id}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
              >
                <PlayIcon className="h-4 w-4" />
                {t("guided.startGuide")}
              </Link>
            ) : null}

            {aiWorkspace.available !== false ? (
              <button
                type="button"
                onClick={askForHelp}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
              >
                <SparklesIcon className="h-4 w-4" />
                {t("assistant.action")}
              </button>
            ) : null}
          </div>

          {feedback ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-[12px] border border-line bg-surface px-3 py-2 text-[10px] text-ink-muted"
            >
              {feedback}
            </p>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}
