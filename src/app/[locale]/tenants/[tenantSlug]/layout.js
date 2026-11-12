import { Fragment } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
import PublicStudioConcierge from "@/components/ai/PublicStudioConcierge";
import TenantSiteRefresh from "@/components/public-tenant/TenantSiteRefresh";
import { PLATFORM_BROWSER_ICONS } from "@/config/browserIcons";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";
import {
  getConfiguredRootHostname,
  isValidTenantSlug,
  normalizeRootHostname,
} from "@/utils/tenantRouting";

const getCustomDomainTenant = (hostname) => {
  try {
    const mapping = JSON.parse(process.env.CUSTOM_DOMAIN_TENANTS || "{}");

    const match = Object.entries(mapping).find(
      ([domain]) =>
        String(domain).trim().toLowerCase().replace(/\.$/, "") === hostname,
    );

    return match?.[1] || null;
  } catch {
    return null;
  }
};

const getTenantOrigin = async (slug) => {
  const rootDomain =
    normalizeRootHostname(process.env.TENANT_ROOT_DOMAIN) ||
    getConfiguredRootHostname() ||
    "shario.io";
  const requestHeaders = await headers();
  const requestHost = String(
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      requestHeaders.get("host") ||
      "",
  ).toLowerCase();
  const requestHostname = requestHost.replace(/:\d+$/, "");
  const isExpectedHost =
    requestHostname === `${slug}.${rootDomain}` ||
    requestHostname === `${slug}.localhost` ||
    getCustomDomainTenant(requestHostname) === slug;

  if (isExpectedHost && /^[a-z0-9.-]+(?::\d+)?$/.test(requestHost)) {
    const forwardedProtocol = requestHeaders
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const protocol =
      forwardedProtocol === "http" || forwardedProtocol === "https"
        ? forwardedProtocol
        : requestHostname.endsWith(".localhost")
          ? "http"
          : "https";

    return `${protocol}://${requestHost}`;
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
  const tenantOrigin = await getTenantOrigin(tenantSlug);
  const result = await getPublicTenantConfig(tenantSlug);
  const faviconUrl = result.tenant?.publicSite?.branding?.faviconUrl;

  return {
    metadataBase: new URL(tenantOrigin),
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
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
