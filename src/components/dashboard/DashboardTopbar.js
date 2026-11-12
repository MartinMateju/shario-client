"use client";

import {
  Bars3Icon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import UserProfileMenu from "@/components/headers/UserProfileMenu";
import WorkspaceNotificationMenu from "@/components/notifications/WorkspaceNotificationMenu";
import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useAiWorkspace } from "@/components/ai/AiWorkspaceProvider";

import {
  getWorkspaceRouteTitleKey,
  isWorkspaceOverviewRoute,
} from "./workspaceRouteConfig";
import StudioSwitcher from "./StudioSwitcher";
import WorkspaceHelpMenu from "./WorkspaceHelpMenu";
import {
  getBrowserTimeZone,
  formatGreetingName,
  getGreetingPeriod,
  getGreetingTranslationKey,
  getTimeOfDayIcon,
  resolveDashboardTimeZone,
} from "@/lib/features/dashboard/dashboardGreeting";
import UtilityTooltip from "@/components/tooltips/UtilityTooltip";
import styles from "./dashboardShell.module.css";

const MINUTE_IN_MS = 60 * 1000;

const TIME_ICON_COMPONENTS = Object.freeze({
  moon: MoonIcon,
  sun: SunIcon,
});

const useMountedMinuteClock = () => {
  const [now, setNow] = useState(null);
  const [browserTimeZone, setBrowserTimeZone] = useState(null);

  useEffect(() => {
    let minuteTimer;

    const refresh = () => {
      setNow(Date.now());
      setBrowserTimeZone(getBrowserTimeZone());
    };

    const scheduleNextMinute = () => {
      window.clearTimeout(minuteTimer);

      const delay = MINUTE_IN_MS - (Date.now() % MINUTE_IN_MS) + 25;
      minuteTimer = window.setTimeout(() => {
        refresh();
        scheduleNextMinute();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
        scheduleNextMinute();
      }
    };

    refresh();
    scheduleNextMinute();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(minuteTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { browserTimeZone, now };
};

export default function DashboardTopbar({
  firstName,
  initials,
  studioName,
  studios = [],
  activeStudioId = null,
  tenantId,
  studioLimit = null,
  canManageStudios = false,
  canUseProductTour = false,
  isStudioLoading = false,
  isStudioError = false,
  planLabel,
  onOpenNavigation,
  navigationOpen = false,
  mobileNavigationId,
  fullWidth = false,
  onStudioChange,
  onAddStudio,
  onUpgradePlan,
  onRetryStudios,
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const aiWorkspace = useAiWorkspace();

  const isOverviewRoute = isWorkspaceOverviewRoute(pathname);
  const { browserTimeZone, now } = useMountedMinuteClock();
  const resolvedTimeZone = resolveDashboardTimeZone({
    workspaceTimeZone: workspaceAccess?.preferences?.displayTimezone,
    browserTimeZone,
    tenantTimeZone: tenant?.settings?.timezone,
  });
  const greetingPeriod =
    now !== null
      ? getGreetingPeriod(new Date(now), resolvedTimeZone)
      : "neutral";
  const routeTitleKey = getWorkspaceRouteTitleKey(pathname, searchParams);
  const greetingName =
    formatGreetingName(firstName, locale) || t("fallbackFirstName");
  const heading = isOverviewRoute
    ? t(getGreetingTranslationKey(greetingPeriod), { name: greetingName })
    : t(routeTitleKey);
  const mobileHeading = isOverviewRoute ? t("nav.overview") : heading;
  const dashboardIcon = now !== null ? getTimeOfDayIcon(greetingPeriod) : null;
  const DashboardTimeIcon = TIME_ICON_COMPONENTS[dashboardIcon] ?? null;

  return (
    <header
      data-workspace-topbar
      className={`sticky top-0 z-30 isolate border-b border-line ${styles.topbar}`}
    >
      <div
        data-workspace-topbar-row
        className={[
          "relative z-10 mx-auto flex min-h-16 w-full min-w-0 flex-nowrap items-center gap-1 px-3 min-[360px]:gap-1.5 sm:px-6 md:min-h-[72px] md:gap-3 xl:gap-4 lg:px-8 2xl:px-10",
          fullWidth ? "" : "max-w-[1680px]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-expanded={navigationOpen}
          aria-controls={mobileNavigationId}
          aria-haspopup="dialog"
          data-mobile-navigation-trigger
          className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center border transition active:scale-[0.97] motion-reduce:transform-none xl:hidden ${styles.utilityButton}`}
          aria-label={t("openNavigation")}
        >
          <Bars3Icon
            className="h-5 w-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1
              aria-label={heading}
              className="min-w-0 truncate text-[13px] font-medium tracking-[-0.01em] text-[var(--studio-ink)] min-[360px]:text-[14px] md:text-[24px] md:tracking-[-0.026em] md:text-[var(--studio-ink)] 2xl:text-[26px]"
            >
              <span
                aria-hidden="true"
                data-mobile-topbar-title
                className="block truncate md:hidden"
              >
                {mobileHeading}
              </span>
              <span aria-hidden="true" className="hidden md:inline">
                {heading}
              </span>
            </h1>

            {isOverviewRoute && DashboardTimeIcon ? (
              <span
                aria-hidden="true"
                data-dashboard-icon="time"
                data-time-icon={dashboardIcon}
                className={[
                  "hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-[0_5px_14px_rgba(17,17,15,0.06)] md:inline-flex",
                  dashboardIcon === "sun"
                    ? "border-[var(--studio-rule)] bg-[var(--studio-soft)] text-[var(--studio-clay)]"
                    : "border-[var(--studio-rule)] bg-[var(--color-primary-soft)] text-[var(--studio-blue)]",
                ].join(" ")}
              >
                <DashboardTimeIcon className="h-5 w-5" strokeWidth={1.75} />
              </span>
            ) : null}
          </div>

          {isOverviewRoute ? (
            <p className="mt-1 hidden truncate text-[12px] text-[var(--studio-muted)] md:block">
              {t("subheading")}
            </p>
          ) : null}
        </div>

        <div
          data-studio-switcher-slot
          className="hidden w-[clamp(220px,22vw,320px)] shrink-0 lg:block"
        >
          <StudioSwitcher
            studios={studios}
            tenantId={tenantId}
            studioLimit={studioLimit}
            canManageStudios={canManageStudios}
            isLoading={isStudioLoading}
            isError={isStudioError}
            planLabel={planLabel}
            variant="topbar"
            onStudioChange={onStudioChange}
            onAddStudio={onAddStudio}
            onUpgradePlan={onUpgradePlan}
            onRetry={onRetryStudios}
          />
        </div>

        <div
          className={`ml-auto flex shrink-0 items-center gap-1 min-[360px]:gap-1.5 md:gap-2 ${styles.utilities}`}
        >
          <WorkspaceHelpMenu canReplayProductTour={canUseProductTour} />
          <WorkspaceNotificationMenu />

          {aiWorkspace.available ? (
            <button
              type="button"
              onClick={() => aiWorkspace.openAssistant()}
              data-product-tour-target="ai-assistant"
              className={`group/topbar-action relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center border p-0 transition active:scale-[0.97] motion-reduce:transform-none ${styles.utilityButton} ${styles.aiButton}`}
              aria-label={t("openAiAssistant")}
            >
              <SparklesIcon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <UtilityTooltip>{t("aiAssistant")}</UtilityTooltip>
            </button>
          ) : null}

          <div className="block shrink-0">
            <UserProfileMenu
              variant="dashboard"
              isAdminRoute
              studioName={studioName}
              initials={initials}
            />
          </div>
        </div>
      </div>

      {isOverviewRoute ? (
        <WorkspaceBrushField variant="overviewTopbar" />
      ) : null}
    </header>
  );
}
