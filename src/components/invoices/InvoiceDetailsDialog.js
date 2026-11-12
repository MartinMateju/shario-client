"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  ReceiptRefundIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useDownloadInvoicePdfMutation,
  useDownloadMyInvoicePdfMutation,
  useFinalizeInvoiceMutation,
  useGetInvoiceQuery,
  useGetMyInvoiceQuery,
  useSendInvoiceMutation,
} from "@/lib/features/invoices/invoicesApiSlice";
import { formatMinorCurrencyAmount } from "@/utils/money";

import CreditNoteDialog from "./CreditNoteDialog";
import InvoicePaymentsSection from "./InvoicePaymentsSection";
import {
  canCreditInvoice,
  cx,
  downloadInvoiceFile,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceCurrency,
  getInvoiceCustomer,
  getInvoiceCustomerEmail,
  getInvoiceCreditStatus,
  getInvoiceError,
  getInvoiceId,
  getInvoiceLines,
  getInvoiceAmountDueMinor,
  getInvoiceAmountPaidMinor,
  getInvoiceNumber,
  getInvoiceOrderReference,
  getInvoicePaymentStatus,
  getInvoiceSeller,
  getInvoiceStatus,
  getInvoiceSubtotalMinor,
  getInvoiceTaxMinor,
  getInvoiceTimezone,
  getInvoiceType,
  isInvoiceDraft,
} from "./invoice.utils";

const STATUS_CLASSES = {
  draft: "bg-[#EEECE7] text-[#686762]",
  issued: "bg-cobalt-50 text-cobalt-700",
  paid: "bg-success-soft text-success",
  void: "bg-danger-soft text-danger",
  credited: "bg-[#F0E9F8] text-[#75508C]",
  partially_credited: "bg-[#F0E9F8] text-[#75508C]",
};

