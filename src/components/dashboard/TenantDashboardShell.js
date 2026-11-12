"use client";

import {
  useCallback,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  getPrimaryLocation,
  getTenantIdFromUser,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { useGetCurrentTenantOnboardingQuery } from "@/lib/features/tenants/tenantApiSlice";
import { useGetSetupCenterQuery } from "@/lib/features/setup-center/setupCenterApiSlice";
import "@/styles/workspaceStudioTheme.css";
import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { getLaunchCenterNavigationStatus } from "@/components/setup-center/setupCenter.utils";

import DashboardMobileSidebar from "./DashboardMobileSidebar";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import WorkspaceRouteScrollReset from "./WorkspaceRouteScrollReset";
import { formatPlan } from "./dashboardPlan";
import {
  getWorkspaceRouteBrushVariant,
  isWorkspaceSettingsRoute,
} from "./workspaceRouteConfig";
import ContextualSetupGuide from "@/components/setup-center/ContextualSetupGuide";
import WorkspaceProductTour from "@/components/product-tour/WorkspaceProductTour";
import WorkspaceContextualGuides from "@/components/guides/WorkspaceContextualGuides";

const WORKSPACE_SIDEBAR_WIDTH = {
  collapsed: "72px",
  expanded: "224px",
};

const getInitials = (user) => {
  const firstName = user?.firstname || user?.firstName || "";

  const lastName = user?.lastname || user?.lastName || "";

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.trim();

  return initials.toUpperCase() || "SK";
};

export default function TenantDashboardShell({ children }) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useSelector(selectCurrentUser) || {};
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);

  const isAuthenticated = useSelector(selectIsAuthenticated);

  const activeStudioId = useSelector(selectActiveStudioId);

  const tenantId = getTenantIdFromUser(currentUser);
  const userId = String(currentUser.id || currentUser._id || "").trim();

  const canManageStudios = hasPermission(
    workspaceAccess,
    PERMISSIONS.LOCATIONS_MANAGE,
  );

  const canUseSetupCenter = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_UPDATE,
  );
  const setupCenterQuery = useGetSetupCenterQuery(undefined, {
    skip: !canUseSetupCenter,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const launchCenterStatus = setupCenterQuery.isSuccess
    ? getLaunchCenterNavigationStatus(
        setupCenterQuery.currentData ?? setupCenterQuery.data,
      )
    : null;

  const [navigationOpen, setNavigationOpen] = useState(false);
  const mobileNavigationId = `workspace-mobile-navigation-${useId().replaceAll(
    ":",
    "",
  )}`;
  const sidebarStorageKey =
    tenantId && userId
      ? `shario:workspace-sidebar:v1:${tenantId}:${userId}`
      : "";
  const subscribeToSidebarPreference = useCallback((onStoreChange) => {
    if (typeof window === "undefined") return () => {};

    window.addEventListener("storage", onStoreChange);
    window.addEventListener("shario:workspace-sidebar-change", onStoreChange);

    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(
        "shario:workspace-sidebar-change",
        onStoreChange,
      );
    };
  }, []);
  const getSidebarPreference = useCallback(() => {
    if (!sidebarStorageKey || typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(sidebarStorageKey) === "collapsed";
    } catch {
      return false;
    }
  }, [sidebarStorageKey]);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => false,
  );

  const { data: tenantData } = useGetCurrentTenantOnboardingQuery(undefined, {
    skip: !isAuthenticated || !canManageStudios,
  });

  const {
    data: locationsData,
    isLoading: isStudioLoading,
    isError: isStudioError,
    refetch: refetchStudios,
  } = useGetLocationsQuery(
    {
      tenantId,
      isActive: true,
      limit: 100,
    },
    {
      skip: !isAuthenticated || !tenantId,
    },
  );

  const tenant = tenantData?.tenant || tenantData || null;

  const studios = useMemo(
    () => normalizeLocationsResponse(locationsData),
    [locationsData],
  );

  const activeStudio = useMemo(() => {
    return (
      studios.find((studio) => getLocationId(studio) === activeStudioId) ||
      getPrimaryLocation(studios) ||
      null
    );
  }, [activeStudioId, studios]);
  const resolvedActiveStudioId = activeStudio
    ? getLocationId(activeStudio)
    : null;

  const firstName =
    currentUser.firstname ||
    currentUser.firstName ||
    currentUser.name?.split(" ")?.[0] ||
    "";

  /*
   * The topbar should show the globally selected
   * studio, not merely the tenant name.
   */
  const studioName =
    activeStudio?.name ||
    tenant?.name ||
    currentUser.tenantName ||
    t("fallbackStudioName");

  const plan = tenant?.plan || currentUser.tenantPlan;

  const planLabel = formatPlan(plan, t);

  const studioLimit =
    tenant?.limits?.locations ?? tenantData?.limits?.locations ?? null;

  const closeNavigation = useCallback(() => {
    setNavigationOpen(false);
  }, []);

  const openNavigation = useCallback(() => {
    setNavigationOpen(true);
  }, []);

  const handleAddStudio = useCallback(() => {
    router.push("/app/settings/locations/new");
  }, [router]);

  const handleUpgradePlan = useCallback(() => {
    router.push("/app/settings/billing");
  }, [router]);

  const toggleSidebar = useCallback(() => {
    if (!sidebarStorageKey || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        sidebarStorageKey,
        sidebarCollapsed ? "expanded" : "collapsed",
      );
      window.dispatchEvent(new Event("shario:workspace-sidebar-change"));
    } catch {
      // Storage is an enhancement; navigation remains fully functional.
    }
  }, [sidebarCollapsed, sidebarStorageKey]);

  const normalizedPathname =
    pathname?.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const settingsRouteCompact = isWorkspaceSettingsRoute(normalizedPathname);
  const effectiveSidebarCollapsed = settingsRouteCompact || sidebarCollapsed;
  const workspaceSidebarWidth = effectiveSidebarCollapsed
    ? WORKSPACE_SIDEBAR_WIDTH.collapsed
    : WORKSPACE_SIDEBAR_WIDTH.expanded;
  const useFullWorkspaceWidth =
    normalizedPathname === "/app/calendar" ||
    normalizedPathname?.endsWith("/app/calendar");
  const workspaceBrushVariant =
    getWorkspaceRouteBrushVariant(normalizedPathname);

  return (
    <div
      data-workspace-ui="true"
      data-skab-workspace-surface
      className="relative isolate min-h-dvh overflow-clip bg-canvas text-ink"
      style={{ "--workspace-sidebar-width": workspaceSidebarWidth }}
    >
      <WorkspaceRouteScrollReset />
      <WorkspaceProductTour
        eligible={Boolean(workspaceAccess) && canUseSetupCenter}
        studioCount={studios.length}
      />
      <WorkspaceContextualGuides productTourEligible={canUseSetupCenter} />

      {workspaceBrushVariant ? (
        <WorkspaceBrushField
          layer="background"
          variant={workspaceBrushVariant}
          className="opacity-75"
        />
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--workspace-sidebar-width)] border-r border-line bg-surface-panel transition-[width] duration-200 motion-reduce:transition-none xl:block">
        <DashboardSidebar
          collapsed={effectiveSidebarCollapsed}
          instanceId="desktop"
          canUseSetupCenter={canUseSetupCenter}
          launchCenterStatus={launchCenterStatus}
          onToggleCollapsed={settingsRouteCompact ? undefined : toggleSidebar}
        />
      </aside>

      <DashboardMobileSidebar
        open={navigationOpen}
        onClose={closeNavigation}
        panelId={mobileNavigationId}
        studios={studios}
        tenantId={tenantId}
        studioLimit={studioLimit}
        canManageStudios={canManageStudios}
        isStudioLoading={isStudioLoading}
        isStudioError={isStudioError}
        planLabel={planLabel}
        canUseSetupCenter={canUseSetupCenter}
        launchCenterStatus={launchCenterStatus}
        onAddStudio={handleAddStudio}
        onUpgradePlan={handleUpgradePlan}
        onRetryStudios={refetchStudios}
      />

      <div className="relative z-10 min-h-dvh min-w-0 transition-[padding] duration-200 motion-reduce:transition-none xl:pl-[var(--workspace-sidebar-width)]">
        <DashboardTopbar
          firstName={firstName}
          initials={getInitials(currentUser)}
          studioName={studioName}
          studios={studios}
          activeStudioId={resolvedActiveStudioId}
          tenantId={tenantId}
          studioLimit={studioLimit}
          canManageStudios={canManageStudios}
          canUseProductTour={canUseSetupCenter}
          isStudioLoading={isStudioLoading}
          isStudioError={isStudioError}
          planLabel={planLabel}
          onOpenNavigation={openNavigation}
          navigationOpen={navigationOpen}
          mobileNavigationId={mobileNavigationId}
          fullWidth={useFullWorkspaceWidth}
          onAddStudio={handleAddStudio}
          onUpgradePlan={handleUpgradePlan}
          onRetryStudios={refetchStudios}
        />

        <main
          id="workspace-main"
          tabIndex={-1}
          data-workspace-layout={
            useFullWorkspaceWidth ? "edge-to-edge" : "contained"
          }
          className={
            useFullWorkspaceWidth
              ? "w-full min-w-0 outline-none"
              : "mx-auto w-full min-w-0 max-w-[1680px] px-4 pb-10 pt-5 outline-none sm:px-6 lg:px-8 2xl:px-10"
          }
        >
          {canUseSetupCenter && !useFullWorkspaceWidth ? (
            <ContextualSetupGuide />
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
