import PermissionBoundary from "@/components/auth/PermissionBoundary";
import RolesSettingsPage from "@/components/views/roles/RolesSettingsPage";
import { PERMISSIONS } from "@/config/permissions";

export default function SettingsRolesPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.ROLES_VIEW}>
      <RolesSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
