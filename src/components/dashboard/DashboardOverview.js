"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import SetupCenterWidget from "@/components/setup-center/SetupCenterWidget";
import StripeConnectSetupBanner from "@/components/dashboard/StripeConnectSetupBanner";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { useGetDashboardOverviewQuery } from "@/lib/features/dashboard/dashboardApiSlice";
import { useGetSetupCenterQuery } from "@/lib/features/setup-center/setupCenterApiSlice";
import { useUpdateWorkspacePreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  getOverviewSetupPresentation,
  hasIncompleteSetupStep,
} from "@/components/setup-center/setupCenter.utils";

import { AiOpportunityCard, BusinessPulseCard } from "./overview/BusinessPulse";
import styles from "./overview/overview.module.css";
import FirstBookingSuccess from "./overview/FirstBookingSuccess";
import { OverviewError, OverviewSkeleton } from "./overview/OverviewStates";
import StudioBriefingHero from "./overview/StudioBriefingHero";
import StudioFlowRail from "./overview/StudioFlowRail";
import StudioSignals from "./overview/StudioSignals";
import TodayRhythm from "./overview/TodayRhythm";
import {
  getLocalDateKey,
  normalizeOverview,
  normalizeOverviewDateKey,
} from "./overview/overview.utils";

const moduleEnabled = (modules, key) => modules?.[key] !== false;

