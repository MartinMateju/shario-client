import PublicCommerceCatalogHydration from "@/components/public-tenant/PublicCommerceCatalogHydration";
import { getPublicCommerceCatalog } from "@/lib/publicTenant/commerceCatalog.server";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import PublicMembershipCatalog from "@/components/memberships/PublicMembershipCatalog";
import PublicCapabilityGate from "@/components/public-tenant/PublicCapabilityGate";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const t = await getTranslations({ locale, namespace: "Memberships.catalog" });
  const result = await requirePublicTenantPageVisible(
    tenantSlug,
    "memberships",
  );
  const page = result.tenant?.publicSite?.pages?.memberships;

  return {
    title: getLocalizedPublicTenantText(
      page?.title,
      locale,
      t("metadataTitle"),
    ),
    description: getLocalizedPublicTenantText(
      page?.description,
      locale,
      t("description"),
    ),
  };
}

export default async function MembershipCatalogPage({ params }) {
  const { tenantSlug } = await params;
  const [visibility, snapshot] = await Promise.all([
    requirePublicTenantPageVisible(tenantSlug, "memberships"),
    getPublicCommerceCatalog(tenantSlug, "memberships"),
  ]);
  const initialData =
    visibility.tenant?.publicCapabilities?.memberships === true
      ? snapshot
      : null;

  return (
    <Suspense fallback={null}>
      <PublicCapabilityGate capability="memberships">
        <PublicCommerceCatalogHydration initialData={initialData}>
          <PublicMembershipCatalog />
        </PublicCommerceCatalogHydration>
      </PublicCapabilityGate>
    </Suspense>
  );
}
