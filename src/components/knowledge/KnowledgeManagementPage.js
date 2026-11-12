"use client";

import { useMemo, useState } from "react";
import {
  BookOpenIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBanner,
} from "@/components/communications/CommunicationsPrimitives";
import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import {
  WorkspaceCard,
  WorkspaceTableFrame,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  getEntityId,
  getPlanVersion,
  normalizePlans,
} from "@/components/memberships/membership.utils";
import {
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import {
  useDeleteKnowledgeResourceMutation,
  useGetKnowledgeResourcesQuery,
} from "@/lib/features/knowledge/knowledgeApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { useGetMembershipPlansQuery } from "@/lib/features/memberships/membershipsApiSlice";
import { useGetCourseProductsQuery } from "@/lib/features/products/productsApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import KnowledgeCoverageWarnings from "./KnowledgeCoverageWarnings";
import KnowledgeResourceDialog from "./KnowledgeResourceDialog";
import KnowledgeResourceViewer from "./KnowledgeResourceViewer";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_AI_READINESS,
  KNOWLEDGE_RESOURCE_TYPES,
  cx,
  findKnowledgeResourceById,
  getKnowledgeAiReadiness,
  getKnowledgeId,
  isKnowledgeResourceId,
  isKnowledgeResourceVisible,
} from "./knowledge.utils";

const getLocalizedName = (value, locale, fallback) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const preferred =
      locale === "cs" ? (value.CZ ?? value.cs) : (value.EN ?? value.en);
    return String(preferred ?? value.EN ?? value.CZ ?? fallback).trim();
  }
  return fallback;
};

const formatDate = (value, locale) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

function Metric({ icon: Icon, label, value, tone = "cobalt" }) {
  const tones = {
    cobalt: "bg-cobalt-50 text-cobalt-700",
    coral: "bg-coral-50 text-terracotta-700",
    sand: "bg-sand-100 text-sand-800",
    success: "bg-success-soft text-success",
  };

  return (
    <WorkspaceCard className="rounded-[18px] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "inline-flex h-9 w-9 items-center justify-center rounded-full",
            tones[tone],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-xl font-semibold tracking-[-0.03em] text-ink">
            {value}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {label}
          </p>
        </div>
      </div>
    </WorkspaceCard>
  );
}

function AiReadinessBadge({ resource, t }) {
  const readiness = getKnowledgeAiReadiness(resource);
  const tones = {
    [KNOWLEDGE_AI_READINESS.READY]: "bg-success-soft text-success",
    [KNOWLEDGE_AI_READINESS.INDEXING]: "bg-cobalt-50 text-cobalt-700",
    [KNOWLEDGE_AI_READINESS.NEEDS_ATTENTION]: "bg-coral-50 text-terracotta-700",
    [KNOWLEDGE_AI_READINESS.NOT_USED]: "bg-surface-muted text-ink-muted",
  };

  return (
    <span
      className={cx(
        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]",
        tones[readiness],
      )}
    >
      {t(`management.readiness.${readiness}`)}
    </span>
  );
}

