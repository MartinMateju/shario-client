"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasAllPermissions } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useConfirmAiAssistantActionMutation,
  useDismissAiAssistantActionMutation,
  useGetAiActionQuery,
} from "@/lib/features/ai/aiApiSlice";

import {
  getAiActionErrorKey,
  getAiActionPreviewFields,
  getAiActionResultHref,
  getAiActionTitle,
  getAiActionWarnings,
  normalizeAiAction,
} from "./ai-action.utils";
import { cx, getEntityId } from "./ai.utils";

const STATUS_TONES = {
  suggested: "bg-cobalt-50 text-cobalt-700",
  executing: "bg-warning-soft text-warning",
  completed: "bg-success-soft text-success",
  dismissed: "bg-surface-muted text-ink-muted",
  failed: "bg-danger-soft text-danger",
  expired: "bg-surface-muted text-ink-muted",
};

const EVENT_RESULT_PERMISSIONS = [
  PERMISSIONS.COURSES_MANAGE,
  PERMISSIONS.COURSES_VIEW,
  PERMISSIONS.LOCATIONS_VIEW,
];

const TRANSLATED_VALUES = new Set([
  "all_locations",
  "none",
  "low",
  "normal",
  "medium",
  "high",
  "urgent",
  "todo",
  "in_progress",
  "waiting",
  "blocked",
  "done",
  "inquiry",
]);

