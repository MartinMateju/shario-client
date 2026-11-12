"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";

import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { persistCustomerDefaultLocale } from "@/i18n/customerLocalePreference";
import { normalizeLocaleCode } from "@/i18n/locales";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectIsCustomerAuthenticated,
  selectIsSessionReadyForContext,
} from "@/lib/features/auth/authSlice";

export default function CustomerLocalePreferenceSync() {
  const context = useOptionalPublicTenant();
  const user = useSelector(selectCurrentUser);
  const sessionTenant = useSelector(selectCurrentTenant);
  const authenticated = useSelector(selectIsCustomerAuthenticated);
  const ready = useSelector(
    selectIsSessionReadyForContext(AUTH_CONTEXTS.CUSTOMER),
  );

  useEffect(() => {
    const tenant = context?.tenant;
    if (
      !authenticated ||
      !ready ||
      context?.previewMode ||
      context?.degraded ||
      !tenant?.slug ||
      tenant.slug !== sessionTenant?.slug
    )
      return;

    const savedDefault = normalizeLocaleCode(user?.customerDefaultLanguage);
    persistCustomerDefaultLocale(savedDefault, tenant.slug);

    // Only mirror account data here. A supported locale in the URL is an
    // explicit current language; saved defaults apply at entry/login instead.
  }, [
    authenticated,
    ready,
    context,
    user?.customerDefaultLanguage,
    sessionTenant,
  ]);

  return null;
}
