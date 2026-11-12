"use client";

import { Fragment, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
import { customerPortalProfileThemeStyle } from "@/components/customer-shell/CustomerPortalPrimitives";
import UserActionsMenuContent from "./UserActionsMenuContent";
import { classNames } from "./header.utils";

export default function MobileUserActionsSheet({
  open,
  setOpen,
  dialogId,
  isAdminRoute = false,
  onLogout,
  onSwitchToAdminMode,
  onOpenBookingSite,
  toggleLanguage,
  languageTargetLocale,
  onClose,
  userInitials = "ME",
  customerSurface = null,
  tenantThemeStyle = null,
  tenantStylePresetId = null,
}) {
  const t = useTranslations("Header");

  const closeSheet = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose, setOpen]);

  const isCustomerPortal = customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL;
  const isTenantSurface = Boolean(customerSurface);
  const mobileBreakpointClass = isAdminRoute
    ? "xl:hidden"
    : isCustomerPortal
      ? ""
      : "lg:hidden";

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className={classNames("relative z-[110]", mobileBreakpointClass)}
        onClose={closeSheet}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-200 ease-out motion-reduce:transition-none"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150 ease-in motion-reduce:transition-none"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-[#11110F]/25 backdrop-blur-[3px]"
            aria-hidden="true"
          />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end justify-center sm:items-stretch sm:justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform transition duration-300 ease-out motion-reduce:transition-none"
            enterFrom="translate-y-full sm:translate-x-full sm:translate-y-0"
            enterTo="translate-y-0"
            leave="transform transition duration-200 ease-in motion-reduce:transition-none"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full sm:translate-x-full sm:translate-y-0"
          >
            <DialogPanel
              id={dialogId}
              data-dialog-layout="drawer"
              data-tenant-style={
                isTenantSurface ? tenantStylePresetId || undefined : undefined
              }
              data-tenant-surface={isTenantSurface ? "panel" : undefined}
              className={classNames(
                "relative flex max-h-[min(90vh,760px)] max-h-[min(90dvh,760px)] w-full flex-col overflow-hidden border sm:h-full sm:max-h-none sm:w-[min(420px,calc(100vw-32px))] sm:rounded-none",
                isCustomerPortal
                  ? "rounded-none border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]"
                  : "rounded-t-[28px] border-line bg-surface-raised shadow-[0_-28px_80px_rgba(31,31,31,0.16)] sm:rounded-l-[24px] sm:shadow-[-24px_0_70px_rgba(31,31,31,0.14)]",
              )}
              style={
                isTenantSurface
                  ? {
                      ...tenantThemeStyle,
                      ...(isCustomerPortal
                        ? {
                            ...customerPortalProfileThemeStyle,
                            boxShadow: "var(--tenant-shadow-floating)",
                          }
                        : {}),
                    }
                  : undefined
              }
              data-profile-menu-sheet
              data-customer-portal-profile-sheet={isCustomerPortal || undefined}
              data-customer-portal-profile-drawer={
                isCustomerPortal || undefined
              }
            >
              <div
                className={classNames(
                  "mx-auto mt-3 h-1 w-10 shrink-0 rounded-full sm:hidden",
                  isCustomerPortal
                    ? "bg-[var(--tenant-border)]"
                    : "bg-[#D8D3CA]",
                )}
              />

              {isCustomerPortal ? (
                <>
                  <DialogTitle className="sr-only">
                    {t("account.menu")}
                  </DialogTitle>

                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label={t("account.closeMenu")}
                    data-tenant-hover="preserve"
                    className="absolute right-4 top-4 z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 motion-reduce:transition-none sm:right-5"
                  >
                    <XMarkIcon
                      className="h-5 w-5 stroke-[1.8]"
                      aria-hidden="true"
                    />
                  </button>
                </>
              ) : (
                <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3.5 pt-3 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_10px_26px_rgb(var(--skab-blue-rgb)/0.22)]">
                      {userInitials}
                    </span>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent-text">
                        {t("account.eyebrow")}
                      </p>

                      <DialogTitle className="mt-1 truncate text-[16px] font-semibold tracking-[-0.025em] text-[#1F1F1F]">
                        {t("account.menu")}
                      </DialogTitle>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label={t("account.closeMenu")}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E7E4DE] bg-white/75 text-[#1F1F1F] transition hover:border-[#D8D3CA] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 motion-reduce:transition-none"
                  >
                    <XMarkIcon
                      className="h-5 w-5 stroke-[1.8]"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              )}

              <div
                className={classNames(
                  "flex min-h-0 flex-1 overflow-hidden border-t",
                  isCustomerPortal
                    ? "border-transparent bg-[var(--tenant-background)] [&_[data-profile-menu-identity]]:pr-16"
                    : "border-[#E7E4DE] bg-white/35",
                )}
              >
                <UserActionsMenuContent
                  isAdminRoute={isAdminRoute}
                  onLogout={onLogout}
                  onSwitchToAdminMode={onSwitchToAdminMode}
                  onOpenBookingSite={onOpenBookingSite}
                  toggleLanguage={toggleLanguage}
                  languageTargetLocale={languageTargetLocale}
                  onClose={closeSheet}
                  portalThemed={isCustomerPortal}
                />
              </div>

              <div className="h-[max(18px,env(safe-area-inset-bottom))] shrink-0" />
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
