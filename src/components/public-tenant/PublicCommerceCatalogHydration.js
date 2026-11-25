"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { membershipsApiSlice } from "@/lib/features/memberships/membershipsApiSlice";
import { couponsApiSlice } from "@/lib/features/coupons/couponsApiSlice";
import { isFreshPublicCourseSnapshot } from "@/lib/publicTenant/courseHydration";
import PublicQueryHydration from "./PublicQueryHydration";

const catalogs = {
  memberships: {
    api: membershipsApiSlice,
    endpointName: "getPublicMembershipCatalog",
  },
  vouchers: { api: couponsApiSlice, endpointName: "getCoupons" },
};

function selectSnapshotEligibility(snapshot) {
  if (!snapshot) return () => false;
  const { api, endpointName } = catalogs[snapshot.kind];
  const selectEntry = api.endpoints[endpointName].select({
    tenantSlug: snapshot.tenantSlug,
  });
  return (state) => {
    const cached = selectEntry(state);
    // A prefetched route can outlive a browser refresh that withdrew the offer.
    return (
      cached.status !== "pending" &&
      cached.status !== "rejected" &&
      !(cached.fulfilledTimeStamp >= snapshot.fetchedAt)
    );
  };
}

export function seedPublicCommerceCatalog(store, snapshot) {
  if (
    !isFreshPublicCourseSnapshot(snapshot) ||
    !selectSnapshotEligibility(snapshot)(store.getState())
  )
    return;
  const { tenantSlug, kind, data } = snapshot;
  const { api, endpointName } = catalogs[kind];
  const arg = { tenantSlug };
  store.dispatch(
    api.util.upsertQueryEntries([{ endpointName, arg, value: data }]),
  );
}

export default function PublicCommerceCatalogHydration({
  initialData,
  children,
}) {
  const selectEligible = useMemo(
    () => selectSnapshotEligibility(initialData),
    [initialData],
  );
  const eligible = useSelector(selectEligible);
  return (
    <PublicQueryHydration
      initialData={eligible ? initialData : null}
      seed={seedPublicCommerceCatalog}
    >
      {children}
    </PublicQueryHydration>
  );
}
