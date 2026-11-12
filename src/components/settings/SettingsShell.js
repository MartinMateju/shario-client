"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { revealElementHorizontally } from "@/components/ui/horizontalScroll";
import { Link, usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import {
  SETTINGS_OVERVIEW_PATH,
  canAccessSettingsItem,
  getActiveSettingsGroup,
  getVisibleSettingsGroups,
  isSettingsItemActive,
  launchCenterItem,
} from "./settingsNavigation";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const activeLinkClass =
  "bg-coral-100 font-semibold text-[#292925] ring-1 ring-inset ring-coral-200/70";
const idleLinkClass =
  "font-medium text-[#686762] hover:bg-[#F7F5F1] hover:text-[#292925]";

function NavigationLink({ active, children, icon: Icon, linkRef, ...props }) {
  return (
    <Link
      ref={linkRef}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex min-h-11 max-w-[min(76vw,260px)] items-center gap-2.5 rounded-[13px] px-3 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 xl:max-w-none xl:gap-3",
        active ? activeLinkClass : idleLinkClass,
      )}
      {...props}
    >
      <Icon
        className={cx(
          "h-4 w-4 shrink-0",
          active ? "text-terracotta-600" : "text-[#777773]",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

export default function SettingsShell({ children }) {
  const t = useTranslations("WorkspaceSettingsNav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const normalizedPathname =
    pathname?.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const isLocationCreateRoute =
    normalizedPathname === "/app/settings/locations/new";
  const isLocationEditRoute = /^\/app\/settings\/locations\/[^/]+\/edit$/.test(
    normalizedPathname || "",
  );
  const isLocationFormRoute = isLocationCreateRoute || isLocationEditRoute;
  const activeItemRef = useRef(null);
  const navigationRef = useRef(null);
  const visibleGroups = getVisibleSettingsGroups({ access, tenant });
  const activeGroup = getActiveSettingsGroup(visibleGroups, normalizedPathname);
  const isOverview = normalizedPathname === SETTINGS_OVERVIEW_PATH;
  const launchCenterVisible = canAccessSettingsItem(
    launchCenterItem,
    access,
    tenant,
  );
  const detailItems = activeGroup?.items ?? [];

  useEffect(() => {
    revealElementHorizontally(navigationRef.current, activeItemRef.current, 8);
  }, [normalizedPathname]);

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
        className={cx(
          "relative z-10 mx-auto min-w-0",
          isLocationFormRoute ? "w-full max-w-none" : "max-w-[1040px]",
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate grid min-w-0 gap-5 xl:grid-cols-[224px_minmax(0,1fr)] xl:gap-5">
      {isOverview ? null : <WorkspaceBrushField variant="settingsShell" />}

      <aside className="relative z-10 min-w-0 max-w-full self-start overflow-hidden rounded-[22px] border border-line bg-white p-3 shadow-[0_16px_42px_rgba(17,17,15,0.05)] xl:sticky xl:top-[112px] xl:overflow-visible xl:p-4">
        <div className="min-w-0 px-2 pb-2 pt-1 xl:px-2 xl:pb-4 xl:pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 truncate text-[16px] font-semibold tracking-[-0.04em] text-[#292925] xl:mt-1.5 xl:text-[19px]">
            {t("title")}
          </h2>
          {isOverview ? (
            <p className="mt-1 hidden text-[10px] leading-5 text-ink-muted xl:block">
              {t("overviewDescription")}
            </p>
          ) : null}
        </div>

        <nav
          ref={navigationRef}
          aria-label={t("label")}
          className="max-w-full scroll-px-2 overflow-x-auto overscroll-x-contain xl:overflow-visible"
        >
          <ul className="flex min-w-max gap-1 xl:block xl:min-w-0 xl:space-y-1">
            <li className="min-w-0 shrink-0 xl:w-full">
              <NavigationLink
                href={SETTINGS_OVERVIEW_PATH}
                active={isOverview}
                icon={isOverview ? Squares2X2Icon : ArrowLeftIcon}
                linkRef={isOverview ? activeItemRef : undefined}
                title={t("overview")}
              >
                {t("overview")}
              </NavigationLink>
            </li>

            {launchCenterVisible ? (
              <li className="min-w-0 shrink-0 xl:w-full">
                <NavigationLink
                  href={launchCenterItem.href}
                  active={false}
                  icon={launchCenterItem.icon}
                  title={t("items.setup")}
                >
                  {t("items.setup")}
                </NavigationLink>
              </li>
            ) : null}

            <li
              aria-hidden="true"
              className="mx-2 hidden h-px bg-line xl:block"
            />

            {isOverview
              ? visibleGroups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <li key={group.key} className="min-w-0 shrink-0 xl:w-full">
                      <Link
                        href={group.items[0].href}
                        aria-label={t("openCategory", {
                          category: t(group.labelKey ?? `groups.${group.key}`),
                        })}
                        className="group flex min-h-11 max-w-[min(76vw,260px)] items-center gap-2.5 rounded-[13px] px-3 text-[11px] font-medium text-[#686762] transition hover:bg-[#F7F5F1] hover:text-[#292925] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 xl:max-w-none xl:gap-3"
                      >
                        <GroupIcon
                          className="h-4 w-4 shrink-0 text-[#777773] transition group-hover:text-cobalt-600"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {t(group.labelKey ?? `groups.${group.key}`)}
                        </span>
                        <ChevronRightIcon
                          className="hidden h-3.5 w-3.5 shrink-0 text-ink-subtle xl:block"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })
              : detailItems.map((item) => {
                  const active = isSettingsItemActive(item, normalizedPathname);
                  return (
                    <li key={item.key} className="min-w-0 shrink-0 xl:w-full">
                      <NavigationLink
                        href={item.href}
                        active={active}
                        icon={item.icon}
                        linkRef={active ? activeItemRef : undefined}
                        title={t(`items.${item.key}`)}
                      >
                        {t(`items.${item.key}`)}
                      </NavigationLink>
                    </li>
                  );
                })}
          </ul>
        </nav>
      </aside>

      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
}
