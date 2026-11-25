"use client";

import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import SettingsLanguageSummary from "./SettingsLanguageSummary";
import SettingsPlanSummary from "./SettingsPlanSummary";

import { Link, usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  SETTINGS_OVERVIEW_PATH,
  PERSONAL_SETTINGS_PATH,
  getSettingsSection,
  getVisibleSettingsGroups,
} from "./settingsNavigation";

export default function SettingsShell({ children }) {
  const t = useTranslations("UnifiedSettings");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const normalizedPathname =
    pathname?.replace(/\/+$/, "") || SETTINGS_OVERVIEW_PATH;
  const isLocationCreateRoute =
    normalizedPathname === "/app/settings/locations/new";
  const isLocationEditRoute = /^\/app\/settings\/locations\/[^/]+\/edit$/.test(
    normalizedPathname,
  );
  const isLocationFormRoute = isLocationCreateRoute || isLocationEditRoute;
  const guidedSetupStep = searchParams?.get("setupStep");

  if (guidedSetupStep || isLocationFormRoute) {
    return (
      <div
        data-focused-settings-mode={
          isLocationCreateRoute
            ? "location-create"
            : isLocationEditRoute
              ? "location-edit"
              : undefined
        }
        data-guided-settings-mode={guidedSetupStep || undefined}
        className={`relative z-10 mx-auto min-w-0 ${isLocationFormRoute ? "w-full max-w-none" : "max-w-[1040px]"}`}
      >
        {children}
      </div>
    );
  }

  const studioGroups = getVisibleSettingsGroups({ access, tenant });
  const section = getSettingsSection({
    pathname: normalizedPathname,
    requestedSection: searchParams?.get("section"),
    studioGroups,
  });
  const isPersonal = section === "personal";
  const isOverview = normalizedPathname === SETTINGS_OVERVIEW_PATH;
  const sectionTitle = t(isPersonal ? "personalTitle" : "studioTitle");
  const tabs = [
    ...(studioGroups.length
      ? [
          {
            key: "studio",
            title: t("studioTitle"),
            href: `${SETTINGS_OVERVIEW_PATH}?section=studio`,
            icon: BuildingOffice2Icon,
          },
        ]
      : []),
    {
      key: "personal",
      title: t("personalTitle"),
      href: PERSONAL_SETTINGS_PATH,
      icon: UserCircleIcon,
    },
  ];

  return (
    <div
      data-settings-hub
      data-settings-section={section}
      className="relative z-10 mx-auto w-full min-w-0 max-w-[1280px] space-y-5 pb-8"
    >
      <header className="min-w-0 rounded-[var(--studio-radius)] border border-line bg-white px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[22px] leading-tight font-medium tracking-[-0.026em] text-ink sm:text-[24px]">
              {t("title")}
            </h2>
            <p className="mt-1 hidden max-w-2xl text-[14px] leading-6 text-ink-muted sm:block">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid min-w-0 gap-2.5 sm:grid-cols-2">
          <SettingsPlanSummary />
          <SettingsLanguageSummary />
        </div>
        <nav
          aria-label={t("navigation")}
          className="mt-3 flex min-w-0 flex-wrap gap-2"
        >
          {tabs.map(({ key, title, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={section === key ? "page" : undefined}
              className={`flex min-h-12 min-w-0 items-center gap-2 border-b-2 px-3 py-2 text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 ${section === key ? "border-cobalt-600 text-cobalt-700" : "border-transparent text-ink-muted hover:border-line hover:text-ink"}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{title}</span>
            </Link>
          ))}
        </nav>
      </header>
      <div className="min-w-0 space-y-4">
        <span
          data-settings-scope
          className="inline-flex max-w-full rounded-full bg-surface-muted px-3 py-1 text-[12px] font-medium leading-5 text-ink-soft break-words"
        >
          {t(isPersonal ? "personalScope" : "studioScope")}
        </span>
        {isOverview ? (
          <p className="px-1 text-sm leading-6 text-ink-muted">
            {t(isPersonal ? "personalDescription" : "studioDescription")}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Link
              href={
                isPersonal ? PERSONAL_SETTINGS_PATH : SETTINGS_OVERVIEW_PATH
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-cobalt-700 hover:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500"
            >
              <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("backTo", { section: sectionTitle })}
            </Link>
            {isPersonal ? (
              <p className="px-2 text-xs leading-5 text-ink-muted">
                {t(
                  normalizedPathname === "/app/settings/profile"
                    ? "personalProfileScope"
                    : "personalPreferencesScope",
                )}
              </p>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
