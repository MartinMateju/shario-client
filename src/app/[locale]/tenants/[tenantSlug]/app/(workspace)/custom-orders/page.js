import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CustomOrdersPage from "@/components/custom-orders/CustomOrdersPage";
import { PERMISSIONS } from "@/config/permissions";

export default function TenantCustomOrdersPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.ORDERS_VIEW}>
      <CustomOrdersPage />
    </PermissionBoundary>
  );
}
