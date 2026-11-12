"use client";

import {
  ArrowPathIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";

import { useGetAccessCodeAuditQuery } from "@/lib/features/accessCodes/accessCodeApiSlice";

import { normalizeAccessCodeAudit } from "./accessCodes.utils";

const getActorName = (event, fallback) => {
  const actorName = [event?.actor?.firstName, event?.actor?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    event?.actor?.displayName ||
    event?.actor?.name ||
    actorName ||
    event?.actor?.email ||
    event?.actorName ||
    event?.actorEmail ||
    event?.performedBy?.name ||
    event?.performedBy?.email ||
    fallback
  );
};

const AUDIT_ACTIONS = new Set([
  "pool_created",
  "pool_updated",
  "pool_archived",
  "code_created",
  "code_updated",
  "code_revealed",
  "code_retired",
  "code_imported",
  "codes_imported",
]);

export default function AccessCodeAuditLog({ enabled, poolId }) {
  const t = useTranslations("AccessCodes");
  const format = useFormatter();
  const { data, isError, isFetching, isLoading, refetch } =
    useGetAccessCodeAuditQuery(
      { poolId, page: 1, limit: 50 },
      { skip: !enabled || !poolId },
    );
  const events = normalizeAccessCodeAudit(data);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label={t("audit.loading")}>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-20 animate-pulse rounded-[16px] border border-line bg-white/70"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[18px] border border-dashed border-danger/25 bg-danger/5 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-ink">{t("audit.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-cobalt-700"
        >
          <ArrowPathIcon
            aria-hidden="true"
            className={`size-4 ${isFetching ? "animate-spin" : ""}`}
          />
          {t("actions.retry")}
        </button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-[18px] border border-dashed border-line bg-white/60 px-5 py-10 text-center">
        <ShieldCheckIcon
          aria-hidden="true"
          className="mx-auto size-7 text-cobalt-500"
        />
        <p className="mt-3 text-sm font-semibold text-ink">
          {t("audit.emptyTitle")}
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-ink-muted">
          {t("audit.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-white">
      {events.map((event) => {
        const timestamp =
          event.createdAt || event.occurredAt || event.timestamp;
        const action = String(event.action || event.eventType || "updated")
          .toLowerCase()
          .replaceAll(".", "_");
        const actorName = getActorName(event, t("audit.systemActor"));
        const subjectLabel =
          event.maskedCode ||
          event.metadata?.maskedCode ||
          event.subjectLabel ||
          event.metadata?.subjectLabel;

        return (
          <li
            key={event.id}
            className="flex items-start gap-3 px-4 py-4 sm:px-5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cobalt-50 text-cobalt-600">
              <ClockIcon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="text-xs font-semibold text-ink">
                  {AUDIT_ACTIONS.has(action)
                    ? t(`audit.actions.${action}`)
                    : t("audit.actions.updated")}
                </p>
                {timestamp ? (
                  <time
                    dateTime={timestamp}
                    className="text-[10px] text-ink-subtle"
                  >
                    {format.dateTime(new Date(timestamp), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                {t("audit.performedBy", { name: actorName })}
                {subjectLabel ? ` · ${subjectLabel}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
