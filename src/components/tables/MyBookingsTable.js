"use client";

import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import { ArrowRightIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

import { Link } from "@/i18n/navigation";
import { useGetUserBookingsQuery } from "@/lib/features/bookings/bookingsApiSlice";
import {
  getCustomerBookingPagination,
  getCustomerBookings,
} from "@/lib/features/bookings/customerBookingPagination";
import {
  getCustomerBookingState,
  isCustomerBookingUpcoming,
} from "@/lib/features/bookings/customerBookingState";
import CustomerBookingStatus from "@/components/bookings/CustomerBookingStatus";
import { useGetCustomerCatalogQuery } from "@/lib/features/products/productsApiSlice";
import { getBookingLocationId } from "@/lib/features/locations/location.utils";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { getProductByBooking } from "@/utils/utilityFunctions";
import {
  formatZonedDate,
  formatZonedTimeRange,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { isServiceCatalogEnabled } from "@/utils/studioFlow";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";
import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import Drawer from "../sidebars/Drawer";

const classNames = (...classes) => classes.filter(Boolean).join(" ");
const PAGE_SIZE = 20;

const getLocationName = (booking) => {
  const location = booking?.location;

  return !location
    ? "-"
    : typeof location === "string"
      ? "-"
      : typeof location === "object"
        ? location.name || "-"
        : "-";
};

const getBookingTimezone = (booking) =>
  getLocationTimeZone(
    booking?.location && typeof booking.location === "object"
      ? booking.location
      : null,
  );

const getGuestsCount = (booking) => {
  if (!booking) return 1;

  const participantCount = Number(booking.participantCount);
  if (Number.isFinite(participantCount) && participantCount > 0) {
    return participantCount;
  }

  if (booking.tag === "course") {
    const quantity = Number(booking.quantity);
    if (Number.isFinite(quantity) && quantity > 0) return quantity;
  }

  const guests = Number(booking.numberOfGuests);
  if (Number.isFinite(guests) && guests > 0) return guests;

  return 1;
};

const getBookingProductName = (
  product,
  language,
  translation,
  locale = language,
) =>
  getLocalizedPublicTenantText(
    product?.name ?? product?.title,
    locale,
    translation["BOOKING"]?.[language] || "",
  );

const resolveBookingProduct = (products, booking) =>
  getProductByBooking(products, booking) ||
  booking?.product ||
  booking?.bookingProduct ||
  booking?.productSnapshot ||
  null;

function CourseBadge({ language }) {
  const translation = useLegacyTranslation();
  return (
    <span className="inline-flex rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-1 font-medium text-[10px] uppercase tracking-[0.14em] text-[var(--tenant-text-on-surface)]">
      {translation["COURSE_BOOKING"]?.[language]}
    </span>
  );
}

function SortIcon({ active, order }) {
  if (!active) return <span className="inline-block h-4 w-4" />;

  return order === "asc" ? (
    <ChevronUpIcon className="h-4 w-4" />
  ) : (
    <ChevronDownIcon className="h-4 w-4" />
  );
}

export default function MyBookingsTable({
  headingLevel = 2,
  activeLocationId: providedLocationId = "",
}) {
  const portalLocation = useOptionalCustomerPortalLocation();
  const activeLocationId =
    providedLocationId || portalLocation?.activeLocationId || "";

  return (
    <LocationScopedMyBookingsTable
      key={activeLocationId || "tenant-wide"}
      headingLevel={headingLevel}
      activeLocationId={activeLocationId}
      locationRequired={Boolean(portalLocation)}
    />
  );
}

function LocationScopedMyBookingsTable({
  headingLevel,
  activeLocationId,
  locationRequired,
}) {
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const portalTenant = useOptionalPublicTenant()?.tenant || tenant;
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const userId = user?.id;
  const serviceCatalogEnabled = isServiceCatalogEnabled(tenant?.modules);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [scope, setScope] = useState("upcoming");
  const [page, setPage] = useState(1);

  const { data: products = [], isLoading: isLoadingProducts } =
    useGetCustomerCatalogQuery(undefined, {
      refetchOnMountOrArgChange: false,
      skip: !userId || !serviceCatalogEnabled,
    });

  const {
    data: userBookingsData,
    isLoading: isLoadingUserBookings,
    isFetching: isFetchingUserBookings,
    isError: isUserBookingsError,
    refetch: refetchUserBookings,
  } = useGetUserBookingsQuery(
    {
      scope,
      page,
      limit: PAGE_SIZE,
      ...(activeLocationId ? { locationId: activeLocationId } : {}),
    },
    {
      pollingInterval: 150000,
      refetchOnMountOrArgChange: false,
      skip: !userId || (locationRequired && !activeLocationId),
    },
  );

  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [bookingNow, setBookingNow] = useState(() => Date.now());

  const bookings = useMemo(() => {
    const result = getCustomerBookings(userBookingsData);

    return activeLocationId
      ? result.filter(
          (booking) => getBookingLocationId(booking) === activeLocationId,
        )
      : result;
  }, [activeLocationId, userBookingsData]);
  const pagination = useMemo(
    () =>
      getCustomerBookingPagination(userBookingsData, {
        page,
        limit: PAGE_SIZE,
      }),
    [page, userBookingsData],
  );
  const totalPages = Math.max(pagination.totalPages, 1);
  const currentPage = Math.min(pagination.currentPage, totalPages);
  const serverTotalPages =
    userBookingsData?.totalPages ??
    userBookingsData?.pagination?.totalPages ??
    userBookingsData?.meta?.totalPages;
  // A hold expiring can remove the last page. Request the remaining page,
  // rather than only clamping the footer while keeping an empty query page.
  if (
    !isLoadingUserBookings &&
    !isFetchingUserBookings &&
    !isUserBookingsError &&
    serverTotalPages != null &&
    Number.isInteger(Number(serverTotalPages)) &&
    Number(serverTotalPages) >= 0 &&
    page > totalPages
  ) {
    setPage(totalPages);
  }

  useEffect(() => {
    const now = Date.now();
    const upcomingExpiries = bookings
      .filter(
        (booking) =>
          getCustomerBookingState(booking, bookingNow) === "awaiting_payment",
      )
      .map((booking) => new Date(booking.paymentExpiresAt).getTime())
      .filter((expiry) => Number.isFinite(expiry) && expiry > bookingNow);
    if (!upcomingExpiries.length) return undefined;

    const timeout = window.setTimeout(
      () => {
        setBookingNow(Date.now());
        refetchUserBookings?.();
      },
      Math.max(
        1,
        Math.min(Math.min(...upcomingExpiries) - now + 1, 2_147_483_647),
      ),
    );
    return () => window.clearTimeout(timeout);
  }, [bookings, bookingNow, refetchUserBookings]);

  const visibleBookings = useMemo(() => {
    if (scope === "history") return bookings;

    const now = new Date(bookingNow);

    return bookings.filter((booking) =>
      isCustomerBookingUpcoming(booking, now),
    );
  }, [bookings, scope, bookingNow]);

  const sortedBookings = useMemo(() => {
    return [...visibleBookings].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = new Date(a.start || 0) - new Date(b.start || 0);
      }

      if (sortBy === "name") {
        const productA = resolveBookingProduct(products, a);
        const productB = resolveBookingProduct(products, b);

        comparison = getBookingProductName(
          productA,
          language,
          translation,
          activeLocale,
        ).localeCompare(
          getBookingProductName(productB, language, translation, activeLocale),
          activeLocale,
        );
      }

      if (sortBy === "location") {
        comparison = getLocationName(a).localeCompare(getLocationName(b));
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    visibleBookings,
    sortBy,
    sortOrder,
    products,
    language,
    translation,
    activeLocale,
  ]);

  const handleSort = useCallback(
    (key, defaultOrder = "asc") => {
      if (sortBy === key) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        return;
      }

      setSortBy(key);
      setSortOrder(defaultOrder);
    },
    [sortBy],
  );

  const handleEditClick = useCallback(
    (booking) => {
      const product = resolveBookingProduct(products, booking);

      setSelectedBooking(booking);
      setSelectedProduct(product);
      setIsDrawerOpen(true);
    },
    [products],
  );

  const summaryText = `${legacyText(
    scope === "history" ? "bookingHistoryPast" : "bookingHistoryUpcoming",
    { count: pagination.totalCount },
  )}${isFetchingUserBookings ? "…" : "."}`;

  const isLoading =
    isLoadingUserBookings || (serviceCatalogEnabled && isLoadingProducts);

  const bookingTitle = translation["MY_BOOKINGS"][language];
  const bookHref = retainCustomerPortalLocation(
    "/portal?tab=studio-calendar",
    activeLocationId,
  );
  const bookAction =
    serviceCatalogEnabled &&
    isCustomerPortalPageEnabled(portalTenant, "calendar") ? (
      <Link href={bookHref} className={customerPortalPrimaryActionClass}>
        {legacyText("LocationScopedMyBookingsTable_Book_a_session_bf464")}
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    ) : null;
  const pageHeader = (
    <CustomerPortalPageHeader
      headingAs={Heading}
      eyebrow={legacyText(
        "LocationScopedMyBookingsTable_Booking_overview_a8c35",
      )}
      title={bookingTitle}
      description={summaryText}
      actions={bookAction}
    />
  );

  if (isLoading) {
    return (
      <CustomerPortalPage contentClassName="max-w-[1480px]">
        {pageHeader}
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalLoadingState
            label={legacyText(
              "LocationScopedMyBookingsTable_Loading_bookings_bfbf6",
            )}
          />
        </CustomerPortalSurface>
      </CustomerPortalPage>
    );
  }

  if (isUserBookingsError) {
    return (
      <CustomerPortalPage contentClassName="max-w-[1480px]">
        {pageHeader}
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={CalendarDaysIcon}
            title={legacyText(
              "LocationScopedMyBookingsTable_Bookings_could_not_be_loaded_e531a",
            )}
            description={legacyText(
              "LocationScopedMyBookingsTable_Check_your_connection_and_try_again_56386",
            )}
            action={
              <button
                type="button"
                onClick={() => refetchUserBookings()}
                className={customerPortalPrimaryActionClass}
              >
                {legacyText("LocationScopedMyBookingsTable_Try_again_042c8")}
              </button>
            }
          />
        </CustomerPortalSurface>
      </CustomerPortalPage>
    );
  }

  const sortButtonClasses =
    "group inline-flex min-h-11 items-center gap-1.5 rounded-full font-medium text-[11px] uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)] transition-colors duration-200 hover:text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/25";

  const headerLabelClasses =
    "font-medium text-[11px] uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)]";

  const editButtonClasses = customerPortalSecondaryActionClass;

  return (
    <CustomerPortalPage
      contentClassName="max-w-[1480px]"
      data-customer-bookings-location-id={activeLocationId || undefined}
    >
      {pageHeader}
      <CustomerPortalSurface
        className="mt-7"
        aria-busy={isFetchingUserBookings}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] px-4 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
            {scope === "history"
              ? legacyText(
                  "LocationScopedMyBookingsTable_Booking_history_a8ef6",
                )
              : legacyText(
                  "LocationScopedMyBookingsTable_Upcoming_visits_ecb00",
                )}
          </p>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <div
              className="inline-flex min-h-11 rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-background)] p-1"
              role="group"
              aria-label={legacyText(
                "LocationScopedMyBookingsTable_Booking_range_9d1f1",
              )}
            >
              {[
                [
                  "upcoming",
                  legacyText("LocationScopedMyBookingsTable_Upcoming_523ba"),
                ],
                [
                  "history",
                  legacyText("LocationScopedMyBookingsTable_History_90ccd"),
                ],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => {
                    setScope(value);
                    setPage(1);
                    setSortBy("date");
                    setSortOrder(value === "history" ? "desc" : "asc");
                    setIsDrawerOpen(false);
                    setSelectedBooking(null);
                    setSelectedProduct(null);
                  }}
                  className={classNames(
                    "min-h-9 rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/25",
                    scope === value
                      ? "bg-[var(--tenant-secondary-surface)] text-[var(--tenant-text-on-secondary-surface)] shadow-sm"
                      : "text-[var(--tenant-muted-text)] hover:text-[var(--tenant-text)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="divide-y divide-[var(--tenant-border)]">
            {sortedBookings.length > 0 ? (
              sortedBookings.map((booking) => {
                const product = resolveBookingProduct(products, booking);
                const locationName = getLocationName(booking);
                const productName = getBookingProductName(
                  product,
                  language,
                  translation,
                  activeLocale,
                );
                const timezone = getBookingTimezone(booking);
                const displayLocale = activeLocale;

                return (
                  <article key={booking._id || booking.id} className="p-4">
                    <div className="rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-medium leading-6 text-[var(--tenant-text-on-surface)]">
                            {productName}
                          </h3>
                          <CustomerBookingStatus
                            booking={booking}
                            language={language}
                          />

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {booking.tag === "course" && (
                              <CourseBadge language={language} />
                            )}

                            <span className="inline-flex rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-1 font-medium text-[10px] uppercase tracking-[0.14em] text-[var(--tenant-text-on-surface)]">
                              {locationName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-medium text-[var(--tenant-text-on-surface)]">
                            {translation["DATE"][language]}
                          </span>
                          <span className="text-right text-[var(--tenant-text-on-surface)]">
                            {formatZonedDate(
                              booking.start,
                              timezone,
                              displayLocale,
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="font-medium text-[var(--tenant-text-on-surface)]">
                            {translation["TIME"][language]}
                          </span>
                          <span className="text-right text-[var(--tenant-text-on-surface)]">
                            {formatZonedTimeRange(
                              booking.start,
                              booking.end || booking.start,
                              timezone,
                              displayLocale,
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="font-medium text-[var(--tenant-text-on-surface)]">
                            {translation["NUMBER_OF_GUESTS"][language]}
                          </span>
                          <span className="text-right text-[var(--tenant-text-on-surface)]">
                            {getGuestsCount(booking)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditClick(booking)}
                        className={classNames(editButtonClasses, "mt-4 w-full")}
                      >
                        {scope === "history" ||
                        (!booking.canCancel &&
                          !booking.canReschedule &&
                          !booking.canExtend &&
                          !booking.hasPendingExtension)
                          ? legacyText(
                              "LocationScopedMyBookingsTable_View_69bd4",
                            )
                          : translation["EDIT"][language]}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="p-3">
                <CustomerPortalEmptyState
                  className="min-h-[240px]"
                  icon={CalendarDaysIcon}
                  title={translation["NO_BOOKINGS"][language]}
                  description={
                    scope === "history"
                      ? legacyText(
                          "LocationScopedMyBookingsTable_Completed_and_cancelled_bookings_will_appear_here_e9311",
                        )
                      : legacyText(
                          "LocationScopedMyBookingsTable_Choose_a_studio_time_and_plan_your_next_visit_5f44f",
                        )
                  }
                  action={scope === "upcoming" ? bookAction : null}
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[var(--tenant-surface)]">
                  <th className="border-b border-[var(--tenant-border)] px-6 py-4 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className={sortButtonClasses}
                    >
                      <span>{translation["BOOKING"][language]}</span>
                      <SortIcon active={sortBy === "name"} order={sortOrder} />
                    </button>
                  </th>

                  <th className="border-b border-[var(--tenant-border)] px-4 py-4 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort("location")}
                      className={sortButtonClasses}
                    >
                      <span>
                        {legacyText(
                          "LocationScopedMyBookingsTable_Studio_5b23b",
                        )}
                      </span>
                      <SortIcon
                        active={sortBy === "location"}
                        order={sortOrder}
                      />
                    </button>
                  </th>

                  <th className="border-b border-[var(--tenant-border)] px-4 py-4 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        handleSort("date", scope === "history" ? "desc" : "asc")
                      }
                      className={sortButtonClasses}
                    >
                      <span>{translation["DATE"][language]}</span>
                      <SortIcon active={sortBy === "date"} order={sortOrder} />
                    </button>
                  </th>

                  <th className="border-b border-[var(--tenant-border)] px-4 py-4 text-left">
                    <span className={headerLabelClasses}>
                      {translation["TIME"][language]}
                    </span>
                  </th>

                  <th className="border-b border-[var(--tenant-border)] px-4 py-4 text-left">
                    <span className={headerLabelClasses}>
                      {legacyText("LocationScopedMyBookingsTable_Guests_3c23a")}
                    </span>
                  </th>

                  <th className="border-b border-[var(--tenant-border)] px-6 py-4 text-right" />
                </tr>
              </thead>

              <tbody>
                {sortedBookings.length > 0 ? (
                  sortedBookings.map((booking) => {
                    const product = resolveBookingProduct(products, booking);
                    const locationName = getLocationName(booking);
                    const productName = getBookingProductName(
                      product,
                      language,
                      translation,
                      activeLocale,
                    );
                    const timezone = getBookingTimezone(booking);
                    const displayLocale = activeLocale;

                    return (
                      <tr
                        key={booking._id || booking.id}
                        className="transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))]"
                      >
                        <td className="border-b border-[var(--tenant-border)] px-6 py-5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-6 text-[var(--tenant-text-on-surface)]">
                              {productName}
                            </p>
                            <CustomerBookingStatus
                              booking={booking}
                              language={language}
                            />

                            {booking.tag === "course" && (
                              <div className="mt-2">
                                <CourseBadge language={language} />
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="border-b border-[var(--tenant-border)] px-4 py-5 text-sm text-[var(--tenant-text-on-surface)]">
                          {locationName}
                        </td>

                        <td className="border-b border-[var(--tenant-border)] px-4 py-5 text-sm text-[var(--tenant-text-on-surface)]">
                          {formatZonedDate(
                            booking.start,
                            timezone,
                            displayLocale,
                          )}
                        </td>

                        <td className="border-b border-[var(--tenant-border)] px-4 py-5 text-sm text-[var(--tenant-text-on-surface)]">
                          {formatZonedTimeRange(
                            booking.start,
                            booking.end || booking.start,
                            timezone,
                            displayLocale,
                          )}
                        </td>

                        <td className="border-b border-[var(--tenant-border)] px-4 py-5 text-sm text-[var(--tenant-text-on-surface)]">
                          {getGuestsCount(booking)}
                        </td>

                        <td className="border-b border-[var(--tenant-border)] px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditClick(booking)}
                            className={editButtonClasses}
                          >
                            {scope === "history" ||
                            (!booking.canCancel &&
                              !booking.canReschedule &&
                              !booking.canExtend &&
                              !booking.hasPendingExtension)
                              ? legacyText(
                                  "LocationScopedMyBookingsTable_View_69bd4",
                                )
                              : translation["EDIT"][language]}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-3">
                      <CustomerPortalEmptyState
                        icon={CalendarDaysIcon}
                        title={translation["NO_BOOKINGS"][language]}
                        description={
                          scope === "history"
                            ? legacyText(
                                "LocationScopedMyBookingsTable_Completed_and_cancelled_bookings_will_appear_here_e9311",
                              )
                            : legacyText(
                                "LocationScopedMyBookingsTable_Choose_a_studio_time_and_plan_your_next_visit_5f44f",
                              )
                        }
                        action={scope === "upcoming" ? bookAction : null}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pagination.totalCount > 0 && (
          <footer className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p
              className="text-xs text-[var(--tenant-muted-text)]"
              aria-live="polite"
            >
              {legacyText(
                "LocationScopedMyBookingsTable_Showing_value1_value2_of_value3_f25d4",
                {
                  value1: (currentPage - 1) * pagination.pageSize + 1,
                  value2: Math.min(
                    currentPage * pagination.pageSize,
                    pagination.totalCount,
                  ),
                  value3: pagination.totalCount,
                },
              )}
            </p>

            <nav
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-end sm:gap-3"
              aria-label={legacyText(
                "LocationScopedMyBookingsTable_Booking_pagination_b2e65",
              )}
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isFetchingUserBookings}
                className={classNames(
                  customerPortalSecondaryActionClass,
                  "max-sm:gap-1 max-sm:!px-2",
                )}
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                {legacyText("LocationScopedMyBookingsTable_Previous_50f94")}
              </button>
              <span className="min-w-0 text-center text-xs text-[var(--tenant-muted-text)] sm:min-w-16">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={
                  page >= pagination.totalPages || isFetchingUserBookings
                }
                className={classNames(
                  customerPortalSecondaryActionClass,
                  "max-sm:gap-1 max-sm:!px-2",
                )}
              >
                {legacyText("LocationScopedMyBookingsTable_Next_bc981")}
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </footer>
        )}
      </CustomerPortalSurface>

      {selectedBooking && (
        <Drawer
          key={`${selectedBooking._id || selectedBooking.id}:${selectedBooking.start}:${selectedBooking.end}`}
          open={isDrawerOpen}
          setOpen={setIsDrawerOpen}
          booking={selectedBooking}
          product={selectedProduct || selectedBooking.product || null}
          products={products || []}
          bookings={bookings || []}
        />
      )}
    </CustomerPortalPage>
  );
}
