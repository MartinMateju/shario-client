"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  MapPinIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { Link, useRouter } from "@/i18n/navigation";
import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import {
  bookingPaymentOptionCoversTotal,
  getSafeBookingIntentToken,
  useCheckoutBookingIntentMutation,
  useGetBookingIntentQuery,
} from "@/lib/features/bookingIntents/bookingIntentsApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { formatMembershipMinutes } from "@/components/memberships/membership.utils";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { getBookingLocationReference } from "@/utils/customerCheckoutLocation";
import {
  getPortalLocationReferenceFromSearchParams,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";

const getEntityId = (value) =>
  String(value?.id ?? value?._id ?? value ?? "").trim();

const getLocalizedText = (value, locale) => {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const language = locale === "cs" ? "CS" : "EN";
  return String(
    value[locale] ??
      value[language] ??
      value[language.toLowerCase()] ??
      value.EN ??
      value.CS ??
      value.CZ ??
      "",
  ).trim();
};

const getProductName = (intent, locale) =>
  getLocalizedText(intent?.product?.name, locale) ||
  getLocalizedText(intent?.productName, locale) ||
  "";

const getLocationName = (intent) =>
  String(intent?.location?.name ?? intent?.locationName ?? "").trim();

const formatDateTime = (value, locale, timeZone) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return formatDateTime(value, locale, "");
  }
};

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `booking-${crypto.randomUUID()}`;
  }

  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const paymentIcon = {
  card: CreditCardIcon,
  money_credits: BanknotesIcon,
  membership_credits: IdentificationIcon,
};

