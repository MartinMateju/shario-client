"use client";

import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { formatMinorCurrencyAmount } from "@/utils/money";

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function WaitlistRefundSummary({ refund }) {
  const t = useTranslations("Waitlists.refund");
  const locale = useLocale();
  if (!refund) return null;

  const refundedAt = formatDateTime(refund.refundedAt, locale);

  return (
    <section
      aria-label={t("title")}
      data-waitlist-refund-summary
      className="mt-4 rounded-[16px] border border-violet-200 bg-violet-50 p-4 text-violet-950"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-violet-700 shadow-sm">
          <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold">{t("title")}</h3>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatMinorCurrencyAmount(
              refund.amountMinor,
              refund.currency,
              locale === "cs" ? "cs-CZ" : "en-GB",
            )}
          </p>
          {refundedAt ? (
            <time
              dateTime={refund.refundedAt}
              className="mt-1 block text-[10px] leading-4 text-violet-800"
            >
              {t("refundedAt", { date: refundedAt })}
            </time>
          ) : null}
        </div>
      </div>
    </section>
  );
}
