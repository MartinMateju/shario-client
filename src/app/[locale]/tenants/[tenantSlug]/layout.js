import { Fragment } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
import PublicStudioConcierge from "@/components/ai/PublicStudioConcierge";
import TenantSiteRefresh from "@/components/public-tenant/TenantSiteRefresh";
import { PLATFORM_BROWSER_ICONS } from "@/config/browserIcons";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";
import {
  getTenantPublicCanonicalOrigin,
  resolvePublicSeoSite,
} from "@/lib/publicTenant/seo";
import {
  getConfiguredRootHostname,
  isValidTenantSlug,
  normalizeRootHostname,
} from "@/utils/tenantRouting";

const getTenantOrigin = (slug, tenant, requestHeaders) => {
  const rootDomain =
    normalizeRootHostname(process.env.TENANT_ROOT_DOMAIN) ||
    getConfiguredRootHostname() ||
    "shario.io";
  const site = resolvePublicSeoSite({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    forwardedProto:
      requestHeaders.get("x-forwarded-proto") ||
      (rootDomain.endsWith("localhost") ? "http" : "https"),
    rootDomain,
  });
  if (site.kind === "tenant" && site.tenantSlug === slug) {
    return getTenantPublicCanonicalOrigin(tenant, site);
  }

  const protocol = rootDomain.includes("localhost") ? "http" : "https";

  return `${protocol}://${slug}.${rootDomain}`;
};

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  const tenantName = formatTenantNameFromSlug(tenantSlug);
  const requestHeaders = await headers();
  // The proxy sets this to the visitor-facing path before its internal rewrite.
  const path = requestHeaders.get("x-shario-public-pathname") || "";
  const segments = path.split("/").filter(Boolean);
  const surface = segments[0] === locale ? segments[1] : segments[0];
  const workspace = surface === "app";
  const preview = surface === "public-site-preview";
  const tenant =
    workspace || preview
      ? null
      : (await getPublicTenantConfig(tenantSlug)).tenant;
  const tenantOrigin = getTenantOrigin(tenantSlug, tenant, requestHeaders);
  const faviconUrl = tenant?.publicSite?.branding?.faviconUrl;

  return {
    metadataBase: new URL(tenantOrigin),
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : workspace
        ? null
        : PLATFORM_BROWSER_ICONS,
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    alternates: {
      canonical: `/${locale}`,
    },
    openGraph: {
      siteName: tenantName,
      url: `/${locale}`,
    },
  };
}

export default async function TenantLayout({ children, params }) {
  const { tenantSlug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  return (
    <>
      <TenantSiteRefresh key="tenant-site-refresh" tenantSlug={tenantSlug} />
      <Fragment key="tenant-route-content">{children}</Fragment>
      <PublicStudioConcierge key="public-studio-concierge" />
    </>
  );
}
