import {
  getPublicTenantLocaleCodes,
  resolvePublicTenantRouteLocale,
} from "@/components/public-tenant/publicTenant.config";
import { getCustomerCurrentLocale } from "@/i18n/customerLocalePreference";
import { normalizeLocaleCode } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

// Apply the account default at authenticated entry. Subsequent navigation keeps
// the URL's language until the customer explicitly chooses another language.
export const resolveCustomerAuthLocale = ({
  locale,
  settings,
  tenantSlug,
  user,
  routeableLocaleCodes = routing.locales,
}) => {
  const supportedLocales = getPublicTenantLocaleCodes(
    settings,
    routeableLocaleCodes,
  );
  const currentChoice = getCustomerCurrentLocale(tenantSlug);
  const savedDefault = normalizeLocaleCode(user?.customerDefaultLanguage);
  const preferredLocale = supportedLocales.includes(currentChoice)
    ? currentChoice
    : savedDefault || locale;

  return resolvePublicTenantRouteLocale(
    settings,
    preferredLocale,
    routeableLocaleCodes,
  );
};
