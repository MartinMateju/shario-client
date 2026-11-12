"use client";

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
import translation from "@/translations/translation";
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

const getBookingProductName = (product, language) => {
  const name = product?.name ?? product?.title;

  if (!name) return translation["BOOKING"]?.[language] || "Booking";

  if (typeof name === "object") {
    return (
      name?.[language] ||
      (language === "CZ" ? name?.cs : name?.en) ||
      name?.CZ ||
      name?.EN ||
      name?.cs ||
      name?.en ||
      translation["BOOKING"]?.[language] ||
      "Booking"
    );
  }

  return name;
};

const resolveBookingProduct = (products, booking) =>
  getProductByBooking(products, booking) ||
  booking?.product ||
  booking?.bookingProduct ||
  booking?.productSnapshot ||
  null;

function CourseBadge({ language }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-1 font-medium text-[10px] uppercase tracking-[0.14em] text-[var(--tenant-text-on-surface)]">
      {translation["COURSE_BOOKING"]?.[language] || "Course"}
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

        comparison = getBookingProductName(productA, language).localeCompare(
          getBookingProductName(productB, language),
        );
      }

      if (sortBy === "location") {
        comparison = getLocationName(a).localeCompare(getLocationName(b));
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [visibleBookings, sortBy, sortOrder, products, language]);

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

  const summaryText = useMemo(() => {
    if (language === "CZ") {
      return `${
        scope === "history"
          ? "Zde najdete svou historii včetně zrušených rezervací."
          : "Zde najdete své nadcházející rezervace."
      } Celkem ${pagination.totalCount} položek${
        isFetchingUserBookings ? "…" : "."
      }`;
    }

    return `${
      scope === "history"
        ? "Here is your booking history, including cancelled bookings."
        : "Here you can find your upcoming bookings."
    } ${pagination.totalCount} items in total${
      isFetchingUserBookings ? "…" : "."
    }`;
  }, [isFetchingUserBookings, language, pagination.totalCount, scope]);

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
        {language === "CZ" ? "Rezervovat studio" : "Book a session"}
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    ) : null;
  const pageHeader = (
    <CustomerPortalPageHeader
      headingAs={Heading}
      eyebrow={language === "CZ" ? "Přehled rezervací" : "Booking overview"}
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
            label={
              language === "CZ" ? "Načítám rezervace…" : "Loading bookings…"
            }
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
            title={
              language === "CZ"
                ? "Rezervace se nepodařilo načíst"
                : "Bookings could not be loaded"
            }
            description={
              language === "CZ"
                ? "Zkontrolujte připojení a zkuste to znovu."
                : "Check your connection and try again."
            }
            action={
              <button
                type="button"
                onClick={() => refetchUserBookings()}
                className={customerPortalPrimaryActionClass}
              >
                {language === "CZ" ? "Zkusit znovu" : "Try again"}
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
              ? language === "CZ"
                ? "Historie rezervací"
                : "Booking history"
              : language === "CZ"
                ? "Nadcházející návštěvy"
                : "Upcoming visits"}
          </p>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <div
              className="inline-flex min-h-11 rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-background)] p-1"
              role="group"
              aria-label={
                language === "CZ" ? "Rozsah rezervací" : "Booking range"
              }
            >
              {[
                ["upcoming", language === "CZ" ? "Nadcházející" : "Upcoming"],
                ["history", language === "CZ" ? "Historie" : "History"],
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
                const productName = getBookingProductName(product, language);
                const timezone = getBookingTimezone(booking);
                const displayLocale = language === "CZ" ? "cs-CZ" : "en-GB";

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
                          ? language === "CZ"
                            ? "Zobrazit"
                            : "View"
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
                      ? language === "CZ"
                        ? "Po dokončení nebo zrušení rezervace ji najdete zde."
                        : "Completed and cancelled bookings will appear here."
                      : language === "CZ"
                        ? "Vyberte si čas ve studiu a naplánujte si další návštěvu."
                        : "Choose a studio time and plan your next visit."
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
                      <span>{language === "CZ" ? "Dílna" : "Studio"}</span>
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
                      {language === "CZ" ? "Počet osob" : "Guests"}
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
                    );
                    const timezone = getBookingTimezone(booking);
                    const displayLocale = language === "CZ" ? "cs-CZ" : "en-GB";

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
                              ? language === "CZ"
                                ? "Zobrazit"
                                : "View"
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
                            ? language === "CZ"
                              ? "Po dokončení nebo zrušení rezervace ji najdete zde."
                              : "Completed and cancelled bookings will appear here."
                            : language === "CZ"
                              ? "Vyberte si čas ve studiu a naplánujte si další návštěvu."
                              : "Choose a studio time and plan your next visit."
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
              {language === "CZ"
                ? `Zobrazeno ${
                    (currentPage - 1) * pagination.pageSize + 1
                  }–${Math.min(
                    currentPage * pagination.pageSize,
                    pagination.totalCount,
                  )} z ${pagination.totalCount}`
                : `Showing ${
                    (currentPage - 1) * pagination.pageSize + 1
                  }–${Math.min(
                    currentPage * pagination.pageSize,
                    pagination.totalCount,
                  )} of ${pagination.totalCount}`}
            </p>

            <nav
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-end sm:gap-3"
              aria-label={
                language === "CZ"
                  ? "Stránkování rezervací"
                  : "Booking pagination"
              }
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
                {language === "CZ" ? "Předchozí" : "Previous"}
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
                {language === "CZ" ? "Další" : "Next"}
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
