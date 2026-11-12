"use client";

import { Fragment, memo } from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLongRightIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
import { CustomerPortalHelpTrigger } from "@/components/customer-shell/CustomerPortalHelpTrigger";
import CustomerNotificationMenu from "@/components/notifications/CustomerNotificationMenu";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import LanguageSelector from "./LanguageSelector";
import NotificationButton from "./NotificationButton";
import UserActionsMenuContent from "./UserActionsMenuContent";
import { classNames, headerCountBadgeClass } from "./header.utils";

const iconButtonClass = classNames(
  "relative inline-flex h-11 w-11 items-center justify-center",
  "rounded-full text-[#292925]",
  "transition-[color,background-color] duration-200",
  "hover:bg-white hover:text-primary-text",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-brand-primary/25 focus-visible:ring-offset-4",
  "focus-visible:ring-offset-brand-offset",
);

const tenantIconButtonClass = classNames(
  "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent",
  "text-[var(--tenant-text)] transition-[color,background-color] duration-200",
  "hover:border-[var(--tenant-secondary)] hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-secondary)]",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-4",
  "focus-visible:ring-offset-[var(--tenant-background)]",
);

const primaryActionClass = classNames(
  "tenant-button-primary group inline-flex h-11 items-center gap-2.5 rounded-full",
  "bg-brand-primary px-5 text-[12px] font-semibold text-white",
  "shadow-[0_8px_22px_rgb(var(--skab-blue-rgb)/0.22)]",
  "transition-[transform,background-color,box-shadow] duration-300",
  "hover:-translate-y-0.5 hover:bg-primary-hover",
  "hover:shadow-[0_12px_28px_rgb(var(--skab-blue-rgb)/0.28)]",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-brand-primary/30 focus-visible:ring-offset-4",
  "focus-visible:ring-offset-brand-offset",
);

const customerPortalActionClass = classNames(
  "group inline-flex h-10 items-center rounded-full border px-4",
  "text-[11px] font-semibold tracking-[-0.01em]",
  "transition-[background-color,border-color,color] duration-200",
  "hover:border-[color-mix(in_srgb,var(--tenant-accent)_42%,transparent)]",
  "hover:bg-[color-mix(in_srgb,var(--tenant-accent)_12%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-4",
  "focus-visible:ring-offset-[var(--tenant-background)]",
  "motion-reduce:transition-none",
);

