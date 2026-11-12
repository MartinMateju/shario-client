"use client";

import {
  AcademicCapIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import {
  getCustomerCourseHref,
  getCourseName,
  getCourseDescription,
  getCourseDurationLabel,
} from "@/components/courses/customerCourses.utils";
import CourseProductGallery from "@/components/courses/CourseProductGallery";
import usePublicCourseLocation, {
  retainPublicCourseLocation,
} from "@/components/courses/usePublicCourseLocation";
import {
  selectCurrentTenant,
  selectIsCustomerAuthenticated,
} from "@/lib/features/auth/authSlice";
import {
  formatProductPrice,
  getProductDescription,
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { Link } from "@/i18n/navigation";
import {
  useGetPublicCourseProductsQuery,
  useGetPublicProductsQuery,
} from "@/lib/features/products/productsApiSlice";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

import PublicCapabilityGate from "./PublicCapabilityGate";
import { usePublicTenant } from "./PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "./publicTenant.config";
import {
  getPublicProductHref,
  isPublicCatalogProduct,
} from "./publicProductTaxonomy";

export const normalizeClassCatalogText = (value, locale = "en") =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale)
    .trim();

const getClassCategory = (product) =>
  typeof product?.classCategory === "string"
    ? product.classCategory.trim()
    : "";

export const getClassCatalogCategories = (products = [], locale = "en") => {
  const seen = new Set();

  return products.reduce((categories, product) => {
    const label = getClassCategory(product);
    const key = normalizeClassCatalogText(label, locale);

    if (!key || seen.has(key)) return categories;

    seen.add(key);
    categories.push({ key, label });
    return categories;
  }, []);
};

export const filterClassCatalogProducts = ({
  products = [],
  locale = "en",
  activeCategory = "",
  searchQuery = "",
}) => {
  const categoryFilter = normalizeClassCatalogText(activeCategory, locale);
  const query = normalizeClassCatalogText(searchQuery, locale);

  return products.filter((product) => {
    const classCategory = getClassCategory(product);

    if (
      categoryFilter &&
      normalizeClassCatalogText(classCategory, locale) !== categoryFilter
    ) {
      return false;
    }

    if (!query) return true;

    return [
      getCourseName(product, locale),
      getCourseDescription(product, locale),
      classCategory,
    ].some((value) => normalizeClassCatalogText(value, locale).includes(query));
  });
};

export const getCourseCatalogAvailability = (product, t) => {
  const availability =
    product?.availability && typeof product.availability === "object"
      ? product.availability
      : {};
  const supplied =
    Object.prototype.hasOwnProperty.call(product || {}, "nextSession") ||
    Object.prototype.hasOwnProperty.call(availability, "nextSession");

  if (!supplied) return "";

  const session = product?.nextSession ?? availability.nextSession;
  if (!session) return t("catalog.availability.newDatesSoon");

  const remaining = Number(session.remainingCapacity);
  if (Number.isFinite(remaining) && remaining > 0) {
    return t("catalog.availability.placesLeft", {
      count: Math.floor(remaining),
    });
  }

  if (
    session?.waitlist?.enabled === true &&
    session?.waitlist?.accepting === true
  ) {
    return t("catalog.availability.fullWaitlistOpen");
  }

  return t("catalog.availability.full");
};

function CatalogCard({
  product,
  locale,
  accentColor,
  accentForeground,
  actionHref,
  actionLabel,
  availabilityLabel,
  course = false,
}) {
  const name = course
    ? getCourseName(product, locale)
    : getProductName(product, locale);
  const description = course
    ? getCourseDescription(product, locale)
    : getProductDescription(product, locale);
  const durationLabel = course ? getCourseDurationLabel(product, locale) : "";
  const imageUrl = String(product?.imageSrc || product?.imageUrl || "").trim();

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] text-[color:var(--tenant-text-on-surface)] shadow-[0_14px_45px_rgba(17,17,15,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(17,17,15,0.08)] motion-reduce:transform-none motion-reduce:transition-none"
      data-tenant-surface="card"
    >
      {course ? (
        <CourseProductGallery product={product} />
      ) : imageUrl ? (
        // Public products can use tenant-managed HTTPS image hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-44 w-full bg-[color:var(--tenant-background)] object-cover"
          data-tenant-surface="media"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <h2
          className="text-xl font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]"
          data-tenant-type="display"
        >
          {name}
        </h2>
        {description ? (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
            {description}
          </p>
        ) : null}
        <p className="mt-5 text-lg font-semibold">
          {formatProductPrice(product, locale)}
        </p>
        {durationLabel ? (
          <p className="mt-2 text-sm text-[color:var(--tenant-muted-on-surface)]">
            {durationLabel}
          </p>
        ) : null}
        {availabilityLabel ? (
          <p className="mt-3 inline-flex min-h-7 w-fit items-center rounded-full border border-[color-mix(in_srgb,var(--tenant-accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--tenant-accent)_7%,transparent)] px-3 text-[10px] font-semibold text-[var(--tenant-accent-on-surface)]">
            {availabilityLabel}
          </p>
        ) : null}
        <Link
          href={actionHref}
          data-tenant-button="primary"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-xs font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
          style={{
            backgroundColor: accentColor,
            color: accentForeground,
          }}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}

function ClassCatalogFilters({
  activeCategory,
  accentColor,
  accentForeground,
  categories,
  onCategoryChange,
  onSearchChange,
  searchQuery,
  t,
  totalCount,
  visibleCount,
}) {
  return (
    <section
      className="mt-10 border-y border-[color:var(--tenant-border)] py-5 sm:py-6"
      data-class-catalog-filters
      aria-labelledby="class-catalog-filter-label"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <p
            id="class-catalog-filter-label"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tenant-text-muted)]"
            data-tenant-type="eyebrow"
          >
            {t("courses.filters.label")}
          </p>
          <div
            className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            role="group"
            aria-labelledby="class-catalog-filter-label"
          >
            <button
              type="button"
              aria-pressed={!activeCategory}
              onClick={() => onCategoryChange("")}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-5 text-xs font-semibold text-[color:var(--tenant-text-on-surface)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
              style={
                !activeCategory
                  ? {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                      color: accentForeground,
                    }
                  : undefined
              }
            >
              {t("courses.filters.all")}
            </button>
            {categories.map((category) => {
              const active = activeCategory === category.key;

              return (
                <button
                  key={category.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCategoryChange(category.key)}
                  className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-5 text-xs font-semibold text-[color:var(--tenant-text-on-surface)] transition hover:-translate-y-0.5 hover:border-[color:var(--tenant-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                  style={
                    active
                      ? {
                          backgroundColor: accentColor,
                          borderColor: accentColor,
                          color: accentForeground,
                        }
                      : undefined
                  }
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-[320px]">
            <label className="sr-only" htmlFor="class-catalog-search">
              {t("courses.filters.searchLabel")}
            </label>
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--tenant-muted-on-surface)]"
              aria-hidden="true"
            />
            <input
              id="class-catalog-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("courses.filters.searchPlaceholder")}
              className="min-h-12 w-full rounded-full border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] py-3 pl-11 pr-11 text-sm text-[color:var(--tenant-text-on-surface)] outline-none placeholder:text-[color:var(--tenant-muted-on-surface)] focus:border-[color:var(--tenant-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--tenant-accent)_18%,transparent)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--tenant-muted-on-surface)] transition hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_7%,transparent)] hover:text-[color:var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] motion-reduce:transition-none"
                aria-label={t("courses.filters.clearSearch")}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p
            className="min-w-[88px] text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tenant-text-muted)]"
            aria-live="polite"
            data-class-catalog-result-count
          >
            {t("courses.filters.resultCount", {
              visible: visibleCount,
              total: totalCount,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function PublicProductCatalogPage({ kind, previewData }) {
  const locale = useLocale();
  const t = useTranslations("PublicTenant");
  const params = useParams();
  const searchParams = useSearchParams();
  const locationId = searchParams.get("locationId") || "";
  const tenantSlug = getValidatedTenantSlugParam(params);
  const { tenant } = usePublicTenant();
  const courses = kind === "courses";
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const previewMode = Array.isArray(previewData);
  const courseLocation = usePublicCourseLocation({
    tenantSlug,
    enabled: courses,
    previewMode,
  });
  const courseLocationId = courseLocation.locationId;
  const currentTenant = useSelector(selectCurrentTenant);
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const customerForTenant =
    !previewMode &&
    isCustomerAuthenticated &&
    String(currentTenant?.slug || "").toLowerCase() === tenantSlug;
  const capability = courses ? "courses" : "bookStudio";
  const capabilityEnabled = tenant.publicCapabilities[capability] === true;
  const allProductsQuery = useGetPublicProductsQuery(
    { tenantSlug, ...(locationId ? { locationId } : {}) },
    { skip: previewMode || courses || !tenantSlug || !capabilityEnabled },
  );
  const courseProductsQuery = useGetPublicCourseProductsQuery(
    {
      tenantSlug,
      ...(courseLocationId ? { locationId: courseLocationId } : {}),
    },
    {
      skip:
        previewMode ||
        !courses ||
        !tenantSlug ||
        !capabilityEnabled ||
        courseLocation.unresolved,
    },
  );
  const query = previewMode
    ? {
        data: previewData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: () => undefined,
      }
    : courses
      ? courseLocation.unresolved
        ? {
            currentData: undefined,
            isLoading:
              courseLocation.query.isLoading || courseLocation.query.isFetching,
            isError: courseLocation.query.isError,
            refetch: courseLocation.query.refetch,
          }
        : courseProductsQuery
      : allProductsQuery;
  const queryData =
    courses && courseLocation.reference && !previewMode
      ? query.currentData
      : query.data;
  const products = useMemo(
    () =>
      (Array.isArray(queryData) ? queryData : []).filter(
        (product) =>
          isPublicCatalogProduct(product, kind) &&
          (!locationId || isProductAvailableAtLocation(product, locationId)),
      ),
    [kind, locationId, queryData],
  );
  const categories = useMemo(
    () => (courses ? getClassCatalogCategories(products, locale) : []),
    [courses, locale, products],
  );
  const visibleProducts = useMemo(
    () =>
      courses
        ? filterClassCatalogProducts({
            products,
            locale,
            activeCategory,
            searchQuery,
          })
        : products,
    [activeCategory, courses, locale, products, searchQuery],
  );
  const resetFilters = () => {
    setActiveCategory("");
    setSearchQuery("");
  };
  const Icon = courses ? AcademicCapIcon : CalendarDaysIcon;
  const { accentColor, accentForeground, backgroundColor, textForeground } =
    getPublicTenantTheme(tenant);
  const page = tenant.publicSite.pages[kind];
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    page: kind,
    locale,
    studio: tenant.publicSite.branding.displayName,
  });
  const title = getLocalizedPublicTenantText(
    page.title,
    locale,
    customizationDefaults.title,
  );
  const description = getLocalizedPublicTenantText(
    page.description,
    locale,
    customizationDefaults.description,
  );

  return (
    <PublicCapabilityGate capability={capability}>
      <main
        className="min-h-[70vh] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
        data-tenant-layout="section"
        style={{ backgroundColor, color: textForeground }}
      >
        <section className="mx-auto max-w-[1320px]">
          <div className="max-w-3xl">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: accentColor,
                color: accentForeground,
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h1
              className="mt-6 max-w-[14ch] text-balance font-serif text-5xl font-normal leading-[0.98] tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-6xl"
              data-tenant-type="display"
              data-public-site-edit-path={`pages.${kind}.title.${locale}`}
            >
              {title}
            </h1>
            <p
              className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--tenant-text-muted)]"
              data-public-site-edit-path={`pages.${kind}.description.${locale}`}
            >
              {description}
            </p>
          </div>

          {!query.isLoading &&
          !query.isFetching &&
          !query.isError &&
          courses &&
          products.length ? (
            <ClassCatalogFilters
              activeCategory={activeCategory}
              accentColor={accentColor}
              accentForeground={accentForeground}
              categories={categories}
              onCategoryChange={setActiveCategory}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              t={t}
              totalCount={products.length}
              visibleCount={visibleProducts.length}
            />
          ) : null}

          {query.isLoading || query.isFetching ? (
            <div
              className="mt-10 flex min-h-64 items-center justify-center rounded-[24px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] text-sm text-[color:var(--tenant-muted-on-surface)]"
              data-tenant-surface="card"
              role="status"
            >
              <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" />
              {t("catalog.loading")}
            </div>
          ) : query.isError ? (
            <div
              className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-6 text-center text-[color:var(--tenant-text-on-surface)]"
              data-tenant-surface="card"
            >
              <p className="text-sm text-[color:var(--tenant-muted-on-surface)]">
                {t("catalog.error")}
              </p>
              <button
                type="button"
                onClick={query.refetch}
                data-tenant-button="secondary"
                className="mt-4 min-h-11 rounded-full border border-[color:var(--tenant-border)] px-5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
              >
                {t("catalog.retry")}
              </button>
            </div>
          ) : visibleProducts.length ? (
            <div
              className={`${courses ? "mt-8" : "mt-10"} grid gap-5 sm:grid-cols-2 xl:grid-cols-3`}
              data-tenant-content
            >
              {visibleProducts.map((product) => (
                <CatalogCard
                  key={getProductId(product)}
                  product={product}
                  course={courses}
                  locale={locale}
                  accentColor={accentColor}
                  accentForeground={accentForeground}
                  actionHref={
                    courses && customerForTenant
                      ? getCustomerCourseHref({
                          productId: getProductId(product),
                          locationReference: courseLocation.reference,
                        })
                      : retainPublicCourseLocation(
                          getPublicProductHref(product),
                          courses ? courseLocation.reference : "",
                        )
                  }
                  actionLabel={t(
                    courses ? "catalog.viewDates" : "catalog.viewDetails",
                  )}
                  availabilityLabel={
                    courses ? getCourseCatalogAvailability(product, t) : ""
                  }
                />
              ))}
            </div>
          ) : products.length ? (
            <div
              className="mt-8 flex min-h-56 flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-6 text-center text-[color:var(--tenant-text-on-surface)]"
              data-class-catalog-no-results
            >
              <MagnifyingGlassIcon
                className="h-6 w-6 text-[color:var(--tenant-accent-on-surface)]"
                aria-hidden="true"
              />
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                {t("courses.filters.noResults")}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                data-tenant-button="secondary"
                className="mt-5 min-h-11 rounded-full border border-[color:var(--tenant-border)] px-5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
              >
                {t("courses.filters.reset")}
              </button>
            </div>
          ) : (
            <div
              className="mt-10 flex min-h-64 items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-6 text-center text-sm text-[color:var(--tenant-muted-on-surface)]"
              data-tenant-surface="card"
            >
              {t("catalog.empty")}
            </div>
          )}
        </section>
      </main>
    </PublicCapabilityGate>
  );
}
