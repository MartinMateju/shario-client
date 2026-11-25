import { getServerApiBaseUrl } from "@/lib/publicTenant/server";
import { getPublicServerReadHeaders } from "@/lib/publicTenant/publicReadHeaders.server";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

// Only pass paths to published catalogue endpoints. This request never carries a session.
export async function fetchPublicCatalogResponse(tenantSlug, suffix, signal) {
  const base = getServerApiBaseUrl();
  if (!base) throw new Error("Public API unavailable");
  const slug = encodeTenantSlugPathSegment(tenantSlug);
  const url = `${base}/public/tenants/${slug}/${suffix}`;
  return fetch(url, {
    cache: "no-store",
    credentials: "omit",
    redirect: "manual",
    headers: await getPublicServerReadHeaders({ url, tenantSlug }),
    signal,
  });
}

export async function fetchPublicCatalogData(tenantSlug, suffix, signal) {
  const response = await fetchPublicCatalogResponse(tenantSlug, suffix, signal);
  if (response.status === 400 || response.status === 404) {
    return { notFound: true, status: response.status };
  }
  if (!response.ok) throw new Error("Public API unavailable");
  return { data: await response.json() };
}
