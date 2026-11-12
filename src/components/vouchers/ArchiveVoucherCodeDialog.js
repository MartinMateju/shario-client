"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmationModal from "@/components/modals/ConformationModal";
import {
  useArchivePromoCodeMutation,
  useRestorePromoCodeMutation,
} from "@/lib/features/coupons/couponsApiSlice";

export default function ArchiveVoucherCodeDialog({
  coupon,
  onClose,
  onUpdated,
}) {
  const t = useTranslations("VoucherFoundation");
  const restoring = Boolean(coupon.archivedAt);
  const [archive] = useArchivePromoCodeMutation();
  const [restore] = useRestorePromoCodeMutation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const operationId = useRef(null);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      operationId.current ||= crypto.randomUUID();
      await (restoring ? restore : archive)({
        couponId: coupon._id,
        operationId: operationId.current,
      }).unwrap();
    } catch (failure) {
      setError(failure?.data?.message || t("codes.archiveError"));
      return;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
    onUpdated();
    onClose();
  };

  return (
    <ConfirmationModal
      show
      title={t(restoring ? "codes.restoreTitle" : "codes.archiveTitle")}
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
      onConfirm={submit}
      confirmText={t(restoring ? "codes.restore" : "codes.archive")}
      cancelText={t("cancel")}
      isLoading={submitting}
      message={
        <div className="space-y-3 text-left">
          <p className="break-all font-semibold text-ink">{coupon.promoCode}</p>
          <p>
            {t(
              restoring
                ? "codes.restoreDescription"
                : "codes.archiveDescription",
            )}
          </p>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
        </div>
      }
    />
  );
}
