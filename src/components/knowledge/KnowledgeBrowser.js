"use client";

import { useMemo, useState } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/communications/CommunicationsPrimitives";
import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";

import KnowledgeResourceCard from "./KnowledgeResourceCard";
import KnowledgeResourceViewer from "./KnowledgeResourceViewer";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_RESOURCE_TYPES,
  findKnowledgeResourceById,
  isKnowledgeResourceVisible,
} from "./knowledge.utils";

export default function KnowledgeBrowser({
  resources = [],
  isLoading = false,
  isError = false,
  onRetry,
  embedded = false,
  getResourceHref,
  eyebrow,
  title,
  description,
  initialResourceId = "",
  variant = "default",
}) {
  const t = useTranslations("KnowledgeHub");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [selectedResource, setSelectedResource] = useState(undefined);

  const deepLinkedResource = useMemo(
    () => findKnowledgeResourceById(resources, initialResourceId),
    [initialResourceId, resources],
  );
  const selected =
    selectedResource === undefined ? deepLinkedResource : selectedResource;

  const visibleResources = useMemo(
    () =>
      [...resources]
        .filter((resource) =>
          isKnowledgeResourceVisible(resource, { query, category, type }),
        )
        .sort((left, right) => {
          if (left.featured !== right.featured) return left.featured ? -1 : 1;

          return String(left.title || "").localeCompare(
            String(right.title || ""),
          );
        }),
    [category, query, resources, type],
  );

  if (variant === "portal") {
    return (
      <CustomerPortalPage>
        <CustomerPortalPageHeader
          eyebrow={eyebrow || t("eyebrow")}
          title={title || t("customerTitle")}
          description={description || t("customerDescription")}
        />

        <CustomerPortalSurface className="mt-7" data-customer-knowledge-browser>
          <div className="grid gap-3 border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[color-mix(in_srgb,var(--tenant-background)_72%,transparent)] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)_minmax(13rem,15rem)]">
            <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
              <span className="sr-only">{t("filters.search")}</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                data-tenant-surface="field"
                className="h-12 w-full rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)] bg-[var(--tenant-surface)] py-2 pl-11 pr-4 text-[13px] text-[var(--tenant-text-on-surface)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--tenant-muted-on-surface)] focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              />
            </label>
            <label className="relative block min-w-0">
              <span className="sr-only">{t("filters.category")}</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                data-tenant-surface="field"
                data-select-custom-arrow="true"
                className="h-12 w-full min-w-0 appearance-none rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)] bg-[var(--tenant-surface)] bg-none pl-4 pr-11 text-[13px] text-[var(--tenant-text-on-surface)] outline-none transition-[border-color,box-shadow] focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              >
                <option value="all">{t("filters.allCategories")}</option>
                {KNOWLEDGE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t(`categories.${item}`)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]"
              />
            </label>
            <label className="relative block min-w-0">
              <span className="sr-only">{t("filters.type")}</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                data-tenant-surface="field"
                data-select-custom-arrow="true"
                className="h-12 w-full min-w-0 appearance-none rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)] bg-[var(--tenant-surface)] bg-none pl-4 pr-11 text-[13px] text-[var(--tenant-text-on-surface)] outline-none transition-[border-color,box-shadow] focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              >
                <option value="all">{t("filters.allTypes")}</option>
                {KNOWLEDGE_RESOURCE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t(`types.${item}`)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]"
              />
            </label>
          </div>

          <div className="p-3 sm:p-4">
            {isLoading ? (
              <CustomerPortalLoadingState label={t("states.loading")} />
            ) : null}
            {isError ? (
              <CustomerPortalEmptyState
                icon={ExclamationTriangleIcon}
                title={t("states.errorTitle")}
                description={t("states.errorDescription")}
                action={
                  <button
                    type="button"
                    onClick={onRetry}
                    className={customerPortalSecondaryActionClass}
                  >
                    {t("actions.retry")}
                  </button>
                }
              />
            ) : null}
            {!isLoading && !isError && visibleResources.length === 0 ? (
              <CustomerPortalEmptyState
                icon={BookOpenIcon}
                title={
                  resources.length
                    ? t("states.noResultsTitle")
                    : t("states.emptyTitle")
                }
                description={
                  resources.length
                    ? t("states.noResultsDescription")
                    : t("states.emptyDescription")
                }
              />
            ) : null}

            {!isLoading && !isError && visibleResources.length ? (
              <div
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                data-tenant-content
              >
                {visibleResources.map((resource) => (
                  <KnowledgeResourceCard
                    key={resource.id}
                    resource={resource}
                    onOpen={setSelectedResource}
                    href={getResourceHref?.(resource) || ""}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CustomerPortalSurface>

        <KnowledgeResourceViewer
          resource={selected}
          open={Boolean(selected)}
          onClose={() => setSelectedResource(null)}
        />
      </CustomerPortalPage>
    );
  }

  return (
    <section className={embedded ? "px-4 py-7 sm:px-6 lg:px-10" : ""}>
      <div className="mx-auto w-full max-w-[1480px]">
        {!embedded ? (
          <div
            className="relative overflow-hidden rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-5 py-7 text-[var(--tenant-text-on-surface)] shadow-card sm:px-8 sm:py-9"
            data-tenant-layout="panel"
            data-tenant-surface="card"
          >
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[var(--tenant-accent)] opacity-[0.08]" />
            <div className="relative">
              <div
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-accent-on-surface)]"
                data-tenant-type="eyebrow"
              >
                <SparklesIcon className="h-4 w-4" />
                {eyebrow || t("eyebrow")}
              </div>
              <h1
                className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[var(--tenant-text-on-surface)] sm:text-4xl"
                data-tenant-type="display"
              >
                {title || t("customerTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                {description || t("customerDescription")}
              </p>
            </div>
          </div>
        ) : null}

        <div
          data-tenant-surface="panel"
          className={
            embedded
              ? "rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-card"
              : "mt-6 rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-card"
          }
        >
          <div className="grid gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)_minmax(13rem,15rem)]">
            <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
              <span className="sr-only">{t("filters.search")}</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                data-tenant-surface="field"
                className="h-11 w-full rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] py-2 pl-10 pr-4 text-sm text-[var(--tenant-text-on-surface)] outline-none placeholder:text-[var(--tenant-muted-on-surface)] focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              />
            </label>
            <label className="relative block min-w-0">
              <span className="sr-only">{t("filters.category")}</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                data-tenant-surface="field"
                data-select-custom-arrow="true"
                className="h-11 w-full min-w-0 appearance-none rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] bg-none pl-4 pr-11 text-sm text-[var(--tenant-text-on-surface)] outline-none focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              >
                <option value="all">{t("filters.allCategories")}</option>
                {KNOWLEDGE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t(`categories.${item}`)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]"
              />
            </label>
            <label className="relative block min-w-0">
              <span className="sr-only">{t("filters.type")}</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                data-tenant-surface="field"
                data-select-custom-arrow="true"
                className="h-11 w-full min-w-0 appearance-none rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] bg-none pl-4 pr-11 text-sm text-[var(--tenant-text-on-surface)] outline-none focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20"
              >
                <option value="all">{t("filters.allTypes")}</option>
                {KNOWLEDGE_RESOURCE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t(`types.${item}`)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tenant-muted-on-surface)]"
              />
            </label>
          </div>

          {isLoading ? <LoadingState label={t("states.loading")} /> : null}
          {isError ? (
            <ErrorState
              title={t("states.errorTitle")}
              description={t("states.errorDescription")}
              actionLabel={t("actions.retry")}
              onRetry={onRetry}
            />
          ) : null}
          {!isLoading && !isError && visibleResources.length === 0 ? (
            <EmptyState
              icon={BookOpenIcon}
              title={
                resources.length
                  ? t("states.noResultsTitle")
                  : t("states.emptyTitle")
              }
              description={
                resources.length
                  ? t("states.noResultsDescription")
                  : t("states.emptyDescription")
              }
            />
          ) : null}

          {!isLoading && !isError && visibleResources.length ? (
            <div
              className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
              data-tenant-content
            >
              {visibleResources.map((resource) => (
                <KnowledgeResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={setSelectedResource}
                  href={getResourceHref?.(resource) || ""}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <KnowledgeResourceViewer
        resource={selected}
        open={Boolean(selected)}
        onClose={() => setSelectedResource(null)}
      />
    </section>
  );
}
