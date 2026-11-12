import PermissionBoundary from "@/components/auth/PermissionBoundary";
import SalesView from "@/components/sales/SalesView";
import { PERMISSIONS } from "@/config/permissions";

export default function AdminSalesPage() {
  return (
    <PermissionBoundary
      anyOf={[
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.VOUCHERS_VIEW,
      ]}
    >
      <SalesView showPageHeader={false} />
    </PermissionBoundary>
  );
}
