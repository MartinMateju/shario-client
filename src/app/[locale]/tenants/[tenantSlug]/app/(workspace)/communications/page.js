import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CommunicationsWorkspace from "@/components/communications/CommunicationsWorkspace";
import { PERMISSIONS } from "@/config/permissions";

export default function CommunicationsPage() {
  return (
    <PermissionBoundary
      anyOf={[
        PERMISSIONS.COMMUNICATIONS_VIEW,
        PERMISSIONS.COMMUNICATIONS_MANAGE,
      ]}
    >
      <CommunicationsWorkspace showPageHeader={false} />
    </PermissionBoundary>
  );
}
