"use client";

import {
  ArrowPathIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useSubmitAiFeedbackMutation } from "@/lib/features/ai/aiApiSlice";

import AiActionConfirmation from "./AiActionConfirmation";
import AiSources from "./AiSources";
import {
  cx,
  getAiActions,
  getAiCitations,
  getAiEvidence,
  getAiGrounding,
  getAiMessageRole,
  getAiMessageText,
  getAiNavigation,
  getAiSuggestedReplies,
  getEntityId,
  normalizeAiNavigationItem,
} from "./ai.utils";
import { Link } from "@/i18n/navigation";

export default function AiMessage({
  message,
  conversationId,
  feedback = true,
  assistantLabel,
  tenantThemed = false,
  compact = false,
  onReply,
  onRetry,
  interactionDisabled = false,
  canCreateBooking = false,
  showNavigation = true,
}) {
  const t = useTranslations("AI");
  const role = getAiMessageRole(message);
  const text = getAiMessageText(message);
  const citations = getAiCitations(message);
  const grounding = getAiGrounding(message);
  const evidence = getAiEvidence(message);
  const actions = getAiActions(message);
  const suggestedReplies = getAiSuggestedReplies(message);
  const navigation = showNavigation
    ? getAiNavigation(message)
        .map((item) => normalizeAiNavigationItem(item, { canCreateBooking }))
        .filter(Boolean)
    : [];
  const [submitFeedback] = useSubmitAiFeedbackMutation();
  const [rating, setRating] = useState(null);
  const runId = getEntityId(message?.run) || message?.runId || undefined;
  const isUnansweredAssistantReply =
    role === "assistant" &&
    (grounding?.status === "insufficient" ||
      grounding?.status === "unavailable" ||
      grounding?.basis === "insufficient" ||
      grounding?.insufficientEvidence === true ||
      evidence?.context?.basis === "insufficient");
  const isGeneralKnowledgeReply =
    role === "assistant" &&
    (grounding?.status === "general_knowledge" ||
      grounding?.basis === "general_knowledge");
  const isProviderUnavailableReply =
    role === "assistant" && grounding?.status === "unavailable";

  if (
    !text &&
    !actions.length &&
    !navigation.length &&
    !suggestedReplies.length
  ) {
    return null;
  }

  const rate = async (value) => {
    setRating(value);
    try {
      await submitFeedback({
        ...(runId ? { runId } : { conversationId }),
        rating: value,
      }).unwrap();
    } catch {
      setRating(null);
    }
  };

  return (
    <div
      className={cx("flex", role === "user" ? "justify-end" : "justify-start")}
    >
      <article
        data-tenant-ai-message={tenantThemed ? role : undefined}
        data-tenant-surface={
          tenantThemed && role === "assistant" ? "card" : undefined
        }
        data-ai-message-variant={compact ? "compact" : undefined}
        className={cx(
          "text-sm leading-6",
          compact
            ? role === "user"
              ? "max-w-[80%] rounded-[16px] rounded-br-[5px] bg-cobalt-500 px-3.5 py-2.5 text-white"
              : "max-w-[92%] rounded-[16px] rounded-bl-[5px] border border-line/80 bg-white px-3.5 py-3 text-ink"
            : "max-w-[88%] rounded-[20px] px-4 py-3",
          !compact && role === "user"
            ? "rounded-br-[6px] bg-cobalt-500 text-white"
            : null,
          !compact && role !== "user"
            ? "rounded-bl-[6px] border border-line bg-white text-ink shadow-sm"
            : null,
        )}
      >
        {role === "assistant" ? (
          <div
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cobalt-600"
            data-tenant-ai-assistant-label={tenantThemed || undefined}
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {assistantLabel || t("assistant.name")}
          </div>
        ) : null}
        {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
        {role === "assistant" &&
        suggestedReplies.length &&
        !actions.length &&
        !navigation.length &&
        onReply ? (
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label={t("assistant.suggestedRepliesLabel")}
          >
            {suggestedReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => onReply(reply)}
                disabled={interactionDisabled}
                className="min-h-9 rounded-full border border-cobalt-200 bg-cobalt-50 px-3 py-1.5 text-[11px] font-semibold text-cobalt-700 transition hover:border-cobalt-300 hover:bg-cobalt-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}
        {isProviderUnavailableReply && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={interactionDisabled}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11px] font-semibold text-cobalt-700 transition hover:border-cobalt-200 hover:bg-cobalt-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("assistant.retry")}
          </button>
        ) : null}
        {role === "assistant" &&
        !isUnansweredAssistantReply &&
        !isGeneralKnowledgeReply ? (
          <AiSources
            citations={citations}
            grounding={grounding}
            evidence={evidence}
          />
        ) : null}
        {role === "assistant" && actions.length ? (
          <div>
            {actions.map((action, index) => (
              <AiActionConfirmation
                key={
                  getEntityId(action) || `${action?.key ?? "action"}-${index}`
                }
                action={action}
                conversationId={conversationId}
              />
            ))}
          </div>
        ) : null}
        {role === "assistant" && navigation.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {navigation.map((item, index) => (
              <Link
                key={`${item?.kind ?? item?.stepId ?? item.href}-${index}`}
                href={item.href}
                data-tenant-button={tenantThemed ? "secondary" : undefined}
                className="inline-flex min-h-10 items-center rounded-full bg-cobalt-50 px-3.5 text-[12px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
              >
                {item?.label || t("assistant.openRecommendedScreen")}
                <span className="ml-1.5" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : null}
        {role === "assistant" &&
        !isUnansweredAssistantReply &&
        feedback &&
        (runId || conversationId) ? (
          <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
            <span className="mr-1 text-[10px] text-ink-subtle">
              {t("feedback.helpful")}
            </span>
            <button
              type="button"
              onClick={() => rate("helpful")}
              aria-label={t("feedback.positive")}
              className={cx(
                "flex h-9 w-9 items-center justify-center rounded-full transition",
                rating === "helpful"
                  ? "bg-success-soft text-success"
                  : "text-ink-subtle hover:bg-surface-muted hover:text-ink",
              )}
            >
              <HandThumbUpIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => rate("not_helpful")}
              aria-label={t("feedback.negative")}
              className={cx(
                "flex h-9 w-9 items-center justify-center rounded-full transition",
                rating === "not_helpful"
                  ? "bg-danger-soft text-danger"
                  : "text-ink-subtle hover:bg-surface-muted hover:text-ink",
              )}
            >
              <HandThumbDownIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
