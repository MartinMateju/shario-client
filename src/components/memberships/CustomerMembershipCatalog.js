"use client";

import { useSelector } from "react-redux";

import { useCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useGetCustomerMembershipCatalogQuery } from "@/lib/features/memberships/membershipsApiSlice";
import PublicMembershipCatalog from "./PublicMembershipCatalog";

export default function CustomerMembershipCatalog() {
  const tenant = useSelector(selectCurrentTenant);
  const tenantId = String(tenant?.id || tenant?._id || "");
  const { activeLocationId, activeLocationReference } =
    useCustomerPortalLocation();
  const query = useGetCustomerMembershipCatalogQuery(
    { tenantId, locationId: activeLocationId },
    { skip: !tenantId || !activeLocationId, refetchOnMountOrArgChange: true },
  );

  return (
    <PublicMembershipCatalog
      key={`${tenantId}:${activeLocationId}`}
      customerContext={{
        locationId: activeLocationId,
        locationReference: activeLocationReference,
        query: {
          ...query,
          // Never display another studio's retained RTK Query data while the
          // newly selected location is loading.
          data: query.currentData,
          isLoading:
            !tenantId ||
            !activeLocationId ||
            query.isLoading ||
            (query.isFetching && !query.currentData),
        },
      }}
    />
  );
}
