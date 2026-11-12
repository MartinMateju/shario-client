"use client";

import { useMemo, useState } from "react";
import {
  BookOpenIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import {
  useCreateCommunicationKnowledgeMutation,
  useDeleteCommunicationKnowledgeMutation,
  useGetCommunicationKnowledgeQuery,
  useUpdateCommunicationKnowledgeMutation,
} from "@/lib/features/communications/communicationsApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  StatusBanner,
} from "./CommunicationsPrimitives";
import {
  cx,
  extractMutationMessage,
  formatDateTime,
  getResourceId,
  unwrapCollection,
} from "./communications.utils";
const blankArticle = {
  title: "",
  category: "general",
  language: "en",
  audience: "staff",
  content: "",
  sourceUrl: "",
  tags: "",
  locationIds: [],
  effectiveFrom: "",
  effectiveUntil: "",
  status: "draft",
};
const knowledgeCategories = [
  "general",
  "locations",
  "opening_hours",
  "booking_policy",
  "courses",
  "pickup",
  "memberships",
  "payments",
  "faq",
];
const audienceOptions = ["staff", "customer", "public"];
const statusOptions = ["draft", "published", "archived"];
const normalizeArticleForm = (article) => ({
  ...blankArticle,
  ...(article ?? {}),
  sourceUrl: article?.sourceUrl ?? "",
  tags: Array.isArray(article?.tags)
    ? article.tags.join(", ")
    : String(article?.tags ?? ""),
  locationIds: Array.isArray(article?.locationIds)
    ? article.locationIds.map(String)
    : Array.isArray(article?.locations)
      ? article.locations.map(getLocationId).filter(Boolean)
      : [],
  effectiveFrom: article?.effectiveFrom
    ? String(article.effectiveFrom).slice(0, 16)
    : "",
  effectiveUntil: article?.effectiveUntil
    ? String(article.effectiveUntil).slice(0, 16)
    : "",
});
const getLocationName = (location) =>
  location?.name ??
  location?.title ??
  location?.slug ??
  getLocationId(location);
