"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MapPinIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import {
  formatProductPrice,
  getProductDescription,
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import { EMAIL_REGEX, PHONE_REGEX } from "@/config/constants";
import { Link, useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { useCreatePublicBookingIntentMutation } from "@/lib/features/bookingIntents/bookingIntentsApiSlice";
import {
  useGuestCheckoutMutation,
  useQuoteGuestCourseVoucherMutation,
} from "@/lib/features/checkout/checkoutSlice";
import { useGetPublicProductQuery } from "@/lib/features/products/productsApiSlice";
import {
  useGetPublicBookingAvailabilityQuery,
  useGetPublicBookingLocationsQuery,
  useGetPublicCourseSessionsQuery,
} from "@/lib/features/publicBooking/publicBookingApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { formatMinorCurrencyAmount } from "@/utils/money";
import {
  getGuestVoucherQuoteExpectation,
  normalizeGuestVoucherCode,
} from "@/components/courses/guestVoucherQuote";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import { getUserAccess } from "@/utils/user-profile.utils";
import CourseWaitlistAction from "@/components/waitlists/CourseWaitlistAction";
import usePublicCourseLocation, {
  retainPublicCourseLocation,
} from "@/components/courses/usePublicCourseLocation";
import {
  getCourseName,
  getCourseDescription,
  getCourseDetails,
  getCourseDurationLabel,
  isCourseSessionBookable,
} from "@/components/courses/customerCourses.utils";
import CourseProductGallery from "@/components/courses/CourseProductGallery";
import {
  clearGuestCheckoutAttempt,
  getConfirmedGuestCheckoutHref,
  getGuestCheckoutAttempt,
  getGuestCheckoutOrderId,
  isGuestCheckoutAccessToken,
  storeGuestCheckoutAccess,
} from "@/components/courses/guestCheckoutAccess";

import PublicCapabilityGate from "./PublicCapabilityGate";
import { usePublicTenant } from "./PublicTenantProvider";
import {
  getPublicTenantTheme,
  normalizePublicTenantUrl,
} from "./publicTenant.config";
import {
  getPublicCatalogProductKind,
  isPublicCatalogProduct,
} from "./publicProductTaxonomy";
import {
  PRODUCT_KIND,
  getProductLocationId,
  getOpenStudioGuestLimit,
  getOpenStudioPrivateSurcharge,
  isCustomerChoiceOpenStudio,
  resolveOpenStudioBookingMode,
} from "@/lib/features/products/products.contract.mjs";
import { formatBookingPrice } from "@/components/sidebars/openStudioBooking.utils";

const todayValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const EMPTY_LIST = Object.freeze([]);

const getEntityId = (value) => {
  const candidate =
    value && typeof value === "object" ? (value.id ?? value._id) : value;
  return typeof candidate === "string" || typeof candidate === "number"
    ? String(candidate).trim()
    : "";
};

const getLocationName = (value, fallback) =>
  String(value?.name ?? value?.title ?? "").trim() || fallback;

const getTimeZone = (value) =>
  String(value?.timeZone ?? value?.timezone ?? "").trim();

export const isPublicProductKind = (product, kind) =>
  isPublicCatalogProduct(product, kind);

const formatSlot = (slot, locale, timeZone) => {
  const start = new Date(slot?.start || "");
  const end = new Date(slot?.end || "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const resolvedLocale = locale === "cs" ? "cs-CZ" : "en-GB";
  try {
    const dateFormatter = new Intl.DateTimeFormat(resolvedLocale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(timeZone ? { timeZone } : {}),
    });
    const timeFormatter = new Intl.DateTimeFormat(resolvedLocale, {
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    });

    return `${dateFormatter.format(start)} · ${timeFormatter.format(
      start,
    )}–${timeFormatter.format(end)}`;
  } catch {
    return formatSlot(slot, locale, "");
  }
};

function StatusPanel({ loading, error, onRetry, children }) {
  const t = useTranslations("PublicTenant.details");

  if (loading) {
    return (
      <div
        className="flex min-h-56 items-center justify-center rounded-[22px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-sm text-[var(--tenant-muted-on-surface)]"
        role="status"
      >
        <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-[22px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 text-center text-[var(--tenant-text-on-surface)]">
        <p className="text-sm text-[var(--tenant-muted-on-surface)]">
          {t("error")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-[var(--tenant-border)] px-5 py-2.5 text-xs font-semibold transition hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)]"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return children;
}

function SlotPicker({
  slots,
  selectedId,
  onSelect,
  locale,
  timeZone,
  course = false,
  tenantSlug = "",
  productId = "",
  locationReference = "",
  onBookingAvailable,
}) {
  const t = useTranslations("PublicTenant.details");

  if (!slots.length) {
    return (
      <div className="rounded-[18px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-10 text-center text-sm text-[var(--tenant-muted-text)]">
        {t(course ? "noCourseSessions" : "noSlots")}
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{t("chooseTime")}</legend>
      {slots.map((slot) => {
        const id = getEntityId(slot) || `${slot.start}:${slot.end}`;
        const remaining = slot.remainingCapacity;
        const available = slot.available !== false && remaining !== 0;
        const locationName = getLocationName(slot.location, "");

        const details = (
          <>
            <input
              type="radio"
              name={course ? "course-session" : "booking-slot"}
              value={id}
              checked={selectedId === id}
              disabled={!available}
              onChange={() => onSelect(slot)}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--tenant-text)]">
                {formatSlot(
                  slot,
                  locale,
                  getTimeZone(slot.location) || timeZone,
                )}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--tenant-muted-text)]">
                {locationName ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-3.5 w-3.5" />
                    {locationName}
                  </span>
                ) : null}
                {slot.language ? (
                  <span>{String(slot.language).toUpperCase()}</span>
                ) : null}
                {remaining !== null && remaining !== undefined ? (
                  <span>
                    {t("remaining", {
                      count: remaining,
                    })}
                  </span>
                ) : null}
              </span>
            </span>
          </>
        );

        if (available) {
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-start gap-3 rounded-[18px] border bg-[var(--tenant-background)] px-4 py-4 transition hover:border-[var(--tenant-accent-link)] ${
                selectedId === id
                  ? "border-[var(--tenant-accent-link)] ring-2 ring-[var(--tenant-accent-link)]/10"
                  : "border-[var(--tenant-border)]"
              }`}
            >
              {details}
            </label>
          );
        }

        return (
          <div
            key={id}
            className="rounded-[18px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-4 py-4"
            data-full-course-session
          >
            <div className="flex items-start gap-3">{details}</div>
            {course ? (
              <CourseWaitlistAction
                session={slot}
                tenantSlug={tenantSlug}
                returnPath={retainPublicCourseLocation(
                  `/courses/${encodeURIComponent(productId)}?courseSessionId=${encodeURIComponent(id)}`,
                  locationReference || getEntityId(slot.location),
                )}
                onBookingAvailable={(availableSlot) => {
                  onSelect(availableSlot);
                  onBookingAvailable?.();
                }}
              />
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}

function GuestCourseCheckout({
  product,
  session,
  quantity,
  setQuantity,
  tenantSlug,
  locale,
}) {
  const t = useTranslations("PublicTenant.guestCheckout");
  const legalLabels = useTranslations("PublicTenant.legal");
  const { previewMode, tenant } = usePublicTenant();
  const legalLinks = ["terms", "cancellation"]
    .map((key) => ({
      key,
      href: normalizePublicTenantUrl(tenant?.publicSite?.footer?.legal?.[key]),
    }))
    .filter(({ href }) => href);
  const hasTerms = legalLinks.length > 0;
  const termsKey = JSON.stringify({ locale, legalLinks });
  const [guestCheckout, { isLoading }] = useGuestCheckoutMutation();
  const [quoteVoucher, { isLoading: isQuoting }] =
    useQuoteGuestCourseVoucherMutation();
  const [promoCode, setPromoCode] = useState("");
  const [voucherQuote, setVoucherQuote] = useState(null);
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [acceptedTermsKey, setAcceptedTermsKey] = useState("");
  const termsAccepted = hasTerms && acceptedTermsKey === termsKey;
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const activeRequest = useRef(false);
  const checkoutAttempt = useRef(null);
  const mounted = useRef(true);
  const activeQuoteRequest = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const maxPeople = Math.max(
    1,
    Math.min(
      20,
      Number(session?.remainingCapacity) || 1,
      Number(session?.capacity) || Number(session?.remainingCapacity) || 12,
    ),
  );
  const normalizedPromoCode = normalizeGuestVoucherCode(promoCode);
  const voucherSelection = JSON.stringify({
    productId: getProductId(product),
    sessionId: getEntityId(session),
    locationId: getEntityId(session?.location),
    quantity,
    promoCode: normalizedPromoCode,
  });
  const reviewedQuote =
    voucherQuote?.selection === voucherSelection
      ? getGuestVoucherQuoteExpectation(voucherQuote.quote)
      : null;
  const fullyCovered = reviewedQuote?.remainingToPayMinor === 0;

  const checkVoucher = async () => {
    if (
      previewMode ||
      activeQuoteRequest.current ||
      activeRequest.current ||
      !normalizedPromoCode
    )
      return;
    setError("");
    setVoucherQuote(null);
    activeQuoteRequest.current = true;
    try {
      const quote = await quoteVoucher({
        tenantSlug,
        locale,
        promoCode: normalizedPromoCode,
        cart: [
          {
            product: {
              _id: getProductId(product),
              type: product.type || "public-course",
              kind: "class",
            },
            bookingCourse: getEntityId(session),
            quantity,
            numberOfGuests: quantity,
            guests: Array.from({ length: quantity - 1 }, () => ({})),
            ...(getEntityId(session?.location)
              ? { locationId: getEntityId(session.location) }
              : {}),
          },
        ],
      }).unwrap();
      if (!mounted.current) return;
      if (!getGuestVoucherQuoteExpectation(quote)) {
        setError(t("voucherError"));
        return;
      }
      setVoucherQuote({ selection: voucherSelection, quote });
    } catch (quoteError) {
      if (mounted.current)
        setError(
          t(quoteError?.status === 429 ? "voucherRateLimited" : "voucherError"),
        );
    } finally {
      activeQuoteRequest.current = false;
    }
  };

  const updateGuestInfo = (key, value) => {
    setGuestInfo((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const changeQuantity = (value) => {
    setQuantity(value);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (
      previewMode ||
      activeRequest.current ||
      activeQuoteRequest.current ||
      isLoading
    )
      return;
    setError("");

    const validName = (name) =>
      name.trim().length > 0 &&
      name.trim().length <= 80 &&
      !/[\r\n\x00-\x1f]/.test(name);
    const validContact =
      validName(guestInfo.firstName) &&
      validName(guestInfo.lastName) &&
      EMAIL_REGEX.test(guestInfo.email.trim().toLowerCase()) &&
      (!guestInfo.phone.trim() || PHONE_REGEX.test(guestInfo.phone.trim()));
    if (!validContact) {
      setError(t("validationError"));
      return;
    }

    if (hasTerms && !termsAccepted) {
      setError(t("termsRequired"));
      return;
    }
    if (normalizedPromoCode && !reviewedQuote) {
      setError(t("voucherReviewRequired"));
      return;
    }

    if (
      !isCourseSessionBookable(session) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > maxPeople
    ) {
      setError(t("checkoutError"));
      return;
    }

    const productId = getProductId(product);
    const sessionId = getEntityId(session);
    const locationId = getEntityId(session.location);
    const normalizedGuestInfo = {
      firstName: guestInfo.firstName.trim(),
      lastName: guestInfo.lastName.trim(),
      email: guestInfo.email.trim().toLowerCase(),
      phone: guestInfo.phone.trim(),
    };
    const cartItem = {
      title: getCourseName(product, locale),
      start: session.start,
      end: session.end,
      date: session.start,
      product: {
        ...product,
        _id: productId,
        type: product.type || "public-course",
      },
      quantity,
      numberOfGuests: quantity,
      guests: Array.from({ length: quantity - 1 }, () => ({})),
      bookingCourse: sessionId,
      bookingRef: sessionId,
      bookingProduct: productId,
      language: session.language || locale,
      ...(locationId ? { locationId } : {}),
      ...(termsAccepted ? { termsAccepted: true } : {}),
    };

    activeRequest.current = true;
    setPreparing(true);
    try {
      const selection = {
        productId,
        sessionId,
        locationId,
        quantity,
        locale,
        guestInfo: normalizedGuestInfo,
        termsAccepted,
        ...(hasTerms ? { legalLinks } : {}),
        ...(normalizedPromoCode
          ? {
              promoCode: normalizedPromoCode,
              expectedVoucherQuote: reviewedQuote,
            }
          : {}),
      };
      const fingerprint = JSON.stringify(selection);
      if (checkoutAttempt.current?.fingerprint !== fingerprint) {
        checkoutAttempt.current = {
          ...(await getGuestCheckoutAttempt({ tenantSlug, selection })),
          fingerprint,
        };
      }
      if (!mounted.current) return;
      const response = await guestCheckout({
        tenantSlug,
        locale,
        cart: [cartItem],
        guestInfo: normalizedGuestInfo,
        idempotencyKey: checkoutAttempt.current.key,
        ...(termsAccepted ? { acceptedTerms: true } : {}),
        ...(normalizedPromoCode
          ? {
              promoCode: normalizedPromoCode,
              expectedVoucherQuote: reviewedQuote,
            }
          : {}),
      }).unwrap();

      if (!mounted.current) return;
      const checkoutUrl =
        response?.status === "confirmed"
          ? getConfirmedGuestCheckoutHref({
              orderId: response.orderId,
              accessToken: response.accessToken,
              locale,
              productId,
              courseSessionId: sessionId,
              location: locationId,
              quantity,
            })
          : typeof response?.url === "string" && response.url.trim()
            ? getSafeCheckoutUrl(response.url)
            : "";

      if (
        !checkoutUrl ||
        !getGuestCheckoutOrderId(response?.orderId) ||
        !isGuestCheckoutAccessToken(response?.accessToken)
      ) {
        setError(t("checkoutError"));
        return;
      }

      storeGuestCheckoutAccess({
        tenantSlug,
        orderId: response.orderId,
        accessToken: response.accessToken,
      });
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      if (!mounted.current) return;
      if (checkoutError?.data?.code === "GUEST_CHECKOUT_ATTEMPT_EXPIRED") {
        clearGuestCheckoutAttempt(checkoutAttempt.current);
        checkoutAttempt.current = null;
        setError(t("attemptExpired"));
      } else if (
        [
          "VOUCHER_QUOTE_CHANGED",
          "VOUCHER_BALANCE_CHANGED",
          "VOUCHER_QUOTE_REQUIRED",
        ].includes(checkoutError?.data?.code)
      ) {
        setVoucherQuote(null);
        clearGuestCheckoutAttempt(checkoutAttempt.current);
        checkoutAttempt.current = null;
        setError(t("voucherChanged"));
      } else if (checkoutError?.data?.code?.startsWith("VOUCHER_")) {
        setVoucherQuote(null);
        setError(
          t(
            checkoutError?.status === 429
              ? "voucherRateLimited"
              : "voucherError",
          ),
        );
      } else {
        setError(t("checkoutError"));
      }
    } finally {
      activeRequest.current = false;
      if (mounted.current) setPreparing(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-[22px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-5 text-[var(--tenant-text)]"
      data-tenant-layout="card"
      data-tenant-surface="panel"
    >
      <h3
        className="text-lg font-semibold tracking-[-0.03em]"
        data-tenant-type="display"
      >
        {t("title")}
      </h3>
      <p className="mt-2 text-xs leading-5 text-[var(--tenant-muted-text)]">
        {t("description")}
      </p>

      <label className="mt-5 block text-xs font-semibold text-[var(--tenant-label-color)]">
        {t("people")}
        <select
          value={quantity}
          disabled={preparing || isLoading || isQuoting}
          onChange={(event) => changeQuantity(Number(event.target.value))}
          data-tenant-surface="field"
          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-sm text-[var(--tenant-text-on-surface)]"
        >
          {Array.from({ length: maxPeople }, (_, index) => index + 1).map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
        </select>
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {["firstName", "lastName", "email", "phone"].map((field) => (
          <label
            key={field}
            className="text-xs font-semibold text-[var(--tenant-label-color)]"
          >
            {t(field)}
            <input
              type={
                field === "email" ? "email" : field === "phone" ? "tel" : "text"
              }
              value={guestInfo[field]}
              onChange={(event) => updateGuestInfo(field, event.target.value)}
              required={field !== "phone"}
              maxLength={field === "email" ? 254 : field === "phone" ? 40 : 80}
              disabled={preparing || isLoading}
              autoComplete={
                field === "firstName"
                  ? "given-name"
                  : field === "lastName"
                    ? "family-name"
                    : field === "email"
                      ? "email"
                      : "tel"
              }
              data-tenant-surface="field"
              className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-sm text-[var(--tenant-text-on-surface)]"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-[14px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 text-[var(--tenant-text-on-surface)]">
        <label
          className="block text-xs font-semibold"
          htmlFor="guest-course-voucher"
        >
          {t("voucherCode")}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="guest-course-voucher"
            value={promoCode}
            onChange={(event) => {
              setPromoCode(event.target.value);
              setVoucherQuote(null);
              setError("");
            }}
            maxLength={64}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={preparing || isLoading || isQuoting}
            aria-describedby="guest-course-voucher-help"
            data-tenant-surface="field"
            className="min-h-11 min-w-0 flex-1 rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
          />
          <button
            type="button"
            onClick={checkVoucher}
            disabled={
              previewMode ||
              preparing ||
              isLoading ||
              isQuoting ||
              !normalizedPromoCode
            }
            className="min-h-11 rounded-[13px] border border-[var(--tenant-border)] px-4 text-xs font-semibold disabled:opacity-50"
          >
            {isQuoting ? t("checkingVoucher") : t("checkVoucher")}
          </button>
        </div>
        <p
          id="guest-course-voucher-help"
          className="mt-2 text-xs leading-5 text-[var(--tenant-muted-on-surface)]"
        >
          {t("voucherHelp")}
        </p>
        {reviewedQuote ? (
          <div className="mt-3" role="status">
            <dl className="space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt>{t("voucherDiscount")}</dt>
                <dd>
                  {formatMinorCurrencyAmount(
                    reviewedQuote.voucherAppliedMinor,
                    reviewedQuote.currency,
                    locale,
                  )}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 font-semibold">
                <dt>{t("remainingToPay")}</dt>
                <dd>
                  {formatMinorCurrencyAmount(
                    reviewedQuote.remainingToPayMinor,
                    reviewedQuote.currency,
                    locale,
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
              {t(fullyCovered ? "voucherCoversAll" : "voucherPartial")}
            </p>
          </div>
        ) : null}
      </div>

      {hasTerms ? (
        <div className="mt-5">
          <div className="rounded-[14px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-3 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
            <p className="font-semibold text-[var(--tenant-text-on-surface)]">
              {t("terms")}
            </p>
            <ul className="mt-2 space-y-2">
              {legalLinks.map(({ key, href }) => {
                const PolicyLink = href.startsWith("/") ? Link : "a";
                return (
                  <li key={key}>
                    <PolicyLink
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {legalLabels(key)}
                    </PolicyLink>
                  </li>
                );
              })}
            </ul>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--tenant-text)]">
            <input
              type="checkbox"
              checked={termsAccepted}
              disabled={preparing || isLoading}
              onChange={(event) => {
                setAcceptedTermsKey(event.target.checked ? termsKey : "");
                setError("");
              }}
              className="mt-0.5"
            />
            {t("acceptTerms")}
          </label>
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-4 rounded-[12px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
          role="alert"
        >
          <p>{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={previewMode || preparing || isLoading || isQuoting}
        data-tenant-button="primary"
        className="mt-5 min-h-12 w-full rounded-full bg-[var(--tenant-accent)] px-5 text-sm font-semibold text-[var(--tenant-accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
      >
        {preparing || isLoading
          ? t("starting")
          : t(fullyCovered ? "confirmWithVoucher" : "continue")}
      </button>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>{t("totalLabel", { count: quantity })}</span>
        <span>
          {reviewedQuote
            ? formatMinorCurrencyAmount(
                reviewedQuote.totalAmountMinor,
                reviewedQuote.currency,
                locale,
              )
            : formatProductPrice(
                { ...product, price: Number(product.price) * quantity },
                locale,
              )}
        </span>
      </p>
      <p className="mt-3 text-center text-[10px] leading-4 text-[var(--tenant-muted-text)]">
        {t("serverValidation")}
      </p>
    </form>
  );
}

export default function PublicBookingProductDetailPage({ kind }) {
  const locale = useLocale();
  const t = useTranslations("PublicTenant.details");
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const productId = String(params?.productId || "").trim();
  const routeProductKind = getPublicCatalogProductKind(kind);
  const course = routeProductKind === PRODUCT_KIND.CLASS;
  const openStudio = routeProductKind === PRODUCT_KIND.OPEN_STUDIO;
  const courseLocation = usePublicCourseLocation({
    tenantSlug,
    enabled: course,
  });
  const { tenant } = usePublicTenant();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentTenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const [createBookingIntent, createBookingIntentState] =
    useCreatePublicBookingIntentMutation();
  const [intentError, setIntentError] = useState("");
  const requestedLocationId = String(
    searchParams.get("locationId") || "",
  ).trim();
  const [date, setDate] = useState(
    () => String(searchParams.get("date") || "").trim() || todayValue(),
  );
  const [selectedActivity, setSelectedActivity] = useState(() =>
    String(searchParams.get("activity") || "")
      .trim()
      .toUpperCase(),
  );
  const [slotSelection, setSlotSelection] = useState(null);
  const [selectedBookingMode, setSelectedBookingMode] = useState(() =>
    searchParams.get("bookingMode") === "private" ? "private" : "public",
  );
  const [quantity, setQuantity] = useState(() =>
    Math.max(1, Number(searchParams.get("quantity")) || 1),
  );
  const productQuery = useGetPublicProductQuery(
    {
      tenantSlug,
      productId,
      ...((openStudio && requestedLocationId) ||
      (course && courseLocation.locationId)
        ? {
            locationId: course
              ? courseLocation.locationId
              : requestedLocationId,
          }
        : {}),
    },
    {
      skip:
        !tenantSlug ||
        !productId ||
        (course && (courseLocation.unresolved || !courseLocation.locationId)),
    },
  );
  const product = course
    ? courseLocation.locationId && !courseLocation.unresolved
      ? productQuery.currentData
      : undefined
    : productQuery.data;
  const customerChoice = isCustomerChoiceOpenStudio(product);
  const bookingMode = resolveOpenStudioBookingMode(
    product,
    selectedBookingMode,
  );
  const productMatchesKind = Boolean(
    product &&
    getProductId(product) === productId &&
    (course || openStudio) &&
    isPublicProductKind(product, kind) &&
    (!openStudio ||
      (getProductLocationId(product) &&
        (!requestedLocationId ||
          getProductLocationId(product) === requestedLocationId))),
  );
  const locationsQuery = useGetPublicBookingLocationsQuery(
    { tenantSlug },
    { skip: !openStudio || !tenantSlug || !productMatchesKind },
  );
  const locations = locationsQuery.data ?? EMPTY_LIST;
  const effectiveLocationId = openStudio
    ? getProductLocationId(product)
    : courseLocation.locationId;
  const selectionScope = `${tenantSlug}:${productId}:${effectiveLocationId}`;
  const [courseSelectionScope, setCourseSelectionScope] =
    useState(selectionScope);
  if (course && courseSelectionScope !== selectionScope) {
    setCourseSelectionScope(selectionScope);
    setSlotSelection(null);
    // Keep a deep link's quantity while its initial studio lookup resolves.
    // Once resolved, changing studio or product starts a new selection.
    if (courseSelectionScope !== `${tenantSlug}:${productId}:`) {
      setQuantity(1);
    }
    setIntentError("");
  }
  const selectedSlot =
    slotSelection?.scope === selectionScope ? slotSelection.slot : null;
  const setSelectedSlot = (slot) =>
    setSlotSelection({ scope: selectionScope, slot });
  const selectedLocation =
    locations.find(
      (location) => getEntityId(location) === effectiveLocationId,
    ) || null;
  const activityOptions = (
    selectedLocation?.booking?.activityCapacities || []
  ).filter((item) => ["WORKSTATION", "SHARED_TABLE"].includes(item?.activity));
  const activitySelectionMode =
    selectedLocation?.booking?.activitySelectionMode || "OPTIONAL";
  const selectedActivityAvailable = activityOptions.some(
    (item) => item?.activity === selectedActivity,
  );
  const effectivePlannedActivity =
    activitySelectionMode === "HIDDEN"
      ? "UNDEFINED"
      : selectedActivityAvailable
        ? selectedActivity
        : activitySelectionMode === "OPTIONAL"
          ? "UNDEFINED"
          : "";
  const activitySelectionValid =
    activitySelectionMode !== "REQUIRED" || selectedActivityAvailable;
  const maxGuests = getOpenStudioGuestLimit({
    product,
    location: selectedLocation,
    bookingMode,
    activity: effectivePlannedActivity,
  });
  const effectiveQuantity = openStudio
    ? Math.min(quantity, maxGuests)
    : quantity;
  const availabilityQuery = useGetPublicBookingAvailabilityQuery(
    {
      tenantSlug,
      productId,
      locationId: effectiveLocationId,
      date,
      plannedActivity: effectivePlannedActivity,
      bookingMode,
      numberOfGuests: effectiveQuantity,
    },
    {
      skip:
        !openStudio ||
        !tenantSlug ||
        !productId ||
        !productMatchesKind ||
        !effectiveLocationId ||
        !date,
    },
  );
  const sessionsQuery = useGetPublicCourseSessionsQuery(
    {
      tenantSlug,
      productId,
      ...(courseLocation.locationId
        ? { locationId: courseLocation.locationId }
        : {}),
    },
    {
      skip:
        !course ||
        !tenantSlug ||
        !productId ||
        !productMatchesKind ||
        courseLocation.unresolved ||
        !courseLocation.locationId,
    },
  );

  const sessions = (sessionsQuery.currentData ?? EMPTY_LIST).filter(
    (session) =>
      getEntityId(session) &&
      courseLocation.locationId &&
      getEntityId(session.location) === courseLocation.locationId,
  );
  const availability = availabilityQuery.data;
  const slots = course ? sessions : availability?.slots || EMPTY_LIST;
  const requestedSessionId = String(
    searchParams.get("courseSessionId") ||
      searchParams.get("bookingCourse") ||
      "",
  ).trim();
  const restoredSession =
    course && requestedSessionId && slotSelection?.scope !== selectionScope
      ? sessions.find(
          (session) => getEntityId(session) === requestedSessionId,
        ) || null
      : null;
  // A selected date is only usable while it still exists in this studio's
  // current response. Never submit a stale date object after a studio change
  // or after a refresh reports that the session is full.
  const currentSelectedSession = course
    ? sessions.find(
        (session) =>
          getEntityId(session) === getEntityId(selectedSlot || restoredSession),
      )
    : null;
  const effectiveSelectedSlot = course
    ? !productQuery.isFetching &&
      !sessionsQuery.isFetching &&
      !sessionsQuery.isError &&
      isCourseSessionBookable(currentSelectedSession)
      ? currentSelectedSession
      : null
    : selectedSlot;
  const courseQuantity = effectiveSelectedSlot
    ? Math.min(
        Math.max(1, Math.trunc(quantity)),
        Number(effectiveSelectedSlot.remainingCapacity),
        Number(effectiveSelectedSlot.capacity) ||
          Number(effectiveSelectedSlot.remainingCapacity),
      )
    : 1;
  const selectedSlotId = effectiveSelectedSlot
    ? getEntityId(effectiveSelectedSlot) ||
      `${effectiveSelectedSlot.start}:${effectiveSelectedSlot.end}`
    : "";
  const authenticatedTenantSlug = String(currentTenant?.slug || "")
    .trim()
    .toLowerCase();
  const userAccess = getUserAccess(currentUser, workspaceAccess);
  const platformRole = String(currentUser?.platformRole || "")
    .trim()
    .toLowerCase();
  const isPlatformUser = Boolean(platformRole && platformRole !== "none");
  const authenticatedForTenant =
    isAuthenticated && authenticatedTenantSlug === tenantSlug;
  const canContinueAsCustomer =
    authenticatedForTenant && userAccess.isEndCustomer && !isPlatformUser;
  const selectedSlotLocationId =
    getEntityId(effectiveSelectedSlot?.location) || effectiveLocationId;
  const { accentColor, accentForeground } = getPublicTenantTheme(tenant);

  const continueWithAccount = async () => {
    if (
      !effectiveSelectedSlot ||
      !activitySelectionValid ||
      createBookingIntentState.isLoading
    )
      return;

    if (authenticatedForTenant && (userAccess.isTenantUser || isPlatformUser)) {
      router.push("/app");
      return;
    }

    setIntentError("");
    const courseSessionId = course ? getEntityId(effectiveSelectedSlot) : "";

    try {
      const created = await createBookingIntent({
        tenantSlug,
        productId,
        locationId: selectedSlotLocationId || undefined,
        start: effectiveSelectedSlot.start,
        end: effectiveSelectedSlot.end,
        ...(courseSessionId
          ? {
              courseSessionId,
            }
          : {}),
        ...(openStudio
          ? {
              bookingMode,
              // Temporary alias for servers deployed before the kind rollout.
              bookingType: bookingMode,
              numberOfGuests: effectiveQuantity,
              plannedActivity: effectivePlannedActivity || "UNDEFINED",
            }
          : {}),
        quantity: course ? courseQuantity : effectiveQuantity,
        locale,
      }).unwrap();
      const token = String(created?.token || "").trim();
      if (!token) throw new Error("Missing booking intent token.");

      const nextPath = retainCustomerPortalLocation(
        `/portal/booking/confirm?intent=${encodeURIComponent(token)}`,
        course
          ? courseLocation.reference || selectedSlotLocationId
          : selectedSlotLocationId,
      );
      router.push(
        canContinueAsCustomer
          ? nextPath
          : `/login?next=${encodeURIComponent(nextPath)}`,
      );
    } catch (intentCreationError) {
      const changed =
        intentCreationError?.status === 409 ||
        [
          "BOOKING_UNAVAILABLE",
          "COURSE_CAPACITY_EXCEEDED",
          "BOOKING_SELECTION_CHANGED",
        ].includes(String(intentCreationError?.data?.code || "").toUpperCase());
      setIntentError(t(changed ? "selectionChanged" : "intentError"));
      if (changed) {
        if (course) void sessionsQuery.refetch();
        else void availabilityQuery.refetch();
      }
    }
  };

  const retryDetails = () => {
    if (course && (!courseLocation.locationId || courseLocation.unresolved)) {
      courseLocation.query.refetch();
      return;
    }
    productQuery.refetch();
    if (course && productMatchesKind) {
      if (courseLocation.unresolved) courseLocation.query.refetch();
      else sessionsQuery.refetch();
    } else if (productMatchesKind) {
      locationsQuery.refetch();
      if (effectiveLocationId) availabilityQuery.refetch();
    }
  };

  const loading =
    (course &&
      (courseLocation.query.isLoading ||
        (courseLocation.query.isFetching && !courseLocation.locationId) ||
        (productQuery.isFetching && !product))) ||
    productQuery.isLoading ||
    (productMatchesKind
      ? course
        ? sessionsQuery.isLoading ||
          (courseLocation.unresolved &&
            (courseLocation.query.isLoading || courseLocation.query.isFetching))
        : locationsQuery.isLoading
      : false);
  const error =
    (course && courseLocation.query.isError) ||
    productQuery.isError ||
    (productMatchesKind
      ? course
        ? sessionsQuery.isError ||
          (courseLocation.unresolved && courseLocation.query.isError)
        : locationsQuery.isError
      : false);
  const name = course
    ? getCourseName(product, locale)
    : getProductName(product, locale);
  const description = course
    ? getCourseDescription(product, locale)
    : getProductDescription(product, locale);
  const courseDetails = course ? getCourseDetails(product, locale) : "";
  const courseDurationLabel = course
    ? getCourseDurationLabel(product, locale)
    : "";
  const imageUrl = String(product?.imageSrc || product?.imageUrl || "").trim();
  const capability = course ? "courses" : "bookStudio";

  return (
    <PublicCapabilityGate capability={capability}>
      <main
        className="min-h-[70vh] bg-[var(--tenant-background)] px-5 py-12 text-[var(--tenant-text)] sm:px-8 lg:px-12"
        data-tenant-layout="section"
        style={{
          "--tenant-accent": accentColor,
          "--tenant-accent-foreground": accentForeground,
        }}
      >
        <div className="mx-auto max-w-[1180px]">
          <Link
            href={retainPublicCourseLocation(
              course ? "/courses" : "/book",
              course ? courseLocation.reference : "",
            )}
            data-tenant-button="secondary"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--tenant-muted-text)] transition hover:text-[var(--tenant-text)]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t(course ? "backToCourses" : "backToBook")}
          </Link>

          {course && courseLocation.locations.length > 0 ? (
            <label className="mt-6 block max-w-md text-xs font-semibold text-[var(--tenant-label-color)]">
              {t("location")}
              <select
                value={courseLocation.locationId}
                disabled={createBookingIntentState.isLoading}
                onChange={(event) => {
                  setSelectedSlot(null);
                  setQuantity(1);
                  setIntentError("");
                  courseLocation.selectLocation(event.target.value);
                }}
                data-tenant-surface="field"
                className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 text-sm text-[var(--tenant-text-on-surface)]"
              >
                {!courseLocation.locationId ? (
                  <option value="" disabled>
                    {t("location")}
                  </option>
                ) : null}
                {courseLocation.locations.map((location, index) => (
                  <option
                    key={getEntityId(location)}
                    value={getEntityId(location)}
                  >
                    {getLocationName(
                      location,
                      t("locationFallback", { number: index + 1 }),
                    )}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <StatusPanel loading={loading} error={error} onRetry={retryDetails}>
            {product && productMatchesKind ? (
              <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,1.12fr)]">
                <article
                  className="overflow-hidden rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_16px_50px_rgba(17,17,15,0.05)]"
                  data-tenant-surface="card"
                >
                  {course ? (
                    <CourseProductGallery product={product} large />
                  ) : imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="aspect-[4/3] w-full bg-[var(--tenant-background)] object-cover"
                      data-tenant-surface="media"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <div className="p-6 sm:p-8">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-on-surface)]"
                      data-tenant-type="eyebrow"
                    >
                      {t(course ? "courseEyebrow" : "bookingEyebrow")}
                    </p>
                    <h1
                      className="mt-3 text-4xl font-semibold tracking-[-0.055em]"
                      data-tenant-type="display"
                    >
                      {name}
                    </h1>
                    {description ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
                        {description}
                      </p>
                    ) : null}
                    <p className="mt-6 text-2xl font-semibold">
                      {formatProductPrice(product, locale)}
                    </p>
                    {courseDurationLabel ? (
                      <p className="mt-2 text-sm text-[var(--tenant-muted-on-surface)]">
                        {courseDurationLabel}
                      </p>
                    ) : null}
                    {courseDetails ? (
                      <div className="mt-6 border-t border-[var(--tenant-border)] pt-6">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
                          {courseDetails}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>

                <section
                  className="rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)] shadow-[0_16px_50px_rgba(17,17,15,0.05)] sm:p-7"
                  data-tenant-layout="card"
                  data-tenant-surface="panel"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
                      {course ? (
                        <UserGroupIcon className="h-5 w-5" />
                      ) : (
                        <CalendarDaysIcon className="h-5 w-5" />
                      )}
                    </span>
                    <div>
                      <h2
                        className="text-2xl font-semibold tracking-[-0.04em]"
                        data-tenant-type="display"
                      >
                        {t(course ? "chooseCourseSession" : "chooseVisit")}
                      </h2>
                      <p className="mt-2 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                        {t(
                          course
                            ? "chooseCourseSessionDescription"
                            : "chooseVisitDescription",
                        )}
                      </p>
                    </div>
                  </div>

                  {!course ? (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                        {t("location")}
                        <select
                          value={effectiveLocationId}
                          disabled
                          data-tenant-surface="field"
                          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                        >
                          {locations
                            .filter(
                              (location) =>
                                getEntityId(location) === effectiveLocationId,
                            )
                            .map((location, index) => (
                              <option
                                key={getEntityId(location)}
                                value={getEntityId(location)}
                              >
                                {getLocationName(
                                  location,
                                  t("locationFallback", { number: index + 1 }),
                                )}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                        {t("date")}
                        <input
                          type="date"
                          min={todayValue()}
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            setSelectedSlot(null);
                          }}
                          data-tenant-surface="field"
                          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                        />
                      </label>
                    </div>
                  ) : null}

                  {customerChoice && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                        {t("customerChoice.mode")}
                        <select
                          value={bookingMode}
                          onChange={(event) => {
                            setSelectedBookingMode(event.target.value);
                            setSelectedSlot(null);
                          }}
                          data-tenant-surface="field"
                          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                        >
                          <option value="public">
                            {t("customerChoice.public")}
                          </option>
                          <option value="private">
                            {t("customerChoice.private")}
                          </option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                        {t("customerChoice.people")}
                        <select
                          value={effectiveQuantity}
                          onChange={(event) => {
                            setQuantity(Number(event.target.value));
                            setSelectedSlot(null);
                          }}
                          data-tenant-surface="field"
                          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                        >
                          {Array.from(
                            { length: maxGuests },
                            (_, index) => index + 1,
                          ).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)] sm:col-span-2">
                        {bookingMode === "private"
                          ? t("customerChoice.privateHelp", {
                              amount: formatBookingPrice(
                                getOpenStudioPrivateSurcharge(
                                  product,
                                  bookingMode,
                                ),
                                product?.currency,
                                locale,
                              ),
                            })
                          : product?.openStudioPolicy?.publicCapacityMode ===
                              "fixed"
                            ? t("customerChoice.publicFixedHelp", {
                                count: maxGuests,
                              })
                            : t("customerChoice.publicActivityHelp")}
                      </p>
                    </div>
                  )}

                  {!course && activitySelectionMode !== "HIDDEN" ? (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                        {t("activity")}
                        <select
                          value={effectivePlannedActivity}
                          onChange={(event) => {
                            setSelectedActivity(event.target.value);
                            setSelectedSlot(null);
                          }}
                          required={activitySelectionMode === "REQUIRED"}
                          data-tenant-surface="field"
                          className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                        >
                          {activitySelectionMode === "REQUIRED" ? (
                            <option value="">{t("activityChoose")}</option>
                          ) : (
                            <option value="UNDEFINED">
                              {t("activityNotSpecified")}
                            </option>
                          )}
                          {activityOptions.map((item) => (
                            <option key={item.activity} value={item.activity}>
                              {t(
                                item.activity === "WORKSTATION"
                                  ? "activityWorkstation"
                                  : "activitySharedTable",
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="mt-2 text-[11px] leading-5 text-[var(--tenant-muted-on-surface)]">
                        {t(
                          activitySelectionMode === "REQUIRED"
                            ? "activityRequiredHint"
                            : "activityOptionalHint",
                        )}
                      </p>
                      {!activityOptions.length ? (
                        <p className="mt-2 text-xs text-red-700" role="alert">
                          {t("activityUnavailable")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <StatusPanel
                      loading={
                        course
                          ? sessionsQuery.isFetching
                          : availabilityQuery.isFetching
                      }
                      error={
                        course
                          ? sessionsQuery.isError
                          : availabilityQuery.isError
                      }
                      onRetry={
                        course
                          ? sessionsQuery.refetch
                          : availabilityQuery.refetch
                      }
                    >
                      <SlotPicker
                        slots={slots}
                        selectedId={selectedSlotId}
                        onSelect={(slot) => {
                          setSelectedSlot(slot);
                          if (course) setQuantity(1);
                        }}
                        locale={locale}
                        timeZone={
                          course
                            ? getTimeZone(courseLocation.activeLocation) ||
                              courseLocation.activeLocation?.booking?.timezone
                            : availability?.timeZone
                        }
                        course={course}
                        tenantSlug={tenantSlug}
                        productId={productId}
                        locationReference={courseLocation.reference}
                        onBookingAvailable={sessionsQuery.refetch}
                      />
                    </StatusPanel>
                  </div>

                  {effectiveSelectedSlot ? (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={continueWithAccount}
                        disabled={
                          createBookingIntentState.isLoading ||
                          availabilityQuery.isFetching ||
                          !activitySelectionValid
                        }
                        data-tenant-button="primary"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-accent)] px-5 text-sm font-semibold text-[var(--tenant-accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        {createBookingIntentState.isLoading
                          ? t("preparingIntent")
                          : authenticatedForTenant &&
                              (userAccess.isTenantUser || isPlatformUser)
                            ? t("openWorkspace")
                            : canContinueAsCustomer
                              ? t("continueInPortal")
                              : t("bookWithAccount")}
                      </button>

                      {intentError ? (
                        <p
                          className="mt-3 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                          role="alert"
                        >
                          {intentError}
                        </p>
                      ) : null}

                      {course &&
                      tenant.publicCapabilities.guestCourseCheckout ? (
                        <>
                          <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--tenant-accent-on-surface)]">
                            {t("orGuestCheckout")}
                          </p>
                          <GuestCourseCheckout
                            key={`${selectionScope}:${getEntityId(effectiveSelectedSlot)}`}
                            product={product}
                            session={effectiveSelectedSlot}
                            quantity={Math.min(courseQuantity, 20)}
                            setQuantity={setQuantity}
                            tenantSlug={tenantSlug}
                            locale={locale}
                          />
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </div>
            ) : (
              <div className="mt-7 rounded-[22px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 py-16 text-center text-sm text-[var(--tenant-muted-on-surface)]">
                {t("notFound")}
              </div>
            )}
          </StatusPanel>
        </div>
      </main>
    </PublicCapabilityGate>
  );
}
