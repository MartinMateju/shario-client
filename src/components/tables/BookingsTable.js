"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import Loader from "@/components/loaders/Loader";
import AlertModal from "@/components/modals/AlertModal";
import ConfirmationModal from "@/components/modals/ConformationModal";
import { Link, useRouter } from "@/i18n/navigation";
import { getBookingEditorHref } from "@/components/bookings/bookingEditor.utils";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  useDeleteBookingMutation,
  useGetBookingsWithFiltersMutation,
} from "@/lib/features/bookings/bookingsApiSlice";
import { useGetAllLecturersQuery } from "@/lib/features/lecturers/lecturersApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { useGetUsersQuery } from "@/lib/features/users/usersApiSlice";

import {
  DEFAULT_PAGE_SIZE,
  INITIAL_BOOKING_FILTERS,
} from "./bookings/booking-table.constants";
import {
  buildBookingRequest,
  buildBookingSummary,
  countActiveFilters,
  exportBookingsToCsv,
} from "./bookings/booking-table.utils";
import BookingsDataTable from "./bookings/BookingsDataTable";
import BookingsOverview from "./bookings/BookingsOverview";
import BookingsPagination from "./bookings/BookingsPagination";
import BookingsToolbar from "./bookings/BookingsToolbar";

const getTenantAccess = (user) => {
  const roles = [
    user?.tenantRole,
    user?.tenant_role,
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]
    .filter(Boolean)
    .map((role) =>
      typeof role === "string" ? role.toUpperCase() : role?.name?.toUpperCase(),
    );

  const isTenantUser = Boolean(
    user?.isAdmin ||
    user?.isModerator ||
    user?.isOwner ||
    user?.isStaff ||
    roles.some((role) =>
      ["OWNER", "ADMIN", "STAFF", "MANAGER", "MODERATOR"].includes(role),
    ),
  );

  const canDelete = Boolean(
    user?.isAdmin ||
    user?.isOwner ||
    roles.some((role) => ["OWNER", "ADMIN", "MANAGER"].includes(role)),
  );

  return { isTenantUser, canDelete };
};

function TableLoadingOverlay({ label }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/65 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-full border border-[#E7E4DE] bg-white px-4 py-3 shadow-[0_16px_45px_rgba(17,17,15,0.1)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
        <span className="text-[11px] font-medium text-[#4F4F4F]">{label}</span>
      </div>
    </div>
  );
}

const getLocationsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.locations)) return response.locations;

  return [];
};

const getLocationId = (location) => {
  const id = location?._id || location?.id;

  return id ? String(id) : "";
};

const getLocationScopedFilters = (locationId = "") => ({
  ...INITIAL_BOOKING_FILTERS,
  locationId,
});

