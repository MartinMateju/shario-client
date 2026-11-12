import { getTranslations } from "next-intl/server";

import PublicKnowledgeResourcePage from "@/components/public-tenant/PublicKnowledgeResourcePage";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "help");
  const t = await getTranslations({
    locale,
    namespace: "KnowledgeHub.detail",
  });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function TenantHelpResourcePage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "help");

  return <PublicKnowledgeResourcePage />;
}
