"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import useIsCustomerSurfaceReady from "@/components/auth/useIsCustomerSurfaceReady";
import { getCustomerVoucherShopHref } from "@/utils/customerVoucherRouting";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenantId,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { useGetCustomerLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { closeSidebar } from "@/lib/features/config/configSlice";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import {
  getPortalLocationReference,
  getPortalLocationReferenceFromSearchParams,
  normalizePortalLocationReference,
  resolvePortalLocationSelection,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";
import PortalLocationChooser from "./PortalLocationChooser";
import {
  CUSTOMER_SHELL_SURFACES,
  getCustomerShellSurface,
} from "./customerShell.config";

const CustomerPortalLocationContext = createContext(null);

const LOCATION_PREFERENCE_EVENT = "shario:customer-portal-location-change";

const subscribeToLocationPreference = (onStoreChange) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCATION_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCATION_PREFERENCE_EVENT, onStoreChange);
  };
};

const copy = {
  en: {
    changed: (studio) => `Current studio changed to ${studio}.`,
    errorDescription: "Check your connection and try again.",
    errorTitle: "Your studios could not be loaded",
    loading: "Loading your studios…",
    retry: "Try again",
  },
  cs: {
    changed: (studio) => `Aktuální studio bylo změněno na ${studio}.`,
    errorDescription: "Zkontrolujte připojení a zkuste to znovu.",
    errorTitle: "Studia se nepodařilo načíst",
    loading: "Načítáme vaše studia…",
    retry: "Zkusit znovu",
  },
};

const buildCurrentPortalHref = ({ pathname, queryString, location }) => {
  const path = pathname || "/portal";
  const href = queryString ? `${path}?${queryString}` : path;

  return retainCustomerPortalLocation(
    href,
    getPortalLocationReference(location),
  );
};

export default function CustomerPortalLocationProvider({ children }) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const currentTenantId = useSelector(selectCurrentTenantId);
  const currentUser = useSelector(selectCurrentUser);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() || "";
  const requestedReference =
    getPortalLocationReferenceFromSearchParams(searchParams);
  const hasLegacyLocationParam = searchParams?.has("locationId") === true;
  const hasRequestedReference =
    searchParams?.has("location") === true || hasLegacyLocationParam;
  const isVoucherShopRoute = Boolean(
    getCustomerVoucherShopHref(pathname, searchParams),
  );
  const isPortalSurface =
    getCustomerShellSurface(CUSTOMER_SHELL_SURFACES.PORTAL, pathname) ===
    CUSTOMER_SHELL_SURFACES.PORTAL;
  // Payment returns still need location capabilities for a valid return link,
  // but must not be blocked by the location chooser or canonical redirects.
  const isPortalRoute =
    pathname === "/portal" || pathname?.startsWith("/portal/");
  const localizedCopy = copy[locale === "cs" ? "cs" : "en"];
  const [announcement, setAnnouncement] = useState("");
  const [isSwitching, startLocationTransition] = useTransition();
  const tenantCacheKey = String(currentTenantId || "");
  // The provider wraps the studio shell, which renders before the session
  // check in the portal boundary has finished.
  const customerSurfaceReady = useIsCustomerSurfaceReady();
  const userId = String(currentUser?.id || currentUser?._id || "");
  const preferenceKey =
    customerSurfaceReady && tenantCacheKey && userId
      ? `shario:customer-portal-location:v1:${tenantCacheKey}:${userId}`
      : "";
  const getSavedLocation = useCallback(() => {
    if (!preferenceKey || typeof window === "undefined") return "";
    try {
      return normalizePortalLocationReference(
        window.localStorage.getItem(preferenceKey),
      );
    } catch {
      return "";
    }
  }, [preferenceKey]);
  const savedLocationReference = useSyncExternalStore(
    subscribeToLocationPreference,
    getSavedLocation,
    () => "",
  );

  const {
    currentData: data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetCustomerLocationsQuery(
    { tenantId: tenantCacheKey },
    {
      skip: !isPortalRoute || !customerSurfaceReady,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    },
  );
  const locations = useMemo(() => normalizeLocationsResponse(data), [data]);
  const selection = useMemo(
    () =>
      resolvePortalLocationSelection({
        locations,
        requestedReference,
        hasRequestedReference,
        selectedLocationId: savedLocationReference,
      }),
    [
      locations,
      requestedReference,
      hasRequestedReference,
      savedLocationReference,
    ],
  );
  const activeLocation = selection.location || null;
  const activeLocationId = getLocationId(activeLocation);
  const activeLocationReference =
    getPortalLocationReference(activeLocation) ||
    (!isPortalSurface ? requestedReference || savedLocationReference : "");

  const rememberLocation = useCallback(
    (locationReference) => {
      const reference = normalizePortalLocationReference(locationReference);
      if (!preferenceKey || !reference) return;
      try {
        if (window.localStorage.getItem(preferenceKey) === reference) return;
        window.localStorage.setItem(preferenceKey, reference);
        window.dispatchEvent(new Event(LOCATION_PREFERENCE_EVENT));
      } catch {
        // Browsers may block storage; explicit location URLs still work.
      }
    },
    [preferenceKey],
  );

  useEffect(() => {
    if (
      !isPortalSurface ||
      !preferenceKey ||
      !activeLocationId ||
      isLoading ||
      isError
    )
      return;

    // Only remember a location validated against this customer's studio list.
    // The URL remains authoritative; this is the fallback for a bare /portal.
    rememberLocation(activeLocationId);
  }, [
    activeLocationId,
    isError,
    isLoading,
    isPortalSurface,
    preferenceKey,
    rememberLocation,
  ]);

  const selectLocation = useCallback(
    (locationId) => {
      const location = selection.availableLocations.find(
        (item) => getLocationId(item) === String(locationId || ""),
      );

      if (!location) return false;

      const nextHref = buildCurrentPortalHref({
        pathname,
        queryString,
        location,
      });

      dispatch(closeSidebar());
      setAnnouncement(localizedCopy.changed(location.name));
      startLocationTransition(() => {
        router.replace(nextHref, { scroll: false });
      });

      return true;
    },
    [
      dispatch,
      localizedCopy,
      pathname,
      queryString,
      router,
      selection.availableLocations,
    ],
  );

  useEffect(() => {
    if (
      !isPortalSurface ||
      !customerSurfaceReady ||
      isVoucherShopRoute ||
      !selection.location ||
      isLoading ||
      isError ||
      (requestedReference === activeLocationReference &&
        !hasLegacyLocationParam)
    ) {
      return;
    }

    router.replace(
      buildCurrentPortalHref({
        pathname,
        queryString,
        location: selection.location,
      }),
      { scroll: false },
    );
  }, [
    activeLocationReference,
    customerSurfaceReady,
    hasLegacyLocationParam,
    isError,
    isLoading,
    isPortalSurface,
    isVoucherShopRoute,
    pathname,
    queryString,
    requestedReference,
    router,
    selection.location,
  ]);

  const value = useMemo(
    () => ({
      activeLocation,
      activeLocationId,
      activeLocationReference,
      hasMultipleLocations: selection.availableLocations.length > 1,
      isError: isPortalSurface && isError,
      isFetching: isPortalSurface && isFetching,
      isLoading: isPortalSurface && (isLoading || (!data && isFetching)),
      isPortalSurface,
      isSwitching,
      locations: selection.availableLocations,
      reason: selection.reason,
      refetch,
      rememberLocation,
      selectLocation,
    }),
    [
      activeLocation,
      activeLocationId,
      activeLocationReference,
      data,
      isError,
      isFetching,
      isLoading,
      isPortalSurface,
      isSwitching,
      refetch,
      rememberLocation,
      selectLocation,
      selection.availableLocations,
      selection.reason,
    ],
  );

  return (
    <CustomerPortalLocationContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CustomerPortalLocationContext.Provider>
  );
}

