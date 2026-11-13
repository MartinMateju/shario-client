"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

import { Link, usePathname } from "@/i18n/navigation";
import SkabLogo from "@/components/brand/SkabLogo";
import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import {
  buildDashboardNavigation,
  getActiveDashboardNavigation,
} from "./dashboard.navigation";
import StudioSwitcher from "./StudioSwitcher";
import { resetWorkspaceScroll } from "./WorkspaceRouteScrollReset";
import { getLaunchCenterStatusPresentation } from "./launchCenterNavigation";

import styles from "./dashboardShell.module.css";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

function DashboardBrand({ collapsed, onNavigate }) {
  const commonT = useTranslations("Common");
  return (
    <Link
      href="/app"
      onClick={onNavigate}
      className={classNames(
        "group inline-flex min-h-11 items-center rounded-[var(--studio-control-radius)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
        collapsed ? "px-2" : "px-1",
      )}
      aria-label={commonT("sharioDashboard")}
    >
      <SkabLogo
        variant={collapsed ? "compact" : "full"}
        className={styles.brandLogo}
      />
    </Link>
  );
}

function ItemTooltip({ children }) {
  return (
    <span
      className={classNames(
        "pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap",
        "rounded-[var(--studio-control-radius)] border border-line bg-[var(--studio-ink)] px-3 py-2 text-xs font-medium text-white shadow-[0_18px_45px_rgb(32_40_36/0.12)]",
        "group-hover:block group-focus-visible:block",
      )}
      role="tooltip"
    >
      {children}
    </span>
  );
}

function NavigationLink({
  item,
  active = false,
  collapsed = false,
  nested = false,
  label,
  onNavigate,
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.resolvedHref}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      data-product-tour-target={
        item.key === "settings" ? "settings" : undefined
      }
      className={classNames(
        "group relative flex min-h-11 items-center rounded-[var(--studio-control-radius)] text-[13px] transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
        collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "gap-2.5 px-3",
        nested && !collapsed
          ? "ml-3 min-h-11 rounded-[var(--studio-control-radius)] pl-3.5 text-[12.5px]"
          : "",
        active
          ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--studio-blue)]"
          : "font-medium text-[var(--studio-muted)] hover:bg-[var(--studio-paper)] hover:text-[var(--studio-ink)]",
      )}
    >
      {nested && !collapsed ? (
        <span
          className={classNames(
            "absolute -left-[1px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full",
            active ? "bg-[var(--studio-blue)]" : "bg-transparent",
          )}
          aria-hidden="true"
        />
      ) : null}

      <Icon
        className={classNames(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active
            ? "text-[var(--studio-blue)]"
            : "text-[var(--studio-muted)] group-hover:text-[var(--studio-blue)]",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />

      {collapsed ? (
        <ItemTooltip>{label}</ItemTooltip>
      ) : (
        <span className="min-w-0 truncate">{label}</span>
      )}
    </Link>
  );
}

