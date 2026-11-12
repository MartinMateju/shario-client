"use client";

import { NATIVE_INVOICES_ENABLED } from "@/config/features";
import {
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  QueueListIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { SETTINGS_ACCESS_PERMISSIONS } from "@/components/settings/settingsNavigation";
import { getLocaleDefinition } from "@/i18n/locales";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/config/permissions";
import { useGetMyCreditBalanceQuery } from "@/lib/features/credits/creditsApiSlice";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { formatCustomerPortalCurrencyAmount } from "@/components/customer-shell/CustomerPortalPrimitives";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  isCustomerPortalHrefEnabled,
  isCustomerPortalPageEnabled,
} from "@/components/customer-shell/customerPortalVisibility";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";
import {
  getPublicTenantLocaleCodes,
  resolvePublicTenantRouteLocale,
} from "@/components/public-tenant/publicTenant.config";
import LanguageSelector from "./LanguageSelector";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import {
  buildTenantUrl,
  getAuthenticatedTenantSlug,
} from "@/utils/tenantRouting";
import { classNames, isActivePath } from "./header.utils";
import {
  getUserAccess,
  getUserDisplayName,
  getUserInitials,
} from "@/utils/user-profile.utils.js";
const iconToneClasses = {
  cobalt: "bg-cobalt-100 text-cobalt-700",
  coral: "bg-coral-100 text-terracotta-700",
  ink: "bg-[#ECEBE7] text-[#292925]",
  olive: "bg-[#EDF0E8] text-[#657052]",
  sand: "bg-sand-100 text-sand-700",
};
function MenuItem({ item, onClose, onAction, portalThemed = false }) {
  const Icon = item.icon;
  const active = portalThemed && item.active;
  const content = (
    <>
      <span
        className={classNames(
          "flex shrink-0 items-center justify-center",
          portalThemed
            ? classNames(
                "h-10 w-10 rounded-[var(--tenant-radius-field)] sm:h-7 sm:w-7",
                active
                  ? "bg-[color-mix(in_srgb,var(--tenant-accent)_14%,var(--tenant-surface))] text-[var(--tenant-accent-on-surface)]"
                  : "bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))] text-[var(--tenant-accent-on-surface)]",
              )
            : classNames(
                "h-8 w-8 rounded-[10px]",
                iconToneClasses[item.tone] || iconToneClasses.ink,
              ),
        )}
      >
        <Icon
          className="h-[18px] w-[18px] stroke-[1.7] sm:h-[15px] sm:w-[15px]"
          aria-hidden="true"
        />
      </span>

      <span
        data-profile-menu-item-label={portalThemed || undefined}
        data-tenant-interactive-label={portalThemed || undefined}
        className={classNames(
          "min-w-0 flex-1 truncate font-medium tracking-[-0.01em]",
          portalThemed
            ? "text-[14px] text-current"
            : "text-[12px] text-[#292925]",
        )}
      >
        {item.label}
      </span>

      {item.value ? (
        <span
          aria-atomic={item.valueLive ? "true" : undefined}
          aria-live={item.valueLive ? "polite" : undefined}
          className={classNames(
            "shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold tabular-nums tracking-[0.03em]",
            portalThemed
              ? "bg-[color-mix(in_srgb,var(--tenant-accent)_10%,var(--tenant-surface))] text-[var(--tenant-accent-on-surface)]"
              : "bg-[#11110F] text-white",
          )}
        >
          {item.value}
        </span>
      ) : null}

      {item.opensInNewTab ? (
        <ArrowTopRightOnSquareIcon
          className="h-3.5 w-3.5 shrink-0 stroke-[1.7] text-[#777771]"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
  const itemClassName = classNames(
    "group flex min-h-11 w-full items-center text-left focus-visible:outline-none focus-visible:ring-2",
    portalThemed
      ? classNames(
          "min-h-12 gap-3 rounded-[var(--tenant-radius-field)] px-2.5 py-1 text-[var(--tenant-text)] sm:min-h-11 sm:gap-2.5 sm:px-2",
          "transition-colors duration-150 motion-reduce:transition-none",
          "focus-visible:ring-[var(--tenant-accent-link)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)]",
          active
            ? "bg-[color-mix(in_srgb,var(--tenant-accent)_9%,var(--tenant-background))] text-[var(--tenant-accent-on-surface)]"
            : "hover:bg-[color-mix(in_srgb,var(--tenant-accent)_5%,var(--tenant-background))] hover:text-[var(--tenant-text)]",
        )
      : "gap-2.5 rounded-[12px] px-2 py-1.5 transition-colors duration-200 hover:bg-[#F4F2ED] focus-visible:ring-cobalt-500/25",
  );
  if (item.href) {
    if (item.hardNavigation) {
      return (
        <a
          href={item.href}
          onClick={onClose}
          target={item.opensInNewTab ? "_blank" : undefined}
          rel={item.opensInNewTab ? "noopener noreferrer" : undefined}
          aria-label={item.ariaLabel}
          data-profile-menu-item={portalThemed || undefined}
          data-tenant-hover={portalThemed ? "preserve" : undefined}
          className={itemClassName}
          aria-current={active ? "page" : undefined}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={item.href}
        onClick={onClose}
        target={item.opensInNewTab ? "_blank" : undefined}
        rel={item.opensInNewTab ? "noopener noreferrer" : undefined}
        aria-label={item.ariaLabel}
        data-profile-menu-item={portalThemed || undefined}
        data-tenant-hover={portalThemed ? "preserve" : undefined}
        className={itemClassName}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onAction(item.onClick)}
      aria-label={item.ariaLabel}
      data-profile-menu-item={portalThemed || undefined}
      data-tenant-hover={portalThemed ? "preserve" : undefined}
      className={itemClassName}
    >
      {content}
    </button>
  );
}
function MenuSection({
  label,
  items,
  onClose,
  onAction,
  portalThemed = false,
}) {
  if (!items.length) {
    return null;
  }
  return (
    <section aria-label={label}>
      <p
        data-tenant-type={portalThemed ? "eyebrow" : undefined}
        className={classNames(
          "px-2 pb-0.5 font-semibold uppercase",
          portalThemed
            ? "text-[8.5px] tracking-[0.12em] text-[var(--tenant-label-color)]"
            : "text-[9px] tracking-[0.16em] text-[#92918B]",
        )}
      >
        {label}
      </p>

      <div className={portalThemed ? "mt-px space-y-px" : "space-y-0.5"}>
        {items.map((item) => (
          <MenuItem
            key={item.href || item.label}
            item={item}
            onClose={onClose}
            onAction={onAction}
            portalThemed={portalThemed}
          />
        ))}
      </div>
    </section>
  );
}
function LanguageUtility({
  badge,
  hardNavigation = false,
  href,
  label,
  onActivate,
  portalThemed = false,
}) {
  const content = (
    <>
      <span
        className={classNames(
          "flex h-7 w-7 shrink-0 items-center justify-center shadow-xs",
          portalThemed
            ? "rounded-[var(--tenant-radius-field)] bg-[var(--tenant-background)] text-[var(--tenant-accent-on-surface)]"
            : "rounded-[9px] bg-white text-[#4F4F4F]",
        )}
      >
        <GlobeAltIcon className="h-3.5 w-3.5 stroke-[1.7]" aria-hidden="true" />
      </span>
      <span
        data-tenant-interactive-label={portalThemed || undefined}
        className={classNames(
          "min-w-0 flex-1 truncate text-[12px] font-medium",
          portalThemed
            ? "text-[var(--tenant-text-on-surface)]"
            : "text-[#4F4F4F]",
        )}
      >
        {label}
      </span>
      <span
        className={classNames(
          "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em]",
          portalThemed
            ? "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-muted-text)]"
            : "border-[#E3E0D9] bg-white text-[#6F6E68]",
        )}
      >
        {badge}
      </span>
    </>
  );
  const className = classNames(
    "group flex min-h-11 min-w-0 items-center gap-2 px-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none",
    portalThemed
      ? "rounded-[var(--tenant-radius-field)] text-[var(--tenant-text-on-surface)] hover:bg-[var(--tenant-background)] focus-visible:ring-[var(--tenant-accent-link)]/30"
      : "rounded-[12px] hover:bg-white focus-visible:ring-cobalt-500/25",
  );
  if (!href && !onActivate) {
    return (
      <div
        aria-disabled="true"
        aria-label={label}
        data-profile-menu-utility="language"
        className={classNames(className, "pointer-events-none opacity-90")}
      >
        {content}
      </div>
    );
  }
  if (href && hardNavigation) {
    return (
      <a
        href={href}
        onClick={onActivate}
        data-profile-menu-utility="language"
        data-tenant-hover={portalThemed ? "preserve" : undefined}
        className={className}
      >
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        onClick={onActivate}
        data-profile-menu-utility="language"
        data-tenant-hover={portalThemed ? "preserve" : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onActivate}
      data-profile-menu-utility="language"
      data-tenant-hover={portalThemed ? "preserve" : undefined}
      className={className}
    >
      {content}
    </button>
  );
}
export default function UserActionsMenuContent({
  isAdminRoute = false,
  onLogout,
  onSwitchToAdminMode,
  onOpenBookingSite,
  toggleLanguage,
  languageTargetLocale,
  onClose,
  portalThemed = false,
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Header.account");
  const currentUser = useSelector(selectCurrentUser);
  const currentTenant = useSelector(selectCurrentTenant);
  const portalTenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const customerPortalLocation = useOptionalCustomerPortalLocation();
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const userAccess = getUserAccess(currentUser, workspaceAccess);
  const isTenantUser = userAccess.isTenantUser || isAdminRoute;
  const isEndCustomer = portalThemed || !isTenantUser;
  const useCustomerPortalPresentation = portalThemed;
  const tenantModules = currentTenant?.modules;
  const hasPublicWorkspace = ["bookings", "courses", "memberships"].some(
    (module) => tenantModules?.[module] !== false,
  );
  const canOpenSettings = hasAnyPermission(
    workspaceAccess,
    SETTINGS_ACCESS_PERMISSIONS,
  );
  const settingsHref = canOpenSettings ? "/app/settings" : "/app";
  const tenantSlug = getAuthenticatedTenantSlug({
    tenant: currentTenant,
    user: currentUser,
    workspaceAccess,
  });
  const isPlatformWorkspaceMenu = !isAdminRoute && isTenantUser;
  const useTenantOriginLinks = isPlatformWorkspaceMenu && Boolean(tenantSlug);
  const workspaceRouteLocale = resolveWorkspaceRouteLocale(
    currentTenant?.settings,
    routing.locales,
  );
  const resolveWorkspaceLink = (href) => {
    if (useTenantOriginLinks) {
      return {
        href: buildTenantUrl({
          slug: tenantSlug,
          locale: workspaceRouteLocale,
          pathname: href,
        }),
        hardNavigation: true,
      };
    }
    return {
      href: isPlatformWorkspaceMenu ? "/login" : href,
      hardNavigation: false,
    };
  };
  const publicSiteHref = tenantSlug
    ? buildTenantUrl({
        slug: tenantSlug,
        locale: resolvePublicTenantRouteLocale(
          currentTenant?.settings,
          currentUser?.customerDefaultLanguage,
          routing.locales,
        ),
        pathname: "/?from=workspace",
      })
    : null;
  const canManageWorkspaceLanguage = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_UPDATE,
  );
  const languageSettingsLink =
    isTenantUser && canManageWorkspaceLanguage
      ? resolveWorkspaceLink("/app/settings/general")
      : null;
  const languageBadge =
    getLocaleDefinition(
      isTenantUser
        ? workspaceRouteLocale
        : languageTargetLocale || (locale === "cs" ? "en" : "cs"),
    )?.shortLabel || locale.toUpperCase();
  const { data: creditBalanceData, isLoading: isCreditBalanceLoading } =
    useGetMyCreditBalanceQuery(undefined, {
      skip:
        (!useCustomerPortalPresentation && isTenantUser) ||
        tenantModules?.credits === false ||
        !isCustomerPortalPageEnabled(portalTenant, "credits"),
    });
  const creditBalance =
    creditBalanceData?.balance ??
    creditBalanceData?.creditBalance ??
    creditBalanceData?.credits ??
    0;
  const handleActionClick = (callback) => {
    callback?.();
    onClose?.();
  };
  const customerLinks = [
    {
      href: "/portal/bookings",
      label: t("customerLinks.bookings"),
      icon: CalendarDaysIcon,
      tone: "coral",
      modules: ["bookings", "courses"],
      section: "activity",
    },
    {
      href: "/portal/waitlists",
      label: t("customerLinks.waitlists"),
      icon: QueueListIcon,
      tone: "olive",
      section: "activity",
    },
    {
      href: "/portal/credits",
      label: t("customerLinks.credits"),
      value: isCreditBalanceLoading
        ? "…"
        : formatCustomerPortalCurrencyAmount(
            creditBalance,
            currentTenant?.settings?.currency ||
              DEFAULT_STUDIO_COMMERCE_CURRENCY,
            locale,
          ),
      valueLive: true,
      icon: WalletIcon,
      tone: "sand",
      module: "credits",
      section: "payments",
    },
    {
      href: "/portal/invoices",
      label: t("customerLinks.invoices"),
      icon: DocumentTextIcon,
      tone: "coral",
      module: "payments",
      section: "payments",
    },
    {
      href: "/portal/account",
      label: t("customerLinks.account"),
      icon: UserCircleIcon,
      tone: "ink",
      section: "personal",
    },
  ];
  const tenantPersonalLinks = [
    {
      ...resolveWorkspaceLink("/app/account"),
      label: t("tenantLinks.account"),
      icon: UserCircleIcon,
      tone: "ink",
    },
    {
      ...resolveWorkspaceLink("/app/preferences"),
      label: t("tenantLinks.preferences"),
      icon: AdjustmentsHorizontalIcon,
      tone: "olive",
    },
  ];
  const tenantWorkspaceLinks = [
    ...(!isAdminRoute
      ? [
          {
            label: t("tenantLinks.dashboard"),
            icon: Squares2X2Icon,
            tone: "cobalt",
            onClick: onSwitchToAdminMode,
          },
        ]
      : []),
    ...(hasPermission(workspaceAccess, PERMISSIONS.WORKSPACE_UPDATE)
      ? [
          {
            ...resolveWorkspaceLink("/app/setup"),
            label: t("tenantLinks.setupCenter"),
            icon: RocketLaunchIcon,
            tone: "cobalt",
          },
        ]
      : []),
    ...(canOpenSettings
      ? [
          {
            ...resolveWorkspaceLink(settingsHref),
            label: t("tenantLinks.settings"),
            icon: Cog6ToothIcon,
            tone: "coral",
          },
        ]
      : []),
    ...(isAdminRoute && hasPublicWorkspace
      ? [
          {
            opensInNewTab: true,
            ariaLabel: t("tenantLinks.bookingSiteNewTab"),
            ...(publicSiteHref
              ? {
                  href: publicSiteHref,
                  hardNavigation: true,
                }
              : {
                  onClick: onOpenBookingSite,
                }),
            label: t("tenantLinks.bookingSite"),
            icon: BuildingStorefrontIcon,
            tone: "sand",
          },
        ]
      : []),
  ];
  const activeLocation = customerPortalLocation?.activeLocation;
  const visibleCustomerLinks = customerLinks
    .filter((item) =>
      isCustomerPortalHrefEnabled(
        portalTenant,
        item.href,
        customerPortalLocation?.activeLocation,
      ),
    )
    .filter(
      (item) => NATIVE_INVOICES_ENABLED || item.href !== "/portal/invoices",
    )
    .filter((item) => {
      return item.allModules
        ? item.allModules.every((module) => tenantModules?.[module] !== false)
        : item.modules
          ? item.modules.some((module) => tenantModules?.[module] !== false)
          : !item.module || tenantModules?.[item.module] !== false;
    })
    .map((item) => ({
      ...item,
      href: retainCustomerPortalLocation(
        item.href,
        customerPortalLocation?.activeLocationReference,
      ),
    }))
    .map((item) => ({
      ...item,
      active: isActivePath(pathname, item.href),
    }));
  const sections = isEndCustomer
    ? useCustomerPortalPresentation
      ? ["activity", "payments", "personal"].map((section) => ({
          label: t(`sections.${section}`),
          items: visibleCustomerLinks.filter(
            (item) => item.section === section,
          ),
        }))
      : [
          {
            label: t("sections.customer"),
            items: visibleCustomerLinks,
          },
        ]
    : [
        {
          label: t("sections.personal"),
          items: tenantPersonalLinks,
        },
        {
          label: t("sections.workspace"),
          items: tenantWorkspaceLinks,
        },
      ];
  return (
    <div
      className={classNames(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        useCustomerPortalPresentation &&
          "bg-[var(--tenant-background)] text-[var(--tenant-text)]",
      )}
      data-profile-menu-content
      data-customer-portal-profile-content={
        useCustomerPortalPresentation || undefined
      }
    >
      {useCustomerPortalPresentation ? (
        <div
          className="relative shrink-0 overflow-hidden border-b border-[var(--tenant-border)] px-4 py-3 text-[var(--tenant-text-on-surface)] sm:px-3.5 sm:py-2.5"
          data-profile-menu-identity
          style={{
            background:
              "linear-gradient(135deg, var(--tenant-surface), color-mix(in srgb, var(--tenant-accent) 5%, var(--tenant-surface)))",
          }}
        >
          <div className="relative flex min-w-0 items-center gap-3 sm:gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--tenant-accent)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tenant-accent-foreground)] shadow-[var(--tenant-shadow-xs)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--tenant-accent-foreground)_18%,transparent)] sm:h-10 sm:w-10 sm:text-[9px]"
            >
              {getUserInitials(currentUser, "ME")}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--tenant-label-color)]"
                data-tenant-type="eyebrow"
              >
                {t("eyebrow")}
              </p>
              <p
                className="mt-px truncate text-[17px] font-semibold leading-tight tracking-[-0.025em] text-[var(--tenant-text-on-surface)] sm:text-[16px]"
                data-profile-menu-customer-name
              >
                {getUserDisplayName(currentUser) || t("fallbackName")}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--tenant-muted-on-surface)]">
                {currentUser?.email || t("roles.customer")}
              </p>
              {activeLocation?.name || currentTenant?.name ? (
                <span className="mt-1.5 inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-2.5 text-[9px] font-medium text-[var(--tenant-muted-text)]">
                  <BuildingStorefrontIcon
                    className="h-3 w-3 shrink-0 stroke-[1.7] text-[var(--tenant-accent-on-surface)]"
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {activeLocation?.name || currentTenant?.name}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label={t("menu")}
        className={classNames(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          useCustomerPortalPresentation
            ? "scrollbar-hidden scroll-pb-3 px-3 py-2 sm:px-2.5 sm:py-1.5"
            : "px-3 py-2.5 [scrollbar-gutter:stable]",
        )}
        data-profile-menu-scroll
      >
        <div
          className={
            useCustomerPortalPresentation
              ? "divide-y divide-[var(--tenant-border)] [&>section]:py-1.5 [&>section:first-child]:pt-0 [&>section:last-child]:pb-1.5"
              : "space-y-2.5"
          }
        >
          {sections.map((section) => (
            <MenuSection
              key={section.label}
              label={section.label}
              items={section.items}
              onClose={onClose}
              onAction={handleActionClick}
              portalThemed={useCustomerPortalPresentation}
            />
          ))}
        </div>
      </nav>

      <div
        className={classNames(
          "grid shrink-0 grid-cols-2 gap-2 border-t p-2.5 sm:p-2",
          useCustomerPortalPresentation
            ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
            : "border-[#E7E4DE] bg-[#F7F5F1]",
        )}
        data-profile-menu-footer
      >
        {isEndCustomer ? (
          <div data-profile-menu-utility="language" className="min-w-0">
            <LanguageSelector
              variant="profile"
              tenantThemed={useCustomerPortalPresentation}
              tenantScoped
              tenantSlug={portalTenant?.slug || tenantSlug}
              localeCodes={getPublicTenantLocaleCodes(
                portalTenant?.settings,
                routing.locales,
              )}
              contextLabel={
                portalTenant?.publicSite?.branding?.displayName ||
                portalTenant?.name ||
                undefined
              }
              hideWhenSingle
              onLocaleChange={onClose}
            />
          </div>
        ) : (
          <LanguageUtility
            badge={languageBadge}
            hardNavigation={languageSettingsLink?.hardNavigation}
            href={languageSettingsLink?.href}
            label={t("language")}
            onActivate={
              isTenantUser
                ? canManageWorkspaceLanguage
                  ? onClose
                  : undefined
                : () => handleActionClick(toggleLanguage)
            }
            portalThemed={useCustomerPortalPresentation}
          />
        )}

        <button
          type="button"
          onClick={() => handleActionClick(onLogout)}
          data-profile-menu-utility={
            useCustomerPortalPresentation ? "logout" : undefined
          }
          data-tenant-hover="preserve"
          className={classNames(
            "group flex min-h-11 min-w-0 items-center gap-2 px-2 text-left transition-colors duration-150 hover:bg-[#FFF4F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/25",
            useCustomerPortalPresentation
              ? "rounded-[var(--tenant-radius-field)]"
              : "rounded-[12px]",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-coral-100 text-terracotta-700">
            <ArrowRightStartOnRectangleIcon
              className="h-3.5 w-3.5 stroke-[1.7]"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#A34E38]">
            {t("logout")}
          </span>
        </button>
      </div>
    </div>
  );
}
