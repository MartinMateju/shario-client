import PermissionBoundary from "@/components/auth/PermissionBoundary";
import ProductCreatePage from "@/components/products/ProductCreatePage";
import { PERMISSIONS } from "@/config/permissions";

export default function NewProductPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.PRODUCTS_MANAGE}>
      <ProductCreatePage />
    </PermissionBoundary>
  );
}
