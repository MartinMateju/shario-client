"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";

import { useCallback } from "react";
import { CalendarDaysIcon } from "@heroicons/react/20/solid";

import MobileMenuDialog from "./MobileMenuDialog";
import { TAB_ICONS } from "./menuConfig";
import { classNames, getTabLabel } from "./menuUtils";

export default function MenuNavigation({
  currentTab,
  currentTabObj,
  groupedTabs = {},
  filteredTabs = [],
  language,
  onTabChange,
  query,
  setQuery,
  mobileSheetOpen,
  setMobileSheetOpen,
  unlockScroll,
}) {
  const labels = useLegacyCopy("menu");
  const userAccountTabs = groupedTabs.USER_ACCOUNT || [];

  const getDesktopTabClasses = useCallback(
    (isActive) =>
      classNames(
        "group relative inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2",
        "text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--tenant-surface)]",
        isActive
          ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] shadow-[0_12px_28px_color-mix(in_srgb,var(--tenant-accent)_20%,transparent)]"
          : "border-transparent bg-transparent text-[var(--tenant-muted-on-surface)] hover:border-[var(--tenant-accent-link)]/35 hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-link)]",
      ),
    [],
  );

  const renderTabs = useCallback(
    (tabs = []) =>
      tabs.map((tab) => {
        const isActive = tab.name === currentTab;
        const Icon = TAB_ICONS[tab.name] || CalendarDaysIcon;

        return (
          <button
            key={tab.name}
            type="button"
            onClick={() => onTabChange(tab.name)}
            className={getDesktopTabClasses(isActive)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={classNames(
                "h-4 w-4 shrink-0 transition-colors duration-300",
                isActive
                  ? "text-[var(--tenant-accent-foreground)]"
                  : "text-[var(--tenant-muted-on-surface)] group-hover:text-[var(--tenant-accent-link)]",
              )}
              aria-hidden="true"
            />

            <span className="whitespace-nowrap">
              {getTabLabel(tab.name, language, labels)}
            </span>
          </button>
        );
      }),
    [currentTab, getDesktopTabClasses, language, onTabChange, labels],
  );

  return (
    <nav
      className="border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-4 text-[var(--tenant-text-on-surface)] sm:px-5 lg:px-10"
      aria-label={labels.navigation}
    >
      <div className="mx-auto max-w-[1480px]">
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {renderTabs(userAccountTabs)}
        </div>

        <div className="sm:hidden">
          <MobileMenuDialog
            currentTab={currentTab}
            currentTabObj={currentTabObj}
            filteredTabs={filteredTabs}
            language={language}
            query={query}
            setQuery={setQuery}
            mobileSheetOpen={mobileSheetOpen}
            setMobileSheetOpen={setMobileSheetOpen}
            unlockScroll={unlockScroll}
            onTabChange={onTabChange}
          />
        </div>
      </div>
    </nav>
  );
}
