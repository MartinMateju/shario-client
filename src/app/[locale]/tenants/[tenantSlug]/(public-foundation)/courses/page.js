import PublicCourseHydrationBoundary from "@/components/courses/PublicCourseHydrationBoundary";
import { PublicCustomerCoursesPage } from "@/components/courses/CustomerCoursesPage";
import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";
import { requirePublicTenantPageVisible } from "@/lib/publicTenant/pageVisibility";
import {
  getPublicCourseInitialData,
  getPublicCourseLocationRequest,
} from "@/lib/publicTenant/courses.server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params, searchParams }, parent) {
  const [{ locale, tenantSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const [result, initialData, t, inheritedMetadata] = await Promise.all([
    requirePublicTenantPageVisible(tenantSlug, "courses"),
    getPublicCourseInitialData(
      tenantSlug,
      getPublicCourseLocationRequest(query),
    ),
    getTranslations({ locale, namespace: "PublicTenant.courses" }),
    parent,
  ]);
  const page = result.tenant?.publicSite?.pages?.courses;
  const canonical = `/${locale}/courses`;
  const title = getLocalizedPublicTenantText(
    page?.title,
    locale,
    t("metadataTitle"),
  );
  const description = getLocalizedPublicTenantText(
    page?.description,
    locale,
    t("description"),
  );
  return {
    title,
    description,
    // An empty successful catalogue is real content; a failed read leaves a
    // loading/error placeholder and must not be indexed as the course page.
    ...(!result.tenant?.publicCapabilities?.courses ||
    !Array.isArray(initialData?.products)
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

export default async function PublicCoursesPage({ params, searchParams }) {
  const [{ tenantSlug }, query] = await Promise.all([params, searchParams]);
  const [result, overview] = await Promise.all([
    requirePublicTenantPageVisible(tenantSlug, "courses"),
    getPublicCourseInitialData(
      tenantSlug,
      getPublicCourseLocationRequest(query),
    ),
  ]);
  const initialData =
    result.tenant?.publicCapabilities?.courses === true ? overview : null;
  return (
    <PublicCourseHydrationBoundary initialData={initialData}>
      <PublicCustomerCoursesPage initialData={initialData} />
    </PublicCourseHydrationBoundary>
  );
}
