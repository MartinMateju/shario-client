"use client";

import {
  Combobox,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useMemo } from "react";

import {
  CalendarDaysIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";

import { TAB_ICONS } from "./menuConfig";
import { classNames, getTabLabel } from "./menuUtils";

export default function MobileMenuDialog({
  currentTab,
  currentTabObj,
  filteredTabs,
  language,
  setQuery,
  mobileSheetOpen,
  setMobileSheetOpen,
  unlockScroll,
  onTabChange,
}) {
  const publicTenant = useOptionalPublicTenant();
  const tenantTheme = useMemo(
    () => getPublicTenantPortalTheme(publicTenant?.tenant),
    [publicTenant?.tenant],
  );
  const SelectedIcon = TAB_ICONS[currentTabObj?.name] || CalendarDaysIcon;

  return (
    <Combobox
      as="div"
      value={currentTabObj}
      onChange={(tab) => {
        setQuery("");
        if (!tab?.name) return;

        setMobileSheetOpen(false);
        unlockScroll();
        onTabChange(tab.name);
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="flex h-13 w-full cursor-pointer items-center gap-3 rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-5 py-4 text-left text-[var(--tenant-text-on-surface)] shadow-sm transition-all duration-200 active:scale-[0.99]"
          aria-label="Open menu"
        >
          <SelectedIcon className="h-5 w-5 shrink-0" />

          <div className="w-full truncate font-medium text-[14px] uppercase tracking-[0.16em]">
            {getTabLabel(currentTabObj?.name, language)}
          </div>
          <ChevronDownIcon className="size-5 shrink-0" aria-hidden="true" />
        </button>

        <Dialog
          open={mobileSheetOpen}
          onClose={() => setMobileSheetOpen(false)}
          className="relative z-[1000]"
          data-tenant-style={tenantTheme?.stylePresetId}
          style={tenantTheme?.style}
        >
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-sm"
            aria-hidden="true"
          />

          <DialogPanel
            data-dialog-layout="drawer"
            className="fixed inset-0 z-[1001] flex flex-col bg-[var(--tenant-background)] text-[var(--tenant-text)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-4 text-[var(--tenant-text-on-surface)]">
              <div>
                <div className="font-medium text-[11px] uppercase tracking-[0.2em] text-[var(--tenant-accent-on-surface)]">
                  shario.io
                </div>
                <DialogTitle className="mt-1 font-medium text-sm uppercase tracking-[0.16em] text-[var(--tenant-text-on-surface)]">
                  {language === "CZ" ? "Nabídka" : "Menu"}
                </DialogTitle>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileSheetOpen(false);
                  unlockScroll();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-sm transition-all duration-200 hover:border-[var(--tenant-accent)] hover:bg-[var(--tenant-accent)] hover:text-[var(--tenant-accent-foreground)] active:scale-95"
                aria-label={language === "CZ" ? "Zavřít nabídku" : "Close menu"}
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <ComboboxOptions
              static
              className="flex-1 overflow-auto px-4 pb-8 pt-6 outline-none"
            >
              {filteredTabs.map((tab) => {
                const Icon = TAB_ICONS[tab.name] || CalendarDaysIcon;
                const isActive = tab.name === currentTab;

                return (
                  <ComboboxOption
                    key={tab.name}
                    value={tab}
                    data-tenant-hover-fill={isActive || undefined}
                    className={classNames(
                      "mb-3 flex items-center gap-3 rounded-[24px] border px-5 py-4 uppercase",
                      "font-medium tracking-[0.16em] shadow-sm transition-all duration-200",
                      isActive
                        ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]"
                        : "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)]",
                      "data-focus:border-[var(--tenant-accent)] data-focus:bg-[var(--tenant-accent)] data-focus:text-[var(--tenant-accent-foreground)]",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />

                    <span className="block truncate text-[14px]">
                      {getTabLabel(tab.name, language)}
                    </span>
                  </ComboboxOption>
                );
              })}
            </ComboboxOptions>
          </DialogPanel>
        </Dialog>
      </div>
    </Combobox>
  );
}
