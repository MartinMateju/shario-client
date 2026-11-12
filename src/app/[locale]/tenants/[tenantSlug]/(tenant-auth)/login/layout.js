import { createTenantPageMetadata } from "@/utils/tenantPageMetadata";

export const generateMetadata = createTenantPageMetadata("login");

export default function LoginLayout({ children }) {
  return children;
}