export default function KnowledgeManagementPage({ showPageHeader = true }) {
  const t = useTranslations("KnowledgeHub");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const locationId = useSelector(selectActiveStudioId);
  const aiAccess = useAiAccess({ feature: "knowledgeBase" });
  const canUseAi = aiAccess.canUseAssistant === true;
  const canInspectKnowledgeCoverage = aiAccess.canReadCached === true;
  const canManage = hasPermission(
    workspaceAccess,
    PERMISSIONS.KNOWLEDGE_MANAGE,
  );
  const canPublish = hasPermission(
    workspaceAccess,
    PERMISSIONS.KNOWLEDGE_PUBLISH,
  );
  const canViewLocations = hasPermission(
    workspaceAccess,
    PERMISSIONS.LOCATIONS_VIEW,
  );
  const canViewMemberships = hasPermission(
    workspaceAccess,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const canViewProducts =
    hasPermission(workspaceAccess, PERMISSIONS.PRODUCTS_VIEW) ||
    hasPermission(workspaceAccess, PERMISSIONS.COURSES_VIEW);

  const resourcesQuery = useGetKnowledgeResourcesQuery(
    { limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const locationsQuery = useGetLocationsQuery(
    { isActive: true, limit: 100 },
    { skip: !canManage || !canViewLocations },
  );
  const membershipsQuery = useGetMembershipPlansQuery(
    { includeInactive: false, limit: 100 },
    { skip: !canManage || !canViewMemberships },
  );
  const coursesQuery = useGetCourseProductsQuery(undefined, {
    skip: !canManage || !canViewProducts,
  });

  const [deleteResource, deleteState] = useDeleteKnowledgeResourceMutation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState(undefined);
  const [feedback, setFeedback] = useState("");

  const resources = useMemo(
    () => resourcesQuery.data || [],
    [resourcesQuery.data],
  );
  const deepLinkedResourceId = searchParams?.get("resource") || "";
  const selectedResourceId =
    viewingId === undefined
      ? isKnowledgeResourceId(deepLinkedResourceId)
        ? deepLinkedResourceId
        : ""
      : viewingId;
  const viewing = useMemo(
    () => findKnowledgeResourceById(resources, selectedResourceId),
    [resources, selectedResourceId],
  );
  const visibleResources = useMemo(
    () =>
      resources.filter(
        (resource) =>
          isKnowledgeResourceVisible(resource, { query, category, type }) &&
          (status === "all" || resource.status === status),
      ),
    [category, query, resources, status, type],
  );
  const locations = useMemo(
    () =>
      normalizeLocationsResponse(locationsQuery.data).map((location) => ({
        id: getLocationId(location),
        label: location.name || location.slug || getLocationId(location),
      })),
    [locationsQuery.data],
  );
  const membershipOptions = useMemo(
    () =>
      normalizePlans(membershipsQuery.data)
        .map((plan) => {
          const id = getEntityId(plan);
          const version = getPlanVersion(plan);
          return {
            id,
            label: getLocalizedName(version?.name ?? plan?.name, locale, id),
          };
        })
        .filter((item) => item.id),
    [locale, membershipsQuery.data],
  );
  const courseOptions = useMemo(
    () =>
      (Array.isArray(coursesQuery.data) ? coursesQuery.data : [])
        .map((course) => ({
          id: getProductId(course),
          label: getProductName(course, locale),
        }))
        .filter((item) => item.id),
    [coursesQuery.data, locale],
  );
  const stats = useMemo(() => {
    const result = {
      ready: 0,
      indexing: 0,
      needs_attention: 0,
      not_used: 0,
    };

    resources.forEach((resource) => {
      result[getKnowledgeAiReadiness(resource)] += 1;
    });

    return result;
  }, [resources]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (resource) => {
    setEditing(resource);
    setDialogOpen(true);
  };

  const remove = async (resource) => {
    if (
      !window.confirm(t("management.deleteConfirm", { title: resource.title }))
    ) {
      return;
    }

    setFeedback("");
    try {
      await deleteResource(getKnowledgeId(resource)).unwrap();
      setFeedback(t("management.deleted"));
    } catch (error) {
      setFeedback(
        error?.data?.message || error?.error || t("management.deleteError"),
      );
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1800px]">
      <WorkspaceSectionHeader
        showTitle={showPageHeader}
        eyebrow={t("eyebrow")}
        title={t("management.title")}
        description={t("management.description")}
        actions={
          canUseAi || canManage ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canUseAi ? (
                <Link
                  href="/app/ai?intent=ask-knowledge"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-white px-5 py-2.5 text-xs font-semibold text-cobalt-700 transition hover:bg-cobalt-50"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {t("actions.askAi")}
                </Link>
              ) : null}
              {canManage ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 py-2.5 text-xs font-semibold text-white shadow-cobalt"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("actions.addResource")}
                </button>
              ) : null}
            </div>
          ) : null
        }
        className="mb-6"
      />

      {feedback ? (
        <div className="mb-4">
          <StatusBanner
            tone={feedback === t("management.deleted") ? "success" : "error"}
          >
            {feedback}
          </StatusBanner>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CheckBadgeIcon}
          label={t("management.metrics.ready")}
          value={stats.ready}
          tone="success"
        />
        <Metric
          icon={SparklesIcon}
          label={t("management.metrics.indexing")}
          value={stats.indexing}
        />
        <Metric
          icon={ExclamationTriangleIcon}
          label={t("management.metrics.needsAttention")}
          value={stats.needs_attention}
          tone="coral"
        />
        <Metric
          icon={NoSymbolIcon}
          label={t("management.metrics.notUsed")}
          value={stats.not_used}
          tone="sand"
        />
      </div>

      {canInspectKnowledgeCoverage ? (
        <KnowledgeCoverageWarnings
          enabled
          cacheScope={aiAccess.cacheScope}
          locationId={locationId || undefined}
          canManage={canManage}
          onAddSource={openCreate}
        />
      ) : null}

      <WorkspaceTableFrame className="mt-5 overflow-hidden rounded-[24px]">
        <WorkspaceToolbar
          contained
          className="grid gap-3 bg-sand-50/65 [&>*+*]:!mt-0 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]"
        >
          <label className="relative block">
            <span className="sr-only">{t("filters.search")}</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="h-10 w-full rounded-full border-line bg-white py-2 pl-10 pr-4 text-xs"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("filters.category")}
            className="h-10 rounded-full border-line bg-white text-xs"
          >
            <option value="all">{t("filters.allCategories")}</option>
            {KNOWLEDGE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {t(`categories.${item}`)}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label={t("filters.type")}
            className="h-10 rounded-full border-line bg-white text-xs"
          >
            <option value="all">{t("filters.allTypes")}</option>
            {KNOWLEDGE_RESOURCE_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`types.${item}`)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={t("filters.status")}
            className="h-10 rounded-full border-line bg-white text-xs"
          >
            <option value="all">{t("filters.allStatuses")}</option>
            {["draft", "published", "archived"].map((item) => (
              <option key={item} value={item}>
                {t(`statuses.${item}`)}
              </option>
            ))}
          </select>
        </WorkspaceToolbar>

        {resourcesQuery.isLoading ? (
          <LoadingState label={t("states.loadingManagement")} />
        ) : null}
        {resourcesQuery.isError ? (
          <ErrorState
            title={t("states.errorTitle")}
            description={t("states.errorDescription")}
            actionLabel={t("actions.retry")}
            onRetry={resourcesQuery.refetch}
          />
        ) : null}
        {!resourcesQuery.isLoading &&
        !resourcesQuery.isError &&
        visibleResources.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title={
              resources.length
                ? t("states.noResultsTitle")
                : t("states.emptyManagementTitle")
            }
            description={
              resources.length
                ? t("states.noResultsDescription")
                : t("states.emptyManagementDescription")
            }
            action={
              canManage && !resources.length ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-full bg-cobalt-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  {t("actions.addResource")}
                </button>
              ) : null
            }
          />
        ) : null}

        {!resourcesQuery.isLoading &&
        !resourcesQuery.isError &&
        visibleResources.length ? (
          <div className="divide-y divide-line">
            {visibleResources.map((resource) => (
              <article
                key={getKnowledgeId(resource)}
                className="flex flex-col gap-4 p-5 transition hover:bg-sand-50/45 lg:flex-row lg:items-start lg:justify-between sm:p-6"
              >
                <div className="min-w-0 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">
                      {resource.title}
                    </h2>
                    <span
                      className={cx(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]",
                        resource.status === "published"
                          ? "bg-success-soft text-success"
                          : "bg-surface-muted text-ink-muted",
                      )}
                    >
                      {t(`statuses.${resource.status || "draft"}`)}
                    </span>
                    <span className="rounded-full bg-cobalt-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-cobalt-700">
                      {t(`types.${resource.type}`)}
                    </span>
                    <span className="rounded-full bg-coral-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-terracotta-700">
                      {t(`audiences.${resource.audience || "customer"}`)}
                    </span>
                    {resource.featured ? (
                      <StarIcon className="h-4 w-4 text-terracotta-600" />
                    ) : null}
                    {resource.aiEnabled !== false ? (
                      <SparklesIcon className="h-4 w-4 text-cobalt-600" />
                    ) : null}
                    <AiReadinessBadge resource={resource} t={t} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                    {resource.summary ||
                      resource.content ||
                      t("card.noSummary")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.09em] text-ink-subtle">
                    <span>
                      {t(`categories.${resource.category || "general"}`)}
                    </span>
                    <span>
                      {String(resource.language || "all").toUpperCase()}
                    </span>
                    <span>
                      {formatDate(
                        resource.updatedAt || resource.createdAt,
                        locale,
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingId(getKnowledgeId(resource))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted hover:text-cobalt-700"
                    aria-label={t("actions.preview")}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {canUseAi &&
                  isKnowledgeResourceId(getKnowledgeId(resource)) &&
                  getKnowledgeAiReadiness(resource) !==
                    KNOWLEDGE_AI_READINESS.NOT_USED ? (
                    <Link
                      href={`/app/ai?intent=test-knowledge&sourceId=${encodeURIComponent(
                        getKnowledgeId(resource),
                      )}`}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-cobalt-200 px-3 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {t("actions.testInAi")}
                    </Link>
                  ) : null}
                  {canManage &&
                  (resource.status !== "published" || canPublish) ? (
                    <button
                      type="button"
                      onClick={() => openEdit(resource)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted hover:text-cobalt-700"
                      aria-label={t("actions.edit")}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => remove(resource)}
                      disabled={deleteState.isLoading}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted hover:text-danger disabled:opacity-50"
                      aria-label={t("actions.delete")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </WorkspaceTableFrame>

      {dialogOpen ? (
        <KnowledgeResourceDialog
          key={getKnowledgeId(editing) || "new"}
          open
          onClose={() => setDialogOpen(false)}
          resource={editing}
          canPublish={canPublish}
          locations={locations}
          membershipOptions={membershipOptions}
          courseOptions={courseOptions}
        />
      ) : null}

      <KnowledgeResourceViewer
        resource={viewing}
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
      />
    </section>
  );
}
