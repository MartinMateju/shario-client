"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import useIsCustomerSurfaceReady from "@/components/auth/useIsCustomerSurfaceReady";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { buildTenantAuthHref } from "@/utils/tenantAuthRouting";

import PublicTenantHeroMedia from "./PublicTenantHeroMedia";
import PublicTenantHomeSections from "./PublicTenantHomeSections";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
  resolvePublicTenantLabelColor,
} from "./publicTenant.config";
import { usePublicTenant } from "./PublicTenantProvider";

export default function PublicTenantHomePage({ previewData }) {
  const customerDefaults = useLegacyCopy("customerDefaults");
  const locale = useLocale();
  const t = useTranslations("PublicTenant");
  const customerSurfaceReady = useIsCustomerSurfaceReady();
  const { tenant, primaryAction } = usePublicTenant();
  const bookingHref = customerSurfaceReady
    ? "/portal?tab=studio-calendar"
    : buildTenantAuthHref("/login", "/portal?tab=studio-calendar");
  const branding = tenant.publicSite.branding;
  const pages = tenant.publicSite.pages;
  const tenantTheme = getPublicTenantTheme(tenant);
  const {
    accentColor,
    accentForeground,
    accentLinkColor,
    secondaryColor,
    backgroundColor,
    textForeground,
  } = tenantTheme;
  const labelColor = resolvePublicTenantLabelColor(
    pages.home.labelColor,
    backgroundColor,
    branding.labelColor || tenantTheme.labelColor || accentLinkColor,
  );
  const headlineColor = resolvePublicTenantLabelColor(
    pages.home.headlineColor,
    backgroundColor,
    textForeground,
  );
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    localizedDefaults: customerDefaults,
    page: "home",
    locale,
    studio: branding.displayName,
  });
  const eyebrow = getLocalizedPublicTenantText(
    pages.home.eyebrow,
    locale,
    t("home.eyebrow"),
  );
  const headline = getLocalizedPublicTenantText(
    pages.home.headline,
    locale,
    branding.displayName,
  );
  const description =
    getLocalizedPublicTenantText(pages.home.description, locale) ||
    getLocalizedPublicTenantText(
      branding.description,
      locale,
      customizationDefaults.description,
    );

  return (
    <main
      data-public-tenant-home
      className="overflow-hidden"
      style={{ backgroundColor, color: textForeground }}
    >
      <section
        data-public-tenant-hero
        className="relative isolate lg:grid lg:min-h-[calc(100svh-var(--header-height,78px))] lg:grid-cols-12"
      >
        <div
          className="relative z-10 flex px-5 py-14 sm:px-8 sm:py-20 lg:col-span-7 lg:items-center lg:px-12 lg:py-24 xl:col-span-6 xl:pl-[max(3rem,calc((100vw-96rem)/2))] xl:pr-16"
          data-tenant-layout="hero-copy"
        >
          <div className="w-full max-w-2xl lg:max-w-xl xl:max-w-2xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              data-tenant-type="eyebrow"
              data-public-site-edit-path={`pages.home.eyebrow.${locale}`}
              style={{ color: labelColor }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-7 max-w-[12ch] text-balance font-serif text-[clamp(3.45rem,7vw,7rem)] font-normal leading-[0.94] tracking-[-0.055em] [overflow-wrap:anywhere]"
              data-tenant-type="display"
              data-public-site-edit-path={`pages.home.headline.${locale}`}
              style={{ color: headlineColor }}
            >
              {headline}
            </h1>
            <p
              className="mt-7 max-w-[38rem] text-base leading-7 text-[color:var(--tenant-text-muted)] sm:text-lg sm:leading-8"
              data-public-site-edit-path={`pages.home.description.${locale}`}
            >
              {description}
            </p>

            <div
              className="mt-9 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center"
              data-tenant-actions
            >
              {primaryAction ? (
                <Link
                  href={
                    primaryAction.key === "book"
                      ? bookingHref
                      : primaryAction.href
                  }
                  data-public-tenant-primary-action
                  data-tenant-button="primary"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-semibold shadow-[0_16px_40px_rgba(17,17,15,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(17,17,15,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                  style={{
                    backgroundColor: accentColor,
                    color: accentForeground,
                  }}
                >
                  {t(`actions.${primaryAction.key}`)}
                  <ArrowLongRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="relative !rounded-none !shadow-none lg:col-span-5 lg:min-h-full xl:absolute xl:inset-y-0 xl:left-1/2 xl:right-0"
          data-tenant-surface="media"
          data-public-site-edit-path="branding.coverImageUrl"
        >
          <PublicTenantHeroMedia
            coverImageUrl={branding.coverImageUrl}
            logoUrl={branding.logoUrl}
            displayName={branding.displayName}
            accentColor={accentColor}
            secondaryColor={secondaryColor}
            backgroundColor={backgroundColor}
          />
        </div>
      </section>

      <PublicTenantHomeSections previewData={previewData} />
    </main>
  );
}
