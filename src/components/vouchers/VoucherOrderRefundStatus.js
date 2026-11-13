"use client";

import { useTranslations } from "next-intl";

// These are legacy server diagnostic values, never display copy. New server
// reasons use the localized review instruction until a specific mapping exists.
const REVIEW_REASON_KEYS = new Map([
  [
    "A full purchase refund was requested in shario.io. Vouchers are held until the payment outcome is reconciled.",
    "pending",
  ],
  [
    "Refund failed or was canceled: reconcile the returned payment before restoring any voucher entitlement.",
    "failed",
  ],
  [
    "The payment provider reports that the refund failed or was canceled. Review the payment before restoring vouchers.",
    "failed",
  ],
  [
    "Partial purchase refund: select the affected voucher liability before reactivating codes.",
    "partial",
  ],
  [
    "Refunded purchase contains used or payment-reserved vouchers; reconcile without removing customer account credits.",
    "used",
  ],
  [
    "Payment arrived after the purchased voucher expiry. Review and refund or replace this purchase before delivery.",
    "expired",
  ],
]);

export default function VoucherOrderRefundStatus({ order }) {
  const t = useTranslations("VoucherFoundation");
  if (order?.refundState === "manual_review") {
    return (
      <div className="my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="text-xs font-semibold">{t("status.review")}</p>
        <p className="mt-1 max-w-sm break-words text-xs leading-5">
          {t(
            `refund.reviewReasons.${order.refundFailureReviewRequired ? "failed" : REVIEW_REASON_KEYS.get(order.refundReviewReason) || "unknown"}`,
          )}
        </p>
      </div>
    );
  }
  if (order?.refundState === "revoked") {
    return (
      <p className="my-2 inline-flex rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        {t("refund.revoked")}
      </p>
    );
  }
  return null;
}
