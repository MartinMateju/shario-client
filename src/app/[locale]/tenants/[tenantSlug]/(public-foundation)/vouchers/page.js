import { getTranslations } from "next-intl/server";

import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const t = await getTranslations({
    locale,
    namespace: "PublicTenant.vouchers",
  });
  const result = await requirePublicTenantPageVisible(tenantSlug, "vouchers");
  const page = result.tenant?.publicSite?.pages?.vouchers;
  const studio =
    result.tenant?.publicSite?.branding?.displayName ||
    result.tenant?.name ||
    tenantSlug;

  return {
    title: getLocalizedPublicTenantText(
      page?.title,
      locale,
      t("metadataTitle"),
    ),
    description: getLocalizedPublicTenantText(
      page?.description,
      locale,
      t("description", { studio }),
    ),
  };
}

export default async function PublicVouchersPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "vouchers");

  return <PublicVoucherCatalogPage />;
}
