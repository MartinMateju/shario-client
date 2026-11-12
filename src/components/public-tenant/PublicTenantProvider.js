"use client";

import { createContext, useContext, useMemo } from "react";
import { useSelector } from "react-redux";

import {
  getPublicTenantNavigation,
  getPublicTenantPrimaryAction,
  normalizePublicTenant,
} from "./publicTenant.config";
import {
  selectCurrentTenant,
  selectIsCustomerAuthenticated,
} from "@/lib/features/auth/authSlice";
import {
  getCustomerShellSurface,
  getCustomerShellAppearanceSurface,
  getCustomerPortalNavigation,
  resolveCustomerShellTenant,
} from "@/components/customer-shell/customerShell.config";
import { usePathname } from "@/i18n/navigation";
import { useCustomerPortalAppearance } from "@/components/customer-shell/useCustomerPortalAppearance";

const PublicTenantContext = createContext(null);

export default function PublicTenantProvider({
  children,
  initialTenant,
  degraded = false,
  surface = "public",
  previewMode = false,
  previewModules,
}) {
  const pathname = usePathname();
  const currentTenant = useSelector(selectCurrentTenant);
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const authenticatedTenant = isCustomerAuthenticated ? currentTenant : null;
  const studioValue = useMemo(() => {
    const normalizedSurface = getCustomerShellSurface(surface, pathname);
    const normalizedTenant = normalizePublicTenant(
      initialTenant,
      initialTenant?.slug,
    );
    const tenant = resolveCustomerShellTenant({
      publicTenant: normalizedTenant,
      authenticatedTenant,
      degraded,
      surface: normalizedSurface,
    });

    return {
      tenant,
      degraded,
      surface: normalizedSurface,
      appearanceSurface: getCustomerShellAppearanceSurface(
        normalizedSurface,
        pathname,
      ),
      previewMode,
      navigation: getPublicTenantNavigation(tenant),
      portalNavigation: getCustomerPortalNavigation(
        previewMode
          ? (previewModules ?? {})
          : (authenticatedTenant?.modules ?? null),
        tenant,
      ),
      primaryAction: getPublicTenantPrimaryAction(tenant),
    };
  }, [
    authenticatedTenant,
    degraded,
    initialTenant,
    pathname,
    surface,
    previewMode,
    previewModules,
  ]);
  const tenant = useCustomerPortalAppearance({
    tenant: studioValue.tenant,
    surface: studioValue.appearanceSurface,
    previewMode,
  });
  const value = useMemo(
    () => ({ ...studioValue, studioTenant: studioValue.tenant, tenant }),
    [studioValue, tenant],
  );

  return (
    <PublicTenantContext.Provider value={value}>
      {children}
    </PublicTenantContext.Provider>
  );
}

export const useOptionalPublicTenant = () => useContext(PublicTenantContext);

export const usePublicTenant = () => {
  const context = useOptionalPublicTenant();

  if (!context) {
    throw new Error(
      "usePublicTenant must be used within a PublicTenantProvider.",
    );
  }

  return context;
};
