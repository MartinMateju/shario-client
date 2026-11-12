import PermissionBoundary from "@/components/auth/PermissionBoundary";
import ProductsView from "@/components/products/ProductsView";
import { PERMISSIONS } from "@/config/permissions";

export default function AdminProductsPage() {
  return (
    <PermissionBoundary
      anyOf={[PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.MEMBERSHIPS_VIEW]}
    >
      <ProductsView showPageHeader={false} />
    </PermissionBoundary>
  );
}
