"use client";

import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import AiMessage from "@/components/ai/AiMessage";
import { createClientMessage, getEntityId } from "@/components/ai/ai.utils";
import { useRequestSetupAssistantMutation } from "@/lib/features/setup-center/setupCenterApiSlice";

import { getSetupErrorMessage } from "./setupCenter.utils";

export default function SetupAssistantFallback({ stepId, starterPrompt = "" }) {
  const t = useTranslations("SetupCenter");
  const locale = useLocale();
  const [input, setInput] = useState(() =>
    String(starterPrompt || t("assistant.fallbackDefaultQuestion")).trim(),
  );
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [requestHelp, requestState] = useRequestSetupAssistantMutation();
  const messageSequence = useRef(0);

  const submit = async () => {
    const message = input.trim();
    if (!message || requestState.isLoading) return;

    setInput("");
    setError("");
    setMessages((current) => [...current, createClientMessage(message)]);

    try {
      const response = await requestHelp({
        message,
        ...(stepId ? { stepId } : {}),
        locale,
      }).unwrap();
      setMessages((current) => [
        ...current,
        {
          id: `setup-assistant-${++messageSequence.current}`,
          role: "assistant",
          text: response?.answer ?? "",
          navigation: response?.navigation ?? [],
        },
      ]);
    } catch (requestError) {
      setError(
        requestError?.data?.code === "SETUP_ASSISTANT_RATE_LIMITED"
          ? t("assistant.fallbackRateLimited")
          : getSetupErrorMessage(requestError, t("assistant.fallbackError")),
      );
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        <div className="rounded-[15px] border border-cobalt-100 bg-cobalt-50/60 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheckIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-cobalt-600" />
            <div>
              <p className="text-[10px] font-semibold text-cobalt-900">
                {t("assistant.fallbackSafetyTitle")}
              </p>
              <p className="mt-1 text-[10px] leading-5 text-cobalt-800/75">
                {t("assistant.fallbackSafety")}
              </p>
            </div>
          </div>
        </div>

        {!messages.length ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">
              {t("assistant.fallbackIntroTitle")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
              {t("assistant.fallbackIntroDescription")}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <AiMessage
              key={getEntityId(message) || `${message.role}-${index}`}
              message={message}
              feedback={false}
              assistantLabel={t("assistant.fallbackTitle")}
            />
          ))
        )}

        {requestState.isLoading ? (
          <div className="flex justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs text-ink-muted shadow-sm">
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              {t("assistant.fallbackThinking")}
            </span>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[13px] border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="border-t border-line bg-white p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-[18px] border border-line bg-sand-50 p-2 transition focus-within:border-cobalt-300 focus-within:ring-4 focus-within:ring-cobalt-100/70">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("assistant.fallbackInputLabel")}</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder={t("assistant.fallbackPlaceholder")}
              className="w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-ink placeholder:text-ink-subtle focus:ring-0"
            />
          </label>
          <button
            type="submit"
            disabled={!input.trim() || requestState.isLoading}
            aria-label={t("assistant.fallbackSend")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-500 text-white transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