export default function BookingsTable({
  showPageHeader = true,
  showCreateButton = true,
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Bookings");
  const currentUser = useSelector(selectCurrentUser) || {};
  const activeStudioId = useSelector(selectActiveStudioId);
  const userId = currentUser.id || currentUser._id;
  const { isTenantUser, canDelete } = getTenantAccess(currentUser);

  const { data: products = [], isLoading: isLoadingProducts } =
    useGetProductsQuery();
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery(
    { userId },
    { skip: !userId },
  );
  const { data: lecturers = [], isLoading: isLoadingLecturers } =
    useGetAllLecturersQuery({ userId }, { skip: !userId });
  const { data: locationsResponse, isLoading: isLoadingLocations } =
    useGetLocationsQuery(
      { isActive: true, bookingEnabled: true, limit: 100 },
      { skip: !userId },
    );

  const locations = useMemo(
    () => getLocationsFromResponse(locationsResponse),
    [locationsResponse],
  );

  const activeLocationId = useMemo(() => {
    const requestedId = activeStudioId ? String(activeStudioId) : "";
    const requestedLocationExists = locations.some(
      (location) => getLocationId(location) === requestedId,
    );

    return requestedLocationExists ? requestedId : getLocationId(locations[0]);
  }, [activeStudioId, locations]);

  const [deleteBooking, { isLoading: isDeleting }] = useDeleteBookingMutation();
  const [
    getBookingsWithFilters,
    { data: bookingsData, isLoading: isLoadingBookings },
  ] = useGetBookingsWithFiltersMutation();

  const [filters, setFilters] = useState(() =>
    getLocationScopedFilters(activeStudioId || ""),
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    getLocationScopedFilters(activeStudioId || ""),
  );
  const [activeView, setActiveView] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  const [bookingIdToDelete, setBookingIdToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const bookings = useMemo(
    () => bookingsData?.bookings || [],
    [bookingsData?.bookings],
  );
  const totalCount =
    bookingsData?.totalCount ?? bookingsData?.total ?? bookings.length;
  const totalPages =
    bookingsData?.totalPages ?? Math.ceil(totalCount / pageSize) ?? 0;

  const fetchBookings = useCallback(
    async ({ page, nextFilters, nextView, nextSortOrder, nextPageSize }) => {
      try {
        await getBookingsWithFilters(
          buildBookingRequest({
            filters: nextFilters,
            view: nextView,
            page,
            limit: nextPageSize,
            sortOrder: nextSortOrder,
            // Kept for compatibility with the legacy endpoint. The backend
            // should still enforce tenant and role authorization itself.
            isAdmin: isTenantUser,
          }),
        ).unwrap();

        setCurrentPage(page);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
      } finally {
        setHasLoadedInitially(true);
      }
    },
    [getBookingsWithFilters, isTenantUser],
  );

  const refreshBookings = useCallback(() => {
    return fetchBookings({
      page: currentPage,
      nextFilters: appliedFilters,
      nextView: activeView,
      nextSortOrder: sortOrder,
      nextPageSize: pageSize,
    });
  }, [
    activeView,
    appliedFilters,
    currentPage,
    fetchBookings,
    pageSize,
    sortOrder,
  ]);

  useEffect(() => {
    if (!userId || isLoadingLocations) return;

    const nextFilters = getLocationScopedFilters(activeLocationId);
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setActiveView("all");
      setSelectedIds(new Set());

      void fetchBookings({
        page: 1,
        nextFilters,
        nextView: "all",
        nextSortOrder: "desc",
        nextPageSize: DEFAULT_PAGE_SIZE,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeLocationId, fetchBookings, isLoadingLocations, userId]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) setSelectedIds(new Set());
    });

    return () => {
      cancelled = true;
    };
  }, [bookingsData]);

  const summary = useMemo(
    () =>
      buildBookingSummary({
        bookingsData,
        bookings,
        products,
        totalCount,
      }),
    [bookings, bookingsData, products, totalCount],
  );

  const activeFilterCount = countActiveFilters(filters);

  const updateFilter = useCallback((key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setSelectedIds(new Set());

    fetchBookings({
      page: 1,
      nextFilters: filters,
      nextView: activeView,
      nextSortOrder: sortOrder,
      nextPageSize: pageSize,
    });
  }, [activeView, fetchBookings, filters, pageSize, sortOrder]);

  const handleFutureOnlyChange = useCallback(
    (futureOnly) => {
      const nextFilters = { ...appliedFilters, futureOnly };
      setFilters((previous) => ({ ...previous, futureOnly }));
      setAppliedFilters(nextFilters);
      setSelectedIds(new Set());

      fetchBookings({
        page: 1,
        nextFilters,
        nextView: activeView,
        nextSortOrder: sortOrder,
        nextPageSize: pageSize,
      });
    },
    [activeView, appliedFilters, fetchBookings, pageSize, sortOrder],
  );

  const handleClearFilters = useCallback(() => {
    const nextFilters = getLocationScopedFilters(activeLocationId);

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setActiveView("all");
    setSelectedIds(new Set());

    fetchBookings({
      page: 1,
      nextFilters,
      nextView: "all",
      nextSortOrder: sortOrder,
      nextPageSize: pageSize,
    });
  }, [activeLocationId, fetchBookings, pageSize, sortOrder]);

  const handleViewChange = useCallback(
    (view) => {
      setActiveView(view);
      setSelectedIds(new Set());

      fetchBookings({
        page: 1,
        nextFilters: appliedFilters,
        nextView: view,
        nextSortOrder: sortOrder,
        nextPageSize: pageSize,
      });
    },
    [appliedFilters, fetchBookings, pageSize, sortOrder],
  );

  const handleToggleSort = useCallback(() => {
    const nextSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextSortOrder);

    fetchBookings({
      page: 1,
      nextFilters: appliedFilters,
      nextView: activeView,
      nextSortOrder,
      nextPageSize: pageSize,
    });
  }, [activeView, appliedFilters, fetchBookings, pageSize, sortOrder]);

  const handlePageChange = useCallback(
    (page) => {
      if (page < 1 || page > Math.max(totalPages, 1)) return;

      fetchBookings({
        page,
        nextFilters: appliedFilters,
        nextView: activeView,
        nextSortOrder: sortOrder,
        nextPageSize: pageSize,
      });
    },
    [
      activeView,
      appliedFilters,
      fetchBookings,
      pageSize,
      sortOrder,
      totalPages,
    ],
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize) => {
      setPageSize(nextPageSize);
      setSelectedIds(new Set());

      fetchBookings({
        page: 1,
        nextFilters: appliedFilters,
        nextView: activeView,
        nextSortOrder: sortOrder,
        nextPageSize,
      });
    },
    [activeView, appliedFilters, fetchBookings, sortOrder],
  );

  const handleToggleRow = useCallback((bookingId) => {
    const normalizedId = String(bookingId);

    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(normalizedId)) next.delete(normalizedId);
      else next.add(normalizedId);

      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((previous) => {
      const visibleIds = bookings.map((booking) =>
        String(booking._id || booking.id),
      );
      const allSelected = visibleIds.every((id) => previous.has(id));

      return allSelected ? new Set() : new Set(visibleIds);
    });
  }, [bookings]);

  const handleExport = useCallback(() => {
    const selectedBookings = bookings.filter((booking) =>
      selectedIds.has(String(booking._id || booking.id)),
    );

    exportBookingsToCsv({
      bookings: selectedBookings.length > 0 ? selectedBookings : bookings,
      products,
      users,
      locale,
      t,
    });
  }, [bookings, locale, products, selectedIds, t, users]);

  const handleEdit = useCallback(
    (booking) => {
      const bookingId = String(booking?._id || booking?.id || "");
      if (bookingId) router.push(getBookingEditorHref(bookingId));
    },
    [router],
  );

  const handleDeleteRequest = useCallback((bookingId) => {
    setBookingIdToDelete(bookingId);
    setShowDeleteAlert(true);
  }, []);

  const handleDeleteBooking = useCallback(async () => {
    setShowDeleteAlert(false);

    if (!bookingIdToDelete) return;

    try {
      await deleteBooking({
        id: bookingIdToDelete,
        userId,
        isAdmin: isTenantUser,
      }).unwrap();

      setShowDeleteConfirmation(true);
      await refreshBookings();
    } catch (error) {
      console.error("Failed to delete booking:", error);
    } finally {
      setBookingIdToDelete(null);
    }
  }, [bookingIdToDelete, deleteBooking, isTenantUser, refreshBookings, userId]);

  const isInitialLoading =
    !hasLoadedInitially ||
    isLoadingProducts ||
    isLoadingUsers ||
    isLoadingLecturers ||
    isLoadingLocations;
  if (isInitialLoading) return <Loader />;

  return (
    <>
      <ConfirmationModal
        open={showDeleteConfirmation}
        setOpen={setShowDeleteConfirmation}
        title={t("modals.deletedTitle")}
        text={t("modals.deletedText")}
      />

      <AlertModal
        open={showDeleteAlert}
        setOpen={setShowDeleteAlert}
        onSubmitClicked={handleDeleteBooking}
        title={t("modals.deleteTitle")}
        text={t("modals.deleteText")}
      />

      <div className="space-y-5">
        {showPageHeader && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[28px] font-medium tracking-[-0.045em] text-[#11110F] sm:text-[32px]">
                {t("title")}
              </h1>
              <p className="mt-1 text-[12px] text-[#73726D]">{t("subtitle")}</p>
            </div>

            {showCreateButton && (
              <Link
                href="/app/bookings/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                <PlusIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
                {t("newBooking")}
              </Link>
            )}
          </div>
        )}

        <BookingsOverview
          summary={summary}
          t={t}
          isLoading={isLoadingBookings && !hasLoadedInitially}
        />

        <section className="relative overflow-hidden rounded-[20px] border border-[#E7E4DE] bg-white shadow-[0_12px_36px_rgba(31,31,31,0.045)]">
          {(isLoadingBookings || isDeleting) && hasLoadedInitially && (
            <TableLoadingOverlay label={t("loading")} />
          )}

          <BookingsToolbar
            activeView={activeView}
            summary={summary}
            filters={filters}
            activeFilterCount={activeFilterCount}
            showFilters={showFilters}
            locations={locations}
            products={products}
            lecturers={lecturers}
            t={t}
            onViewChange={handleViewChange}
            onFilterChange={updateFilter}
            onFutureOnlyChange={handleFutureOnlyChange}
            onToggleFilters={() => setShowFilters((current) => !current)}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            onExport={handleExport}
          />

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-skab-cobalt-100 bg-skab-cobalt-50 px-5 py-2.5 text-[10px] text-skab-cobalt-600">
              <span className="font-semibold">
                {t("selection.selected", { count: selectedIds.size })}
              </span>
              <span className="text-skab-cobalt-300">·</span>
              <button
                type="button"
                onClick={handleExport}
                className="font-medium transition hover:text-[#11110F]"
              >
                {t("selection.exportSelected")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white"
                aria-label={t("selection.clear")}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <BookingsDataTable
            bookings={bookings}
            products={products}
            users={users}
            selectedIds={selectedIds}
            sortOrder={sortOrder}
            locale={locale}
            canDelete={canDelete}
            t={t}
            onToggleSort={handleToggleSort}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />

          <BookingsPagination
            currentPage={currentPage}
            totalPages={Math.max(totalPages, 1)}
            totalCount={totalCount}
            pageSize={pageSize}
            currentCount={bookings.length}
            t={t}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>
      </div>
    </>
  );
}
