"use client";

import CustomerAuthControls from "@/components/auth/CustomerAuthControls";
import Header from "@/components/headers/Header";
import CustomerLocalePreferenceSync from "@/components/customer-shell/CustomerLocalePreferenceSync";

import PublicTenantFooter from "./PublicTenantFooter";
import PublicTenantProvider, { usePublicTenant } from "./PublicTenantProvider";
import PublicTenantAnnouncementSpacer from "./PublicTenantAnnouncementSpacer";
import { getPublicTenantTheme } from "./publicTenant.config";
import { getPublicTenantPortalTheme } from "./publicTenantPortalTheme";

function PublicTenantChromeContent({ children, previewPathname }) {
  const { tenant, surface, appearanceSurface = surface } = usePublicTenant();
  const theme =
    appearanceSurface === "portal"
      ? getPublicTenantPortalTheme(tenant)
      : getPublicTenantTheme(tenant);
  const authSurface = surface === "auth";

  return (
    <>
      <CustomerLocalePreferenceSync />
      <div
        className={
          authSurface ? "-mt-[var(--header-height)] min-h-dvh" : "min-h-dvh"
        }
        data-customer-auth-chrome={authSurface ? "headerless" : undefined}
        data-customer-portal-theme={appearanceSurface === "portal" || undefined}
        data-tenant-style={theme.stylePresetId}
        style={{
          ...theme.style,
          backgroundColor: theme.backgroundColor,
          color: theme.textForeground,
          fontFamily: "var(--tenant-font-body)",
        }}
      >
        {authSurface ? (
          <CustomerAuthControls />
        ) : (
          <Header tenantScoped pathnameOverride={previewPathname} />
        )}
        {authSurface ? null : <PublicTenantAnnouncementSpacer />}
        {children}
        {authSurface ? null : (
          <PublicTenantFooter pathnameOverride={previewPathname} />
        )}
      </div>
    </>
  );
}

export default function PublicTenantChrome({
  children,
  tenant,
  degraded = false,
  surface = "public",
  previewPathname,
  previewModules,
}) {
  return (
    <PublicTenantProvider
      initialTenant={tenant}
      degraded={degraded}
      surface={surface}
      previewMode={Boolean(previewPathname)}
      previewModules={previewModules}
    >
      <PublicTenantChromeContent previewPathname={previewPathname}>
        {children}
      </PublicTenantChromeContent>
    </PublicTenantProvider>
  );
}
