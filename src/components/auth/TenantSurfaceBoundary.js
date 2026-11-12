"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import {
  logOut,
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsCustomerAuthenticated,
  selectIsSessionReadyForContext,
  selectIsWorkspaceAuthenticated,
} from "@/lib/features/auth/authSlice";
import { useGetCurrentTenantOnboardingQuery } from "@/lib/features/tenants/tenantApiSlice";
import {
  buildInternalAdminUrl,
  buildPlatformUrl,
  buildTenantUrl,
  getTenantSlugParam,
} from "@/utils/tenantRouting";
import { getUserAccess } from "@/utils/user-profile.utils";
import { buildTenantAuthHref } from "@/utils/tenantAuthRouting";
import { getCustomerVoucherShopHref } from "@/utils/customerVoucherRouting";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";

const normalizePlatformRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function LoadingState({ label, surface }) {
  // The portal boundary sits inside the studio shell, below its header.
  if (surface === "portal") {
    return (
      <main
        className="flex min-h-[calc(100dvh-var(--header-height,78px))] items-center justify-center px-5"
        style={{
          backgroundColor: "var(--tenant-background)",
          color: "var(--tenant-muted-text)",
        }}
      >
        <p className="text-sm font-medium" role="status">
          {label}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-[#1F1F1F]">
      <p className="text-sm font-medium text-[#777771]" role="status">
        {label}
      </p>
    </main>
  );
}

/*
 * For the portal, useIsCustomerSurfaceReady mirrors the checks below that
 * decide whether the content renders. Keep the two in step.
 */
export default function TenantSurfaceBoundary({ children, surface }) {
  const locale = useLocale();
  const t = useTranslations("CustomerShell.status");
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const isWorkspaceSurface = surface === "app";
  const expectedAuthContext = isWorkspaceSurface
    ? AUTH_CONTEXTS.WORKSPACE
    : AUTH_CONTEXTS.CUSTOMER;
  const sessionReady = useSelector(
    selectIsSessionReadyForContext(expectedAuthContext),
  );
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const isWorkspaceAuthenticated = useSelector(selectIsWorkspaceAuthenticated);
  const isSurfaceAuthenticated = isWorkspaceSurface
    ? isWorkspaceAuthenticated
    : isCustomerAuthenticated;
  const currentUser = useSelector(selectCurrentUser);
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);

  const routeTenantSlug = getTenantSlugParam(params);
  const authenticatedTenantSlug = String(currentTenant?.slug || "")
    .trim()
    .toLowerCase();
  const userAccess = useMemo(
    () => getUserAccess(currentUser, workspaceAccess),
    [currentUser, workspaceAccess],
  );
  const platformRole = normalizePlatformRole(currentUser?.platformRole);
  const isPlatformUser = Boolean(platformRole && platformRole !== "none");
  const queryString = searchParams?.toString();
  const currentTenantPath = queryString
    ? `${pathname}?${queryString}`
    : pathname;
  const customerLoginHref = buildTenantAuthHref("/login", currentTenantPath);
  // Guest course and voucher browsing have public routes. Keep portal content behind
  // this boundary, including cart, account and all other customer pages.
  const publicCourseHref =
    surface === "portal" &&
    /^\/portal\/courses(?:\/[^/]+)?\/?$/.test(pathname || "")
      ? currentTenantPath.replace(/^\/portal(?=\/courses)/, "")
      : "";
  const publicVoucherHref =
    surface === "portal"
      ? getCustomerVoucherShopHref(pathname, searchParams, { publicPage: true })
      : "";
  const workspaceRouteLocale = resolveWorkspaceRouteLocale(
    currentTenant?.settings,
    routing.locales,
  );
  const workspaceLocaleMismatch =
    isWorkspaceSurface &&
    sessionReady &&
    isWorkspaceAuthenticated &&
    userAccess.isTenantUser &&
    !isPlatformUser &&
    authenticatedTenantSlug === routeTenantSlug &&
    workspaceRouteLocale !== locale;

  const shouldLoadOnboarding =
    isWorkspaceSurface &&
    sessionReady &&
    isWorkspaceAuthenticated &&
    userAccess.isTenantUser &&
    !isPlatformUser &&
    authenticatedTenantSlug === routeTenantSlug &&
    !workspaceLocaleMismatch;

  const { data: onboardingData, isLoading: isOnboardingLoading } =
    useGetCurrentTenantOnboardingQuery(undefined, {
      skip: !shouldLoadOnboarding,
    });

  const onboarding =
    onboardingData?.onboarding ?? onboardingData?.tenant?.onboarding ?? null;
  const onboardingCompleted =
    onboarding?.completed ?? currentTenant?.onboarding?.completed;

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (!isSurfaceAuthenticated) {
      if (isWorkspaceSurface) {
        window.location.replace(
          buildPlatformUrl({
            locale,
            pathname: "/login",
          }),
        );
      } else {
        router.replace(
          publicCourseHref || publicVoucherHref || customerLoginHref,
        );
      }
      return;
    }

    if (isPlatformUser) {
      window.location.replace(
        buildInternalAdminUrl({
          locale,
          pathname: "/",
        }),
      );
      return;
    }

    if (!authenticatedTenantSlug) {
      dispatch(logOut({ authContext: expectedAuthContext }));

      if (isWorkspaceSurface) {
        window.location.replace(
          buildPlatformUrl({
            locale,
            pathname: "/login",
          }),
        );
      } else {
        router.replace("/login");
      }
      return;
    }

    if (
      authenticatedTenantSlug &&
      routeTenantSlug &&
      authenticatedTenantSlug !== routeTenantSlug
    ) {
      if (!isWorkspaceSurface) {
        /*
         * A customer session is tenant-bound. Clear only in-memory auth/cache
         * and ask for credentials on the requested tenant; do not revoke the
         * HTTP-only cookie or redirect into the previously authenticated
         * tenant's portal.
         */
        dispatch(logOut({ authContext: AUTH_CONTEXTS.CUSTOMER }));
        router.replace(customerLoginHref);
        return;
      }

      window.location.replace(
        buildTenantUrl({
          slug: authenticatedTenantSlug,
          locale: isWorkspaceSurface ? workspaceRouteLocale : locale,
          pathname: isWorkspaceSurface ? "/app" : "/portal",
        }),
      );
      return;
    }

    if (isWorkspaceSurface && !userAccess.isTenantUser) {
      dispatch(logOut({ authContext: AUTH_CONTEXTS.WORKSPACE }));
      window.location.replace(
        buildPlatformUrl({
          locale,
          pathname: "/login",
        }),
      );
      return;
    }

    if (workspaceLocaleMismatch) {
      router.replace(`${currentTenantPath || "/app"}${window.location.hash}`, {
        locale: workspaceRouteLocale,
        scroll: false,
      });
      return;
    }

    if (
      isWorkspaceSurface &&
      onboardingCompleted === false &&
      pathname !== "/app/onboarding"
    ) {
      router.replace("/app/onboarding");
    }
  }, [
    authenticatedTenantSlug,
    customerLoginHref,
    currentTenantPath,
    dispatch,
    expectedAuthContext,
    isPlatformUser,
    isSurfaceAuthenticated,
    isWorkspaceSurface,
    locale,
    onboardingCompleted,
    pathname,
    publicCourseHref,
    publicVoucherHref,
    routeTenantSlug,
    router,
    sessionReady,
    userAccess.isTenantUser,
    workspaceLocaleMismatch,
    workspaceRouteLocale,
  ]);

  if (
    !sessionReady ||
    workspaceLocaleMismatch ||
    (shouldLoadOnboarding && isOnboardingLoading)
  ) {
    return <LoadingState label={t("preparingAccount")} surface={surface} />;
  }

  if (
    !isSurfaceAuthenticated ||
    isPlatformUser ||
    !authenticatedTenantSlug ||
    (authenticatedTenantSlug &&
      routeTenantSlug &&
      authenticatedTenantSlug !== routeTenantSlug) ||
    (isWorkspaceSurface && !userAccess.isTenantUser) ||
    (isWorkspaceSurface &&
      onboardingCompleted === false &&
      pathname !== "/app/onboarding")
  ) {
    return <LoadingState label={t("redirecting")} surface={surface} />;
  }

  return children;
}
