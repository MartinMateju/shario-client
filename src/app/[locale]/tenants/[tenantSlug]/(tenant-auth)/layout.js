import CustomerTenantShell from "@/components/customer-shell/CustomerTenantShell";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import { enforcePublicTenantRouteLocale } from "@/lib/publicTenant/localeRouting";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";

export default async function TenantAuthLayout({ children, params }) {
  const { locale, tenantSlug } = await params;
  const result = await getPublicTenantConfig(tenantSlug);
  const unavailable = result.notFound || result.unavailable;
  const tenant = unavailable
    ? normalizePublicTenant(
        {
          slug: tenantSlug,
          name: locale === "cs" ? "Vaše studio" : "Your studio",
          publicCapabilities: {
            bookStudio: false,
            courses: false,
            memberships: false,
            help: false,
            guestCourseCheckout: false,
            registration: false,
          },
          publicSite: {
            branding: {
              displayName:
                locale === "cs" ? "Přihlášení do studia" : "Studio sign in",
            },
          },
        },
        tenantSlug,
      )
    : result.tenant;

  if (!unavailable) {
    await enforcePublicTenantRouteLocale({ tenant, locale });
  }

  return (
    <CustomerTenantShell tenant={tenant} degraded={unavailable} surface="auth">
      {children}
    </CustomerTenantShell>
  );
}
