"use client";

import { useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useTranslations } from "next-intl";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import { useRevokePromoCodeMutation } from "@/lib/features/coupons/couponsApiSlice";

// Mount a fresh dialog for each selected voucher. Keep its operation ID stable
// across network retries so an ambiguous response cannot repeat the operation.
export default function RevokeVoucherDialog({ coupon, onClose, onRevoked }) {
  const t = useTranslations("VoucherFoundation");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const operationId = useRef(null);
  const requestInFlight = useRef(false);
  const cancelRef = useRef(null);
  const [revokePromoCode] = useRevokePromoCodeMutation();

  const close = () => {
    if (!requestInFlight.current) onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!confirmed || !reason.trim() || requestInFlight.current) return;
    requestInFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      operationId.current ||= crypto.randomUUID();
      await revokePromoCode({
        couponId: coupon._id || coupon.id,
        reason: reason.trim(),
        operationId: operationId.current,
      }).unwrap();
    } catch (failure) {
      setError(failure?.data?.message || t("revoke.error"));
      return;
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
    onRevoked?.();
    onClose();
  };

  return (
    <Dialog
      open
      onClose={close}
      initialFocus={cancelRef}
      className="relative z-[110]"
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={t("revoke.title")}
            description={t("revoke.description", {
              code: coupon.promoCode || "—",
            })}
            onClose={close}
            closeLabel={t("cancel")}
            closeDisabled={submitting}
          />
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <WorkspaceDialogBody className="space-y-4">
              <div>
                <label
                  htmlFor="voucher-revocation-reason"
                  className="block text-sm font-medium"
                >
                  {t("revoke.reason")}
                </label>
                <textarea
                  id="voucher-revocation-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={submitting}
                  required
                  maxLength={500}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-line p-3 text-sm"
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={submitting}
                  className="mt-1 rounded border-line"
                />
                <span>{t("revoke.confirmation")}</span>
              </label>
              {error ? (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </WorkspaceDialogBody>
            <WorkspaceDialogFooter>
              <button
                ref={cancelRef}
                type="button"
                disabled={submitting}
                onClick={close}
                className={workspaceSecondaryButtonClass}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim() || !confirmed}
                className={workspacePrimaryButtonClass}
              >
                {submitting ? t("revoke.submitting") : t("revoke.action")}
              </button>
            </WorkspaceDialogFooter>
          </form>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
