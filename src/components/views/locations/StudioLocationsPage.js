"use client";

import { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  KeyIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useActivateLocationMutation,
  useDeactivateLocationMutation,
  useGetLocationsQuery,
  useSetPrimaryLocationMutation,
} from "@/lib/features/locations/locationApiSlice";
import {
  formatLocationAddress,
  getLocationId,
  getTenantIdFromUser,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { useGetCurrentTenantOnboardingQuery } from "@/lib/features/tenants/tenantApiSlice";

import CustomerPortalLinks from "./CustomerPortalLinks";
import { getLocationEditHref } from "./locations.navigation";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getRequestError = (error, fallback) =>
  error?.data?.message ||
  error?.data?.error?.message ||
  error?.error ||
  error?.message ||
  fallback;

function LocationCard({
  location,
  canManage,
  canViewAccessCodes,
  onAction,
  busyAction,
  editSearchParams,
}) {
  const t = useTranslations("Locations");
  const locationId = getLocationId(location);
  const address = formatLocationAddress(location);
  const isBusy = busyAction?.locationId === locationId;

  return (
    <article
      className={cx(
        "rounded-[20px] border bg-white p-5 shadow-[0_12px_36px_rgba(31,31,31,0.04)] transition",
        location.isPrimary ? "border-cobalt-200" : "border-line",
        !location.isActive && "opacity-70",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]",
            location.isPrimary
              ? "bg-cobalt-50 text-cobalt-600"
              : "bg-sand-100 text-sand-800",
          )}
        >
          <BuildingOffice2Icon className="h-6 w-6" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[17px] font-semibold tracking-[-0.035em] text-[#1F1F1F]">
              {location.name}
            </h2>
            {location.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cobalt-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-cobalt-600">
                <StarIcon className="h-3 w-3" aria-hidden="true" />
                {t("primary")}
              </span>
            )}
            <span
              className={cx(
                "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em]",
                location.isActive
                  ? "bg-[#E9F1E7] text-[#47613E]"
                  : "bg-[#F1EFEB] text-[#777773]",
              )}
            >
              {location.isActive ? t("active") : t("inactive")}
            </span>
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#777773]">
            <MapPinIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{address || t("noAddress")}</span>
          </p>
        </div>

        {canManage && (
          <Link
            href={getLocationEditHref(locationId, editSearchParams)}
            aria-label={t("edit")}
            aria-disabled={isBusy}
            tabIndex={isBusy ? -1 : undefined}
            onClick={(event) => {
              if (isBusy) event.preventDefault();
            }}
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[#555553] transition hover:border-line-strong hover:text-cobalt-600",
              isBusy && "pointer-events-none opacity-50",
            )}
          >
            <PencilSquareIcon
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-line py-4">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.11em] text-[#969691]">
            {t("timezone")}
          </dt>
          <dd className="mt-1 truncate text-xs font-semibold text-[#353533]">
            {location.booking?.timezone || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.11em] text-[#969691]">
            {t("capacity")}
          </dt>
          <dd className="mt-1 text-xs font-semibold text-[#353533]">
            {location.booking?.globalCapacity || 1}
          </dd>
        </div>
      </dl>

      {(canManage || canViewAccessCodes) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canViewAccessCodes ? (
            <Link
              href={`/app/settings/access-codes?location=${locationId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[10px] font-semibold text-[#555553] transition hover:border-cobalt-300 hover:text-cobalt-600"
            >
              <KeyIcon className="h-4 w-4" aria-hidden="true" />
              {t("accessCodes")}
            </Link>
          ) : null}
          {canManage && location.isActive && !location.isPrimary && (
            <button
              type="button"
              onClick={() => onAction("primary", locationId)}
              disabled={isBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[10px] font-semibold text-[#555553] transition hover:border-cobalt-300 hover:text-cobalt-600 disabled:opacity-50"
            >
              <CheckBadgeIcon className="h-4 w-4" aria-hidden="true" />
              {t("makePrimary")}
            </button>
          )}

          {canManage ? (
            <button
              type="button"
              onClick={() =>
                onAction(
                  location.isActive ? "deactivate" : "activate",
                  locationId,
                )
              }
              disabled={isBusy}
              className={cx(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold transition disabled:opacity-50",
                location.isActive
                  ? "border-line bg-white text-[#777773] hover:border-coral-200 hover:text-terracotta-600"
                  : "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E] hover:border-[#AFC9A8]",
              )}
            >
              {isBusy ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <PowerIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {location.isActive ? t("deactivate") : t("activate")}
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

export default function StudioLocationsPage({
  createHref = "/app/settings/locations/new",
  showPageHeader = true,
}) {
  const t = useTranslations("Locations");
  const searchParams = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenantId = getTenantIdFromUser(currentUser);
  const canManageLocations = hasPermission(
    workspaceAccess,
    PERMISSIONS.LOCATIONS_MANAGE,
  );
  const canViewAccessCodes = hasPermission(
    workspaceAccess,
    PERMISSIONS.ACCESS_CODES_VIEW,
  );
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState(null);

  const { data, isLoading, isError, refetch } = useGetLocationsQuery(
    { tenantId, limit: 100 },
    { skip: !tenantId },
  );
  const { data: tenantData } = useGetCurrentTenantOnboardingQuery(undefined, {
    skip: !canManageLocations,
  });

  const [setPrimary] = useSetPrimaryLocationMutation();
  const [activate] = useActivateLocationMutation();
  const [deactivate] = useDeactivateLocationMutation();

  const locations = useMemo(() => normalizeLocationsResponse(data), [data]);
  const activeCount = locations.filter((location) => location.isActive).length;
  const locationLimit = tenantData?.tenant?.limits?.locations ?? null;
  const handleAction = async (action, locationId) => {
    setActionError("");
    setBusyAction({ action, locationId });

    try {
      if (action === "primary") {
        await setPrimary(locationId).unwrap();
      } else if (action === "activate") {
        await activate(locationId).unwrap();
      } else {
        await deactivate(locationId).unwrap();
      }
    } catch (error) {
      setActionError(getRequestError(error, t("form.requestError")));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-5">
      <header
        className={
          showPageHeader
            ? "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        {showPageHeader ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#111111] sm:text-[34px]">
              {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#777773]">
              {t("description")}
            </p>
            {locationLimit !== null && (
              <p className="mt-2 text-[11px] font-medium text-[#777773]">
                {t("planUsage", {
                  used: activeCount,
                  limit: locationLimit,
                })}
              </p>
            )}
          </div>
        ) : locationLimit !== null ? (
          <p className="rounded-full border border-line bg-white px-4 py-2 text-[11px] font-medium text-[#777773]">
            {t("planUsage", {
              used: activeCount,
              limit: locationLimit,
            })}
          </p>
        ) : (
          <span aria-hidden="true" />
        )}

        {canManageLocations && (
          <Link
            href={createHref}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            {t("addLocation")}
          </Link>
        )}
      </header>

      {!isLoading && !isError && locations.length > 0 ? (
        <CustomerPortalLinks locations={locations} />
      ) : null}

      {actionError && (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {actionError}
        </p>
      )}

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2" aria-label={t("loading")}>
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-[260px] animate-pulse rounded-[20px] border border-line bg-white/70"
            />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-[20px] border border-dashed border-coral-200 bg-coral-50/50 px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-[#353533]">
            {t("loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[11px] font-semibold text-cobalt-600 shadow-xs"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            {t("retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && locations.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-line bg-white/65 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[15px] bg-coral-50 text-terracotta-600">
            <BuildingOffice2Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[16px] font-semibold text-[#252524]">
            {t("emptyTitle")}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#777773]">
            {t("emptyDescription")}
          </p>
        </div>
      )}

      {!isLoading && !isError && locations.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {locations.map((location) => (
            <LocationCard
              key={getLocationId(location)}
              location={location}
              canManage={canManageLocations}
              canViewAccessCodes={canViewAccessCodes}
              onAction={handleAction}
              busyAction={busyAction}
              editSearchParams={searchParams}
            />
          ))}
        </div>
      )}
    </section>
  );
}
