import { cache } from "react";
import { fetchPublicCatalogData } from "@/lib/publicTenant/catalogRead.server";

export const getPublicCommerceCatalog = cache(async (tenantSlug, kind) => {
  const path =
    kind === "memberships"
      ? "memberships"
      : kind === "vouchers"
        ? "vouchers/products"
        : null;
  if (!path) return null;
  try {
    const { data } = await fetchPublicCatalogData(
      tenantSlug,
      path,
      AbortSignal.timeout(5000),
    );
    const valid =
      kind === "memberships"
        ? data?.tenant?.slug === tenantSlug &&
          Array.isArray(data.plans) &&
          Array.isArray(data.locations)
        : Array.isArray(data);
    return valid ? { tenantSlug, kind, data, fetchedAt: Date.now() } : null;
  } catch {
    // Keep the live browser query and its retry UI available on transient failures.
    return null;
  }
});
