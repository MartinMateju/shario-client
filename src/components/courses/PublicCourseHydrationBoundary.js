"use client";

import PublicQueryHydration, {
  usePublicHydrationSnapshot,
} from "@/components/public-tenant/PublicQueryHydration";

import { productsApiSlice } from "@/lib/features/products/productsApiSlice";
import {
  publicBookingApiSlice,
  normalizePublicLocations,
} from "@/lib/features/publicBooking/publicBookingApiSlice";
import { isFreshPublicCourseSnapshot } from "@/lib/publicTenant/courseHydration";

export const usePublicCourseHydration = () =>
  Boolean(usePublicHydrationSnapshot());

export function seedPublicCourseCache(store, initialData) {
  if (!isFreshPublicCourseSnapshot(initialData)) return;
  const {
    tenantSlug,
    locationId,
    locations,
    products,
    catalogPage,
    product,
    fetchedAt,
  } = initialData;
  const candidates = [];
  if (Array.isArray(locations)) {
    candidates.push({
      endpointName: "getPublicCourseLocations",
      arg: { tenantSlug },
      value: normalizePublicLocations(locations),
    });
  }
  if (locationId && Array.isArray(products) && catalogPage) {
    candidates.push({
      endpointName: "getPublicCourseProducts",
      arg: { tenantSlug, locationId },
      value: { pages: [{ ...catalogPage, products }], pageParams: [1] },
    });
  }
  if (locationId && product?.id) {
    candidates.push({
      endpointName: "getPublicProduct",
      arg: { tenantSlug, productId: product.id, locationId },
      value: product,
    });
  }
  const entries = candidates.filter(({ endpointName, arg }) => {
    const api =
      endpointName === "getPublicCourseLocations"
        ? publicBookingApiSlice
        : productsApiSlice;
    const cached = api.endpoints[endpointName].select(arg)(store.getState());
    // A route payload can arrive after a client refresh or an in-flight read.
    // Never replace those results with the older server snapshot.
    return (
      cached.status !== "pending" && !(cached.fulfilledTimeStamp >= fetchedAt)
    );
  });
  if (entries.length)
    store.dispatch(productsApiSlice.util.upsertQueryEntries(entries));
}

export default function PublicCourseHydrationBoundary({
  initialData,
  children,
}) {
  return (
    <PublicQueryHydration
      initialData={initialData}
      seed={seedPublicCourseCache}
    >
      {children}
    </PublicQueryHydration>
  );
}
