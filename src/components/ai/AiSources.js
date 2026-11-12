"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { isCustomerPortalHrefEnabled } from "@/components/customer-shell/customerPortalVisibility";

import { getAiEvidenceWarningKey, normalizeAiCitation } from "./ai.utils";

const SOURCE_TYPES = new Set(["video", "guide", "faq", "link", "file"]);
const SOURCE_AUDIENCES = new Set([
  "public",
  "customer",
  "member",
  "course",
  "owner",
  "staff",
]);
const CONTEXT_SOURCE_CATEGORIES = new Set([
  "actor",
  "automations",
  "booking_trend_report",
  "courses",
  "credits",
  "current_booking",
  "current_period_reports",
  "customers",
  "delivery_health",
  "inventory",
  "invoices",
  "locations",
  "memberships",
  "operations",
  "products",
  "public_location",
  "public_site",
  "studio",
  "subscription",
  "team",
  "vouchers",
]);

const formatSourceDate = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatContextDate = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getGroundingState = (grounding, hasKnowledgeSources) => {
  if (grounding?.knowledgeStatus === "disabled") return "disabled";
  if (grounding?.knowledgeStatus === "unavailable") return "unavailable";
  if (
    grounding?.basis === "insufficient" ||
    grounding?.status === "insufficient" ||
    grounding?.insufficientEvidence === true
  ) {
    return "insufficient";
  }
  if (grounding?.basis === "public_facts") return "publicFacts";
  if (
    grounding?.status === "workspace_facts" ||
    grounding?.basis === "workspace_facts"
  ) {
    return "workspaceFacts";
  }
  if (
    ["knowledge", "mixed"].includes(grounding?.basis) &&
    !hasKnowledgeSources
  ) {
    return "insufficient";
  }
  if (grounding?.knowledgeStatus === "no_match") return "insufficient";
  if (grounding?.status === "grounded" && !hasKnowledgeSources)
    return "insufficient";
  if (grounding?.status === "grounded" || hasKnowledgeSources)
    return "grounded";
  return "insufficient";
};

const warningText = (warning, t) => {
  if (typeof warning === "string") {
    const stringKey = getAiEvidenceWarningKey(warning);
    return t(`sources.contextWarnings.${stringKey || "partial"}`);
  }
  const translationKey = getAiEvidenceWarningKey(warning?.code);
  if (translationKey) {
    return t(`sources.contextWarnings.${translationKey}`);
  }
  return t("sources.contextWarnings.partial");
};

