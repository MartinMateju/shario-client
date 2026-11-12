"use client";

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { aiAccessCacheScope } from "@/lib/features/ai/aiApi.utils";
import {
  useCreateAiAssistantConversationMutation,
  useGetAiAssistantConversationQuery,
  useGetAiAssistantConversationsQuery,
  useGetLatestAiBriefingQuery,
  useSendAiAssistantMessageMutation,
} from "@/lib/features/ai/aiApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { Link } from "@/i18n/navigation";

import AiMessage from "./AiMessage";
import {
  createClientMessage,
  getAiErrorMessage,
  getAiGrounding,
  getAiMessageRole,
  getAiMessageText,
  getEntityId,
  normalizeAiMessages,
  normalizeAssistantResponse,
} from "./ai.utils";
import { getStudioAssistantOperationsInbox } from "./studio-assistant-insights";
import { getStudioAssistantSuggestionKeys } from "./studio-assistant-intents";
import { getWorkspaceAssistantContextScope } from "./workspace-assistant-context";

const COMPOSER_MIN_HEIGHT = 40;
const COMPACT_COMPOSER_MAX_HEIGHT = 56;

const INBOX_SEVERITY_STYLES = {
  critical: "border-danger/25 bg-danger-soft text-danger",
  warning: "border-coral-200 bg-coral-50 text-terracotta-700",
  info: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
};

const getConversationList = (value) => {
  const source = value?.conversations ?? value?.items ?? value ?? [];
  return Array.isArray(source) ? source : [];
};

