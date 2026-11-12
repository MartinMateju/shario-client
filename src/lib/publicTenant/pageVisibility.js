import { notFound } from "next/navigation";

import { isPublicTenantPageVisible } from "@/components/public-tenant/publicTenant.config";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";

export async function requirePublicTenantPageVisible(tenantSlug, pageKey) {
  const result = await getPublicTenantConfig(tenantSlug);

  if (
    result.notFound ||
    (result.tenant && !isPublicTenantPageVisible(result.tenant, pageKey))
  ) {
    notFound();
  }

  // The public foundation layout handles temporarily unavailable tenants.
  return result;
}
