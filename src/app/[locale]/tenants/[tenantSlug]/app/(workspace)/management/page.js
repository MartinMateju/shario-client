"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import StudioLocationsPage from "@/components/views/locations/StudioLocationsPage";
import { getLocationCreateHref } from "@/components/views/locations/locations.navigation";
import { PERMISSIONS } from "@/config/permissions";

function LegacyManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = searchParams.get("section") || "locations";
  const createRequested = searchParams.get("action") === "create";
  const createHref = getLocationCreateHref(searchParams);

  useEffect(() => {
    if (section !== "locations" || !createRequested) return;

    router.replace(createHref, { scroll: false });
  }, [createHref, createRequested, router, section]);

  if (section === "locations" && createRequested) {
    return null;
  }

  if (section !== "locations") {
    return <StudioLocationsPage showPageHeader={false} />;
  }

  return <StudioLocationsPage createHref={createHref} showPageHeader={false} />;
}

export default function ManagementPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.LOCATIONS_VIEW}>
      <LegacyManagementContent />
    </PermissionBoundary>
  );
}
