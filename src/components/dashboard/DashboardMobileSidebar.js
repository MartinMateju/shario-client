"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";

import DashboardSidebar from "./DashboardSidebar";

export default function DashboardMobileSidebar({
  open,
  onClose,
  panelId = "workspace-mobile-navigation",
  studios = [],
  tenantId,
  studioLimit = null,
  canManageStudios = false,
  isStudioLoading = false,
  isStudioError = false,
  planLabel,
  canUseSetupCenter = false,
  launchCenterStatus = null,
  onStudioChange,
  onAddStudio,
  onUpgradePlan,
  onRetryStudios,
}) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  useEffect(() => {
    onClose?.();
  }, [onClose, pathname]);

  useEffect(() => {
    if (
      !open ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const closeAtDesktop = (event) => {
      if (event.matches) onClose?.();
    };

    if (desktopQuery.matches) {
      onClose?.();
      return undefined;
    }

    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeAtDesktop);
    };
  }, [onClose, open]);

  return (
    <Dialog
      data-skab-workspace-surface
      open={open}
      onClose={onClose}
      className="relative z-[80] xl:hidden"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#202824]/25 backdrop-blur-[2px] transition duration-300 motion-reduce:transition-none data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 flex justify-start">
          <DialogPanel
            id={panelId}
            data-dialog-layout="drawer"
            transition
            className="relative h-dvh w-full max-w-[320px] transform border-r border-line bg-surface-panel pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-[0_18px_45px_rgb(32_40_36/0.12)] transition duration-300 ease-out motion-reduce:transition-none data-closed:-translate-x-full"
          >
            <DialogTitle className="sr-only">{t("sidebarLabel")}</DialogTitle>

            <button
              autoFocus
              type="button"
              onClick={onClose}
              aria-label={t("closeNavigation")}
              className="absolute right-4 top-[calc(0.875rem+env(safe-area-inset-top))] z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-[var(--studio-action-radius)] border border-line bg-surface-raised text-[var(--studio-muted)] transition active:scale-[0.97] active:border-[var(--studio-rule)] active:bg-[var(--color-primary-soft)] active:text-[var(--studio-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)] motion-reduce:transform-none md:hover:border-line-strong md:hover:text-[var(--studio-ink)]"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <DashboardSidebar
              studios={studios}
              tenantId={tenantId}
              studioLimit={studioLimit}
              canManageStudios={canManageStudios}
              isStudioLoading={isStudioLoading}
              isStudioError={isStudioError}
              planLabel={planLabel}
              canUseSetupCenter={canUseSetupCenter}
              launchCenterStatus={launchCenterStatus}
              mobile
              instanceId="mobile"
              onNavigate={onClose}
              onStudioChange={onStudioChange}
              onAddStudio={onAddStudio}
              onUpgradePlan={onUpgradePlan}
              onRetryStudios={onRetryStudios}
            />
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
