"use client";

import { useMemo } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { useGetMyBookingQuery } from "@/lib/features/bookings/bookingsApiSlice";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import { getBookingAttendanceCount } from "@/components/calendar/calendar.presentation";
import {
  formatLocationAddress,
  formatZonedDate,
  formatZonedTimeRange,
  getEntityId,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";

const localizedName = (value, locale) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const language = locale.split("-")[0];
  return (
    value[locale] ||
    value[language] ||
    value[language === "cs" ? "CZ" : language.toUpperCase()] ||
    value.en ||
    value.EN ||
    value.cs ||
    value.CZ ||
    ""
  );
};

const PAYMENT_LABELS = {
  confirmed: "paid",
  paid: "paid",
  pending_payment: "pending",
  pending: "pending",
  failed: "failed",
  expired: "expired",
  refunded: "refunded",
};

function Detail({ label, children, fullWidth = false }) {
  return (
    <div className={`min-w-0 space-y-1 ${fullWidth ? "col-span-2" : ""}`}>
      <dt className="text-xs text-[var(--tenant-muted-on-surface)]">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function CustomerBookingDetailsModal({
  bookingId,
  calendarSummary = null,
  onClose,
  locations = [],
  products = [],
}) {
  const locale = useLocale();
  const t = useTranslations("CustomerBookingDetails");
  const common = useTranslations("Common");
  const summary = useTranslations("BookingConfirmation.summary");
  const bookings = useTranslations("Bookings");
  const retry = useTranslations("BookingConfirmation.loadError");
  const publicTenant = useOptionalPublicTenant();
  const theme = useMemo(
    () => getPublicTenantPortalTheme(publicTenant?.tenant),
    [publicTenant?.tenant],
  );
  const { currentData, isFetching, isLoading, isError, refetch } =
    useGetMyBookingQuery(
      { bookingId },
      {
        skip: !bookingId || Boolean(calendarSummary),
        refetchOnMountOrArgChange: true,
      },
    );
  // Availability cards contain only a summary. Display private details only
  // after the customer endpoint has verified ownership of this exact booking.
  const booking = calendarSummary
    ? {
        // Non-owned cards may only repeat information already on the calendar.
        // In particular, ignore cached private responses and payment fields.
        product: { name: calendarSummary.productName },
        location: calendarSummary.locationId,
        start: calendarSummary.start,
        end: calendarSummary.end,
        participantCount: calendarSummary.participantCount,
        bookingMode: calendarSummary.bookingMode,
        kind: calendarSummary.kind,
      }
    : getEntityId(currentData?.booking) === bookingId
      ? currentData.booking
      : null;
  const loading = !calendarSummary && (isLoading || isFetching);
  const location = {
    ...locations.find(
      (item) => getEntityId(item) === getEntityId(booking?.location),
    ),
    ...(typeof booking?.location === "object" ? booking.location : {}),
  };
  const product =
    booking?.product || booking?.bookingProduct || booking?.productSnapshot;
  const catalogProduct = products.find(
    (item) => getEntityId(item) === getEntityId(product),
  );
  const productName =
    localizedName(
      product?.name || catalogProduct?.name || booking?.title,
      locale,
    ) || summary("productFallback");
  const timezone = booking?.location?.timezone || getLocationTimeZone(location);
  const startDate = booking
    ? formatZonedDate(booking.start, timezone, locale)
    : "";
  const endDate = booking ? formatZonedDate(booking.end, timezone, locale) : "";
  const paymentLabel =
    PAYMENT_LABELS[String(booking?.paymentStatus || "").toLowerCase()];
  const status =
    booking?.status === "processed" && paymentLabel === "paid"
      ? "confirmed"
      : String(booking?.status || "");
  const mode = String(
    booking?.bookingMode || booking?.bookingType || "",
  ).toLowerCase();
  const attendanceCount = booking ? getBookingAttendanceCount(booking) : null;

  return (
    <Dialog
      open={Boolean(bookingId || calendarSummary)}
      onClose={onClose}
      className="fixed inset-0 z-[90]"
      style={theme?.style}
      data-tenant-style={theme?.stylePresetId}
    >
      <div
        data-dialog-backdrop
        className="fixed inset-0 bg-black/35 backdrop-blur-sm"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <DialogPanel
            data-customer-booking-details
            data-customer-booking-detail-scope={
              calendarSummary ? "calendar" : "own"
            }
            data-dialog-layout="modal"
            data-dialog-tone="tenant"
            data-tenant-surface="panel"
            className="w-full max-w-lg rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)] shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t("title")}
              </DialogTitle>
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                aria-label={common("close")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tenant-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)]"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {loading ? (
              <p
                role="status"
                className="py-8 text-sm text-[var(--tenant-muted-on-surface)]"
              >
                {t("loading")}
              </p>
            ) : (!calendarSummary && isError) || !booking ? (
              <div className="space-y-4 py-6">
                <p role="alert" className="text-sm">
                  {t("error")}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="min-h-11 rounded-full border border-[var(--tenant-border)] px-5 text-sm font-semibold"
                >
                  {retry("retry")}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="break-words text-lg font-semibold">
                  {productName}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-[var(--tenant-border)] pt-5">
                  <Detail label={summary("location")} fullWidth>
                    {location.name || summary("locationFallback")}
                    {formatLocationAddress(location) ? (
                      <span className="mt-1 block text-xs font-normal text-[var(--tenant-muted-on-surface)]">
                        {formatLocationAddress(location)}
                      </span>
                    ) : null}
                  </Detail>
                  <Detail label={bookings("columns.dateTime")} fullWidth>
                    <span className="block">
                      {startDate}
                      {endDate !== startDate ? ` – ${endDate}` : ""}
                    </span>
                    <span className="mt-1 block">
                      {formatZonedTimeRange(
                        booking.start,
                        booking.end,
                        timezone,
                        locale,
                      )}
                    </span>
                  </Detail>
                  {attendanceCount !== null ? (
                    <Detail label={summary("people")}>{attendanceCount}</Detail>
                  ) : null}
                  {["public", "private"].includes(mode) ? (
                    <Detail label={summary("bookingMode")}>
                      {summary(`bookingModes.${mode}`)}
                    </Detail>
                  ) : null}
                  {status && bookings.has(`status.${status}`) ? (
                    <Detail label={bookings("columns.status")}>
                      {bookings(`status.${status}`)}
                    </Detail>
                  ) : null}
                  {paymentLabel ? (
                    <Detail label={bookings("columns.payment")}>
                      {bookings(`payment.${paymentLabel}`)}
                    </Detail>
                  ) : null}
                </dl>
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
