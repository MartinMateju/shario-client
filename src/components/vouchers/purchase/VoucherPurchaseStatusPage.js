"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { Link } from "@/i18n/navigation";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getVoucherOrderId } from "./voucherPurchaseAccess";
import { useVoucherPurchase } from "./useVoucherPurchase";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { formatIssuedVoucherDate } from "../voucherRecord";

const BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[color:var(--tenant-border)] px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const DELIVERY_STATES = new Set([
  "pending",
  "sending",
  "sent",
  "failed",
  "ambiguous",
  "suppressed",
]);
const POSTAL_STATES = new Set([
  "awaiting_payment",
  "awaiting_dispatch",
  "dispatched",
  "cancelled",
  "review_required",
]);

export default function VoucherPurchaseStatusPage() {
  const t = useTranslations("VoucherPurchase");
  const locale = useLocale();
  const params = useSearchParams();
  const orderId = getVoucherOrderId(params.get("couponOrderId"));
  const { tenant } = usePublicTenant();
  const purchase = useVoucherPurchase({
    tenantSlug: String(tenant?.slug || ""),
    orderId,
  });
  const { data, ready, pending, status, busy } = purchase;

  return (
    <main className="min-h-[75vh] px-5 py-12 text-[color:var(--tenant-text)] sm:py-16">
      <section
        className="mx-auto max-w-2xl rounded-[26px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] p-6 text-[color:var(--tenant-text-on-surface)] sm:p-9"
        data-tenant-surface="card"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-foreground)]">
          {ready ? (
            <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
          ) : pending ? (
            <ArrowPathIcon
              className="h-6 w-6 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <GiftIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
        <div role="status" aria-live="polite">
          <h1 className="mt-5 text-balance font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
            {t(`states.${status}.title`)}
          </h1>
          <p className="mt-4 text-base leading-7 text-[color:var(--tenant-muted-on-surface)]">
            {t(`states.${status}.description`)}
          </p>
        </div>
        {data?.productName && status !== "unavailable" ? (
          <p className="mt-5 break-words font-semibold">{data.productName}</p>
        ) : null}
        {data?.physicalDelivery?.requested && status !== "unavailable" && (
          <section className="mt-7 rounded-[18px] border border-[color:var(--tenant-border)] p-5">
            <h2 className="text-base font-semibold">
              {t("physicalDelivery.title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
              {t(
                `physicalDelivery.states.${POSTAL_STATES.has(data.physicalDelivery.status) ? data.physicalDelivery.status : "unknown"}`,
              )}
            </p>
            {data.physicalDelivery.dispatchedAt && (
              <p className="mt-2 text-sm leading-6">
                {t("physicalDelivery.dispatchedAt", {
                  date: formatIssuedVoucherDate(
                    data.physicalDelivery.dispatchedAt,
                    locale,
                  ),
                })}
              </p>
            )}
            {Number.isSafeInteger(data.physicalDelivery.postageFeeMinor) && (
              <p className="mt-2 text-sm leading-6">
                {t("physicalDelivery.postage", {
                  amount: formatMinorCurrencyAmount(
                    data.physicalDelivery.postageFeeMinor,
                    data.physicalDelivery.currency,
                    locale,
                  ),
                })}
              </p>
            )}
            <p className="mt-3 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
              {t("physicalDelivery.backup")}
            </p>
          </section>
        )}
        {ready ? (
          <div className="mt-7 space-y-5">
            <div className="rounded-[18px] border border-[color:var(--tenant-border)] p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
                {t("delivery.title")}
              </h2>
              <p className="mt-3 break-words text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                {t(
                  `delivery.${data.deliveryStatus === "failed" && data.deliveryNextAttemptAt ? "retrying" : DELIVERY_STATES.has(data.deliveryStatus) ? data.deliveryStatus : "pending"}`,
                  { email: data.maskedEmail || t("delivery.yourEmail") },
                )}
              </p>
              <button
                type="button"
                onClick={purchase.resendEmail}
                disabled={!purchase.canResend || busy}
                className={`${BUTTON_CLASS} mt-4`}
              >
                <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                {t(purchase.resending ? "actions.resending" : "actions.resend")}
              </button>
              {!purchase.canResend && data.resendAvailableAt ? (
                <p className="mt-2 text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]">
                  {t("actions.cooldown")}
                </p>
              ) : null}
              {purchase.resendQueued ? (
                <p className="mt-3 text-sm leading-6" role="status">
                  {t("actions.resendQueued")}
                </p>
              ) : null}
            </div>
            {purchase.documents.length ? (
              <div>
                <h2 className="text-base font-semibold">
                  {t("documents.title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                  {t("documents.description")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {purchase.documents.map(({ index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => purchase.downloadDocument(index)}
                      disabled={busy}
                      className={`${BUTTON_CLASS} bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-foreground)]`}
                      data-tenant-button="primary"
                    >
                      <ArrowDownTrayIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {t("documents.download", { number: index + 1 })}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {ready && data.voucherExpired ? (
          <p className="mt-5 text-sm leading-6" role="note">
            {t("voucherExpired")}
          </p>
        ) : null}
        {purchase.actionError ? (
          <p className="mt-5 text-sm leading-6" role="alert">
            {t(`actions.${purchase.actionError}`)}
          </p>
        ) : null}
        {pending && !purchase.polling ? (
          <p className="mt-5 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
            {t("slowConfirmation")}
          </p>
        ) : null}
        {purchase.canRefresh ? (
          <button
            type="button"
            onClick={purchase.refresh}
            disabled={purchase.refreshing || busy}
            className={`${BUTTON_CLASS} mt-6`}
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${purchase.refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            {t("actions.refresh")}
          </button>
        ) : null}
        {orderId ? (
          <p className="mt-6 break-all text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]">
            {t("orderReference")}: <span className="font-mono">{orderId}</span>
          </p>
        ) : null}
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-1 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]"
        >
          {t("backToStudio")}
        </Link>
      </section>
    </main>
  );
}
