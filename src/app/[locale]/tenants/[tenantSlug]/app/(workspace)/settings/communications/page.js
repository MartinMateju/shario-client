import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CommunicationsWorkspace from "@/components/communications/CommunicationsWorkspace";
import { PERMISSIONS } from "@/config/permissions";

export default function CommunicationsSettingsPage() {
  return (
    <PermissionBoundary
      anyOf={[
        PERMISSIONS.COMMUNICATIONS_SETTINGS_MANAGE,
        PERMISSIONS.COMMUNICATIONS_MANAGE,
      ]}
    >
      <CommunicationsWorkspace showPageHeader={false} settingsOnly />
    </PermissionBoundary>
  );
}
