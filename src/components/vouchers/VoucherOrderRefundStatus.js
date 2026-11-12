"use client";

import { useTranslations } from "next-intl";

export default function VoucherOrderRefundStatus({ order }) {
  const t = useTranslations("VoucherFoundation");
  if (order?.refundState === "manual_review") {
    return (
      <div className="my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="text-xs font-semibold">{t("status.review")}</p>
        {typeof order.refundReviewReason === "string" &&
        order.refundReviewReason ? (
          <p className="mt-1 max-w-sm break-words text-xs leading-5">
            {order.refundReviewReason}
          </p>
        ) : null}
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
