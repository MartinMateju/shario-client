import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CustomOrderEditor from "@/components/custom-orders/CustomOrderEditor";
import { PERMISSIONS } from "@/config/permissions";

export default async function EditTenantCustomOrderPage({ params }) {
  const { id } = await params;
  return (
    <PermissionBoundary
      allOf={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE]}
    >
      <CustomOrderEditor id={id} />
    </PermissionBoundary>
  );
}
