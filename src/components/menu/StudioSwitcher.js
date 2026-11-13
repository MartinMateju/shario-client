"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { Fragment, useMemo, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
} from "@heroicons/react/20/solid";

import {
  formatLocationAddress,
  getEntityId,
} from "@/utils/locationBookingUtils";
import { normalizePublicTenantLogoSize } from "@/components/public-tenant/publicTenant.config";
import { classNames } from "./menuUtils";

const panelStyle = {
  backgroundColor: "var(--tenant-surface)",
  borderColor: "color-mix(in srgb, var(--tenant-text) 16%, transparent)",
  color: "var(--tenant-text-on-surface)",
};

const compactHeaderStyle = {
  backgroundColor: "transparent",
  borderColor: "transparent",
  color: "var(--tenant-text)",
};

const calendarControlStyle = {
  ...panelStyle,
  borderColor: "var(--tenant-border)",
};

function LocationIdentity({
  location,
  showChevron = false,
  compact = false,
  calendar = false,
  logoUrl = "",
  logoSize,
  brandDisplayName = "",
}) {
  const normalizedBrandDisplayName = String(brandDisplayName || "").trim();
  const identityName =
    compact && normalizedBrandDisplayName
      ? normalizedBrandDisplayName
      : location.name;
  const showLocationContext = compact && identityName !== location.name;

  return (
    <>
      <div
        className={classNames(
          "flex min-w-0 items-center",
          compact ? "gap-2" : "gap-3",
        )}
      >
        {compact && logoUrl ? (
          // Tenant logos may live on tenant-managed HTTPS hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="w-auto max-h-16 max-w-[min(44vw,192px)] shrink-0 rounded-[10px] object-contain"
            style={{ height: `${logoSize}px` }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={classNames(
              "flex shrink-0 items-center justify-center rounded-full",
              compact
                ? "h-8 w-8"
                : calendar
                  ? "h-9 w-9 sm:h-10 sm:w-10"
                  : "h-9 w-9",
            )}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--tenant-accent) 10%, transparent)",
              color: "var(--tenant-accent-on-surface)",
            }}
          >
            <MapPinIcon
              className={calendar ? "h-5 w-5" : "h-4 w-4"}
              aria-hidden="true"
            />
          </span>
        )}

        <div className="min-w-0">
          <p
            className={classNames(
              "truncate font-semibold tracking-[-0.025em]",
              compact
                ? "text-[14px] sm:text-[18px]"
                : calendar
                  ? "text-[15px] sm:text-[16px]"
                  : "text-[15px]",
            )}
            data-customer-brand-name={compact || undefined}
            data-customer-selected-studio={
              showLocationContext ? undefined : true
            }
            title={identityName}
          >
            {identityName}
          </p>
          {showLocationContext ? (
            <p
              className="mt-0.5 truncate text-[10px] font-medium"
              data-customer-selected-studio
              title={location.name}
              style={{ color: "var(--tenant-muted-on-surface)" }}
            >
              {location.name}
            </p>
          ) : !compact ? (
            <p
              className={classNames(
                "mt-0.5 truncate text-[12px]",
                calendar && "hidden sm:block",
              )}
              style={{ color: "var(--tenant-muted-on-surface)" }}
            >
              {formatLocationAddress(location, { includeCountry: false })}
            </p>
          ) : null}
        </div>
      </div>

      {showChevron ? (
        <ChevronDownIcon
          className={classNames(
            "shrink-0 transition-transform duration-200 group-data-[headlessui-state=open]:rotate-180 motion-reduce:transition-none",
            compact ? "h-3.5 w-3.5" : "h-5 w-5",
          )}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

// The options open below the trigger, which can sit near the bottom of a phone
// screen. Reveal them on open and keep the page scrollable (non-modal) so
// every studio stays reachable by touch.
const revealStudioOptions = (element) => {
  if (!element || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    element.scrollIntoView?.({ block: "nearest" });
  });
};

export default function StudioSwitcher({
  locations = [],
  activeLocationId,
  onChange,
  locale,
  language = "CZ",
  isLoading = false,
  requireBookingEnabled = true,
  announceChanges = true,
  variant = "card",
  logoUrl = "",
  logoSize,
  brandDisplayName = "",
}) {
  const isCzech = locale ? locale === "cs" : language === "CZ";
  const copy = useLegacyCopy("studioSwitcher");
  const [announcement, setAnnouncement] = useState("");
  const compact = variant === "header";
  const calendar = variant === "calendar";
  const resolvedLogoSize = normalizePublicTenantLogoSize(logoSize);
  const resolvedBrandDisplayName = String(brandDisplayName || "").trim();
  const availableLocations = useMemo(
    () =>
      (Array.isArray(locations) ? locations : []).filter(
        (location) =>
          getEntityId(location) &&
          location?.isActive !== false &&
          (!requireBookingEnabled || location?.booking?.enabled !== false),
      ),
    [locations, requireBookingEnabled],
  );

  const selectedLocation =
    availableLocations.find(
      (location) => getEntityId(location) === activeLocationId,
    ) ||
    availableLocations.find((location) => location?.isPrimary) ||
    null;

  if (isLoading) {
    return (
      <div
        className={classNames(
          "flex animate-pulse items-center gap-3 border motion-reduce:animate-none",
          compact
            ? "h-11 w-[min(46vw,260px)] rounded-full px-2"
            : calendar
              ? "min-h-14 rounded-[14px] px-3 py-2 sm:min-h-[64px] sm:px-3.5 sm:py-2.5"
              : "min-h-[64px] rounded-[18px] px-4 py-3",
        )}
        style={
          compact
            ? compactHeaderStyle
            : calendar
              ? calendarControlStyle
              : panelStyle
        }
        data-tenant-surface={compact ? "field" : "card"}
      >
        <span
          className="h-9 w-9 rounded-[11px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--tenant-text) 10%, transparent)",
          }}
        />
        <span
          className="h-3 w-1/2 rounded-full"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--tenant-text) 10%, transparent)",
          }}
        />
      </div>
    );
  }

  if (!selectedLocation) {
    return (
      <div
        className={classNames(
          "flex items-center gap-3 border border-dashed text-[12px]",
          compact
            ? "h-11 max-w-[210px] rounded-full px-2"
            : calendar
              ? "min-h-14 rounded-[14px] px-3 py-2 sm:min-h-[64px] sm:px-3.5 sm:py-2.5"
              : "min-h-[64px] rounded-[18px] px-4 py-3",
        )}
        style={
          compact
            ? compactHeaderStyle
            : calendar
              ? calendarControlStyle
              : panelStyle
        }
        data-tenant-surface={compact ? "field" : "card"}
      >
        <MapPinIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {copy.empty}
      </div>
    );
  }

  const canSwitch =
    availableLocations.length > 1 && typeof onChange === "function";
  const accessibleBrandContext =
    compact &&
    resolvedBrandDisplayName &&
    resolvedBrandDisplayName !== selectedLocation.name
      ? `${resolvedBrandDisplayName}. `
      : "";

  const handleChange = (locationId) => {
    const nextLocation = availableLocations.find(
      (location) => getEntityId(location) === locationId,
    );

    if (!nextLocation) return;

    if (announceChanges) {
      setAnnouncement(copy.changed(nextLocation.name));
    }
    onChange?.(locationId);
  };

  if (!canSwitch) {
    return (
      <div
        className={classNames(
          "flex w-full items-center justify-between gap-3 border text-left",
          compact
            ? "min-h-12 max-w-[min(64vw,400px)] rounded-full border-transparent px-1.5 transition xl:max-w-[min(28vw,380px)] 2xl:max-w-[420px]"
            : calendar
              ? "min-h-14 rounded-[14px] px-3 py-2 sm:min-h-[64px] sm:px-3.5 sm:py-2.5"
              : "min-h-[64px] rounded-[18px] px-3.5 py-2.5",
        )}
        data-customer-studio-switcher
        data-tenant-navigation
        data-tenant-surface={compact ? "field" : "card"}
        data-selected-location-id={getEntityId(selectedLocation)}
        data-switching-enabled="false"
        style={
          compact
            ? compactHeaderStyle
            : calendar
              ? calendarControlStyle
              : panelStyle
        }
      >
        <LocationIdentity
          location={selectedLocation}
          compact={compact}
          calendar={calendar}
          logoUrl={logoUrl}
          logoSize={resolvedLogoSize}
          brandDisplayName={resolvedBrandDisplayName}
        />
      </div>
    );
  }

  return (
    <div
      className={classNames(
        "w-full",
        compact &&
          "max-w-[min(64vw,400px)] xl:max-w-[min(28vw,380px)] 2xl:max-w-[420px]",
      )}
      data-customer-studio-switcher
      data-tenant-navigation
      data-selected-location-id={getEntityId(selectedLocation)}
      data-switching-enabled="true"
    >
      <Listbox value={getEntityId(selectedLocation)} onChange={handleChange}>
        <div className="relative">
          <Listbox.Button
            data-tenant-hover="preserve"
            className={classNames(
              "group flex w-full items-center justify-between gap-3 border text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default motion-reduce:transform-none motion-reduce:transition-none",
              compact
                ? "min-h-12 rounded-[12px] border-transparent px-1.5 hover:bg-[color-mix(in_srgb,var(--tenant-surface)_62%,transparent)]"
                : calendar
                  ? "min-h-14 rounded-[14px] px-3 py-2 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_28%,var(--tenant-border))] hover:bg-[color-mix(in_srgb,var(--tenant-accent)_4%,var(--tenant-surface))] sm:min-h-[64px] sm:px-3.5 sm:py-2.5"
                  : "min-h-[64px] rounded-[18px] px-3.5 py-2.5 hover:shadow-sm",
            )}
            aria-label={`${accessibleBrandContext}${copy.current}: ${selectedLocation.name}. ${copy.change}`}
            data-customer-studio-switcher-trigger
            data-tenant-surface="field"
            style={
              compact
                ? {
                    ...compactHeaderStyle,
                    "--tw-ring-color": "var(--tenant-accent-link)",
                  }
                : {
                    ...(calendar ? calendarControlStyle : panelStyle),
                    "--tw-ring-color": "var(--tenant-accent-on-surface)",
                  }
            }
          >
            <LocationIdentity
              location={selectedLocation}
              showChevron
              compact={compact}
              calendar={calendar}
              logoUrl={logoUrl}
              logoSize={resolvedLogoSize}
              brandDisplayName={resolvedBrandDisplayName}
            />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition-[opacity,transform] duration-180 ease-out motion-reduce:transition-none"
            enterFrom="translate-y-2 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition-[opacity,transform] duration-120 ease-in motion-reduce:transition-none"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="translate-y-1 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
          >
            <Listbox.Options
              ref={revealStudioOptions}
              modal={false}
              data-studio-switcher-panel
              data-tenant-surface="panel"
              className={classNames(
                "absolute z-[80] mt-2 max-h-72 origin-top-left overflow-auto border p-1.5 shadow-[0_16px_38px_rgba(17,17,15,0.14)] will-change-[transform,opacity] focus:outline-none motion-reduce:transform-none",
                compact
                  ? "left-0 w-[min(360px,calc(100vw-2.5rem))] rounded-[18px]"
                  : calendar
                    ? "inset-x-0 w-full rounded-[14px]"
                    : "right-0 w-full rounded-[18px]",
              )}
              style={calendar ? calendarControlStyle : panelStyle}
            >
              {availableLocations.map((location) => {
                const locationId = getEntityId(location);
                const selected = locationId === getEntityId(selectedLocation);

                return (
                  <Listbox.Option
                    key={locationId}
                    value={locationId}
                    data-tenant-surface="field"
                    data-tenant-hover="preserve"
                    data-studio-switcher-selected={selected ? "true" : "false"}
                    className={({ active }) =>
                      classNames(
                        "min-h-[58px] cursor-pointer rounded-[10px] px-3 py-2.5 transition-colors",
                        selected
                          ? "bg-[color-mix(in_srgb,var(--tenant-accent)_10%,var(--tenant-surface))]"
                          : active
                            ? "bg-[color-mix(in_srgb,var(--tenant-accent)_6%,var(--tenant-surface))]"
                            : "bg-transparent",
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--tenant-accent) 10%, transparent)",
                          color: "var(--tenant-accent-on-surface)",
                        }}
                      >
                        <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[13px] font-semibold"
                          title={location.name}
                        >
                          {location.name}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11px]"
                          style={{ color: "var(--tenant-muted-on-surface)" }}
                        >
                          {formatLocationAddress(location, {
                            includeCountry: false,
                          })}
                        </p>
                      </div>
                      {selected ? (
                        <CheckIcon
                          className="mt-1 h-4 w-4 shrink-0"
                          style={{ color: "var(--tenant-accent-on-surface)" }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {announceChanges ? (
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      ) : null}
    </div>
  );
}
