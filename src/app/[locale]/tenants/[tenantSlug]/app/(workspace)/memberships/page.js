import PermissionBoundary from "@/components/auth/PermissionBoundary";
import ProductsView from "@/components/products/ProductsView";
import { PERMISSIONS } from "@/config/permissions";

export default function MembershipManagementPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.MEMBERSHIPS_VIEW}>
      <ProductsView showPageHeader={false} initialCategory="memberships" />
    </PermissionBoundary>
  );
}
