"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "react-redux";
import { isTransientCatalogError } from "@/lib/publicTenant/catalogRefresh";

// RTK keeps data from the previous argument while fetching. Only display rows for this tenant.
export const selectCurrentCatalog = (query) => ({
  ...query,
  data: query.currentData,
  isLoading: query.isLoading || (query.isFetching && query.currentData == null),
  isRefreshError:
    query.currentData != null &&
    query.isError &&
    isTransientCatalogError(query.error),
});

const Snapshot = createContext(null);
export const usePublicHydrationSnapshot = () => useContext(Snapshot);

export function usePublicCatalogSnapshot(tenantSlug, kind) {
  const snapshot = usePublicHydrationSnapshot();
  return snapshot?.tenantSlug === tenantSlug && snapshot.kind === kind
    ? snapshot
    : null;
}

export default function PublicQueryHydration({ initialData, seed, children }) {
  const store = useStore();
  const [applied, setApplied] = useState(null);
  useEffect(() => {
    if (initialData && applied !== initialData) {
      seed(store, initialData);
      // Subscribe children after the synchronous RTK update so hydration never
      // duplicates an anonymous request that the server has just completed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApplied(initialData);
    }
  }, [store, initialData, applied, seed]);
  return (
    <Snapshot.Provider value={applied === initialData ? null : initialData}>
      {children}
    </Snapshot.Provider>
  );
}
