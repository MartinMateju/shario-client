"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import UserActionsMenuContent from "./UserActionsMenuContent";
import { classNames } from "./header.utils";
import {
  buildPlatformUrl,
  buildTenantUrl,
  getAuthenticatedTenantSlug,
} from "@/utils/tenantRouting";
import {
  getUserAccess,
  getUserDisplayName,
  getUserInitials,
} from "@/utils/user-profile.utils";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";
import { resolvePublicTenantRouteLocale } from "@/components/public-tenant/publicTenant.config";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import UtilityTooltip from "@/components/tooltips/UtilityTooltip";

function ProfileMenuTrigger({
  triggerAs: Trigger = "button",
  dialogId,
  isDashboardVariant,
  menuLabel,
  onClick,
  open,
  resolvedInitials,
  triggerLabel,
}) {
  return (
    <Trigger
      type="button"
      aria-label={menuLabel}
      aria-haspopup={dialogId ? "dialog" : undefined}
      aria-controls={dialogId}
      aria-expanded={dialogId ? open : undefined}
      data-profile-menu-trigger
      data-workspace-profile-drawer-trigger={dialogId ? true : undefined}
      onClick={onClick}
      className={classNames(
        "group inline-flex min-w-0 items-center rounded-full",
        isDashboardVariant && "group/topbar-action relative",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-brand-primary/25",
        "focus-visible:ring-offset-4",
        isDashboardVariant
          ? "focus-visible:ring-offset-surface-panel"
          : "focus-visible:ring-offset-brand-offset",
        isDashboardVariant
          ? classNames(
              "h-11 w-11 touch-manipulation justify-center border p-0 shadow-xs transition active:scale-[0.97] active:border-cobalt-200 active:bg-surface-raised motion-reduce:transform-none motion-reduce:transition-none md:h-12 md:w-12 md:hover:-translate-y-0.5 md:hover:border-cobalt-200 md:hover:bg-surface-raised",
              open
                ? "border-cobalt-200 bg-surface-raised ring-1 ring-inset ring-cobalt-100"
                : "border-line bg-surface-raised/90",
            )
          : "h-10 gap-1.5",
      )}
    >
      {isDashboardVariant ? <UtilityTooltip>{menuLabel}</UtilityTooltip> : null}

      <span
        className={classNames(
          "flex shrink-0 items-center justify-center rounded-full",
          "bg-brand-primary font-semibold uppercase text-white",
          "transition-colors duration-200 motion-reduce:transition-none",
          "md:group-hover:bg-brand-primary",
          isDashboardVariant
            ? "h-10 w-10 text-[11px]"
            : "h-9 w-9 text-[10px] tracking-[0.08em]",
        )}
      >
        {resolvedInitials}
      </span>

      {!isDashboardVariant ? (
        <>
          <span className="hidden max-w-[132px] truncate text-left text-[12px] font-medium text-[#1F1F1F] 2xl:block">
            {triggerLabel}
          </span>

          <ChevronDownIcon
            className={classNames(
              "hidden h-3 w-3 shrink-0 stroke-[1.7] text-[#777771] md:block",
              "transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </>
      ) : null}
    </Trigger>
  );
}

function ProfileIdentity({
  closeLabel,
  displayName,
  isTenantUser,
  onClose,
  resolvedInitials,
  roleLabel,
  workspaceName,
}) {
  return (
    <div
      className={classNames(
        "relative shrink-0 overflow-hidden border-b border-[#E7E4DE] bg-white px-4",
        onClose ? "pb-3.5 pt-[max(14px,env(safe-area-inset-top))]" : "py-3.5",
      )}
    >
      <span
        className="absolute -right-5 -top-7 h-16 w-16 rounded-full bg-cobalt-500/[0.08]"
        aria-hidden="true"
      />

      <div
        className={classNames(
          "relative flex min-w-0 items-center gap-2.5",
          onClose && "pr-12",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_8px_18px_rgb(var(--skab-blue-rgb)/0.2)]">
          {resolvedInitials}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[#11110F]">
            {displayName}
          </p>

          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded-full bg-coral-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-terracotta-700">
              {roleLabel}
            </span>

            {isTenantUser && (
              <span className="truncate text-[9px] text-[#7D7D7D]">
                {workspaceName}
              </span>
            )}
          </div>
        </div>
      </div>

      {onClose ? (
        <button
          data-autofocus
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-10 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-[#E7E4DE] bg-white/85 text-[#4F4F4B] shadow-xs transition hover:border-cobalt-200 hover:bg-cobalt-50 hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 motion-reduce:transition-none"
        >
          <XMarkIcon className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export default function UserProfileMenu({
  variant = "header",
  isAdminRoute = false,
  studioName,
  initials,
}) {
  const locale = useLocale();
  const t = useTranslations("Header");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileDialogId = `workspace-profile-${useId().replaceAll(":", "")}`;

  const currentUser = useSelector(selectCurrentUser) || {};
  const currentTenant = useSelector(selectCurrentTenant);
  const publicTenant = useOptionalPublicTenant()?.tenant;
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenantSlug = getAuthenticatedTenantSlug({
    tenant: currentTenant,
    user: currentUser,
    workspaceAccess,
  });
  const userAccess = getUserAccess(currentUser, workspaceAccess);

  // An admin route is always considered tenant-facing, even when an older
  // access token does not contain the newer tenant role fields.
  const isTenantUser = userAccess.isTenantUser || isAdminRoute;

  const roleKey =
    isAdminRoute && !userAccess.isTenantUser ? "staff" : userAccess.roleKey;

  const displayName =
    getUserDisplayName(currentUser) || t("account.fallbackName");

  const resolvedInitials = initials || getUserInitials(currentUser);

  const workspaceName =
    studioName || currentUser.tenantName || currentUser.studioName || "Shario";

  const triggerLabel = isTenantUser ? workspaceName : displayName;

  const fullPathname = useMemo(() => {
    const currentPath = pathname || "/";
    const queryString = searchParams?.toString();

    return queryString ? `${currentPath}?${queryString}` : currentPath;
  }, [pathname, searchParams]);

  const toggleLanguage = useCallback(() => {
    router.replace(fullPathname, {
      locale: locale === "cs" ? "en" : "cs",
      scroll: false,
    });
  }, [fullPathname, locale, router]);

  const navigateToTenantSurface = useCallback(
    (surfacePath) => {
      if (!tenantSlug) {
        router.push(isAdminRoute ? surfacePath : "/login");
        return;
      }

      const targetLocale = surfacePath.startsWith("/app")
        ? resolveWorkspaceRouteLocale(currentTenant?.settings, routing.locales)
        : resolvePublicTenantRouteLocale(
            publicTenant?.settings || currentTenant?.settings,
            publicTenant ? locale : currentUser.customerDefaultLanguage,
            routing.locales,
          );
      const target = buildTenantUrl({
        slug: tenantSlug,
        locale: targetLocale,
        pathname: surfacePath,
      });

      try {
        if (new URL(target).origin === window.location.origin) {
          router.push(surfacePath, { locale: targetLocale });
          return;
        }
      } catch {
        router.push(surfacePath, { locale: targetLocale });
        return;
      }

      window.location.assign(target);
    },
    [
      currentTenant?.settings,
      currentUser.customerDefaultLanguage,
      publicTenant,
      isAdminRoute,
      locale,
      router,
      tenantSlug,
    ],
  );

  const handleSwitchToAdminMode = useCallback(() => {
    navigateToTenantSurface("/app");
  }, [navigateToTenantSurface]);

  const handleOpenBookingSite = useCallback(() => {
    const targetLocale = resolvePublicTenantRouteLocale(
      publicTenant?.settings || currentTenant?.settings,
      publicTenant ? locale : currentUser.customerDefaultLanguage,
      routing.locales,
    );
    const target = tenantSlug
      ? buildTenantUrl({
          slug: tenantSlug,
          locale: targetLocale,
          pathname: "/?from=workspace",
        })
      : new URL(
          `/${targetLocale}?from=workspace`,
          window.location.origin,
        ).toString();

    window.open(target, "_blank", "noopener,noreferrer");
  }, [
    currentTenant?.settings,
    currentUser.customerDefaultLanguage,
    publicTenant,
    locale,
    tenantSlug,
  ]);

  const handleLogout = useCallback(() => {
    /*
     * Use the central handoff before clearing tenant auth. Otherwise the app
     * boundary can win the race and send the user to the tenant login.
     */
    window.location.replace(
      buildPlatformUrl({
        locale,
        pathname: "/logout",
      }),
    );
  }, [locale]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const isDashboardVariant = variant === "dashboard";

  useEffect(() => {
    if (
      !isDashboardVariant ||
      !mobileMenuOpen ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const closeAtDesktop = (event) => {
      if (event.matches) closeMobileMenu();
    };

    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeAtDesktop);
    };
  }, [closeMobileMenu, isDashboardVariant, mobileMenuOpen]);

  const menuLabel = t("account.menu");
  const roleLabel = t(`account.roles.${roleKey}`);
  const sharedIdentityProps = {
    displayName,
    isTenantUser,
    resolvedInitials,
    roleLabel,
    workspaceName,
  };
  const sharedContentProps = {
    isAdminRoute,
    onLogout: handleLogout,
    onSwitchToAdminMode: handleSwitchToAdminMode,
    onOpenBookingSite: handleOpenBookingSite,
    toggleLanguage,
  };

  return (
    <>
      {isDashboardVariant ? (
        <>
          <div className="relative xl:hidden">
            <ProfileMenuTrigger
              dialogId={mobileDialogId}
              isDashboardVariant
              menuLabel={menuLabel}
              onClick={() => setMobileMenuOpen(true)}
              open={mobileMenuOpen}
              resolvedInitials={resolvedInitials}
              triggerLabel={triggerLabel}
            />
          </div>

          <Transition show={mobileMenuOpen} as={Fragment}>
            <Dialog
              onClose={closeMobileMenu}
              className="relative z-[110] xl:hidden"
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
                  className="fixed inset-0 bg-[#1F1F1F]/25 backdrop-blur-[2px]"
                  aria-hidden="true"
                />
              </TransitionChild>

              <div className="fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 flex justify-end">
                  <TransitionChild
                    as={Fragment}
                    enter="transform-gpu transition-transform duration-300 ease-out motion-reduce:transition-none"
                    enterFrom="translate-x-full"
                    enterTo="translate-x-0"
                    leave="transform-gpu transition-transform duration-200 ease-in motion-reduce:transition-none"
                    leaveFrom="translate-x-0"
                    leaveTo="translate-x-full"
                  >
                    <DialogPanel
                      id={mobileDialogId}
                      data-dialog-layout="drawer"
                      data-profile-menu-drawer
                      data-profile-menu-panel
                      data-workspace-profile-drawer
                      className="relative flex h-dvh w-full max-w-[320px] transform-gpu flex-col overflow-hidden border-l border-line bg-surface-raised shadow-floating will-change-transform"
                    >
                      <DialogTitle className="sr-only">{menuLabel}</DialogTitle>

                      <ProfileIdentity
                        {...sharedIdentityProps}
                        closeLabel={t("account.closeMenu")}
                        onClose={closeMobileMenu}
                      />

                      <UserActionsMenuContent
                        {...sharedContentProps}
                        onClose={closeMobileMenu}
                      />

                      <div
                        className="h-[env(safe-area-inset-bottom)] shrink-0 bg-[#F7F5F1]"
                        aria-hidden="true"
                      />
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </div>
            </Dialog>
          </Transition>
        </>
      ) : null}

      <Popover
        className={isDashboardVariant ? "relative hidden xl:block" : "relative"}
      >
        {({ open, close }) => (
          <>
            <ProfileMenuTrigger
              triggerAs={PopoverButton}
              isDashboardVariant={isDashboardVariant}
              menuLabel={menuLabel}
              open={open}
              resolvedInitials={resolvedInitials}
              triggerLabel={triggerLabel}
            />

            <Transition
              as={Fragment}
              show={open}
              enter="transition duration-200 ease-out motion-reduce:transition-none"
              enterFrom="translate-y-1.5 scale-[0.985] opacity-0 motion-reduce:transform-none"
              enterTo="translate-y-0 scale-100 opacity-100"
              leave="transition duration-150 ease-in motion-reduce:transition-none"
              leaveFrom="translate-y-0 scale-100 opacity-100"
              leaveTo="translate-y-1.5 scale-[0.985] opacity-0 motion-reduce:transform-none"
            >
              <PopoverPanel
                data-profile-menu-panel
                className={classNames(
                  "absolute right-0 top-[calc(100%+10px)] z-50",
                  "flex max-h-[calc(100vh-132px)] max-h-[calc(100dvh-132px)]",
                  "w-[min(340px,calc(100vw-20px))] flex-col",
                  "origin-top-right overflow-hidden",
                  "rounded-[22px] border border-line",
                  "bg-surface-raised",
                  "shadow-[0_24px_70px_rgba(17,17,15,0.14)]",
                  "focus:outline-none",
                )}
              >
                <ProfileIdentity {...sharedIdentityProps} />

                <UserActionsMenuContent
                  {...sharedContentProps}
                  onClose={close}
                />
              </PopoverPanel>
            </Transition>
          </>
        )}
      </Popover>
    </>
  );
}
