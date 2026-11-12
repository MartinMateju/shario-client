import PermissionBoundary from "@/components/auth/PermissionBoundary";
import SettingsOverviewPage from "@/components/settings/SettingsOverviewPage";
import { SETTINGS_ACCESS_PERMISSIONS } from "@/components/settings/settingsNavigation";

export default function SettingsPage() {
  return (
    <PermissionBoundary anyOf={SETTINGS_ACCESS_PERMISSIONS}>
      <SettingsOverviewPage />
    </PermissionBoundary>
  );
}
