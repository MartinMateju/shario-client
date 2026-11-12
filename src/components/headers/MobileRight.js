"use client";

import {
  ArrowLongRightIcon,
  Bars3Icon,
  ShoppingBagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
import { Link } from "@/i18n/navigation";
import { CustomerPortalHelpTrigger } from "@/components/customer-shell/CustomerPortalHelpTrigger";
import CustomerNotificationMenu from "@/components/notifications/CustomerNotificationMenu";

import LanguageSelector from "./LanguageSelector";
import NotificationButton from "./NotificationButton";
import { classNames, headerCountBadgeClass } from "./header.utils";

const mobileIconButtonClass =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E7E4DE] bg-white/70 text-[#1F1F1F] transition-all duration-300 hover:border-[#D8D3CA] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-offset";

const tenantMobileIconButtonClass =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition-all duration-200 hover:border-[var(--tenant-secondary)] hover:text-[var(--tenant-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-secondary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)] motion-reduce:transition-none";

const compactPrimaryActionClass =
  "hidden h-11 items-center gap-2.5 rounded-full bg-brand-primary px-5 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgb(var(--skab-blue-rgb)/0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-offset md:inline-flex";

const compactPortalActionClass =
  "hidden h-10 items-center rounded-full border px-4 text-[11px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color] duration-200 hover:border-[color-mix(in_srgb,var(--tenant-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--tenant-accent)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)] md:inline-flex motion-reduce:transition-none";

export default function MobileRight({
  isAuthenticated,
  isBooking,
  isMarketingHome = false,
  cartCount = 0,
  onOpenCart,
  onOpenWorkspace,
  onSwitchToUserMode,
  showLanguageSelector = true,
  languageLocaleCodes,
  languageContextLabel = "Shario",
  menuOnly = false,
  mobileMenuOpen,
  toggleMobileMenu,
  onOpenUserActions,
  userInitials = "ME",
  customerPortalHref = "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
  notificationHref,
  customerSurface = null,
  sessionReady = true,
  tenantAccentColor,
  tenantAccentLinkColor,
  customerHelpControls,
  customerHelpOpen = false,
  onOpenCustomerHelp,
}) {
  const t = useTranslations("Header");
  const publicTenantT = useTranslations("PublicTenant");

  const menuLabel = mobileMenuOpen ? t("closeMenu") : t("openMenu");
  const showPlatformUserAccountAction =
    !isMarketingHome && customerSurface == null;

  return (
    <div className="flex items-center gap-1.5">
      {showLanguageSelector &&
      customerSurface !== CUSTOMER_SHELL_SURFACES.PORTAL ? (
        <div
          className="relative hidden sm:block"
          data-testid="compact-header-language"
        >
          <LanguageSelector
            variant="compact"
            localeCodes={languageLocaleCodes}
            contextLabel={languageContextLabel}
            hideWhenSingle={Boolean(languageLocaleCodes)}
          />
        </div>
      ) : null}

      {!menuOnly &&
      !isBooking &&
      customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
      sessionReady ? (
        <Link
          className={compactPortalActionClass}
          data-testid="compact-header-customer-portal"
          data-customer-portal-entry-action
          href={customerPortalHref}
          style={{
            backgroundColor: `color-mix(in srgb, ${tenantAccentColor} 7%, transparent)`,
            borderColor: `color-mix(in srgb, ${tenantAccentColor} 28%, transparent)`,
            color: tenantAccentLinkColor,
          }}
        >
          {publicTenantT("actions.book")}
        </Link>
      ) : null}

      {!menuOnly && isAuthenticated && (
        <>
          {!isBooking && !customerSurface && (
            <button
              className={compactPrimaryActionClass}
              data-testid="compact-header-booking"
              onClick={isMarketingHome ? onOpenWorkspace : onSwitchToUserMode}
              type="button"
            >
              {isMarketingHome ? t("openWorkspace") : t("booking")}
              <ArrowLongRightIcon
                aria-hidden="true"
                className="h-4 w-4 stroke-[1.7]"
              />
            </button>
          )}

          {isBooking && cartCount > 0 && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={t("cart.open")}
              className={
                customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
                  ? tenantMobileIconButtonClass
                  : mobileIconButtonClass
              }
            >
              <ShoppingBagIcon
                className="h-5 w-5 stroke-[1.7]"
                aria-hidden="true"
              />

              {cartCount > 0 && (
                <span
                  className={classNames(
                    headerCountBadgeClass,
                    "bg-brand-primary",
                    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
                      ? "ring-[var(--tenant-background)]"
                      : "ring-brand-offset",
                  )}
                  data-header-badge="cart-count"
                  style={
                    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
                      ? {
                          backgroundColor: "var(--tenant-accent)",
                          color: "var(--tenant-accent-foreground)",
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

          {customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL &&
          onOpenCustomerHelp ? (
            <CustomerPortalHelpTrigger
              controls={customerHelpControls}
              expanded={customerHelpOpen}
              onOpen={onOpenCustomerHelp}
            />
          ) : null}

          {customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL ? (
            <CustomerNotificationMenu viewAllHref={notificationHref} />
          ) : !customerSurface && !isMarketingHome ? (
            <NotificationButton href={notificationHref} />
          ) : null}

          {showPlatformUserAccountAction ? (
            <button
              type="button"
              onClick={onOpenUserActions}
              aria-label={t("account.menu")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_8px_22px_rgb(var(--skab-blue-rgb)/0.22)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-offset"
            >
              {userInitials}
            </button>
          ) : null}
        </>
      )}

      <button
        type="button"
        onClick={toggleMobileMenu}
        aria-label={menuLabel}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-menu"
        className={classNames(
          customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
            ? tenantMobileIconButtonClass
            : mobileIconButtonClass,
          "lg:w-auto lg:gap-2 lg:px-4",
          mobileMenuOpen &&
            (customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
              ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] hover:border-[var(--tenant-accent)] hover:bg-[var(--tenant-accent)] hover:text-[var(--tenant-accent-foreground)]"
              : "border-brand-primary bg-brand-primary text-white hover:border-primary-hover hover:bg-primary-hover"),
        )}
        data-customer-portal-mobile-menu-trigger={
          customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL || undefined
        }
      >
        {mobileMenuOpen ? (
          <XMarkIcon className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
        ) : (
          <Bars3Icon className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
        )}
        <span className="hidden text-[11px] font-semibold lg:inline">
          {menuLabel}
        </span>
      </button>
    </div>
  );
}
