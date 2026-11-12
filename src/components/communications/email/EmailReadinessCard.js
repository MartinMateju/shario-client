import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  EMAIL_SETUP_READINESS,
  getEmailReadinessTone,
  normalizeEmailSetup,
} from "./emailSetup";

const toneClasses = {
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
  info: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
  neutral: "border-line bg-sand-50 text-ink-soft",
};

const readinessIcons = {
  [EMAIL_SETUP_READINESS.READY]: CheckCircleIcon,
  [EMAIL_SETUP_READINESS.PROVISIONING]: ClockIcon,
  [EMAIL_SETUP_READINESS.REPLY_TO_PENDING]: ClockIcon,
};

export default function EmailReadinessCard({
  setup,
  isLoading = false,
  isError = false,
  onOpenSetup,
  onRefresh,
  onRetry,
  isRefreshing = false,
  isRetrying = false,
  compact = false,
}) {
  const t = useTranslations("CommunicationsEmail");
  const normalized = normalizeEmailSetup(setup);
  const transportError = isError && !normalized.id;
  const readiness = transportError
    ? EMAIL_SETUP_READINESS.ERROR
    : normalized.readiness;
  const showLoading = isLoading && !normalized.id;
  const tone = showLoading ? "neutral" : getEmailReadinessTone(readiness);
  const Icon = readinessIcons[readiness] ?? ExclamationTriangleIcon;
  const canRetry =
    Boolean(onRetry) &&
    Boolean(normalized.id) &&
    readiness === EMAIL_SETUP_READINESS.ERROR &&
    !transportError;
  const attemptedAt = normalized.providerProvisioningAttemptedAt
    ? new Date(normalized.providerProvisioningAttemptedAt)
    : null;
  const showDiagnostics =
    readiness === EMAIL_SETUP_READINESS.ERROR &&
    Boolean(normalized.id) &&
    (Boolean(normalized.providerProvisioningErrorCode) || Boolean(attemptedAt));
  const dismissalKey = [
    readiness,
    transportError ? "transport" : normalized.id || "unknown",
    normalized.providerProvisioningErrorCode || "no-code",
    normalized.providerProvisioningAttemptedAt || "no-attempt",
  ].join(":");
  const canDismiss =
    !showLoading &&
    (readiness === EMAIL_SETUP_READINESS.READY ||
      readiness === EMAIL_SETUP_READINESS.ERROR);
  const [dismissal, setDismissal] = useState(() => ({
    observedKey: dismissalKey,
    dismissedKey: "",
  }));

  if (dismissal.observedKey !== dismissalKey) {
    setDismissal({ observedKey: dismissalKey, dismissedKey: "" });
  }

  if (
    canDismiss &&
    dismissal.observedKey === dismissalKey &&
    dismissal.dismissedKey === dismissalKey
  ) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      className={`rounded-[18px] border ${toneClasses[tone]} ${
        compact ? "px-4 py-3" : "p-4 sm:p-5"
      }`}
      data-email-readiness={showLoading ? "loading" : readiness}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {showLoading
              ? t("readiness.loadingTitle")
              : t(`readiness.${readiness}.title`)}
          </p>
          <p className="mt-1 text-[12px] leading-5 opacity-85">
            {showLoading
              ? t("readiness.loadingDescription")
              : t(`readiness.${readiness}.description`)}
          </p>
          {normalized.fromAddress ? (
            <p className="mt-2 break-all text-[11px] font-medium">
              {t("identity.fromSummary", {
                senderName: normalized.senderName || t("identity.defaultName"),
                fromAddress: normalized.fromAddress,
              })}
            </p>
          ) : null}

          {showDiagnostics ? (
            <div className="mt-3 space-y-1 rounded-[12px] border border-current/15 bg-white/55 px-3 py-2 text-[11px]">
              {normalized.providerProvisioningErrorCode ? (
                <p>
                  {t("diagnostics.reference", {
                    code: normalized.providerProvisioningErrorCode,
                  })}
                </p>
              ) : null}
              {attemptedAt ? (
                <time
                  dateTime={normalized.providerProvisioningAttemptedAt}
                  className="block opacity-80"
                >
                  {t("diagnostics.lastAttempt", { attemptedAt })}
                </time>
              ) : null}
            </div>
          ) : null}

          {!compact && (canRetry || onRefresh) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {canRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying || isRefreshing}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-danger px-3.5 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  {isRetrying
                    ? t("actions.retryingSetup")
                    : t("actions.retrySetup")}
                </button>
              ) : null}
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing || isRetrying}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-current/20 bg-white/75 px-3.5 text-[11px] font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  {isRefreshing
                    ? t("actions.refreshingStatus")
                    : t("actions.refreshStatus")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {onOpenSetup && readiness !== EMAIL_SETUP_READINESS.READY ? (
          <button
            type="button"
            onClick={onOpenSetup}
            className="min-h-10 shrink-0 rounded-full border border-current/20 bg-white/75 px-3 text-[11px] font-semibold transition hover:bg-white"
          >
            {t("actions.openSetup")}
          </button>
        ) : null}
        {canDismiss ? (
          <button
            type="button"
            onClick={() =>
              setDismissal({
                observedKey: dismissalKey,
                dismissedKey: dismissalKey,
              })
            }
            aria-label={t("actions.dismissSetupAlert")}
            title={t("actions.dismissSetupAlert")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/75 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
