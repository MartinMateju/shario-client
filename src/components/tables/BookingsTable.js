"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import TableLoadingState from "@/components/loaders/TableLoadingState";
import AlertModal from "@/components/modals/AlertModal";
import ConfirmationModal from "@/components/modals/ConformationModal";
import { Link, useRouter } from "@/i18n/navigation";
import { getBookingEditorHref } from "@/components/bookings/bookingEditor.utils";
import {
  getAuthCacheIdentity,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { useDeleteBookingMutation } from "@/lib/features/bookings/bookingsApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  useGetBookingDirectoryQuery,
  useGetBookingFilterOptionsQuery,
} from "@/lib/features/bookings/bookingDirectoryApiSlice";

import {
  DEFAULT_PAGE_SIZE,
  INITIAL_BOOKING_FILTERS,
} from "./bookings/booking-table.constants";
import {
  buildBookingRequest,
  buildBookingSummary,
  countActiveFilters,
  exportBookingsToCsv,
  formatMoney,
  getBookingViewAfterApplyingFilters,
} from "./bookings/booking-table.utils";
import BookingsDataTable from "./bookings/BookingsDataTable";
import BookingsOverview from "./bookings/BookingsOverview";
import BookingsPagination from "./bookings/BookingsPagination";
import BookingsToolbar from "./bookings/BookingsToolbar";

const EMPTY_OPTIONS = [];

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

export default function BookingsTable(props) {
  const currentUser = useSelector(selectCurrentUser) || {};
  const cacheScope = useSelector(getAuthCacheIdentity);
  const activeStudioId = useSelector(selectActiveStudioId);
  return (
    <BookingDirectory
      key={`${cacheScope || "signed-out"}:${activeStudioId || ""}`}
      {...props}
      currentUser={currentUser}
      cacheScope={cacheScope}
      activeStudioId={activeStudioId}
    />
  );
}

