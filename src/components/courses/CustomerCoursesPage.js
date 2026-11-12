"use client";

import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  GiftIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { useCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";
import StudioSwitcher from "@/components/menu/StudioSwitcher";
import {
  formatProductPrice,
  getProductId,
} from "@/components/products/products.utils";
import {
  filterClassCatalogProducts,
  getClassCatalogCategories,
} from "@/components/public-tenant/PublicProductCatalogPage";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  isPublicTenantPageVisible,
} from "@/components/public-tenant/publicTenant.config";
import { Link } from "@/i18n/navigation";
import {
  getAuthCacheIdentity,
  selectCurrentTenant,
} from "@/lib/features/auth/authSlice";
import {
  addToCart,
  openCart,
  selectCurrentCart,
} from "@/lib/features/cart/cartSlice";
import {
  useGetCustomerCourseProductsQuery,
  useGetPublicCourseProductsQuery,
} from "@/lib/features/products/productsApiSlice";
import { useGetCustomerCourseSessionsQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";
import CourseWaitlistAction from "@/components/waitlists/CourseWaitlistAction";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import {
  buildCustomerCourseCartItem,
  getCourseDurationMinutes,
  getCourseName,
  getCourseDescription,
  getCourseDetails,
  getCourseDurationLabel,
  getCourseImageUrls,
  getCourseSessionId,
  getCustomerCourseHref,
  getUpcomingLocationSessions,
  isCourseSessionBookable,
} from "./customerCourses.utils";

import CourseProductGallery from "./CourseProductGallery";
import usePublicCourseLocation, {
  retainPublicCourseLocation,
} from "./usePublicCourseLocation";
import PublicCapabilityGate from "@/components/public-tenant/PublicCapabilityGate";

const EMPTY = Object.freeze([]);
const fieldClass =
  "min-h-12 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 text-sm text-[var(--tenant-text-on-surface)] placeholder:text-[var(--tenant-muted-on-surface)]";

const formatSession = (session, locale, timeZone) => {
  try {
    const options = timeZone ? { timeZone } : {};
    const date = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "long",
      ...options,
    });
    const time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    });
    return `${date.format(new Date(session.start))} · ${time.format(new Date(session.start))}–${time.format(new Date(session.end))}`;
  } catch {
    return new Date(session.start).toLocaleString("en-GB");
  }
};

