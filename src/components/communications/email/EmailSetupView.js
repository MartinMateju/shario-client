"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";
import {
  useConfirmCommunicationReplyToVerificationMutation,
  useCreateCommunicationEmailSetupMutation,
  useGetCommunicationEmailSetupQuery,
  useRequestCommunicationReplyToVerificationMutation,
  useRetryCommunicationEmailSetupMutation,
  useTestCommunicationEmailSetupMutation,
  useUpdateCommunicationEmailSetupMutation,
} from "@/lib/features/communicationEmailSetup/communicationEmailSetupApiSlice";

import EmailReadinessCard from "./EmailReadinessCard";
import { EMAIL_SETUP_READINESS, normalizeEmailSetup } from "./emailSetup";

const inputClass =
  "mt-1.5 w-full rounded-[14px] border-line bg-white px-3.5 py-3 text-sm text-ink shadow-xs placeholder:text-ink-subtle focus:border-cobalt-300 focus:ring-cobalt-200";

const awaitRequest = (request) =>
  request && typeof request.unwrap === "function" ? request.unwrap() : request;

export default function EmailSetupView({
  setup: providedSetup,
  canManage = true,
  onChanged,
}) {
  const t = useTranslations("CommunicationsEmail");
  const hasProvidedSetup = providedSetup !== undefined;
  const setupQuery = useGetCommunicationEmailSetupQuery(undefined, {
    skip: hasProvidedSetup,
  });
  const setup = normalizeEmailSetup(
    hasProvidedSetup ? providedSetup : setupQuery.data,
  );
  const [draft, setDraft] = useState({});
  const senderName = draft.senderName ?? setup.senderName;
  const replyToEmail =
    draft.replyToEmail ??
    (setup.pendingReplyToEmail || setup.replyToEmail || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [createSetup, createState] = useCreateCommunicationEmailSetupMutation();
  const [updateSetup, updateState] = useUpdateCommunicationEmailSetupMutation();
  const [requestVerification, requestState] =
    useRequestCommunicationReplyToVerificationMutation();
  const [confirmVerification, confirmState] =
    useConfirmCommunicationReplyToVerificationMutation();
  const [retrySetup, retryState] = useRetryCommunicationEmailSetupMutation();
  const [testSetup, testState] = useTestCommunicationEmailSetupMutation();

  const refresh = async () => {
    if (onChanged) {
      await awaitRequest(onChanged());
      return;
    }
    if (!hasProvidedSetup) {
      await awaitRequest(setupQuery.refetch?.());
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    setFeedback(null);

    try {
      const creating = !setup.id;
      const body = { senderName, replyToEmail };
      const saved = setup.id
        ? await updateSetup({ id: setup.id, ...body }).unwrap()
        : await createSetup(body).unwrap();
      const savedSetup = normalizeEmailSetup(saved);
      const senderId = savedSetup.id || setup.id;

      if (!senderId) throw new Error(t("errors.missingSenderId"));

      const replyToChanged =
        replyToEmail.trim().toLowerCase() !==
        (setup.pendingReplyToEmail || setup.replyToEmail).trim().toLowerCase();
      if (
        (creating || replyToChanged) &&
        Boolean(savedSetup.pendingReplyToEmail)
      ) {
        await requestVerification(senderId).unwrap();
        setFeedback({ tone: "success", text: t("feedback.codeSent") });
      } else {
        setFeedback({ tone: "success", text: t("feedback.saved") });
      }
      await refresh();
      setDraft({});
    } catch {
      await refresh().catch(() => undefined);
      setFeedback({
        tone: "error",
        text: t("errors.save"),
      });
    }
  };

  const resend = async () => {
    if (!setup.id) return;
    setFeedback(null);
    try {
      await requestVerification(setup.id).unwrap();
      setFeedback({ tone: "success", text: t("feedback.codeResent") });
      await refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: t("errors.resend"),
      });
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    if (!setup.id || !/^\d{6}$/.test(verificationCode)) return;
    setFeedback(null);
    try {
      await confirmVerification({
        id: setup.id,
        code: verificationCode,
      }).unwrap();
      setVerificationCode("");
      setFeedback({ tone: "success", text: t("feedback.verified") });
      await refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: t("errors.confirm"),
      });
    }
  };

  const refreshStatus = async () => {
    if (isRefreshing) return;
    setFeedback(null);
    setIsRefreshing(true);

    try {
      await refresh();
      setFeedback({ tone: "success", text: t("feedback.refreshed") });
    } catch {
      setFeedback({ tone: "error", text: t("errors.refresh") });
    } finally {
      setIsRefreshing(false);
    }
  };

  const retry = async () => {
    if (
      !canManage ||
      !setup.id ||
      setup.readiness !== EMAIL_SETUP_READINESS.ERROR ||
      retryState.isLoading
    ) {
      return;
    }

    setFeedback(null);
    let nextFeedback;

    try {
      const response = await retrySetup(setup.id).unwrap();
      const retried = normalizeEmailSetup(response);
      if (retried.readiness === EMAIL_SETUP_READINESS.PROVISIONING) {
        nextFeedback = {
          tone: "success",
          text: t("feedback.retryStarted"),
        };
      } else if (
        retried.readiness === EMAIL_SETUP_READINESS.READY ||
        retried.readiness === EMAIL_SETUP_READINESS.REPLY_TO_PENDING
      ) {
        nextFeedback = {
          tone: "success",
          text: t("feedback.retryCompleted"),
        };
      } else {
        nextFeedback = { tone: "error", text: t("errors.retry") };
      }
    } catch {
      nextFeedback = { tone: "error", text: t("errors.retry") };
    } finally {
      // Provisioning failures persist a safe code before the request rejects.
      await refresh().catch(() => undefined);
    }

    setFeedback(nextFeedback);
  };

  const sendTest = async () => {
    if (!setup.id || setup.readiness !== EMAIL_SETUP_READINESS.READY) return;
    setFeedback(null);
    try {
      await testSetup(setup.id).unwrap();
      setFeedback({ tone: "success", text: t("feedback.testQueued") });
      await refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: t("errors.test"),
      });
    }
  };

  const isSaving = createState.isLoading || updateState.isLoading;
  const isLoading = !hasProvidedSetup && setupQuery.isLoading;
  const isError = !hasProvidedSetup && setupQuery.isError;
  const isPending =
    Boolean(setup.pendingReplyToEmail) ||
    setup.readiness === EMAIL_SETUP_READINESS.REPLY_TO_PENDING;

  return (
    <div className="space-y-5" data-email-setup-view>
      <EmailReadinessCard
        setup={setup}
        isLoading={isLoading}
        isError={isError}
        onRefresh={refreshStatus}
        onRetry={
          canManage &&
          setup.id &&
          setup.readiness === EMAIL_SETUP_READINESS.ERROR
            ? retry
            : undefined
        }
        isRefreshing={isRefreshing}
        isRetrying={retryState.isLoading}
      />

      <WorkspaceCard className="overflow-hidden">
        <header className="border-b border-line bg-sand-50/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-cobalt-50 text-cobalt-700">
              <EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                {t("setup.title")}
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {t("setup.description")}
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={save} className="space-y-5 p-5 sm:p-6">
          {feedback ? (
            <div
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`rounded-[14px] border px-4 py-3 text-[12px] ${
                feedback.tone === "error"
                  ? "border-danger/20 bg-danger-soft text-danger"
                  : "border-success/20 bg-success-soft text-success"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}

          <div className="text-[12px] font-semibold text-ink-soft">
            <label htmlFor="email-setup-sender-name">
              {t("fields.senderName")}
            </label>
            <input
              id="email-setup-sender-name"
              value={senderName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  senderName: event.target.value,
                }))
              }
              maxLength={160}
              required
              disabled={!canManage || isLoading}
              className={inputClass}
              placeholder={t("fields.senderNamePlaceholder")}
            />
          </div>

          <div className="text-[12px] font-semibold text-ink-soft">
            <label htmlFor="email-setup-reply-to">{t("fields.replyTo")}</label>
            <input
              id="email-setup-reply-to"
              type="email"
              value={replyToEmail}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  replyToEmail: event.target.value,
                }))
              }
              required
              disabled={!canManage || isLoading}
              aria-describedby="email-setup-reply-to-hint"
              className={inputClass}
              placeholder="studio@example.com"
            />
            <span
              id="email-setup-reply-to-hint"
              className="mt-1.5 block font-normal leading-5 text-ink-muted"
            >
              {t("fields.replyToHint")}
            </span>
          </div>

          {setup.replyToVerifiedAt && setup.replyToEmail ? (
            <div className="flex items-center gap-2 rounded-[14px] border border-success/20 bg-success-soft px-4 py-3 text-[12px] text-success">
              <CheckCircleIcon
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {t("verification.active", { email: setup.replyToEmail })}
            </div>
          ) : null}

          {isPending ? (
            <div className="rounded-[16px] border border-warning/25 bg-warning-soft p-4 text-warning">
              {setup.replyToEmail && setup.pendingReplyToEmail ? (
                <p className="mb-3 text-[12px] leading-5">
                  {t("verification.currentRemainsActive", {
                    email: setup.replyToEmail,
                  })}
                </p>
              ) : null}
              <p className="text-[12px] font-semibold">
                {t("verification.pending", {
                  email: setup.pendingReplyToEmail || setup.replyToEmail,
                })}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={!canManage}
                  aria-label={t("verification.code")}
                  placeholder={t("verification.codePlaceholder")}
                  className="min-h-11 flex-1 rounded-[12px] border-warning/30 bg-white px-3 text-sm tracking-[0.3em] text-ink"
                />
                <button
                  type="button"
                  onClick={confirm}
                  disabled={
                    !canManage ||
                    !/^\d{6}$/.test(verificationCode) ||
                    confirmState.isLoading
                  }
                  className="min-h-11 rounded-full bg-warning px-4 text-[12px] font-semibold text-white disabled:opacity-45"
                >
                  {confirmState.isLoading
                    ? t("actions.confirming")
                    : t("actions.confirmCode")}
                </button>
                <button
                  type="button"
                  onClick={resend}
                  disabled={!canManage || requestState.isLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-warning/30 bg-white px-4 text-[12px] font-semibold"
                >
                  <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                  {t("actions.resendCode")}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5">
            <button
              type="button"
              onClick={sendTest}
              disabled={
                setup.readiness !== EMAIL_SETUP_READINESS.READY ||
                !canManage ||
                testState.isLoading
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-semibold text-ink-soft disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              {testState.isLoading
                ? t("actions.testing")
                : t("actions.sendTest")}
            </button>
            <button
              type="submit"
              disabled={
                !canManage ||
                isSaving ||
                !senderName.trim() ||
                !replyToEmail.trim()
              }
              className="min-h-11 rounded-full bg-cobalt-600 px-5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? t("actions.saving") : t("actions.saveSetup")}
            </button>
          </div>
        </form>
      </WorkspaceCard>
    </div>
  );
}
