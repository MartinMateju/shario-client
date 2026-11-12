import PermissionBoundary from "@/components/auth/PermissionBoundary";
import SalesView from "@/components/sales/SalesView";
import { PERMISSIONS } from "@/config/permissions";

export default function FinanceOrdersPage() {
  return (
    <PermissionBoundary
      anyOf={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.PAYMENTS_VIEW]}
    >
      <SalesView showPageHeader={false} />
    </PermissionBoundary>
  );
}
