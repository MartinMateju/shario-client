"use client";

import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { removeBookingItems } from "@/lib/features/cart/cartSlice";
import { useLazyGetMyOrderConfirmationQuery } from "@/lib/features/checkout/checkoutSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { selectIsAuthenticated } from "@/lib/features/auth/authSlice";
import translation from "@/translations/translation";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { getConfirmedOrderLocationReference } from "@/utils/customerCheckoutLocation";
import {
  getPortalLocationReferenceFromSearchParams,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";
const ORDER_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;
const getOrderState = (data) => {
  const status = String(data?.status ?? "")
    .trim()
    .toLowerCase();
  if (
    data?.success === true ||
    data?.confirmed === true ||
    data?.outcome === "success" ||
    (status === "processed_order" && data?.isPaid === true)
  ) {
    return "success";
  }
  if (
    data?.terminal === true ||
    [
      "failed_order",
      "cancelled_order",
      "failed",
      "cancelled",
      "expired",
    ].includes(status)
  ) {
    return "failed";
  }
  return "pending";
};
export default function Success() {
  return <BookingSuccess />;
}
function BookingSuccess() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const rememberLocation =
    useOptionalCustomerPortalLocation()?.rememberLocation;
  const language = useSelector(selectCurrentLanguage);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const rawOrderId = searchParams.get("orderId") || "";
  const orderId = ORDER_ID_REGEX.test(rawOrderId) ? rawOrderId : "";
  const [
    loadOrderStatus,
    { data, isLoading, isFetching, isError, isUninitialized },
  ] = useLazyGetMyOrderConfirmationQuery();
  const orderState = useMemo(() => getOrderState(data), [data]);
  const isTerminal = data?.terminal === true;
  useEffect(() => {
    if (!orderId || isTerminal) {
      return undefined;
    }
    void loadOrderStatus({
      orderId,
    });
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadOrderStatus({
          orderId,
        });
      }
    }, 2_000);
    return () => window.clearInterval(intervalId);
  }, [isTerminal, loadOrderStatus, orderId]);
  const state = !orderId
    ? "invalid"
    : isError
      ? "unavailable"
      : isUninitialized || isLoading
        ? "pending"
        : orderState;
  useEffect(() => {
    if (isTerminal && state === "success") {
      dispatch(removeBookingItems());
    }
  }, [dispatch, isTerminal, state]);
  const t = useMemo(() => {
    return (key, fallback = "") => translation?.[key]?.[language] ?? fallback;
  }, [language]);
  const reservationNote = useMemo(() => {
    if (!isAuthenticated || state !== "success") return "";
    return language === "CZ"
      ? 'Rezervaci najdete v sekci "Moje rezervace".'
      : "You can manage your booking in the My bookings section.";
  }, [isAuthenticated, language, state]);
  const statusCopy = useMemo(() => {
    const isCzech = language === "CZ";
    return {
      success: {
        badge: t("CONFIRMED", isCzech ? "Potvrzeno" : "Confirmed"),
        title: t(
          "SUCCESS_TITLE",
          isCzech ? "Rezervace je potvrzena" : "Your booking is confirmed",
        ),
        description: t("SUCCESS_CONTENT_1"),
        next: t("SUCCESS_CONTENT_2"),
      },
      pending: {
        badge: isCzech ? "Zpracovává se" : "Processing",
        title: isCzech
          ? "Potvrzujeme vaši platbu"
          : "We are confirming your payment",
        description: isCzech
          ? "Platbu jsme přijali ke zpracování. Rezervaci potvrdíme, jakmile obdržíme bezpečné potvrzení platby."
          : "Your payment is being processed. We will confirm the booking after receiving secure payment confirmation.",
        next: isCzech
          ? "Tuto stránku můžete nechat otevřenou; stav se aktualizuje automaticky."
          : "You can leave this page open; the status refreshes automatically.",
      },
      failed: {
        badge: isCzech ? "Nepotvrzeno" : "Not confirmed",
        title: isCzech
          ? "Platbu se nepodařilo dokončit"
          : "The payment was not completed",
        description: isCzech
          ? "Rezervace nebyla potvrzena. Obsah košíku jsme zachovali, abyste mohli platbu bezpečně zkusit znovu."
          : "The booking was not confirmed. Your cart was kept so you can safely try the payment again.",
        next: isCzech
          ? "Pokud vám přesto byla částka stržena, kontaktujte studio a uveďte číslo objednávky."
          : "If you were charged anyway, contact the studio and include the order reference.",
      },
      unavailable: {
        badge: isCzech ? "Nelze ověřit" : "Unable to verify",
        title: isCzech
          ? "Stav zatím neznáme"
          : "We cannot verify the status yet",
        description: isCzech
          ? "Nepodařilo se načíst stav objednávky. Neznamená to, že platba selhala."
          : "The order status could not be loaded. This does not mean that the payment failed.",
        next: isCzech
          ? "Zkuste stav zkontrolovat znovu. Košík zůstává zachovaný."
          : "Try checking the status again. Your cart remains intact.",
      },
      invalid: {
        badge: isCzech ? "Nelze ověřit" : "Unable to verify",
        title: isCzech
          ? "Chybí číslo objednávky"
          : "The order reference is missing",
        description: isCzech
          ? "Tento návratový odkaz neobsahuje platné číslo objednávky, proto rezervaci nemůžeme potvrdit."
          : "This return link has no valid order reference, so the booking cannot be confirmed.",
        next: isCzech
          ? "Košík jsme nesmazali. Vraťte se do portálu nebo kontaktujte studio."
          : "We kept your cart. Return to the portal or contact the studio.",
      },
    }[state];
  }, [language, state, t]);
  const StatusIcon =
    state === "success"
      ? CheckIcon
      : state === "pending"
        ? ClockIcon
        : ExclamationTriangleIcon;
  const retryStatus = () => {
    if (orderId) {
      void loadOrderStatus({
        orderId,
      });
    }
  };
  const returnLocationReference =
    getPortalLocationReferenceFromSearchParams(searchParams) ||
    (state === "success" ? getConfirmedOrderLocationReference(data) : "");
  useEffect(() => {
    if (isAuthenticated && state === "success" && returnLocationReference) {
      rememberLocation?.(returnLocationReference);
    }
  }, [isAuthenticated, rememberLocation, returnLocationReference, state]);
  const primaryHref = isAuthenticated
    ? retainCustomerPortalLocation("/portal", returnLocationReference)
    : "/";
  const primaryLabel = isAuthenticated
    ? state === "success"
      ? t("SUCCESS_BUTTON")
      : language === "CZ"
        ? "Zpět do portálu"
        : "Back to portal"
    : language === "CZ"
      ? "Zpět na úvod"
      : "Back to home";
  return (
    <main className="relative flex min-h-[calc(100dvh-var(--header-height,78px))] items-center bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-4 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--tenant-surface)_70%,transparent)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-[color-mix(in_srgb,var(--tenant-surface)_50%,transparent)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl min-w-0 rounded-3xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_16px_60px_rgba(25,20,15,0.08)]">
        <div className="h-1 rounded-t-3xl bg-[var(--tenant-portal-button)]" />

        <div className="p-4 [overflow-wrap:anywhere] sm:p-6">
          <header className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] sm:h-12 sm:w-12">
              <StatusIcon
                aria-hidden="true"
                className={
                  "h-6 w-6 text-[var(--tenant-muted-on-surface)] " +
                  (state === "pending" ? "animate-pulse" : "")
                }
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-[var(--tenant-muted-on-surface)]">
                {statusCopy.badge}
              </p>
              <h1 className="mt-1 text-2xl font-medium leading-tight tracking-tight text-[var(--tenant-heading-on-surface)] sm:text-[30px]">
                {statusCopy.title}
              </h1>
              <p className="mt-2 text-sm leading-5 text-[var(--tenant-text-on-surface)]">
                {statusCopy.description}
              </p>

              {state === "pending" && (
                <div
                  className="mt-2 flex items-center gap-2 text-xs text-[var(--tenant-muted-on-surface)]"
                  role="status"
                >
                  <ArrowPathIcon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin"
                  />
                  {isFetching
                    ? language === "CZ"
                      ? "Kontroluji stav…"
                      : "Checking status…"
                    : language === "CZ"
                      ? "Čekám na potvrzení…"
                      : "Waiting for confirmation…"}
                </div>
              )}
            </div>
          </header>

          <div
            className={
              "mt-4 grid gap-4 " +
              (state === "success"
                ? "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
                : "")
            }
          >
            {state === "success" ? (
              <ConfirmationDetails data={data} language={language} />
            ) : null}

            <section className="min-w-0 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4">
              <div className="flex items-center gap-2">
                <EnvelopeIcon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[var(--tenant-muted-on-surface)]"
                />
                <h2 className="text-base font-medium text-[var(--tenant-heading-on-surface)]">
                  {t(
                    "WHAT_HAPPENS_NEXT",
                    language === "CZ" ? "Co bude dál?" : "What happens next?",
                  )}
                </h2>
              </div>

              <div className="mt-3 space-y-3 text-sm leading-5 text-[var(--tenant-text-on-surface)]">
                <p>{statusCopy.next}</p>
                {reservationNote && <p>{reservationNote}</p>}
                {orderId && (
                  <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                    {language === "CZ" ? "Objednávka" : "Order"}:{" "}
                    <span className="font-mono">{orderId}</span>
                  </p>
                )}
              </div>
            </section>
          </div>

          <footer className="mt-4 flex flex-col gap-3 border-t border-[var(--tenant-border)] pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {state === "success" && (
              <p className="min-w-0 text-xs leading-5 text-[var(--tenant-muted-on-surface)] sm:max-w-sm">
                {t("SUCCESS_HELPER_TEXT_1")}
              </p>
            )}
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
              {["failed", "unavailable"].includes(state) && orderId && (
                <button
                  type="button"
                  onClick={retryStatus}
                  disabled={isFetching}
                  className={customerPortalSecondaryActionClass}
                >
                  {language === "CZ" ? "Zkontrolovat znovu" : "Check again"}
                </button>
              )}
              <Link
                href={primaryHref}
                className={customerPortalPrimaryActionClass}
              >
                {primaryLabel}
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
const getLocalizedName = (value, language) => {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return String(
    value[language] ??
      value[language === "CZ" ? "CS" : "EN"] ??
      value.EN ??
      value.CZ ??
      "",
  ).trim();
};
const formatBookingDateTime = (value, language, timeZone) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(language === "CZ" ? "cs-CZ" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timeZone
        ? {
            timeZone,
          }
        : {}),
    }).format(date);
  } catch {
    return formatBookingDateTime(value, language, "");
  }
};
function MembershipPaymentSummary({
  valueMinor,
  coveredMinor,
  paidMinor,
  currency,
}) {
  const locale = useLocale();
  const t = useTranslations("BookingConfirmation.membershipPayment");
  return (
    <dl className="space-y-2">
      {[
        ["bookingValue", valueMinor],
        ["coveredByMembership", coveredMinor],
        ["additionalPayment", paidMinor],
      ].map(([label, amountMinor]) => (
        <div
          key={label}
          className={
            "flex items-center justify-between gap-4" +
            (label === "additionalPayment"
              ? " text-sm font-semibold text-[var(--tenant-text-on-surface)]"
              : "")
          }
        >
          <dt>{t(label)}</dt>
          <dd className="shrink-0">
            {formatMinorCurrencyAmount(amountMinor, currency, locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function ConfirmationDetails({ data, language }) {
  const confirmation = data?.confirmation ?? data ?? {};
  const bookings = Array.isArray(confirmation.bookings)
    ? confirmation.bookings
    : confirmation.booking
      ? [confirmation.booking]
      : [];
  const items = Array.isArray(confirmation.items) ? confirmation.items : [];
  const totals = confirmation.totals ?? {};
  const totalMinor = Number(
    totals.grossAmountMinor ??
      totals.totalMinor ??
      totals.expectedAmountMinor ??
      confirmation.totalMinor ??
      confirmation.totalAmountMinor,
  );
  const currency = String(
    totals.currency ?? confirmation.currency ?? "CZK",
  ).toUpperCase();
  const allocations = Array.isArray(confirmation.allocations)
    ? confirmation.allocations
    : Array.isArray(confirmation.paymentAllocations)
      ? confirmation.paymentAllocations
      : [];
  const isMembershipAllocation = (allocation) =>
    (allocation?.method ?? allocation?.source ?? allocation?.type) ===
    "membership_credit";
  const membershipCoveredMinor = allocations.reduce(
    (sum, allocation) => sum + Number(allocation?.amountMinor),
    0,
  );
  const isFullyCoveredByMembership =
    allocations.length > 0 &&
    allocations.every(
      (allocation) =>
        isMembershipAllocation(allocation) &&
        Number.isSafeInteger(allocation.amountMinor) &&
        allocation.amountMinor >= 0 &&
        (!allocation.currency || allocation.currency === currency),
    ) &&
    Number.isSafeInteger(totalMinor) &&
    totalMinor >= 0 &&
    membershipCoveredMinor === totalMinor &&
    totals.expectedAmountMinor === 0 &&
    totals.paidAmountMinor === 0;
  if (!bookings.length && !items.length && !Number.isFinite(totalMinor)) {
    return null;
  }
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4">
      <h2 className="text-base font-medium text-[var(--tenant-heading-on-surface)]">
        {language === "CZ" ? "Potvrzené údaje" : "Confirmed details"}
      </h2>

      {bookings.length ? (
        <div className="mt-3 space-y-3">
          {bookings.map((booking, index) => {
            const item = items[index] || {};
            const productName =
              getLocalizedName(
                booking?.product?.name ??
                  booking?.productName ??
                  item?.description ??
                  item?.name ??
                  item?.title,
                language,
              ) || (language === "CZ" ? "Rezervace" : "Booking");
            const location =
              booking?.location && typeof booking.location === "object"
                ? booking.location
                : {};
            const locationName = String(
              location.name ?? booking?.locationName ?? "",
            ).trim();
            const start = booking?.start ?? booking?.startsAt;
            const end = booking?.end ?? booking?.endsAt;
            const timeZone = String(
              location.timeZone ?? location.timezone ?? booking?.timeZone ?? "",
            ).trim();
            const people = Math.max(
              1,
              Number(
                booking?.numberOfGuests ??
                  booking?.participantCount ??
                  booking?.quantity ??
                  item?.quantity ??
                  1,
              ) || 1,
            );
            return (
              <article
                key={booking?.id ?? booking?._id ?? `${start}-${index}`}
                className="min-w-0 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-3"
              >
                <p className="text-sm font-semibold text-[var(--tenant-text-on-surface)]">
                  {productName}
                </p>
                <div className="mt-2 grid gap-2 text-xs leading-4 text-[var(--tenant-muted-on-surface)] sm:grid-cols-2">
                  {start ? (
                    <p className="flex min-w-0 items-start gap-2 sm:col-span-2">
                      <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {formatBookingDateTime(start, language, timeZone)}
                        {end
                          ? ` – ${formatBookingDateTime(end, language, timeZone)}`
                          : ""}
                      </span>
                    </p>
                  ) : null}
                  {locationName ? (
                    <p className="flex min-w-0 items-start gap-2">
                      <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      {locationName}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4 shrink-0" />
                    {language === "CZ" ? "Počet osob" : "Participants"}:{" "}
                    {people}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 space-y-2 border-t border-[var(--tenant-border)] pt-3 text-xs text-[var(--tenant-muted-on-surface)]">
        {isFullyCoveredByMembership ? (
          <MembershipPaymentSummary
            valueMinor={totalMinor}
            coveredMinor={membershipCoveredMinor}
            paidMinor={totals.paidAmountMinor}
            currency={currency}
          />
        ) : (
          <>
            {allocations.map((allocation, index) => {
              const method = String(
                allocation?.label ??
                  allocation?.method ??
                  allocation?.source ??
                  allocation?.type ??
                  "",
              ).replaceAll("_", " ");
              const amountMinor = Number(
                allocation?.amountMinor ?? allocation?.allocatedMinor,
              );
              return (
                <p
                  key={allocation?.id ?? `${method}-${index}`}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex min-w-0 items-center gap-2 capitalize">
                    <BanknotesIcon className="h-4 w-4 shrink-0" />
                    {method ||
                      (language === "CZ" ? "Způsob platby" : "Payment source")}
                  </span>
                  {Number.isFinite(amountMinor) ? (
                    <span className="shrink-0">
                      {formatMinorCurrencyAmount(
                        amountMinor,
                        allocation?.currency ?? currency,
                        language === "CZ" ? "cs" : "en",
                      )}
                    </span>
                  ) : null}
                </p>
              );
            })}
            {Number.isFinite(totalMinor) ? (
              <p className="flex items-center justify-between gap-4 text-sm font-semibold text-[var(--tenant-text-on-surface)]">
                <span>{language === "CZ" ? "Celkem" : "Total"}</span>
                <span className="shrink-0">
                  {formatMinorCurrencyAmount(
                    totalMinor,
                    currency,
                    language === "CZ" ? "cs" : "en",
                  )}
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