export default function DashboardOverview() {
  const t = useTranslations("Dashboard.overview");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeLocationId = useSelector(selectActiveStudioId);
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const modules = tenant?.modules;
  const bookingsEnabled = moduleEnabled(modules, "bookings");
  const paymentsEnabled = moduleEnabled(modules, "payments");
  const coursesEnabled = moduleEnabled(modules, "courses");
  const bookingWorkflowEnabled = bookingsEnabled || coursesEnabled;
  const aiEnabled = moduleEnabled(modules, "ai");
  const showOpportunity = aiEnabled && bookingWorkflowEnabled;
  const canOpenAdvisor = hasPermission(workspaceAccess, PERMISSIONS.AI_USE);
  const canUseSetupCenter = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_UPDATE,
  );
  const [setupCenterLocallyDismissed, setSetupCenterLocallyDismissed] =
    useState(false);
  const [
    firstBookingCelebrationLocallySeen,
    setFirstBookingCelebrationLocallySeen,
  ] = useState(false);
  const [updateWorkspacePreferences] = useUpdateWorkspacePreferencesMutation();
  const setupCenterDismissed =
    workspaceAccess?.preferences?.overviewLaunchCenterDismissed === true ||
    setupCenterLocallyDismissed;
  const setupCenterQuery = useGetSetupCenterQuery(undefined, {
    skip: !canUseSetupCenter || setupCenterDismissed,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const setupCenter =
    setupCenterQuery.currentData ?? setupCenterQuery.data ?? null;
  const setupCenterVisible =
    canUseSetupCenter &&
    !setupCenterDismissed &&
    setupCenterQuery.isError !== true;
  const setupCenterLoading =
    setupCenterVisible && (setupCenterQuery.isLoading || !setupCenter);
  const setupPresentation = getOverviewSetupPresentation(setupCenter);
  const showGuidedSetup =
    setupCenterVisible &&
    (setupCenterLoading || setupPresentation === "guided");
  const showCompactSetup =
    setupCenterVisible &&
    !setupCenterLoading &&
    setupPresentation === "compact";
  const suppressPaymentSetupReminder =
    setupCenterVisible &&
    (setupCenterLoading || hasIncompleteSetupStep(setupCenter, "payments"));
  const requestedDate = normalizeOverviewDateKey(searchParams.get("date"));
  const searchParamsKey = searchParams.toString();
  const [dateSelection, setDateSelection] = useState(() => ({
    searchParamsKey,
    value: requestedDate ?? "",
  }));
  const [dateNavigationEngaged, setDateNavigationEngaged] = useState(() =>
    Boolean(requestedDate),
  );
  if (dateSelection.searchParamsKey !== searchParamsKey) {
    setDateSelection({
      searchParamsKey,
      value: requestedDate ?? "",
    });
  }
  const selectedDate = dateSelection.value;
  const timezone = tenant?.settings?.timezone;
  const [todayClock, setTodayClock] = useState(() => Date.now());
  const todayDate = useMemo(
    () => getLocalDateKey(new Date(todayClock), timezone),
    [timezone, todayClock],
  );
  const date = selectedDate || todayDate;

  useEffect(() => {
    const refreshTodayDate = () => setTodayClock(Date.now());
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refreshTodayDate();
    };
    const interval = window.setInterval(refreshTodayDate, 60_000);

    refreshTodayDate();
    window.addEventListener("focus", refreshTodayDate);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshTodayDate);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const handleDateChange = useCallback(
    (nextDate) => {
      const normalizedDate = normalizeOverviewDateKey(nextDate);
      if (!normalizedDate) return;

      setDateNavigationEngaged(true);
      setDateSelection({
        searchParamsKey,
        value: normalizedDate === todayDate ? "" : normalizedDate,
      });

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (normalizedDate === todayDate) {
        nextSearchParams.delete("date");
      } else {
        nextSearchParams.set("date", normalizedDate);
      }

      const queryString = nextSearchParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, searchParamsKey, todayDate],
  );

  const query = useGetDashboardOverviewQuery(
    {
      date,
      ...(activeLocationId ? { locationId: activeLocationId } : {}),
    },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const overviewData = query.currentData ?? null;
  const hasPreviousOverviewData = Boolean(query.data);
  const shouldKeepDateShell =
    dateNavigationEngaged || hasPreviousOverviewData || Boolean(selectedDate);
  const isOverviewRefreshing =
    !overviewData &&
    shouldKeepDateShell &&
    !query.isError &&
    (query.isLoading || query.isFetching);
  const isOverviewRefreshError =
    !overviewData && shouldKeepDateShell && query.isError;
  const overview = useMemo(
    () => normalizeOverview(overviewData),
    [overviewData],
  );
  const firstBookingMilestone = overview.milestones.firstCustomerBooking;
  const showFirstBookingSuccess =
    bookingWorkflowEnabled &&
    firstBookingMilestone.applicable &&
    firstBookingMilestone.available &&
    firstBookingMilestone.achieved === true &&
    workspaceAccess?.preferences?.firstBookingCelebrationSeen !== true &&
    !firstBookingCelebrationLocallySeen;
  const dateControlValue = date;
  const paymentSetupBanner = paymentsEnabled ? (
    <StripeConnectSetupBanner
      suppressSetupReminder={suppressPaymentSetupReminder}
    />
  ) : null;
  const dismissSetupCenter = () => setSetupCenterLocallyDismissed(true);
  const dismissFirstBookingSuccess = () => {
    setFirstBookingCelebrationLocallySeen(true);
    void updateWorkspacePreferences({
      firstBookingCelebrationSeen: true,
    })
      .unwrap()
      .catch(() => null);
  };

  return (
    <div data-product-tour-target="overview" className={styles.overview}>
      {isOverviewRefreshing || isOverviewRefreshError ? (
        <div className="space-y-5">
          <div
            data-overview-briefing-loading
            className="h-[176px] animate-pulse rounded-[22px] border border-[var(--studio-rule)] bg-[var(--studio-white)]"
            aria-hidden="true"
          />
          <StudioFlowRail
            dateValue={dateControlValue}
            isLoading={isOverviewRefreshing}
            isToday={dateControlValue === todayDate}
            isUnavailable={isOverviewRefreshError}
            modules={modules}
            onDateChange={handleDateChange}
            onRetry={query.refetch}
            stages={[]}
            todayValue={todayDate}
          />
          {showGuidedSetup ? (
            <SetupCenterWidget
              presentation="guided"
              onDismiss={dismissSetupCenter}
            />
          ) : null}
          {showCompactSetup ? (
            <SetupCenterWidget
              presentation="compact"
              onDismiss={dismissSetupCenter}
            />
          ) : null}
          {paymentSetupBanner}
        </div>
      ) : (query.isLoading || query.isFetching) && !overviewData ? (
        <div className="space-y-5">
          <OverviewSkeleton />
          {showGuidedSetup ? (
            <SetupCenterWidget
              presentation="guided"
              onDismiss={dismissSetupCenter}
            />
          ) : null}
          {paymentSetupBanner}
        </div>
      ) : query.isError && !overviewData ? (
        <div className="space-y-5">
          <OverviewError onRetry={query.refetch} />
          {showGuidedSetup ? (
            <SetupCenterWidget
              presentation="guided"
              onDismiss={dismissSetupCenter}
            />
          ) : null}
          {paymentSetupBanner}
        </div>
      ) : (
        <div className="space-y-5">
          <StudioBriefingHero overview={overview} />

          <StudioFlowRail
            dateValue={dateControlValue}
            isToday={dateControlValue === todayDate}
            modules={modules}
            onDateChange={handleDateChange}
            stages={overview.flow}
            todayValue={todayDate}
          />

          {showFirstBookingSuccess ? (
            <FirstBookingSuccess onDismiss={dismissFirstBookingSuccess} />
          ) : null}

          {showGuidedSetup ? (
            <SetupCenterWidget
              presentation="guided"
              onDismiss={dismissSetupCenter}
            />
          ) : null}

          {showCompactSetup ? (
            <SetupCenterWidget
              presentation="compact"
              onDismiss={dismissSetupCenter}
            />
          ) : null}

          {paymentSetupBanner}

          {bookingWorkflowEnabled ? (
            <div className={styles.businessGrid}>
              <TodayRhythm
                dateValue={dateControlValue}
                isToday={dateControlValue === todayDate}
                today={overview.today}
                timezone={overview.metadata.timezone}
              />
              <div className="grid min-w-0 content-start gap-5">
                <BusinessPulseCard pulse={overview.businessPulse} />
                {showOpportunity ? (
                  <AiOpportunityCard
                    opportunity={overview.opportunity}
                    canOpenAdvisor={canOpenAdvisor}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          <StudioSignals
            signals={overview.signals}
            timezone={overview.metadata.timezone}
            modules={modules}
          />

          {!overview.coverage.complete ? (
            <p className="px-1 text-xs leading-5 text-[var(--studio-muted)]">
              {t("partialCoverage", {
                count: overview.coverage.unavailable.length,
              })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
