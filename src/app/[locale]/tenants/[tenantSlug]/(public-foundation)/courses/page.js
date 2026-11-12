import { PublicCustomerCoursesPage } from "@/components/courses/CustomerCoursesPage";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  const t = await getTranslations({
    locale,
    namespace: "PublicTenant.courses",
  });
  const result = await requirePublicTenantPageVisible(tenantSlug, "courses");
  const page = result.tenant?.publicSite?.pages?.courses;

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

export default async function PublicCoursesPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "courses");

  return <PublicCustomerCoursesPage />;
}
