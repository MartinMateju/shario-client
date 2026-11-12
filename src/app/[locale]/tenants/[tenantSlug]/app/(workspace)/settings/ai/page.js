import AiSettingsPage from "@/components/ai/AiSettingsPage";
import AiFeatureBoundary from "@/components/auth/AiFeatureBoundary";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import { PERMISSIONS } from "@/config/permissions";

export default function WorkspaceAiSettingsPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.AI_SETTINGS_MANAGE}>
      <AiFeatureBoundary
        feature="settings"
        permission={PERMISSIONS.AI_SETTINGS_MANAGE}
      >
        <AiSettingsPage showPageHeader={false} />
      </AiFeatureBoundary>
    </PermissionBoundary>
  );
}
