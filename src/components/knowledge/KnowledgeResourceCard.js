"use client";

import {
  ArrowUpRightIcon,
  BookOpenIcon,
  DocumentArrowDownIcon,
  LinkIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cx } from "./knowledge.utils";
import design from "@/components/public-tenant/portalCatalog.module.css";

const icons = {
  video: PlayCircleIcon,
  guide: BookOpenIcon,
  faq: QuestionMarkCircleIcon,
  link: LinkIcon,
  file: DocumentArrowDownIcon,
};

export default function KnowledgeResourceCard({
  resource,
  onOpen,
  href = "",
  compact = false,
}) {
  const t = useTranslations("KnowledgeHub");
  const Icon = icons[resource.type] || BookOpenIcon;

  return (
    <article
      data-tenant-layout="card"
      data-tenant-surface="card"
      className={cx(
        "group relative flex h-full flex-col overflow-hidden rounded-[22px] border bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition motion-reduce:transform-none motion-reduce:transition-none",
        design.knowledgeCard,
        resource.featured
          ? "border-[color-mix(in_srgb,var(--tenant-secondary)_42%,var(--tenant-border))] shadow-[0_18px_45px_color-mix(in_srgb,var(--tenant-secondary)_11%,transparent)]"
          : "border-[var(--tenant-border)] shadow-sm hover:-translate-y-0.5 hover:shadow-card",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`${design.knowledgeIcon} inline-flex shrink-0 items-center justify-center`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {resource.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_12%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--tenant-text-on-surface)]">
              <SparklesIcon className="h-3 w-3" />
              {t("badges.featured")}
            </span>
          ) : null}
          <span className="rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_9%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--tenant-accent-on-surface)]">
            {t(`types.${resource.type}`)}
          </span>
        </div>
      </div>

      <h3
        className="mt-4 text-base font-semibold tracking-[-0.02em] text-[var(--tenant-text-on-surface)]"
        data-tenant-type="display"
      >
        {resource.title}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
        {resource.summary || resource.content || t("card.noSummary")}
      </p>

      {resource.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--tenant-border)] px-2 py-1 text-[10px] text-[var(--tenant-muted-on-surface)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {href ? (
        <Link
          href={href}
          data-tenant-button="secondary"
          className={`${design.knowledgeAction} mt-5 inline-flex items-center gap-3 rounded-full border border-[var(--tenant-border)] px-4 py-2 font-semibold text-[var(--tenant-text-on-surface)] transition group-hover:border-[var(--tenant-accent-on-surface)] group-hover:text-[var(--tenant-accent-on-surface)]`}
          aria-label={t("card.openLabel", { title: resource.title })}
        >
          {resource.type === "video" ? t("card.watch") : t("card.open")}
          <ArrowUpRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onOpen?.(resource)}
          data-tenant-button="secondary"
          className={`${design.knowledgeAction} mt-5 inline-flex items-center gap-3 rounded-full border border-[var(--tenant-border)] px-4 py-2 font-semibold text-[var(--tenant-text-on-surface)] transition group-hover:border-[var(--tenant-accent-on-surface)] group-hover:text-[var(--tenant-accent-on-surface)]`}
          aria-label={t("card.openLabel", { title: resource.title })}
        >
          {resource.type === "video" ? t("card.watch") : t("card.open")}
          <ArrowUpRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
