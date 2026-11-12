import PermissionBoundary from "@/components/auth/PermissionBoundary";
import ProductEditPage from "@/components/products/ProductEditPage";
import { PERMISSIONS } from "@/config/permissions";

export default function EditProductPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.PRODUCTS_MANAGE}>
      <ProductEditPage />
    </PermissionBoundary>
  );
}
