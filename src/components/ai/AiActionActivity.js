"use client";

import {
  ArrowPathIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS } from "@/config/permissions";
import { selectHasWorkspacePermission } from "@/lib/features/auth/authSlice";
import { useGetAiActionsQuery } from "@/lib/features/ai/aiApiSlice";

import AiActionConfirmation from "./AiActionConfirmation";
import { clampAiActionPage, getAiActionItems } from "./ai-action.utils";
import { cx } from "./ai.utils";

const FILTERS = ["all", "suggested", "executing", "completed", "failed"];

export default function AiActionActivity() {
  const t = useTranslations("AI");
  const canAuditWorkspace = useSelector(
    selectHasWorkspacePermission(PERMISSIONS.AI_AUDIT_VIEW),
  );
  const [scope, setScope] = useState("mine");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const effectiveScope = canAuditWorkspace ? scope : "mine";
  const query = useGetAiActionsQuery(
    {
      scope: effectiveScope,
      page,
      limit: 20,
      ...(filter === "all" ? {} : { status: filter }),
    },
    { pollingInterval: 15_000 },
  );
  const actionData = query.currentData;
  const actions = getAiActionItems(actionData).filter(Boolean);
  const pages = Math.max(Number(actionData?.pages || 0), 1);
  const visiblePage = clampAiActionPage(page, pages);

  useEffect(() => {
    if (!actionData || visiblePage === page) return undefined;
    const timeoutId = window.setTimeout(() => setPage(visiblePage), 0);
    return () => window.clearTimeout(timeoutId);
  }, [actionData, page, visiblePage]);

  const changeScope = (value) => {
    setScope(value);
    setPage(1);
  };

  const changeFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
      <header className="border-b border-line bg-sand-50/70 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
              {t("commandCenter.activity.eyebrow")}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">
              {t("commandCenter.activity.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
              {t("commandCenter.activity.description")}
            </p>
          </div>
          {canAuditWorkspace ? (
            <div className="inline-flex self-start rounded-full border border-line bg-white p-1">
              {["mine", "workspace"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeScope(value)}
                  className={cx(
                    "min-h-9 rounded-full px-3 text-[11px] font-semibold transition",
                    scope === value
                      ? "bg-ink text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t(`commandCenter.activity.scope.${value}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeFilter(value)}
              className={cx(
                "min-h-10 shrink-0 rounded-full border px-3.5 text-[11px] font-semibold transition",
                filter === value
                  ? "border-cobalt-500 bg-cobalt-50 text-cobalt-700"
                  : "border-line bg-white text-ink-muted hover:border-ink-subtle hover:text-ink",
              )}
            >
              {t(`commandCenter.activity.filters.${value}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-[480px] bg-canvas p-4 sm:p-6">
        {query.isLoading ? (
          <div
            className="flex min-h-[360px] items-center justify-center"
            role="status"
          >
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              {t("commandCenter.activity.loading")}
            </span>
          </div>
        ) : query.isError ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-ink">
              {t("commandCenter.activity.loadError")}
            </p>
            <button
              type="button"
              onClick={query.refetch}
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white"
            >
              {t("commandCenter.activity.retry")}
            </button>
          </div>
        ) : actions.length ? (
          <div className="space-y-3">
            {effectiveScope === "workspace" ? (
              <p className="rounded-[13px] border border-line bg-white px-4 py-3 text-xs leading-5 text-ink-muted">
                {t("commandCenter.activity.workspaceReadOnly")}
              </p>
            ) : null}
            {actions.map((action) => (
              <AiActionConfirmation
                key={action.id}
                action={action}
                conversationId={action.conversationId}
                onActionChange={() => query.refetch()}
                readOnly={effectiveScope === "workspace"}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
              <BoltIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">
              {t("commandCenter.activity.emptyTitle")}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
              {t("commandCenter.activity.emptyDescription")}
            </p>
          </div>
        )}
      </div>

      {!query.isLoading &&
      !query.isError &&
      (Number(actionData?.total || 0) > 20 || visiblePage > 1) ? (
        <footer className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setPage(Math.max(visiblePage - 1, 1))}
            disabled={visiblePage <= 1}
            aria-label={t("commandCenter.activity.previous")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-xs text-ink-muted">
            {t("commandCenter.activity.page", {
              page: visiblePage,
              pages,
            })}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(visiblePage + 1, pages))}
            disabled={visiblePage >= pages}
            aria-label={t("commandCenter.activity.next")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted disabled:opacity-40"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </footer>
      ) : null}
    </div>
  );
}
