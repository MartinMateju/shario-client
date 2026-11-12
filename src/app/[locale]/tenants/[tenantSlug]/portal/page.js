"use client";

import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";

import { useCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import Menu from "@/components/menu/Menu";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";
import {
  getUpcomingBookingsQueryArgs,
  isPortalBookingAccountEnabled,
  isPortalCreditsEnabled,
} from "@/components/menu/portalDashboardQueries";
import Sidebar from "@/components/sidebars/Sidebar";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  useGetCustomerBookingAvailabilityQuery,
  useGetUserBookingsQuery,
} from "@/lib/features/bookings/bookingsApiSlice";
import { setLoaderRunning } from "@/lib/features/config/configSlice";
import { useGetMyCreditBalanceQuery } from "@/lib/features/credits/creditsApiSlice";
import { useGetCustomerCatalogQuery } from "@/lib/features/products/productsApiSlice";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import {
  isCustomerBookingCommerceEnabled,
  isCustomerBookingFlowEnabled,
  isServiceCatalogEnabled,
} from "@/utils/studioFlow";

const errorCopy = {
  en: {
    title: "Studio information could not be loaded",
    description: "Check your connection and try again.",
    retry: "Try again",
    loading: "Loading studio information",
  },
  cs: {
    title: "Informace o studiu se nepodařilo načíst",
    description: "Zkontrolujte připojení a zkuste to znovu.",
    retry: "Zkusit znovu",
    loading: "Načítání informací o studiu",
  },
};

