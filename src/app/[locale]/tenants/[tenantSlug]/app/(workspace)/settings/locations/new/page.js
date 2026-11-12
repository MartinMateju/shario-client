import PermissionBoundary from "@/components/auth/PermissionBoundary";
import StudioLocationCreatePage from "@/components/views/locations/StudioLocationCreatePage";
import { PERMISSIONS } from "@/config/permissions";

export default function NewStudioLocationPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.LOCATIONS_MANAGE}>
      <StudioLocationCreatePage />
    </PermissionBoundary>
  );
}
