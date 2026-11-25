"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMinorCurrencyAmount } from "@/utils/money";
import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "./CustomerPortalPrimitives";

export default function PaymentRefundResult({
  refund,
  currency,
  reference,
  returnHref = "/",
  onRefresh,
  isRefreshing = false,
}) {
  const t = useTranslations("PaymentRefundResult");
  const amounts = useTranslations("RefundReviews");
  const locale = useLocale();
  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-[var(--tenant-background)] px-4 py-12 text-[var(--tenant-text)]">
      <section
        aria-live="polite"
        className="w-full max-w-xl space-y-5 rounded-3xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-7 text-[var(--tenant-text-on-surface)] shadow-card"
      >
        <h1 className="text-2xl font-semibold text-[var(--tenant-heading-on-surface)]">
          {t("title")}
        </h1>
        <p>{t("description")}</p>
        <p className="font-medium">{t("next")}</p>
        {currency ? (
          <dl className="space-y-2">
            {[
              ["refunded", refund?.succeededAmountMinor],
              ["pending", refund?.pendingAmountMinor],
              ["failed", refund?.failedAmountMinor],
            ]
              .filter(([, amount]) => Number(amount) > 0)
              .map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt>{amounts(label)}</dt>
                  <dd>{formatMinorCurrencyAmount(amount, currency, locale)}</dd>
                </div>
              ))}
          </dl>
        ) : null}
        {reference ? (
          <p className="break-all text-sm">
            {t("reference")}: <span className="font-mono">{reference}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link className={customerPortalPrimaryActionClass} href={returnHref}>
            {t("back")}
          </Link>
          {onRefresh ? (
            <button
              type="button"
              className={customerPortalSecondaryActionClass}
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {t("refresh")}
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
