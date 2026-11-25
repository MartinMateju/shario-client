import PublicTenantChrome from "@/components/public-tenant/PublicTenantChrome";

import { DisableLinkPrefetch } from "@/i18n/tenantLinks";

export default function CustomerTenantShell({
  children,
  tenant,
  degraded = false,
  surface = "public",
}) {
  const chrome = (
    <PublicTenantChrome tenant={tenant} degraded={degraded} surface={surface}>
      {children}
    </PublicTenantChrome>
  );
  return surface === "public" ? (
    <DisableLinkPrefetch>{chrome}</DisableLinkPrefetch>
  ) : (
    chrome
  );
}
