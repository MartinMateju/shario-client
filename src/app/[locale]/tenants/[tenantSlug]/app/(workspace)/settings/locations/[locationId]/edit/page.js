"use client";

import { useParams } from "next/navigation";

import PermissionBoundary from "@/components/auth/PermissionBoundary";
import StudioLocationEditPage from "@/components/views/locations/StudioLocationEditPage";
import { PERMISSIONS } from "@/config/permissions";

export default function EditStudioLocationPage() {
  const params = useParams();

  return (
    <PermissionBoundary permission={PERMISSIONS.LOCATIONS_MANAGE}>
      <StudioLocationEditPage locationId={params?.locationId} />
    </PermissionBoundary>
  );
}
