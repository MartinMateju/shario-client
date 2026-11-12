import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CustomOrderEditor from "@/components/custom-orders/CustomOrderEditor";
import { PERMISSIONS } from "@/config/permissions";

export default async function NewTenantCustomOrderPage({ searchParams }) {
  const query = await searchParams;
  return (
    <PermissionBoundary
      allOf={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE]}
    >
      <CustomOrderEditor
        defaultLocationId={
          typeof query?.locationId === "string" ? query.locationId : undefined
        }
      />
    </PermissionBoundary>
  );
}
