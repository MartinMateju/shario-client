import PermissionBoundary from "@/components/auth/PermissionBoundary";
import SetupCenterPage from "@/components/setup-center/SetupCenterPage";
import { PERMISSIONS } from "@/config/permissions";

export default function WorkspaceSetupCenterPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.WORKSPACE_UPDATE}>
      <SetupCenterPage />
    </PermissionBoundary>
  );
}