const mergeMessages = (serverMessages, localMessages) => {
  const result = [];
  const seen = new Set();
  const isAcknowledged = (localMessage) =>
    localMessage?.clientOnly === true &&
    serverMessages.some((serverMessage) => {
      if (
        getAiMessageRole(serverMessage) !== getAiMessageRole(localMessage) ||
        getAiMessageText(serverMessage) !== getAiMessageText(localMessage)
      ) {
        return false;
      }

      const serverTime = new Date(serverMessage?.createdAt ?? 0).getTime();
      const localTime = new Date(localMessage?.createdAt ?? 0).getTime();
      return (
        Number.isFinite(serverTime) &&
        Number.isFinite(localTime) &&
        Math.abs(serverTime - localTime) < 120_000
      );
    });

  [...serverMessages, ...localMessages].forEach((message) => {
    if (isAcknowledged(message)) return;
    const id = getEntityId(message);
    const key = id || `${message?.role}:${message?.text}:${message?.createdAt}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(message);
  });

  return result;
};

const getPreviousUserMessageText = (messages, index) => {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (getAiMessageRole(messages[cursor]) === "user") {
      return getAiMessageText(messages[cursor]).trim();
    }
  }

  return "";
};

export default function StudioAssistantConversation({
  compact = false,
  showHistory = false,
  onConversationChange,
  assistantContext,
  starterPrompt = "",
}) {
  const t = useTranslations("AI");
  const locale = useLocale();
  const locationId = useSelector(selectActiveStudioId);
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const cacheScope = `${aiAccessCacheScope({ tenant, access: workspaceAccess })}|active-location:${locationId || "all"}`;
  const canCreateBooking =
    tenant?.modules?.bookings === true &&
    hasPermission(workspaceAccess, PERMISSIONS.BOOKINGS_CREATE) &&
    hasPermission(workspaceAccess, PERMISSIONS.LOCATIONS_VIEW) &&
    hasPermission(workspaceAccess, PERMISSIONS.PRODUCTS_VIEW);
  const briefingAccess = useAiAccess({ feature: "dailyBriefing" });
  const interactionScope = `${cacheScope}|assistant-context:${getWorkspaceAssistantContextScope(assistantContext)}`;
  const normalizedStarterPrompt = String(starterPrompt || "").trim();
  const [conversationId, setConversationId] = useState("");
  const [input, setInput] = useState(() => normalizedStarterPrompt);
  const [localMessages, setLocalMessages] = useState([]);
  const [error, setError] = useState("");
  const [renderedInteractionScope, setRenderedInteractionScope] =
    useState(interactionScope);
  const composerHintId = useId();
  const operationsInboxHeadingId = useId();
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const activeInteractionScopeRef = useRef(interactionScope);
  const setupContextConsumedRef = useRef(false);
  const previousStarterPromptRef = useRef(normalizedStarterPrompt);

  const conversationsQuery = useGetAiAssistantConversationsQuery(
    { cacheScope, limit: showHistory ? 30 : 5 },
    { skip: !showHistory },
  );
  const conversations = getConversationList(conversationsQuery.currentData);
  const conversationQuery = useGetAiAssistantConversationQuery(
    { cacheScope, conversationId },
    { skip: !conversationId },
  );
  const [createConversation, createState] =
    useCreateAiAssistantConversationMutation();
  const [sendMessage, sendState] = useSendAiAssistantMessageMutation();
  // `data` may briefly retain the previous query argument. Only render data
  // tied to the currently selected conversation so stale action cards cannot
  // be confirmed while a different conversation is loading.
  const interactionScopeIsCurrent =
    renderedInteractionScope === interactionScope;
  const serverConversation = interactionScopeIsCurrent
    ? (conversationQuery.currentData?.conversation ??
      conversationQuery.currentData ??
      null)
    : null;
  const serverMessages = normalizeAiMessages(serverConversation);
  const messages = useMemo(
    () =>
      mergeMessages(
        serverMessages,
        interactionScopeIsCurrent ? localMessages : [],
      ),
    [interactionScopeIsCurrent, localMessages, serverMessages],
  );
  const briefingQuery = useGetLatestAiBriefingQuery(
    {
      cacheScope: briefingAccess.cacheScope,
      locale,
      ...(locationId ? { locationId } : {}),
    },
    {
      skip:
        !briefingAccess.canReadCached ||
        messages.length > 0 ||
        Boolean(conversationId),
    },
  );
  const operationsInbox = useMemo(
    () =>
      !conversationId && messages.length === 0
        ? getStudioAssistantOperationsInbox(briefingQuery.currentData, {
            locale,
            locationId,
          })
        : null,
    [
      briefingQuery.currentData,
      conversationId,
      locale,
      locationId,
      messages.length,
    ],
  );
  const operationsInboxLoading =
    !conversationId &&
    messages.length === 0 &&
    briefingAccess.canReadCached &&
    !briefingQuery.currentData &&
    (briefingQuery.isLoading || briefingQuery.isFetching);
  const starterSuggestionKeys = useMemo(
    () =>
      getStudioAssistantSuggestionKeys({
        tenant,
        access: workspaceAccess,
      }),
    [tenant, workspaceAccess],
  );
  const isWorking = createState.isLoading || sendState.isLoading;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, isWorking]);

  useEffect(() => {
    const composer = inputRef.current;
    if (!composer || !compact) return;

    composer.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(composer.scrollHeight, COMPOSER_MIN_HEIGHT),
      COMPACT_COMPOSER_MAX_HEIGHT,
    );
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY =
      composer.scrollHeight > COMPACT_COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [compact, input]);

  useEffect(() => {
    if (activeInteractionScopeRef.current === interactionScope) return;
    activeInteractionScopeRef.current = interactionScope;
    setRenderedInteractionScope(interactionScope);
    setupContextConsumedRef.current = false;
    setConversationId("");
    setInput(normalizedStarterPrompt);
    setLocalMessages([]);
    setError("");
    onConversationChange?.("");
  }, [interactionScope, normalizedStarterPrompt, onConversationChange]);

  useEffect(() => {
    const previousStarterPrompt = previousStarterPromptRef.current;
    if (previousStarterPrompt === normalizedStarterPrompt) return;
    previousStarterPromptRef.current = normalizedStarterPrompt;
    setInput((current) =>
      current === previousStarterPrompt ? normalizedStarterPrompt : current,
    );
  }, [normalizedStarterPrompt]);

  const selectConversation = (id) => {
    setConversationId(String(id));
    setLocalMessages([]);
    setError("");
    onConversationChange?.(String(id));
  };

  const startNew = () => {
    setConversationId("");
    setLocalMessages([]);
    setError("");
    onConversationChange?.("");
  };

  const submit = async (textValue = input, options = {}) => {
    const message = String(textValue || "").trim();
    if (!message || isWorking) return;

    setInput("");
    setError("");
    const optimistic = createClientMessage(message);
    const requestInteractionScope = interactionScope;
    const contextOverride = options?.contextOverride ?? null;
    const consumesSetupContext =
      !contextOverride &&
      assistantContext?.surface === "setup_center" &&
      setupContextConsumedRef.current === false;
    const requestContext =
      contextOverride ??
      (assistantContext?.surface === "setup_center" &&
      setupContextConsumedRef.current
        ? null
        : assistantContext);
    if (consumesSetupContext) setupContextConsumedRef.current = true;
    setLocalMessages((current) => [...current, optimistic]);

    try {
      let activeId = conversationId;

      if (!activeId) {
        const created = await createConversation({
          locale,
          locationId: locationId || undefined,
        }).unwrap();
        if (activeInteractionScopeRef.current !== requestInteractionScope) {
          return;
        }
        const conversation = created?.conversation ?? created;
        activeId = getEntityId(conversation);
        if (!activeId) throw new Error(t("errors.conversationCreate"));
        setConversationId(activeId);
        onConversationChange?.(activeId);
      }

      const response = await sendMessage({
        conversationId: activeId,
        message,
        locale,
        ...(requestContext ? { context: requestContext } : {}),
      }).unwrap();
      if (activeInteractionScopeRef.current !== requestInteractionScope) {
        return;
      }
      const assistantMessage = normalizeAssistantResponse(response);
      if (assistantMessage.text || assistantMessage.actions?.length) {
        setLocalMessages((current) => [...current, assistantMessage]);
      }
    } catch (requestError) {
      if (activeInteractionScopeRef.current !== requestInteractionScope) {
        return;
      }
      if (consumesSetupContext) setupContextConsumedRef.current = false;
      setLocalMessages((current) =>
        current.filter((message) => getEntityId(message) !== optimistic.id),
      );
      setInput(message);
      setError(getAiErrorMessage(requestError, t("errors.message")));
    }
  };

  return (
    <div
      className={
        showHistory
          ? "grid min-h-[680px] overflow-hidden rounded-[24px] border border-line bg-white shadow-card lg:grid-cols-[260px_minmax(0,1fr)]"
          : "flex min-h-0 flex-1 flex-col"
      }
    >
      {showHistory ? (
        <aside className="border-b border-line bg-sand-50/70 p-4 lg:border-b-0 lg:border-r">
          <button
            type="button"
            onClick={startNew}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
          >
            <PlusIcon className="h-4 w-4" />
            {t("assistant.newConversation")}
          </button>
          <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            {t("assistant.recent")}
          </p>
          <div className="max-h-56 space-y-1 overflow-y-auto lg:max-h-[560px]">
            {conversationsQuery.isLoading ? (
              <p className="px-3 py-4 text-xs text-ink-muted">
                {t("assistant.loadingHistory")}
              </p>
            ) : conversations.length ? (
              conversations.map((conversation) => {
                const id = getEntityId(conversation);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectConversation(id)}
                    className={
                      conversationId === id
                        ? "w-full rounded-[13px] bg-white px-3 py-3 text-left text-xs font-semibold text-ink shadow-sm"
                        : "w-full rounded-[13px] px-3 py-3 text-left text-xs text-ink-muted transition hover:bg-white hover:text-ink"
                    }
                  >
                    <span className="line-clamp-2">
                      {conversation.title ??
                        conversation.summary ??
                        t("assistant.untitled")}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-xs leading-5 text-ink-muted">
                {t("assistant.noHistory")}
              </p>
            )}
          </div>
        </aside>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col bg-canvas">
        <div
          data-ai-conversation-scroll
          className={
            compact
              ? "scrollbar-subtle min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3.5"
              : "min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7"
          }
          aria-live="polite"
        >
          {!messages.length ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink">
                {t("assistant.emptyTitle")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
                {t("assistant.emptyDescription")}
              </p>
              {operationsInboxLoading ? (
                <div
                  className="mt-5 flex w-full max-w-lg items-center gap-2 rounded-[16px] border border-line bg-white p-4 text-left text-xs text-ink-muted"
                  role="status"
                >
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  {t("assistant.operationsInbox.loading")}
                </div>
              ) : operationsInbox ? (
                <section
                  className="mt-5 w-full max-w-lg rounded-[18px] border border-line bg-white p-4 text-left shadow-sm"
                  aria-labelledby={operationsInboxHeadingId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cobalt-700">
                        {t("assistant.operationsInbox.eyebrow")}
                      </p>
                      <h3
                        id={operationsInboxHeadingId}
                        className="mt-1 text-sm font-semibold text-ink"
                      >
                        {t("assistant.operationsInbox.title")}
                      </h3>
                    </div>
                    <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10px] font-semibold text-ink-muted">
                      {t("assistant.operationsInbox.count", {
                        count: operationsInbox.length,
                      })}
                    </span>
                  </div>
                  {operationsInbox.length ? (
                    <ul className="mt-3 space-y-2">
                      {operationsInbox.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-[14px] border border-line bg-sand-50/65 p-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`mt-0.5 inline-flex shrink-0 rounded-full border p-1.5 ${
                                INBOX_SEVERITY_STYLES[item.severity]
                              }`}
                              aria-label={t(
                                `assistant.operationsInbox.severity.${item.severity}`,
                              )}
                            >
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold leading-5 text-ink">
                                {item.title}
                              </p>
                              {item.description ? (
                                <p className="mt-0.5 text-[11px] leading-5 text-ink-muted">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-9">
                            <button
                              type="button"
                              onClick={() =>
                                submit(
                                  item.prompt ||
                                    t(
                                      "assistant.operationsInbox.fallbackPrompt",
                                      { title: item.title },
                                    ),
                                  {
                                    contextOverride: {
                                      surface: "dashboard",
                                      route: "/app",
                                    },
                                  },
                                )
                              }
                              disabled={isWorking}
                              className="min-h-8 rounded-full border border-cobalt-200 bg-white px-3 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("assistant.operationsInbox.ask")}
                            </button>
                            {item.href ? (
                              <Link
                                href={item.href}
                                aria-label={t(
                                  "assistant.operationsInbox.openItem",
                                  { title: item.title },
                                )}
                                className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-ink-muted transition hover:text-ink"
                              >
                                {t("assistant.operationsInbox.open")}
                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-[13px] bg-success-soft px-3 py-3 text-[12px] leading-5 text-success">
                      {t("assistant.operationsInbox.empty")}
                    </p>
                  )}
                </section>
              ) : null}
              <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                {starterSuggestionKeys.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      submit(t(`assistant.suggestions.${suggestion}`))
                    }
                    className="min-h-10 rounded-full border border-line bg-white px-3.5 py-2 text-[12px] font-medium text-ink-soft transition hover:border-cobalt-200 hover:text-cobalt-700"
                  >
                    {t(`assistant.suggestions.${suggestion}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isLatestAssistantMessage =
                index === messages.length - 1 &&
                getAiMessageRole(message) === "assistant";
              const retryMessage =
                isLatestAssistantMessage &&
                getAiGrounding(message)?.status === "unavailable"
                  ? getPreviousUserMessageText(messages, index)
                  : "";

              return (
                <AiMessage
                  key={getEntityId(message) || `${message?.role}-${index}`}
                  message={message}
                  conversationId={conversationId}
                  compact={compact}
                  interactionDisabled={isWorking}
                  canCreateBooking={canCreateBooking}
                  showNavigation={isLatestAssistantMessage}
                  onReply={isLatestAssistantMessage ? submit : undefined}
                  onRetry={
                    retryMessage ? () => submit(retryMessage) : undefined
                  }
                />
              );
            })
          )}
          {isWorking ? (
            <div className="flex justify-start">
              <span
                className={
                  compact
                    ? "inline-flex items-center gap-2 rounded-full border border-line/80 bg-white px-4 py-2 text-xs text-ink-muted"
                    : "inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs text-ink-muted shadow-sm"
                }
              >
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                {t("assistant.thinking")}
              </span>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-[13px] border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          data-ai-composer={compact || undefined}
          data-ui-unstyled={compact ? "true" : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className={
            compact
              ? "border-t border-line/80 bg-white p-2.5 sm:p-3"
              : "border-t border-line bg-white p-3 sm:p-4"
          }
        >
          <div
            className={
              compact
                ? "flex min-h-14 items-end gap-1.5 rounded-[16px] border border-line/80 bg-sand-50/60 p-1.5 transition focus-within:border-cobalt-300 focus-within:ring-[3px] focus-within:ring-cobalt-100/60"
                : "flex items-end gap-2 rounded-[18px] border border-line bg-sand-50 p-2 transition focus-within:border-cobalt-300 focus-within:ring-4 focus-within:ring-cobalt-100/70"
            }
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("assistant.inputLabel")}</span>
              <textarea
                ref={inputRef}
                data-ai-composer-input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={compact ? 1 : 3}
                maxLength={4000}
                aria-describedby={composerHintId}
                placeholder={t("assistant.placeholder")}
                className={
                  compact
                    ? "scrollbar-subtle block min-h-10 max-h-14 w-full resize-none border-0 bg-transparent px-2.5 py-2 text-base leading-6 text-ink placeholder:text-ink-subtle focus:ring-0 sm:text-sm"
                    : "w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-ink placeholder:text-ink-subtle focus:ring-0"
                }
              />
            </label>
            <button
              type="submit"
              data-ai-composer-send={compact || undefined}
              disabled={!input.trim() || isWorking}
              aria-label={t("assistant.send")}
              className={`flex shrink-0 items-center justify-center rounded-full bg-cobalt-500 text-white transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-40 ${
                compact ? "h-11 w-11" : "h-10 w-10"
              }`}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
          <p
            id={composerHintId}
            className={
              compact
                ? "mt-1.5 px-1.5 text-[10px] leading-4 text-ink-subtle/80"
                : "mt-2 px-1 text-[10px] leading-4 text-ink-subtle"
            }
          >
            {t("assistant.disclaimer")}
          </p>
        </form>
      </section>
    </div>
  );
}
