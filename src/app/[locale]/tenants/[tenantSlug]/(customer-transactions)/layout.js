import CustomerTenantShell from "@/components/customer-shell/CustomerTenantShell";
import { createCustomerShellTenantFallback } from "@/components/customer-shell/customerShell.config";
import { enforcePublicTenantRouteLocale } from "@/lib/publicTenant/localeRouting";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CustomerTransactionLayout({ children, params }) {
  const { locale, tenantSlug } = await params;
  const result = await getPublicTenantConfig(tenantSlug);
  const degraded = result.notFound || result.unavailable;
  const tenant = degraded
    ? createCustomerShellTenantFallback({ tenantSlug, locale })
    : result.tenant;

  if (!degraded) {
    await enforcePublicTenantRouteLocale({ tenant, locale });
  }

  return (
    <CustomerTenantShell
      tenant={tenant}
      degraded={degraded}
      surface="transaction"
    >
      {children}
    </CustomerTenantShell>
  );
}
