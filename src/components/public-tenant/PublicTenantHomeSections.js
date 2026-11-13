"use client";

import {
  AcademicCapIcon,
  ArrowLongRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  GiftIcon,
  IdentificationIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  formatPlanPrice,
  getEntityId,
  getLocalizedMembershipText,
  getPlanPrices,
  getPlanVersion,
  normalizePlans,
} from "@/components/memberships/membership.utils";
import {
  formatProductPrice,
  getProductDescription,
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import { Link } from "@/i18n/navigation";
import { useGetPublicMembershipCatalogQuery } from "@/lib/features/memberships/membershipsApiSlice";
import { useGetPublicBookingLocationsQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";
import {
  useGetPublicCourseProductsQuery,
  useGetPublicProductsQuery,
} from "@/lib/features/products/productsApiSlice";

import {
  PUBLIC_TENANT_NAV_DEFINITIONS,
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
  isPublicTenantPageVisible,
} from "./publicTenant.config";
import { getPublicProductRoute } from "./publicProductTaxonomy";
import { usePublicTenant } from "./PublicTenantProvider";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

const NAV_ICONS = Object.freeze({
  book: CalendarDaysIcon,
  courses: AcademicCapIcon,
  memberships: IdentificationIcon,
  vouchers: GiftIcon,
  help: BookOpenIcon,
});

const getId = (value) => String(value?.id ?? value?._id ?? "").trim();

const getImageUrl = (product) =>
  String(product?.imageSrc || product?.imageUrl || "").trim();

function SectionHeading({ content, fallback, locale, sectionKey }) {
  const title = getLocalizedPublicTenantText(
    content?.title,
    locale,
    fallback[1],
  );
  const description = getLocalizedPublicTenantText(
    content?.description,
    locale,
    "",
  );

  return (
    <header className="max-w-3xl">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tenant-label-color)]"
        data-tenant-type="eyebrow"
      >
        {fallback[0]}
      </p>
      <h2
        className="mt-3 text-balance font-serif text-4xl font-normal tracking-[-0.045em] sm:text-5xl"
        data-tenant-type="display"
        data-public-site-edit-path={`pages.home.sectionContent.${sectionKey}.title.${locale}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className="mt-4 max-w-2xl text-base leading-7 text-[var(--tenant-text-muted)]"
          data-public-site-edit-path={`pages.home.sectionContent.${sectionKey}.description.${locale}`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}

function WaysToVisitSection({ content, locale, navigation, copy, theme }) {
  if (!navigation.length) return null;

  return (
    <section
      data-public-tenant-ways-to-visit
      data-public-site-home-section="waysToVisit"
      data-tenant-layout="section"
      className="border-t border-[color:var(--tenant-border)] px-5 py-14 sm:px-8 sm:py-18 lg:px-12 lg:py-20"
      style={{
        backgroundColor: "var(--tenant-secondary-surface)",
        color: "var(--tenant-text-on-secondary-surface)",
      }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          content={content}
          fallback={copy.waysToVisit}
          locale={locale}
          sectionKey="waysToVisit"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {navigation.map((item) => {
            const Icon = NAV_ICONS[item.key] || BookOpenIcon;

            return (
              <Link
                key={item.key}
                href={item.href}
                data-public-tenant-service={item.key}
                data-tenant-layout="card"
                data-tenant-surface="card"
                className="group flex min-h-56 flex-col rounded-[24px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] p-6 text-[color:var(--tenant-text-on-surface)] shadow-[0_14px_40px_rgba(17,17,15,0.035)] transition hover:-translate-y-1 hover:border-[color:var(--tenant-accent)]"
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${theme.accentColor} 12%, transparent)`,
                    color: theme.accentOnSurfaceColor,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">
                  {copy.nav[item.key] || item.key}
                </h3>
                <span
                  className="mt-auto inline-flex items-center gap-2 pt-5 text-xs font-semibold"
                  style={{ color: theme.accentOnSurfaceColor }}
                >
                  {copy.explore}
                  <ArrowLongRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedSection({
  content,
  copy,
  courses,
  locale,
  memberships,
  membershipCurrency,
  products,
  availablePages,
}) {
  const productItems = [
    ...courses.map((product) => ({ product, kind: "courses" })),
    ...products.map((product) => ({
      product,
      kind: getPublicProductRoute(product),
    })),
  ]
    .filter(
      ({ kind }) =>
        ["book", "courses"].includes(kind) && availablePages.has(kind),
    )
    .filter(
      (item, index, items) =>
        getProductId(item.product) &&
        items.findIndex(
          (candidate) =>
            getProductId(candidate.product) === getProductId(item.product),
        ) === index,
    )
    .slice(0, 3)
    .map(({ product, kind }) => ({
      id: `product:${getProductId(product)}`,
      title: getProductName(product, locale),
      description: getProductDescription(product, locale),
      detail: formatProductPrice(product, locale),
      imageUrl: getImageUrl(product),
      href:
        kind === "courses"
          ? `/courses/${encodeURIComponent(getProductId(product))}`
          : "/book",
    }));
  const planItems = normalizePlans({ plans: memberships })
    .filter(() => availablePages.has("memberships"))
    .filter((plan) =>
      getPlanPrices(plan).some(
        (price) => price.currency === membershipCurrency,
      ),
    )
    .slice(0, Math.max(0, 3 - productItems.length))
    .map((plan) => {
      const version = getPlanVersion(plan);
      const price = getPlanPrices(plan).find(
        (price) => price.currency === membershipCurrency,
      );

      return {
        id: `plan:${getEntityId(plan)}:${getEntityId(version)}`,
        title: getLocalizedMembershipText(version, "name", locale),
        description: getLocalizedMembershipText(version, "description", locale),
        detail: price ? formatPlanPrice(price, locale) : "",
        imageUrl: "",
        href: "/memberships",
      };
    });
  const items = [...productItems, ...planItems];

  if (!items.length) return null;

  return (
    <section
      data-public-site-home-section="featured"
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          content={content}
          fallback={copy.featured}
          locale={locale}
          sectionKey="featured"
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_14px_45px_rgba(17,17,15,0.05)]"
              data-tenant-surface="card"
            >
              {item.imageUrl ? (
                // Tenant-managed product images can use external HTTPS hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-44 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold tracking-[-0.035em]">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                    {item.description}
                  </p>
                ) : null}
                {item.detail ? (
                  <p className="mt-5 text-lg font-semibold">{item.detail}</p>
                ) : null}
                <Link
                  href={item.href}
                  className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-xs font-semibold text-[var(--tenant-accent-on-surface)]"
                >
                  {copy.view}
                  <ArrowLongRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextSection({ branding, content, copy, locale, sectionKey }) {
  const body =
    getLocalizedPublicTenantText(content?.description, locale) ||
    (sectionKey === "about"
      ? getLocalizedPublicTenantText(branding.description, locale)
      : "");

  return (
    <section
      data-public-site-home-section={sectionKey}
      className="border-t border-[var(--tenant-border)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
      style={{ backgroundColor: "var(--tenant-background)" }}
    >
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <SectionHeading
          content={{ ...content, description: {} }}
          fallback={copy[sectionKey]}
          locale={locale}
          sectionKey={sectionKey}
        />
        <div
          className={
            sectionKey === "testimonials"
              ? "font-serif text-3xl leading-tight tracking-[-0.035em] sm:text-4xl"
              : "text-lg leading-8 text-[var(--tenant-text-muted)] sm:text-xl"
          }
          data-public-site-edit-path={`pages.home.sectionContent.${sectionKey}.description.${locale}`}
        >
          {body || branding.displayName}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ branding, content, copy, locale, products }) {
  const images = [branding.coverImageUrl, ...products.map(getImageUrl)]
    .filter(Boolean)
    .filter((url, index, items) => items.indexOf(url) === index)
    .slice(0, 6);

  if (!images.length) return null;

  return (
    <section
      data-public-site-home-section="gallery"
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-secondary-surface)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          content={content}
          fallback={copy.gallery}
          locale={locale}
          sectionKey="gallery"
        />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {images.map((url, index) => (
            // Tenant-managed images can use external HTTPS hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              className={`w-full rounded-[22px] object-cover ${index === 0 ? "col-span-2 aspect-[2/1] lg:col-span-2" : "aspect-square"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LocationsSection({ content, copy, locale, locations }) {
  return (
    <section
      data-public-site-home-section="locations"
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          content={content}
          fallback={copy.locations}
          locale={locale}
          sectionKey="locations"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.length ? (
            locations.slice(0, 6).map((location) => {
              const address = [
                location.address?.line1,
                location.address?.city,
                location.address?.postalCode,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <article
                  key={getId(location)}
                  className="rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text-on-surface)]"
                  data-tenant-surface="card"
                >
                  <MapPinIcon className="h-6 w-6 text-[var(--tenant-accent-on-surface)]" />
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">
                    {location.name}
                  </h3>
                  {address ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                      {address}
                    </p>
                  ) : null}
                  {location.contact?.email ? (
                    <a
                      href={`mailto:${location.contact.email}`}
                      className="mt-5 inline-flex text-xs font-semibold text-[var(--tenant-accent-on-surface)]"
                    >
                      {copy.contact}
                    </a>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--tenant-border)] p-8 text-sm text-[var(--tenant-text-muted)]">
              {copy.noLocation}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamSection({ branding, content, copy, locale }) {
  return (
    <section
      data-public-site-home-section="team"
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-secondary-surface)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          content={content}
          fallback={copy.team}
          locale={locale}
          sectionKey="team"
        />
        <div className="mt-8 flex max-w-md items-center gap-5 rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text-on-surface)]">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--tenant-accent)] text-xl font-semibold text-[var(--tenant-accent-foreground)]">
            {branding.displayName.charAt(0) || "S"}
          </span>
          <div>
            <h3 className="text-lg font-semibold">{branding.displayName}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
              {getLocalizedPublicTenantText(content?.description, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ content, copy, locale, availablePages }) {
  const pageKeys = ["book", "courses", "help"];
  const cards = copy.faqCards
    .map((label, index) => ({ label, key: pageKeys[index] }))
    .filter(({ key }) => availablePages.has(key));

  if (!cards.length) return null;

  return (
    <section
      data-public-site-home-section="faq"
      className="border-t border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          content={content}
          fallback={copy.faq}
          locale={locale}
          sectionKey="faq"
        />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {cards.map(({ label, key }) => (
            <Link
              key={label}
              href={PUBLIC_TENANT_NAV_DEFINITIONS[key].href}
              className="flex min-h-24 items-center justify-between gap-4 rounded-[20px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-5 text-sm font-semibold text-[var(--tenant-text-on-surface)]"
            >
              {label}
              <ArrowLongRightIcon className="h-4 w-4 shrink-0 text-[var(--tenant-accent-on-surface)]" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PublicTenantHomeSections({ previewData }) {
  const locale = useLocale();
  const t = useTranslations("PublicTenantHome.sections");
  const copy = {
    ...Object.fromEntries(
      [
        "waysToVisit",
        "featured",
        "about",
        "gallery",
        "testimonials",
        "locations",
        "team",
        "faq",
      ].map((key) => [key, [t(`${key}.eyebrow`), t(`${key}.title`)]]),
    ),
    ...Object.fromEntries(
      ["explore", "view", "contact", "noLocation"].map((key) => [key, t(key)]),
    ),
    faqCards: ["book", "courses", "help"].map((key) => t(`faqCards.${key}`)),
    nav: Object.fromEntries(
      ["book", "courses", "memberships", "vouchers", "help"].map((key) => [
        key,
        t(`nav.${key}`),
      ]),
    ),
  };
  const { tenant, navigation } = usePublicTenant();
  const previewMode = previewData && typeof previewData === "object";
  const home = tenant.publicSite.pages.home;
  const hidden = new Set(home.hiddenSections);
  const visible = new Set(
    home.sectionOrder.filter((sectionKey) => !hidden.has(sectionKey)),
  );
  const availablePages = new Set(
    Object.entries(PUBLIC_TENANT_NAV_DEFINITIONS)
      .filter(
        ([key, { capability }]) =>
          isPublicTenantPageVisible(tenant, key) &&
          tenant.publicCapabilities[capability] === true,
      )
      .map(([key]) => key),
  );
  const needsLocations = visible.has("locations");
  const needsProducts =
    visible.has("gallery") ||
    (visible.has("featured") &&
      (availablePages.has("book") || availablePages.has("courses")));
  const needsCourses = visible.has("featured") && availablePages.has("courses");
  const needsMemberships =
    visible.has("featured") && availablePages.has("memberships");
  const locationsQuery = useGetPublicBookingLocationsQuery(
    { tenantSlug: tenant.slug },
    { skip: previewMode || !tenant.slug || !needsLocations },
  );
  const productsQuery = useGetPublicProductsQuery(
    { tenantSlug: tenant.slug },
    { skip: previewMode || !tenant.slug || !needsProducts },
  );
  const coursesQuery = useGetPublicCourseProductsQuery(
    { tenantSlug: tenant.slug },
    {
      skip:
        previewMode ||
        !tenant.slug ||
        !needsCourses ||
        !tenant.publicCapabilities.courses,
    },
  );
  const membershipsQuery = useGetPublicMembershipCatalogQuery(
    { tenantSlug: tenant.slug },
    {
      skip:
        previewMode ||
        !tenant.slug ||
        !needsMemberships ||
        !tenant.publicCapabilities.memberships,
    },
  );
  const locations = previewMode
    ? Array.isArray(previewData.locations)
      ? previewData.locations
      : []
    : Array.isArray(locationsQuery.data)
      ? locationsQuery.data
      : [];
  const products = previewMode
    ? Array.isArray(previewData.products)
      ? previewData.products
      : []
    : Array.isArray(productsQuery.data)
      ? productsQuery.data
      : [];
  const courses = previewMode
    ? Array.isArray(previewData.courses)
      ? previewData.courses
      : []
    : Array.isArray(coursesQuery.data)
      ? coursesQuery.data
      : [];
  const memberships = previewMode
    ? Array.isArray(previewData.memberships)
      ? previewData.memberships
      : []
    : normalizePlans(membershipsQuery.data);
  const theme = getPublicTenantTheme(tenant);
  const branding = tenant.publicSite.branding;

  const renderSection = (key) => {
    if (hidden.has(key)) return null;
    const content = home.sectionContent[key];

    switch (key) {
      case "waysToVisit":
        return (
          <WaysToVisitSection
            key={key}
            content={content}
            locale={locale}
            navigation={navigation}
            copy={copy}
            theme={theme}
          />
        );
      case "featured":
        return (
          <FeaturedSection
            key={key}
            content={content}
            copy={copy}
            courses={courses}
            locale={locale}
            memberships={memberships}
            membershipCurrency={
              membershipsQuery.data?.tenant?.currency ||
              tenant.settings?.currency ||
              DEFAULT_STUDIO_COMMERCE_CURRENCY
            }
            products={products}
            availablePages={availablePages}
          />
        );
      case "about":
      case "testimonials":
        return (
          <TextSection
            key={key}
            branding={branding}
            content={content}
            copy={copy}
            locale={locale}
            sectionKey={key}
          />
        );
      case "gallery":
        return (
          <GallerySection
            key={key}
            branding={branding}
            content={content}
            copy={copy}
            locale={locale}
            products={products}
          />
        );
      case "locations":
        return (
          <LocationsSection
            key={key}
            content={content}
            copy={copy}
            locale={locale}
            locations={locations}
          />
        );
      case "team":
        return (
          <TeamSection
            key={key}
            branding={branding}
            content={content}
            copy={copy}
            locale={locale}
          />
        );
      case "faq":
        return (
          <FaqSection
            key={key}
            content={content}
            copy={copy}
            locale={locale}
            availablePages={availablePages}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div data-public-site-home-sections>
      {home.sectionOrder.map(renderSection)}
    </div>
  );
}
