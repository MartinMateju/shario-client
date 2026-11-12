"use client";

import {
  AcademicCapIcon,
  ArrowLongRightIcon,
  BookOpenIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  formatProductPrice,
  getProductDescription,
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import {
  formatPlanPrice,
  getEntityId,
  getLocalizedMembershipText,
  getPlanPrices,
  getPlanVersion,
  normalizePlans,
} from "@/components/memberships/membership.utils";
import { Link } from "@/i18n/navigation";
import { useGetPublicKnowledgeQuery } from "@/lib/features/knowledge/knowledgeApiSlice";
import { useGetPublicMembershipCatalogQuery } from "@/lib/features/memberships/membershipsApiSlice";
import { useGetPublicCourseProductsQuery } from "@/lib/features/products/productsApiSlice";

import { getPublicTenantTheme } from "./publicTenant.config";
import { usePublicTenant } from "./PublicTenantProvider";
import { isPublicCatalogProduct } from "./publicProductTaxonomy";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

const prioritizeFeatured = (items) =>
  [...items].sort((left, right) => {
    if (left?.featured !== right?.featured) return left?.featured ? -1 : 1;
    return 0;
  });

function HighlightSection({ icon: Icon, title, description, href, children }) {
  const t = useTranslations("PublicTenant.home.highlights");

  return (
    <section
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-14 text-[var(--tenant-text)] sm:px-8 lg:px-12"
      data-tenant-layout="section"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
              <Icon className="h-5 w-5" />
            </span>
            <h2
              className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
              data-tenant-type="display"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--tenant-muted-text)]">
              {description}
            </p>
          </div>
          <Link
            href={href}
            data-tenant-button="secondary"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--tenant-accent-link)]"
          >
            {t("viewAll")}
            <ArrowLongRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div
          className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          data-tenant-content
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function HighlightCard({ title, description, detail, href }) {
  const t = useTranslations("PublicTenant.home.highlights");

  return (
    <article
      className="flex h-full flex-col rounded-[22px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)] shadow-[0_12px_35px_rgba(17,17,15,0.04)]"
      data-tenant-layout="card"
      data-tenant-surface="card"
    >
      <h3
        className="text-lg font-semibold tracking-[-0.03em]"
        data-tenant-type="display"
      >
        {title}
      </h3>
      {description ? (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
          {description}
        </p>
      ) : (
        <span className="flex-1" />
      )}
      {detail ? <p className="mt-4 text-sm font-semibold">{detail}</p> : null}
      <Link
        href={href}
        data-tenant-button="secondary"
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--tenant-border)] px-4 text-xs font-semibold transition hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)]"
      >
        {t("open")}
      </Link>
    </article>
  );
}

export default function PublicTenantHighlights() {
  const locale = useLocale();
  const t = useTranslations("PublicTenant.home.highlights");
  const { tenant } = usePublicTenant();
  const tenantSlug = tenant.slug;
  const capabilities = tenant.publicCapabilities;
  const courseQuery = useGetPublicCourseProductsQuery(
    { tenantSlug },
    { skip: !tenantSlug || !capabilities.courses },
  );
  const membershipQuery = useGetPublicMembershipCatalogQuery(
    { tenantSlug },
    { skip: !tenantSlug || !capabilities.memberships },
  );
  const knowledgeQuery = useGetPublicKnowledgeQuery(
    { tenantSlug, limit: 12 },
    { skip: !tenantSlug || !capabilities.help },
  );
  const courses = prioritizeFeatured(
    (Array.isArray(courseQuery.data) ? courseQuery.data : []).filter(
      (product) => isPublicCatalogProduct(product, "courses"),
    ),
  ).slice(0, 3);
  const primaryCurrency =
    membershipQuery.data?.tenant?.currency ||
    tenant.settings?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const plans = normalizePlans(membershipQuery.data)
    .filter((plan) =>
      getPlanPrices(plan).some((price) => price.currency === primaryCurrency),
    )
    .slice(0, 3);
  const resources = prioritizeFeatured(
    Array.isArray(knowledgeQuery.data) ? knowledgeQuery.data : [],
  ).slice(0, 3);
  const { style } = getPublicTenantTheme(tenant);

  if (!courses.length && !plans.length && !resources.length) return null;

  return (
    <div style={style}>
      {courses.length ? (
        <HighlightSection
          icon={AcademicCapIcon}
          title={t("coursesTitle")}
          description={t("coursesDescription")}
          href="/courses"
        >
          {courses.map((course) => (
            <HighlightCard
              key={getProductId(course)}
              title={getProductName(course, locale)}
              description={getProductDescription(course, locale)}
              detail={formatProductPrice(course, locale)}
              href={`/courses/${encodeURIComponent(getProductId(course))}`}
            />
          ))}
        </HighlightSection>
      ) : null}

      {plans.length ? (
        <HighlightSection
          icon={IdentificationIcon}
          title={t("membershipsTitle")}
          description={t("membershipsDescription")}
          href="/memberships"
        >
          {plans.map((plan) => {
            const version = getPlanVersion(plan);
            const price = getPlanPrices(plan).find(
              (price) => price.currency === primaryCurrency,
            );
            const search = new URLSearchParams({
              planId: getEntityId(plan),
              planVersionId: getEntityId(version),
            });
            if (price?.currency) search.set("currency", price.currency);

            return (
              <HighlightCard
                key={`${getEntityId(plan)}:${getEntityId(version)}`}
                title={getLocalizedMembershipText(version, "name", locale)}
                description={getLocalizedMembershipText(
                  version,
                  "description",
                  locale,
                )}
                detail={formatPlanPrice(price, locale)}
                href={`/memberships?${search.toString()}`}
              />
            );
          })}
        </HighlightSection>
      ) : null}

      {resources.length ? (
        <HighlightSection
          icon={BookOpenIcon}
          title={t("helpTitle")}
          description={t("helpDescription")}
          href="/help"
        >
          {resources.map((resource) => (
            <HighlightCard
              key={resource.id}
              title={resource.title}
              description={resource.summary || resource.content}
              detail={t(`resourceTypes.${resource.type}`)}
              href={`/help/${encodeURIComponent(resource.id)}`}
            />
          ))}
        </HighlightSection>
      ) : null}
    </div>
  );
}