const getIndexStatus = (article) => {
  const value = String(
    article?.indexStatus ??
      article?.embeddingStatus ??
      (article?.status === "published" ? "ready" : "not_indexed"),
  ).toLowerCase();
  if (["ready", "indexed", "completed"].includes(value)) return "ready";
  if (["pending", "processing", "queued"].includes(value)) return "processing";
  if (["failed", "error"].includes(value)) return "failed";
  return "not_indexed";
};
function ArticleDialog({ open, onClose, article, locations, canPublish, t }) {
  const [form, setForm] = useState(() => normalizeArticleForm(article));
  const [feedback, setFeedback] = useState(null);
  const [createArticle, { isLoading: isCreating }] =
    useCreateCommunicationKnowledgeMutation();
  const [updateArticle, { isLoading: isUpdating }] =
    useUpdateCommunicationKnowledgeMutation();
  const update = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };
  const toggleLocation = (locationId) => {
    setForm((current) => ({
      ...current,
      locationIds: current.locationIds.includes(locationId)
        ? current.locationIds.filter((id) => id !== locationId)
        : [...current.locationIds, locationId],
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const id = getResourceId(article);
    const payload = {
      title: form.title.trim(),
      category: form.category,
      language: form.language,
      audience: form.audience,
      content: form.content.trim(),
      sourceUrl: form.sourceUrl.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      locationIds: form.locationIds,
      effectiveFrom: form.effectiveFrom
        ? new Date(form.effectiveFrom).toISOString()
        : null,
      effectiveUntil: form.effectiveUntil
        ? new Date(form.effectiveUntil).toISOString()
        : null,
      status: form.status,
    };
    try {
      if (id) {
        await updateArticle({
          id,
          ...payload,
        }).unwrap();
      } else {
        await createArticle(payload).unwrap();
      }
      onClose();
    } catch (error) {
      setFeedback(extractMutationMessage(error, t("feedback.knowledgeError")));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={article ? t("knowledge.editTitle") : t("knowledge.createTitle")}
      description={t("knowledge.dialogDescription")}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        {feedback ? <StatusBanner tone="error">{feedback}</StatusBanner> : null}
        <label className="block text-xs font-medium text-ink-muted">
          {t("knowledge.fields.title")}
          <input
            value={form.title}
            onChange={update("title")}
            required
            className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm text-ink focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.category")}
            <select
              value={form.category}
              onChange={update("category")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            >
              {knowledgeCategories.map((category) => (
                <option key={category} value={category}>
                  {t(`knowledge.categories.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.language")}
            <select
              value={form.language}
              onChange={update("language")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            >
              <option value="en">English</option>
              <option value="cs">Čeština</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.audience")}
            <select
              value={form.audience}
              onChange={update("audience")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            >
              {audienceOptions.map((audience) => (
                <option key={audience} value={audience}>
                  {t(`knowledge.audiences.${audience}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.status")}
            <select
              value={form.status}
              onChange={update("status")}
              disabled={!canPublish && form.status === "published"}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm disabled:opacity-60"
            >
              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "published" && !canPublish}
                >
                  {t(`knowledge.statuses.${status}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium text-ink-muted">
          {t("knowledge.fields.content")}
          <textarea
            value={form.content}
            onChange={update("content")}
            required
            rows={9}
            placeholder={t("knowledge.contentPlaceholder")}
            className="mt-1.5 w-full rounded-[18px] border-line bg-white text-sm leading-6 focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.sourceUrl")}
            <input
              type="url"
              value={form.sourceUrl}
              onChange={update("sourceUrl")}
              placeholder="https://"
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.tags")}
            <input
              value={form.tags}
              onChange={update("tags")}
              placeholder={t("knowledge.tagsPlaceholder")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.effectiveFrom")}
            <input
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={update("effectiveFrom")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("knowledge.fields.effectiveUntil")}
            <input
              type="datetime-local"
              value={form.effectiveUntil}
              min={form.effectiveFrom || undefined}
              onChange={update("effectiveUntil")}
              className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm"
            />
          </label>
        </div>

        {locations.length ? (
          <fieldset>
            <legend className="text-xs font-medium text-ink-muted">
              {t("knowledge.fields.locations")}
            </legend>
            <p className="mt-1 text-[11px] text-ink-subtle">
              {t("knowledge.locationsHint")}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {locations.map((location) => {
                const id = getLocationId(location);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-xs text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={form.locationIds.includes(id)}
                      onChange={() => toggleLocation(id)}
                      className="rounded border-line text-cobalt-500 focus:ring-cobalt-200"
                    />
                    {getLocationName(location)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-xs font-semibold text-ink"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="rounded-full bg-cobalt-500 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isCreating || isUpdating ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function KnowledgeBaseView({
  canManage,
  canPublish = false,
  locale,
}) {
  const t = useTranslations("Communications");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const locationsQuery = useGetLocationsQuery({
    isActive: true,
    limit: 100,
  });
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );
  const { data, isLoading, isError, refetch } =
    useGetCommunicationKnowledgeQuery({
      ...(search.trim()
        ? {
            search: search.trim(),
          }
        : {}),
      ...(category !== "all"
        ? {
            category,
          }
        : {}),
      ...(status !== "all"
        ? {
            status,
          }
        : {}),
      ...(audience !== "all"
        ? {
            audience,
          }
        : {}),
      limit: 100,
    });
  const [deleteArticle] = useDeleteCommunicationKnowledgeMutation();
  const articles = unwrapCollection(data, "knowledge");
  const stats = useMemo(
    () => ({
      published: articles.filter((article) => article.status === "published")
        .length,
      indexed: articles.filter((article) => getIndexStatus(article) === "ready")
        .length,
    }),
    [articles],
  );
  const remove = async (article) => {
    if (
      !window.confirm(
        t("knowledge.deleteConfirm", {
          title: article.title,
        }),
      )
    )
      return;
    await deleteArticle(getResourceId(article));
  };
  return (
    <section className="rounded-[26px] border border-line bg-white shadow-card">
      <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-cobalt-600" />
            <h2 className="text-base font-semibold text-ink">
              {t("knowledge.title")}
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
            {t("knowledge.description")}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cobalt-500 px-4 py-2.5 text-xs font-semibold text-white shadow-cobalt"
          >
            <PlusIcon className="h-4 w-4" />
            {t("knowledge.add")}
          </button>
        ) : null}
      </header>

      <div className="grid gap-3 border-b border-line bg-sand-50/65 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center sm:p-5">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("knowledge.searchPlaceholder")}
            className="h-10 w-full rounded-full border-line bg-white py-2 pl-9 pr-3 text-xs"
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-10 rounded-full border-line bg-white text-xs"
        >
          <option value="all">{t("knowledge.allCategories")}</option>
          {knowledgeCategories.map((item) => (
            <option key={item} value={item}>
              {t(`knowledge.categories.${item}`)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-full border-line bg-white text-xs"
        >
          <option value="all">{t("knowledge.allStatuses")}</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {t(`knowledge.statuses.${item}`)}
            </option>
          ))}
        </select>
        <select
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          className="h-10 rounded-full border-line bg-white text-xs"
        >
          <option value="all">{t("knowledge.allAudiences")}</option>
          {audienceOptions.map((item) => (
            <option key={item} value={item}>
              {t(`knowledge.audiences.${item}`)}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>
            {t("knowledge.activeCount", {
              count: stats.published,
            })}
          </span>
          <span className="h-4 w-px bg-line" />
          <span>
            {t("knowledge.aiCount", {
              count: stats.indexed,
            })}
          </span>
        </div>
      </div>

      {isLoading ? <LoadingState label={t("loading.knowledge")} /> : null}
      {isError ? (
        <ErrorState
          title={t("errors.knowledgeTitle")}
          description={t("errors.knowledgeDescription")}
          actionLabel={t("actions.retry")}
          onRetry={refetch}
        />
      ) : null}
      {!isLoading && !isError && articles.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title={t("empty.knowledgeTitle")}
          description={t("empty.knowledgeDescription")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="rounded-full bg-cobalt-500 px-4 py-2 text-xs font-semibold text-white"
              >
                {t("knowledge.add")}
              </button>
            ) : null
          }
        />
      ) : null}

      {!isLoading && !isError && articles.length ? (
        <div className="divide-y divide-line">
          {articles.map((article) => {
            const indexStatus = getIndexStatus(article);
            const isIndexed = indexStatus === "ready";
            return (
              <article
                key={getResourceId(article)}
                className="flex flex-col gap-4 p-5 transition hover:bg-sand-50/50 sm:flex-row sm:items-start sm:justify-between sm:p-6"
              >
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {article.title}
                    </h3>
                    <span
                      className={cx(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        article.status === "published"
                          ? "bg-success-soft text-success"
                          : "bg-surface-muted text-ink-muted",
                      )}
                    >
                      {t(`knowledge.statuses.${article.status ?? "draft"}`)}
                    </span>
                    <span className="rounded-full bg-coral-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-terracotta-700">
                      {t(`knowledge.audiences.${article.audience ?? "staff"}`)}
                    </span>
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        isIndexed
                          ? "bg-cobalt-50 text-cobalt-700"
                          : "bg-warning-soft text-warning",
                      )}
                    >
                      {isIndexed ? (
                        <CheckBadgeIcon className="h-3 w-3" />
                      ) : null}
                      {t(`knowledge.indexStatuses.${indexStatus}`)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                    {article.content ?? article.body ?? article.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.09em] text-ink-subtle">
                    <span>
                      {t(
                        `knowledge.categories.${article.category ?? "general"}`,
                      )}
                    </span>
                    <span>
                      {String(article.language ?? "all").toUpperCase()}
                    </span>
                    <span>
                      {formatDateTime(
                        article.updatedAt ?? article.createdAt,
                        locale,
                      )}
                    </span>
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-2">
                    {article.status !== "published" || canPublish ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(article);
                          setDialogOpen(true);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted hover:text-cobalt-700"
                        aria-label={t("actions.edit")}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(article)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted hover:text-danger"
                      aria-label={t("actions.delete")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {dialogOpen ? (
        <ArticleDialog
          key={getResourceId(editing) || "new"}
          open
          onClose={() => setDialogOpen(false)}
          article={editing}
          locations={locations}
          canPublish={canPublish}
          t={t}
        />
      ) : null}
    </section>
  );
}
