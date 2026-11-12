"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { getLocationId } from "@/lib/features/locations/location.utils";
import {
  buildCustomerPortalPath,
  buildLocalizedCustomerPortalUrl,
  getPortalLocationReference,
} from "@/utils/customerPortalLocation";

export default function CustomerPortalLinks({ locations = [] }) {
  const locale = useLocale();
  const localizedLocale = resolveRolloutEligibleLocaleCode(locale);
  const t = useTranslations("Locations.portalLinks");
  const [copyStatus, setCopyStatus] = useState({ key: "", type: "idle" });

  const rows = useMemo(() => {
    const shareableLocations = (
      Array.isArray(locations) ? locations : []
    ).filter(
      (location) =>
        location?.isActive !== false &&
        location?.booking?.enabled !== false &&
        Boolean(getPortalLocationReference(location)),
    );

    return [
      {
        key: "general",
        label: t("generalLabel"),
        description: t("generalDescription"),
        location: null,
      },
      ...shareableLocations.map((location) => ({
        key: getLocationId(location) || getPortalLocationReference(location),
        label: location.name,
        description: t("locationDescription", { studio: location.name }),
        location,
      })),
    ];
  }, [locations, t]);

  const copyLink = async (row) => {
    const absoluteUrl = buildLocalizedCustomerPortalUrl({
      origin: window.location.origin,
      locale,
      location: row.location,
    });

    if (!absoluteUrl || !navigator.clipboard?.writeText) {
      setCopyStatus({ key: row.key, type: "error" });
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyStatus({ key: row.key, type: "copied" });
    } catch {
      setCopyStatus({ key: row.key, type: "error" });
    }
  };

  return (
    <section
      className="rounded-[22px] border border-skab-blue-200 bg-[linear-gradient(135deg,var(--color-skab-blue-50)_0%,#FFFFFF_58%,var(--color-skab-offset-50)_100%)] p-5 shadow-[0_14px_42px_rgb(var(--skab-blue-rgb)/0.05)] sm:p-6"
      aria-labelledby="customer-portal-links-title"
      data-testid="customer-portal-links"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-cobalt-50 text-cobalt-600">
          <LinkIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="customer-portal-links-title"
            className="text-[16px] font-semibold tracking-[-0.03em] text-[#252524]"
          >
            {t("title")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#777773]">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-[#E8E5DF] overflow-hidden rounded-[17px] border border-[#E5E2DC] bg-white/90">
        {rows.map((row) => {
          const href = buildCustomerPortalPath({ location: row.location });
          const copied =
            copyStatus.key === row.key && copyStatus.type === "copied";
          const copyFailed =
            copyStatus.key === row.key && copyStatus.type === "error";

          return (
            <div
              key={row.key}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#353533]">
                  {row.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-[#858580]">
                  {row.description}
                </p>
                <code className="mt-2 block truncate text-[10px] text-[#777773]">
                  /{localizedLocale}
                  {href}
                </code>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(row)}
                  aria-label={t("copyFor", { studio: row.label })}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[10px] font-semibold text-[#555553] transition hover:border-cobalt-300 hover:text-cobalt-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-500/10 sm:flex-none"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ClipboardDocumentIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  )}
                  {copied ? t("copied") : t("copy")}
                </button>
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("openFor", { studio: row.label })}
                  data-tenant-button="primary"
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#252524] px-3.5 text-[10px] font-semibold text-white transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-500/15 sm:flex-none"
                >
                  <ArrowTopRightOnSquareIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {t("open")}
                </Link>
              </div>

              {copyFailed ? (
                <p
                  role="alert"
                  className="text-[10px] text-terracotta-700 sm:basis-full"
                >
                  {t("copyError")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
