import PermissionBoundary from "@/components/auth/PermissionBoundary";
import BillingSettingsPage from "@/components/views/billing/BillingSettingsPage";
import { PERMISSIONS } from "@/config/permissions";

export default function BillingPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.SUBSCRIPTION_VIEW}>
      <BillingSettingsPage showPageHeader={false} />
    </PermissionBoundary>
  );
}
