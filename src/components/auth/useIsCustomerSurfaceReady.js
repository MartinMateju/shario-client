"use client";

import { useParams } from "next/navigation";
import { useSelector } from "react-redux";

import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectIsCustomerAuthenticated,
  selectIsSessionReadyForContext,
} from "@/lib/features/auth/authSlice";
import { getTenantSlugParam } from "@/utils/tenantRouting";

/**
 * Whether the portal's TenantSurfaceBoundary renders its content: the customer
 * session is restored for the studio in the URL, and it is not a platform
 * account. Keep this in step with the boundary's checks. Portal data that
 * needs the customer's credentials but lives above the boundary waits for it.
 *
 * This lives apart from the boundary because the header imports the portal
 * location provider on every page.
 */
export default function useIsCustomerSurfaceReady() {
  const params = useParams();
  const sessionReady = useSelector(
    selectIsSessionReadyForContext(AUTH_CONTEXTS.CUSTOMER),
  );
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const currentTenant = useSelector(selectCurrentTenant);
  const routeTenantSlug = getTenantSlugParam(params);
  const sessionTenantSlug = String(currentTenant?.slug || "")
    .trim()
    .toLowerCase();
  const platformRole = String(currentUser?.platformRole || "")
    .trim()
    .toLowerCase();

  return Boolean(
    sessionReady &&
    isCustomerAuthenticated &&
    (!platformRole || platformRole === "none") &&
    sessionTenantSlug &&
    (!routeTenantSlug || sessionTenantSlug === routeTenantSlug),
  );
}