function LaunchCenterLink({
  active = false,
  collapsed = false,
  instanceId,
  status = null,
  onNavigate,
  t,
}) {
  const label = t("setupCenter");
  const launchStatus = getLaunchCenterStatusPresentation(status, t);
  const statusDescriptionId = launchStatus
    ? `launch-center-status-${instanceId}`
    : undefined;
  const visibleStatus =
    launchStatus && launchStatus.tone !== "positive" ? launchStatus : null;
  const attentionStatus = launchStatus?.tone === "attention";

  return (
    <Link
      href="/app/setup"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={t("openSetupCenter")}
      aria-describedby={statusDescriptionId}
      data-launch-center-shortcut
      data-product-tour-target="launch-center"
      className={classNames(
        "group relative flex min-h-11 items-center rounded-[var(--studio-control-radius)] text-[12.5px] transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
        collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "gap-2.5 px-3",
        active
          ? "bg-[var(--studio-paper)] font-semibold text-[var(--studio-clay)]"
          : "font-medium text-[var(--studio-clay)] hover:bg-[var(--studio-paper)] hover:text-[var(--studio-clay)]",
      )}
    >
      <RocketLaunchIcon
        className={classNames(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active
            ? "text-[var(--studio-clay)]"
            : "text-[var(--studio-clay)] group-hover:text-[var(--studio-clay)]",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />

      {collapsed ? (
        <ItemTooltip>
          <span>{label}</span>
          {launchStatus ? (
            <span className="ml-2 tabular-nums text-white/70">
              {launchStatus.badgeText}
            </span>
          ) : null}
        </ItemTooltip>
      ) : (
        <span className="min-w-0 flex-1" data-launch-center-copy>
          <span className="block whitespace-nowrap">{label}</span>
          {visibleStatus ? (
            <span
              aria-hidden="true"
              data-launch-center-progress
              data-launch-center-status={visibleStatus.status}
              data-complete="false"
              className={classNames(
                "mt-0.5 block text-[10px] font-semibold leading-none tabular-nums",
                attentionStatus
                  ? "text-amber-800"
                  : "text-[var(--studio-clay)]",
              )}
            >
              {visibleStatus.badgeText}
            </span>
          ) : null}
        </span>
      )}

      {collapsed && visibleStatus ? (
        <span
          aria-hidden="true"
          data-launch-center-progress
          data-launch-center-status={visibleStatus.status}
          data-complete="false"
          className={classNames(
            "absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[8px] font-semibold tabular-nums ring-1 ring-inset",
            attentionStatus
              ? "bg-amber-100 text-amber-900 ring-amber-200"
              : "bg-[var(--studio-paper)] text-[var(--studio-clay)] ring-[var(--studio-clay)]",
          )}
        >
          {visibleStatus.badgeText}
        </span>
      ) : null}

      {launchStatus ? (
        <span id={statusDescriptionId} className="sr-only">
          {launchStatus.description}
        </span>
      ) : null}
    </Link>
  );
}

function NavigationGroup({
  entry,
  activeGroupKey,
  activeItemKey,
  collapsed,
  expanded,
  onNavigate,
  onToggle,
  t,
  instanceId,
}) {
  const Icon = entry.icon;
  const label = t(`nav.${entry.labelKey}`);
  const isActive = activeGroupKey === entry.key;
  const groupId = `workspace-nav-${instanceId}-${entry.key}`;
  const toggleLabel = expanded
    ? t("collapseGroup", { group: label })
    : t("expandGroup", { group: label });

  if (collapsed) {
    return (
      <li>
        <Menu as="div" className="relative">
          {({ open }) => (
            <>
              <MenuButton
                aria-label={label}
                className={classNames(
                  "group relative mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--studio-control-radius)]",
                  "transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
                  isActive
                    ? "bg-[var(--color-primary-soft)] text-[var(--studio-blue)]"
                    : "text-[var(--studio-muted)] hover:bg-[var(--studio-paper)] hover:text-[var(--studio-ink)]",
                )}
              >
                <Icon
                  className={classNames(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive
                      ? "text-[var(--studio-blue)]"
                      : "text-[var(--studio-muted)] group-hover:text-[var(--studio-blue)]",
                  )}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />

                {!open ? <ItemTooltip>{label}</ItemTooltip> : null}
              </MenuButton>

              <MenuItems
                data-skab-workspace-surface
                transition
                portal
                anchor="right start"
                className={classNames(
                  styles.menuSurface,
                  "z-[100] max-h-[min(520px,calc(100dvh-32px))] w-[248px] overflow-y-auto overscroll-contain rounded-[20px] border border-line bg-surface-raised p-1.5",
                  "shadow-[0_18px_45px_rgb(32_40_36/0.12)] [--anchor-gap:12px]",
                  "origin-left transition duration-150 ease-out focus:outline-none motion-reduce:transform-none motion-reduce:transition-none",
                  "data-closed:-translate-x-1 data-closed:scale-[0.98] data-closed:opacity-0",
                )}
              >
                <div className="px-3 pb-2 pt-1.5" role="presentation">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-muted)]">
                    {label}
                  </p>
                </div>

                {entry.children.map((item) => {
                  const ItemIcon = item.icon;
                  const itemLabel = t(`nav.${item.labelKey || item.key}`);
                  const itemActive = activeItemKey === item.key;

                  return (
                    <MenuItem key={item.key}>
                      <Link
                        href={item.resolvedHref}
                        onClick={onNavigate}
                        aria-current={itemActive ? "page" : undefined}
                        className={classNames(
                          "group/item flex min-h-11 w-full items-center gap-2.5 rounded-[var(--studio-control-radius)] px-3 text-[12.5px] font-medium",
                          "transition-colors focus:outline-none data-focus:ring-2 data-focus:ring-inset data-focus:ring-[var(--studio-blue)]",
                          itemActive
                            ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--studio-blue)]"
                            : "text-[var(--studio-muted)] hover:bg-surface-muted hover:text-[var(--studio-ink)] data-focus:bg-surface-muted",
                        )}
                      >
                        <ItemIcon
                          className={classNames(
                            "h-[18px] w-[18px] shrink-0",
                            itemActive
                              ? "text-[var(--studio-blue)]"
                              : "text-[var(--studio-muted)] group-hover/item:text-[var(--studio-blue)]",
                          )}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{itemLabel}</span>
                      </Link>
                    </MenuItem>
                  );
                })}
              </MenuItems>
            </>
          )}
        </Menu>
      </li>
    );
  }

  return (
    <li>
      <div
        className={classNames(
          "flex min-h-11 items-center rounded-[var(--studio-control-radius)] transition-colors duration-200 motion-reduce:transition-none",
          isActive
            ? "bg-[var(--color-primary-soft)] text-[var(--studio-blue)]"
            : "text-[var(--studio-muted)] hover:bg-[var(--studio-paper)] hover:text-[var(--studio-ink)]",
        )}
      >
        <Link
          href={entry.resolvedHref}
          onClick={onNavigate}
          className={classNames(
            "group relative flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--studio-control-radius)] px-3 text-[13px] font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--studio-blue)]",
            isActive ? "font-semibold" : "",
          )}
        >
          <Icon
            className={classNames(
              "h-[18px] w-[18px] shrink-0",
              isActive
                ? "text-[var(--studio-blue)]"
                : "text-[var(--studio-muted)] group-hover:text-[var(--studio-blue)]",
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />

          <span className="min-w-0 truncate">{label}</span>
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          aria-expanded={expanded}
          aria-controls={groupId}
          className={classNames(
            "mr-0.5 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[var(--studio-control-radius)]",
            "text-[var(--studio-muted)] transition-colors active:bg-surface-raised active:text-[var(--studio-ink)] md:hover:bg-[var(--studio-paper)] md:hover:text-[var(--studio-ink)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
          )}
        >
          <ChevronDownIcon
            className={classNames(
              "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
              expanded ? "rotate-180" : "",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded ? (
        <ul
          id={groupId}
          className="relative mt-0.5 space-y-px pb-0.5 before:absolute before:bottom-2 before:left-[21px] before:top-1 before:w-px before:bg-line"
        >
          {entry.children.map((item) => (
            <li key={item.key}>
              <NavigationLink
                item={item}
                active={activeItemKey === item.key}
                nested
                label={t(`nav.${item.labelKey || item.key}`)}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function DashboardSidebar({
  studios = [],
  tenantId,
  studioLimit = null,
  canManageStudios = false,
  isStudioLoading = false,
  isStudioError = false,
  planLabel,
  canUseSetupCenter = false,
  launchCenterStatus = null,
  mobile = false,
  collapsed = false,
  instanceId = mobile ? "mobile" : "desktop",
  onNavigate,
  onStudioChange,
  onAddStudio,
  onUpgradePlan,
  onRetryStudios,
  onToggleCollapsed,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Dashboard");
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const search = searchParams.toString();
  const effectiveCollapsed = mobile ? false : collapsed;

  const { primary, utility } = useMemo(
    () =>
      buildDashboardNavigation({
        tenant,
        workspaceAccess,
      }),
    [tenant, workspaceAccess],
  );

  const { activeItemKey, activeGroupKey } = useMemo(
    () =>
      getActiveDashboardNavigation({
        pathname,
        searchParams: new URLSearchParams(search),
        primary,
        utility,
      }),
    [pathname, primary, search, utility],
  );

  const routeStateKey = `${pathname}?${search}`;
  const [disclosureState, setDisclosureState] = useState(() => ({
    routeStateKey,
    openGroupKey: activeGroupKey,
  }));
  const openGroupKey =
    disclosureState.routeStateKey === routeStateKey
      ? disclosureState.openGroupKey
      : activeGroupKey;

  const handleNavigate = () => {
    resetWorkspaceScroll();
    onNavigate?.();
  };

  const navId = `workspace-navigation-${instanceId}`;
  const sidebarToggleLabel = effectiveCollapsed
    ? t("expandSidebar")
    : t("collapseSidebar");
  const launchCenterActive =
    pathname === "/app/setup" || pathname?.startsWith("/app/setup/");
  const showSidebarToggle = !mobile && Boolean(onToggleCollapsed);

  return (
    <div
      className="relative isolate flex h-full min-h-0 flex-col bg-surface-panel"
      data-collapsed={effectiveCollapsed ? "true" : "false"}
      data-workspace-sidebar={mobile ? "mobile" : "desktop"}
    >
      {!mobile && !effectiveCollapsed ? (
        <WorkspaceBrushField variant="sidebar" />
      ) : null}

      <div
        data-workspace-sidebar-header
        className={classNames(
          "relative z-10 flex h-[72px] shrink-0 items-center border-b border-line bg-surface-panel",
          effectiveCollapsed
            ? "justify-center px-2"
            : showSidebarToggle
              ? "justify-between px-3.5"
              : "px-5",
        )}
      >
        {effectiveCollapsed && showSidebarToggle ? null : (
          <DashboardBrand
            collapsed={effectiveCollapsed}
            onNavigate={handleNavigate}
          />
        )}

        {showSidebarToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={sidebarToggleLabel}
            aria-expanded={!effectiveCollapsed}
            aria-controls={navId}
            data-workspace-sidebar-toggle
            className={classNames(
              "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[var(--studio-control-radius)]",
              "border border-transparent bg-transparent text-[var(--studio-muted)] transition hover:border-line/80 hover:bg-surface-muted hover:text-[var(--studio-blue)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
            )}
          >
            {effectiveCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      <nav
        id={navId}
        className={classNames(
          "relative z-10 min-h-0 flex-1",
          mobile
            ? "overflow-x-hidden overflow-y-auto px-4 pb-5 pt-2"
            : effectiveCollapsed
              ? "overflow-visible px-2 pb-3 pt-2"
              : "overflow-x-hidden overflow-y-auto px-2.5 pb-3 pt-2",
        )}
        aria-label={t("sidebarLabel")}
      >
        <ul
          data-workspace-sidebar-primary-list
          data-product-tour-target="navigation"
          className={mobile ? "space-y-1" : "space-y-px"}
          role="list"
        >
          {primary.map((entry) => {
            if (entry.type === "group") {
              return (
                <NavigationGroup
                  key={entry.key}
                  entry={entry}
                  activeGroupKey={activeGroupKey}
                  activeItemKey={activeItemKey}
                  collapsed={effectiveCollapsed}
                  expanded={!effectiveCollapsed && openGroupKey === entry.key}
                  instanceId={instanceId}
                  onNavigate={handleNavigate}
                  onToggle={() => {
                    setDisclosureState({
                      routeStateKey,
                      openGroupKey:
                        openGroupKey === entry.key ? null : entry.key,
                    });
                  }}
                  t={t}
                />
              );
            }

            const item = entry.item;

            return (
              <li key={entry.key}>
                <NavigationLink
                  item={item}
                  active={activeItemKey === item.key}
                  collapsed={effectiveCollapsed}
                  label={t(`nav.${item.labelKey || item.key}`)}
                  onNavigate={handleNavigate}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {canUseSetupCenter || utility.length ? (
        <nav
          data-workspace-sidebar-footer
          data-launch-center-navigation={canUseSetupCenter ? "true" : undefined}
          className={classNames(
            "relative z-10 shrink-0 border-t border-line/80 bg-surface-panel py-2.5",
            effectiveCollapsed ? "px-2" : mobile ? "px-4" : "px-2.5",
          )}
          aria-label={t("utilityNavigationLabel")}
        >
          <ul className="space-y-px" role="list">
            {canUseSetupCenter ? (
              <li>
                <LaunchCenterLink
                  active={launchCenterActive}
                  collapsed={effectiveCollapsed}
                  instanceId={instanceId}
                  status={launchCenterStatus}
                  onNavigate={handleNavigate}
                  t={t}
                />
              </li>
            ) : null}

            {utility.map((item) => (
              <li key={item.key}>
                <NavigationLink
                  item={item}
                  active={activeItemKey === item.key}
                  collapsed={effectiveCollapsed}
                  label={t(`nav.${item.labelKey || item.key}`)}
                  onNavigate={handleNavigate}
                />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {mobile ? (
        <StudioSwitcher
          studios={studios}
          tenantId={tenantId}
          studioLimit={studioLimit}
          canManageStudios={canManageStudios}
          isLoading={isStudioLoading}
          isError={isStudioError}
          planLabel={planLabel}
          mobile
          onNavigate={onNavigate}
          onStudioChange={onStudioChange}
          onAddStudio={onAddStudio}
          onUpgradePlan={onUpgradePlan}
          onRetry={onRetryStudios}
        />
      ) : null}
    </div>
  );
}
