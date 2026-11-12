"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { retainPublicCourseLocation } from "@/components/courses/usePublicCourseLocation";
import { useCurrentYear } from "@/hooks/useCurrentYear";
import { Link, usePathname } from "@/i18n/navigation";
import { getPortalLocationReferenceFromSearchParams } from "@/utils/customerPortalLocation";
import { buildPlatformUrl } from "@/utils/tenantRouting";

import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "./publicTenant.config";
import { usePublicTenant } from "./PublicTenantProvider";

const EXCLUDED_PREFIXES = ["/app", "/portal", "/password"];

const isExternalUrl = (value) => /^https:\/\//i.test(value);

function FooterLink({ href, children, editPath }) {
  if (!href) return null;

  if (isExternalUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-public-site-edit-path={editPath}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} data-public-site-edit-path={editPath}>
      {children}
    </Link>
  );
}

export default function PublicTenantFooter({ pathnameOverride }) {
  const routePathname = usePathname();
  const searchParams = useSearchParams();
  const locationReference =
    getPortalLocationReferenceFromSearchParams(searchParams);
  const pathname = pathnameOverride || routePathname;
  const locale = useLocale();
  const t = useTranslations("PublicTenant");
  const { tenant, navigation, degraded, surface } = usePublicTenant();
  const platformHref = buildPlatformUrl({ locale, pathname: "/" });
  const footer = tenant.publicSite.footer;
  const displayName = tenant.publicSite.branding.displayName;
  const { accentLinkColor, backgroundColor, textForeground } =
    getPublicTenantTheme(tenant);
  const { year, yearKey } = useCurrentYear();
  const excluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

  if (excluded || degraded || surface !== "public") return null;

  const description = getLocalizedPublicTenantText(
    footer.description,
    locale,
    getLocalizedPublicTenantText(
      tenant.publicSite.branding.description,
      locale,
    ),
  );
  const openingHours = getLocalizedPublicTenantText(
    footer.openingHours,
    locale,
  );
  const copyright =
    getLocalizedPublicTenantText(footer.copyright, locale) ||
    t("footer.defaultCopyright", {
      year,
      studio: displayName,
    });
  const legalLinks = [
    ["studioRules", footer.legal.studioRules],
    ["terms", footer.legal.terms],
    ["privacy", footer.legal.privacy],
    ["cancellation", footer.legal.cancellation],
  ].filter(([, href]) => href);
  const socialLinks = Object.entries(footer.social).filter(([, href]) => href);
  const emailIsSafe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(footer.email);
  const phoneHref = footer.phone.replace(/[^\d+]/g, "");

  return (
    <footer
      className="border-t border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] px-5 py-12 sm:px-8 lg:px-12"
      data-tenant-layout="section"
      style={{
        backgroundColor,
        color: textForeground,
      }}
    >
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
        <section className="max-w-md">
          <p
            className="text-2xl font-semibold tracking-[-0.045em]"
            data-tenant-type="display"
            data-public-site-edit-path="branding.displayName"
          >
            {displayName}
          </p>
          {description ? (
            <p
              className="mt-4 text-sm leading-6 text-[var(--tenant-muted-text)]"
              data-public-site-edit-path={`footer.description.${locale}`}
            >
              {description}
            </p>
          ) : null}
          {openingHours ? (
            <p
              className="mt-4 whitespace-pre-line text-xs leading-6 text-[var(--tenant-muted-text)]"
              data-public-site-edit-path={`footer.openingHours.${locale}`}
            >
              {openingHours}
            </p>
          ) : null}
        </section>

        {navigation.length ? (
          <section>
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
              data-tenant-type="eyebrow"
            >
              {t("footer.explore")}
            </h2>
            <nav
              className="mt-4 grid gap-3 text-sm"
              aria-label={t("footer.explore")}
            >
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={
                    item.key === "courses"
                      ? retainPublicCourseLocation(item.href, locationReference)
                      : item.href
                  }
                  className="transition hover:opacity-70"
                  style={{ color: accentLinkColor }}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
            </nav>
          </section>
        ) : null}

        {footer.email || footer.phone || footer.address ? (
          <section>
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
              data-tenant-type="eyebrow"
            >
              {t("footer.contact")}
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--tenant-text)]">
              {footer.email ? (
                emailIsSafe ? (
                  <a
                    href={`mailto:${footer.email}`}
                    className="hover:underline"
                    data-public-site-edit-path="footer.email"
                  >
                    {footer.email}
                  </a>
                ) : (
                  <span data-public-site-edit-path="footer.email">
                    {footer.email}
                  </span>
                )
              ) : null}
              {footer.phone ? (
                phoneHref ? (
                  <a
                    href={`tel:${phoneHref}`}
                    className="hover:underline"
                    data-public-site-edit-path="footer.phone"
                  >
                    {footer.phone}
                  </a>
                ) : (
                  <span data-public-site-edit-path="footer.phone">
                    {footer.phone}
                  </span>
                )
              ) : null}
              {footer.address ? (
                <span
                  className="whitespace-pre-line"
                  data-public-site-edit-path="footer.address"
                >
                  {footer.address}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {legalLinks.length || socialLinks.length ? (
          <section>
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
              data-tenant-type="eyebrow"
            >
              {t("footer.information")}
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--tenant-text)]">
              {legalLinks.map(([key, href]) => (
                <FooterLink
                  key={key}
                  href={href}
                  editPath={`footer.legal.${key}`}
                >
                  {t(`legal.${key}`)}
                </FooterLink>
              ))}
              {socialLinks.map(([key, href]) => (
                <FooterLink
                  key={key}
                  href={href}
                  editPath={`footer.social.${key}`}
                >
                  {t(`social.${key}`)}
                </FooterLink>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mx-auto mt-10 flex max-w-[1440px] flex-col gap-3 border-t border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] pt-6 text-[10px] text-[var(--tenant-muted-text)] sm:flex-row sm:items-center sm:justify-between">
        <p
          key={yearKey}
          data-public-site-edit-path={`footer.copyright.${locale}`}
          suppressHydrationWarning
        >
          {copyright}
        </p>
        <a
          href={platformHref}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-[var(--tenant-text)]"
        >
          {t("footer.poweredBy")}
        </a>
      </div>
    </footer>
  );
}
