import PermissionBoundary from "@/components/auth/PermissionBoundary";
import PublicSiteEditorPage from "@/components/public-site-editor/PublicSiteEditorPage";
import { PERMISSIONS } from "@/config/permissions";

export default function PublicSiteSettingsPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.WORKSPACE_UPDATE}>
      <PublicSiteEditorPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
