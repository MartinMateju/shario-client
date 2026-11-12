"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import {
  selectCurrentTenant,
  selectCurrentUser,
  selectIsCustomerAuthenticated,
} from "@/lib/features/auth/authSlice";
import { useGetAccountQuery } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import { getCustomerAccountQueryScope } from "@/lib/features/workspace-access/customerAccountScope";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";

export { getCustomerAccountQueryScope } from "@/lib/features/workspace-access/customerAccountScope";

const getId = (record) => String(record?.id || record?._id || "");

const isSameTenant = (tenant, authenticatedTenant) => {
  const tenantId = getId(tenant);
  const authenticatedId = getId(authenticatedTenant);
  if (tenantId && authenticatedId && tenantId !== authenticatedId) return false;
  if (tenant?.slug && authenticatedTenant?.slug) {
    return tenant.slug === authenticatedTenant.slug;
  }
  return Boolean(tenantId && authenticatedId && tenantId === authenticatedId);
};

export function useCustomerPortalAppearance({
  tenant,
  surface,
  previewMode = false,
}) {
  const customer = useSelector(selectCurrentUser);
  const authenticatedTenant = useSelector(selectCurrentTenant);
  const authenticated = useSelector(selectIsCustomerAuthenticated);
  const sameTenant = isSameTenant(tenant, authenticatedTenant);
  const enabled =
    authenticated &&
    sameTenant &&
    surface === "portal" &&
    !previewMode &&
    Boolean(tenant);
  const { currentData } = useGetAccountQuery(
    getCustomerAccountQueryScope(customer, authenticatedTenant),
    { skip: !enabled },
  );

  const sameCustomer =
    getId(customer) && getId(customer) === getId(currentData?.account);
  const appearance =
    enabled && sameCustomer ? currentData?.account?.portalAppearance : null;
  return useMemo(
    () => (appearance ? mergePortalAppearance(tenant, appearance) : tenant),
    [tenant, appearance],
  );
}
