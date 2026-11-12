"use client";

import { useLocale } from "next-intl";

import CustomerAuthShell from "@/components/auth/CustomerAuthShell";
import { getCustomerAuthCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "@/components/public-tenant/publicTenant.config";

export default function CustomerPasswordRecoveryShell({
  children,
  formDescription,
  formEyebrow,
  formTitle,
  intentText = "",
  mode = "recovery",
}) {
  const locale = useLocale();
  const { tenant } = usePublicTenant();
  const tenantTheme = getPublicTenantTheme(tenant);
  const defaults = getCustomerAuthCustomizationDefaults("login", locale);
  const login = tenant.publicSite.login;
  const branding = tenant.publicSite.branding;
  const tenantName =
    branding.displayName ||
    tenant.name ||
    (locale === "cs" ? "Vaše studio" : "Your studio");
  const labelColor =
    login.labelColor ||
    branding.labelColor ||
    tenantTheme.labelColor ||
    tenantTheme.accentLinkColor;

  return (
    <CustomerAuthShell
      accentColor={tenantTheme.accentColor}
      backgroundImageUrl={login.backgroundImageUrl}
      description={
        getLocalizedPublicTenantText(login.supportingText, locale) ||
        defaults.description
      }
      eyebrow={
        getLocalizedPublicTenantText(login.eyebrow, locale) || defaults.eyebrow
      }
      formDescription={formDescription}
      formEyebrow={formEyebrow}
      formTitle={formTitle}
      helpText={getLocalizedPublicTenantText(login.helpText, locale)}
      intentText={intentText}
      labelColor={labelColor}
      logoUrl={branding.logoUrl}
      branding={branding}
      mode={mode}
      secondaryColor={tenantTheme.secondaryColor}
      tenantName={tenantName}
      themeStyle={tenantTheme.style}
      title={
        getLocalizedPublicTenantText(login.headline, locale) ||
        defaults.headline
      }
    >
      {children}
    </CustomerAuthShell>
  );
}
