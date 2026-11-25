import { cache } from "react";

import { isPublicCatalogProduct } from "@/components/public-tenant/publicProductTaxonomy";
import { normalizeProductResponse } from "@/lib/features/products/products.contract.mjs";
import { normalizePublicCoursePage } from "@/lib/features/products/publicCoursePage";
import {
  fetchPublicCatalogData,
  fetchPublicCatalogResponse,
} from "@/lib/publicTenant/catalogRead.server";
import {
  findPortalLocationByReference,
  getPortalLocationReferenceFromSearchParams,
} from "@/utils/customerPortalLocation";

const TIMEOUT_MS = 5_000;
const INITIAL_COURSE_LIMIT = 100;

// Use only the anonymous public DTO endpoints: never forward session cookies,
// authorization headers, or a URL supplied in the request.
async function fetchPublicCourseData(tenantSlug, suffix, signal) {
  return fetchPublicCatalogData(tenantSlug, `products/${suffix}`, signal);
}

export function getPublicCourseLocationRequest(searchParams = {}) {
  const params = new URLSearchParams();
  for (const key of ["location", "locationId"]) {
    const value = searchParams[key];
    if (value !== undefined)
      params.set(key, Array.isArray(value) ? value[0] || "" : value);
  }
  // null means no location was requested; an invalid/empty explicit reference
  // must not silently select another studio.
  return params.has("location") || params.has("locationId")
    ? getPortalLocationReferenceFromSearchParams(params)
    : null;
}

export const getPublicCourseProduct = cache(
  async (tenantSlug, productId, locationId = "") => {
    try {
      const params = new URLSearchParams(locationId ? { locationId } : {});
      const result = await fetchPublicCourseData(
        tenantSlug,
        `${encodeURIComponent(productId)}${params.size ? `?${params}` : ""}`,
        AbortSignal.timeout(TIMEOUT_MS),
      );
      if (result.notFound) return { notFound: true, product: null };
      const product = normalizeProductResponse(result.data);
      if (
        product?.id !== productId ||
        !isPublicCatalogProduct(product, "courses")
      ) {
        return { notFound: true, product: null };
      }
      return { product, notFound: false };
    } catch {
      return { product: null, notFound: false, unavailable: true };
    }
  },
);

function normalizeLocations(source) {
  return source
    .filter(
      (location) =>
        location?.isActive !== false && (location?.id || location?._id),
    )
    .map((location) => ({
      ...location,
      id: String(location.id || location._id),
    }));
}

async function getCourseOverview(tenantSlug, requestedReference, signal) {
  const params = new URLSearchParams();
  if (requestedReference !== null) params.set("location", requestedReference);
  const response = await fetchPublicCatalogResponse(
    tenantSlug,
    `products/courses/overview${params.size ? `?${params}` : ""}`,
    signal,
  );
  if (!response.ok) {
    const budget = response.headers.get("x-shario-public-lookup-budget");
    if (budget === "lookup" && response.status === 401) {
      // Older servers pass unmatched public routes through the generic lookup
      // limiter and then verifyJWT. A registered course route uses "catalogue".
      const error = await response.json();
      if (
        error.code === "UNAUTHORIZED" &&
        error.message === "Missing access token."
      )
        return undefined;
    }
    if (budget !== "catalogue" && response.status === 404) {
      const error = await response.json().catch(() => null);
      if (!error?.code || error.code === "ROUTE_NOT_FOUND") return undefined;
    }
    return null;
  }
  const data = await response.json();
  if (!Array.isArray(data?.locations) || !Array.isArray(data.products))
    return null;

  const locations = normalizeLocations(data.locations);
  const selected =
    requestedReference === null
      ? locations.find((location) => location.isPrimary) || locations[0]
      : findPortalLocationByReference(locations, requestedReference);
  const locationId = selected?.id || "";
  if (locationId !== data.locationId) return null;
  const initial = { tenantSlug, locations, locationId, fetchedAt: Date.now() };
  if (!locationId) return initial;
  return withFirstPage(initial, data.products);
}

function withFirstPage(initial, data) {
  const page = normalizePublicCoursePage(data);
  return {
    ...initial,
    products: page.products.slice(0, INITIAL_COURSE_LIMIT),
    catalogPage: { hasMore: page.hasMore, sourceIds: page.sourceIds },
  };
}

export const getPublicCourseInitialData = cache(
  async (tenantSlug, requestedReference = null, productId = "") => {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      if (!productId) {
        const overview = await getCourseOverview(
          tenantSlug,
          requestedReference,
          signal,
        );
        if (overview !== undefined) return overview;
      }
      const result = await fetchPublicCourseData(
        tenantSlug,
        "courses/locations",
        signal,
      );
      if (result.notFound) return null;
      const source =
        result.data?.locations ?? result.data?.data?.locations ?? result.data;
      if (!Array.isArray(source)) return null;
      const locations = normalizeLocations(source);
      let defaultLocations = locations;
      if (productId && requestedReference === null) {
        // A canonical course URL has no location query. Pick a studio where
        // this course is published rather than an unrelated primary studio.
        const detail = await getPublicCourseProduct(tenantSlug, productId);
        const scope = detail.product?.courseContent?.locationIds;
        if (Array.isArray(scope) && scope.length) {
          const publishedIds = new Set(scope.map(String));
          defaultLocations = locations.filter((entry) =>
            publishedIds.has(entry.id),
          );
        }
      }
      const location =
        requestedReference !== null
          ? findPortalLocationByReference(locations, requestedReference)
          : defaultLocations.find((entry) => entry.isPrimary) ||
            defaultLocations[0];
      const locationId = location?.id || "";
      const initial = {
        tenantSlug,
        locations,
        locationId,
        fetchedAt: Date.now(),
      };
      if (!locationId) return initial;

      const params = new URLSearchParams({ locationId });
      if (!productId) {
        params.set("page", "1");
        params.set("limit", String(INITIAL_COURSE_LIMIT));
        const catalog = await fetchPublicCourseData(
          tenantSlug,
          `courses?${params}`,
          signal,
        );
        if (catalog.notFound) return initial;
        return withFirstPage(initial, catalog.data);
      }
      const detail = await fetchPublicCourseData(
        tenantSlug,
        `${encodeURIComponent(productId)}?${params}`,
        signal,
      );
      const product = detail.notFound
        ? null
        : normalizeProductResponse(detail.data);
      return {
        ...initial,
        product:
          product?.id === productId &&
          isPublicCatalogProduct(product, "courses")
            ? product
            : null,
      };
    } catch {
      // A transient API outage keeps the existing client retry experience usable.
      return null;
    }
  },
);
