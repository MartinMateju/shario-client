"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import EmailTemplateModal from "@/components/modals/EmailTemplateModal";
import {
  WorkspaceEmptyState,
  WorkspaceStatusPill,
  WorkspaceTableFrame,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  getResourceId,
  normalizeContentVariants,
} from "@/components/communications/email/emailContent";
import {
  useDeleteEmailTemplateMutation,
  useGetEmailTemplatesQuery,
  useSetDefaultEmailTemplateMutation,
  useToggleEmailTemplateActiveMutation,
} from "@/lib/features/emailTemplates/emailTemplatesApiSlice";
const CATEGORIES = [
  "all",
  "booking",
  "membership",
  "registration",
  "password",
  "marketing",
  "general",
];
export default function EmailTemplatesTable({ canManage = false }) {
  const t = useTranslations("EmailAutomations.templates");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("all");
  const [feedback, setFeedback] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    template: null,
  });
  const { data, isLoading, isFetching, isError, refetch } =
    useGetEmailTemplatesQuery({
      search,
      category,
      active,
      type: "content",
    });
  const [deleteTemplate, { isLoading: isDeleting }] =
    useDeleteEmailTemplateMutation();
  const [toggleTemplate, { isLoading: isToggling }] =
    useToggleEmailTemplateActiveMutation();
  const [setDefaultTemplate, { isLoading: isSettingDefault }] =
    useSetDefaultEmailTemplateMutation();
  const templates = useMemo(
    () =>
      Array.isArray(data)
        ? data
        : (data?.templates ?? data?.items ?? data?.data?.templates ?? []),
    [data],
  );
  const closeModal = () =>
    setModal({
      open: false,
      mode: "create",
      template: null,
    });
  const openModal = (mode, template = null) =>
    setModal({
      open: true,
      mode,
      template,
    });
  const mutate = async (operation, fallback) => {
    setFeedback("");
    try {
      await operation();
    } catch (error) {
      setFeedback(getLocalizedApiErrorMessage(error, fallback));
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await mutate(
      () => deleteTemplate(getResourceId(pendingDelete)).unwrap(),
      t("errors.delete"),
    );
    setPendingDelete(null);
  };
  return (
    <>
      <section>
        <WorkspaceTableFrame className="overflow-hidden">
          <WorkspaceToolbar contained className="bg-sand-50/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="email-templates-heading"
                  className="text-[14px] font-semibold tracking-[-0.02em] text-ink"
                >
                  {t("title")}
                </h2>
                <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted">
                  {t("description")}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => openModal("create")}
                  className={workspacePrimaryButtonClass}
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("create")}
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px]">
              <label className="relative block">
                <span className="sr-only">{t("searchPlaceholder")}</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9188]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className={`${workspaceInputClass} pl-10`}
                />
              </label>
              <label>
                <span className="sr-only">{t("category")}</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={workspaceInputClass}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {t(`categories.${item}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">{t("statuses.all")}</span>
                <select
                  value={active}
                  onChange={(event) => setActive(event.target.value)}
                  className={workspaceInputClass}
                >
                  <option value="all">{t("statuses.all")}</option>
                  <option value="true">{t("statuses.active")}</option>
                  <option value="false">{t("statuses.inactive")}</option>
                </select>
              </label>
            </div>
          </WorkspaceToolbar>

          {feedback ? (
            <div
              role="alert"
              className="border-b border-danger/20 bg-danger-soft px-5 py-3 text-[13px] text-danger"
            >
              {feedback}
            </div>
          ) : null}
          {pendingDelete ? (
            <div
              role="alertdialog"
              aria-label={t("deleteConfirmTitle")}
              className="flex flex-col gap-3 border-b border-warning/25 bg-warning-soft px-5 py-4 text-[13px] text-warning sm:flex-row sm:items-center"
            >
              <span className="mr-auto">
                {t("deleteConfirm", {
                  name: pendingDelete.name,
                })}
              </span>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="font-semibold underline"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="min-h-11 rounded-full bg-danger px-4 font-semibold text-white disabled:opacity-50"
              >
                {isDeleting ? t("deleting") : t("delete")}
              </button>
            </div>
          ) : null}

          {isLoading || isFetching ? (
            <StateMessage>{t("loading")}</StateMessage>
          ) : null}
          {isError ? (
            <StateMessage tone="error">
              {t("error")}{" "}
              <button
                type="button"
                onClick={refetch}
                className="font-semibold underline"
              >
                {t("retry")}
              </button>
            </StateMessage>
          ) : null}
          {!isLoading && !isFetching && !isError && templates.length === 0 ? (
            <WorkspaceEmptyState contained title={t("empty")} />
          ) : null}

          {!isLoading && !isFetching && !isError && templates.length ? (
            <div
              role="list"
              aria-label={t("title")}
              className="grid gap-3 bg-canvas p-3 lg:block lg:divide-y lg:divide-line lg:bg-white lg:p-0"
            >
              {templates.map((template) => (
                <TemplateRow
                  key={getResourceId(template)}
                  template={template}
                  canManage={canManage}
                  busy={isToggling || isSettingDefault || isDeleting}
                  onPreview={() => openModal("preview", template)}
                  onEdit={() => openModal("edit", template)}
                  onDelete={() => setPendingDelete(template)}
                  onToggle={() =>
                    mutate(
                      () => toggleTemplate(getResourceId(template)).unwrap(),
                      t("errors.toggle"),
                    )
                  }
                  onDefault={() =>
                    mutate(
                      () =>
                        setDefaultTemplate(getResourceId(template)).unwrap(),
                      t("errors.default"),
                    )
                  }
                  t={t}
                />
              ))}
            </div>
          ) : null}
        </WorkspaceTableFrame>
      </section>

      {modal.open ? (
        <EmailTemplateModal
          key={`${modal.mode}-${getResourceId(modal.template) || "new"}`}
          open
          mode={modal.mode}
          template={modal.template}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}
function TemplateRow({
  template,
  canManage,
  busy,
  onPreview,
  onEdit,
  onDelete,
  onToggle,
  onDefault,
  t,
}) {
  const content = normalizeContentVariants(template);
  return (
    <article
      role="listitem"
      className="grid gap-4 rounded-[20px] border border-line bg-white px-4 py-5 shadow-xs sm:px-5 lg:grid-cols-[minmax(240px,1.4fr)_180px_180px_auto] lg:items-center lg:rounded-none lg:border-0 lg:bg-transparent lg:px-5 lg:shadow-none"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13px] font-semibold text-ink">
            {template.name}
          </h3>
          {template.isDefault ? (
            <WorkspaceStatusPill tone="info">
              {t("default")}
            </WorkspaceStatusPill>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[12px] text-ink-muted">
          {content.variants[content.defaultLocale]?.subject || t("noSubject")}
        </p>
        {template.description ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-ink-muted">
            {template.description}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
          {t("category")}
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">
          {t(
            `categories.${template.category === "layout" ? "general" : template.category || "general"}`,
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {["cs", "en"].map((locale) => {
          const variant = content.variants[locale];
          const complete = Boolean(
            variant?.subject && (variant.bodyText || variant.bodyHtml),
          );
          return (
            <WorkspaceStatusPill
              key={locale}
              tone={complete ? "success" : "warning"}
              className="uppercase"
            >
              {locale}
            </WorkspaceStatusPill>
          );
        })}
        <button
          type="button"
          onClick={onToggle}
          disabled={!canManage || busy}
          aria-pressed={Boolean(template.isActive)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold disabled:opacity-50 ${template.isActive ? "border-success/20 bg-success-soft text-success" : "border-line bg-sand-50 text-ink-muted"}`}
        >
          {template.isActive ? (
            <CheckCircleIcon className="h-4 w-4" />
          ) : (
            <XCircleIcon className="h-4 w-4" />
          )}
          {template.isActive ? t("statuses.active") : t("statuses.inactive")}
        </button>
      </div>
      <div className="flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:min-w-11">
        <IconButton label={t("preview")} onClick={onPreview}>
          <EyeIcon className="h-4 w-4" />
        </IconButton>
        {canManage ? (
          <>
            {!template.isDefault ? (
              <IconButton
                label={t("makeDefault")}
                onClick={onDefault}
                disabled={busy}
              >
                <StarIcon className="h-4 w-4" />
              </IconButton>
            ) : null}
            <IconButton label={t("edit")} onClick={onEdit}>
              <PencilSquareIcon className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("delete")} onClick={onDelete} danger>
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </>
        ) : null}
      </div>
    </article>
  );
}
function StateMessage({ children, tone = "neutral" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`px-5 py-14 text-center text-[13px] ${tone === "error" ? "text-danger" : "text-ink-muted"}`}
    >
      {children}
    </div>
  );
}
function IconButton({ children, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25 disabled:opacity-50 ${danger ? "border-danger/20 text-danger hover:bg-danger-soft" : "border-line text-ink-soft hover:border-line-strong hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