const DesktopActions = memo(function DesktopActions({
  isAuthenticated,
  isBooking,
  isAdminRoute = false,
  isMarketingHome = false,
  cartCount = 0,
  onOpenCart,
  onLogout,
  onSwitchToAdminMode,
  onOpenBookingSite,
  onToggleLanguage,
  languageTargetLocale,
  languageLocaleCodes,
  languageContextLabel = "Shario",
  showLanguageSelector = true,
  userInitials = "ME",
  onOpenUserActions,
  userActionsOpen = false,
  userActionsControls,
  tenantScoped = false,
  customerSurface = null,
  sessionReady = true,
  tenantPrimaryAction = null,
  tenantAccentColor = SKAB_BRAND_COLORS.primary,
  tenantAccentForeground = "#FFFFFF",
  tenantAccentLinkColor = SKAB_BRAND_COLORS.primary,
  tenantDegraded = false,
  customerPortalHref = "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
  notificationHref,
  customerHelpControls,
  customerHelpOpen = false,
  onOpenCustomerHelp,
}) {
  const t = useTranslations("Header");
  const publicTenantT = useTranslations("PublicTenant");
  const shellT = useTranslations("CustomerShell");
  const showPublicTenantActions =
    tenantScoped &&
    customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
    !tenantDegraded;
  const showAuthHomeAction =
    tenantScoped &&
    (customerSurface === CUSTOMER_SHELL_SURFACES.AUTH ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
        sessionReady));
  const showCustomerPortalAction =
    tenantScoped &&
    customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
    sessionReady;
  const showAnonymousSignIn =
    !showCustomerPortalAction &&
    (!tenantScoped ||
      showPublicTenantActions ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
        sessionReady) ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL && sessionReady));
  const useTenantAccountTheme =
    tenantScoped && customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL;
  const showUserAccountAction =
    !isMarketingHome && (!tenantScoped || useTenantAccountTheme);
  const customerPortalActionStyle = {
    backgroundColor: `color-mix(in srgb, ${tenantAccentColor} 7%, transparent)`,
    borderColor: `color-mix(in srgb, ${tenantAccentColor} 28%, transparent)`,
    color: tenantAccentLinkColor,
  };

  return (
    <div
      className={classNames(
        "ml-auto flex shrink-0 items-center",
        useTenantAccountTheme ? "gap-1.5" : tenantScoped ? "gap-3" : "gap-2",
      )}
      data-customer-portal-actions={useTenantAccountTheme || undefined}
    >
      {showLanguageSelector ? (
        <div
          className={classNames(
            "hidden",
            tenantScoped ? "lg:block" : "xl:block",
            useTenantAccountTheme && "xl:hidden",
          )}
        >
          <LanguageSelector
            tenantThemed={useTenantAccountTheme}
            tenantScoped={tenantScoped}
            localeCodes={languageLocaleCodes}
            contextLabel={languageContextLabel}
            hideWhenSingle={Boolean(languageLocaleCodes)}
          />
        </div>
      ) : null}

      {!isAuthenticated ? (
        <>
          {showAuthHomeAction ? (
            <Link
              href="/"
              className="inline-flex h-10 items-center px-2 text-[12px] font-medium tracking-[-0.01em] text-[#20201D] transition-colors duration-200 hover:text-primary-text"
            >
              {shellT("actions.backToStudio")}
            </Link>
          ) : null}

          {showCustomerPortalAction ? (
            <Link
              href={customerPortalHref}
              className={customerPortalActionClass}
              data-customer-portal-entry-action
              style={customerPortalActionStyle}
            >
              {publicTenantT("actions.book")}
            </Link>
          ) : null}

          {showAnonymousSignIn ? (
            <Link
              href="/login"
              className={classNames(
                "inline-flex h-10 items-center px-2",
                "text-[12px] font-medium tracking-[-0.01em]",
                "text-[#20201D] transition-colors duration-200",
                "hover:text-primary-text",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-brand-primary/25",
              )}
            >
              {tenantScoped ? publicTenantT("actions.signIn") : t("login")}
            </Link>
          ) : null}

          {(
            showPublicTenantActions
              ? null
              : !tenantScoped
                ? { href: "/register" }
                : null
          ) ? (
            <Link
              href={
                showPublicTenantActions ? tenantPrimaryAction.href : "/register"
              }
              data-skab-trial-action={!tenantScoped || undefined}
              className={primaryActionClass}
              style={
                tenantScoped
                  ? {
                      backgroundColor: tenantAccentColor,
                      color: tenantAccentForeground,
                    }
                  : undefined
              }
            >
              {showPublicTenantActions
                ? publicTenantT(`actions.${tenantPrimaryAction.key}`)
                : t("getStarted")}

              <ArrowLongRightIcon
                className="h-4 w-4 stroke-[1.6] transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </>
      ) : isAuthenticated ? (
        <>
          {!isAdminRoute && isBooking && cartCount > 0 && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={t("cart.open")}
              className={
                useTenantAccountTheme ? tenantIconButtonClass : iconButtonClass
              }
            >
              <ShoppingBagIcon
                className="h-[19px] w-[19px] stroke-[1.6]"
                aria-hidden="true"
              />

              {cartCount > 0 && (
                <span
                  className={classNames(
                    headerCountBadgeClass,
                    "bg-brand-primary",
                    useTenantAccountTheme
                      ? "ring-[var(--tenant-background)]"
                      : "ring-brand-offset",
                  )}
                  data-header-badge="cart-count"
                  style={
                    useTenantAccountTheme
                      ? {
                          backgroundColor: "var(--tenant-portal-button)",
                          color: "var(--tenant-portal-button-foreground)",
                        }
                      : undefined
                  }
                  aria-label={t("cart.items", {
                    count: cartCount,
                  })}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          )}

          {!isAdminRoute && !isBooking && showCustomerPortalAction && (
            <Link
              href={customerPortalHref}
              className={customerPortalActionClass}
              data-customer-portal-entry-action
              style={customerPortalActionStyle}
            >
              {publicTenantT("actions.book")}
            </Link>
          )}

          {!tenantScoped && isMarketingHome ? (
            <button
              type="button"
              className={primaryActionClass}
              data-skab-workspace-action
              onClick={onSwitchToAdminMode}
            >
              {t("openWorkspace")}
              <ArrowLongRightIcon
                className="h-4 w-4 stroke-[1.6] transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          ) : null}

          {useTenantAccountTheme && onOpenCustomerHelp ? (
            <CustomerPortalHelpTrigger
              controls={customerHelpControls}
              expanded={customerHelpOpen}
              onOpen={onOpenCustomerHelp}
            />
          ) : null}

          {useTenantAccountTheme ? (
            <CustomerNotificationMenu viewAllHref={notificationHref} />
          ) : !tenantScoped && !isMarketingHome ? (
            <NotificationButton href={notificationHref} />
          ) : null}

          {showUserAccountAction && useTenantAccountTheme ? (
            <button
              type="button"
              aria-label={t("account.menu")}
              aria-haspopup="dialog"
              aria-expanded={userActionsOpen}
              aria-controls={userActionsControls}
              onClick={onOpenUserActions}
              data-profile-menu-trigger
              data-customer-portal-profile-drawer-trigger
              data-tenant-hover="preserve"
              className={classNames(
                "group inline-flex h-11 items-center gap-1.5 rounded-full border border-transparent py-0.5 pl-0.5 pr-2",
                "text-[var(--tenant-text)] transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
                "hover:border-[var(--tenant-accent-on-surface)] hover:bg-[var(--tenant-surface)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30",
                "focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--tenant-background)]",
                userActionsOpen &&
                  "border-[var(--tenant-accent-on-surface)] bg-[var(--tenant-surface)] shadow-[0_6px_18px_color-mix(in_srgb,var(--tenant-text)_7%,transparent)]",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tenant-portal-button)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--tenant-portal-button-foreground)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tenant-text)_8%,transparent)]">
                {userInitials}
              </span>

              <ChevronDownIcon
                className={classNames(
                  "h-3 w-3 stroke-[1.7] text-[var(--tenant-muted-text)]",
                  "transition-[color,transform] duration-200 motion-reduce:transition-none",
                  "group-hover:text-[var(--tenant-accent-on-surface)]",
                  userActionsOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          ) : null}

          {showUserAccountAction && !useTenantAccountTheme ? (
            <Popover className="relative">
              {({ open, close }) => (
                <>
                  <PopoverButton
                    aria-label={t("account.menu")}
                    data-profile-menu-trigger
                    data-tenant-hover={tenantScoped ? "preserve" : undefined}
                    className={classNames(
                      "group inline-flex h-11 items-center gap-1",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4",
                      tenantScoped
                        ? "focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-[var(--tenant-background)]"
                        : "focus-visible:ring-brand-primary/25 focus-visible:ring-offset-brand-offset",
                      !tenantScoped &&
                        classNames(
                          "rounded-full py-0.5 pl-0.5 pr-2",
                          "transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none",
                          "hover:bg-white/75 hover:shadow-[0_6px_18px_rgba(17,17,15,0.05)]",
                          open &&
                            "bg-white/75 shadow-[0_6px_18px_rgba(17,17,15,0.05)]",
                        ),
                      tenantScoped &&
                        classNames(
                          "rounded-full py-0.5 pl-0.5 pr-2",
                          "transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none",
                          "hover:bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)] hover:shadow-[0_6px_18px_color-mix(in_srgb,var(--tenant-text)_7%,transparent)]",
                          open &&
                            "bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)] shadow-[0_6px_18px_color-mix(in_srgb,var(--tenant-text)_7%,transparent)]",
                        ),
                    )}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-[9px] font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-200 group-hover:bg-primary-hover"
                      style={
                        tenantScoped
                          ? {
                              backgroundColor: tenantAccentColor,
                              color: tenantAccentForeground,
                            }
                          : undefined
                      }
                    >
                      {userInitials}
                    </span>

                    <ChevronDownIcon
                      className={classNames(
                        "h-3 w-3 stroke-[1.7] text-[#777771]",
                        "transition-transform duration-200 motion-reduce:transition-none",
                        !tenantScoped && "group-hover:text-primary-text",
                        open && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </PopoverButton>

                  <Transition
                    as={Fragment}
                    show={open}
                    enter="transition-[opacity,transform] duration-180 ease-out motion-reduce:transition-none"
                    enterFrom="translate-y-2 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
                    enterTo="translate-y-0 scale-100 opacity-100"
                    leave="transition-[opacity,transform] duration-120 ease-in motion-reduce:transition-none"
                    leaveFrom="translate-y-0 scale-100 opacity-100"
                    leaveTo="translate-y-1 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
                  >
                    <PopoverPanel
                      data-profile-menu-panel
                      className={classNames(
                        "absolute right-0 top-[calc(100%+10px)] z-50",
                        "flex max-h-[calc(100vh-132px)] max-h-[calc(100dvh-132px)] w-72 origin-top-right flex-col overflow-hidden",
                        "rounded-[16px] border border-line bg-surface-raised",
                        "shadow-[0_24px_70px_rgba(17,17,15,0.11)]",
                        "will-change-[transform,opacity] focus:outline-none motion-reduce:transform-none",
                      )}
                    >
                      <div className="shrink-0 border-b border-[#E7E4DE] px-5 py-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-accent-text">
                          {t("account.eyebrow")}
                        </p>

                        <p className="mt-1.5 text-[13px] font-semibold tracking-[-0.02em] text-[#11110F]">
                          {isAdminRoute
                            ? t("account.studioManagement")
                            : t("account.fallbackName")}
                        </p>
                      </div>

                      <UserActionsMenuContent
                        isAdminRoute={isAdminRoute}
                        onLogout={onLogout}
                        onSwitchToAdminMode={onSwitchToAdminMode}
                        onOpenBookingSite={onOpenBookingSite}
                        toggleLanguage={onToggleLanguage}
                        languageTargetLocale={languageTargetLocale}
                        onClose={close}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
          ) : null}
        </>
      ) : null}
    </div>
  );
});

export default DesktopActions;
