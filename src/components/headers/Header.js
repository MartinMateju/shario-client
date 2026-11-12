"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  logOut,
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
  selectIsCustomerAuthenticated,
  selectIsSessionReadyForContext,
} from "@/lib/features/auth/authSlice";
import { useSendCustomerLogoutMutation } from "@/lib/features/auth/authApiSlice";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import { openCart } from "@/lib/features/cart/cartSlice";
import { buildTenantAuthHref } from "@/utils/tenantAuthRouting";
import { buildPlatformUrl, buildTenantUrl } from "@/utils/tenantRouting";
import {
  buildCustomerPortalPath,
  getPortalLocationReferenceFromSearchParams,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import {
  getLocalizedPublicTenantText,
  getPublicTenantLocaleCodes,
  getPublicTenantTheme,
  resolvePublicTenantRouteLocale,
} from "@/components/public-tenant/publicTenant.config";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";
import {
  CUSTOMER_SHELL_SURFACES,
  getCustomerPortalNavigationForLocation,
  getCustomerShellSurface,
  isCustomerCartSurface,
} from "@/components/customer-shell/customerShell.config";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { retainPublicCourseLocation } from "@/components/courses/usePublicCourseLocation";
import { customerPortalHeaderThemeStyle } from "@/components/customer-shell/CustomerPortalPrimitives";
import {
  getCustomerPortalFallbackHref,
  isCustomerPortalPageEnabled,
} from "@/components/customer-shell/customerPortalVisibility";
import {
  CUSTOMER_PORTAL_HELP_OPEN_EVENT,
  CUSTOMER_PORTAL_TOUR_START_EVENT,
  emitCustomerPortalOverlayEvent,
} from "@/components/customer-shell/customerPortalOverlayEvents";
import { getUserAccess, getUserInitials } from "@/utils/user-profile.utils";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";
import PlatformAuthHeader from "@/components/auth/PlatformAuthHeader";
import Brand from "./Brand";
import DesktopActions from "./DesktopActions";
import DesktopNavAdmin from "./DesktopNavAdmin";
import DesktopNavPublic from "./DesktopNavPublic";
import DesktopNavTenant from "./DesktopNavTenant";
import MobileMenu from "./MobileMenu";
import MobileRight from "./MobileRight";
import MobileUserActionsSheet from "./MobileUserActionsSheet";
import { classNames, selectCartCount } from "./header.utils";
import { isPlatformMarketingPath } from "./marketingNavigation";
import styles from "./customerPortalHeader.module.css";
import homepageStyles from "./workingStudioHeader.module.css";
import "@/styles/publicStudioTheme.css";
const HEADER_SCROLL_THRESHOLD = 10;

// Only signed-in portal customers get the help drawer, and it stays closed
// until asked for, so it loads after the portal is interactive.
const CustomerPortalHelpDrawer = dynamic(
  () => import("@/components/customer-shell/CustomerPortalHelpDrawer"),
  {
    ssr: false,
  },
);
export default function Header({ tenantScoped = false, pathnameOverride }) {
  const locale = useLocale();
  const headerMobileT = useTranslations("Header.mobile");
  const publicTenantT = useTranslations("PublicTenant");
  const customerShellT = useTranslations("CustomerShell");
  const routePathname = usePathname();
  const pathname = pathnameOverride || routePathname;
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const dispatch = useDispatch();
  const publicTenantContext = useOptionalPublicTenant();
  const customerPortalLocation = useOptionalCustomerPortalLocation();
  const [sendCustomerLogout] = useSendCustomerLogoutMutation();

  /*
   * Temporary compatibility value for DesktopNavAdmin.
   * Remove it when the admin navigation is migrated to next-intl.
   */
  const language = locale === "cs" ? "CZ" : "EN";
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const customerSessionReady = useSelector(
    selectIsSessionReadyForContext(AUTH_CONTEXTS.CUSTOMER),
  );
  const currentTenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const currentTenantSlug = currentTenant?.slug;
  const cartCount = useSelector(selectCartCount);
  const [mobileMenuRoute, setMobileMenuRoute] = useState(null);
  const [mobileUserActionsRoute, setMobileUserActionsRoute] = useState(null);
  const [customerHelpOpen, setCustomerHelpOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const customerHelpDialogId = `customer-portal-help-${useId().replaceAll(":", "")}`;
  const customerProfileDialogId = `customer-portal-profile-${useId().replaceAll(":", "")}`;
  const isTenantRoute = Boolean(params?.tenantSlug);
  const routeTenantSlug = String(
    Array.isArray(params?.tenantSlug)
      ? params.tenantSlug[0]
      : params?.tenantSlug || "",
  )
    .trim()
    .toLowerCase();
  const sessionTenantSlug = String(currentTenantSlug || "")
    .trim()
    .toLowerCase();
  const sessionTenantMatchesRoute =
    !isTenantRoute ||
    Boolean(
      sessionTenantSlug &&
      routeTenantSlug &&
      sessionTenantSlug === routeTenantSlug,
    );
  const isCustomerShell = tenantScoped && isTenantRoute;
  const publicTenant = tenantScoped ? publicTenantContext?.tenant : null;
  const customerSurface = isCustomerShell
    ? getCustomerShellSurface(publicTenantContext?.surface, pathname)
    : null;
  const customerActionsReady = !isCustomerShell || customerSessionReady;
  const tenantIsAuthenticated =
    (isCustomerShell ? isCustomerAuthenticated : isAuthenticated) &&
    sessionTenantMatchesRoute &&
    customerActionsReady;
  const userAccess = useMemo(
    () => getUserAccess(currentUser, workspaceAccess),
    [currentUser, workspaceAccess],
  );
  const canAccessAdmin =
    !isCustomerShell && tenantIsAuthenticated && userAccess.isTenantUser;
  const userInitials = tenantIsAuthenticated
    ? getUserInitials(currentUser, "ME")
    : "ME";
  const customerPortalLocationReference =
    customerPortalLocation?.activeLocationReference ||
    getPortalLocationReferenceFromSearchParams(searchParams);
  const defaultCustomerPortalPath = buildCustomerPortalPath({
    locationReference: customerPortalLocationReference,
    tab:
      customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC
        ? "studio-calendar"
        : undefined,
  });
  const customerPortalPath = isCustomerPortalPageEnabled(
    publicTenant || currentTenant,
    "calendar",
  )
    ? defaultCustomerPortalPath
    : retainCustomerPortalLocation(
        getCustomerPortalFallbackHref(
          publicTenant || currentTenant,
          currentTenant?.modules,
        ) || "/portal",
        customerPortalLocationReference,
      );
  const customerPortalHref = tenantIsAuthenticated
    ? customerPortalPath
    : buildTenantAuthHref("/login", customerPortalPath);
  const notificationHref = retainCustomerPortalLocation(
    "/portal/notifications",
    customerPortalLocationReference,
  );
  const tenantBrandHref =
    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL ||
    (customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
      tenantIsAuthenticated)
      ? customerPortalPath
      : "/";
  const protectedTenantNavigation = useMemo(() => {
    if (tenantScoped || !isTenantRoute) return [];
    return [
      {
        key: "home",
        href: "/",
      },
      {
        key: "portal",
        href: "/portal",
      },
      ...(currentTenant?.modules?.memberships !== false
        ? [
            {
              key: "memberships",
              href: "/memberships",
            },
          ]
        : []),
    ];
  }, [currentTenant?.modules?.memberships, isTenantRoute, tenantScoped]);
  const tenantNavigation = isCustomerShell
    ? customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL
      ? publicTenantContext?.previewMode ||
        (customerSessionReady && sessionTenantMatchesRoute)
        ? getCustomerPortalNavigationForLocation(
            publicTenantContext?.portalNavigation,
            customerPortalLocation?.activeLocation,
          ).map((item) => ({
            ...item,
            href: retainCustomerPortalLocation(
              item.href,
              customerPortalLocationReference,
            ),
            label: customerShellT(`portalNav.${item.key}`),
          }))
        : []
      : customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC
        ? (publicTenantContext?.navigation || []).map((item) => ({
            ...item,
            href: ["courses", "vouchers"].includes(item.key)
              ? retainPublicCourseLocation(
                  item.href,
                  customerPortalLocationReference,
                )
              : item.href,
            label: publicTenantT(`nav.${item.key}`),
          }))
        : []
    : protectedTenantNavigation.map((item) => ({
        ...item,
        label: publicTenantT(`nav.${item.key}`),
      }));
  const tenantPrimaryAction =
    isCustomerShell && customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC
      ? publicTenantContext?.primaryAction || null
      : null;
  const tenantDegraded = tenantScoped
    ? publicTenantContext?.degraded === true
    : false;
  const tenantBrand =
    publicTenant ||
    (isTenantRoute && currentTenant?.name
      ? {
          name: currentTenant.name,
          publicSite: {
            branding: {
              displayName: currentTenant.name,
              accentColor: SKAB_BRAND_COLORS.primary,
            },
          },
        }
      : null);
  const tenantTheme =
    (publicTenantContext?.appearanceSurface || customerSurface) ===
    CUSTOMER_SHELL_SURFACES.PORTAL
      ? getPublicTenantPortalTheme(tenantBrand || {})
      : getPublicTenantTheme(tenantBrand || {});
  const tenantAccentColor = tenantTheme.accentColor;
  const tenantAccentForeground = tenantTheme.accentForeground;
  const tenantAccentLinkColor = tenantTheme.accentLinkColor;
  const tenantBackgroundColor = tenantTheme.backgroundColor;
  const announcementText =
    publicTenant && customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC
      ? getLocalizedPublicTenantText(
          publicTenant.publicSite.header.announcement.text,
          locale,
        )
      : "";
  const announcementUrl =
    publicTenant?.publicSite?.header?.announcement?.url || "";
  const isAdminRoute =
    pathname === "/app" || pathname?.startsWith("/app/") || false;
  const isHomeRoute = pathname === "/";
  const isWorkingStudioHome = !tenantScoped && !isTenantRoute && isHomeRoute;
  const isWorkingStudioMarketing =
    !tenantScoped && !isTenantRoute && isPlatformMarketingPath(pathname);
  const isMarketingRoute = !isTenantRoute && isPlatformMarketingPath(pathname);
  const tenantLanguageCodes = useMemo(() => {
    if (!isCustomerShell) return [];
    return getPublicTenantLocaleCodes(publicTenant?.settings, routing.locales);
  }, [isCustomerShell, publicTenant?.settings]);
  const headerLanguageCodes = isCustomerShell
    ? tenantLanguageCodes
    : routing.locales;
  const showHeaderLanguageSelector =
    !isAdminRoute &&
    (!isTenantRoute ||
      (customerSurface === CUSTOMER_SHELL_SURFACES.PUBLIC &&
        headerLanguageCodes.length > 1));
  const languageContextLabel = isCustomerShell
    ? tenantBrand?.publicSite?.branding?.displayName ||
      tenantBrand?.name ||
      "Studio"
    : "Shario";
  const fullPathname = useMemo(() => {
    const currentPath = pathname || "/";
    const queryString = searchParams?.toString();
    return queryString ? `${currentPath}?${queryString}` : currentPath;
  }, [pathname, searchParams]);
  const mobileMenuOpen = mobileMenuRoute === fullPathname;
  const mobileUserActionsOpen = mobileUserActionsRoute === fullPathname;
  const languageTargetLocale = useMemo(() => {
    if (headerLanguageCodes.length === 0) return locale;
    const currentIndex = headerLanguageCodes.indexOf(locale);
    return currentIndex < 0
      ? headerLanguageCodes[0]
      : headerLanguageCodes[(currentIndex + 1) % headerLanguageCodes.length];
  }, [headerLanguageCodes, locale]);
  const isBooking =
    (customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL && cartCount > 0) ||
    (isCustomerCartSurface(customerSurface, pathname) &&
      isCustomerPortalPageEnabled(
        publicTenant || currentTenant,
        pathname === "/portal/courses" ||
          pathname?.startsWith("/portal/courses/")
          ? "courses"
          : "calendar",
      )) ||
    (!isCustomerShell &&
      (pathname === "/checkout" || pathname?.startsWith("/checkout/")));
  const closeMobileMenu = useCallback(() => {
    setMobileMenuRoute(null);
  }, []);
  const closeMobileUserActions = useCallback(() => {
    setMobileUserActionsRoute(null);
  }, []);
  const closeAllOverlays = useCallback(() => {
    setMobileMenuRoute(null);
    setMobileUserActionsRoute(null);
    setCustomerHelpOpen(false);
  }, []);
  const closeCustomerHelp = useCallback(() => {
    setCustomerHelpOpen(false);
  }, []);
  const openCustomerHelp = useCallback(() => {
    setMobileMenuRoute(null);
    setMobileUserActionsRoute(null);
    emitCustomerPortalOverlayEvent(CUSTOMER_PORTAL_HELP_OPEN_EVENT);
    setCustomerHelpOpen(true);
  }, []);
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuRoute((current) =>
      current === fullPathname ? null : fullPathname,
    );
    setMobileUserActionsRoute(null);
    setCustomerHelpOpen(false);
  }, [fullPathname]);
  const openMobileUserActions = useCallback(() => {
    setMobileUserActionsRoute(fullPathname);
    setMobileMenuRoute(null);
    setCustomerHelpOpen(false);
  }, [fullPathname]);
  const setMobileMenuOpen = useCallback(
    (open) => {
      setMobileMenuRoute(open ? fullPathname : null);
    },
    [fullPathname],
  );
  const setMobileUserActionsOpen = useCallback(
    (open) => {
      setMobileUserActionsRoute(open ? fullPathname : null);
    },
    [fullPathname],
  );
  const toggleLanguage = useCallback(() => {
    if (languageTargetLocale === locale) return;
    router.replace(fullPathname, {
      locale: languageTargetLocale,
      scroll: false,
    });
  }, [fullPathname, languageTargetLocale, locale, router]);
  const handleOpenCart = useCallback(() => {
    setMobileMenuRoute(null);
    dispatch(openCart());
  }, [dispatch]);
  const navigateToTenantSurface = useCallback(
    (surfacePath) => {
      closeAllOverlays();
      const targetLocale = surfacePath.startsWith("/app")
        ? resolveWorkspaceRouteLocale(currentTenant?.settings, routing.locales)
        : resolvePublicTenantRouteLocale(
            publicTenant?.settings || currentTenant?.settings,
            isCustomerShell ? locale : currentUser?.customerDefaultLanguage,
            routing.locales,
          );
      if (isTenantRoute) {
        router.push(surfacePath, {
          locale: targetLocale,
        });
        return;
      }
      if (currentTenantSlug) {
        window.location.assign(
          buildTenantUrl({
            slug: currentTenantSlug,
            locale: targetLocale,
            pathname: surfacePath,
          }),
        );
        return;
      }
      router.push("/login");
    },
    [
      closeAllOverlays,
      currentTenant?.settings,
      currentUser?.customerDefaultLanguage,
      currentTenantSlug,
      isTenantRoute,
      isCustomerShell,
      locale,
      publicTenant?.settings,
      router,
    ],
  );
  const handleSwitchToAdminMode = useCallback(() => {
    navigateToTenantSurface("/app");
  }, [navigateToTenantSurface]);
  const handleSwitchToUserMode = useCallback(() => {
    navigateToTenantSurface("/portal");
  }, [navigateToTenantSurface]);
  const handleOpenBookingSite = useCallback(() => {
    closeAllOverlays();
    const targetLocale = resolvePublicTenantRouteLocale(
      publicTenant?.settings || currentTenant?.settings,
      isCustomerShell ? locale : currentUser?.customerDefaultLanguage,
      routing.locales,
    );
    const target = isTenantRoute
      ? new URL(
          `/${targetLocale}?from=workspace`,
          window.location.origin,
        ).toString()
      : currentTenantSlug
        ? buildTenantUrl({
            slug: currentTenantSlug,
            locale: targetLocale,
            pathname: "/?from=workspace",
          })
        : null;
    if (!target) {
      router.push("/login");
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  }, [
    closeAllOverlays,
    currentTenant?.settings,
    currentUser?.customerDefaultLanguage,
    currentTenantSlug,
    isTenantRoute,
    isCustomerShell,
    locale,
    publicTenant?.settings,
    router,
  ]);
  const handleLogout = useCallback(() => {
    closeAllOverlays();
    if (isCustomerShell) {
      dispatch(
        logOut({
          authContext: AUTH_CONTEXTS.CUSTOMER,
        }),
      );
      sendCustomerLogout()
        .unwrap()
        .catch(() => null)
        .finally(() => {
          router.replace("/");
        });
      return;
    }

    /*
     * Workspace logout is revoked on the platform origin so every tenant host
     * observes the same workspace-cookie state.
     */
    window.location.replace(
      buildPlatformUrl({
        locale,
        pathname: "/logout",
      }),
    );
  }, [
    closeAllOverlays,
    dispatch,
    isCustomerShell,
    locale,
    router,
    sendCustomerLogout,
  ]);
  useEffect(() => {
    const updateHeaderState = () => {
      setIsScrolled(window.scrollY > HEADER_SCROLL_THRESHOLD);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, {
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", updateHeaderState);
    };
  }, []);
  if (!isTenantRoute && (pathname === "/login" || pathname === "/register")) {
    return (
      <PlatformAuthHeader
        mode={pathname === "/register" ? "register" : "login"}
      />
    );
  }
  if (
    (tenantScoped && !isTenantRoute) ||
    (!tenantScoped && isTenantRoute) ||
    isAdminRoute
  ) {
    return null;
  }
  const isCustomerPortalSurface =
    customerSurface === CUSTOMER_SHELL_SURFACES.PORTAL;
  const hasCustomerPortalAppearance =
    (publicTenantContext?.appearanceSurface || customerSurface) ===
    CUSTOMER_SHELL_SURFACES.PORTAL;
  const desktopNavigationBreakpointClass = "xl:flex";
  const desktopActionsBreakpointClass = isTenantRoute ? "xl:flex" : "lg:flex";
  const fullMobileBreakpointClass = isTenantRoute ? "xl:hidden" : "lg:hidden";
  const elevated = isScrolled || !isHomeRoute || isAdminRoute;
  return (
    <>
      <header
        data-customer-portal-header={hasCustomerPortalAppearance || undefined}
        data-platform-header={!isTenantRoute || undefined}
        data-home-header={isHomeRoute || undefined}
        data-studio-home-header={isWorkingStudioHome || undefined}
        data-skab-public-surface={isWorkingStudioMarketing || undefined}
        data-tenant-style={
          isTenantRoute ? tenantTheme.stylePresetId : undefined
        }
        data-tenant-surface={isTenantRoute ? "header" : undefined}
        data-public-site-edit-path={
          isCustomerPortalSurface
            ? "customerPortal.appearance.headerBackgroundColor"
            : undefined
        }
        className={classNames(
          "fixed inset-x-0 top-0 z-50 isolate w-full",
          isWorkingStudioMarketing && homepageStyles.header,
          isCustomerShell && styles.tenantHeader,
          "border-b transition-[background-color,border-color,box-shadow] duration-300 ease-out",
          isHomeRoute
            ? classNames(
                "border-transparent",
                elevated
                  ? "bg-surface/95 shadow-[0_8px_30px_rgba(17,17,15,0.035)] backdrop-blur-xl"
                  : "bg-surface/0 shadow-none",
              )
            : elevated
              ? "border-line bg-surface/95 shadow-[0_8px_30px_rgba(17,17,15,0.035)] backdrop-blur-xl"
              : isTenantRoute
                ? "border-transparent bg-canvas/55 shadow-none backdrop-blur-sm"
                : "border-line/70 bg-surface shadow-none",
        )}
        style={
          isCustomerShell
            ? {
                ...tenantTheme.style,
                ...(hasCustomerPortalAppearance
                  ? customerPortalHeaderThemeStyle
                  : {}),
                backgroundColor: hasCustomerPortalAppearance
                  ? "var(--tenant-portal-header-background)"
                  : elevated
                    ? `${tenantBackgroundColor}F5`
                    : `${tenantBackgroundColor}CC`,
                borderColor: hasCustomerPortalAppearance
                  ? "color-mix(in srgb, var(--tenant-portal-header-border) 72%, transparent)"
                  : elevated
                    ? "color-mix(in srgb, var(--tenant-text) 10%, transparent)"
                    : "transparent",
                color: "var(--tenant-text)",
              }
            : undefined
        }
      >
        {announcementText ? (
          <div
            className="flex min-h-8 items-center justify-center px-5 py-1.5 text-center text-[10px] font-semibold tracking-[0.02em]"
            style={{
              backgroundColor: tenantAccentColor,
              color: tenantAccentForeground,
            }}
            data-public-site-edit-path={`header.announcement.text.${locale}`}
          >
            {announcementUrl ? (
              announcementUrl.startsWith("/") ? (
                <Link
                  href={announcementUrl}
                  className="underline-offset-2 hover:underline"
                >
                  {announcementText}
                </Link>
              ) : (
                <a
                  href={announcementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {announcementText}
                </a>
              )
            ) : (
              announcementText
            )}
          </div>
        ) : null}
        <div
          data-studio-home-inner={isWorkingStudioMarketing || undefined}
          className={classNames(
            "relative mx-auto w-full items-center px-5 sm:px-8 lg:px-10",
            isCustomerShell ? "xl:px-3" : "xl:px-12",
            isTenantRoute ? "h-[78px]" : isHomeRoute ? "h-16" : "h-[72px]",
            isAdminRoute
              ? "flex max-w-[1600px]"
              : classNames(
                  "flex",
                  "max-w-[1536px] xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
                ),
          )}
        >
          <div
            className={classNames(
              "flex min-w-0 items-center",
              isTenantRoute ? "flex-1 xl:flex-none" : "shrink-0",
              "xl:justify-self-start",
            )}
            data-public-site-edit-path={
              isCustomerShell ? "branding.displayName" : undefined
            }
          >
            <>
              <Brand
                onClickHome={closeAllOverlays}
                tenant={isTenantRoute ? tenantBrand : null}
                href={isCustomerShell ? tenantBrandHref : "/"}
              />
              {!isTenantRoute && !isWorkingStudioMarketing ? (
                <div className="ml-4 hidden min-w-0 items-center gap-4 2xl:flex">
                  <span
                    aria-hidden="true"
                    className="h-6 w-px shrink-0 bg-line-warm"
                  />
                  <span className="max-w-[240px] text-[11px] font-medium leading-4 tracking-[-0.01em] text-[#686864]">
                    {headerMobileT("publicEyebrow")}
                  </span>
                </div>
              ) : null}
            </>
          </div>

          <div
            className={classNames(
              "hidden min-w-0 items-center justify-center",
              isAdminRoute ? "flex-1 px-4 xl:px-8" : "px-4 2xl:px-10",
              desktopNavigationBreakpointClass,
            )}
            data-customer-portal-navigation={
              isCustomerPortalSurface || undefined
            }
          >
            {isAdminRoute ? (
              <DesktopNavAdmin pathname={fullPathname} language={language} />
            ) : isTenantRoute ? (
              <DesktopNavTenant
                pathname={isCustomerPortalSurface ? fullPathname : pathname}
                items={tenantNavigation}
                accentLinkColor={
                  isCustomerPortalSurface
                    ? tenantTheme.portalHeaderLinkColor
                    : tenantAccentLinkColor
                }
                variant={isCustomerPortalSurface ? "portal" : "default"}
                navigationLabel={headerMobileT("navigation")}
              />
            ) : (
              <DesktopNavPublic pathname={pathname} />
            )}
          </div>

          <div
            className={classNames(
              "hidden shrink-0 items-center justify-end lg:ml-auto xl:ml-0 xl:justify-self-end",
              desktopActionsBreakpointClass,
            )}
          >
            <DesktopActions
              isAuthenticated={tenantIsAuthenticated}
              isBooking={isBooking}
              isAdminRoute={isAdminRoute}
              isMarketingHome={isMarketingRoute}
              cartCount={cartCount}
              onOpenCart={handleOpenCart}
              onLogout={handleLogout}
              onSwitchToAdminMode={handleSwitchToAdminMode}
              onSwitchToUserMode={handleSwitchToUserMode}
              onOpenBookingSite={handleOpenBookingSite}
              onToggleLanguage={toggleLanguage}
              languageTargetLocale={languageTargetLocale}
              languageLocaleCodes={headerLanguageCodes}
              languageContextLabel={languageContextLabel}
              showLanguageSelector={showHeaderLanguageSelector}
              userInitials={userInitials}
              onOpenUserActions={openMobileUserActions}
              userActionsOpen={mobileUserActionsOpen}
              userActionsControls={customerProfileDialogId}
              tenantScoped={isCustomerShell}
              customerSurface={customerSurface}
              sessionReady={customerActionsReady}
              tenantPrimaryAction={tenantPrimaryAction}
              tenantAccentColor={tenantAccentColor}
              tenantAccentForeground={tenantAccentForeground}
              tenantAccentLinkColor={tenantAccentLinkColor}
              tenantDegraded={tenantDegraded}
              customerPortalHref={customerPortalHref}
              notificationHref={notificationHref}
              customerHelpControls={customerHelpDialogId}
              customerHelpOpen={customerHelpOpen}
              onOpenCustomerHelp={openCustomerHelp}
            />
          </div>

          <div
            className={classNames(
              "ml-auto flex shrink-0 items-center",
              fullMobileBreakpointClass,
            )}
          >
            <MobileRight
              sessionReady={customerActionsReady}
              isAuthenticated={tenantIsAuthenticated}
              isBooking={isBooking}
              isMarketingHome={isMarketingRoute}
              cartCount={cartCount}
              onOpenCart={handleOpenCart}
              onOpenWorkspace={handleSwitchToAdminMode}
              onSwitchToUserMode={handleSwitchToUserMode}
              showLanguageSelector={showHeaderLanguageSelector}
              languageLocaleCodes={headerLanguageCodes}
              languageContextLabel={languageContextLabel}
              mobileMenuOpen={mobileMenuOpen}
              toggleMobileMenu={toggleMobileMenu}
              onOpenUserActions={openMobileUserActions}
              userInitials={userInitials}
              customerPortalHref={customerPortalHref}
              notificationHref={notificationHref}
              customerSurface={customerSurface}
              tenantAccentColor={tenantAccentColor}
              tenantAccentLinkColor={tenantAccentLinkColor}
              customerHelpControls={customerHelpDialogId}
              customerHelpOpen={customerHelpOpen}
              onOpenCustomerHelp={openCustomerHelp}
            />
          </div>

          {!isTenantRoute ? (
            <div className="ml-2 hidden shrink-0 items-center lg:flex xl:hidden">
              <MobileRight
                sessionReady={customerActionsReady}
                menuOnly
                isAuthenticated={tenantIsAuthenticated}
                isBooking={isBooking}
                isMarketingHome={isMarketingRoute}
                cartCount={cartCount}
                onOpenCart={handleOpenCart}
                onOpenWorkspace={handleSwitchToAdminMode}
                onSwitchToUserMode={handleSwitchToUserMode}
                showLanguageSelector={showHeaderLanguageSelector}
                languageLocaleCodes={headerLanguageCodes}
                languageContextLabel={languageContextLabel}
                mobileMenuOpen={mobileMenuOpen}
                toggleMobileMenu={toggleMobileMenu}
                onOpenUserActions={openMobileUserActions}
                userInitials={userInitials}
                customerPortalHref={customerPortalHref}
                notificationHref={notificationHref}
                customerSurface={customerSurface}
                tenantAccentColor={tenantAccentColor}
                tenantAccentLinkColor={tenantAccentLinkColor}
              />
            </div>
          ) : null}
        </div>
      </header>

      <MobileMenu
        open={mobileMenuOpen}
        setOpen={setMobileMenuOpen}
        pathname={
          isAdminRoute || isCustomerPortalSurface ? fullPathname : pathname
        }
        isAdminRoute={isAdminRoute}
        isTenantRoute={isTenantRoute}
        isAuthenticated={tenantIsAuthenticated}
        isMarketingHome={isMarketingRoute}
        studioPublicTheme={isWorkingStudioMarketing}
        closeMobileMenu={closeMobileMenu}
        showLanguageSelector={showHeaderLanguageSelector}
        languageLocaleCodes={headerLanguageCodes}
        languageContextLabel={languageContextLabel}
        onOpenUserActions={openMobileUserActions}
        onSwitchToAdminMode={handleSwitchToAdminMode}
        onOpenBookingSite={handleOpenBookingSite}
        customerSurface={customerSurface}
        sessionReady={customerActionsReady}
        canAccessAdmin={canAccessAdmin}
        tenant={isTenantRoute ? tenantBrand : null}
        tenantBrandHref={isCustomerShell ? tenantBrandHref : "/"}
        tenantNavigation={tenantNavigation}
        tenantPrimaryAction={tenantPrimaryAction}
        tenantDegraded={tenantDegraded}
        tenantAccentColor={tenantAccentColor}
        tenantAccentForeground={tenantAccentForeground}
        tenantAccentLinkColor={tenantAccentLinkColor}
        customerPortalHref={customerPortalHref}
        userInitials={userInitials}
        portalStudioName={customerPortalLocation?.activeLocation?.name || ""}
        tenantThemeStyle={tenantTheme.style}
        tenantStylePresetId={tenantTheme.stylePresetId}
        customerHelpControls={customerHelpDialogId}
        onOpenCustomerHelp={openCustomerHelp}
      />

      <MobileUserActionsSheet
        open={mobileUserActionsOpen}
        setOpen={setMobileUserActionsOpen}
        dialogId={customerProfileDialogId}
        isAdminRoute={isAdminRoute}
        onLogout={handleLogout}
        onSwitchToAdminMode={handleSwitchToAdminMode}
        onOpenBookingSite={handleOpenBookingSite}
        toggleLanguage={toggleLanguage}
        languageTargetLocale={languageTargetLocale}
        onClose={closeMobileUserActions}
        userInitials={userInitials}
        customerSurface={customerSurface}
        tenantThemeStyle={tenantTheme.style}
        tenantStylePresetId={tenantTheme.stylePresetId}
      />

      {isCustomerPortalSurface && tenantIsAuthenticated ? (
        <CustomerPortalHelpDrawer
          dialogId={customerHelpDialogId}
          locationReference={customerPortalLocationReference}
          onClose={closeCustomerHelp}
          onStartTour={() => {
            router.push(customerPortalPath);
            emitCustomerPortalOverlayEvent(CUSTOMER_PORTAL_TOUR_START_EVENT);
          }}
          open={customerHelpOpen}
          primaryColor={tenantTheme.portalButtonColor}
          primaryForeground={tenantTheme.portalButtonForeground}
          stylePresetId={tenantTheme.stylePresetId}
          themeStyle={tenantTheme.style}
        />
      ) : null}
    </>
  );
}
