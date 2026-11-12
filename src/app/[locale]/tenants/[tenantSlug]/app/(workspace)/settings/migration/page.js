import PermissionBoundary from "@/components/auth/PermissionBoundary";
import MigrationCenterPage from "@/components/migration/MigrationCenterPage";
import { DATA_IMPORT_PERMISSIONS } from "@/config/permissions";

export default function MigrationSettingsPage() {
  return (
    <PermissionBoundary anyOf={DATA_IMPORT_PERMISSIONS}>
      <MigrationCenterPage />
    </PermissionBoundary>
  );
}
