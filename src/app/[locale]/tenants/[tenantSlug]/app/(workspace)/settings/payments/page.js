import PermissionBoundary from "@/components/auth/PermissionBoundary";
import PaymentConnectSettingsPage from "@/components/views/payments/PaymentConnectSettingsPage";
import { PERMISSIONS } from "@/config/permissions";

export default function PaymentsSettingsPage() {
  return (
    <PermissionBoundary
      anyOf={[PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_CONNECT_MANAGE]}
    >
      <PaymentConnectSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