function BookingDashboard() {
  const dispatch = useDispatch();
  const locale = useLocale();
  const currentTenant = useSelector(selectCurrentTenant);
  const visibilityTenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const currentUserId = useSelector(selectCurrentUser)?.id;
  const { activeLocation, activeLocationId, locations } =
    useCustomerPortalLocation();
  const modules = currentTenant?.modules;
  const calendarEnabled = isCustomerPortalPageEnabled(
    visibilityTenant,
    "calendar",
  );
  const bookingFlowEnabled =
    isCustomerBookingFlowEnabled(modules) && calendarEnabled;
  const bookingCommerceEnabled =
    isCustomerBookingCommerceEnabled(modules) && calendarEnabled;
  const serviceCatalogEnabled = isServiceCatalogEnabled(modules);
  const copy = errorCopy[locale === "cs" ? "cs" : "en"];
  const activeBookingLocationId =
    bookingFlowEnabled && activeLocation?.booking?.enabled !== false
      ? activeLocationId
      : "";

  const bookingAvailabilityEnabled =
    bookingFlowEnabled && Boolean(activeBookingLocationId);

  const {
    data: bookingsData,
    isFetching: isFetchingBookings,
    isLoading: isLoadingBookings,
    isError: isBookingsError,
    refetch: refetchBookings,
  } = useGetCustomerBookingAvailabilityQuery(
    { locationId: activeBookingLocationId },
    {
      pollingInterval: 150_000,
      refetchOnMountOrArgChange: true,
      skip: !bookingAvailabilityEnabled,
    },
  );
  const bookings = useMemo(
    () =>
      Array.isArray(bookingsData?.bookings)
        ? bookingsData.bookings
        : Array.isArray(bookingsData?.availability)
          ? bookingsData.availability
          : Array.isArray(bookingsData)
            ? bookingsData
            : [
                ...(bookingsData?.workshops || []),
                ...(bookingsData?.courses || []),
              ],
    [bookingsData],
  );
  const {
    data: catalogProducts = [],
    isFetching: isFetchingProducts,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useGetCustomerCatalogQuery(
    activeLocationId ? { locationId: activeLocationId } : undefined,
    {
      skip: !serviceCatalogEnabled,
      refetchOnMountOrArgChange: true,
    },
  );
  // RTK Query can retain the previous location's data during the next fetch.
  const products = useMemo(
    () =>
      catalogProducts.filter((product) =>
        isProductAvailableAtLocation(product, activeLocationId),
      ),
    [activeLocationId, catalogProducts],
  );

  // Menu shows the credit balance and next visit, but it only mounts after
  // the calendar data above has loaded. Starting both requests here runs them
  // in parallel with the calendar instead of after it.
  useGetMyCreditBalanceQuery(undefined, {
    skip:
      !isPortalCreditsEnabled(modules) ||
      !isCustomerPortalPageEnabled(visibilityTenant, "credits"),
  });
  useGetUserBookingsQuery(getUpcomingBookingsQueryArgs(activeLocationId), {
    skip:
      !currentUserId ||
      !isPortalBookingAccountEnabled(modules) ||
      !isCustomerPortalPageEnabled(visibilityTenant, "bookings") ||
      !activeLocationId,
  });

  useEffect(() => {
    dispatch(setLoaderRunning(false));
  }, [dispatch]);

  if (isLoadingProducts || (bookingAvailabilityEnabled && isLoadingBookings)) {
    return (
      <main
        className="flex min-h-[70vh] items-center justify-center px-5"
        data-customer-portal-page
        data-tenant-layout="page"
        style={{
          backgroundColor: "var(--tenant-background)",
          color: "var(--tenant-text)",
        }}
      >
        <div
          aria-busy="true"
          aria-label={copy.loading}
          className="flex min-h-40 w-full max-w-md items-center justify-center border p-8"
          data-customer-portal-loading-state
          data-customer-portal-surface
          data-tenant-layout="panel"
          data-tenant-surface="panel"
          role="status"
          style={{
            backgroundColor: "var(--tenant-surface)",
            borderColor: "var(--tenant-border)",
            color: "var(--tenant-accent-on-surface)",
          }}
        >
          <span
            aria-hidden="true"
            className="h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent motion-reduce:animate-none"
          />
          <span className="sr-only">{copy.loading}</span>
        </div>
      </main>
    );
  }

  if (
    (bookingAvailabilityEnabled && isBookingsError) ||
    (serviceCatalogEnabled && isProductsError)
  ) {
    return (
      <main
        className="flex min-h-[70vh] items-center justify-center px-5"
        data-customer-portal-page
        data-tenant-layout="page"
        style={{
          backgroundColor: "var(--tenant-background)",
          color: "var(--tenant-text)",
        }}
      >
        <div
          className="max-w-md rounded-[24px] border p-8 text-center shadow-sm"
          data-customer-portal-surface
          data-tenant-layout="panel"
          data-tenant-surface="panel"
          style={{
            backgroundColor: "var(--tenant-surface)",
            borderColor:
              "color-mix(in srgb, var(--tenant-text) 14%, transparent)",
            color: "var(--tenant-text-on-surface)",
          }}
        >
          <h1
            className="text-[26px] tracking-[-0.035em]"
            data-tenant-type="display"
            style={{
              color: "var(--tenant-heading-color)",
              fontFamily: "var(--tenant-font-display)",
            }}
          >
            {copy.title}
          </h1>
          <p
            className="mt-2 text-[13px] leading-5"
            style={{
              color: "var(--tenant-muted-on-surface)",
            }}
          >
            {copy.description}
          </p>
          <button
            type="button"
            data-tenant-button="primary"
            onClick={() => {
              if (serviceCatalogEnabled) refetchProducts();
              if (bookingAvailabilityEnabled) refetchBookings();
            }}
            className="mt-5 min-h-11 rounded-full px-6 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: "var(--tenant-accent)",
              color: "var(--tenant-accent-foreground)",
              "--tw-ring-color": "var(--tenant-accent-link)",
            }}
          >
            {copy.retry}
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Menu
        bookings={bookings}
        products={products}
        locations={locations}
        activeLocationId={activeLocationId}
        activeBookingLocationId={activeBookingLocationId}
        modules={modules}
      />
      {bookingCommerceEnabled && activeBookingLocationId && (
        <Sidebar
          key={activeBookingLocationId}
          bookings={bookings}
          products={products}
          locations={locations}
          activeLocationId={activeBookingLocationId}
          isAvailabilityLoading={
            bookingAvailabilityEnabled && isFetchingBookings
          }
          isCatalogLoading={serviceCatalogEnabled && isFetchingProducts}
        />
      )}
    </>
  );
}

export default BookingDashboard;