const PartyBlock = ({ title, party }) => {
  const address = party?.address || {};
  const addressText = [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="min-w-0 rounded-[17px] border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--customer-invoice-muted,#969691)]">
        {title}
      </p>
      <p className="mt-2 break-words text-[12px] font-semibold text-[var(--customer-invoice-text,#292925)]">
        {party?.legalName ||
          party?.tradingName ||
          [party?.firstname, party?.lastname].filter(Boolean).join(" ") ||
          "—"}
      </p>
      {party?.email && (
        <p className="mt-1 break-words text-[10px] text-[var(--customer-invoice-muted,#777773)]">
          {party.email}
        </p>
      )}
      {addressText && (
        <p className="mt-1 text-[10px] leading-5 text-[var(--customer-invoice-muted,#777773)]">
          {addressText}
        </p>
      )}
      {(party?.registrationNumber || party?.vatId || party?.taxId) && (
        <p className="mt-2 break-words text-[10px] text-[var(--customer-invoice-muted,#969691)]">
          {[party.registrationNumber, party.vatId, party.taxId]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
};

export default function InvoiceDetailsDialog({
  invoice,
  customerMode = false,
  onClose,
  onEdit,
}) {
  const publicTenant = useOptionalPublicTenant();
  const tenantTheme = useMemo(
    () => getPublicTenantPortalTheme(publicTenant?.tenant),
    [publicTenant?.tenant],
  );
  const t = useTranslations("Invoices");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const id = getInvoiceId(invoice);
  const adminQuery = useGetInvoiceQuery(id, {
    skip: !id || customerMode,
  });
  const customerQuery = useGetMyInvoiceQuery(id, {
    skip: !id || !customerMode,
  });
  const query = customerMode ? customerQuery : adminQuery;
  const hasLoadedAdminInvoice =
    !customerMode && query.isSuccess && Boolean(query.data?.invoice);
  const resolvedInvoice = query.data?.invoice ?? invoice;
  const timezone = getInvoiceTimezone(
    resolvedInvoice,
    tenant?.settings?.timezone,
  );
  const [notice, setNotice] = useState(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const [finalizeInvoice, { isLoading: isFinalizing }] =
    useFinalizeInvoiceMutation();
  const [sendInvoice, { isLoading: isSending }] = useSendInvoiceMutation();
  const [downloadAdminPdf, { isLoading: adminPdfLoading }] =
    useDownloadInvoicePdfMutation();
  const [downloadCustomerPdf, { isLoading: customerPdfLoading }] =
    useDownloadMyInvoicePdfMutation();
  const isDownloading = adminPdfLoading || customerPdfLoading;
  const currency = getInvoiceCurrency(resolvedInvoice);
  const documentType = getInvoiceType(resolvedInvoice);
  const status = getInvoiceStatus(resolvedInvoice);
  const paymentStatus = getInvoicePaymentStatus(resolvedInvoice);
  const creditStatus = getInvoiceCreditStatus(resolvedInvoice);
  const customer = getInvoiceCustomer(resolvedInvoice);
  const seller = getInvoiceSeller(resolvedInvoice);
  const lines = getInvoiceLines(resolvedInvoice);
  const canEdit =
    !customerMode &&
    isInvoiceDraft(resolvedInvoice) &&
    hasPermission(access, PERMISSIONS.INVOICES_CREATE);
  const canFinalize =
    !customerMode &&
    isInvoiceDraft(resolvedInvoice) &&
    hasPermission(access, PERMISSIONS.INVOICES_FINALIZE);
  const canSend =
    !customerMode &&
    status === "issued" &&
    hasPermission(access, PERMISSIONS.INVOICES_SEND);
  const canCreateCredit =
    !customerMode &&
    canCreditInvoice(resolvedInvoice) &&
    hasPermission(access, PERMISSIONS.INVOICES_CREDIT);
  const canManagePayments =
    hasLoadedAdminInvoice &&
    documentType === "invoice" &&
    status === "issued" &&
    hasPermission(access, PERMISSIONS.INVOICES_PAYMENTS_MANAGE);
  const canViewPaymentHistory =
    hasLoadedAdminInvoice &&
    documentType === "invoice" &&
    (hasPermission(access, PERMISSIONS.PAYMENTS_VIEW) ||
      hasPermission(access, PERMISSIONS.INVOICES_PAYMENTS_MANAGE));
  const canDownload =
    customerMode || hasPermission(access, PERMISSIONS.INVOICES_EXPORT);

  const run = async (task, successMessage, fallbackError) => {
    setNotice(null);
    try {
      await task();
      setNotice({ type: "success", message: successMessage });
    } catch (error) {
      setNotice({
        type: "error",
        message: getInvoiceError(error, fallbackError),
      });
    }
  };

  const handleFinalize = () => {
    if (!window.confirm(t("actions.confirmFinalize"))) return;

    void run(
      () => finalizeInvoice({ id }).unwrap(),
      t("messages.finalized"),
      t("messages.finalizeError"),
    );
  };

  const handleSend = () => {
    const email = getInvoiceCustomerEmail(resolvedInvoice);
    const recipient = window.prompt(t("actions.recipientPrompt"), email);
    if (recipient === null) return;
    const normalizedRecipient = recipient.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedRecipient)) {
      setNotice({ type: "error", message: t("actions.recipientInvalid") });
      return;
    }

    void run(
      () => sendInvoice({ id, recipient: normalizedRecipient }).unwrap(),
      t("messages.sent"),
      t("messages.sendError"),
    );
  };

  const handleDownload = async () => {
    setNotice(null);
    try {
      const result = customerMode
        ? await downloadCustomerPdf(id).unwrap()
        : await downloadAdminPdf(id).unwrap();
      const downloaded = downloadInvoiceFile(
        result,
        `${getInvoiceNumber(resolvedInvoice, "invoice")}.pdf`,
      );
      if (!downloaded) throw new Error(t("messages.pdfError"));
    } catch (error) {
      setNotice({
        type: "error",
        message: getInvoiceError(error, t("messages.pdfError")),
      });
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(invoice)}
        onClose={onClose}
        className="relative z-[110]"
        data-tenant-style={
          customerMode ? tenantTheme?.stylePresetId : undefined
        }
        style={
          customerMode
            ? {
                ...tenantTheme?.style,
                "--customer-invoice-background": "var(--tenant-surface)",
                "--customer-invoice-surface": "var(--tenant-surface)",
                "--customer-invoice-text": "var(--tenant-text-on-surface)",
                "--customer-invoice-heading":
                  "var(--tenant-heading-on-surface)",
                "--customer-invoice-muted": "var(--tenant-muted-on-surface)",
                "--customer-invoice-border": "var(--tenant-border)",
                "--customer-invoice-accent": "var(--tenant-accent-on-surface)",
                "--customer-invoice-button": "var(--tenant-portal-button)",
                "--customer-invoice-button-text":
                  "var(--tenant-portal-button-foreground)",
              }
            : undefined
        }
      >
        <DialogBackdrop className="fixed inset-0 bg-[#1F1F1F]/25 backdrop-blur-[2px]" />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <DialogPanel
              data-dialog-layout="drawer"
              className="flex h-full w-full max-w-[620px] flex-col border-l border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-background,var(--color-surface-raised))] text-[var(--customer-invoice-text,inherit)] shadow-floating"
            >
              <header className="flex items-start justify-between gap-4 border-b border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] px-5 py-5 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--customer-invoice-accent,var(--color-terracotta-600))]">
                    {t(`types.${getInvoiceType(resolvedInvoice)}`)}
                  </p>
                  <DialogTitle className="mt-2 break-words text-[25px] font-semibold tracking-[-0.045em] text-[var(--customer-invoice-heading,#171717)]">
                    {getInvoiceNumber(resolvedInvoice, t("draftNumber"))}
                  </DialogTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        STATUS_CLASSES[status] || STATUS_CLASSES.draft,
                      )}
                    >
                      {t(`statuses.${status}`)}
                    </span>
                    <span className="rounded-full bg-[#F4F2ED] px-2.5 py-1 text-[10px] font-semibold text-[#686762]">
                      {t(`paymentStatuses.${paymentStatus}`)}
                    </span>
                    {!["none", "not_applicable"].includes(creditStatus) && (
                      <span className="rounded-full bg-[#F0E9F8] px-2.5 py-1 text-[10px] font-semibold text-[#75508C]">
                        {t(`creditStatuses.${creditStatus}`)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] text-[var(--customer-invoice-text,#555553)]"
                  aria-label={t("details.close")}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                {query.isLoading && (
                  <p
                    className="text-[11px] text-[var(--customer-invoice-muted,#777773)]"
                    role="status"
                  >
                    {t("details.loading")}
                  </p>
                )}

                {notice && (
                  <p
                    className={cx(
                      "rounded-[12px] px-4 py-3 text-[11px]",
                      notice.type === "success"
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger",
                    )}
                    role="status"
                  >
                    {notice.message}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <PartyBlock title={t("details.seller")} party={seller} />
                  <PartyBlock title={t("details.customer")} party={customer} />
                </div>

                <section className="rounded-[17px] border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--customer-invoice-muted,#969691)]">
                        {t("table.issueDate")}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-[var(--customer-invoice-text,#353533)]">
                        {formatInvoiceDate(
                          resolvedInvoice?.issueDate ??
                            resolvedInvoice?.finalizedAt,
                          locale,
                          timezone,
                        )}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--customer-invoice-muted,#969691)]">
                        {t("table.dueDate")}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-[var(--customer-invoice-text,#353533)]">
                        {formatInvoiceDate(
                          resolvedInvoice?.dueDate,
                          locale,
                          timezone,
                        )}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--customer-invoice-muted,#969691)]">
                        {t("details.taxableSupplyDate")}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-[var(--customer-invoice-text,#353533)]">
                        {formatInvoiceDate(
                          resolvedInvoice?.taxableSupplyDate,
                          locale,
                          timezone,
                        )}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--customer-invoice-muted,#969691)]">
                        {t("details.order")}
                      </p>
                      <p className="mt-1.5 break-words text-[10px] font-medium text-[var(--customer-invoice-text,#353533)]">
                        {getInvoiceOrderReference(resolvedInvoice) || "—"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[17px] border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] p-4">
                  <h3 className="text-[11px] font-semibold text-[var(--customer-invoice-text,#252524)]">
                    {t("details.items")}
                  </h3>
                  <div className="mt-3 divide-y divide-[var(--customer-invoice-border,var(--color-line))]">
                    {lines.map((line, index) => (
                      <div
                        key={line?._id || `${line?.description}-${index}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-[var(--customer-invoice-text,#353533)]">
                            {line?.description || "—"}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--customer-invoice-muted,#969691)]">
                            {t("details.lineMeta", {
                              quantity: Number(line?.quantity || 0),
                              tax: Number(line?.taxRateBps || 0) / 100,
                            })}
                          </p>
                        </div>
                        <p className="text-[10px] font-semibold text-[var(--customer-invoice-text,#252524)]">
                          {formatMinorCurrencyAmount(
                            line?.grossAmountMinor || 0,
                            currency,
                            locale,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-[var(--customer-invoice-border,var(--color-line))] pt-4 text-[10px]">
                    <div className="flex justify-between text-[var(--customer-invoice-muted,#777773)]">
                      <dt>{t("details.subtotal")}</dt>
                      <dd>
                        {formatMinorCurrencyAmount(
                          getInvoiceSubtotalMinor(resolvedInvoice),
                          currency,
                          locale,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between text-[var(--customer-invoice-muted,#777773)]">
                      <dt>{t("details.tax")}</dt>
                      <dd>
                        {formatMinorCurrencyAmount(
                          getInvoiceTaxMinor(resolvedInvoice),
                          currency,
                          locale,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between text-[14px] font-semibold text-[var(--customer-invoice-heading,#171717)]">
                      <dt>{t("details.total")}</dt>
                      <dd>{formatInvoiceMoney(resolvedInvoice, locale)}</dd>
                    </div>
                    {documentType === "invoice" && (
                      <>
                        <div className="flex justify-between text-[var(--customer-invoice-muted,#777773)]">
                          <dt>{t("details.amountPaid")}</dt>
                          <dd>
                            {formatMinorCurrencyAmount(
                              getInvoiceAmountPaidMinor(resolvedInvoice),
                              currency,
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between font-semibold text-[var(--customer-invoice-text,#353533)]">
                          <dt>{t("details.amountDue")}</dt>
                          <dd>
                            {formatMinorCurrencyAmount(
                              getInvoiceAmountDueMinor(resolvedInvoice),
                              currency,
                              locale,
                            )}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </section>

                {canViewPaymentHistory && (
                  <InvoicePaymentsSection
                    invoice={resolvedInvoice}
                    locale={locale}
                    timezone={timezone}
                    canManage={canManagePayments}
                    onRefresh={() => query.refetch()}
                  />
                )}

                {documentType === "credit_note" &&
                  resolvedInvoice?.originalInvoiceNumber && (
                    <section className="rounded-[17px] border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--customer-invoice-muted,#969691)]">
                        {t("details.originalInvoice")}
                      </p>
                      <p className="mt-2 break-words text-[10px] font-semibold text-[var(--customer-invoice-text,#353533)]">
                        {resolvedInvoice.originalInvoiceNumber}
                      </p>
                    </section>
                  )}

                {resolvedInvoice?.creditReason && (
                  <section className="rounded-[17px] border border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--customer-invoice-muted,#969691)]">
                      {t("details.creditReason")}
                    </p>
                    <p className="mt-2 text-[10px] leading-5 text-[var(--customer-invoice-text,#555553)]">
                      {resolvedInvoice.creditReason}
                    </p>
                  </section>
                )}
              </div>

              <footer className="flex flex-wrap gap-2 border-t border-[var(--customer-invoice-border,var(--color-line))] bg-[var(--customer-invoice-surface,#FFFFFF)] px-5 py-4 sm:px-6">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit?.(resolvedInvoice)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[var(--customer-invoice-border,var(--color-line))] px-3.5 text-[10px] font-semibold text-[var(--customer-invoice-text,#555553)]"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    {t("actions.edit")}
                  </button>
                )}
                {canFinalize && (
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isFinalizing}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[12px] bg-cobalt-600 px-3.5 text-[10px] font-semibold text-white disabled:opacity-50"
                  >
                    <CheckBadgeIcon className="h-4 w-4" />
                    {isFinalizing
                      ? t("actions.working")
                      : t("actions.finalize")}
                  </button>
                )}
                {canSend && (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSending}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[var(--customer-invoice-border,var(--color-line))] px-3.5 text-[10px] font-semibold text-[var(--customer-invoice-text,#555553)] disabled:opacity-50"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    {isSending ? t("actions.working") : t("actions.send")}
                  </button>
                )}
                {canCreateCredit && (
                  <button
                    type="button"
                    onClick={() => setCreditOpen(true)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[var(--customer-invoice-border,var(--color-line))] px-3.5 text-[10px] font-semibold text-[var(--customer-invoice-accent,var(--color-terracotta-600))]"
                  >
                    <ReceiptRefundIcon className="h-4 w-4" />
                    {t("actions.credit")}
                  </button>
                )}
                {canDownload && !isInvoiceDraft(resolvedInvoice) && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-[12px] bg-[var(--customer-invoice-button,#111111)] px-3.5 text-[10px] font-semibold text-[var(--customer-invoice-button-text,#FFFFFF)] disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {isDownloading
                      ? t("actions.working")
                      : t("actions.download")}
                  </button>
                )}
              </footer>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {creditOpen && (
        <CreditNoteDialog
          invoice={resolvedInvoice}
          open
          onClose={() => setCreditOpen(false)}
          onCreated={(_createdInvoice, delivery) =>
            setNotice(
              delivery?.status === "failed"
                ? {
                    type: "error",
                    message: t("messages.creditDeliveryFailed"),
                  }
                : { type: "success", message: t("messages.credited") },
            )
          }
        />
      )}
    </>
  );
}
