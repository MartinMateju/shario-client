import PublicBookingAvailabilityPage from "@/components/public-tenant/PublicBookingAvailabilityPage";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicTenant.book" });
  const result = await requirePublicTenantPageVisible(tenantSlug, "book");
  const page = result.tenant?.publicSite?.pages?.book;

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

export default async function PublicBookPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "book");

  return <PublicBookingAvailabilityPage />;
}
