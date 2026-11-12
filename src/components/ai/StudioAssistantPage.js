"use client";

import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import { useGetAiActionsQuery } from "@/lib/features/ai/aiApiSlice";

import AiActionActivity from "./AiActionActivity";
import BusinessAdvisorPanel from "./BusinessAdvisorPanel";
import StudioAssistantConversation from "./StudioAssistantConversation";
import { cx } from "./ai.utils";
import { getStudioAssistantIntent } from "./studio-assistant-intents";

const COMMAND_VIEWS = ["assistant", "advisor", "activity"];

export default function StudioAssistantPage({ showPageHeader = true }) {
  const t = useTranslations("AI");
  const searchParams = useSearchParams();
  const intentKey = searchParams?.get("intent") || "";
  const sourceId = searchParams?.get("sourceId") || "";
  const recommendationId = searchParams?.get("recommendationId") || "";
  const requestedView = searchParams?.get("view") || "";
  const intent = useMemo(
    () =>
      getStudioAssistantIntent(intentKey, {
        sourceId,
        recommendationId,
      }),
    [intentKey, recommendationId, sourceId],
  );
  const initialView = intent
    ? "assistant"
    : COMMAND_VIEWS.includes(requestedView)
      ? requestedView
      : "assistant";
  const [view, setView] = useState(initialView);
  const assistantAccess = useAiAccess({ feature: "assistant" });
  const pendingQuery = useGetAiActionsQuery({
    scope: "mine",
    status: "suggested",
    page: 1,
    limit: 1,
  });
  const pendingCount = Number(
    pendingQuery.data?.pendingCount ?? pendingQuery.data?.total ?? 0,
  );
  const unavailableReason = !assistantAccess.hasPermission
    ? "permission"
    : !assistantAccess.moduleEnabled
      ? "plan"
      : assistantAccess.usageBlocked
        ? "credits"
        : "service";

  const moveTabFocus = (event, currentId) => {
    const currentIndex = COMMAND_VIEWS.indexOf(currentId);
    let nextIndex = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % COMMAND_VIEWS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + COMMAND_VIEWS.length) % COMMAND_VIEWS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = COMMAND_VIEWS.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextId = COMMAND_VIEWS[nextIndex];
    setView(nextId);
    event.currentTarget.parentElement
      ?.querySelector(`#ai-command-tab-${nextId}`)
      ?.focus();
  };

  return (
    <section className="mx-auto w-full max-w-[1500px]">
      {showPageHeader ? (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-cobalt-600">
              <SparklesIcon className="h-4 w-4" />
              {t("eyebrow")}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
              {t("commandCenter.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              {t("commandCenter.description")}
            </p>
          </div>
        </header>
      ) : null}

      <div
        className="mb-4 inline-flex w-full rounded-[16px] border border-line bg-white p-1 shadow-sm sm:w-auto"
        role="tablist"
        aria-label={t("commandCenter.tabs.label")}
      >
        {[
          {
            id: "assistant",
            icon: ChatBubbleLeftRightIcon,
            label: t("commandCenter.tabs.assistant"),
          },
          {
            id: "advisor",
            icon: LightBulbIcon,
            label: t("commandCenter.tabs.advisor"),
          },
          {
            id: "activity",
            icon: ClipboardDocumentCheckIcon,
            label: t("commandCenter.tabs.activity"),
          },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`ai-command-tab-${id}`}
            type="button"
            role="tab"
            tabIndex={view === id ? 0 : -1}
            aria-selected={view === id}
            aria-controls={`ai-command-panel-${id}`}
            onClick={() => setView(id)}
            onKeyDown={(event) => moveTabFocus(event, id)}
            className={cx(
              "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[12px] px-2 text-xs font-semibold transition sm:flex-none sm:px-4",
              view === id
                ? "bg-ink text-white shadow-sm"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="min-w-0 truncate">{label}</span>
            {id === "activity" && pendingCount > 0 ? (
              <span
                className={cx(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px]",
                  view === id
                    ? "bg-white/20 text-white"
                    : "bg-cobalt-50 text-cobalt-700",
                )}
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {view === "assistant" ? (
        <div
          id="ai-command-panel-assistant"
          role="tabpanel"
          aria-labelledby="ai-command-tab-assistant"
        >
          {assistantAccess.isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-line bg-white">
              <span className="h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
            </div>
          ) : assistantAccess.available ? (
            <StudioAssistantConversation
              key={`${intentKey || "default"}:${sourceId || ""}:${recommendationId}`}
              showHistory
              starterPrompt={intent ? t(intent.promptKey) : ""}
              assistantContext={
                intent?.context ?? {
                  surface: "command_center",
                  route: "/app/ai",
                }
              }
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-line bg-white p-6 text-center shadow-card">
              <SparklesIcon className="h-8 w-8 text-cobalt-500" />
              <h2 className="mt-4 text-base font-semibold text-ink">
                {t("unavailable." + unavailableReason + ".title")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
                {t("unavailable." + unavailableReason + ".description")}
              </p>
              <button
                type="button"
                onClick={() => setView("activity")}
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white"
              >
                {t("commandCenter.openActivity")}
              </button>
            </div>
          )}
        </div>
      ) : view === "advisor" ? (
        <div
          id="ai-command-panel-advisor"
          role="tabpanel"
          aria-labelledby="ai-command-tab-advisor"
        >
          <BusinessAdvisorPanel
            selectedRecommendationId={recommendationId}
            onDiscuss={() => setView("assistant")}
          />
        </div>
      ) : (
        <div
          id="ai-command-panel-activity"
          role="tabpanel"
          aria-labelledby="ai-command-tab-activity"
        >
          <AiActionActivity />
        </div>
      )}
    </section>
  );
}
