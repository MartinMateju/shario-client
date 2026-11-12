"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import {
  getSafeResourceUrl,
  getYoutubeEmbedUrl,
} from "@/components/knowledge/knowledge.utils";
import { Link } from "@/i18n/navigation";
import { useGetPublicKnowledgeResourceQuery } from "@/lib/features/knowledge/knowledgeApiSlice";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

import PublicCapabilityGate from "./PublicCapabilityGate";

export default function PublicKnowledgeResourcePage() {
  const t = useTranslations("KnowledgeHub");
  const params = useParams();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const resourceId = String(params?.resourceId || "").trim();
  const query = useGetPublicKnowledgeResourceQuery(
    { tenantSlug, resourceId },
    { skip: !tenantSlug || !resourceId },
  );
  const resource = query.data;
  const embedUrl = getYoutubeEmbedUrl(resource);
  const externalUrl = getSafeResourceUrl(
    resource?.type === "file"
      ? resource?.fileUrl || resource?.sourceUrl
      : resource?.sourceUrl || resource?.fileUrl,
  );
  const questions = Array.isArray(resource?.customQuestions)
    ? resource.customQuestions
    : [];

  return (
    <PublicCapabilityGate capability="help">
      <main className="min-h-[70vh] bg-[var(--tenant-background)] px-5 py-12 text-[var(--tenant-text)] sm:px-8 lg:px-12">
        <article className="mx-auto max-w-4xl">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--tenant-muted-text)] transition hover:text-[var(--tenant-text)]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("detail.back")}
          </Link>

          {query.isLoading || query.isFetching ? (
            <div
              className="mt-7 flex min-h-64 items-center justify-center rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-sm text-[var(--tenant-muted-on-surface)]"
              role="status"
            >
              <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
              {t("states.loading")}
            </div>
          ) : query.isError ? (
            <div className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 text-center text-[var(--tenant-text-on-surface)]">
              <h1 className="text-xl font-semibold">
                {t("states.errorTitle")}
              </h1>
              <p className="mt-2 text-sm text-[var(--tenant-muted-on-surface)]">
                {t("states.errorDescription")}
              </p>
              <button
                type="button"
                onClick={query.refetch}
                className="mt-5 rounded-full bg-[var(--tenant-accent)] px-5 py-2.5 text-xs font-semibold text-[var(--tenant-accent-foreground)]"
              >
                {t("actions.retry")}
              </button>
            </div>
          ) : resource ? (
            <div className="mt-7 overflow-hidden rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-card">
              <header className="border-b border-[var(--tenant-border)] px-5 py-7 sm:px-8 sm:py-9">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_9%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--tenant-accent-on-surface)]">
                    {t(`types.${resource.type}`)}
                  </span>
                  {resource.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--tenant-text-on-surface)]">
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {t("badges.featured")}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--tenant-text-on-surface)] sm:text-5xl">
                  {resource.title}
                </h1>
                {resource.summary ? (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
                    {resource.summary}
                  </p>
                ) : null}
              </header>

              <div className="p-5 sm:p-8">
                {embedUrl ? (
                  <div className="aspect-video overflow-hidden rounded-[22px] bg-ink">
                    <iframe
                      src={embedUrl}
                      title={resource.title}
                      className="h-full w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : null}

                {resource.content ? (
                  <p
                    className={`whitespace-pre-wrap text-sm leading-7 text-[var(--tenant-text-on-surface)] ${
                      embedUrl ? "mt-7" : ""
                    }`}
                  >
                    {resource.content}
                  </p>
                ) : null}

                {questions.length ? (
                  <section className="mt-8">
                    <h2 className="text-lg font-semibold text-[var(--tenant-text-on-surface)]">
                      {t("viewer.questions")}
                    </h2>
                    <div className="mt-3 space-y-2">
                      {questions.map((item, index) => (
                        <details
                          key={`${item.question}-${index}`}
                          className="rounded-[16px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-4 py-3"
                        >
                          <summary className="cursor-pointer text-sm font-semibold text-[var(--tenant-text)]">
                            {item.question}
                          </summary>
                          {item.answer ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--tenant-muted-text)]">
                              {item.answer}
                            </p>
                          ) : null}
                        </details>
                      ))}
                    </div>
                  </section>
                ) : null}

                {resource.transcript ? (
                  <details className="mt-8 rounded-[16px] border border-[var(--tenant-border)] px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--tenant-text-on-surface)]">
                      {t("viewer.transcript")}
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[var(--tenant-muted-on-surface)]">
                      {resource.transcript}
                    </p>
                  </details>
                ) : null}

                {externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--tenant-accent)] px-5 py-2.5 text-xs font-semibold text-[var(--tenant-accent-foreground)] transition hover:brightness-[0.97]"
                  >
                    {resource.type === "file" ? (
                      <DocumentArrowDownIcon className="h-4 w-4" />
                    ) : (
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    )}
                    {resource.type === "file"
                      ? t("viewer.openFile")
                      : t("viewer.openLink")}
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-7 rounded-[24px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 py-16 text-center text-sm text-[var(--tenant-muted-on-surface)]">
              {t("detail.notFound")}
            </div>
          )}
        </article>
      </main>
    </PublicCapabilityGate>
  );
}
