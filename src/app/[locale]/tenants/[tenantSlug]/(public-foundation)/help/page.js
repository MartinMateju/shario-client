import PublicHelpPage from "@/components/public-tenant/PublicHelpPage";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const t = await getTranslations({
    locale,
    namespace: "KnowledgeHub",
  });
  const result = await requirePublicTenantPageVisible(tenantSlug, "help");
  const page = result.tenant?.publicSite?.pages?.help;

  return {
    title: getLocalizedPublicTenantText(
      page?.title,
      locale,
      t("metadataTitle"),
    ),
    description: getLocalizedPublicTenantText(
      page?.description,
      locale,
      t("customerDescription"),
    ),
  };
}

export default async function TenantHelpPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "help");

  return <PublicHelpPage />;
}