export default function AiActionConfirmation({
  action,
  conversationId,
  onActionChange,
  compact = false,
  readOnly = false,
}) {
  const t = useTranslations("AI");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canOpenEventResult =
    tenant?.modules?.courses === true &&
    hasAllPermissions(workspaceAccess, EVENT_RESULT_PERMISSIONS);
  const incomingAction = normalizeAiAction(action);
  const incomingActionId = getEntityId(incomingAction);
  const liveActionQuery = useGetAiActionQuery(
    { actionId: incomingActionId, scope: "mine" },
    {
      skip:
        !incomingActionId || incomingAction?.status !== "executing" || readOnly,
      pollingInterval: 5_000,
    },
  );
  const refreshedIncomingAction = liveActionQuery.currentData
    ? normalizeAiAction(liveActionQuery.currentData, incomingAction)
    : incomingAction;
  const [resolvedAction, setResolvedAction] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, confirmState] = useConfirmAiAssistantActionMutation();
  const [dismissAction, dismissState] = useDismissAiAssistantActionMutation();

  const current =
    resolvedAction?.id === refreshedIncomingAction?.id &&
    ["suggested", "executing"].includes(refreshedIncomingAction?.status) &&
    !["suggested", "executing"].includes(resolvedAction?.status)
      ? resolvedAction
      : refreshedIncomingAction;

  const actionId = getEntityId(current);
  const title = getAiActionTitle(current);
  const fields = getAiActionPreviewFields(current);
  const warnings = getAiActionWarnings(current);
  const summary = [
    "create_task",
    "complete_task",
    "create_inventory_reorder_request",
    "create_event",
  ].includes(current?.preview?.summary)
    ? t(`actions.summaries.${current.preview.summary}`)
    : current?.preview?.summary;
  const status = current?.status ?? "failed";
  const resultHref = getAiActionResultHref(current, {
    canOpenEventResult,
  });
  const activeConversationId =
    conversationId || current?.conversationId || undefined;
  const isPending = confirmState.isLoading || dismissState.isLoading;
  const canConfirm =
    (status === "suggested" || current?.recoverable === true) &&
    current?.canConfirm !== false &&
    !isPending;
  const canDismiss =
    status === "suggested" && current?.canDismiss !== false && !isPending;
  const persistedError =
    status === "failed" && current?.errorCode
      ? t(`actions.errors.${getAiActionErrorKey({ code: current.errorCode })}`)
      : "";
  const visibleError = error || persistedError;

  if (!actionId || !title) return null;

  const updateAction = (response) => {
    const next = normalizeAiAction(response, current);
    setResolvedAction(next);
    onActionChange?.(next);
    return next;
  };

  const confirm = async () => {
    setError("");
    try {
      const response = await confirmAction({
        actionId,
        conversationId: activeConversationId,
      }).unwrap();
      updateAction(response);
      setReviewOpen(false);
    } catch (requestError) {
      setError(t(`actions.errors.${getAiActionErrorKey(requestError)}`));
      onActionChange?.(null);
    }
  };

  const dismiss = async () => {
    setError("");
    try {
      const response = await dismissAction({
        actionId,
        conversationId: activeConversationId,
      }).unwrap();
      updateAction(response);
      setReviewOpen(false);
    } catch (requestError) {
      setError(t(`actions.errors.${getAiActionErrorKey(requestError)}`));
      onActionChange?.(null);
    }
  };

  const fieldValue = (field) => {
    if (TRANSLATED_VALUES.has(field.value)) {
      return t(`actions.values.${field.value}`);
    }
    if (field.key === "dueDate" && field.value) {
      const date = new Date(field.value);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
      }
    }
    if (field.key === "date" && /^\d{4}-\d{2}-\d{2}$/.test(field.value)) {
      const date = new Date(`${field.value}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
        }).format(date);
      }
    }
    return field.value;
  };

  const statusIcon =
    status === "completed" ? (
      <CheckCircleIcon className="h-4 w-4" />
    ) : status === "failed" ? (
      <ExclamationTriangleIcon className="h-4 w-4" />
    ) : (
      <ClockIcon className="h-4 w-4" />
    );

  return (
    <>
      <div
        className={cx(
          "mt-3 rounded-[16px] border border-cobalt-200 bg-white",
          compact ? "p-3" : "p-4",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
            <ShieldCheckIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">{title}</p>
                {summary ? (
                  <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                    {summary}
                  </p>
                ) : null}
              </div>
              <span
                className={cx(
                  "inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold",
                  STATUS_TONES[status] ?? STATUS_TONES.failed,
                )}
              >
                {statusIcon}
                {t(`actions.status.${status}`)}
              </span>
            </div>

            {fields.length ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {fields.slice(0, compact ? 2 : 4).map((field) => (
                  <div
                    key={field.key}
                    className="rounded-[10px] bg-sand-50 px-2.5 py-2"
                  >
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                      {t(`actions.fields.${field.key}`)}
                    </dt>
                    <dd className="mt-0.5 break-words text-[11px] text-ink">
                      {fieldValue(field)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {visibleError ? (
              <p
                className="mt-3 rounded-[10px] bg-danger-soft px-3 py-2 text-[11px] text-danger"
                role="alert"
              >
                {visibleError}
              </p>
            ) : null}

            {status === "suggested" || current?.recoverable ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {canConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setReviewOpen(true);
                    }}
                    className="inline-flex min-h-11 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white transition hover:bg-cobalt-600"
                  >
                    {current?.recoverable
                      ? t("actions.retryExecution")
                      : t("actions.review")}
                  </button>
                ) : null}
                {canDismiss ? (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-xs font-semibold text-ink-muted transition hover:border-ink-subtle hover:text-ink"
                  >
                    {dismissState.isLoading
                      ? t("actions.dismissing")
                      : t("actions.dismiss")}
                  </button>
                ) : null}
              </div>
            ) : status === "completed" && resultHref ? (
              <Link
                href={resultHref}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3.5 text-xs font-semibold text-cobalt-700 transition hover:border-cobalt-200 hover:bg-cobalt-50"
              >
                {t("actions.openResult")}
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={reviewOpen}
        onClose={() => {
          if (!isPending) setReviewOpen(false);
        }}
        className="relative z-50"
      >
        <div
          data-dialog-backdrop
          className="fixed inset-0 bg-ink/35 backdrop-blur-[2px]"
          aria-hidden
        />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel
              data-dialog-layout="compact"
              className="w-full max-w-lg rounded-[24px] border border-line bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
                    {t("actions.reviewEyebrow")}
                  </p>
                  <DialogTitle className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">
                    {title}
                  </DialogTitle>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {t(`actions.confirmation.${current?.key}`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={isPending}
                  aria-label={t("actions.closeReview")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <dl className="mt-5 divide-y divide-line rounded-[16px] border border-line">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)]"
                  >
                    <dt className="text-xs font-medium text-ink-muted">
                      {t(`actions.fields.${field.key}`)}
                    </dt>
                    <dd className="break-words text-sm text-ink">
                      {fieldValue(field)}
                    </dd>
                  </div>
                ))}
              </dl>

              {warnings.length ? (
                <div className="mt-4 rounded-[14px] border border-warning/25 bg-warning-soft p-3">
                  {warnings.map((warning) => (
                    <p
                      key={warning}
                      className="flex gap-2 text-xs leading-5 text-warning"
                    >
                      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      {t(`actions.warnings.${warning}`)}
                    </p>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-ink-muted">
                {t("actions.confirmHint")}
              </p>
              {error ? (
                <p className="mt-3 text-xs text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-xs font-semibold text-ink-muted transition hover:text-ink disabled:opacity-50"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={!canConfirm || isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white transition hover:bg-cobalt-600 disabled:opacity-50"
                >
                  {confirmState.isLoading
                    ? t("actions.confirming")
                    : current?.recoverable
                      ? t("actions.retryExecution")
                      : t("actions.confirm")}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
