import PublicCourseHydrationBoundary from "@/components/courses/PublicCourseHydrationBoundary";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getCourseName,
  getCourseDescription,
} from "@/components/courses/customerCourses.utils";
import {
  getPublicCourseProduct,
  getPublicCourseInitialData,
  getPublicCourseLocationRequest,
} from "@/lib/publicTenant/courses.server";
import { getTranslations } from "next-intl/server";

import PublicBookingProductDetailPage from "@/components/public-tenant/PublicBookingProductDetailPage";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";

export async function generateMetadata({ params, searchParams }, parent) {
  const { locale, tenantSlug, productId } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "courses");
  const t = await getTranslations({
    locale,
    namespace: "PublicTenant.details",
  });
  const inheritedMetadata = await parent;
  const canonical = `/${locale}/courses/${encodeURIComponent(productId)}`;
  const result = await getPublicCourseProduct(tenantSlug, productId);
  if (result.notFound) notFound();
  // The unscoped product provides the canonical identity, but visible course
  // content also needs a successful studio-scoped read. Share that request-
  // cached result with the page so a partial API outage cannot leave an
  // indexable loading placeholder behind otherwise valid course metadata.
  const initialData = result.unavailable
    ? null
    : await getPublicCourseInitialData(
        tenantSlug,
        getPublicCourseLocationRequest(await searchParams),
        productId,
      );
  const title = result.product
    ? getCourseName(result.product, locale)
    : t("courseMetadataTitle");
  const description =
    getCourseDescription(result.product, locale)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || t("courseMetadataDescription");

  return {
    title,
    description,
    ...(!initialData?.product
      ? { robots: { index: false, follow: true } }
      : {}),
    alternates: { canonical },
    openGraph: {
      ...inheritedMetadata?.openGraph,
      title,
      description,
      url: canonical,
    },
  };
}

export default async function PublicCourseProductPage({
  params,
  searchParams,
}) {
  const { tenantSlug, productId } = await params;
  await requirePublicTenantPageVisible(tenantSlug, "courses");

  const result = await getPublicCourseProduct(tenantSlug, productId);
  if (result.notFound) notFound();
  const initialData = await getPublicCourseInitialData(
    tenantSlug,
    getPublicCourseLocationRequest(await searchParams),
    productId,
  );

  return (
    <Suspense fallback={null}>
      <PublicCourseHydrationBoundary initialData={initialData}>
        <PublicBookingProductDetailPage
          kind="courses"
          initialData={initialData}
        />
      </PublicCourseHydrationBoundary>
    </Suspense>
  );
}
