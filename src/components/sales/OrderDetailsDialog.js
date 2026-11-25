"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ClipboardDocumentIcon,
  DocumentPlusIcon,
  EnvelopeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  formatFullDate,
  formatMoney,
  getCartItems,
  getCustomerEmail,
  getCustomerName,
  getOrderCurrency,
  getOrderId,
  getOrderLineAmount,
  getOrderNumber,
  getOrderStatusKey,
  getPaymentMethodKey,
  getPaymentStatusKey,
  getProductName,
} from "./sales.utils";
import OrderAmount from "./OrderAmount";

function DetailItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="break-words text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-[14px] font-medium leading-6 text-ink">
        {children}
      </dd>
    </div>
  );
}

export default function OrderDetailsDialog({
  order,
  locale,
  onClose,
  onCopy,
  canCreateInvoice = false,
  isCreatingInvoice = false,
  onCreateInvoice,
  t,
}) {
  const items = getCartItems(order);

  return (
    <Dialog
      open={Boolean(order)}
      onClose={onClose}
      className="relative z-[100]"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#1F1F1F]/25 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 flex justify-end">
          <DialogPanel
            data-dialog-layout="drawer"
            data-skab-workspace-surface="true"
            transition
            className="flex h-full w-full max-w-[480px] transform flex-col border-l border-line bg-surface-raised shadow-floating transition duration-300 ease-out data-closed:translate-x-full"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-terracotta-600">
                  {t("details.eyebrow")}
                </p>
                <DialogTitle className="mt-2 break-words text-[24px] font-semibold tracking-[-0.045em] text-ink">
                  {getOrderNumber(order)}
                </DialogTitle>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {formatFullDate(order?.createdAt, locale)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2"
                aria-label={t("details.close")}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              <section className="rounded-[18px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {getCustomerName(order)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-ink-muted">
                      <EnvelopeIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {getCustomerEmail(order) || "—"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCopy(order)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2"
                  >
                    <ClipboardDocumentIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t("actions.copyId")}
                  </button>
                </div>
              </section>

              <section className="rounded-[18px] border border-line bg-white p-4">
                <h3 className="text-[15px] font-semibold text-ink">
                  {t("details.items")}
                </h3>

                <div className="mt-3 divide-y divide-line">
                  {items.length ? (
                    items.map((item, index) => (
                      <div
                        key={
                          item?._id ||
                          `${getProductName(item, locale)}-${index}`
                        }
                        className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-[14px] font-medium text-ink">
                            {getProductName(item, locale)}
                          </p>
                          <p className="mt-1 text-[13px] text-ink-muted">
                            {t("details.quantity", {
                              count: Number(item?.quantity || 1),
                            })}
                          </p>
                        </div>
                        <p className="shrink-0 text-[14px] font-semibold text-ink">
                          {formatMoney(
                            getOrderLineAmount(order, item),
                            getOrderCurrency(order),
                            locale,
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-[13px] text-ink-muted">
                      {t("details.noItems")}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[13px] font-medium text-ink-soft">
                    {t("details.total")}
                  </span>
                  <div className="text-right text-[20px] font-semibold tabular-nums tracking-[-0.03em] text-ink">
                    <OrderAmount order={order} locale={locale} t={t} />
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-line bg-white p-4">
                <h3 className="text-[15px] font-semibold text-ink">
                  {t("details.paymentAndStatus")}
                </h3>
                <dl className="mt-4 grid grid-cols-2 gap-5">
                  <DetailItem label={t("columns.payment")}>
                    {t(`payments.${getPaymentStatusKey(order)}`)}
                  </DetailItem>
                  <DetailItem label={t("details.method")}>
                    {t(`paymentMethods.${getPaymentMethodKey(order)}`)}
                  </DetailItem>
                  <DetailItem label={t("columns.status")}>
                    {t(`statuses.${getOrderStatusKey(order)}`)}
                  </DetailItem>
                  <DetailItem label={t("details.paidAt")}>
                    {order?.paidAt
                      ? formatFullDate(order.paidAt, locale)
                      : t(
                          order?.isPaid
                            ? "details.paymentDateUnknown"
                            : "details.notPaid",
                        )}
                  </DetailItem>
                </dl>
              </section>

              {canCreateInvoice && (
                <section className="rounded-[18px] border border-cobalt-200 bg-cobalt-50 p-4">
                  <div className="flex flex-col items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-cobalt-800">
                        {t("details.invoiceTitle")}
                      </h3>
                      <p className="mt-1 text-[13px] leading-5 text-cobalt-700">
                        {t("details.invoiceDescription")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateInvoice?.(order)}
                      disabled={isCreatingInvoice}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-cobalt-600 px-4 text-[13px] font-semibold text-white transition hover:bg-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <DocumentPlusIcon className="h-4 w-4" />
                      {isCreatingInvoice
                        ? t("details.creatingInvoice")
                        : t("details.createInvoice")}
                    </button>
                  </div>
                </section>
              )}

              {order?.note && (
                <section className="rounded-[18px] border border-line bg-white p-4">
                  <h3 className="text-[15px] font-semibold text-ink">
                    {t("details.note")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5 text-ink-soft">
                    {order.note}
                  </p>
                </section>
              )}

              <p className="break-all px-1 text-[13px] text-ink-muted">
                {t("details.internalId")}: {getOrderId(order) || "—"}
              </p>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
