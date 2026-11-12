import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CustomersWorkspace from "@/components/customers/CustomersWorkspace";
import { PERMISSIONS } from "@/config/permissions";

export default function UsersPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.CUSTOMERS_VIEW}>
      <CustomersWorkspace showPageHeader={false} />
    </PermissionBoundary>
  );
}
