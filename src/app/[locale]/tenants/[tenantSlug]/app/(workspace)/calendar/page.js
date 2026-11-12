"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import { useRouter } from "@/i18n/navigation";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  getEntityId,
  normalizeBookingsForCalendar,
  normalizeLocationsForCalendar,
  StudioCalendar,
} from "@/components/calendar";
import { useGetBookingsHistoryQuery } from "@/lib/features/bookings/bookingsApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";

const getLocationsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.locations)) return response.locations;

  return [];
};

const getBookingsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.bookings)) return response.bookings;

  return [];
};

function CalendarContent() {
  const router = useRouter();
  const activeStudioId = useSelector(selectActiveStudioId);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canCreateBooking = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_CREATE,
  );

  const {
    data: locationsResponse,
    isLoading: isLoadingLocations,
    isError: isLocationsError,
  } = useGetLocationsQuery({
    isActive: true,
    bookingEnabled: true,
    limit: 100,
  });

  const locations = useMemo(
    () =>
      normalizeLocationsForCalendar(
        getLocationsFromResponse(locationsResponse),
      ),
    [locationsResponse],
  );

  const activeLocationId = useMemo(() => {
    const requestedId = activeStudioId ? String(activeStudioId) : "";

    return locations.some((location) => location.id === requestedId)
      ? requestedId
      : locations[0]?.id || "";
  }, [activeStudioId, locations]);

  const {
    data: bookingsResponse,
    isLoading: isLoadingBookings,
    isError: isBookingsError,
  } = useGetBookingsHistoryQuery(
    activeLocationId ? { locationId: activeLocationId } : undefined,
    { skip: !activeLocationId },
  );

  const { data: products = [], isLoading: isLoadingProducts } =
    useGetProductsQuery();

  const productsById = useMemo(() => {
    return new Map(
      (Array.isArray(products) ? products : [])
        .map((product) => [getEntityId(product), product])
        .filter(([id]) => Boolean(id)),
    );
  }, [products]);

  const bookings = useMemo(
    () =>
      normalizeBookingsForCalendar(getBookingsFromResponse(bookingsResponse), {
        productsById,
      }),
    [bookingsResponse, productsById],
  );

  const activeLocation =
    locations.find((location) => location.id === activeLocationId) || null;

  const openCreateBooking = (selection) => {
    const query = new URLSearchParams();
    const locationId =
      getEntityId(selection?.location) ||
      getEntityId(selection?.studio) ||
      activeLocationId;

    if (locationId) query.set("locationId", locationId);
    if (selection?.activityId) query.set("activityId", selection.activityId);
    if (selection?.laneIndex !== undefined) {
      query.set("laneIndex", String(selection.laneIndex));
    }
    if (selection?.start) query.set("start", selection.start.toISOString());
    if (selection?.end) query.set("end", selection.end.toISOString());

    const suffix = query.toString();
    router.push(`/app/bookings/new${suffix ? `?${suffix}` : ""}`);
  };

  const isLoading =
    isLoadingLocations || isLoadingBookings || isLoadingProducts;

  const hasError = isLocationsError || isBookingsError;

  return (
    <div
      data-calendar-page="true"
      className="flex h-[calc(100dvh-4rem)] min-h-0 min-w-0 flex-col md:h-[calc(100dvh-5rem)]"
    >
      {hasError ? (
        <div className="m-4 flex flex-1 items-center justify-center rounded-[20px] border border-[#F0C7BD] bg-[#FFF5F1] px-5 py-8 text-center text-[12px] text-[#A44330] sm:m-6">
          The calendar could not be loaded. Please try again.
        </div>
      ) : isLoading ? (
        <div
          data-calendar-loading="true"
          className="h-full w-full animate-pulse bg-white/70"
        />
      ) : (
        <StudioCalendar
          studios={locations}
          selectedStudioId={activeLocationId}
          bookings={bookings}
          audience="tenant"
          defaultView="week"
          onCreateBooking={
            canCreateBooking
              ? () => openCreateBooking({ location: activeLocation })
              : undefined
          }
          onSlotSelect={canCreateBooking ? openCreateBooking : undefined}
          onBookingClick={(booking) =>
            router.push(
              `/app/bookings/${encodeURIComponent(String(booking.id))}/edit`,
            )
          }
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.BOOKINGS_VIEW}>
      <CalendarContent />
    </PermissionBoundary>
  );
}
