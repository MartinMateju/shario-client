"use client";

import { createContext, useContext } from "react";
import { Link as LocalizedLink } from "./localizedRoutes";

const PrefetchDisabledContext = createContext(false);

export function DisableLinkPrefetch({ children }) {
  return (
    <PrefetchDisabledContext.Provider value>
      {children}
    </PrefetchDisabledContext.Provider>
  );
}

// Each public tenant route performs uncached studio reads. Keep these reads
// tied to navigation while browsing the public site or editing its draft.
export function Link({ prefetch, ...props }) {
  const disabled = useContext(PrefetchDisabledContext);
  return <LocalizedLink {...props} prefetch={disabled ? false : prefetch} />;
}
