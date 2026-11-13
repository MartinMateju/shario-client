"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import StudioCalendar from "@/components/calendar/StudioCalendar";
import { eventTones } from "@/components/calendar/calendar.config";
import StudioSwitcher from "@/components/menu/StudioSwitcher";
import { formatProductPrice } from "@/components/products/products.utils";
import { useGetPublicBookingOccupancyQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";
import { useGetPublicBookingLocationsQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";
import { useGetPublicProductsQuery } from "@/lib/features/products/productsApiSlice";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import {
  findPortalLocationByReference,
  getPortalLocationReference,
  normalizePortalLocationReference,
} from "@/utils/customerPortalLocation";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import { getConfiguredOpeningInterval } from "@/utils/openingHours";

import PublicCapabilityGate from "./PublicCapabilityGate";
import { usePublicTenant } from "./PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "./publicTenant.config";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { isPublicCatalogProduct } from "./publicProductTaxonomy";

const PUBLIC_CALENDAR_VIEWS = Object.freeze(["month", "week", "day"]);
const PUBLIC_CALENDAR_FALLBACK_TIME_ZONE = "Europe/Prague";

const getId = (value) => String(value?.id ?? value?._id ?? "").trim();

export const getPublicCalendarTimeZone = (value) => {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate) return PUBLIC_CALENDAR_FALLBACK_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return PUBLIC_CALENDAR_FALLBACK_TIME_ZONE;
  }
};

export const dateKeyInTimeZone = (value, timeZone) => {
  let date;

  try {
    date = value instanceof Date ? value : new Date(value);
  } catch {
    return "";
  }

  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getPublicCalendarTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
};

const addDaysToDateKey = (value, amount) => {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));

  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
};

export const getPublicCalendarRange = ({ date, view, timeZone }) => {
  const selectedKey = dateKeyInTimeZone(date, timeZone);

  if (!selectedKey || view === "day") {
    return { from: selectedKey, to: selectedKey };
  }

  const [year, month, day] = selectedKey.split("-").map(Number);

  if (view === "month") {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12));
    const mondayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
    const from = addDaysToDateKey(
      `${year}-${String(month).padStart(2, "0")}-01`,
      -mondayOffset,
    );

    return { from, to: addDaysToDateKey(from, 41) };
  }

  const selected = new Date(Date.UTC(year, month - 1, day, 12));
  const mondayOffset = (selected.getUTCDay() + 6) % 7;
  const from = addDaysToDateKey(selectedKey, -mondayOffset);

  return { from, to: addDaysToDateKey(from, 6) };
};

export const getPublicCalendarOccupancyRange = (range, location) => {
  const hasOvernightHours = Object.values(location?.openingHours || {}).some(
    (hours) => (getConfiguredOpeningInterval(hours)?.closeMinutes || 0) > 1440,
  );
  // Occupancy at the start of the following day can block a late visible-day
  // booking. Keep the rendered civil-date range unchanged.
  return hasOvernightHours && range.to
    ? { ...range, to: addDaysToDateKey(range.to, 1) }
    : range;
};

export const resolvePublicBookingLocation = (locations, rawReference) => {
  const availableLocations = (Array.isArray(locations) ? locations : []).filter(
    (location) =>
      getId(location) &&
      location?.isActive !== false &&
      location?.booking?.enabled !== false,
  );
  const raw = String(rawReference ?? "").trim();
  const reference = normalizePortalLocationReference(raw);

  if (raw) {
    const location = reference
      ? findPortalLocationByReference(availableLocations, reference)
      : null;

    return {
      availableLocations,
      location,
      invalid: !location,
      requestedReference: reference,
    };
  }

  return {
    availableLocations,
    location:
      availableLocations.find((location) => location?.isPrimary === true) ||
      availableLocations[0] ||
      null,
    invalid: false,
    requestedReference: "",
  };
};

