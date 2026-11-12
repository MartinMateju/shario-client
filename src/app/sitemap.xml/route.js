import { getPublicTenantLocaleCodes } from "@/components/public-tenant/publicTenant.config";
import { PLATFORM_MARKETING_PATHS } from "@/components/headers/marketingNavigation";
import { routing } from "@/i18n/routing";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";
import {
  buildPublicSitemapXml,
  getTenantPublicSeoPaths,
  resolvePublicSeoSite,
} from "@/lib/publicTenant/seo";

export const dynamic = "force-dynamic";

const response = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });

export async function GET(request) {
  const site = resolvePublicSeoSite({
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });

  if (site.kind === "unknown") {
    return response(
      buildPublicSitemapXml({
        origin: "https://shario.io",
        locales: [],
        paths: [],
      }),
      404,
    );
  }

  if (site.kind === "platform") {
    return response(
      buildPublicSitemapXml({
        origin: site.origin,
        locales: routing.locales,
        paths: PLATFORM_MARKETING_PATHS,
      }),
    );
  }

  const result = await getPublicTenantConfig(site.tenantSlug);

  if (result.notFound || result.unavailable || !result.tenant) {
    return response(
      buildPublicSitemapXml({
        origin: site.origin,
        locales: [],
        paths: [],
      }),
      result.notFound ? 404 : 503,
    );
  }

  return response(
    buildPublicSitemapXml({
      origin: site.origin,
      locales: getPublicTenantLocaleCodes(
        result.tenant.settings,
        routing.locales,
      ),
      paths: getTenantPublicSeoPaths(result.tenant),
    }),
  );
}
