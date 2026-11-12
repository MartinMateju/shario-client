"use client";

import { Fragment, memo, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  AcademicCapIcon,
  ArrowLongRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GiftIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";
import { customerPortalHeaderThemeStyle } from "@/components/customer-shell/CustomerPortalPrimitives";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import Brand from "./Brand";
import publicStyles from "./workingStudioHeader.module.css";
import styles from "./portalMobileMenu.module.css";
import LanguageSelector from "./LanguageSelector";
import {
  ADMIN_LINKS,
  isAdminItemActive,
  isAdminSectionActive,
} from "./DesktopNavAdmin";
import { classNames, isActivePath } from "./header.utils";
import { PUBLIC_NAV_ITEMS } from "./marketingNavigation";

const getLegacyAdminLabel = (value, language, fallback = "") => {
  if (typeof value === "string") return value;

  return value?.[language] || value?.EN || value?.CZ || fallback;
};

function PublicNavigation({ pathname, closeMobileMenu }) {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      {PUBLIC_NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);

        if (item.type === "menu") {
          return (
            <Disclosure as="div" defaultOpen={active} key={item.key}>
              <DisclosureButton
                className={classNames(
                  "group flex min-h-[58px] w-full items-center justify-between rounded-[18px] border px-4 text-left text-[15px] font-semibold tracking-[-0.02em] transition-all duration-300",
                  active
                    ? "border-skab-cobalt-200 bg-skab-cobalt-50 text-[#1F1F1F]"
                    : "border-transparent bg-white/45 text-[#3F3F3B] hover:border-[#E7E4DE] hover:bg-white",
                )}
                data-marketing-mobile-trigger={item.key}
              >
                <span>{t(item.labelKey)}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 stroke-[1.7] text-[#777771] transition-transform duration-300 group-data-[open]:rotate-180"
                />
              </DisclosureButton>

              <DisclosurePanel
                className="mt-2 space-y-1.5 rounded-[18px] border border-line bg-white/65 p-2"
                data-marketing-mobile-panel={item.key}
              >
                <p className="px-3 pb-2 pt-1 text-[11px] leading-5 text-[#686864]">
                  {t(item.descriptionKey)}
                </p>

                {item.items.map((subItem) => (
                  <Link
                    aria-current={
                      isActivePath(pathname, subItem.href) ? "page" : undefined
                    }
                    className="group flex min-h-[54px] items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-skab-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/25"
                    data-marketing-mobile-link
                    href={subItem.href}
                    key={subItem.key}
                    onClick={closeMobileMenu}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold tracking-[-0.015em] text-[#292925]">
                        {t(subItem.labelKey)}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-[18px] text-[#686864]">
                        {t(subItem.descriptionKey)}
                      </span>
                    </span>
                    <ArrowLongRightIcon
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 stroke-[1.65] text-[#8A8A84] transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}

                <Link
                  className="flex min-h-11 items-center justify-between rounded-[14px] bg-[#F4F1EB] px-3 text-[12px] font-semibold text-[#292925] transition-colors hover:bg-[#ECE8DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/25"
                  data-marketing-mobile-link
                  href={item.href}
                  onClick={closeMobileMenu}
                >
                  {t(item.overviewLabelKey)}
                  <ArrowLongRightIcon
                    aria-hidden="true"
                    className="h-4 w-4 stroke-[1.65]"
                  />
                </Link>
              </DisclosurePanel>
            </Disclosure>
          );
        }

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={classNames(
              "flex min-h-[58px] items-center justify-between rounded-[18px] border px-4 text-[15px] font-semibold tracking-[-0.02em] transition-all duration-300",
              active
                ? "border-skab-cobalt-200 bg-skab-cobalt-50 text-[#1F1F1F]"
                : "border-transparent bg-white/45 text-[#3F3F3B] hover:border-[#E7E4DE] hover:bg-white",
            )}
            data-marketing-mobile-link
            href={item.href}
            key={item.key}
            onClick={closeMobileMenu}
          >
            {t(item.labelKey)}

            <ArrowLongRightIcon
              aria-hidden="true"
              className="h-4 w-4 stroke-[1.65] text-[#8A8A84]"
            />
          </Link>
        );
      })}
    </div>
  );
}

function AdminNavigation({ pathname, language, closeMobileMenu }) {
  const t = useTranslations("Header.mobile");

  return (
    <div className="space-y-2">
      {ADMIN_LINKS.map((section) => {
        const active = isAdminSectionActive(pathname, section);
        const Icon = section.icon;
        const label = getLegacyAdminLabel(section.label, language, section.id);

        return (
          <Disclosure as="div" defaultOpen={active} key={section.id}>
            <DisclosureButton
              className={classNames(
                "group flex min-h-[58px] w-full items-center justify-between rounded-[18px] border px-4 text-left transition-all duration-300",
                active
                  ? "border-skab-cobalt-200 bg-skab-cobalt-50 text-[#1F1F1F]"
                  : "border-transparent bg-white/45 text-[#4F4F4F] hover:border-[#E7E4DE] hover:bg-white",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={classNames(
                    "grid h-9 w-9 place-items-center rounded-full",
                    active
                      ? "bg-brand-primary text-white"
                      : "bg-surface-muted text-[#696964]",
                  )}
                >
                  <Icon
                    className="h-[18px] w-[18px] stroke-[1.65]"
                    aria-hidden="true"
                  />
                </span>

                <span className="text-[14px] font-semibold tracking-[-0.015em]">
                  {label}
                </span>
              </span>

              <ChevronDownIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 stroke-[1.7] transition-transform duration-300 group-data-[open]:rotate-180"
              />
            </DisclosureButton>

            <DisclosurePanel className="mt-2 space-y-1.5 pl-4">
              <Link
                href={section.href}
                onClick={closeMobileMenu}
                className="flex min-h-11 items-center justify-between rounded-[15px] px-4 text-[13px] font-medium text-primary-text transition hover:bg-skab-cobalt-50"
              >
                {t("moduleOverview")}

                <ArrowLongRightIcon
                  className="h-4 w-4 stroke-[1.7]"
                  aria-hidden="true"
                />
              </Link>

              {section.items.map((item) => {
                const ItemIcon = item.icon;
                const itemActive = isAdminItemActive(pathname, item);
                const itemLabel = getLegacyAdminLabel(
                  item.label,
                  language,
                  item.href,
                );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    aria-current={itemActive ? "page" : undefined}
                    className={classNames(
                      "flex min-h-12 items-center gap-3 rounded-[15px] px-4 text-[13px] transition",
                      itemActive
                        ? "bg-white text-[#1F1F1F] shadow-[0_8px_22px_rgba(31,31,31,0.06)]"
                        : "text-[#686864] hover:bg-white/70 hover:text-[#1F1F1F]",
                    )}
                  >
                    <ItemIcon
                      className="h-4 w-4 stroke-[1.65]"
                      aria-hidden="true"
                    />

                    {itemLabel}
                  </Link>
                );
              })}
            </DisclosurePanel>
          </Disclosure>
        );
      })}
    </div>
  );
}

const PORTAL_NAVIGATION_ICONS = {
  bookSession: CalendarDaysIcon,
  courses: AcademicCapIcon,
  memberships: SparklesIcon,
  giftVouchers: GiftIcon,
  studioGuide: BookOpenIcon,
};

function TenantNavigation({
  pathname,
  items,
  closeMobileMenu,
  portalThemed = false,
}) {
  return (
    <div
      className={portalThemed ? styles.navigationList : "grid gap-0"}
      data-tenant-mobile-navigation
      data-customer-portal-mobile-navigation={portalThemed || undefined}
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = PORTAL_NAVIGATION_ICONS[item.key];

        if (portalThemed) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              aria-current={active ? "page" : undefined}
              data-tenant-hover="preserve"
              className={styles.navigationLink}
            >
              {Icon ? (
                <Icon aria-hidden="true" className={styles.navigationIcon} />
              ) : null}
              <span className={styles.navigationLabel}>
                {item.label || item.key}
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className={styles.navigationChevron}
              />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobileMenu}
            aria-current={active ? "page" : undefined}
            className={classNames(
              "group relative flex min-h-[58px] items-center border-b border-[var(--tenant-border)] px-2",
              "text-[17px] font-semibold tracking-[-0.02em] text-[var(--tenant-heading-color)]",
              "transition-[color,opacity] duration-300 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tenant-heading-color)]/30",
              "motion-reduce:transition-none",
              active ? "opacity-100" : "opacity-80 hover:opacity-100",
            )}
            style={{
              fontFamily: "var(--tenant-font-label)",
              fontSize: "clamp(1.0625rem, 4.8vw, 1.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              minHeight: "3.625rem",
              textTransform: "var(--tenant-header-text-transform, none)",
            }}
          >
            <span className="relative min-w-0 py-1">
              <span className="truncate">{item.label || item.key}</span>
              <span
                aria-hidden="true"
                data-tenant-navigation-indicator
                className={classNames(
                  "absolute inset-x-0 -bottom-1 h-[2px] rounded-full bg-current",
                  "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "origin-left scale-x-100 opacity-100"
                    : "origin-right scale-x-0 opacity-0 group-hover:origin-left group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:origin-left group-focus-visible:scale-x-100 group-focus-visible:opacity-100",
                )}
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const MobileMenu = memo(function MobileMenu({
  open,
  setOpen,
  pathname = "",
  isAdminRoute = false,
  isTenantRoute = false,
  isAuthenticated = false,
  isMarketingHome = false,
  studioPublicTheme = false,
  closeMobileMenu,
  showLanguageSelector = true,
  languageLocaleCodes,
  languageContextLabel = "Shario",
  onOpenUserActions,
  onSwitchToAdminMode,
  onOpenBookingSite,
  customerSurface = null,
  sessionReady = true,
  canAccessAdmin = false,
  tenant = null,
  tenantBrandHref = "/",
  tenantNavigation = [],
  tenantPrimaryAction = null,
  tenantDegraded = false,
  tenantAccentColor = SKAB_BRAND_COLORS.primary,
  tenantAccentForeground = "#FFFFFF",
  tenantAccentLinkColor = SKAB_BRAND_COLORS.primary,
  customerPortalHref = "/login?next=%2Fportal%3Ftab%3Dstudio-calendar",
  userInitials = "ME",
  portalStudioName = "",
  tenantThemeStyle = null,
  tenantStylePresetId = null,
  customerHelpControls,
  onOpenCustomerHelp,
}) {
  const locale = useLocale();
  const t = useTranslations("Header");
  const tm = useTranslations("Header.mobile");
  const language = locale === "cs" ? "CZ" : "EN";
  const publicTenantT = useTranslations("PublicTenant");
  const shellT = useTranslations("CustomerShell");
  const tenantName =
    tenant?.publicSite?.branding?.displayName || tenant?.name || "";
  const showPublicTenantActions =
    isTenantRoute &&
    customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
    !tenantDegraded;
  const showAuthHomeAction =
    isTenantRoute &&
    (customerSurface === CUSTOMER_SHELL_SURFACES.AUTH ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
        sessionReady));
  const showCustomerPortalAction =
    isTenantRoute &&
    customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
    sessionReady;
  const showAnonymousSignIn =
    !showCustomerPortalAction &&
    (!isTenantRoute ||
      showPublicTenantActions ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
        sessionReady) ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL && sessionReady));
  const mobileEyebrow =
    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
      ? shellT("mobile.portalEyebrow")
      : customerSurface === CUSTOMER_SHELL_SURFACES.AUTH
        ? shellT("mobile.authEyebrow")
        : customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION
          ? shellT("mobile.transactionEyebrow")
          : publicTenantT("mobile.eyebrow");
  const mobileTitle =
    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
      ? shellT("mobile.portalTitle", {
          studio: portalStudioName || tenantName,
        })
      : customerSurface === CUSTOMER_SHELL_SURFACES.AUTH
        ? shellT("mobile.authTitle", { studio: tenantName })
        : customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION
          ? shellT("mobile.transactionTitle", { studio: tenantName })
          : publicTenantT("mobile.title", { studio: tenantName });
  const showCustomerPortalShortcut =
    isTenantRoute &&
    !isAdminRoute &&
    sessionReady &&
    customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC;
  const isCustomerPortal = customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL;
  const showUserAccountAction =
    !isMarketingHome && (!customerSurface || isCustomerPortal);

  const handleOpenUserActions = useCallback(() => {
    closeMobileMenu?.();
    onOpenUserActions?.();
  }, [closeMobileMenu, onOpenUserActions]);

  const handleOpenCustomerHelp = useCallback(() => {
    closeMobileMenu?.();
    onOpenCustomerHelp?.();
  }, [closeMobileMenu, onOpenCustomerHelp]);

  const mobileBreakpointClass = "xl:hidden";

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        onClose={setOpen}
        className={classNames("relative z-[100]", mobileBreakpointClass)}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300 ease-out motion-reduce:transition-none"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200 ease-in motion-reduce:transition-none"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 z-[101] bg-[#11110F]/18 backdrop-blur-[3px]"
            aria-hidden="true"
          />
        </TransitionChild>

        <div className="fixed inset-0 z-[102] overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <TransitionChild
              as={Fragment}
              enter="transform transition duration-300 ease-out motion-reduce:transition-none"
              enterFrom="translate-x-full opacity-0"
              enterTo="translate-x-0 opacity-100"
              leave="transform transition duration-200 ease-in motion-reduce:transition-none"
              leaveFrom="translate-x-0 opacity-100"
              leaveTo="translate-x-full opacity-0"
            >
              <DialogPanel
                id="mobile-menu"
                data-dialog-layout="drawer"
                data-skab-public-surface={studioPublicTheme || undefined}
                data-tenant-style={
                  isTenantRoute ? tenantStylePresetId || undefined : undefined
                }
                data-tenant-surface={isTenantRoute ? "panel" : undefined}
                className={classNames(
                  "relative flex h-full w-screen max-w-[440px] flex-col overflow-y-auto overscroll-contain border-l shadow-[-28px_0_80px_rgba(31,31,31,0.16)]",
                  studioPublicTheme && publicStyles.mobileMenu,
                  isCustomerPortal && styles.portalMenu,
                  isTenantRoute
                    ? "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]"
                    : "border-line bg-surface-raised",
                )}
                style={
                  isTenantRoute
                    ? {
                        ...tenantThemeStyle,
                        ...(isCustomerPortal
                          ? customerPortalHeaderThemeStyle
                          : {}),
                        backgroundColor: "var(--tenant-background)",
                        color: "var(--tenant-text)",
                      }
                    : undefined
                }
                data-customer-portal-mobile-menu={isCustomerPortal || undefined}
              >
                <DialogTitle className="sr-only">
                  {tm("navigation")}
                </DialogTitle>

                <div
                  data-public-menu-top={studioPublicTheme || undefined}
                  className={classNames(
                    "sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6",
                    isCustomerPortal && styles.header,
                    isTenantRoute
                      ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]/95"
                      : "border-line/90 bg-surface-raised/95",
                  )}
                  style={
                    isTenantRoute
                      ? {
                          backgroundColor: "var(--tenant-background)",
                          borderColor: "var(--tenant-border)",
                        }
                      : undefined
                  }
                >
                  <Brand
                    onClickHome={closeMobileMenu}
                    tenant={isTenantRoute ? tenant : null}
                    href={tenantBrandHref}
                    textColor={isTenantRoute ? "var(--tenant-text)" : undefined}
                  />

                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    data-tenant-hover={
                      isCustomerPortal ? "preserve" : undefined
                    }
                    className={classNames(
                      "inline-flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none",
                      isCustomerPortal && styles.closeButton,
                      isTenantRoute
                        ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] hover:border-[var(--tenant-accent-on-surface)] focus-visible:ring-[var(--tenant-accent-link)]/30"
                        : "border-[#E7E4DE] bg-white/75 text-[#1F1F1F] hover:border-[#D8D3CA] hover:bg-white focus-visible:ring-brand-primary/30",
                    )}
                    aria-label={t("closeMenu")}
                  >
                    <XMarkIcon
                      aria-hidden="true"
                      className="h-5 w-5 stroke-[1.8]"
                    />
                  </button>
                </div>

                <div
                  className={classNames(
                    "flex flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-7 sm:px-6",
                    isCustomerPortal && styles.content,
                  )}
                >
                  <div className={isCustomerPortal ? styles.context : "mb-7"}>
                    <p
                      className={classNames(
                        isCustomerPortal && styles.eyebrow,
                        isTenantRoute || isAdminRoute
                          ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-text"
                          : "max-w-[350px] text-[11px] font-medium leading-4 tracking-[-0.01em] text-accent-text",
                      )}
                      data-tenant-type="eyebrow"
                      style={
                        isTenantRoute
                          ? { color: "var(--tenant-accent-link)" }
                          : undefined
                      }
                    >
                      {isAdminRoute
                        ? tm("adminEyebrow")
                        : isTenantRoute
                          ? mobileEyebrow
                          : tm("publicEyebrow")}
                    </p>

                    <p
                      className={classNames(
                        "mt-3 max-w-[350px] leading-[1.02] tracking-[-0.05em]",
                        isCustomerPortal && styles.title,
                        isTenantRoute
                          ? "text-[34px]"
                          : "text-[30px] font-semibold text-[#1F1F1F]",
                      )}
                      data-tenant-type={
                        isTenantRoute && !isCustomerPortal
                          ? "display"
                          : undefined
                      }
                      style={
                        isTenantRoute
                          ? {
                              color: "var(--tenant-heading-color)",
                              fontFamily: "var(--tenant-font-display)",
                            }
                          : undefined
                      }
                    >
                      {isAdminRoute
                        ? tm("adminTitle")
                        : isCustomerPortal
                          ? portalStudioName || tenantName || mobileEyebrow
                          : isTenantRoute
                            ? mobileTitle
                            : tm("publicTitle")}
                    </p>
                  </div>

                  <nav
                    aria-label={tm("navigation")}
                    data-tenant-navigation={isTenantRoute || undefined}
                    className={isCustomerPortal ? styles.navigation : undefined}
                  >
                    {isAdminRoute ? (
                      <AdminNavigation
                        pathname={pathname}
                        language={language}
                        closeMobileMenu={closeMobileMenu}
                      />
                    ) : isTenantRoute ? (
                      <TenantNavigation
                        pathname={pathname}
                        items={tenantNavigation}
                        closeMobileMenu={closeMobileMenu}
                        portalThemed={isCustomerPortal}
                      />
                    ) : (
                      <PublicNavigation
                        pathname={pathname}
                        closeMobileMenu={closeMobileMenu}
                      />
                    )}
                  </nav>

                  <div
                    className={
                      isCustomerPortal ? styles.footer : "mt-auto pt-8"
                    }
                  >
                    {!isAuthenticated ? (
                      <div className="grid gap-3">
                        {showAuthHomeAction ? (
                          <Link
                            href="/"
                            onClick={closeMobileMenu}
                            data-tenant-button="secondary"
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8D3CA] bg-white text-[13px] font-semibold text-[#1F1F1F] transition hover:border-[#1F1F1F]"
                          >
                            {shellT("actions.backToStudio")}
                          </Link>
                        ) : null}

                        {showCustomerPortalAction ? (
                          <Link
                            href={customerPortalHref}
                            onClick={closeMobileMenu}
                            data-tenant-button="secondary"
                            data-customer-portal-entry-action
                            className="inline-flex min-h-12 items-center justify-center rounded-full border px-5 text-[13px] font-semibold transition-[background-color,border-color,color] duration-200 hover:border-[color-mix(in_srgb,var(--tenant-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--tenant-accent)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 motion-reduce:transition-none"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${tenantAccentColor} 7%, transparent)`,
                              borderColor: `color-mix(in srgb, ${tenantAccentColor} 28%, transparent)`,
                              color: tenantAccentLinkColor,
                              textTransform:
                                "var(--tenant-header-text-transform, none)",
                            }}
                          >
                            {publicTenantT("actions.book")}
                          </Link>
                        ) : null}

                        {showAnonymousSignIn ? (
                          <Link
                            href="/login"
                            onClick={closeMobileMenu}
                            data-tenant-button="secondary"
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8D3CA] bg-white text-[13px] font-semibold text-[#1F1F1F] transition hover:border-[#1F1F1F]"
                          >
                            {isTenantRoute
                              ? publicTenantT("actions.signIn")
                              : t("login")}
                          </Link>
                        ) : null}

                        {(
                          showPublicTenantActions
                            ? null
                            : !isTenantRoute
                              ? { href: "/register", key: "register" }
                              : null
                        ) ? (
                          <Link
                            href={
                              showPublicTenantActions
                                ? tenantPrimaryAction.href
                                : "/register"
                            }
                            onClick={closeMobileMenu}
                            data-tenant-button="primary"
                            className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-5 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:opacity-90"
                            style={{
                              backgroundColor: isTenantRoute
                                ? tenantAccentColor
                                : studioPublicTheme
                                  ? "var(--studio-blue)"
                                  : SKAB_BRAND_COLORS.primary,
                              color: isTenantRoute
                                ? tenantAccentForeground
                                : "#FFFFFF",
                            }}
                          >
                            {showPublicTenantActions
                              ? publicTenantT(
                                  `actions.${tenantPrimaryAction.key}`,
                                )
                              : t("getStarted")}

                            <ArrowLongRightIcon
                              className="h-4 w-4 stroke-[1.7] transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </Link>
                        ) : null}
                      </div>
                    ) : isAuthenticated ? (
                      <div
                        className={classNames(
                          isCustomerPortal
                            ? styles.footerActions
                            : "grid gap-3",
                          showUserAccountAction &&
                            !isCustomerPortal &&
                            (isAdminRoute ||
                              canAccessAdmin ||
                              showCustomerPortalShortcut) &&
                            "grid-cols-2",
                        )}
                      >
                        {isCustomerPortal && onOpenCustomerHelp ? (
                          <button
                            type="button"
                            onClick={handleOpenCustomerHelp}
                            aria-controls={customerHelpControls}
                            aria-haspopup="dialog"
                            data-customer-portal-mobile-help
                            data-tenant-hover="preserve"
                            className={styles.helpButton}
                          >
                            <QuestionMarkCircleIcon
                              className={styles.navigationIcon}
                              aria-hidden="true"
                            />
                            <span className={styles.navigationLabel}>
                              {language === "CZ"
                                ? "Nápověda k rezervacím"
                                : "Booking help"}
                            </span>
                            <ChevronRightIcon
                              className={styles.navigationChevron}
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}

                        {isAdminRoute ||
                        (canAccessAdmin && !customerSurface) ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileMenu?.();
                              if (isAdminRoute) {
                                onOpenBookingSite?.();
                              } else {
                                onSwitchToAdminMode?.();
                              }
                            }}
                            data-tenant-button="secondary"
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8D3CA] bg-white px-4 text-center text-[12px] font-semibold text-[#1F1F1F]"
                          >
                            {isAdminRoute
                              ? tm("bookingSite")
                              : t("openWorkspace")}
                          </button>
                        ) : null}

                        {showCustomerPortalShortcut ? (
                          <Link
                            href={customerPortalHref}
                            onClick={closeMobileMenu}
                            data-tenant-button="secondary"
                            data-customer-portal-entry-action
                            className="inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-center text-[12px] font-semibold transition-[background-color,border-color,color] duration-200 hover:border-[color-mix(in_srgb,var(--tenant-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--tenant-accent)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 motion-reduce:transition-none"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${tenantAccentColor} 7%, transparent)`,
                              borderColor: `color-mix(in srgb, ${tenantAccentColor} 28%, transparent)`,
                              color: tenantAccentLinkColor,
                              textTransform:
                                "var(--tenant-header-text-transform, none)",
                            }}
                          >
                            {publicTenantT("actions.book")}
                          </Link>
                        ) : null}

                        {showUserAccountAction ? (
                          <button
                            type="button"
                            onClick={handleOpenUserActions}
                            data-customer-portal-mobile-account={
                              isCustomerPortal || undefined
                            }
                            aria-haspopup={
                              isCustomerPortal ? "dialog" : undefined
                            }
                            data-tenant-hover={
                              isCustomerPortal ? "preserve" : undefined
                            }
                            className={classNames(
                              "group min-h-12 transition focus-visible:outline-none focus-visible:ring-2 motion-reduce:transform-none motion-reduce:transition-none",
                              isCustomerPortal
                                ? styles.accountButton
                                : "inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover focus-visible:ring-brand-primary/30",
                            )}
                          >
                            {isCustomerPortal ? (
                              <>
                                <span className={styles.avatar}>
                                  {userInitials}
                                </span>
                                <span className={styles.navigationLabel}>
                                  {tm("myAccount")}
                                </span>
                                <ChevronRightIcon
                                  className={styles.navigationChevron}
                                  aria-hidden="true"
                                />
                              </>
                            ) : (
                              <>
                                <UserCircleIcon
                                  className="h-4 w-4 stroke-[1.7]"
                                  aria-hidden="true"
                                />
                                {tm("myAccount")}
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {!isCustomerPortal && showLanguageSelector ? (
                      <div className="mt-5">
                        <LanguageSelector
                          variant="mobile"
                          onLocaleChange={closeMobileMenu}
                          localeCodes={languageLocaleCodes}
                          contextLabel={languageContextLabel}
                          hideWhenSingle={Boolean(languageLocaleCodes)}
                        />
                      </div>
                    ) : null}

                    <p
                      className={
                        isCustomerPortal
                          ? styles.poweredBy
                          : "mt-5 text-center text-[10px] uppercase tracking-[0.12em] text-[#9A9A94]"
                      }
                      style={
                        isCustomerPortal
                          ? { color: "var(--tenant-muted-on-surface)" }
                          : undefined
                      }
                    >
                      {isTenantRoute
                        ? publicTenantT("mobile.poweredBy")
                        : tm("tagline")}
                    </p>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

export default MobileMenu;
