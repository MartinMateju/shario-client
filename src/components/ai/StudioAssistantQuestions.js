"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CubeIcon,
  InformationCircleIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { aiAccessCacheScope } from "@/lib/features/ai/aiApi.utils";
import {
  useCreateAiAssistantConversationMutation,
  useSendAiAssistantMessageMutation,
} from "@/lib/features/ai/aiApiSlice";
import { tenantDateKey } from "@/components/dashboard/overview/daily-studio-briefing.utils";

import AiSources from "./AiSources";
import StudioAssistantReport from "./StudioAssistantReport";
import {
  getAiErrorMessage,
  getAiMessageText,
  getEntityId,
  normalizeAiNavigationItem,
  normalizeAssistantResponse,
} from "./ai.utils";
import { getStudioAssistantQuestions } from "./studio-assistant-questions";
import { getWorkspaceAssistantContextScope } from "./workspace-assistant-context";

const QUESTION_ICONS = {
  today: SparklesIcon,
  bookings: CalendarDaysIcon,
  bookingTrend: ChartBarIcon,
  teamBlockers: UserGroupIcon,
  reorders: CubeIcon,
  generalHelp: InformationCircleIcon,
  context: SparklesIcon,
};

// Remount the entire flow synchronously when its authority or context changes.
// A retained mutation response can never be displayed in another workspace.
export default function StudioAssistantQuestions({
  compact = false,
  assistantContext,
  starterPrompt = "",
}) {
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const locationId = useSelector(selectActiveStudioId);
  const scope = JSON.stringify([
    aiAccessCacheScope({ tenant, access }),
    locationId || "all",
    locale,
    tenant?.settings?.timezone,
    getWorkspaceAssistantContextScope(assistantContext),
    starterPrompt,
  ]);

  return (
    <StudioAssistantQuestionFlow
      key={scope}
      compact={compact}
      assistantContext={assistantContext}
      starterPrompt={starterPrompt}
      locale={locale}
      tenant={tenant}
      access={access}
      locationId={locationId}
    />
  );
}

