"use client";

import {
  ArrowLongRightIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  formatLocationAddress,
  getLocationId,
} from "@/lib/features/locations/location.utils";

export default function PortalLocationChooser({
  locations = [],
  reason = "required",
  onSelect,
}) {
  const t = useTranslations("CustomerShell.locationChooser");
  const unavailable = reason === "unavailable";

  return (
    <main
      className="min-h-[calc(100dvh-var(--header-height,78px))] px-5 py-12 sm:px-8 sm:py-16"
      data-tenant-layout="page"
      data-customer-portal-page
      style={{
        backgroundColor: "var(--tenant-background)",
        color: "var(--tenant-text)",
      }}
    >
      <section
        className="mx-auto max-w-3xl rounded-[28px] border p-6 shadow-[0_22px_70px_rgba(31,27,24,0.08)] sm:p-9"
        style={{
          backgroundColor: "var(--tenant-surface)",
          borderColor:
            "color-mix(in srgb, var(--tenant-text) 14%, transparent)",
          color: "var(--tenant-text-on-surface)",
        }}
        aria-labelledby="portal-location-title"
        data-testid="portal-location-chooser"
        data-customer-portal-surface
        data-tenant-layout="panel"
        data-tenant-surface="panel"
      >
        <div className="max-w-2xl">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            data-tenant-type="eyebrow"
            style={{ color: "var(--tenant-accent-on-surface)" }}
          >
            {t("eyebrow")}
          </p>
          <h1
            id="portal-location-title"
            className="mt-3 font-serif text-[32px] font-normal tracking-[-0.05em] sm:text-[42px]"
            data-tenant-type="display"
          >
            {t("title")}
          </h1>
          <p
            className="mt-3 text-sm leading-6"
            style={{
              color: "var(--tenant-muted-on-surface)",
            }}
          >
            {unavailable ? t("unavailable") : t("description")}
          </p>
        </div>

        {unavailable ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-[16px] border px-4 py-3 text-xs leading-5"
            data-tenant-surface="card"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--tenant-secondary) 9%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--tenant-secondary) 28%, transparent)",
            }}
          >
            <ExclamationTriangleIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {t("unavailableHint")}
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {locations.map((location) => {
            const locationId = getLocationId(location);
            const address = formatLocationAddress(location);

            return (
              <button
                key={locationId}
                type="button"
                onClick={() => onSelect?.(locationId)}
                className="group flex min-h-[112px] items-center gap-4 rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--tenant-accent)] hover:shadow-[0_14px_38px_rgba(31,27,24,0.08)] focus-visible:outline-none focus-visible:ring-4 motion-reduce:transform-none"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--tenant-background) 90%, white 10%)",
                  borderColor:
                    "color-mix(in srgb, var(--tenant-text) 14%, transparent)",
                  "--tw-ring-color":
                    "color-mix(in srgb, var(--tenant-accent) 20%, transparent)",
                }}
                aria-label={t("open", { studio: location.name })}
                data-tenant-layout="card"
                data-tenant-surface="card"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--tenant-accent) 10%, transparent)",
                    color: "var(--tenant-accent-on-surface)",
                  }}
                >
                  <MapPinIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold tracking-[-0.03em]">
                    {location.name}
                  </span>
                  {address ? (
                    <span
                      className="mt-1 block truncate text-xs"
                      style={{
                        color: "var(--tenant-muted-on-surface)",
                      }}
                    >
                      {address}
                    </span>
                  ) : null}
                </span>
                <ArrowLongRightIcon
                  className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: "var(--tenant-accent-on-surface)" }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
