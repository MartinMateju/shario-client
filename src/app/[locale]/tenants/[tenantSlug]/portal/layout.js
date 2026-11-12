import TenantSurfaceBoundary from "@/components/auth/TenantSurfaceBoundary";
import CustomerStudioConcierge from "@/components/ai/CustomerStudioConcierge";
import CustomerTenantShell from "@/components/customer-shell/CustomerTenantShell";
import CustomerPortalLocationProvider, {
  CustomerPortalLocationGate,
} from "@/components/customer-shell/CustomerPortalLocationProvider";
import CustomerPortalProductTour from "@/components/customer-shell/LazyCustomerPortalProductTour";
import CustomerPortalPageGate from "@/components/customer-shell/CustomerPortalPageGate";
import CustomerPortalCartHost from "@/components/customer-shell/CustomerPortalCartHost";
import { createCustomerShellTenantFallback } from "@/components/customer-shell/customerShell.config";
import { enforcePublicTenantRouteLocale } from "@/lib/publicTenant/localeRouting";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
export default async function CustomerPortalLayout({ children, params }) {
  const { locale, tenantSlug } = await params;
  const result = await getPublicTenantConfig(tenantSlug);
  const degraded = result.notFound || result.unavailable;
  const tenant = degraded
    ? createCustomerShellTenantFallback({
        tenantSlug,
        locale,
      })
    : result.tenant;
  if (!degraded) {
    await enforcePublicTenantRouteLocale({
      tenant,
      locale,
    });
  }

  /*
   * The studio shell (header, branding, footer) only needs the public tenant
   * config, so it renders straight away. The session check wraps the page
   * content alone, and the location provider waits for that session before
   * it loads the customer's studios.
   */
  return (
    <CustomerPortalLocationProvider>
      <CustomerTenantShell tenant={tenant} degraded={degraded} surface="portal">
        <TenantSurfaceBoundary surface="portal">
          <CustomerPortalLocationGate key="customer-portal-location-gate">
            <CustomerPortalPageGate>
              <>
                {children}
                <CustomerPortalProductTour enabled={!degraded} />
              </>
            </CustomerPortalPageGate>
            <CustomerPortalCartHost />
          </CustomerPortalLocationGate>
          <CustomerStudioConcierge key="customer-studio-concierge" />
        </TenantSurfaceBoundary>
      </CustomerTenantShell>
    </CustomerPortalLocationProvider>
  );
}
