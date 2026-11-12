"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  FunnelIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { useGetCommunicationAuditQuery } from "@/lib/features/communications/communicationsApiSlice";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "./CommunicationsPrimitives";
import {
  formatDateTime,
  getResourceId,
  humanize,
  unwrapCollection,
} from "./communications.utils";

const eventTypes = [
  "all",
  "conversation",
  "message",
  "task",
  "customer",
  "delivery",
  "satisfaction_survey",
  "conversation_batch",
];

const getActorName = (entry, fallback) => {
  const fullName = [entry?.actor?.firstname, entry?.actor?.lastname]
    .filter(Boolean)
    .join(" ");

  return (
    entry?.actor?.name ||
    fullName ||
    entry?.actorName ||
    entry?.actor?.email ||
    (entry?.actorType ? humanize(entry.actorType) : "") ||
    fallback
  );
};

export default function AuditLogView() {
  const t = useTranslations("Communications");
  const locale = useLocale();
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, refetch } = useGetCommunicationAuditQuery({
    ...(type !== "all" ? { resourceType: type } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    limit: 100,
  });
  const entries = unwrapCollection(data, "audit").length
    ? unwrapCollection(data, "audit")
    : unwrapCollection(data, "entries");

  const exportCsv = () => {
    const header = ["timestamp", "actor", "type", "action", "description"];
    const rows = entries.map((entry) => [
      entry.createdAt,
      getActorName(entry, t("audit.system")),
      entry.type ?? entry.category,
      entry.action ?? entry.event,
      entry.description ?? entry.summary ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "communications-audit.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[26px] border border-line bg-white shadow-card">
      <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-cobalt-600" />
            <h2 className="text-base font-semibold text-ink">
              {t("audit.title")}
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
            {t("audit.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!entries.length}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {t("audit.export")}
        </button>
      </header>

      <div className="flex flex-col gap-3 border-b border-line bg-sand-50/70 p-4 sm:flex-row sm:items-end sm:p-5">
        <label className="block text-xs font-medium text-ink-muted">
          {t("audit.type")}
          <span className="relative mt-1.5 block">
            <FunnelIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-9 rounded-full border-line bg-white py-1 pl-8 pr-8 text-xs focus:border-cobalt-300 focus:ring-cobalt-200"
            >
              {eventTypes.map((value) => (
                <option key={value} value={value}>
                  {t(`audit.types.${value}`)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          {t("audit.from")}
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1.5 block h-9 rounded-full border-line bg-white py-1 text-xs focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          {t("audit.to")}
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1.5 block h-9 rounded-full border-line bg-white py-1 text-xs focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>
      </div>

      {isLoading ? <LoadingState label={t("loading.audit")} /> : null}
      {isError ? (
        <ErrorState
          title={t("errors.auditTitle")}
          description={t("errors.auditDescription")}
          actionLabel={t("actions.retry")}
          onRetry={refetch}
        />
      ) : null}
      {!isLoading && !isError && !entries.length ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title={t("empty.auditTitle")}
          description={t("empty.auditDescription")}
        />
      ) : null}
      {!isLoading && !isError && entries.length ? (
        <div className="divide-y divide-line">
          {entries.map((entry, index) => {
            const typeValue =
              entry.resourceType ?? entry.type ?? entry.category ?? "message";
            return (
              <article
                key={getResourceId(entry) || index}
                className="grid gap-3 p-5 sm:grid-cols-[170px_150px_1fr] sm:items-start sm:p-6"
              >
                <div>
                  <p className="text-xs font-medium text-ink">
                    {formatDateTime(entry.createdAt ?? entry.timestamp, locale)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                    {entry.ipAddress
                      ? `${t("audit.ip")}: ${entry.ipAddress}`
                      : t("audit.noIp")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink">
                    {getActorName(entry, t("audit.system"))}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-sand-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sand-800">
                    {t(
                      `audit.types.${eventTypes.includes(typeValue) ? typeValue : "message"}`,
                    )}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {entry.actionLabel ??
                      humanize(entry.action ?? entry.event ?? typeValue)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {entry.description ??
                      entry.summary ??
                      t("audit.noDescription")}
                  </p>
                  {entry.metadata?.reason || entry.reason ? (
                    <p className="mt-2 rounded-[10px] bg-sand-50 px-3 py-2 text-[11px] text-ink-muted">
                      {entry.metadata?.reason ?? entry.reason}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