export default function AiSources({
  citations = [],
  grounding = null,
  evidence = null,
}) {
  const t = useTranslations("AI");
  const locale = useLocale();
  const tenant = useOptionalPublicTenant()?.tenant;
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const evidenceSources = Array.isArray(evidence?.sources)
    ? evidence.sources
    : [];
  const legacyCitations = Array.isArray(citations) ? citations : [];
  const citationById = new Map(
    legacyCitations.map((citation) => [
      String(citation?.id ?? citation?.sourceId ?? ""),
      citation,
    ]),
  );
  const sources = evidenceSources.length
    ? evidenceSources.map((source) => ({
        ...(citationById.get(String(source?.id ?? source?.sourceId ?? "")) ??
          {}),
        ...source,
      }))
    : legacyCitations;
  const context =
    evidence?.context && typeof evidence.context === "object"
      ? evidence.context
      : {};
  const effectiveGrounding = {
    ...(grounding ?? {}),
    ...(context.basis ? { basis: context.basis } : {}),
  };
  const valid = sources
    .map((citation, index) =>
      normalizeAiCitation(citation, index, t("sources.source")),
    )
    .map((citation) =>
      citation.kind === "context" &&
      CONTEXT_SOURCE_CATEGORIES.has(citation.category)
        ? {
            ...citation,
            title: t(`sources.contextSources.${citation.category}`),
          }
        : citation,
    )
    .filter(
      (citation) =>
        citation.title &&
        (citation.kind !== "context" ||
          CONTEXT_SOURCE_CATEGORIES.has(citation.category)),
    );
  const answerSources = valid.filter((source) => source.kind !== "context");
  const availableContextSources = valid.filter(
    (source) => source.kind === "context",
  );
  const freshnessAt = formatContextDate(
    context.freshnessAt ?? evidence?.generatedAt,
    locale,
  );
  const contextWarnings = [
    ...(context.complete === false
      ? [t("sources.contextWarnings.partial")]
      : []),
    ...(context.truncated === true
      ? [t("sources.contextWarnings.truncated")]
      : []),
    ...(Array.isArray(evidence?.warnings)
      ? evidence.warnings.map((warning) => warningText(warning, t))
      : []),
  ].filter((value, index, all) => value && all.indexOf(value) === index);

  const state = getGroundingState(effectiveGrounding, answerSources.length > 0);
  const answerSourcesHeadingKey = ["insufficient", "unavailable"].includes(
    state,
  )
    ? "sources.relatedSourcesTitle"
    : "sources.answerSourcesTitle";
  const Icon = ["insufficient", "unavailable"].includes(state)
    ? ExclamationTriangleIcon
    : ["disabled", "workspaceFacts", "publicFacts"].includes(state)
      ? InformationCircleIcon
      : CheckBadgeIcon;
  const tone = ["insufficient", "unavailable"].includes(state)
    ? "border-amber-200 bg-amber-50/70 text-amber-900"
    : state === "grounded"
      ? "border-emerald-200 bg-emerald-50/65 text-emerald-900"
      : "border-line bg-sand-50/70 text-ink-soft";
  const reportedContextCount = Number.isFinite(context.sourceCount)
    ? Math.max(0, Math.trunc(context.sourceCount))
    : availableContextSources.length;
  if (!valid.length && reportedContextCount === 0) return null;

  const renderAnswerSource = (citation) => {
    const updatedAt = formatSourceDate(citation.updatedAt, locale);
    const linkEnabled =
      citation.href && isCustomerPortalHrefEnabled(tenant, citation.href);
    const sourceTitle = linkEnabled ? (
      citation.external ? (
        <a
          href={citation.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-cobalt-700 hover:underline"
        >
          {citation.title}
          <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
        </a>
      ) : (
        <Link
          href={citation.href}
          className="font-semibold text-cobalt-700 hover:underline"
        >
          {citation.title}
        </Link>
      )
    ) : (
      <span className="font-semibold text-ink-soft">{citation.title}</span>
    );

    return (
      <li key={citation.id} className="text-[11px] leading-5">
        {sourceTitle}
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] uppercase tracking-[0.08em] opacity-70">
          {SOURCE_TYPES.has(citation.kind) ? (
            <span>{t(`sources.types.${citation.kind}`)}</span>
          ) : null}
          {SOURCE_AUDIENCES.has(citation.audience) ? (
            <span>{t(`sources.audiences.${citation.audience}`)}</span>
          ) : null}
          {citation.locale ? (
            <span>{citation.locale.toUpperCase()}</span>
          ) : null}
          {citation.version ? (
            <span>{t("sources.version", { version: citation.version })}</span>
          ) : null}
          {updatedAt ? (
            <span>{t("sources.updated", { date: updatedAt })}</span>
          ) : null}
        </div>
        {citation.excerpt ? (
          <p className="mt-0.5 line-clamp-2 text-ink-muted">
            {citation.excerpt}
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <section className="mt-2" aria-label={t("sources.groundingLabel")}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-1 text-[10px] font-semibold text-cobalt-700 transition hover:text-cobalt-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-500"
      >
        <InformationCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {expanded ? t("sources.hideDetails") : t("sources.showDetails")}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={detailsId}
        hidden={!expanded}
        className={`mt-1 rounded-[14px] border px-3 py-2.5 ${tone}`}
      >
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold leading-5">
            <span>
              {t(`sources.states.${state}.title`, {
                count: answerSources.length,
              })}
            </span>
            {freshnessAt ? (
              <span className="inline-flex items-center gap-1 font-normal opacity-75">
                <span aria-hidden="true">·</span>
                <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t("sources.contextFreshnessCompact", { date: freshnessAt })}
              </span>
            ) : null}
            {context.stale === true ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                {t("sources.stale")}
              </span>
            ) : null}
          </p>
        </div>

        {contextWarnings.length ? (
          <ul className="mt-2 space-y-1 text-[10px] leading-4 text-amber-900">
            {contextWarnings.map((warning) => (
              <li key={warning} className="flex items-start gap-1.5">
                <ExclamationTriangleIcon
                  className="mt-0.5 h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[10px] leading-4 opacity-80">
          {t(`sources.states.${state}.description`, {
            count: answerSources.length,
          })}
        </p>

        <div className="mt-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-75">
            {t(answerSourcesHeadingKey, {
              count: answerSources.length,
            })}
          </h4>
          {answerSources.length ? (
            <ul className="mt-2 space-y-2" role="list">
              {answerSources.map(renderAnswerSource)}
            </ul>
          ) : (
            <p className="mt-1 text-[10px] leading-4 opacity-75">
              {t("sources.noAnswerSources")}
            </p>
          )}
        </div>

        {reportedContextCount > 0 || availableContextSources.length ? (
          <details className="mt-2.5 rounded-[10px] border border-current/10 bg-white/45 px-2.5 py-2">
            <summary className="cursor-pointer text-[10px] font-semibold leading-5">
              {t("sources.availableContextTitle", {
                count: reportedContextCount,
              })}
            </summary>
            <p className="mt-1 text-[10px] leading-4 opacity-75">
              {t("sources.availableContextDescription")}
            </p>
            {availableContextSources.length ? (
              <ul
                className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2"
                role="list"
              >
                {availableContextSources.map((source) => (
                  <li
                    key={source.id}
                    className="text-[10px] leading-4 text-ink-muted"
                  >
                    {source.title}
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}
      </div>
    </section>
  );
}