function CourseFacts({ product, session }) {
  const locale = useLocale();
  const t = useTranslations("CustomerCourses");
  const duration = getCourseDurationMinutes(session);
  const durationLabel = getCourseDurationLabel(product, locale);
  return (
    <dl className="grid gap-5 border-y border-[var(--tenant-border)] py-5 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-[var(--tenant-muted-on-surface)]">
          {t("pricePerPerson")}
        </dt>
        <dd className="mt-1 font-semibold">
          {formatProductPrice(product, locale)}
        </dd>
      </div>
      {durationLabel || duration ? (
        <div>
          <dt className="text-xs text-[var(--tenant-muted-on-surface)]">
            {t("duration")}
          </dt>
          <dd className="mt-1 font-semibold">
            {durationLabel || t("durationMinutes", { count: duration })}
          </dd>
        </div>
      ) : null}
      {Number(session?.capacity) > 0 ? (
        <div>
          <dt className="text-xs text-[var(--tenant-muted-on-surface)]">
            {t("capacity")}
          </dt>
          <dd className="mt-1 font-semibold">
            {t("capacityPeople", { count: session.capacity })}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function CourseLocationSwitcher({ location, preview = false }) {
  const locale = useLocale();
  const t = useTranslations("CustomerCourses");
  return (
    <section className="w-full max-w-md">
      <h2 className="mb-2 text-xs font-semibold text-[var(--tenant-muted-text)]">
        {t("location")}
      </h2>
      <StudioSwitcher
        locations={location.locations}
        activeLocationId={location.activeLocationId}
        onChange={preview ? undefined : location.selectLocation}
        locale={locale}
        isLoading={location.isSwitching}
        requireBookingEnabled={false}
        announceChanges={false}
      />
    </section>
  );
}

function GiftVoucherLink({
  location,
  preview = false,
  publicPage = false,
  className = "",
}) {
  const t = useTranslations("CustomerCourses");
  const { tenant } = usePublicTenant();
  const sessionTenant = useSelector(selectCurrentTenant);
  const { activeLocationReference } = location;
  if (
    (publicPage
      ? tenant.publicCapabilities?.vouchers !== true ||
        !isPublicTenantPageVisible(tenant, "vouchers")
      : sessionTenant?.modules?.vouchers === false) ||
    !isCustomerPortalPageEnabled(tenant, "vouchers")
  )
    return null;
  return (
    <Link
      href={
        publicPage
          ? retainPublicCourseLocation("/vouchers", activeLocationReference)
          : retainCustomerPortalLocation(
              "/portal/vouchers",
              activeLocationReference,
            )
      }
      className={`${customerPortalSecondaryActionClass} ${className}`}
      onClick={preview ? (event) => event.preventDefault() : undefined}
    >
      <GiftIcon className="h-4 w-4" aria-hidden="true" />
      {t("giftVoucher")}
    </Link>
  );
}

function CourseCatalogCard({
  product,
  location,
  preview = false,
  publicPage = false,
}) {
  const t = useTranslations("CustomerCourses");
  const locale = useLocale();
  const { activeLocationId, activeLocationReference, activeLocation } =
    location;
  const nextSession = preview
    ? null
    : getUpcomingLocationSessions(
        [product.nextSession].filter(Boolean),
        activeLocationId,
      )[0];
  const courseHref = (options) => {
    const href = getCustomerCourseHref(options);
    return publicPage ? href.replace(/^\/portal\/courses/, "/courses") : href;
  };
  const href = courseHref({
    productId: getProductId(product),
    locationReference: activeLocationReference,
  });
  return (
    <CustomerPortalSurface
      className={`grid !rounded-none ${getCourseImageUrls(product).length ? "min-[900px]:grid-cols-2" : ""}`}
      data-customer-course={getProductId(product)}
    >
      <CourseProductGallery product={product} />
      <div className="min-w-0 p-5 sm:p-7 xl:p-10">
        {product.classCategory ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tenant-accent-on-surface)]">
            {product.classCategory}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tenant-heading-on-surface)] xl:text-3xl">
          <Link
            href={href}
            onClick={preview ? (event) => event.preventDefault() : undefined}
          >
            {getCourseName(product, locale)}
          </Link>
        </h2>
        <p className="mb-6 mt-4 whitespace-pre-line text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
          {getCourseDescription(product, locale)}
        </p>
        <CourseFacts product={product} session={nextSession} />
        {!preview ? (
          <div className="mt-5 text-sm">
            {nextSession ? (
              <Link
                onClick={
                  preview ? (event) => event.preventDefault() : undefined
                }
                className="inline-flex items-start gap-2 text-[var(--tenant-accent-on-surface)] underline underline-offset-4"
                href={courseHref({
                  productId: getProductId(product),
                  locationReference: activeLocationReference,
                  sessionId: getCourseSessionId(nextSession),
                })}
              >
                <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {formatSession(
                  nextSession,
                  locale,
                  activeLocation?.booking?.timezone,
                )}
              </Link>
            ) : (
              <p className="text-[var(--tenant-muted-on-surface)]">
                {t("noDates")}
              </p>
            )}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={href}
            className={customerPortalPrimaryActionClass}
            onClick={preview ? (event) => event.preventDefault() : undefined}
          >
            {t(nextSession ? "chooseDate" : "details")}
          </Link>
          <GiftVoucherLink
            location={location}
            preview={preview}
            publicPage={publicPage}
          />
        </div>
      </div>
    </CustomerPortalSurface>
  );
}

function CourseQueryState({ query, emptyLabel }) {
  const t = useTranslations("CustomerCourses");
  if (query.isLoading || query.isFetching) {
    return <CustomerPortalLoadingState label={t("loading")} />;
  }
  return (
    <CustomerPortalEmptyState
      icon={AcademicCapIcon}
      title={query.isError ? t("error") : emptyLabel}
      action={
        query.isError ? (
          <button
            type="button"
            className={customerPortalSecondaryActionClass}
            onClick={query.refetch}
          >
            {t("retry")}
          </button>
        ) : undefined
      }
    />
  );
}

const useCourseCatalog = (
  activeLocationId,
  skip = false,
  publicPage = false,
) => {
  const ownerScope = useSelector(getAuthCacheIdentity);
  const tenant = useSelector(selectCurrentTenant);
  const { tenant: publicTenant } = usePublicTenant();
  const customerQuery = useGetCustomerCourseProductsQuery(
    { locationId: activeLocationId, ownerScope },
    {
      skip:
        skip ||
        publicPage ||
        !activeLocationId ||
        !ownerScope ||
        tenant?.modules?.courses === false,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const publicQuery = useGetPublicCourseProductsQuery(
    { tenantSlug: publicTenant.slug, locationId: activeLocationId },
    {
      skip: skip || !publicPage || !activeLocationId || !publicTenant.slug,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  return publicPage ? publicQuery : customerQuery;
};

export function PublicCustomerCoursesPage() {
  return (
    <PublicCapabilityGate capability="courses">
      <PublicCourseCatalog />
    </PublicCapabilityGate>
  );
}

function PublicCourseCatalog() {
  const { tenant } = usePublicTenant();
  const location = usePublicCourseLocation({
    tenantSlug: tenant.slug,
    enabled: true,
  });
  const t = useTranslations("CustomerCourses");
  if (!location.locationId) {
    return (
      <CustomerPortalPage>
        <CourseLocationSwitcher location={location} />
        <CourseQueryState
          query={location.query}
          emptyLabel={t("unavailable")}
        />
      </CustomerPortalPage>
    );
  }
  return <CourseCatalog location={location} publicPage />;
}

export default function CustomerCoursesPage({
  previewData,
  previewLocationId,
} = {}) {
  if (previewData) {
    const locations = previewData.locations || [];
    const activeLocation =
      locations.find(
        (entry) => String(entry.id || entry._id) === previewLocationId,
      ) || locations[0];
    const location = {
      locations,
      activeLocation,
      activeLocationId: String(activeLocation?.id || activeLocation?._id || ""),
      activeLocationReference:
        activeLocation?.slug ||
        String(activeLocation?.id || activeLocation?._id || ""),
      isSwitching: false,
    };
    return <CourseCatalog location={location} previewData={previewData} />;
  }
  return <LiveCourseCatalog />;
}

function LiveCourseCatalog() {
  const location = useCustomerPortalLocation();
  return <CourseCatalog location={location} />;
}

function CourseCatalog({ location, previewData, publicPage = false }) {
  const locale = useLocale();
  const t = useTranslations("CustomerCourses");
  const { tenant } = usePublicTenant();
  const preview = Boolean(previewData);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const liveQuery = useCourseCatalog(
    location.activeLocationId,
    preview,
    publicPage,
  );
  const query = preview
    ? {
        currentData: (previewData.courses || EMPTY).filter((product) => {
          const scope = product.courseContent?.locationIds;
          return (
            !Array.isArray(scope) ||
            !scope.length ||
            scope.includes(location.activeLocationId)
          );
        }),
      }
    : liveQuery;
  const products = query.currentData ?? EMPTY;
  const categories = getClassCatalogCategories(products, locale);
  const activeCategory = categories.some((item) => item.key === category)
    ? category
    : "";
  const filtered = filterClassCatalogProducts({
    products: products.map((product) => ({
      ...product,
      name: getCourseName(product, locale),
      description: getCourseDescription(product, locale),
    })),
    locale,
    searchQuery: search,
    activeCategory,
  });
  const localContent =
    tenant?.publicSite?.customerPortal?.courses?.locations?.find(
      (entry) => entry.locationId === location.activeLocationId,
    );
  const page = tenant?.publicSite?.pages?.courses;
  const headline = getLocalizedPublicTenantText(
    localContent?.headline,
    locale,
    getLocalizedPublicTenantText(page?.title, locale, t("title")),
  );
  const description = getLocalizedPublicTenantText(
    localContent?.description,
    locale,
    getLocalizedPublicTenantText(page?.description, locale, t("description")),
  );
  const heroImageUrl =
    localContent?.heroImageUrl ||
    tenant?.publicSite?.branding?.coverImageUrl ||
    "";

  return (
    <CustomerPortalPage
      data-customer-courses-page
      className="!px-0 !pt-0"
      contentClassName="!max-w-none"
    >
      <header
        className={`grid ${heroImageUrl ? "min-[900px]:grid-cols-2" : ""}`}
      >
        <div
          className="min-w-0 self-center px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16"
          data-tenant-layout="hero-copy"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tenant-accent-link)]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--tenant-heading-color)] sm:text-5xl">
            {headline}
          </h1>
          <p className="mt-5 whitespace-pre-line text-base leading-8 text-[var(--tenant-muted-text)]">
            {description}
          </p>
          <div className="mt-7">
            <CourseLocationSwitcher location={location} preview={preview} />
          </div>
        </div>
        {heroImageUrl ? (
          <div className="relative aspect-[4/3] min-w-0 min-[900px]:aspect-auto min-[900px]:min-h-[28rem] xl:min-h-[32rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}
      </header>
      <div
        className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-10"
        data-tenant-layout="page"
      >
        <section className="my-9 flex flex-col gap-4 border-y border-[var(--tenant-border)] py-5">
          <label className="flex flex-col gap-2 text-xs font-semibold sm:max-w-md">
            {t("search")}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label={t("allCategories")}>
            {[{ key: "", label: t("allCategories") }, ...categories].map(
              (item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={activeCategory === item.key}
                  onClick={() => setCategory(item.key)}
                  className={
                    activeCategory === item.key
                      ? customerPortalPrimaryActionClass
                      : customerPortalSecondaryActionClass
                  }
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        </section>
        {!query.currentData || query.isError ? (
          <CourseQueryState query={query} emptyLabel={t("noCourses")} />
        ) : filtered.length ? (
          <div className="space-y-8">
            {filtered.map((product) => (
              <CourseCatalogCard
                key={getProductId(product)}
                product={product}
                location={location}
                preview={preview}
                publicPage={publicPage}
              />
            ))}
          </div>
        ) : (
          <CustomerPortalEmptyState
            icon={AcademicCapIcon}
            title={t(products.length ? "noResults" : "noCourses")}
          />
        )}
      </div>
    </CustomerPortalPage>
  );
}

export function CustomerCourseDetailPage() {
  const params = useParams();
  const { activeLocationId } = useCustomerPortalLocation();
  const productId = String(params?.productId || "");
  // Remount selection state when the shared studio changes.
  return (
    <CourseDetail
      key={`${activeLocationId}:${productId}`}
      productId={productId}
    />
  );
}

function CourseDetail({ productId }) {
  const t = useTranslations("CustomerCourses");
  const locale = useLocale();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const { tenant } = usePublicTenant();
  const sessionTenant = useSelector(selectCurrentTenant);
  const ownerScope = useSelector(getAuthCacheIdentity);
  const cart = useSelector(selectCurrentCart);
  const location = useCustomerPortalLocation();
  const query = useCourseCatalog(location.activeLocationId);
  const product = query.currentData?.find(
    (item) => getProductId(item) === productId,
  );
  const sessionsQuery = useGetCustomerCourseSessionsQuery(
    { productId, locationId: location.activeLocationId, ownerScope },
    {
      skip: !product || !location.activeLocationId || !ownerScope,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const sessions = getUpcomingLocationSessions(
    sessionsQuery.currentData,
    location.activeLocationId,
  );
  const [selectedId, setSelectedId] = useState(
    searchParams?.get("courseSessionId") || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const selected = sessions.find(
    (session) => getCourseSessionId(session) === selectedId,
  );
  const alreadyInCart = (cart || []).some(
    (item) => item.bookingCourse === selectedId,
  );
  const commerceEnabled =
    sessionTenant?.modules?.courses !== false &&
    sessionTenant?.modules?.payments !== false;
  const backHref = retainCustomerPortalLocation(
    "/portal/courses",
    location.activeLocationReference,
  );
  const add = (event) => {
    event.preventDefault();
    if (!commerceEnabled || alreadyInCart) return;
    const cartItem = buildCustomerCourseCartItem({
      product,
      session: selected,
      locationId: location.activeLocationId,
      location: location.activeLocation,
      quantity,
      locale,
    });
    if (!cartItem) {
      setError(t("selectDate"));
      return;
    }
    dispatch(addToCart({ cartItem }));
    setAdded(true);
    setError("");
    dispatch(openCart({ checkoutKind: "bookings" }));
  };

  return (
    <CustomerPortalPage data-customer-course-detail>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <Link href={backHref} className={customerPortalSecondaryActionClass}>
          <ArrowLeftIcon className="h-4 w-4" />
          {t("back")}
        </Link>
        <CourseLocationSwitcher location={location} />
      </div>
      {!product || query.isError ? (
        <CourseQueryState query={query} emptyLabel={t("unavailable")} />
      ) : (
        <>
          <CustomerPortalSurface
            className={`grid !rounded-none ${getCourseImageUrls(product).length ? "min-[900px]:grid-cols-2" : ""}`}
          >
            <CourseProductGallery product={product} large />
            <div className="min-w-0 p-5 sm:p-7 xl:p-10">
              <p className="text-xs font-semibold text-[var(--tenant-accent-on-surface)]">
                {product.classCategory}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--tenant-heading-on-surface)] xl:text-4xl">
                {getCourseName(product, locale)}
              </h1>
              <p className="mb-7 mt-5 whitespace-pre-line text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
                {getCourseDescription(product, locale)}
              </p>
              <CourseFacts
                product={product}
                session={selected || sessions[0]}
              />
              <GiftVoucherLink location={location} className="mt-6" />
            </div>
          </CustomerPortalSurface>
          {getCourseDetails(product, locale) ? (
            <CustomerPortalSurface className="mt-8 p-5 sm:p-8">
              <h2 className="text-2xl font-semibold text-[var(--tenant-heading-on-surface)]">
                {t("details")}
              </h2>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--tenant-muted-on-surface)]">
                {getCourseDetails(product, locale)}
              </p>
            </CustomerPortalSurface>
          ) : null}
          <CustomerPortalSurface className="mt-8 p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-[var(--tenant-heading-on-surface)]">
              {t("upcomingDates")}
            </h2>
            {!sessionsQuery.currentData || sessionsQuery.isError ? (
              <CourseQueryState
                query={sessionsQuery}
                emptyLabel={t("noDates")}
              />
            ) : !sessions.length ? (
              <p className="mt-5 text-[var(--tenant-muted-on-surface)]">
                {t("noDates")}
              </p>
            ) : (
              <form
                onSubmit={add}
                data-ui-unstyled="true"
                className="mt-6 space-y-5"
              >
                <fieldset className="grid gap-3 md:grid-cols-2">
                  <legend className="sr-only">{t("chooseDate")}</legend>
                  {sessions.map((session) => {
                    const id = getCourseSessionId(session);
                    const available = isCourseSessionBookable(session);
                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-[var(--tenant-text)]"
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="radio"
                            name="course-session"
                            checked={selectedId === id}
                            value={id}
                            disabled={!available || !commerceEnabled}
                            onChange={() => {
                              setSelectedId(id);
                              setQuantity(1);
                              setAdded(false);
                              setError("");
                            }}
                            className="mt-1 accent-[var(--tenant-portal-button)]"
                          />
                          <span>
                            <span className="block text-sm font-semibold">
                              {formatSession(
                                session,
                                locale,
                                location.activeLocation?.booking?.timezone,
                              )}
                            </span>
                            <span className="mt-2 block text-xs text-[var(--tenant-muted-text)]">
                              {available
                                ? t("placesLeft", {
                                    count: session.remainingCapacity,
                                  })
                                : t("full")}
                              {session.language
                                ? ` · ${session.language.toUpperCase()}`
                                : ""}
                            </span>
                          </span>
                        </label>
                        {!available ? (
                          <div
                            style={{
                              "--tenant-accent": "var(--tenant-portal-button)",
                              "--tenant-accent-foreground":
                                "var(--tenant-portal-button-foreground)",
                            }}
                          >
                            <CourseWaitlistAction
                              session={session}
                              tenantSlug={tenant.slug}
                              returnPath={getCustomerCourseHref({
                                productId,
                                locationReference:
                                  location.activeLocationReference,
                                sessionId: id,
                              })}
                              enabled={commerceEnabled}
                              onBookingAvailable={() => sessionsQuery.refetch()}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </fieldset>
                {!commerceEnabled ? (
                  <p role="note">{t("checkoutPaused")}</p>
                ) : null}
                {isCourseSessionBookable(selected) ? (
                  <label className="flex max-w-xs flex-col gap-2 text-sm">
                    {t("people")}
                    <select
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Number(event.target.value))
                      }
                      className={fieldClass}
                    >
                      {Array.from(
                        { length: Math.min(selected.remainingCapacity, 100) },
                        (_, index) => index + 1,
                      ).map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {error ? <p role="alert">{error}</p> : null}
                {added && alreadyInCart ? (
                  <p role="status">{t("added")}</p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className={customerPortalPrimaryActionClass}
                    disabled={
                      !commerceEnabled ||
                      !isCourseSessionBookable(selected) ||
                      alreadyInCart
                    }
                  >
                    <ShoppingBagIcon className="h-4 w-4" />
                    {t(alreadyInCart ? "inCart" : "addToCart")}
                  </button>
                  {alreadyInCart ? (
                    <button
                      type="button"
                      className={customerPortalSecondaryActionClass}
                      onClick={() =>
                        dispatch(openCart({ checkoutKind: "bookings" }))
                      }
                    >
                      {t("viewCart")}
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </CustomerPortalSurface>
        </>
      )}
    </CustomerPortalPage>
  );
}
