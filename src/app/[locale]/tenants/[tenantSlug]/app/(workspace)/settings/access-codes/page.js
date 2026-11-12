import PermissionBoundary from "@/components/auth/PermissionBoundary";
import AccessCodesPage from "@/components/views/access-codes/AccessCodesPage";
import { PERMISSIONS } from "@/config/permissions";

export default function WorkspaceAccessCodesPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.ACCESS_CODES_VIEW}>
      <AccessCodesPage />
    </PermissionBoundary>
  );
}
