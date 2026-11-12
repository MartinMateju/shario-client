"use client";

import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Link } from "@/i18n/navigation";
import { useGetLocationByIdQuery } from "@/lib/features/locations/locationApiSlice";
import { isMongoObjectId } from "@/lib/features/locations/location.utils";
import { useGetCurrentTenantOnboardingQuery } from "@/lib/features/tenants/tenantApiSlice";

import StudioLocationCreatePage from "./StudioLocationCreatePage";
import { getLocationListHref } from "./locations.navigation";

export default function StudioLocationEditPage({ locationId }) {
  const t = useTranslations("Locations");
  const searchParams = useSearchParams();
  const normalizedLocationId = String(locationId || "").trim();
  const validLocationId = isMongoObjectId(normalizedLocationId);
  const guidedSetup = searchParams.get("setupStep") === "location";
  const returnHref = useMemo(
    () => getLocationListHref(searchParams, { clearSetupStep: true }),
    [searchParams],
  );
  const locationQuery = useGetLocationByIdQuery(normalizedLocationId, {
    skip: !validLocationId,
  });
  const tenantQuery = useGetCurrentTenantOnboardingQuery(undefined, {
    skip: !guidedSetup,
  });

  const location =
    locationQuery.currentData?.location ?? locationQuery.currentData;
  const waitingForGuidedConfiguration =
    guidedSetup &&
    !tenantQuery.data?.tenant &&
    (tenantQuery.isLoading || tenantQuery.isFetching);
  const tenantModules = tenantQuery.data?.tenant?.modules;
  const requireBookingEnabled =
    guidedSetup &&
    !waitingForGuidedConfiguration &&
    (tenantModules?.bookings !== false || tenantModules?.courses === true);

  if (
    (!location && (locationQuery.isLoading || locationQuery.isFetching)) ||
    waitingForGuidedConfiguration
  ) {
    return (
      <div
        className="mx-auto max-w-[1180px]"
        aria-label={t("loading")}
        aria-busy="true"
      >
        <div className="h-5 w-40 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-5 h-10 w-72 max-w-full animate-pulse rounded-xl bg-surface-muted" />
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {[180, 280, 220].map((height) => (
              <div
                key={height}
                className="animate-pulse rounded-[22px] border border-line bg-white"
                style={{ height }}
              />
            ))}
          </div>
          <div className="h-[360px] animate-pulse rounded-[22px] border border-line bg-white" />
        </div>
      </div>
    );
  }

  // A save invalidates this query even when it fails. Keep the current editor
  // mounted during refetches so its draft and request error survive the retry.
  if (!validLocationId || !location) {
    return (
      <div className="mx-auto max-w-[760px]">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 text-[11px] font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("createPage.back")}
        </Link>
        <section className="mt-5 rounded-[22px] border border-dashed border-coral-200 bg-coral-50/50 px-6 py-12 text-center">
          <h1 className="text-[20px] font-semibold tracking-[-0.04em] text-ink">
            {t("loadError")}
          </h1>
          {validLocationId ? (
            <button
              type="button"
              onClick={() => locationQuery.refetch()}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-cobalt-600 transition hover:border-cobalt-200 hover:bg-cobalt-50"
            >
              <ArrowPathIcon aria-hidden="true" className="size-4" />
              {t("retry")}
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <StudioLocationCreatePage
      key={normalizedLocationId}
      location={location}
      requireBookingEnabled={requireBookingEnabled}
    />
  );
}
