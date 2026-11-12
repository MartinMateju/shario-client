import PermissionBoundary from "@/components/auth/PermissionBoundary";
import TeamSettingsPage from "@/components/views/team/TeamSettingsPage";
import { PERMISSIONS } from "@/config/permissions";

export default function SettingsTeamPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.TEAM_VIEW}>
      <TeamSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