function StudioAssistantQuestionFlow({
  compact,
  assistantContext,
  starterPrompt,
  locale,
  tenant,
  access,
  locationId,
}) {
  const t = useTranslations("AI");
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDate, setReportDate] = useState(null);
  const [createConversation] = useCreateAiAssistantConversationMutation();
  const [sendMessage] = useSendAiAssistantMessageMutation();
  const active = useRef(true);
  const generation = useRef(0);
  const request = useRef(null);
  const pending = useRef(false);
  const headingRef = useRef(null);
  const questionRefs = useRef(new Map());
  const returnedQuestion = useRef(null);
  const questionId = useId();

  const questions = getStudioAssistantQuestions({ tenant, access }).map(
    (question) => ({
      ...question,
      label: t(`guided.questions.${question.key}.label`),
      hint: t(`guided.questions.${question.key}.hint`),
      prompt: t(`guided.questions.${question.key}.prompt`),
    }),
  );
  const contextualPrompt = String(starterPrompt || "").trim();
  // The legacy generic knowledge intent asks the user to type a question.
  // Keep the direct, answerable coverage question instead in this guided UI.
  if (
    questions.length &&
    contextualPrompt === t("assistant.intents.askKnowledge")
  ) {
    const existing = questions.findIndex(({ key }) => key === "generalHelp");
    if (existing >= 0) questions.splice(existing, 1);
    questions.unshift({
      key: "generalHelp",
      period: "current",
      label: t("guided.questions.generalHelp.label"),
      hint: t("guided.questions.generalHelp.hint"),
      prompt: t("guided.questions.generalHelp.prompt"),
    });
    questions.splice(4);
  }
  if (
    questions.length &&
    contextualPrompt &&
    contextualPrompt !== t("assistant.intents.askKnowledge")
  ) {
    questions.unshift({
      key: "context",
      period: "current",
      label: t("guided.contextQuestion"),
      hint: t("guided.contextHint"),
      prompt: contextualPrompt,
    });
    questions.splice(4);
  }

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      generation.current += 1;
      request.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (selected) headingRef.current?.focus();
    if (!selected && returnedQuestion.current) {
      questionRefs.current.get(returnedQuestion.current)?.focus();
      returnedQuestion.current = null;
    }
  }, [selected]);

  const ask = async (question) => {
    if (pending.current) return;
    pending.current = true;
    const currentGeneration = ++generation.current;
    const isCurrent = () =>
      active.current && currentGeneration === generation.current;
    setSelected(question);
    setWorking(true);
    setAnswer(null);
    setError("");
    setReportOpen(false);
    setReportDate(tenantDateKey(new Date(), tenant?.settings?.timezone));

    try {
      // Every question is independent: do not carry over previous answers or
      // load the old chat history into this question's context.
      request.current = createConversation({
        locale,
        ...(locationId ? { locationId } : {}),
      });
      const created = await request.current.unwrap();
      if (!isCurrent()) return;
      const conversationId = getEntityId(created?.conversation ?? created);
      if (!conversationId) throw new Error(t("errors.conversationCreate"));
      request.current = sendMessage({
        conversationId,
        locale,
        message: question.prompt,
        context:
          question.key === "context" && assistantContext
            ? assistantContext
            : { surface: "command_center", route: "/app/ai" },
      });
      const result = await request.current.unwrap();
      if (!isCurrent()) return;
      const message = normalizeAssistantResponse(result);
      if (!getAiMessageText(message).trim()) {
        throw new Error(t("guided.noAnswer"));
      }
      setAnswer(message);
    } catch (requestError) {
      if (isCurrent()) {
        setError(getAiErrorMessage(requestError, t("errors.message")));
      }
    } finally {
      if (isCurrent()) {
        request.current = null;
        pending.current = false;
        setWorking(false);
      }
    }
  };

  const back = () => {
    generation.current += 1;
    request.current?.abort?.();
    request.current = null;
    pending.current = false;
    returnedQuestion.current = selected?.key;
    setSelected(null);
    setAnswer(null);
    setError("");
    setWorking(false);
    setReportOpen(false);
  };

  const unavailable = answer?.grounding?.status === "unavailable";
  const unanswered =
    unavailable ||
    answer?.grounding?.status === "insufficient" ||
    answer?.grounding?.basis === "insufficient" ||
    answer?.grounding?.insufficientEvidence === true ||
    answer?.evidence?.context?.basis === "insufficient";
  const navigation = (answer?.navigation || [])
    .map((item) => normalizeAiNavigationItem(item))
    .filter(Boolean);

  return (
    <section
      data-ai-guided-questions
      className={
        compact
          ? "scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-6"
          : "mx-auto w-full max-w-3xl rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-8"
      }
    >
      <div hidden={reportOpen}>
        {selected ? (
          <button
            type="button"
            onClick={back}
            className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-medium text-ink-muted transition hover:text-cobalt-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt-500"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {t("guided.back")}
          </button>
        ) : null}
        <p className="mb-3 text-xs text-ink-muted">
          {t(locationId ? "guided.selectedStudio" : "guided.allStudios")}
          {selected ? ` · ${t(`guided.periods.${selected.period}`)}` : ""}
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-ink focus:outline-none"
        >
          {selected?.label || t("guided.title")}
        </h2>
        {!selected ? (
          <>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {t("guided.description")}
            </p>
            <div className="mt-6 grid gap-3">
              {questions.map((question) => {
                const Icon = QUESTION_ICONS[question.key] || SparklesIcon;
                return (
                  <button
                    key={question.key}
                    ref={(element) => {
                      if (element)
                        questionRefs.current.set(question.key, element);
                      else questionRefs.current.delete(question.key);
                    }}
                    type="button"
                    aria-labelledby={`${questionId}-${question.key}-label`}
                    aria-describedby={`${questionId}-${question.key}-hint`}
                    onClick={() => ask(question)}
                    className="group flex min-h-20 w-full items-center gap-3 rounded-[16px] border border-line bg-white p-4 text-left transition hover:border-cobalt-200 hover:bg-cobalt-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-500"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        id={`${questionId}-${question.key}-label`}
                        className="block text-sm font-semibold text-ink"
                      >
                        {question.label}
                      </span>
                      <span
                        id={`${questionId}-${question.key}-hint`}
                        className="mt-1 block text-xs leading-5 text-ink-muted"
                      >
                        {question.hint}
                      </span>
                    </span>
                    <ArrowRightIcon
                      className="h-4 w-4 shrink-0 text-ink-subtle group-hover:text-cobalt-600"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        {working ? (
          <p
            role="status"
            className="mt-6 flex items-center gap-2 text-sm text-ink-muted"
          >
            <ArrowPathIcon
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            {t("guided.loading")}
          </p>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => ask(selected)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold underline underline-offset-4"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              {t("guided.retry")}
            </button>
          </div>
        ) : null}
        {answer ? (
          <article className="mt-5" aria-live="polite">
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink">
              {getAiMessageText(answer)}
            </p>
            {unavailable ? (
              <button
                type="button"
                onClick={() => ask(selected)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-xs font-semibold text-cobalt-700 hover:bg-cobalt-50"
              >
                <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                {t("guided.retry")}
              </button>
            ) : (
              <AiSources
                citations={answer.citations}
                grounding={answer.grounding}
                evidence={answer.evidence}
              />
            )}
            {navigation.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cobalt-50 px-4 text-xs font-semibold text-cobalt-700 hover:bg-cobalt-100"
                  >
                    {item.label || t("assistant.openRecommendedScreen")}
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
      {answer &&
      !unanswered &&
      selected.key !== "generalHelp" &&
      selected.key !== "context" ? (
        <StudioAssistantReport
          key={answer.id}
          date={reportDate}
          locationId={locationId}
          locale={locale}
          onViewChange={setReportOpen}
        />
      ) : null}
    </section>
  );
}