export const getPublicBookingRate = (products, locale) => {
  const priced = (Array.isArray(products) ? products : [])
    .filter((product) => isPublicCatalogProduct(product, "book"))
    .filter((product) => Number.isFinite(Number(product?.price)))
    .sort((left, right) => {
      const priceDifference = Number(left.price) - Number(right.price);
      return priceDifference || getId(left).localeCompare(getId(right));
    });
  const product = priced[0] || null;

  return product
    ? {
        // The booking-intent quote treats product.price as one 30-minute
        // billing block for one guest, then multiplies by duration and party.
        formatted: formatProductPrice(product, locale),
        from: priced.length > 1,
        product,
      }
    : null;
};

export const mapPublicOccupancyBlocks = ({ blocks, locationId, title }) =>
  (Array.isArray(blocks) ? blocks : []).map((block, index) => ({
    id: `public-occupancy-${locationId}-${block.start}-${block.end}-${index}`,
    locationId,
    start: block.start,
    end: block.end,
    tag: "block",
    kind: "privateStudio",
    title,
    privacySafe: true,
  }));

function LoadingPanel({ label }) {
  return (
    <div
      className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] text-sm text-[color:var(--tenant-muted-on-surface)] sm:min-h-[520px]"
      data-tenant-surface="card"
      role="status"
    >
      <ArrowPathIcon
        className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export default function PublicBookingAvailabilityPage({ previewData }) {
  const customerDefaults = useLegacyCopy("customerDefaults");
  const locale = useLocale();
  const t = useTranslations("PublicTenant.book");
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = usePublicTenant();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const capabilityEnabled = tenant.publicCapabilities.bookStudio === true;
  const previewMode = previewData && typeof previewData === "object";
  const [view, setView] = useState("week");
  const [pageScroll, setPageScroll] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const queryString = searchParams.toString();
  const rawLocationReference =
    searchParams.get("location") || searchParams.get("locationId") || "";
  const fetchedLocationsQuery = useGetPublicBookingLocationsQuery(
    { tenantSlug },
    { skip: previewMode || !tenantSlug || !capabilityEnabled },
  );
  const locationsQuery = previewMode
    ? {
        data: Array.isArray(previewData.locations) ? previewData.locations : [],
        isLoading: false,
        isFetching: false,
        isError: false,
        isSuccess: true,
        refetch: () => undefined,
      }
    : fetchedLocationsQuery;
  const selection = useMemo(
    () =>
      resolvePublicBookingLocation(locationsQuery.data, rawLocationReference),
    [locationsQuery.data, rawLocationReference],
  );
  const activeLocation = selection.location;
  const activeLocationId = getId(activeLocation);
  const fetchedProductsQuery = useGetPublicProductsQuery(
    { tenantSlug, locationId: activeLocationId },
    {
      skip:
        previewMode || !tenantSlug || !capabilityEnabled || !activeLocationId,
    },
  );
  const productsQuery = previewMode
    ? {
        data: Array.isArray(previewData.products) ? previewData.products : [],
        isLoading: false,
      }
    : fetchedProductsQuery;
  const timeZone = getPublicCalendarTimeZone(
    activeLocation?.booking?.timezone ||
      activeLocation?.booking?.timeZone ||
      activeLocation?.timeZone,
  );
  const calendarLocation = useMemo(
    () =>
      activeLocation
        ? {
            ...activeLocation,
            timeZone,
            booking: {
              ...activeLocation.booking,
              timeZone,
              timezone: timeZone,
            },
          }
        : null,
    [activeLocation, timeZone],
  );
  const range = useMemo(
    () =>
      getPublicCalendarRange({
        date: calendarDate,
        view,
        timeZone,
      }),
    [calendarDate, timeZone, view],
  );
  const occupancyRange = useMemo(
    () => getPublicCalendarOccupancyRange(range, activeLocation),
    [range, activeLocation],
  );
  const fetchedOccupancyQuery = useGetPublicBookingOccupancyQuery(
    {
      tenantSlug,
      locationId: activeLocationId,
      from: occupancyRange.from,
      to: occupancyRange.to,
    },
    {
      skip:
        previewMode ||
        !tenantSlug ||
        !capabilityEnabled ||
        !activeLocationId ||
        selection.invalid ||
        !range.from ||
        !range.to,
      pollingInterval: 120_000,
      refetchOnFocus: true,
      skipPollingIfUnfocused: true,
    },
  );
  const occupancyQuery = previewMode
    ? {
        currentData: {
          location: { id: activeLocationId },
          from: occupancyRange.from,
          to: occupancyRange.to,
          blocks: [],
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: () => undefined,
      }
    : fetchedOccupancyQuery;
  const occupancyMatchesQuery =
    getId(occupancyQuery.currentData?.location) === activeLocationId &&
    occupancyQuery.currentData?.from === occupancyRange.from &&
    occupancyQuery.currentData?.to === occupancyRange.to;
  const occupancyBlocks = useMemo(
    () =>
      occupancyMatchesQuery ? occupancyQuery.currentData?.blocks || [] : [],
    [occupancyMatchesQuery, occupancyQuery.currentData?.blocks],
  );
  const events = useMemo(
    () =>
      mapPublicOccupancyBlocks({
        blocks: occupancyBlocks,
        locationId: activeLocationId,
        title: t("calendar.occupied"),
      }),
    [activeLocationId, occupancyBlocks, t],
  );
  const rate = useMemo(
    () =>
      getPublicBookingRate(
        (productsQuery.data || []).filter((product) =>
          isProductAvailableAtLocation(product, activeLocationId),
        ),
        locale,
      ),
    [activeLocationId, locale, productsQuery.data],
  );
  const tenantTheme = getPublicTenantTheme(tenant);
  const page = tenant.publicSite.pages.book;
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    localizedDefaults: customerDefaults,
    page: "book",
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // Short screens such as phones in landscape cannot fit the 520px framed
    // calendar either, and its nested scroller would trap every swipe.
    const mobile = window.matchMedia("(max-width: 639px), (max-height: 600px)");
    const applyResponsiveCalendarMode = () => {
      setPageScroll(mobile.matches);
    };
    const frame = window.requestAnimationFrame(applyResponsiveCalendarMode);

    mobile.addEventListener?.("change", applyResponsiveCalendarMode);

    return () => {
      window.cancelAnimationFrame(frame);
      mobile.removeEventListener?.("change", applyResponsiveCalendarMode);
    };
  }, []);

  useEffect(() => {
    if (
      previewMode ||
      !activeLocation ||
      selection.invalid ||
      !locationsQuery.isSuccess ||
      !pathname
    ) {
      return;
    }

    const canonicalReference = getPortalLocationReference(activeLocation);
    const requestedReference =
      normalizePortalLocationReference(rawLocationReference);
    const hasLegacyReference = searchParams.has("locationId");

    if (
      !canonicalReference ||
      (canonicalReference === requestedReference && !hasLegacyReference)
    ) {
      return;
    }

    const next = new URLSearchParams(queryString);
    next.delete("locationId");
    next.set("location", canonicalReference);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [
    activeLocation,
    locationsQuery.isSuccess,
    pathname,
    queryString,
    rawLocationReference,
    router,
    searchParams,
    selection.invalid,
    previewMode,
  ]);

  const handleLocationChange = (locationId) => {
    if (previewMode) return;
    const nextLocation = selection.availableLocations.find(
      (location) => getId(location) === String(locationId),
    );
    const reference = getPortalLocationReference(nextLocation);

    if (!reference || !pathname) return;

    const next = new URLSearchParams(queryString);
    next.delete("locationId");
    next.set("location", reference);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const chooseLocation = (location) => {
    handleLocationChange(getId(location));
  };

  return (
    <PublicCapabilityGate capability="bookStudio">
      <main
        data-public-booking-availability
        data-tenant-layout="section"
        className="min-h-[70vh] px-5 py-10 sm:px-8 lg:px-12 lg:py-14"
        style={{
          backgroundColor: tenantTheme.backgroundColor,
          color: tenantTheme.textForeground,
        }}
      >
        <div className="mx-auto max-w-[1540px]">
          <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)] lg:gap-12">
            <div className="max-w-3xl">
              <p
                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--tenant-label-color)]"
                data-tenant-type="eyebrow"
              >
                <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                {t("eyebrow")}
              </p>
              <h1
                className="mt-4 max-w-[15ch] text-balance font-serif text-4xl font-normal leading-[1] tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl"
                data-tenant-type="display"
                data-public-site-edit-path={`pages.book.title.${locale}`}
              >
                {title}
              </h1>
              <p
                className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--tenant-text-muted)] sm:text-lg"
                data-public-site-edit-path={`pages.book.description.${locale}`}
              >
                {description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div
                className="rounded-[22px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] p-2 text-[color:var(--tenant-text-on-surface)] shadow-[0_16px_45px_rgba(17,17,15,0.05)]"
                data-tenant-surface="card"
              >
                <p
                  className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tenant-accent-on-surface)]"
                  data-tenant-type="eyebrow"
                >
                  {t("studioLabel")}
                </p>
                {selection.invalid ? (
                  <div
                    data-public-location-unselected="true"
                    className="flex min-h-[64px] items-center gap-3 rounded-[18px] border border-dashed border-[color:var(--tenant-border)] px-3.5 py-2.5 text-sm font-semibold text-[color:var(--tenant-muted-on-surface)]"
                    role="status"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_10%,transparent)] text-[color:var(--tenant-accent-on-surface)]">
                      <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {t("studioRequired")}
                  </div>
                ) : (
                  <StudioSwitcher
                    locations={selection.availableLocations}
                    activeLocationId={activeLocationId}
                    onChange={handleLocationChange}
                    locale={locale}
                    isLoading={locationsQuery.isLoading}
                    logoUrl={tenant.publicSite.branding.logoUrl}
                  />
                )}
              </div>

              <div
                className="flex min-w-[190px] flex-col justify-center rounded-[22px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-5 py-4 text-[color:var(--tenant-text-on-surface)] shadow-[0_16px_45px_rgba(17,17,15,0.05)]"
                data-tenant-surface="card"
              >
                <p
                  className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tenant-accent-on-surface)]"
                  data-tenant-type="eyebrow"
                >
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  {rate?.from ? t("priceFrom") : t("priceLabel")}
                </p>
                {productsQuery.isLoading ? (
                  <span className="mt-2 h-7 w-28 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] motion-reduce:animate-none" />
                ) : rate ? (
                  <p className="mt-1 text-xl font-semibold tracking-[-0.035em]">
                    {rate.formatted}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold">
                    {t("priceUnavailable")}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] leading-5 text-[color:var(--tenant-muted-on-surface)]">
                  {t("priceUnit")}
                </p>
              </div>
            </div>
          </header>

          <section
            className="mt-8 overflow-clip rounded-[28px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] text-[color:var(--tenant-text-on-surface)] shadow-[0_22px_65px_rgba(17,17,15,0.07)]"
            aria-labelledby="public-studio-calendar-title"
            data-tenant-surface="panel"
          >
            <div className="flex flex-col gap-4 border-b border-[color:var(--tenant-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="public-studio-calendar-title"
                    className="font-serif text-2xl font-normal tracking-[-0.04em] sm:text-3xl"
                    data-tenant-type="display"
                  >
                    {t("calendar.title")}
                  </h2>
                  <span className="inline-flex min-h-7 items-center rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_10%,transparent)] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--tenant-accent-on-surface)]">
                    {t("calendar.readOnly")}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                  {t("calendar.description")}
                </p>
              </div>

              <ul
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[color:var(--tenant-muted-on-surface)]"
                aria-label={t("calendar.legend")}
              >
                <li className="inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-[3px] ${eventTones.neutral.dot}`}
                    aria-hidden="true"
                  />
                  {t("calendar.occupied")}
                </li>
              </ul>
            </div>

            <div className="p-3 sm:p-4">
              {locationsQuery.isLoading ? (
                <LoadingPanel label={t("calendar.loadingStudios")} />
              ) : locationsQuery.isError ? (
                <div
                  className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] px-6 text-center sm:min-h-[520px]"
                  role="alert"
                >
                  <ExclamationTriangleIcon
                    className="h-7 w-7 text-[color:var(--tenant-accent-on-surface)]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold">
                    {t("calendar.locationError")}
                  </p>
                  <button
                    type="button"
                    onClick={locationsQuery.refetch}
                    data-tenant-button="secondary"
                    className="mt-5 min-h-11 rounded-full border border-[color:var(--tenant-border)] px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : selection.availableLocations.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] px-6 text-center sm:min-h-[520px]">
                  <MapPinIcon
                    className="h-7 w-7 text-[color:var(--tenant-accent-on-surface)]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold">
                    {t("calendar.noLocations")}
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                    {t("calendar.noLocationsDescription")}
                  </p>
                </div>
              ) : selection.invalid ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] px-6 text-center sm:min-h-[520px]">
                  <ExclamationTriangleIcon
                    className="h-7 w-7 text-[color:var(--tenant-accent-on-surface)]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold">
                    {t("calendar.invalidLocation")}
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                    {t("calendar.invalidLocationDescription")}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {selection.availableLocations.map((location) => (
                      <button
                        key={getId(location)}
                        type="button"
                        onClick={() => chooseLocation(location)}
                        data-tenant-button="secondary"
                        className="min-h-11 rounded-full border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : occupancyQuery.isError ? (
                <div
                  className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--tenant-border)] px-6 text-center sm:min-h-[520px]"
                  role="alert"
                >
                  <ExclamationTriangleIcon
                    className="h-7 w-7 text-[color:var(--tenant-accent-on-surface)]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold">{t("calendar.error")}</p>
                  <button
                    type="button"
                    onClick={occupancyQuery.refetch}
                    data-tenant-button="secondary"
                    className="mt-5 min-h-11 rounded-full border border-[color:var(--tenant-border)] px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : occupancyQuery.isLoading ||
                occupancyQuery.isFetching ||
                !occupancyMatchesQuery ? (
                <LoadingPanel label={t("calendar.loading")} />
              ) : (
                <>
                  <div
                    className="mb-3 flex min-h-11 items-center gap-2 rounded-[14px] bg-[color:var(--tenant-background)] px-4 text-xs text-[color:var(--tenant-muted-text)]"
                    role="status"
                  >
                    <InformationCircleIcon
                      className="h-4 w-4 shrink-0 text-[color:var(--tenant-accent-link)]"
                      aria-hidden="true"
                    />
                    {events.length
                      ? t("calendar.occupiedSummary", {
                          count: events.length,
                        })
                      : t("calendar.empty")}
                  </div>
                  <div
                    data-public-calendar-frame="true"
                    data-public-calendar-page-scroll={
                      pageScroll ? "true" : "false"
                    }
                    data-tenant-surface="media"
                    className={`min-w-0 rounded-[20px] border border-[color:var(--tenant-border)] ${pageScroll ? "h-auto overflow-visible" : "h-[clamp(520px,68dvh,820px)] overflow-hidden"}`}
                  >
                    <StudioCalendar
                      location={calendarLocation}
                      selectedLocationId={activeLocationId}
                      bookings={events}
                      audience="public"
                      view={view}
                      onViewChange={setView}
                      date={calendarDate}
                      onDateChange={setCalendarDate}
                      availableViews={PUBLIC_CALENDAR_VIEWS}
                      pageScroll={pageScroll}
                      readOnly
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </PublicCapabilityGate>
  );
}
