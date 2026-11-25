import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { getPublicCourseProduct } from "@/lib/publicTenant/courses.server";

import CustomerTenantShell from "@/components/customer-shell/CustomerTenantShell";
import PublicTenantUnavailable from "@/components/public-tenant/PublicTenantUnavailable";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { enforcePublicTenantRouteLocale } from "@/lib/publicTenant/localeRouting";
import { getPublicTenantConfig } from "@/lib/publicTenant/server";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const result = await getPublicTenantConfig(tenantSlug);

  if (result.notFound) notFound();

  if (result.unavailable) {
    const t = await getTranslations({
      locale,
      namespace: "PublicTenant.unavailable",
    });
    return {
      title: t("title"),
      robots: { index: false, follow: false },
    };
  }

  const tenant = result.tenant;
  const branding = tenant.publicSite.branding;
  const description =
    getLocalizedPublicTenantText(
      tenant.publicSite.pages.home.description,
      locale,
    ) || getLocalizedPublicTenantText(branding.description, locale);

  return {
    title: {
      default: branding.displayName,
      template: `%s | ${branding.displayName}`,
    },
    description: description || undefined,
    openGraph: {
      siteName: branding.displayName,
      title: branding.displayName,
      description: description || undefined,
      images: branding.coverImageUrl
        ? [{ url: branding.coverImageUrl }]
        : undefined,
    },
  };
}

export default async function PublicFoundationLayout({ children, params }) {
  const { locale, tenantSlug } = await params;
  const result = await getPublicTenantConfig(tenantSlug);

  if (result.notFound) notFound();

  if (result.unavailable) {
    return <PublicTenantUnavailable locale={locale} />;
  }

  await enforcePublicTenantRouteLocale({
    tenant: result.tenant,
    locale,
  });

  // Resolve confirmed missing courses before this segment's loading boundary
  // can flush a 200 response. The page/metadata reuse the request-cached read.
  const pathname = (await headers()).get("x-shario-public-pathname") || "";
  const detailPath = pathname.match(/^\/[^/]+\/courses\/([^/]+)\/?$/);
  if (detailPath) {
    let productId;
    try {
      productId = decodeURIComponent(detailPath[1]);
    } catch {
      notFound();
    }
    const course = await getPublicCourseProduct(tenantSlug, productId);
    if (course.notFound) notFound();
  }

  return (
    <CustomerTenantShell tenant={result.tenant} surface="public">
      {children}
    </CustomerTenantShell>
  );
}
