"use client";

import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowPathIcon,
  ArrowUturnUpIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalSurface,
  customerPortalSecondaryActionClass,
  formatCustomerPortalCurrencyAmount,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useGetMyCreditTransactionsQuery } from "@/lib/features/credits/creditsApiSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  getCreditTransactionDetails,
  getCreditTransactionPagination,
} from "./creditTransactionHistory.utils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const getTransactionIcon = (type) => {
  switch (type) {
    case "added":
    case "admin_granted":
      return (
        <PlusCircleIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
      );
    case "used":
      return (
        <MinusCircleIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
      );
    case "refund":
      return (
        <ArrowUturnUpIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
      );
    case "coupon_redeemed":
      return (
        <PlusCircleIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
      );
    case "purchased":
      return (
        <BanknotesIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
      );
    default:
      return (
        <ClockIcon className="h-5 w-5 text-[var(--tenant-muted-on-surface)]" />
      );
  }
};

const formatTransactionDate = (value, locale, fallback) => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function CreditTransactionHistory({ className = "" }) {
  const legacyText = useLegacyText();
  const activeLocale = useLegacyLocale();
  const tenant = useSelector(selectCurrentTenant);
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const currency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const locale = activeLocale;
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const copy = useLegacyCopy("creditHistory");

  const {
    data: transactionData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetMyCreditTransactionsQuery({
    page,
    limit: pageSize,
  });

  const pagination = useMemo(
    () =>
      getCreditTransactionPagination(transactionData, {
        page,
        limit: pageSize,
      }),
    [page, transactionData],
  );
  const totalPages = Math.max(pagination.totalPages, 1);
  const currentPage = Math.min(pagination.currentPage, totalPages);

  const transactions = useMemo(
    () =>
      [...(transactionData?.transactions ?? [])].sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }),
    [transactionData?.transactions],
  );

  if (isLoading) {
    return (
      <CustomerPortalSurface className={`h-full p-3 ${className}`}>
        <CustomerPortalLoadingState label={copy.loading} />
      </CustomerPortalSurface>
    );
  }

  if (isError) {
    return (
      <CustomerPortalSurface className={`h-full p-3 ${className}`}>
        <CustomerPortalEmptyState
          className="min-h-[300px] sm:min-h-[340px]"
          icon={ExclamationTriangleIcon}
          title={copy.errorTitle}
          description={copy.errorDescription}
          action={
            <button
              type="button"
              onClick={refetch}
              className={customerPortalSecondaryActionClass}
            >
              {copy.retry}
            </button>
          }
        />
      </CustomerPortalSurface>
    );
  }

  return (
    <CustomerPortalSurface
      className={`flex h-full min-h-[420px] flex-col ${className}`}
    >
      <div className="border-b border-[color-mix(in_srgb,var(--tenant-text)_9%,transparent)] px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tenant-accent-on-surface)] sm:text-[11px]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.035em] text-[var(--tenant-text-on-surface)] sm:text-[32px]">
              {copy.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={refetch}
            disabled={isFetching}
            className={`${customerPortalSecondaryActionClass} w-full sm:w-auto`}
            aria-label={copy.refresh}
            title={copy.refresh}
          >
            <ArrowPathIcon
              className={classNames(
                "h-4 w-4 text-[var(--tenant-accent-on-surface)]",
                isFetching ? "animate-spin motion-reduce:animate-none" : "",
              )}
              aria-hidden="true"
            />
            {copy.refresh}
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-1 p-3">
          <CustomerPortalEmptyState
            className="min-h-[270px] w-full flex-1 border-0"
            icon={BanknotesIcon}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        </div>
      ) : (
        <div className="flex-1 divide-y divide-[color-mix(in_srgb,var(--tenant-text)_8%,transparent)]">
          {transactions.map((transaction, index) => {
            const amountSign = transaction.type === "used" ? "−" : "+";
            const transactionDetails = getCreditTransactionDetails(
              transaction,
              {
                orderLabel: legacyText("BookingSuccess_Order_1d757"),
              },
            );
            const when = formatTransactionDate(
              transaction.createdAt,
              locale,
              copy.dateUnknown,
            );
            const amount = Math.abs(Number(transaction.amount) || 0);

            return (
              <article
                key={transaction.id || transaction._id || index}
                className="px-5 py-4 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))] sm:px-6"
              >
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text)_9%,transparent)] bg-[var(--tenant-surface)]">
                    {getTransactionIcon(transaction.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--tenant-text-on-surface)] sm:text-[14px]">
                      {copy.types[transaction.type] || copy.types.other}
                    </p>
                    {transactionDetails ? (
                      <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-on-surface)] sm:text-[12px]">
                        {transactionDetails}
                      </p>
                    ) : null}
                    <time
                      className="mt-1 block text-[10px] text-[var(--tenant-muted-on-surface)] sm:text-[11px]"
                      dateTime={transaction.createdAt || undefined}
                    >
                      {when}
                    </time>
                  </div>

                  <p
                    className={classNames(
                      "shrink-0 pt-0.5 text-right text-[13px] font-semibold tabular-nums sm:text-[14px]",
                      "text-[var(--tenant-text-on-surface)]",
                    )}
                  >
                    {amountSign}
                    {formatCustomerPortalCurrencyAmount(
                      amount,
                      transaction.currency || currency,
                      locale,
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pagination.totalCount > 0 ? (
        <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--tenant-text)_9%,transparent)] bg-[var(--tenant-background)] px-5 py-4 text-[11px] text-[var(--tenant-muted-text)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p aria-live="polite">
            {legacyText(
              "CreditTransactionHistory_Showing_value1_value2_of_value3_f25d4",
              {
                value1: (currentPage - 1) * pagination.pageSize + 1,
                value2: Math.min(
                  currentPage * pagination.pageSize,
                  pagination.totalCount,
                ),
                value3: pagination.totalCount,
              },
            )}
          </p>

          <nav
            className="flex items-center justify-between gap-2 sm:justify-end"
            aria-label={copy.pagination}
          >
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isFetching}
              className={`${customerPortalSecondaryActionClass} min-h-11 px-3.5`}
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{copy.previous}</span>
            </button>
            <span className="min-w-14 text-center font-medium tabular-nums text-[var(--tenant-text)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= pagination.totalPages || isFetching}
              className={`${customerPortalSecondaryActionClass} min-h-11 px-3.5`}
            >
              <span className="hidden sm:inline">{copy.next}</span>
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      ) : null}
    </CustomerPortalSurface>
  );
}
