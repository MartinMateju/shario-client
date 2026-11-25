"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { hasPermission, PERMISSIONS } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useGetPaymentRefundReviewsQuery,
  useResolvePaymentRefundReviewMutation,
} from "@/lib/features/tenant-payments/tenantPaymentsApiSlice";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { getOrderNumber } from "@/components/sales/sales.utils";

const INCOMPLETE_REASONS = new Set([
  "payment_binding_missing",
  "payment_snapshot_mismatch",
  "provider_snapshot_incomplete",
  "reconciliation_incomplete",
]);
const buttonStyle =
  "rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:opacity-50";
const errorCode = (error) => error?.data?.code ?? error?.data?.error?.code;

export default function RefundReviewPanel() {
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const t = useTranslations("RefundReviews");
  if (!hasPermission(access, PERMISSIONS.PAYMENTS_VIEW)) return null;
  if (access?.locationAccess?.mode !== "all") {
    return (
      <section className="rounded-[20px] border border-line bg-white p-5">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("allLocationsRequired")}</p>
      </section>
    );
  }
  return (
    <RefundReviewContent
      key={tenant?._id ?? tenant?.id ?? "current"}
      canResolve={hasPermission(access, PERMISSIONS.PAYMENTS_REFUND)}
    />
  );
}

