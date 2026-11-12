"use client";

import { useSelector } from "react-redux";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { useOptionalCustomerPortalLocation } from "./CustomerPortalLocationProvider";
import {
  getCustomerPortalFallbackHref,
  isCustomerPortalHrefEnabled,
} from "./customerPortalVisibility";

// Payment recovery stays available even when its original destination is off.
export default function useCustomerPortalReturnHref(
  preferredHref,
  locationReference = "",
) {
  const currentTenant = useSelector(selectCurrentTenant);
  const tenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const context = useOptionalCustomerPortalLocation();
  const location = locationReference
    ? context?.locations?.find((entry) =>
        [entry.id, entry._id, entry.slug].some(
          (value) => String(value || "") === locationReference,
        ),
      )
    : context?.activeLocation;
  const href = isCustomerPortalHrefEnabled(tenant, preferredHref, location)
    ? preferredHref
    : getCustomerPortalFallbackHref(tenant, currentTenant?.modules, location) ||
      "/portal";
  return retainCustomerPortalLocation(
    href,
    locationReference || context?.activeLocationReference,
  );
}