function PortalLocationState({ title, description, actionLabel, onAction }) {
  return (
    <main
      className="flex min-h-[calc(100dvh-var(--header-height,78px))] items-center justify-center px-5 py-12"
      style={{
        backgroundColor: "var(--tenant-background)",
        color: "var(--tenant-text)",
      }}
    >
      <section
        className="w-full max-w-lg rounded-[26px] border p-7 text-center shadow-[0_22px_70px_rgba(31,27,24,0.08)] sm:p-9"
        style={{
          backgroundColor: "var(--tenant-surface)",
          borderColor:
            "color-mix(in srgb, var(--tenant-text-on-surface) 14%, transparent)",
          color: "var(--tenant-text-on-surface)",
        }}
      >
        <h1 className="font-serif text-[30px] font-normal tracking-[-0.045em] sm:text-[36px]">
          {title}
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-sm leading-6"
          style={{ color: "var(--tenant-muted-on-surface)" }}
        >
          {description}
        </p>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 min-h-11 rounded-full px-6 text-[12px] font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: "var(--tenant-accent)",
              color: "var(--tenant-accent-foreground)",
              "--tw-ring-color": "var(--tenant-accent-on-surface)",
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

export function CustomerPortalLocationGate({ children }) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = useCustomerPortalLocation();
  const localizedCopy = copy[locale === "cs" ? "cs" : "en"];

  // Vouchers belong to the whole tenant, so buying one does not require choosing
  // a studio or waiting for customer location data to load.
  if (
    !context.isPortalSurface ||
    getCustomerVoucherShopHref(pathname, searchParams)
  )
    return children;

  if (context.isLoading) {
    return (
      <main
        className="flex min-h-[calc(100dvh-var(--header-height,78px))] items-center justify-center px-5"
        style={{
          backgroundColor: "var(--tenant-background)",
          color: "var(--tenant-muted-text)",
        }}
      >
        <p className="text-sm font-medium" role="status">
          {localizedCopy.loading}
        </p>
      </main>
    );
  }

  if (context.isError) {
    return (
      <PortalLocationState
        title={localizedCopy.errorTitle}
        description={localizedCopy.errorDescription}
        actionLabel={localizedCopy.retry}
        onAction={context.refetch}
      />
    );
  }

  if (["required", "unavailable"].includes(context.reason)) {
    return (
      <PortalLocationChooser
        locations={context.locations}
        reason={context.reason}
        onSelect={context.selectLocation}
      />
    );
  }

  return children;
}

export const useOptionalCustomerPortalLocation = () =>
  useContext(CustomerPortalLocationContext);

export const useCustomerPortalLocation = () => {
  const context = useOptionalCustomerPortalLocation();

  if (!context) {
    throw new Error(
      "useCustomerPortalLocation must be used within a CustomerPortalLocationProvider.",
    );
  }

  return context;
};
