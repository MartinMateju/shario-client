"use client";

import { useState } from "react";
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
  workspaceInputClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  useDeleteProductMutation,
  useGetProductDeletionPolicyQuery,
  useUpdateProductMutation,
} from "@/lib/features/products/productsApiSlice";
import {
  getProductId,
  getProductName,
  isProductActive,
} from "@/components/products/products.utils";

export const PERPETUAL_VOUCHER_DELETE_CONFIRMATION =
  "I agree and I confirm that it can be deleted";

export default function VoucherDeleteDialog({
  product,
  locale,
  onClose,
  onSaved,
}) {
  const t = useTranslations("VoucherFoundation");
  const productId = getProductId(product);
  const policyQuery = useGetProductDeletionPolicyQuery(productId, {
    refetchOnMountOrArgChange: true,
  });
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateProduct, { isLoading: isArchiving }] =
    useUpdateProductMutation();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const busy = isDeleting || isArchiving;
  const policy = policyQuery.data;
  const checking = policyQuery.isLoading || policyQuery.isFetching;
  const requiredText =
    policy?.confirmationText || PERPETUAL_VOUCHER_DELETE_CONFIRMATION;
  const blocked = ["unexpired_codes", "pending_orders"].includes(
    policy?.reason,
  );
  const canDelete = Boolean(
    !checking &&
    !policyQuery.isError &&
    !blocked &&
    policy &&
    (policy.canDelete || policy.requiresConfirmation) &&
    (!policy.requiresConfirmation || confirmation === requiredText),
  );

  const save = async (action) => {
    if (busy || (action === "delete" && !canDelete)) return;
    setError("");
    try {
      if (action === "delete") {
        await deleteProduct({
          id: productId,
          ...(policy.requiresConfirmation
            ? { deleteConfirmation: confirmation }
            : {}),
        }).unwrap();
      } else {
        await updateProduct({ id: productId, isActive: false }).unwrap();
      }
      onSaved(t(action === "delete" ? "delete.deleted" : "delete.archived"));
    } catch (requestError) {
      setError(requestError?.data?.message || t("delete.error"));
      // Codes or orders can change after this dialog opens. Re-read the policy
      // after a rejected write while retaining the typed text and server error.
      policyQuery.refetch();
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      className="relative z-[110]"
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact" aria-busy={busy}>
          <WorkspaceDialogHeader
            title={t("delete.title")}
            description={getProductName(product, locale)}
            onClose={onClose}
            closeDisabled={busy}
            closeLabel={t("cancel")}
          />
          <WorkspaceDialogBody>
            <div className="space-y-4 text-sm leading-6 text-ink-muted">
              {checking ? (
                <p role="status">{t("delete.checking")}</p>
              ) : policyQuery.isError ? (
                <div role="alert">
                  <p>{t("delete.loadError")}</p>
                  <button
                    type="button"
                    onClick={policyQuery.refetch}
                    className="mt-2 underline"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : (
                <>
                  <p>{t("delete.preserve")}</p>
                  {policy?.reason === "unexpired_codes" && (
                    <p className="rounded-xl bg-amber-50 p-3 text-amber-950">
                      {t("delete.unexpired", {
                        count: policy.unexpiredCodeCount,
                      })}
                    </p>
                  )}
                  {policy?.reason === "pending_orders" && (
                    <p className="rounded-xl bg-amber-50 p-3 text-amber-950">
                      {t("delete.pending")}
                    </p>
                  )}
                  {policy?.requiresConfirmation && !blocked && (
                    <label className="block">
                      <span>
                        {t("delete.perpetual", {
                          count: policy.perpetualCodeCount,
                        })}
                      </span>
                      <span className="mt-3 block font-semibold text-ink">
                        {t("delete.typeConfirmation")}
                      </span>
                      <span className="mt-1 block select-text break-words">
                        {requiredText}
                      </span>
                      <input
                        aria-label={t("delete.typeConfirmation")}
                        value={confirmation}
                        onChange={(event) =>
                          setConfirmation(event.target.value)
                        }
                        disabled={busy}
                        autoComplete="off"
                        spellCheck={false}
                        className={workspaceInputClass}
                      />
                    </label>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="text-terracotta-700">
                  {error}
                </p>
              )}
            </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={workspaceSecondaryButtonClass}
            >
              {t("cancel")}
            </button>
            {isProductActive(product) && (
              <button
                type="button"
                onClick={() => save("archive")}
                disabled={busy}
                className={workspaceSecondaryButtonClass}
              >
                {isArchiving ? t("saving") : t("delete.archive")}
              </button>
            )}
            <button
              type="button"
              onClick={() => save("delete")}
              disabled={busy || !canDelete}
              className={workspacePrimaryButtonClass}
            >
              {isDeleting ? t("saving") : t("delete.confirm")}
            </button>
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
