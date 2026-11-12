import { routing } from "@/i18n/routing";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";
import {
  buildPublicRobotsText,
  resolvePublicSeoSite,
} from "@/lib/publicTenant/seo";

export const dynamic = "force-dynamic";

const response = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain; charset=utf-8",
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
      buildPublicRobotsText({
        origin: "",
        locales: routing.locales,
        indexable: false,
      }),
      404,
    );
  }

  if (site.kind === "platform") {
    return response(
      buildPublicRobotsText({
        origin: site.origin,
        locales: routing.locales,
        indexable: true,
      }),
    );
  }

  const result = await getPublicTenantConfig(site.tenantSlug);
  const indexable = Boolean(
    !result.notFound && !result.unavailable && result.tenant,
  );

  return response(
    buildPublicRobotsText({
      origin: site.origin,
      locales: routing.locales,
      indexable,
    }),
    result.notFound ? 404 : result.unavailable ? 503 : 200,
  );
}
