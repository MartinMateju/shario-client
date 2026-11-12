import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import PublicBookingProductDetailPage from "@/components/public-tenant/PublicBookingProductDetailPage";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "courses");
  const t = await getTranslations({
    locale,
    namespace: "PublicTenant.details",
  });
  return {
    title: t("courseMetadataTitle"),
    description: t("courseMetadataDescription"),
  };
}

export default async function PublicCourseProductPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "courses");

  return (
    <Suspense fallback={null}>
      <PublicBookingProductDetailPage kind="courses" />
    </Suspense>
  );
}