export default function CustomerBookingConfirmationPage() {
  const t = useTranslations("BookingConfirmation");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const token = getSafeBookingIntentToken(searchParams.get("intent"));
  const query = useGetBookingIntentQuery(
    { token },
    {
      skip: !token,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const [checkout, checkoutState] = useCheckoutBookingIntentMutation();
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyKey = useRef(createIdempotencyKey());

  const data = query.data;
  const intent = data?.intent ?? {};
  const quote = data?.quote ?? {};
  const totalMinor = Number(quote.totalMinor || 0);
  const paymentOptions = useMemo(
    () =>
      (data?.paymentOptions ?? []).map((option) => {
        return {
          ...option,
          selectable: bookingPaymentOptionCoversTotal(option, totalMinor),
        };
      }),
    [data?.paymentOptions, totalMinor],
  );
  const selectedOption =
    paymentOptions.find(
      (option) => option.optionId === selectedOptionId && option.selectable,
    ) ||
    paymentOptions.find(
      (option) => option.method === "card" && option.selectable,
    ) ||
    paymentOptions.find((option) => option.selectable) ||
    null;
  const effectiveMethod = selectedOption?.method || "";
  const available = data?.availability?.available !== false && !data?.conflict;
  const timeZone = String(
    intent?.location?.timeZone ??
      intent?.location?.timezone ??
      data?.availability?.timeZone ??
      "",
  ).trim();
  const productType = String(intent?.product?.type ?? intent?.productType ?? "")
    .trim()
    .toLowerCase();
  const backHref = productType.includes("course")
    ? `/courses/${encodeURIComponent(
        getEntityId(intent.product) || intent.productId,
      )}`
    : `/book/${encodeURIComponent(
        getEntityId(intent.product) || intent.productId,
      )}`;
  const termsRequired = data?.termsRequired || Boolean(data?.terms);
  const canSubmit =
    token &&
    available &&
    effectiveMethod &&
    (!termsRequired || termsAccepted) &&
    !checkoutState.isLoading;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitError("");

    try {
      const response = await checkout({
        token,
        idempotencyKey: idempotencyKey.current,
        paymentMethod: effectiveMethod,
        termsAccepted: termsRequired ? termsAccepted : true,
        locale,
        origin: window.location.origin,
        membershipBenefitKey: selectedOption?.benefitKey,
      }).unwrap();
      const orderId = String(
        response?.orderId ?? response?.order?.id ?? response?.order?._id ?? "",
      ).trim();
      const responseStatus = String(response?.status || "")
        .trim()
        .toLowerCase();
      const requiresCardPayment =
        responseStatus !== "confirmed" &&
        (selectedOption?.method === "card" ||
          responseStatus === "requires_payment");

      if (!requiresCardPayment && orderId) {
        router.replace(
          retainCustomerPortalLocation(
            `/portal/success?orderId=${encodeURIComponent(orderId)}`,
            getPortalLocationReferenceFromSearchParams(searchParams) ||
              getBookingLocationReference(intent),
          ),
        );
        return;
      }

      if (requiresCardPayment) {
        const checkoutUrl = getSafeCheckoutUrl(
          response?.url ?? response?.checkoutUrl,
        );
        if (checkoutUrl) {
          window.location.assign(checkoutUrl);
          return;
        }
      }

      throw new Error("Missing checkout result.");
    } catch (error) {
      const code = String(error?.data?.code ?? "").toUpperCase();
      if (
        error?.status === 409 ||
        [
          "BOOKING_UNAVAILABLE",
          "BOOKING_INTENT_CONFLICT",
          "COURSE_CAPACITY_EXCEEDED",
          "PRICE_CHANGED",
        ].includes(code)
      ) {
        setSubmitError(t("errors.changed"));
        idempotencyKey.current = createIdempotencyKey();
        void query.refetch();
        return;
      }

      if (error?.status === 410 || code === "BOOKING_INTENT_EXPIRED") {
        setSubmitError(t("errors.expired"));
        return;
      }

      setSubmitError(
        error?.data?.message || error?.message || t("errors.generic"),
      );
    }
  };

  if (!token) {
    return (
      <BookingState
        icon={ExclamationTriangleIcon}
        title={t("invalid.title")}
        description={t("invalid.description")}
        actionHref="/book"
        actionLabel={t("invalid.action")}
      />
    );
  }

  if (query.isLoading || (query.isFetching && !data)) {
    return (
      <BookingState
        loading
        icon={ArrowPathIcon}
        title={t("loading.title")}
        description={t("loading.description")}
      />
    );
  }

  if (query.isError) {
    const errorCode = String(query.error?.data?.code || "").toUpperCase();
    if (
      query.error?.status === 403 &&
      errorCode === "EMAIL_VERIFICATION_REQUIRED"
    ) {
      const currentPath = `/portal/booking/confirm?intent=${encodeURIComponent(
        token,
      )}`;
      const email = String(currentUser?.email || "")
        .trim()
        .toLowerCase();
      const verificationHref = `/verify-email?${
        email ? `email=${encodeURIComponent(email)}&` : ""
      }next=${encodeURIComponent(currentPath)}`;

      return (
        <BookingState
          icon={EnvelopeIcon}
          title={t("verificationRequired.title")}
          description={t("verificationRequired.description")}
          actionHref={verificationHref}
          actionLabel={t("verificationRequired.action")}
        />
      );
    }

    const expired =
      query.error?.status === 410 ||
      query.error?.data?.code === "BOOKING_INTENT_EXPIRED";
    return (
      <BookingState
        icon={ExclamationTriangleIcon}
        title={t(expired ? "expired.title" : "loadError.title")}
        description={t(
          expired ? "expired.description" : "loadError.description",
        )}
        actionHref="/book"
        actionLabel={t(expired ? "expired.action" : "loadError.action")}
        onRetry={expired ? undefined : query.refetch}
        retryLabel={t("loadError.retry")}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--tenant-muted-text)] hover:text-[var(--tenant-text)]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t("back")}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-6 shadow-[0_18px_54px_rgba(17,17,15,0.05)] sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-accent-on-surface)]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[var(--tenant-heading-on-surface)]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
              {t("description")}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <SummaryCard
                icon={CalendarDaysIcon}
                label={t("summary.time")}
                value={formatDateTime(intent.start, locale, timeZone)}
                detail={
                  intent.end
                    ? `${t("summary.until")} ${formatDateTime(
                        intent.end,
                        locale,
                        timeZone,
                      )}`
                    : ""
                }
              />
              <SummaryCard
                icon={MapPinIcon}
                label={t("summary.location")}
                value={getLocationName(intent) || t("summary.locationFallback")}
              />
              <SummaryCard
                icon={UserGroupIcon}
                label={t("summary.people")}
                value={String(
                  quote.participantCount ??
                    intent.numberOfGuests ??
                    intent.quantity ??
                    1,
                )}
              />
              <SummaryCard
                icon={CheckCircleIcon}
                label={t("summary.product")}
                value={
                  getProductName(intent, locale) || t("summary.productFallback")
                }
              />
              {["public", "private"].includes(
                intent.bookingMode ?? intent.bookingType,
              ) && (
                <SummaryCard
                  icon={UserGroupIcon}
                  label={t("summary.bookingMode")}
                  value={t(
                    `summary.bookingModes.${intent.bookingMode ?? intent.bookingType}`,
                  )}
                />
              )}
            </div>

            {!available ? (
              <ConflictPanel
                conflict={data?.conflict}
                alternatives={data?.availability?.alternatives}
                backHref={backHref}
              />
            ) : (
              <div className="mt-6 rounded-[17px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                <p className="font-semibold">{t("available.title")}</p>
                <p className="mt-0.5">{t("available.description")}</p>
              </div>
            )}
          </section>

          <form
            onSubmit={submit}
            className="h-fit rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-6 shadow-[0_18px_54px_rgba(17,17,15,0.05)]"
          >
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--tenant-heading-on-surface)]">
              {t("payment.title")}
            </h2>

            <div className="mt-5 space-y-3">
              {paymentOptions.length ? (
                paymentOptions.map((option) => {
                  const Icon = paymentIcon[option.method] || CreditCardIcon;
                  const selected = option.optionId === selectedOption?.optionId;
                  return (
                    <label
                      key={option.optionId}
                      className={`flex items-start gap-3 rounded-[16px] border p-4 ${
                        selected
                          ? "border-[var(--tenant-accent-on-surface)] bg-[var(--tenant-surface)] ring-1 ring-[var(--tenant-accent-on-surface)]"
                          : "border-[var(--tenant-border)]"
                      } ${option.selectable ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.optionId}
                        checked={selected}
                        disabled={!option.selectable}
                        onChange={() => {
                          setSelectedOptionId(option.optionId);
                          setSubmitError("");
                        }}
                        className="mt-1"
                      />
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold">
                          {(option.method === "membership_credits" &&
                          option.unit === "minute"
                            ? t("payment.membershipHours")
                            : option.label) ||
                            t(`payment.methods.${option.method}`)}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                          {option.method === "membership_credits" &&
                          option.unit === "minute" &&
                          option.selectable
                            ? t("payment.hoursSummary", {
                                required: formatMembershipMinutes(
                                  option.required,
                                  locale,
                                ),
                                available: formatMembershipMinutes(
                                  option.availableUnits,
                                  locale,
                                ),
                              })
                            : t(
                                option.selectable
                                  ? `payment.descriptions.${option.method}`
                                  : [
                                        "membership_open_studio_only",
                                        "membership_member_only",
                                        "membership_insufficient_hours",
                                        "membership_outside_paid_period",
                                      ].includes(option.unavailableReason)
                                    ? `payment.${option.unavailableReason}`
                                    : option.unavailableReason ===
                                        "private_booking_surcharge_requires_money"
                                      ? "payment.privateSurchargeRequiresMoney"
                                      : "payment.notEnough",
                              )}
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  {t("payment.unavailable")}
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2 border-t border-[var(--tenant-border)] pt-5 text-xs">
              {quote.privateBookingSurchargeMinor > 0 && (
                <PriceRow
                  label={t("price.privateBookingSurcharge")}
                  value={formatMinorCurrencyAmount(
                    quote.privateBookingSurchargeMinor,
                    quote.currency,
                    locale,
                  )}
                />
              )}
              {quote.subtotalMinor !== quote.totalMinor ? (
                <PriceRow
                  label={t("price.subtotal")}
                  value={formatMinorCurrencyAmount(
                    quote.subtotalMinor,
                    quote.currency,
                    locale,
                  )}
                />
              ) : null}
              {quote.discountMinor > 0 ? (
                <PriceRow
                  label={t("price.membershipDiscount")}
                  value={`−${formatMinorCurrencyAmount(
                    quote.discountMinor,
                    quote.currency,
                    locale,
                  )}`}
                  positive
                />
              ) : null}
              <PriceRow
                label={t("price.total")}
                value={formatMinorCurrencyAmount(
                  quote.totalMinor,
                  quote.currency,
                  locale,
                )}
                strong
              />
              <p className="pt-1 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
                {t("price.serverVerified")}
              </p>
            </div>

            {data?.terms ? (
              <div className="mt-5">
                <details className="rounded-[14px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] px-4 py-3 text-[10px] leading-5 text-[var(--tenant-muted-on-surface)]">
                  <summary className="cursor-pointer font-semibold text-[var(--tenant-text-on-surface)]">
                    {t("terms.title")}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{data.terms}</p>
                </details>
                <label className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[var(--tenant-text-on-surface)]">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      setSubmitError("");
                    }}
                    className="mt-1"
                  />
                  {t("terms.accept")}
                </label>
              </div>
            ) : null}

            {submitError ? (
              <p
                className="mt-4 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`${customerPortalPrimaryActionClass} mt-6 w-full`}
            >
              {checkoutState.isLoading
                ? t("payment.processing")
                : selectedOption?.method === "card"
                  ? t("payment.continueToCard")
                  : t("payment.confirm")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, detail = "" }) {
  return (
    <div className="rounded-[17px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-4">
      <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--tenant-text-on-surface)]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function PriceRow({ label, value, strong = false, positive = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? "pt-2 text-base font-semibold" : ""
      } ${positive ? "text-[var(--tenant-accent-on-surface)]" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ConflictPanel({ conflict, alternatives = [], backHref }) {
  const t = useTranslations("BookingConfirmation");
  const locale = useLocale();
  return (
    <div className="mt-6 rounded-[18px] border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {t("conflict.title")}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            {conflict?.message || t("conflict.description")}
          </p>
        </div>
      </div>
      {alternatives.length ? (
        <ul className="mt-4 space-y-2">
          {alternatives.slice(0, 3).map((alternative, index) => (
            <li
              key={
                alternative.id ||
                `${alternative.start || "alternative"}-${index}`
              }
              className="rounded-[12px] bg-white px-3 py-2 text-[10px] text-amber-900"
            >
              {formatDateTime(alternative.start, locale, alternative.timeZone)}
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={backHref}
        data-tenant-button="primary"
        className={`${customerPortalPrimaryActionClass} mt-4`}
      >
        {t("conflict.chooseAnother")}
      </Link>
    </div>
  );
}

function BookingState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  loading = false,
  onRetry,
  retryLabel,
}) {
  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-14">
      <section className="w-full max-w-lg rounded-[25px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-8 text-center shadow-sm">
        <Icon
          className={`mx-auto h-10 w-10 text-[var(--tenant-accent-on-surface)] ${
            loading ? "animate-spin" : ""
          }`}
        />
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--tenant-heading-on-surface)]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={customerPortalSecondaryActionClass}
            >
              {retryLabel}
            </button>
          ) : null}
          {actionHref ? (
            <Link
              href={actionHref}
              data-tenant-button="primary"
              className={customerPortalPrimaryActionClass}
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
