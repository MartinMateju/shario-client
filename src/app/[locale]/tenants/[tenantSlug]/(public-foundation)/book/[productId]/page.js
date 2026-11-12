import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import PublicBookingProductDetailPage from "@/components/public-tenant/PublicBookingProductDetailPage";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params }) {
  const { locale, tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "book");
  const t = await getTranslations({
    locale,
    namespace: "PublicTenant.details",
  });
  return {
    title: t("bookingMetadataTitle"),
    description: t("bookingMetadataDescription"),
  };
}

export default async function PublicBookingProductPage({ params }) {
  const { tenantSlug } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "book");

  return (
    <Suspense fallback={null}>
      <PublicBookingProductDetailPage kind="book" />
    </Suspense>
  );
}
