"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Image from "next/image";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Link } from "@/i18n/navigation";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import {
  useGetCustomOrderQuery,
  useLazyGetCustomOrderHistoryQuery,
  useCommentCustomOrderMutation,
  useCloseCustomOrderMutation,
  useReopenCustomOrderMutation,
  useUploadCustomOrderAttachmentsMutation,
  useRemoveCustomOrderAttachmentMutation,
} from "@/lib/features/customOrders/customOrdersApiSlice";
import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import {
  formatOrderDate,
  orderError,
  validateOrderFiles,
} from "./customOrders.utils";
import {
  cardClass,
  inputClass,
  primaryClass,
  secondaryClass,
  OrderField,
  OrderLoading,
  OrderFeedback,
  OrderStatus,
} from "./CustomOrderShared";

function changeValue(field, value, t, locale) {
  if (value == null || value === "") return "—";
  if (["startDate", "deadline"].includes(field))
    return formatOrderDate(value, locale);
  if (field === "status" && ["active", "closed"].includes(value))
    return t(`statuses.${value}`);
  if (field === "closeReason" && ["completed", "cancelled"].includes(value))
    return t(`reasons.${value}`);
  if (typeof value === "object") return value.name || value.title || "—";
  return String(value);
}

export default function CustomOrderDetail({ id }) {
  const t = useTranslations("CustomOrders");
  const locale = useLocale();
  const search = useSearchParams();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const canManage = hasPermission(access, PERMISSIONS.ORDERS_MANAGE);
  const query = useGetCustomOrderQuery(id, {
    refetchOnFocus: true,
    pollingInterval: 240000,
    skipPollingIfUnfocused: true,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    search.get("saved") === "1" ? t("saved") : "",
  );
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState(null);
  const [commentOrder] = useCommentCustomOrderMutation();
  const [closeOrder] = useCloseCustomOrderMutation();
  const [reopenOrder] = useReopenCustomOrderMutation();
  const [upload] = useUploadCustomOrderAttachmentsMutation();
  const [remove] = useRemoveCustomOrderAttachmentMutation();
  const uploadRef = useRef(null);
  const feedbackRef = useRef(null);
  const item = query.data;
  const act = async (request, message) => {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await request().unwrap();
      await query.refetch();
      setSuccess(message);
      return true;
    } catch (failure) {
      setError(orderError(failure, t));
      return false;
    } finally {
      setPending(false);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  };
  const addComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) {
      setError(t("errors.comment"));
      feedbackRef.current?.focus();
      return;
    }
    if (
      await act(
        () =>
          commentOrder({ id, revision: item.revision, body: comment.trim() }),
        t("commentAdded"),
      )
    )
      setComment("");
  };
  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const failure = validateOrderFiles(files, item.attachments);
    if (failure) {
      setError(t(`errors.${failure}`));
      event.target.value = "";
      return;
    }
    const body = new FormData();
    body.append("revision", String(item.revision));
    files.forEach((file) => body.append("files", file));
    await act(() => upload({ id, body }), t("uploaded"));
    if (uploadRef.current) uploadRef.current.value = "";
  };
  if (query.isLoading) return <OrderLoading />;
  if (!item) return <OrderLoading error retry={query.refetch} />;
  const editable = item.status !== "closed" && canManage;
  const busy = pending || query.isFetching;
  const attachments = item.attachments || [];
  return (
    <div className="space-y-6">
      <Link
        href="/app/custom-orders"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-cobalt-600"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <WorkspaceSectionHeader
        eyebrow={item.reference}
        title={item.title}
        description={item.location?.name}
        actions={
          <>
            <OrderStatus item={item} />
            {editable ? (
              <Link
                href={`/app/custom-orders/${id}/edit`}
                className={secondaryClass}
              >
                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                {t("edit")}
              </Link>
            ) : null}
          </>
        }
      />
      <div ref={feedbackRef} tabIndex={-1}>
        <OrderFeedback error={error} success={success} />
        {error ? (
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={busy}
            className={`${secondaryClass} mt-3`}
          >
            {t("refresh")}
          </button>
        ) : null}
      </div>
      {item.status === "closed" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="font-semibold">
            {t("closedAs", {
              reason: t(`reasons.${item.closeReason || "completed"}`),
            })}
          </p>
          <p>{t("closedNotice")}</p>
        </div>
      ) : item.isOverdue ? (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <ClockIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            {t("overdueNotice", {
              deadline: formatOrderDate(item.deadline, locale),
            })}
          </p>
        </div>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className={`${cardClass} space-y-6`}>
            <h2 className="text-lg font-semibold text-ink">
              {t("specification")}
            </h2>
            {[
              ["description", item.description],
              ["materials", item.materials],
              ["finish", item.finish],
            ].map(([field, value]) => (
              <div key={field}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t(`fields.${field}`)}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                  {value || "—"}
                </p>
              </div>
            ))}
          </section>
          <section className={`${cardClass} space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">
                {t("attachments")}
              </h2>
              <span className="text-xs text-ink-muted">
                {t("imageCount", {
                  count: attachments.filter((file) => file.kind === "image")
                    .length,
                })}
              </span>
            </div>
            <p className="text-xs leading-5 text-ink-muted">
              {t("attachmentHint")}
            </p>
            {attachments.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {attachments.map((file) => (
                  <article
                    key={file.id}
                    className="min-w-0 overflow-hidden rounded-2xl border border-line"
                  >
                    {file.kind === "image" ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-sand-50 focus-visible:ring-2 focus-visible:ring-cobalt-500"
                      >
                        <Image
                          unoptimized
                          src={file.url}
                          width={400}
                          height={260}
                          alt={file.name}
                          className="aspect-[4/3] w-full object-contain"
                        />
                      </a>
                    ) : (
                      <div className="flex h-20 items-center justify-center bg-sand-50">
                        <DocumentTextIcon
                          className="h-8 w-8 text-cobalt-500"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <div className="space-y-3 p-3">
                      <p className="break-words text-sm font-medium text-ink">
                        {file.name}
                      </p>
                      <div className="flex flex-wrap justify-between gap-2">
                        <a
                          className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-cobalt-600 hover:underline"
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ArrowDownTrayIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          {t("openAttachment")}
                        </a>
                        {editable ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAction({
                                type: "remove",
                                file,
                                revision: item.revision,
                              })
                            }
                            disabled={busy}
                            className="min-h-10 text-xs font-medium text-red-700 hover:underline"
                            aria-label={t("removeNamed", { name: file.name })}
                          >
                            {t("remove")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-muted">
                {t("noAttachments")}
              </p>
            )}
            {editable ? (
              <>
                <input
                  ref={uploadRef}
                  className="sr-only"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={uploadFiles}
                  aria-label={t("upload")}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  className={secondaryClass}
                  disabled={busy}
                >
                  {t(pending ? "uploading" : "upload")}
                </button>
              </>
            ) : null}
          </section>
          <section className={`${cardClass} space-y-5`}>
            <h2 className="text-lg font-semibold text-ink">{t("progress")}</h2>
            {editable ? (
              <form
                onSubmit={addComment}
                className="space-y-3 rounded-2xl bg-sand-50 p-4"
              >
                <OrderField label={t("newComment")} required>
                  {(aria) => (
                    <textarea
                      {...aria}
                      rows={3}
                      maxLength={4000}
                      className={inputClass}
                      value={comment}
                      disabled={busy}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  )}
                </OrderField>
                <button
                  type="submit"
                  className={primaryClass}
                  disabled={busy || !comment.trim()}
                >
                  {t("addComment")}
                </button>
              </form>
            ) : null}
            <OrderHistory key={`${id}:${item.revision}`} item={item} />
          </section>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-6">
          <section className={`${cardClass} space-y-5`}>
            <h2 className="text-lg font-semibold text-ink">{t("summary")}</h2>
            <dl className="space-y-4 text-sm">
              {[
                ["pieceCount", t("pieces", { count: item.pieceCount })],
                ["startDate", formatOrderDate(item.startDate, locale)],
                ["deadline", formatOrderDate(item.deadline, locale)],
                ["assigneeId", item.assignee?.name || t("unassigned")],
                [
                  "quotedAmount",
                  item.quotedAmount == null
                    ? "—"
                    : new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: item.currency,
                      }).format(item.quotedAmount),
                ],
              ].map(([field, value]) => (
                <div
                  key={field}
                  className="flex justify-between gap-4 border-b border-line pb-3"
                >
                  <dt className="text-ink-muted">{t(`fields.${field}`)}</dt>
                  <dd className="break-words text-right font-medium text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-5 text-ink-muted">
              {t("financialNotice")}
            </p>
            {editable ? (
              <button
                type="button"
                className={`${primaryClass} w-full`}
                disabled={busy}
                onClick={() =>
                  setAction({ type: "close", revision: item.revision })
                }
              >
                {t("close")}
              </button>
            ) : canManage ? (
              <button
                type="button"
                className={`${secondaryClass} w-full`}
                disabled={busy}
                onClick={() =>
                  setAction({ type: "reopen", revision: item.revision })
                }
              >
                {t("reopen")}
              </button>
            ) : null}
          </section>
          <section className={`${cardClass} space-y-3`}>
            <h2 className="text-lg font-semibold text-ink">
              {t("fields.customer")}
            </h2>
            <p className="break-words font-medium text-ink">
              {item.customer?.name || "—"}
            </p>
            {item.customerId ? (
              <p className="text-xs text-emerald-700">{t("accountLinked")}</p>
            ) : null}
            {item.customer?.email ? (
              <p className="break-all text-sm text-ink-muted">
                {item.customer.email}
              </p>
            ) : null}
            {item.customer?.phone ? (
              <p className="break-words text-sm text-ink-muted">
                {item.customer.phone}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
      {action ? (
        <OrderActionDialog
          action={action}
          busy={busy}
          onCancel={() => setAction(null)}
          onConfirm={async (values) => {
            const request =
              action.type === "close"
                ? () => closeOrder({ id, revision: action.revision, ...values })
                : action.type === "reopen"
                  ? () =>
                      reopenOrder({ id, revision: action.revision, ...values })
                  : () =>
                      remove({
                        id,
                        attachmentId: action.file.id,
                        revision: action.revision,
                      });
            const done = await act(
              request,
              t(
                action.type === "close"
                  ? "closed"
                  : action.type === "reopen"
                    ? "reopened"
                    : "removed",
              ),
            );
            if (done) setAction(null);
            return done;
          }}
        />
      ) : null}
    </div>
  );
}

export function OrderActionDialog({ action, busy, onCancel, onConfirm }) {
  const t = useTranslations("CustomOrders");
  const [reason, setReason] = useState(
    action.type === "close" ? "completed" : "",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const title = t(
    action.type === "close"
      ? "close"
      : action.type === "reopen"
        ? "reopen"
        : "removeAttachment",
  );
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onCancel();
      }}
      className="relative z-[100]"
    >
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="w-full max-w-lg rounded-[24px] border border-line bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-ink">
                {title}
              </DialogTitle>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line"
                onClick={onCancel}
                disabled={busy}
                aria-label={t("cancel")}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              {t(
                action.type === "close"
                  ? "closeHint"
                  : action.type === "reopen"
                    ? "reopenHint"
                    : "removeHint",
              )}
            </p>
            {action.file ? (
              <p className="mt-3 break-words text-sm font-medium text-ink">
                {action.file.name}
              </p>
            ) : null}
            <form
              className="mt-5 space-y-4"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
                if (action.type === "reopen" && !reason.trim()) {
                  setError(t("errors.reason"));
                  return;
                }
                setError("");
                const done = await onConfirm(
                  action.type === "close"
                    ? { reason, note: note.trim() }
                    : { reason: reason.trim() },
                );
                if (!done) setError(t("errors.action"));
              }}
            >
              <OrderFeedback error={error} />
              {action.type === "close" ? (
                <>
                  <OrderField label={t("closeReason")} required>
                    {(aria) => (
                      <select
                        {...aria}
                        className={inputClass}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={busy}
                      >
                        <option value="completed">
                          {t("reasons.completed")}
                        </option>
                        <option value="cancelled">
                          {t("reasons.cancelled")}
                        </option>
                      </select>
                    )}
                  </OrderField>
                  <OrderField label={t("closingNote")}>
                    {(aria) => (
                      <textarea
                        {...aria}
                        rows={3}
                        maxLength={2000}
                        className={inputClass}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        disabled={busy}
                      />
                    )}
                  </OrderField>
                </>
              ) : action.type === "reopen" ? (
                <OrderField label={t("reopenReason")} required error={error}>
                  {(aria) => (
                    <textarea
                      {...aria}
                      rows={3}
                      maxLength={2000}
                      className={inputClass}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={busy}
                    />
                  )}
                </OrderField>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={busy}
                  onClick={onCancel}
                >
                  {t("cancel")}
                </button>
                <button type="submit" className={primaryClass} disabled={busy}>
                  {busy ? t("saving") : title}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export function OrderHistory({ item }) {
  const t = useTranslations("CustomOrders");
  const locale = useLocale();
  const [events, setEvents] = useState(item.history || []);
  const [pagination, setPagination] = useState(
    item.historyPagination || { page: 1, pages: 1 },
  );
  const [load, loadState] = useLazyGetCustomOrderHistoryQuery();
  const [error, setError] = useState("");
  const loadMore = async () => {
    setError("");
    try {
      const result = await load({
        id: item.id || item._id,
        page: pagination.page + 1,
      }).unwrap();
      setEvents((current) => [
        ...current,
        ...result.items.filter(
          (entry) => !current.some((existing) => existing.id === entry.id),
        ),
      ]);
      setPagination(result);
    } catch {
      setError(t("errors.history"));
    }
  };
  const history = [...events].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const fieldLabels = [
    "title",
    "description",
    "pieceCount",
    "materials",
    "finish",
    "startDate",
    "deadline",
    "locationId",
    "customerId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "customer",
    "assigneeId",
    "quotedAmount",
    "currency",
    "status",
    "closeReason",
    "name",
    "email",
    "phone",
    "attachments",
  ];

  return (
    <div className="space-y-4">
      <ol className="space-y-5">
        {history.map((entry) => (
          <li key={entry.id} className="border-l-2 border-cobalt-100 pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                {t.has(`actions.${entry.action}`)
                  ? t(`actions.${entry.action}`)
                  : t("actions.updated")}
              </h3>
              <time
                dateTime={entry.createdAt}
                className="text-xs text-ink-muted"
              >
                {formatOrderDate(entry.createdAt, locale, item.timeZone, true)}
              </time>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {entry.actorName || t("staff")}
            </p>
            {entry.body ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                {entry.body}
              </p>
            ) : null}
            {entry.changes?.length ? (
              <ul className="mt-3 space-y-2">
                {entry.changes.map((change, index) => (
                  <li
                    key={`${change.field}-${index}`}
                    className="break-words rounded-xl bg-sand-50 px-3 py-2 text-xs leading-5 text-ink-muted"
                  >
                    <span className="font-semibold text-ink">
                      {fieldLabels.includes(change.field)
                        ? t(`fields.${change.field}`)
                        : t("changedField")}
                      :{" "}
                    </span>
                    {changeValue(change.field, change.from, t, locale)}{" "}
                    <span aria-label={t("changedTo")}>→</span>{" "}
                    {changeValue(change.field, change.to, t, locale)}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      <OrderFeedback error={error} />
      {pagination.page < pagination.pages ? (
        <button
          type="button"
          className={secondaryClass}
          onClick={loadMore}
          disabled={loadState.isFetching}
        >
          {t(loadState.isFetching ? "loading" : "loadMoreHistory")}
        </button>
      ) : null}
    </div>
  );
}
