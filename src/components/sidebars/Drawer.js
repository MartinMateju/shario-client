"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useMemo, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowPathIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import ConfirmationModal from "@/components/modals/ConformationModal";
import CustomerBookingStatus from "@/components/bookings/CustomerBookingStatus";
import { isCustomerBookingNextVisit } from "@/lib/features/bookings/customerBookingState";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import {
  useCancelBookingMutation,
  useGetMyBookingRescheduleAvailabilityQuery,
  useRescheduleBookingMutation,
  useGetMyBookingExtensionOptionsQuery,
  useExtendMyBookingMutation,
  useCancelMyBookingExtensionPaymentMutation,
} from "@/lib/features/bookings/bookingsApiSlice";
import { isOpenStudioBooking } from "@/utils/productBookingLabels";
import {
  formatWallDate,
  formatWallTime,
  formatZonedDate,
  formatZonedTimeRange,
  getLocationTimeZone,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-sm";
const panelClass =
  "rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4";
const primaryClass =
  "min-h-11 w-full rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const extensionDurations = [30, 60, 90, 120];

const extensionReasonKey = (reason) => {
  const code = String(reason || "").toUpperCase();
  if (/CLOSED|OPENING|HOURS/.test(code)) return "closed";
  if (/MAX.*DURATION|DURATION.*MAX|MAX.*MINUTES/.test(code)) return "duration";
  if (/PENDING/.test(code)) return "pending";
  if (/PRIVATE|EXCLUSIVE/.test(code)) return "private";
  if (/CAPACITY|ACTIVITY|FULL/.test(code)) return "capacity";
  return "unavailable";
};

export default function Drawer({
  open,
  setOpen,
  booking,
  product,
  openCancelConfirmation = false,
}) {
  const locale = useLocale();
  const t = useTranslations("BookingActions");
  const common = useTranslations("Common");
  const paymentCopy = useTranslations("BookingConfirmation.payment");
  const language = locale === "cs" ? "CZ" : "EN";
  const publicTenant = useOptionalPublicTenant();
  const tenantTheme = useMemo(
    () =>
      getPublicTenantPortalTheme(
        publicTenant?.tenant,
        "light",
        publicTenant?.surface,
      ),
    [publicTenant?.tenant, publicTenant?.surface],
  );
  const bookingId = booking?._id || booking?.id;
  const location =
    typeof booking?.location === "object" ? booking.location : null;
  const timezone = getLocationTimeZone(location);
  const isOpenStudio = isOpenStudioBooking(booking);
  const isConfirmedReservation = isCustomerBookingNextVisit(booking);
  const canCancel = booking?.canCancel === true;
  const canReschedule = isOpenStudio && booking?.canReschedule === true;
  const canExtend = isOpenStudio && booking?.canExtend === true;
  const hasExtensionAccess =
    canExtend || (isOpenStudio && booking?.hasPendingExtension === true);
  const hasActions = hasExtensionAccess || canReschedule || canCancel;
  const defaultAction =
    openCancelConfirmation && canCancel
      ? "cancel"
      : hasExtensionAccess
        ? "extend"
        : canReschedule
          ? "move"
          : canCancel
            ? "cancel"
            : "details";
  const [action, setAction] = useState(defaultAction);
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [extensionError, setExtensionError] = useState("");
  const [extensionBusy, setExtensionBusy] = useState(false);
  const extensionLock = useRef(false);
  const extensionRequest = useRef(null);
  const pendingPaymentLock = useRef(false);
  const [pendingPaymentBusy, setPendingPaymentBusy] = useState(false);
  const [showExtensionConfirmation, setShowExtensionConfirmation] =
    useState(false);
  const [extendedEnd, setExtendedEnd] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(() =>
    Boolean(open && openCancelConfirmation && canCancel),
  );
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const initialMoveDate =
    formatWallDate(booking?.start, timezone) ||
    formatWallDate(new Date(), timezone);
  const initialMoveTime = formatWallTime(booking?.start, timezone) || "09:00";
  const [moveDate, setMoveDate] = useState(initialMoveDate);
  const [moveTime, setMoveTime] = useState(initialMoveTime);
  const [selectedMoveStart, setSelectedMoveStart] = useState("");
  const [moveError, setMoveError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const cancelLockRef = useRef(false);
  const moveLock = useRef(false);
  const [cancelBooking, { isLoading: isCancelling }] =
    useCancelBookingMutation();
  const [rescheduleBooking, { isLoading: isRescheduling }] =
    useRescheduleBookingMutation();
  const [extendMyBooking, { isLoading: isExtending }] =
    useExtendMyBookingMutation();
  const [cancelExtensionPayment] = useCancelMyBookingExtensionPaymentMutation();
  const cancellationPending = cancelBusy || isCancelling;
  const busy =
    cancellationPending ||
    isRescheduling ||
    extensionBusy ||
    isExtending ||
    pendingPaymentBusy;
  const availabilityQuery = useGetMyBookingRescheduleAvailabilityQuery(
    { id: bookingId, date: moveDate },
    {
      skip:
        !open || action !== "move" || !canReschedule || !bookingId || !moveDate,
    },
  );
  const extensionQuery = useGetMyBookingExtensionOptionsQuery(
    { id: bookingId },
    {
      skip: !open || action !== "extend" || !hasExtensionAccess || !bookingId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const extensionQuote = extensionQuery.currentData || extensionQuery.data;
  const options = extensionQuote?.options || [];
  const pendingExtension = extensionQuote?.pendingExtension;
  const pendingCheckoutUrl = pendingExtension?.url
    ? getSafeCheckoutUrl(pendingExtension.url)
    : "";
  const paymentMethods = extensionQuote?.paymentMethods || [];
  const effectivePaymentMethod = paymentMethods.includes(paymentMethod)
    ? paymentMethod
    : paymentMethods[0] || "";
  const selectedExtension = options.find(
    (option) => option.minutes === extensionMinutes,
  );
  const extensionAllowed =
    hasExtensionAccess &&
    extensionQuote?.canExtend === true &&
    selectedExtension?.available === true &&
    Number.isSafeInteger(selectedExtension.amountMinor) &&
    selectedExtension.amountMinor >= 0 &&
    Boolean(extensionQuote.quoteVersion) &&
    Boolean(effectivePaymentMethod) &&
    !extensionQuery.isFetching &&
    !extensionQuery.isError;
  const moveSlots = availabilityQuery.data?.slots || [];
  const arrival = location?.arrival || {};
  const publicArrivalInstructions = String(
    arrival.publicInstructions || "",
  ).trim();
  const accessCodeDeliveryMinutes = Number(
    arrival.accessCodeDeliveryMinutesBefore,
  );
  const accessCodeDeliveryEnabled = arrival.accessCodeDeliveryEnabled === true;
  const accessLocked =
    arrival.accessCodeDelivered === true ||
    arrival.accessCodeIssuanceStarted === true;
  const productName = product?.name || booking?.product?.name || booking?.title;
  const displayProductName =
    typeof productName === "object"
      ? productName[locale] ||
        productName[language] ||
        productName.EN ||
        productName.CZ
      : productName;
  const originalDurationMinutes = Math.max(
    1,
    Math.round((new Date(booking?.end) - new Date(booking?.start)) / 60_000) ||
      1,
  );

  const resetAndClose = () => {
    setAction(defaultAction);
    setExtensionMinutes(30);
    setMoveDate(initialMoveDate);
    setMoveTime(initialMoveTime);
    setSelectedMoveStart("");
    setMoveError("");
    setCancelError("");
    setExtensionError("");
    setShowCancelConfirmation(false);
    setOpen(false);
  };
  const close = () => {
    if (
      cancelLockRef.current ||
      extensionLock.current ||
      moveLock.current ||
      pendingPaymentLock.current ||
      busy
    )
      return;
    resetAndClose();
  };
  const handleCancel = async () => {
    if (!canCancel || cancelLockRef.current || busy) return;
    cancelLockRef.current = true;
    setCancelBusy(true);
    setCancelError("");
    try {
      await cancelBooking({ id: bookingId }).unwrap();
      resetAndClose();
      setShowConfirmation(true);
    } catch (error) {
      setCancelError(getLocalizedApiErrorMessage(error, t("cancelError")));
    } finally {
      cancelLockRef.current = false;
      setCancelBusy(false);
    }
  };
  const handleMove = async () => {
    if (!canReschedule || moveLock.current || busy) return;
    setMoveError("");
    const manualStart = zonedDateTimeToUtc(moveDate, moveTime, timezone);
    const start = selectedMoveStart || manualStart?.toISOString() || "";
    if (!start) return setMoveError(t("moveInvalid"));
    moveLock.current = true;
    try {
      await rescheduleBooking({ id: bookingId, start }).unwrap();
      resetAndClose();
      setShowMoveConfirmation(true);
    } catch (error) {
      setMoveError(getLocalizedApiErrorMessage(error, t("moveError")));
      if (!availabilityQuery.isUninitialized) availabilityQuery.refetch();
    } finally {
      moveLock.current = false;
    }
  };
  const handleCancelExtensionPayment = async () => {
    if (!pendingExtension?.orderId || pendingPaymentLock.current || busy)
      return;
    pendingPaymentLock.current = true;
    setPendingPaymentBusy(true);
    setExtensionError("");
    try {
      await cancelExtensionPayment({
        id: bookingId,
        orderId: pendingExtension.orderId,
      }).unwrap();
      extensionRequest.current = null;
      extensionQuery.refetch();
    } catch (error) {
      const code = error?.data?.errorCode || error?.data?.code;
      if (code === "CUSTOMER_BOOKING_EXTENSION_PAYMENT_CONFIRMED") {
        resetAndClose();
      } else {
        setExtensionError(
          getLocalizedApiErrorMessage(error, t("extensionError")),
        );
      }
    } finally {
      pendingPaymentLock.current = false;
      setPendingPaymentBusy(false);
    }
  };
  const handleExtend = async () => {
    if (!extensionAllowed || extensionLock.current || busy) return;
    const request = {
      id: bookingId,
      minutes: selectedExtension.minutes,
      expectedEnd: extensionQuote.currentEnd,
      expectedAmountMinor: selectedExtension.amountMinor,
      quoteVersion: extensionQuote.quoteVersion,
      paymentMethod: effectivePaymentMethod,
      locale,
    };
    const fingerprint = JSON.stringify(request);
    if (extensionRequest.current?.fingerprint !== fingerprint) {
      extensionRequest.current = { fingerprint, key: crypto.randomUUID() };
    }
    extensionLock.current = true;
    setExtensionBusy(true);
    setExtensionError("");
    try {
      const response = await extendMyBooking({
        ...request,
        idempotencyKey: extensionRequest.current.key,
      }).unwrap();
      if (response?.status === "confirmed") {
        setExtendedEnd(response.booking?.end || selectedExtension.end);
        resetAndClose();
        setShowExtensionConfirmation(true);
        return;
      }
      const checkoutUrl = response?.url ? getSafeCheckoutUrl(response.url) : "";
      if (response?.status === "pending" && checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      setExtensionError(t("extensionError"));
    } catch (error) {
      const code = String(error?.data?.errorCode || error?.data?.code || "");
      setExtensionError(
        /STALE|PRICE_CHANGED/.test(code)
          ? t("quoteChanged")
          : /PENDING/.test(code)
            ? t("reasons.pending")
            : getLocalizedApiErrorMessage(error, t("extensionError")),
      );
      if (!extensionQuery.isUninitialized) extensionQuery.refetch();
    } finally {
      extensionLock.current = false;
      setExtensionBusy(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={close}
        className="relative z-[90]"
        data-tenant-style={tenantTheme?.stylePresetId}
        style={tenantTheme?.style}
      >
        <div className="fixed inset-0 bg-[#1F1F1F]/25 backdrop-blur-[2px]" />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <DialogPanel
              data-dialog-layout="drawer"
              data-booking-actions
              data-tenant-surface="panel"
              transition
              className="flex h-full w-full max-w-[560px] transform flex-col border-l border-line bg-surface-raised text-[var(--tenant-text-on-surface)] shadow-[-24px_0_70px_rgba(31,31,31,0.13)] transition duration-300 data-closed:translate-x-full"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--tenant-border)] px-5 py-5 sm:px-7">
                <div className="min-w-0">
                  <DialogTitle
                    data-tenant-type="display"
                    className="text-2xl font-semibold tracking-tight"
                  >
                    {hasActions ? t("title") : t("details")}
                  </DialogTitle>
                  <p className="mt-1 break-words text-sm text-[var(--tenant-muted-on-surface)]">
                    {displayProductName}
                  </p>
                  <CustomerBookingStatus
                    booking={booking}
                    language={language}
                  />
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tenant-border)]"
                  aria-label={common("close")}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                <div className={panelClass} data-booking-summary>
                  <p className="text-sm font-semibold">{location?.name}</p>
                  <p className="mt-1 text-sm text-[var(--tenant-muted-on-surface)]">
                    {formatZonedDate(booking?.start, timezone, locale)}{" "}
                    <span aria-hidden="true">·</span>{" "}
                    {formatZonedTimeRange(
                      booking?.start,
                      booking?.end,
                      timezone,
                      locale,
                    )}
                  </p>
                </div>
                {hasActions && (
                  <fieldset disabled={busy}>
                    <legend className="mb-2 text-sm font-semibold">
                      {t("chooseAction")}
                    </legend>
                    <div
                      className="grid grid-cols-3 gap-2"
                      data-booking-action-selector
                    >
                      {[
                        ["extend", hasExtensionAccess, ClockIcon],
                        ["move", canReschedule, ArrowPathIcon],
                        ["cancel", canCancel, XMarkIcon],
                      ].map(([value, enabled, Icon]) => (
                        <label
                          key={value}
                          className={cx(
                            "relative flex min-h-[82px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--tenant-accent-on-surface)]",
                            action === value
                              ? "border-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))] text-[var(--tenant-accent-on-surface)]"
                              : "border-[var(--tenant-border)]",
                            enabled
                              ? "cursor-pointer"
                              : "cursor-not-allowed opacity-45",
                          )}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="booking-action"
                            value={value}
                            checked={action === value}
                            disabled={!enabled}
                            onChange={() => setAction(value)}
                          />
                          <Icon className="h-5 w-5" aria-hidden="true" />
                          <span className="break-words">{t(value)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {!hasActions && (
                  <p
                    className={cx(
                      panelClass,
                      "text-sm leading-6 text-[var(--tenant-muted-on-surface)]",
                    )}
                  >
                    {!isOpenStudio
                      ? t("courseReadonly")
                      : accessLocked
                        ? t("accessLocked")
                        : t("readonly")}
                  </p>
                )}
                {hasActions &&
                  accessLocked &&
                  (!canReschedule || !canCancel) && (
                    <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                      {t("accessLocked")}
                    </p>
                  )}
                {action === "extend" && hasExtensionAccess && (
                  <section aria-label={t("extendTitle")} className="space-y-4">
                    <p className="text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                      {t("extendHelp")}
                    </p>
                    {pendingExtension && (
                      <div className={panelClass} role="status">
                        <p className="text-sm leading-6">
                          {t("reasons.pending")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pendingCheckoutUrl && (
                            <button
                              type="button"
                              data-tenant-button="primary"
                              disabled={busy}
                              onClick={() =>
                                window.location.assign(pendingCheckoutUrl)
                              }
                              className="min-h-11 rounded-full px-4 text-sm font-semibold"
                            >
                              {paymentCopy("continueToCard")}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleCancelExtensionPayment}
                            className="min-h-11 rounded-full border border-[var(--tenant-border)] px-4 text-sm"
                          >
                            {t("cancelPayment")}
                          </button>
                        </div>
                      </div>
                    )}
                    {extensionQuery.isFetching && (
                      <p role="status" className="text-sm">
                        {t("loading")}
                      </p>
                    )}
                    {extensionQuery.isError && (
                      <div role="alert" className={panelClass}>
                        <p>{t("quoteError")}</p>
                        <button
                          type="button"
                          onClick={() => extensionQuery.refetch()}
                          className="mt-2 min-h-11 underline"
                        >
                          {t("retry")}
                        </button>
                      </div>
                    )}
                    {!extensionQuery.isError &&
                      !extensionQuery.isFetching &&
                      extensionQuote &&
                      !pendingExtension && (
                        <>
                          <fieldset disabled={busy}>
                            <legend className="mb-2 text-sm font-semibold">
                              {t("extraTime")}
                            </legend>
                            <div className="grid grid-cols-2 gap-2">
                              {extensionDurations.map((minutes) => {
                                const option = options.find(
                                  (item) => item.minutes === minutes,
                                );
                                const available =
                                  extensionQuote.canExtend === true &&
                                  option?.available === true;
                                return (
                                  <label
                                    key={minutes}
                                    className={cx(
                                      "relative flex min-h-24 min-w-0 flex-col gap-1 rounded-xl border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--tenant-accent-on-surface)]",
                                      extensionMinutes === minutes && available
                                        ? "border-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))]"
                                        : "border-[var(--tenant-border)]",
                                      available
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed opacity-60",
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="extension-minutes"
                                      className="sr-only"
                                      checked={extensionMinutes === minutes}
                                      disabled={!available}
                                      value={minutes}
                                      onChange={() => {
                                        setExtensionMinutes(minutes);
                                        setExtensionError("");
                                      }}
                                    />
                                    <span className="text-base font-semibold">
                                      {t("minutes", { minutes })}
                                    </span>
                                    {available ? (
                                      <>
                                        <span className="text-sm">
                                          {t("endsAt", {
                                            time: formatWallTime(
                                              option.end,
                                              timezone,
                                            ),
                                          })}
                                        </span>
                                        <span className="text-sm font-semibold">
                                          {formatMinorCurrencyAmount(
                                            option.amountMinor,
                                            extensionQuote.currency,
                                            locale,
                                          )}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs leading-5">
                                        {t(
                                          `reasons.${extensionReasonKey(option?.reason)}`,
                                        )}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                          {extensionQuote.pricingSource === "current_price" && (
                            <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                              {t("currentTariff")}
                            </p>
                          )}
                          {!paymentMethods.includes("card") &&
                            paymentMethods.includes("credits") && (
                              <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                                {t("cardTimeLimit")}
                              </p>
                            )}
                          {paymentMethods.length === 0 && (
                            <p role="status" className="text-sm">
                              {paymentCopy("unavailable")}
                            </p>
                          )}
                          {extensionAllowed && (
                            <fieldset disabled={busy}>
                              <legend className="mb-2 text-sm font-semibold">
                                {t("paymentMethod")}
                              </legend>
                              <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map((method) => (
                                  <label
                                    key={method}
                                    className={cx(
                                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm",
                                      effectivePaymentMethod === method
                                        ? "border-[var(--tenant-accent-on-surface)]"
                                        : "border-[var(--tenant-border)]",
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="extension-payment"
                                      checked={
                                        effectivePaymentMethod === method
                                      }
                                      onChange={() => setPaymentMethod(method)}
                                    />
                                    {t(method)}
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          )}
                        </>
                      )}
                    {extensionError && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                      >
                        {extensionError}
                      </p>
                    )}
                    {!pendingExtension && (
                      <button
                        type="button"
                        data-tenant-button="primary"
                        onClick={handleExtend}
                        disabled={!extensionAllowed || busy}
                        className={primaryClass}
                      >
                        {extensionBusy || isExtending
                          ? t("processing")
                          : t("payExtend", {
                              amount:
                                selectedExtension && extensionQuote
                                  ? formatMinorCurrencyAmount(
                                      selectedExtension.amountMinor,
                                      extensionQuote.currency,
                                      locale,
                                    )
                                  : "—",
                            })}
                      </button>
                    )}
                  </section>
                )}
                {action === "move" && canReschedule && (
                  <section aria-label={t("moveTitle")} className="space-y-4">
                    <p
                      id="move-booking-help"
                      className="text-sm leading-6 text-[var(--tenant-muted-on-surface)]"
                    >
                      {t("moveHelp", { minutes: originalDurationMinutes })}
                    </p>
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="move-booking-date"
                    >
                      {t("newDate")}
                      <input
                        id="move-booking-date"
                        type="date"
                        value={moveDate}
                        min={formatWallDate(new Date(), timezone)}
                        aria-describedby="move-booking-help"
                        disabled={busy}
                        onChange={(event) => {
                          setMoveDate(event.target.value);
                          setSelectedMoveStart("");
                          setMoveError("");
                        }}
                        className={fieldClass}
                      />
                    </label>
                    {availabilityQuery.isFetching && (
                      <p role="status" className="text-sm">
                        {t("loading")}
                      </p>
                    )}
                    {!availabilityQuery.isFetching && moveSlots.length > 0 && (
                      <fieldset disabled={busy}>
                        <legend className="mb-2 text-sm font-semibold">
                          {t("availableTimes")}
                        </legend>
                        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                          {moveSlots.map((slot) => {
                            const slotStart = String(slot.start || "");
                            const available =
                              slot.available !== false &&
                              slot.remainingCapacity !== 0;
                            return (
                              <label
                                key={`${slot.start}:${slot.end}`}
                                className={cx(
                                  "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                                  selectedMoveStart === slotStart
                                    ? "border-[var(--tenant-accent-on-surface)]"
                                    : "border-[var(--tenant-border)]",
                                  available
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-50",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="move-booking-slot"
                                  value={slotStart}
                                  checked={selectedMoveStart === slotStart}
                                  disabled={!available}
                                  onChange={() => {
                                    setSelectedMoveStart(slotStart);
                                    setMoveTime(
                                      formatWallTime(slotStart, timezone),
                                    );
                                    setMoveError("");
                                  }}
                                />
                                <span>
                                  {formatWallTime(slot.start, timezone)}–
                                  {formatWallTime(slot.end, timezone)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}
                    {(availabilityQuery.isError ||
                      (!availabilityQuery.isFetching &&
                        moveSlots.length === 0)) && (
                      <p className="text-sm text-[var(--tenant-muted-on-surface)]">
                        {t("manualTime")}
                      </p>
                    )}
                    <label
                      htmlFor="move-booking-time"
                      className="block text-sm font-semibold"
                    >
                      {t("startTime")}
                      <input
                        id="move-booking-time"
                        type="time"
                        step="900"
                        value={moveTime}
                        disabled={busy}
                        onChange={(event) => {
                          setMoveTime(event.target.value);
                          setSelectedMoveStart("");
                          setMoveError("");
                        }}
                        className={fieldClass}
                      />
                    </label>
                    {moveError && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                      >
                        {moveError}
                      </p>
                    )}
                    <button
                      type="button"
                      data-tenant-button="primary"
                      onClick={handleMove}
                      disabled={busy || !moveDate || !moveTime}
                      className={primaryClass}
                    >
                      {isRescheduling ? t("processing") : t("confirmMove")}
                    </button>
                  </section>
                )}
                {action === "cancel" && canCancel && (
                  <section aria-label={t("cancelTitle")} className="space-y-4">
                    <p className="text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                      {t("refundHelp")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelError("");
                        setShowCancelConfirmation(true);
                      }}
                      disabled={busy}
                      data-tenant-intent="danger"
                      className={cx(
                        primaryClass,
                        "border border-red-200 bg-red-50 text-red-800",
                      )}
                    >
                      {cancellationPending ? t("cancelling") : t("cancelTitle")}
                    </button>
                  </section>
                )}
                {isConfirmedReservation &&
                  (publicArrivalInstructions ||
                    (accessCodeDeliveryEnabled && !accessLocked)) && (
                    <details className="border-t border-[var(--tenant-border)] pt-4 text-sm">
                      <summary className="min-h-11 cursor-pointer font-medium">
                        {t("arrival")}
                      </summary>
                      {publicArrivalInstructions && (
                        <p className="whitespace-pre-line leading-6 text-[var(--tenant-muted-on-surface)]">
                          {publicArrivalInstructions}
                        </p>
                      )}
                      {accessCodeDeliveryEnabled &&
                        !accessLocked &&
                        Number.isFinite(accessCodeDeliveryMinutes) && (
                          <p className="mt-2 leading-6 text-[var(--tenant-muted-on-surface)]">
                            {t("accessCode", {
                              minutes: Math.max(0, accessCodeDeliveryMinutes),
                            })}
                          </p>
                        )}
                    </details>
                  )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      <ConfirmationModal
        open={showConfirmation}
        setOpen={setShowConfirmation}
        customerMode
        tenantStylePresetId={tenantTheme?.stylePresetId}
        tenantThemeStyle={tenantTheme?.style}
        title={t("cancelledTitle")}
        cancelText={common("close")}
        continueText={common("close")}
        text={t("cancelledBody")}
      />
      <ConfirmationModal
        open={showMoveConfirmation}
        setOpen={setShowMoveConfirmation}
        customerMode
        tenantStylePresetId={tenantTheme?.stylePresetId}
        tenantThemeStyle={tenantTheme?.style}
        title={t("movedTitle")}
        cancelText={common("close")}
        continueText={common("close")}
        text={t("movedBody")}
      />
      <ConfirmationModal
        open={showExtensionConfirmation}
        setOpen={setShowExtensionConfirmation}
        customerMode
        tenantStylePresetId={tenantTheme?.stylePresetId}
        tenantThemeStyle={tenantTheme?.style}
        title={t("extendedTitle")}
        cancelText={common("close")}
        continueText={common("close")}
        text={t("extendedBody", {
          time: formatWallTime(extendedEnd, timezone) || "",
        })}
      />
      <ConfirmationModal
        open={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        customerMode
        tenantStylePresetId={tenantTheme?.stylePresetId}
        tenantThemeStyle={tenantTheme?.style}
        onConfirm={handleCancel}
        isLoading={cancellationPending}
        showSuccessIcon={false}
        title={t("cancelQuestion")}
        text={
          <>
            <p>{t("refundHelp")}</p>
            {cancelError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {cancelError}
              </p>
            )}
          </>
        }
        confirmText={t("confirmCancel")}
        cancelText={t("keepBooking")}
        confirmIntent="danger"
      />
    </>
  );
}