function BookingDirectory({
  showPageHeader = true,
  showCreateButton = true,
  currentUser,
  cacheScope,
  activeStudioId,
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Bookings");
  const userId = currentUser.id || currentUser._id;
  const { isTenantUser, canDelete } = getTenantAccess(currentUser);
  const [showFilters, setShowFilters] = useState(false);
  const locationsQuery = useGetLocationsQuery(
    { isActive: true, bookingEnabled: true, limit: 100 },
    { skip: !cacheScope || !userId },
  );
  const locationsResponse = [401, 403].includes(locationsQuery.error?.status)
    ? undefined
    : locationsQuery.currentData;
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
  const [filters, setFilters] = useState(() =>
    getLocationScopedFilters(activeStudioId || ""),
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    getLocationScopedFilters(activeStudioId || ""),
  );
  const [editedFilterFields, setEditedFilterFields] = useState(() => new Set());
  // Options are lightweight, historical booking values authorized by bookings.view.
  // Full customer, catalog and staff endpoints are not needed for this table.
  const optionsQuery = useGetBookingFilterOptionsQuery(
    { cacheScope, locationId: filters.locationId },
    { skip: !cacheScope || !showFilters, refetchOnMountOrArgChange: 60 },
  );
  const optionsData = [401, 403].includes(optionsQuery.error?.status)
    ? undefined
    : optionsQuery.currentData;
  const products = optionsData?.products || EMPTY_OPTIONS;
  const lecturers = optionsData?.lecturers || EMPTY_OPTIONS;
  const [initializedLocation, setInitializedLocation] = useState(null);
  const [activeView, setActiveView] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [requestRevision, setRequestRevision] = useState(0);
  const [bookingIdToDelete, setBookingIdToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [cancellationMessage, setCancellationMessage] = useState("");

  useEffect(() => {
    if (!locationsResponse || initializedLocation === activeLocationId) return;
    const nextFilters = getLocationScopedFilters(activeLocationId);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setInitializedLocation(activeLocationId);
  }, [locationsResponse, activeLocationId, initializedLocation]);

  // Capture the date cutoff once for an applied view, not on each render or
  // page change. Returning to a page can therefore reuse its exact query.
  const baseRequest = useMemo(() => {
    void requestRevision;
    return buildBookingRequest({
      filters: appliedFilters,
      view: activeView,
      sortOrder,
      isAdmin: isTenantUser,
    });
  }, [appliedFilters, activeView, sortOrder, isTenantUser, requestRevision]);
  const bookingsQuery = useGetBookingDirectoryQuery(
    { cacheScope, ...baseRequest, page: currentPage, limit: pageSize },
    {
      skip:
        !cacheScope ||
        !locationsResponse ||
        initializedLocation !== activeLocationId,
      refetchOnMountOrArgChange: 60,
    },
  );
  const currentDirectory = [401, 403].includes(bookingsQuery.error?.status)
    ? undefined
    : bookingsQuery.currentData;
  const lastPage = Math.max(1, currentDirectory?.totalPages || 1);
  const pageOutOfRange = Boolean(currentDirectory && currentPage > lastPage);
  useEffect(() => {
    if (pageOutOfRange) setCurrentPage(lastPage);
  }, [pageOutOfRange, lastPage]);
  const bookingsData =
    !locationsResponse ||
    pageOutOfRange ||
    initializedLocation !== activeLocationId
      ? undefined
      : currentDirectory;
  const bookings = useMemo(() => bookingsData?.bookings || [], [bookingsData]);
  const totalCount = bookingsData?.totalCount ?? bookingsData?.total ?? 0;
  const totalPages = bookingsData?.totalPages ?? 0;
  useEffect(() => {
    setSelectedIds(new Set());
  }, [bookingsData]);
  const summary = useMemo(
    () => buildBookingSummary({ bookingsData, bookings, products, totalCount }),
    [bookings, bookingsData, products, totalCount],
  );

  const resetPage = useCallback(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setRequestRevision((revision) => revision + 1);
  }, []);
  const activeFilterCount = countActiveFilters(filters);

  const updateFilter = useCallback((key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "locationId" && previous.locationId !== value
        ? { productId: "", lecturerName: "" }
        : {}),
    }));
    setEditedFilterFields((previous) => new Set(previous).add(key));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setActiveView(
      getBookingViewAfterApplyingFilters(
        activeView,
        filters,
        editedFilterFields,
      ),
    );
    setEditedFilterFields(new Set());
    resetPage();
  }, [activeView, filters, editedFilterFields, resetPage]);
  const handleFutureOnlyChange = useCallback(
    (futureOnly) => {
      setFilters((previous) => ({ ...previous, futureOnly }));
      setAppliedFilters((previous) => ({ ...previous, futureOnly }));
      resetPage();
    },
    [resetPage],
  );
  const handleClearFilters = useCallback(() => {
    const nextFilters = getLocationScopedFilters(activeLocationId);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setActiveView("all");
    setEditedFilterFields(new Set());
    resetPage();
  }, [activeLocationId, resetPage]);
  const handleViewChange = useCallback(
    (view) => {
      setActiveView(view);
      resetPage();
    },
    [resetPage],
  );
  const handleToggleSort = useCallback(() => {
    setSortOrder((previous) => (previous === "asc" ? "desc" : "asc"));
    resetPage();
  }, [resetPage]);
  const handlePageChange = useCallback(
    (page) => {
      if (page < 1 || page > Math.max(totalPages, 1)) return;
      setSelectedIds(new Set());
      setCurrentPage(page);
    },
    [totalPages],
  );
  const handlePageSizeChange = useCallback((nextPageSize) => {
    setPageSize(nextPageSize);
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, []);

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
      locale,
      t,
    });
  }, [bookings, locale, products, selectedIds, t]);

  const handleEdit = useCallback(
    (booking) => {
      const bookingId = String(booking?._id || booking?.id || "");
      if (bookingId) router.push(getBookingEditorHref(bookingId));
    },
    [router],
  );

  const handleDeleteRequest = useCallback(
    (bookingId) => {
      if (isDeleting) return;
      setDeleteError("");
      setCancellationMessage("");
      setBookingIdToDelete(bookingId);
      setShowDeleteAlert(true);
    },
    [isDeleting],
  );

  const handleDeleteBooking = useCallback(async () => {
    if (!bookingIdToDelete || isDeleting) return;
    setShowDeleteAlert(false);

    try {
      const result = await deleteBooking({ id: bookingIdToDelete }).unwrap();

      setDeleteError("");
      const outcome = result?.message || t("modals.deletedText");
      const extensionRefund = Number(result?.extensionRefundAmount || 0);
      setCancellationMessage(
        extensionRefund > 0
          ? `${outcome} ${t("modals.extensionRefund", {
              amount: formatMoney(extensionRefund, locale, result.currency),
            })}`
          : outcome,
      );
      setShowDeleteConfirmation(true);
      // The mutation invalidates Booking LIST; the active query refreshes
      // without hiding already loaded rows.
    } catch (error) {
      // Never fail silently: staff must know the booking is still active.
      setDeleteError(error?.data?.message || t("modals.cancelError"));
    } finally {
      setBookingIdToDelete(null);
    }
  }, [bookingIdToDelete, deleteBooking, isDeleting, locale, t]);

  return (
    <>
      <ConfirmationModal
        open={showDeleteConfirmation}
        setOpen={setShowDeleteConfirmation}
        title={t("modals.deletedTitle")}
        text={cancellationMessage}
      />

      <AlertModal
        open={showDeleteAlert}
        setOpen={setShowDeleteAlert}
        onSubmitClicked={handleDeleteBooking}
        title={t("modals.deleteTitle")}
        text={t("modals.deleteText")}
        buttonText={t("actions.delete")}
      />

      <div className="space-y-5">
        {deleteError && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700"
          >
            {deleteError}
          </p>
        )}
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

        <BookingsOverview summary={summary} t={t} isLoading={!bookingsData} />

        <section className="relative overflow-hidden rounded-[20px] border border-[#E7E4DE] bg-white shadow-[0_12px_36px_rgba(31,31,31,0.045)]">
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
            exportDisabled={!bookingsData}
            optionsLoading={optionsQuery.isFetching}
          />

          {showFilters && optionsQuery.isError ? (
            <p role="alert" className="px-5 py-2 text-sm text-danger">
              {t("errors.filters")}{" "}
              <button
                type="button"
                className="underline"
                onClick={optionsQuery.refetch}
              >
                {t("retry")}
              </button>
            </p>
          ) : null}
          {bookingsQuery.isError || locationsQuery.isError ? (
            <p role="alert" className="px-5 py-2 text-sm text-danger">
              {t("errors.load")}{" "}
              <button
                type="button"
                className="underline"
                onClick={() =>
                  locationsQuery.isError
                    ? locationsQuery.refetch()
                    : bookingsQuery.refetch()
                }
              >
                {t("retry")}
              </button>
            </p>
          ) : null}
          {bookingsData && (bookingsQuery.isFetching || isDeleting) ? (
            <TableLoadingState refreshing label={t("refreshing")} />
          ) : null}
          {!bookingsData &&
          !bookingsQuery.isError &&
          !locationsQuery.isError ? (
            <TableLoadingState label={t("loading")} />
          ) : null}
          {bookingsData && (
            <>
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
            </>
          )}
        </section>
      </div>
    </>
  );
}
