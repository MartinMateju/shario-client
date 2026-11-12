"use client";

import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import InvoiceDetailsDialog from "@/components/invoices/InvoiceDetailsDialog";
import {
  cx,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceId,
  getInvoiceNumber,
  getInvoicePaymentStatus,
  getInvoiceStatus,
  getInvoiceTimezone,
  getInvoiceType,
  normalizeInvoicePage,
} from "@/components/invoices/invoice.utils";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useGetMyInvoicesQuery } from "@/lib/features/invoices/invoicesApiSlice";

const PAGE_SIZE = 20;

export default function CustomerInvoicesPage() {
  const t = useTranslations("CustomerInvoices");
  const invoiceT = useTranslations("Invoices");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const timezone = tenant?.settings?.timezone || "UTC";
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const query = useGetMyInvoicesQuery({ page, limit: PAGE_SIZE });
  const pageData = normalizeInvoicePage(query.data);

  return (
    <CustomerPortalPage contentClassName="max-w-6xl animate-fade-up">
      <CustomerPortalPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {query.isLoading ? (
        <div className="mt-7">
          <CustomerPortalLoadingState label={t("loading")} />
        </div>
      ) : query.isError ? (
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={DocumentTextIcon}
            title={t("loadError")}
            action={
              <button
                type="button"
                onClick={query.refetch}
                className={customerPortalPrimaryActionClass}
              >
                {t("retry")}
              </button>
            }
          />
        </CustomerPortalSurface>
      ) : pageData.invoices.length === 0 ? (
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={DocumentTextIcon}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        </CustomerPortalSurface>
      ) : (
        <CustomerPortalSurface className="mt-7">
          <div className="divide-y divide-[var(--tenant-border)]">
            {pageData.invoices.map((invoice) => {
              const status = getInvoiceStatus(invoice);
              const paymentStatus = getInvoicePaymentStatus(invoice);

              return (
                <article
                  key={getInvoiceId(invoice)}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))] sm:px-6 md:grid-cols-[minmax(0,1.25fr)_minmax(120px,.65fr)_minmax(140px,.8fr)_minmax(120px,.6fr)_44px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-on-surface)]">
                      {invoiceT(`types.${getInvoiceType(invoice)}`)}
                    </p>
                    <h2 className="mt-1 text-[13px] font-semibold text-[var(--tenant-text-on-surface)]">
                      {getInvoiceNumber(invoice)}
                    </h2>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--tenant-muted-on-surface)]">
                      {t("issueDate")}
                    </p>
                    <p className="mt-1.5 text-[10px] text-[var(--tenant-text-on-surface)]">
                      {formatInvoiceDate(
                        invoice?.issueDate,
                        locale,
                        getInvoiceTimezone(invoice, timezone),
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[9px] font-semibold",
                        status === "void"
                          ? "bg-danger-soft text-danger"
                          : "bg-cobalt-50 text-cobalt-700",
                      )}
                    >
                      {invoiceT(`statuses.${status}`)}
                    </span>
                    <span className="rounded-full bg-[var(--tenant-surface)] px-2.5 py-1 text-[9px] font-semibold text-[var(--tenant-muted-on-surface)]">
                      {invoiceT(`paymentStatuses.${paymentStatus}`)}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--tenant-text-on-surface)] md:text-right">
                    {formatInvoiceMoney(invoice, locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(invoice)}
                    className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text)_13%,transparent)] text-[var(--tenant-muted-on-surface)] transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_42%,transparent)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 motion-reduce:transform-none"
                    aria-label={`${t("view")} ${getInvoiceNumber(invoice)}`}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-3.5 sm:px-6">
            <p className="text-[9px] text-[var(--tenant-muted-text)]">
              {t("pagination", {
                page: pageData.page,
                pages: pageData.totalPages,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pageData.page <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition-colors hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:opacity-30"
                aria-label={t("previous")}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pageData.totalPages),
                  )
                }
                disabled={pageData.page >= pageData.totalPages}
                className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition-colors hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:opacity-30"
                aria-label={t("next")}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CustomerPortalSurface>
      )}

      {selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          customerMode
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </CustomerPortalPage>
  );
}
