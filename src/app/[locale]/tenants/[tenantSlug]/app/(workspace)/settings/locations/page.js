"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import PermissionBoundary from "@/components/auth/PermissionBoundary";
import StudioLocationsPage from "@/components/views/locations/StudioLocationsPage";
import {
  getLocationCreateHref,
  getLocationEditHref,
} from "@/components/views/locations/locations.navigation";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { useRouter } from "@/i18n/navigation";
import {
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  getTenantIdFromUser,
  isMongoObjectId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";

const getGuidedLocation = (locations) =>
  locations.find(
    (location) => location.isPrimary && location.isActive === true,
  ) ||
  locations.find((location) => location.isActive === true) ||
  locations.find((location) => location.isPrimary) ||
  locations[0] ||
  null;

export default function SettingsLocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenantId = getTenantIdFromUser(currentUser);
  const canManageLocations = hasPermission(
    workspaceAccess,
    PERMISSIONS.LOCATIONS_MANAGE,
  );
  const createRequested = searchParams.get("action") === "create";
  const guidedSetup = searchParams.get("setupStep") === "location";
  const legacyLocationId = searchParams.get("locationId");
  const shouldResolveGuidedLocation =
    guidedSetup &&
    !createRequested &&
    !isMongoObjectId(legacyLocationId) &&
    canManageLocations;
  const guidedLocationsQuery = useGetLocationsQuery(
    { tenantId, limit: 100 },
    { skip: !shouldResolveGuidedLocation || !tenantId },
  );
  const guidedLocations = useMemo(
    () => normalizeLocationsResponse(guidedLocationsQuery.data),
    [guidedLocationsQuery.data],
  );
  const guidedLocation = getGuidedLocation(guidedLocations);
  const guidedResolutionPending =
    shouldResolveGuidedLocation &&
    (!tenantId ||
      guidedLocationsQuery.isUninitialized ||
      guidedLocationsQuery.isLoading ||
      guidedLocationsQuery.isFetching);
  const guidedResolutionReady =
    shouldResolveGuidedLocation &&
    !guidedResolutionPending &&
    !guidedLocationsQuery.isError;
  const createHref = getLocationCreateHref(searchParams);
  const editHref = isMongoObjectId(legacyLocationId)
    ? getLocationEditHref(legacyLocationId, searchParams)
    : null;
  const guidedHref = guidedResolutionReady
    ? guidedLocation
      ? getLocationEditHref(getLocationId(guidedLocation), searchParams)
      : createHref
    : null;

  useEffect(() => {
    if (createRequested) {
      router.replace(createHref, { scroll: false });
      return;
    }

    if (editHref && canManageLocations) {
      router.replace(editHref, { scroll: false });
      return;
    }

    if (guidedHref) {
      router.replace(guidedHref, { scroll: false });
    }
  }, [
    canManageLocations,
    createHref,
    createRequested,
    editHref,
    guidedHref,
    router,
  ]);

  if (
    createRequested ||
    (editHref && canManageLocations) ||
    guidedResolutionPending ||
    guidedHref
  ) {
    return null;
  }

  return (
    <PermissionBoundary permission={PERMISSIONS.LOCATIONS_VIEW}>
      <StudioLocationsPage createHref={createHref} showPageHeader={false} />
    </PermissionBoundary>
  );
}
