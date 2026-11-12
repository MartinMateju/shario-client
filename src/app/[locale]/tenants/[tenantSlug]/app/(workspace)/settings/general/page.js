import PermissionBoundary from "@/components/auth/PermissionBoundary";
import WorkspaceSettingsPage from "@/components/views/settings/WorkspaceSettingsPage";
import { PERMISSIONS } from "@/config/permissions";

export default function GeneralSettingsPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.WORKSPACE_UPDATE}>
      <WorkspaceSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
