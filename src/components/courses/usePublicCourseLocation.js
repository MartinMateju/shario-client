"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  findPortalLocationByReference,
  getPortalLocationReference,
  getPortalLocationReferenceFromSearchParams,
} from "@/utils/customerPortalLocation";

import { useGetPublicCourseLocationsQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";

const idOf = (value) => String(value?.id || value?._id || "").trim();

// Public links predate the portal's slug-based location parameter. Accept both
// formats, but never silently broaden a selected studio to every studio.
export default function usePublicCourseLocation({
  tenantSlug,
  enabled,
  previewMode = false,
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedReference = getPortalLocationReferenceFromSearchParams(params);
  const hasRequestedReference =
    params?.has("location") || params?.has("locationId");
  const query = useGetPublicCourseLocationsQuery(
    { tenantSlug },
    { skip: previewMode || !tenantSlug || !enabled },
  );
  const locations = (query.currentData ?? []).filter(
    (location) => location.isActive !== false,
  );
  const activeLocation = hasRequestedReference
    ? findPortalLocationByReference(locations, requestedReference)
    : locations.find((location) => location.isPrimary) || locations[0] || null;
  const locationId = idOf(activeLocation);
  const reference =
    getPortalLocationReference(activeLocation) || requestedReference;
  const selectLocation = (id) => {
    const location = locations.find((entry) => idOf(entry) === id);
    if (!location) return false;
    const nextParams = new URLSearchParams(params?.toString() || "");
    for (const key of [
      "locationId",
      "courseSessionId",
      "bookingCourse",
      "quantity",
      "date",
    ]) {
      nextParams.delete(key);
    }
    nextParams.set("location", getPortalLocationReference(location));
    router.replace(`${pathname || "/courses"}?${nextParams.toString()}`, {
      scroll: false,
    });
    return true;
  };
  return {
    reference,
    locationId,
    locations,
    activeLocation,
    activeLocationId: locationId,
    activeLocationReference: reference,
    selectLocation,
    isSwitching: query.isLoading || query.isFetching,
    unresolved: Boolean(enabled && !locationId),
    query,
  };
}

export function retainPublicCourseLocation(href, reference) {
  if (!reference || !href) return href;
  const [withoutHash, hash] = href.split("#");
  const [path, query] = withoutHash.split("?");
  const params = new URLSearchParams(query);
  params.delete("locationId");
  params.set("location", reference);
  return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
}