function RefundReviewContent({ canResolve }) {
  const t = useTranslations("RefundReviews");
  const locale = useLocale();
  const [cursor, setCursor] = useState(null);
  const [editor, setEditor] = useState(null);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const submitting = useRef(false);
  const { currentData, isFetching, isError, refetch } =
    useGetPaymentRefundReviewsQuery(cursor, {
      refetchOnMountOrArgChange: true,
    });
  const [resolve, { isLoading: isSaving }] =
    useResolvePaymentRefundReviewMutation();
  const busy = isFetching || isSaving;
  const resetEditor = () => {
    setEditor(null);
    setNote("");
    setEvidence("");
    setConfirmed(false);
    setSaveError("");
  };
  const refresh = () => {
    resetEditor();
    void refetch();
  };
  const selectPage = (next) => {
    resetEditor();
    setNotice("");
    setCursor(next);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (
      !canResolve ||
      busy ||
      submitting.current ||
      !editor ||
      !confirmed ||
      note.trim().length < 10 ||
      evidence.trim().length < 10
    )
      return;
    submitting.current = true;
    setSaveError("");
    try {
      await resolve({
        id: editor.id,
        snapshotVersion: editor.snapshotVersion,
        note: note.trim(),
        evidence: evidence.trim(),
      }).unwrap();
      resetEditor();
      setNotice("saved");
    } catch (error) {
      if (
        error?.status === 409 ||
        errorCode(error) === "REFUND_REVIEW_CHANGED"
      ) {
        resetEditor();
        setNotice("changed");
        void refetch();
      } else {
        setSaveError(
          errorCode(error) === "REFUND_REVIEW_ALL_LOCATIONS_REQUIRED" ||
            error?.status === 403
            ? "permissionError"
            : "saveError",
        );
      }
    } finally {
      submitting.current = false;
    }
  };

  return (
    <section
      aria-label={t("title")}
      className="space-y-4 rounded-[20px] border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="mt-2 text-sm text-muted">{t("description")}</p>
        </div>
        <button
          type="button"
          className={buttonStyle}
          disabled={busy}
          onClick={refresh}
        >
          {t("refresh")}
        </button>
      </div>
      <p className="rounded-lg bg-sand-50 p-3 text-sm">{t("benefitsNotice")}</p>
      {notice ? (
        <p role="status" className="text-sm">
          {t(notice)}
        </p>
      ) : null}
      {isError ? <p role="alert">{t("loadError")}</p> : null}
      {isFetching && !currentData ? <p role="status">{t("loading")}</p> : null}
      {!isError && currentData?.reviews?.length === 0 ? (
        <p>{t("empty")}</p>
      ) : null}
      {!isError
        ? (currentData?.reviews ?? []).map((review) => {
            const incomplete =
              !review.refund || INCOMPLETE_REASONS.has(review.reviewReason);
            const editing = editor?.id === review.id && canResolve;
            return (
              <article
                key={review.id}
                className="space-y-3 rounded-xl border border-line p-4"
              >
                <h3 className="font-medium">
                  {t(incomplete ? "needsRepair" : "needsReview")}
                </h3>
                {review.customerName ? (
                  <p className="text-sm font-medium">{review.customerName}</p>
                ) : null}
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">{t("reference")}</dt>
                    <dd className="break-all font-mono text-xs">{review.id}</dd>
                  </div>
                  {review.orderId ? (
                    <div>
                      <dt className="text-muted">{t("order")}</dt>
                      <dd className="break-all">
                        {getOrderNumber({ id: review.orderId })}
                        <span className="mt-1 block font-mono text-xs text-muted">
                          {review.orderId}
                        </span>
                      </dd>
                    </div>
                  ) : null}
                  {review.membershipId ? (
                    <div>
                      <dt className="text-muted">{t("membership")}</dt>
                      <dd className="break-all">
                        {review.membershipName || review.membershipId}
                        {review.membershipName ? (
                          <span className="mt-1 block font-mono text-xs text-muted">
                            {review.membershipId}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  {[
                    ["paid", review.paidAmountMinor],
                    ["refunded", review.refund?.succeededAmountMinor],
                    ["pending", review.refund?.pendingAmountMinor],
                    ["failed", review.refund?.failedAmountMinor],
                  ].map(([label, amount]) => (
                    <div key={label}>
                      <dt className="text-muted">{t(label)}</dt>
                      <dd>
                        {amount == null || !review.currency
                          ? "—"
                          : formatMinorCurrencyAmount(
                              amount,
                              review.currency,
                              locale,
                            )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {incomplete ? (
                  <p className="text-sm">{t("repairNotice")}</p>
                ) : !canResolve ? (
                  <p className="text-sm">{t("readOnly")}</p>
                ) : null}
                {canResolve && !incomplete && !editing ? (
                  <button
                    type="button"
                    className={buttonStyle}
                    disabled={busy}
                    onClick={() => {
                      resetEditor();
                      setNotice("");
                      setEditor(review);
                    }}
                  >
                    {t("review")}
                  </button>
                ) : null}
                {editing ? (
                  <form
                    onSubmit={submit}
                    className="space-y-3 border-t border-line pt-3"
                  >
                    <label className="block text-sm">
                      {t("note")}
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        value={note}
                        disabled={busy}
                        onChange={(event) => setNote(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-line p-2"
                        rows={3}
                      />
                    </label>
                    <label className="block text-sm">
                      {t("evidence")}
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        value={evidence}
                        disabled={busy}
                        onChange={(event) => setEvidence(event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-line p-2"
                        rows={2}
                      />
                    </label>
                    <label className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        required
                        checked={confirmed}
                        disabled={busy}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      {t("confirm")}
                    </label>
                    {saveError ? <p role="alert">{t(saveError)}</p> : null}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className={buttonStyle}
                        disabled={
                          busy ||
                          !confirmed ||
                          note.trim().length < 10 ||
                          evidence.trim().length < 10
                        }
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        className={buttonStyle}
                        disabled={isSaving}
                        onClick={resetEditor}
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })
        : null}
      {cursor || currentData?.nextCursor ? (
        <nav aria-label={t("pagination")} className="flex gap-2">
          {cursor ? (
            <button
              type="button"
              className={buttonStyle}
              disabled={busy}
              onClick={() => selectPage(null)}
            >
              {t("firstPage")}
            </button>
          ) : null}
          {currentData?.nextCursor ? (
            <button
              type="button"
              className={buttonStyle}
              disabled={busy}
              onClick={() => selectPage(currentData.nextCursor)}
            >
              {t("nextPage")}
            </button>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
