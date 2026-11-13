"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  EnvelopeIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useSelector } from "react-redux";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { Link } from "@/i18n/navigation";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  WAITLIST_STATES,
  useCheckoutWaitlistOfferMutation,
  useGetMyWaitlistsQuery,
  useLeaveWaitlistMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { formatMajorCurrencyAmount } from "@/utils/money";

import WaitlistRefundSummary from "./WaitlistRefundSummary";
import WaitlistStatusBadge, {
  getWaitlistPresentationState,
} from "./WaitlistStatusBadge";

const requiresEmailVerification = (error) =>
  error?.status === 403 &&
  String(error?.data?.code || "").toUpperCase() ===
    "EMAIL_VERIFICATION_REQUIRED";

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function PriceSnapshot({ price, locale, label }) {
  if (!price) return null;
  return (
    <p className="text-[11px] text-[var(--tenant-muted-on-surface)]">
      {label}:{" "}
      <span className="font-semibold text-[var(--tenant-text-on-surface)]">
        {formatMajorCurrencyAmount(
          price.amount,
          price.currency,
          resolveIntlLocale(locale),
        )}
      </span>
    </p>
  );
}

function WaitlistCard({
  entry,
  onWithdraw,
  onCheckout,
  busy,
  checkoutEnabled,
}) {
  const t = useTranslations("Waitlists");
  const locale = useLocale();
  const offered = entry.state === WAITLIST_STATES.OFFERED;
  const paymentPending = entry.state === WAITLIST_STATES.PAYMENT_PENDING;
  const presentationState = getWaitlistPresentationState(entry);
  const refunded = Boolean(entry.refund);
  const checkoutAvailable = offered || paymentPending;
  const mayWithdraw = [
    WAITLIST_STATES.WAITING,
    WAITLIST_STATES.OFFERED,
  ].includes(entry.state);
  const title =
    entry.session?.title ||
    t("portal.sessionFallback", { id: entry.sessionId });

  return (
    <article
      className="rounded-[22px] border border-[color-mix(in_srgb,var(--tenant-text)_11%,transparent)] bg-[var(--tenant-surface)] p-5 shadow-[0_14px_40px_rgba(17,17,15,0.045)] sm:p-6"
      data-customer-waitlist-entry={entry.state}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <WaitlistStatusBadge
              state={presentationState}
              label={t(`states.${presentationState}`)}
            />
            {entry.joinedAt ? (
              <span className="text-[10px] text-[var(--tenant-muted-on-surface)]">
                {t("joinedAt", {
                  date: formatDateTime(entry.joinedAt, locale),
                })}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 font-serif text-[25px] leading-tight tracking-[-0.035em] text-[var(--tenant-text-on-surface)]">
            {title}
          </h2>
          {entry.session?.start ? (
            <p className="mt-2 inline-flex items-center gap-2 text-[12px] text-[var(--tenant-muted-on-surface)]">
              <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
              {formatDateTime(entry.session.start, locale)}
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[var(--tenant-muted-on-surface)]">
            {t(`stateDescriptions.${presentationState}`)}
          </p>
          {refunded ? <WaitlistRefundSummary refund={entry.refund} /> : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {!refunded ? (
              <PriceSnapshot
                price={entry.price}
                locale={locale}
                label={t("offer.priceSnapshot")}
              />
            ) : null}
            {offered && entry.offerExpiresAt ? (
              <p className="text-[11px] font-semibold text-[var(--tenant-text-on-surface)]">
                {t("offer.expires", {
                  date: formatDateTime(entry.offerExpiresAt, locale),
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[190px]">
          {checkoutAvailable ? (
            <button
              type="button"
              onClick={() => onCheckout(entry)}
              disabled={busy || !checkoutEnabled}
              aria-describedby={
                checkoutEnabled ? undefined : "waitlist-commerce-paused"
              }
              className={customerPortalPrimaryActionClass}
            >
              {busy ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CreditCardIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {paymentPending ? t("offer.resumePayment") : t("offer.pay")}
            </button>
          ) : null}
          {mayWithdraw ? (
            <button
              type="button"
              onClick={() => onWithdraw(entry)}
              disabled={busy}
              className={customerPortalSecondaryActionClass}
            >
              {t("withdraw")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function CustomerWaitlistsPage() {
  const t = useTranslations("Waitlists.portal");
  const sharedT = useTranslations("Waitlists");
  const locale = useLocale();
  const currentTenant = useSelector(selectCurrentTenant);
  const visibilityTenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const location = useOptionalCustomerPortalLocation();
  const currentUser = useSelector(selectCurrentUser);
  const modules = currentTenant?.modules;
  const browseHref =
    modules?.courses !== false &&
    isCustomerPortalPageEnabled(visibilityTenant, "courses")
      ? retainCustomerPortalLocation(
          "/portal/courses",
          location?.activeLocationReference,
        )
      : null;
  const commerceEnabled =
    modules?.courses !== false && modules?.payments !== false;
  const query = useGetMyWaitlistsQuery();
  const [leave] = useLeaveWaitlistMutation();
  const [checkout] = useCheckoutWaitlistOfferMutation();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState(null);
  const entries = query.data?.entries ?? [];
  const email = String(currentUser?.email || "")
    .trim()
    .toLowerCase();
  const verificationHref = `/verify-email?${
    email ? `email=${encodeURIComponent(email)}&` : ""
  }next=${encodeURIComponent("/portal/waitlists")}`;
  const loadRequiresVerification = requiresEmailVerification(query.error);
  const verificationAction = (
    <Link href={verificationHref} className={customerPortalPrimaryActionClass}>
      {t("verificationRequired.action")}
    </Link>
  );

  const withdraw = async (entry) => {
    setBusyId(entry.id);
    setError(null);
    try {
      await leave({ entryId: entry.id }).unwrap();
    } catch (requestError) {
      setError({
        message: getLocalizedApiErrorMessage(
          requestError,
          sharedT("errors.generic"),
        ),
        verificationRequired: requiresEmailVerification(requestError),
      });
    } finally {
      setBusyId("");
    }
  };

  const pay = async (entry) => {
    setBusyId(entry.id);
    setError(null);
    try {
      const response = await checkout({
        entryId: entry.id,
        sessionId: entry.sessionId,
        locale,
        origin: window.location.origin,
      }).unwrap();
      const checkoutUrl = getSafeCheckoutUrl(
        response?.url ?? response?.checkoutUrl,
      );
      if (!checkoutUrl) throw new Error(sharedT("errors.checkout"));
      window.location.assign(checkoutUrl);
    } catch (requestError) {
      setError({
        message: getLocalizedApiErrorMessage(
          requestError,
          sharedT("errors.checkout"),
        ),
        verificationRequired: requiresEmailVerification(requestError),
      });
    } finally {
      setBusyId("");
    }
  };

  return (
    <CustomerPortalPage data-customer-waitlists-page>
      <CustomerPortalPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          browseHref ? (
            <Link
              href={browseHref}
              className={customerPortalSecondaryActionClass}
            >
              <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
              {t("browse")}
            </Link>
          ) : null
        }
      />

      <CustomerPortalSurface className="mt-7 p-3 sm:p-5 lg:p-6">
        {query.isLoading || (query.isFetching && !query.data) ? (
          <CustomerPortalLoadingState label={t("loading")} />
        ) : query.isError ? (
          <CustomerPortalEmptyState
            icon={loadRequiresVerification ? EnvelopeIcon : QueueListIcon}
            title={t(
              loadRequiresVerification
                ? "verificationRequired.title"
                : "loadError.title",
            )}
            description={t(
              loadRequiresVerification
                ? "verificationRequired.description"
                : "loadError.description",
            )}
            action={
              loadRequiresVerification ? (
                verificationAction
              ) : (
                <button
                  type="button"
                  onClick={query.refetch}
                  className={customerPortalSecondaryActionClass}
                >
                  {t("loadError.retry")}
                </button>
              )
            }
          />
        ) : entries.length ? (
          <div className="space-y-3">
            {!commerceEnabled ? (
              <div
                id="waitlist-commerce-paused"
                role="note"
                className="rounded-[18px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-4 text-[var(--tenant-text)]"
              >
                <p className="text-xs font-semibold">{t("paused.title")}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-text)]">
                  {t("paused.description")}
                </p>
              </div>
            ) : null}
            {entries.map((entry) => (
              <WaitlistCard
                key={entry.id}
                entry={entry}
                onWithdraw={withdraw}
                onCheckout={pay}
                busy={busyId === entry.id}
                checkoutEnabled={commerceEnabled}
              />
            ))}
          </div>
        ) : !commerceEnabled ? (
          <CustomerPortalEmptyState
            icon={QueueListIcon}
            title={t("unavailable.title")}
            description={t("unavailable.description")}
          />
        ) : (
          <CustomerPortalEmptyState
            icon={QueueListIcon}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              browseHref ? (
                <Link
                  href={browseHref}
                  className={customerPortalPrimaryActionClass}
                >
                  {t("browse")}
                </Link>
              ) : null
            }
          />
        )}
      </CustomerPortalSurface>

      {error ? (
        <div
          className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
          role="alert"
        >
          {error.verificationRequired ? (
            <>
              <p className="font-semibold">{t("verificationRequired.title")}</p>
              <p className="mt-1">{t("verificationRequired.description")}</p>
              <div className="mt-3">{verificationAction}</div>
            </>
          ) : (
            error.message
          )}
        </div>
      ) : null}
    </CustomerPortalPage>
  );
}
