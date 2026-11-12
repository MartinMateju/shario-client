import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CustomOrderDetail from "@/components/custom-orders/CustomOrderDetail";
import { PERMISSIONS } from "@/config/permissions";

export default async function TenantCustomOrderPage({ params }) {
  const { id } = await params;
  return (
    <PermissionBoundary permission={PERMISSIONS.ORDERS_VIEW}>
      <CustomOrderDetail id={id} />
    </PermissionBoundary>
  );
}
