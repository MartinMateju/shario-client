"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
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
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
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
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
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
  }, [language, translation]);
  const reservationNote = useMemo(() => {
    if (!isAuthenticated || state !== "success") return "";
    return legacyText(
      "BookingSuccess_You_can_manage_your_booking_in_the_My_bookings_section_60eb1",
    );
  }, [isAuthenticated, legacyText, state]);
  const statusCopy = useMemo(() => {
    const isCzech = language === "CZ";
    return {
      success: {
        badge: t("CONFIRMED"),
        title: t("SUCCESS_TITLE"),
        description: t("SUCCESS_CONTENT_1"),
        next: t("SUCCESS_CONTENT_2"),
      },
      pending: {
        badge: legacyText("BookingSuccess_Processing_e6345"),
        title: legacyText(
          "BookingSuccess_We_are_confirming_your_payment_c9b64",
        ),
        description: legacyText(
          "BookingSuccess_Your_payment_is_being_processed_We_will_confirm_the_boo_46e80",
        ),
        next: legacyText(
          "BookingSuccess_You_can_leave_this_page_open_the_status_refreshes_autom_2b868",
        ),
      },
      failed: {
        badge: legacyText("BookingSuccess_Not_confirmed_b9e09"),
        title: legacyText("BookingSuccess_The_payment_was_not_completed_a993b"),
        description: legacyText(
          "BookingSuccess_The_booking_was_not_confirmed_Your_cart_was_kept_so_you_73aa5",
        ),
        next: legacyText(
          "BookingSuccess_If_you_were_charged_anyway_contact_the_studio_and_inclu_73483",
        ),
      },
      unavailable: {
        badge: legacyText("BookingSuccess_Unable_to_verify_43e97"),
        title: legacyText(
          "BookingSuccess_We_cannot_verify_the_status_yet_278a5",
        ),
        description: legacyText(
          "BookingSuccess_The_order_status_could_not_be_loaded_This_does_not_mean_d1477",
        ),
        next: legacyText(
          "BookingSuccess_Try_checking_the_status_again_Your_cart_remains_intact_b97b0",
        ),
      },
      invalid: {
        badge: legacyText("BookingSuccess_Unable_to_verify_43e97"),
        title: legacyText(
          "BookingSuccess_The_order_reference_is_missing_7c577",
        ),
        description: legacyText(
          "BookingSuccess_This_return_link_has_no_valid_order_reference_so_the_bo_69ea4",
        ),
        next: legacyText(
          "BookingSuccess_We_kept_your_cart_Return_to_the_portal_or_contact_the_s_b05de",
        ),
      },
    }[state];
  }, [language, legacyText, state, t]);
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
      : legacyText("BookingSuccess_Back_to_portal_0633f")
    : legacyText("BookingSuccess_Back_to_home_34ac3");
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
                    ? legacyText("BookingSuccess_Checking_status_c74a3")
                    : legacyText(
                        "BookingSuccess_Waiting_for_confirmation_ce436",
                      )}
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
                  {t("WHAT_HAPPENS_NEXT")}
                </h2>
              </div>

              <div className="mt-3 space-y-3 text-sm leading-5 text-[var(--tenant-text-on-surface)]">
                <p>{statusCopy.next}</p>
                {reservationNote && <p>{reservationNote}</p>}
                {orderId && (
                  <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                    {legacyText("BookingSuccess_Order_1d757")}:{" "}
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
                  {legacyText("BookingSuccess_Check_again_e1850")}
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
    return new Intl.DateTimeFormat(resolveIntlLocale(language), {
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
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const paymentT = useTranslations();
  const paymentLabelKeys = {
    card: "Legacy.screens.cartPayment.card",
    stripe: "Legacy.screens.cartPayment.card",
    credits: "Legacy.screens.cartPayment.money_credits",
    studio_credit: "Legacy.screens.cartPayment.money_credits",
    money_credits: "Legacy.screens.cartPayment.money_credits",
    membership_credit: "Legacy.screens.cartPayment.membership_credits",
    membership_credits: "Legacy.screens.cartPayment.membership_credits",
    voucher: "Legacy.copy.VoucherForm_Voucher_409ca",
    manual: "Invoices.payments.methods.manual",
    free: "People.membershipDialog.reasons.complimentary",
  };
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
        {legacyText("ConfirmationDetails_Confirmed_details_f7c49")}
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
              ) || legacyText("ConfirmationDetails_Booking_e38ea");
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
                        {formatBookingDateTime(start, activeLocale, timeZone)}
                        {end
                          ? ` – ${formatBookingDateTime(end, activeLocale, timeZone)}`
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
                    {legacyText("ConfirmationDetails_Participants_cd56e")}:{" "}
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
              const methodCode = String(
                allocation?.method ??
                  allocation?.source ??
                  allocation?.type ??
                  "",
              )
                .trim()
                .toLowerCase();
              const method = Object.hasOwn(paymentLabelKeys, methodCode)
                ? paymentT(paymentLabelKeys[methodCode])
                : legacyText("ConfirmationDetails_Payment_source_31c56");
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
                      legacyText("ConfirmationDetails_Payment_source_31c56")}
                  </span>
                  {Number.isFinite(amountMinor) ? (
                    <span className="shrink-0">
                      {formatMinorCurrencyAmount(
                        amountMinor,
                        allocation?.currency ?? currency,
                        activeLocale,
                      )}
                    </span>
                  ) : null}
                </p>
              );
            })}
            {Number.isFinite(totalMinor) ? (
              <p className="flex items-center justify-between gap-4 text-sm font-semibold text-[var(--tenant-text-on-surface)]">
                <span>{legacyText("ConfirmationDetails_Total_b2592")}</span>
                <span className="shrink-0">
                  {formatMinorCurrencyAmount(
                    totalMinor,
                    currency,
                    activeLocale,
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
