import { createTenantPageMetadata } from "@/utils/tenantPageMetadata";

export const generateMetadata = createTenantPageMetadata("register");

export default function RegisterLayout({ children }) {
  return children;
}
