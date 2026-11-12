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
  getOrderNumber,
  getOrderStatusKey,
  getOrderTotal,
  getPaymentMethodKey,
  getPaymentStatusKey,
  getProductName,
} from "./sales.utils";

function DetailItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="break-words text-[10px] font-semibold uppercase tracking-[0.14em] text-[#969691]">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-[11px] leading-5 text-[#353533]">
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
            transition
            className="flex h-full w-full max-w-[480px] transform flex-col border-l border-line bg-surface-raised shadow-floating transition duration-300 ease-out data-closed:translate-x-full"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-terracotta-600">
                  {t("details.eyebrow")}
                </p>
                <DialogTitle className="mt-2 break-words text-[24px] font-semibold tracking-[-0.045em] text-[#171717]">
                  {getOrderNumber(order)}
                </DialogTitle>
                <p className="mt-1 text-[10px] text-[#858580]">
                  {formatFullDate(order?.createdAt, locale)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[#555553] transition hover:border-line-strong hover:text-[#171717]"
                aria-label={t("details.close")}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              <section className="rounded-[18px] border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#252524]">
                      {getCustomerName(order)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-[#858580]">
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
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3 text-[10px] font-medium text-[#555553] transition hover:border-line-strong"
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
                <h3 className="text-[11px] font-semibold text-[#252524]">
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
                          <p className="truncate text-[10px] font-medium text-[#353533]">
                            {getProductName(item, locale)}
                          </p>
                          <p className="mt-1 text-[10px] text-[#969691]">
                            {t("details.quantity", {
                              count: Number(item?.quantity || 1),
                            })}
                          </p>
                        </div>
                        <p className="shrink-0 text-[10px] font-semibold text-[#252524]">
                          {formatMoney(
                            item?.totalPrice ??
                              Number(item?.product?.price || 0) *
                                Number(item?.quantity || 1),
                            getOrderCurrency(order),
                            locale,
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-[10px] text-[#858580]">
                      {t("details.noItems")}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[10px] font-medium text-[#555553]">
                    {t("details.total")}
                  </span>
                  <span className="text-[16px] font-semibold tracking-[-0.03em] text-[#171717]">
                    {formatMoney(
                      getOrderTotal(order),
                      getOrderCurrency(order),
                      locale,
                    )}
                  </span>
                </div>
              </section>

              <section className="rounded-[18px] border border-line bg-white p-4">
                <h3 className="text-[11px] font-semibold text-[#252524]">
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
                      : t("details.notPaid")}
                  </DetailItem>
                </dl>
              </section>

              {canCreateInvoice && (
                <section className="rounded-[18px] border border-cobalt-200 bg-cobalt-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-[11px] font-semibold text-cobalt-800">
                        {t("details.invoiceTitle")}
                      </h3>
                      <p className="mt-1 text-[10px] leading-4 text-cobalt-700">
                        {t("details.invoiceDescription")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateInvoice?.(order)}
                      disabled={isCreatingInvoice}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-cobalt-600 px-4 text-[10px] font-semibold text-white disabled:opacity-50"
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
                  <h3 className="text-[11px] font-semibold text-[#252524]">
                    {t("details.note")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-5 text-[#666662]">
                    {order.note}
                  </p>
                </section>
              )}

              <p className="break-all px-1 text-[10px] text-[#A3A3A0]">
                {t("details.internalId")}: {getOrderId(order) || "—"}
              </p>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
