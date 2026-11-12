import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
  resolvePublicTenantLabelColor,
} from "@/components/public-tenant/publicTenant.config";

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const resolveCustomerPortalDashboardCustomization = ({
  tenant,
  locale = "en",
  fallbackCopy = {},
} = {}) => {
  const publicSite = asObject(tenant?.publicSite);
  const branding = asObject(publicSite.branding);
  const customerPortal = asObject(publicSite.customerPortal);
  const dashboard = asObject(customerPortal.dashboard);
  const { backgroundColor } = getPublicTenantTheme(tenant, {
    surface: "portal",
  });

  return {
    copy: {
      ...fallbackCopy,
      eyebrow: getLocalizedPublicTenantText(
        dashboard.eyebrow,
        locale,
        fallbackCopy.eyebrow,
      ),
      greeting: getLocalizedPublicTenantText(
        dashboard.headline,
        locale,
        fallbackCopy.greeting,
      ),
      intro: getLocalizedPublicTenantText(
        dashboard.description,
        locale,
        fallbackCopy.intro,
      ),
    },
    labelColor: resolvePublicTenantLabelColor(
      dashboard.labelColor,
      backgroundColor,
      branding.labelColor || branding.accentColor,
    ),
  };
};
