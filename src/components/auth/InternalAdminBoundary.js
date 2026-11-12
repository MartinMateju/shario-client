"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";

import {
  logOut,
  selectCurrentTenant,
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsSessionReady,
} from "@/lib/features/auth/authSlice";
import { buildPlatformUrl, buildTenantUrl } from "@/utils/tenantRouting";

const hasPlatformAccess = (user) => {
  const role = String(user?.platformRole || "")
    .trim()
    .toLowerCase();

  return Boolean(role && role !== "none");
};

function AdminLoadingState({ children = "Checking platform access…" }) {
  return (
    <main className="relative z-[60] -mt-[var(--header-height)] flex min-h-dvh items-center justify-center bg-[#11110F] px-6 text-white">
      <p className="text-sm text-white/65" role="status">
        {children}
      </p>
    </main>
  );
}

export default function InternalAdminBoundary({ children }) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const sessionReady = useSelector(selectIsSessionReady);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const currentTenant = useSelector(selectCurrentTenant);
  const canAccess = hasPlatformAccess(currentUser);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (!isAuthenticated) {
      window.location.replace(buildPlatformUrl({ locale, pathname: "/login" }));
      return;
    }

    if (canAccess) {
      return;
    }

    if (currentTenant?.slug) {
      window.location.replace(
        buildTenantUrl({
          slug: currentTenant.slug,
          locale,
          pathname: "/app",
        }),
      );
      return;
    }

    dispatch(logOut());
    window.location.replace(buildPlatformUrl({ locale, pathname: "/" }));
  }, [
    canAccess,
    currentTenant?.slug,
    dispatch,
    isAuthenticated,
    locale,
    sessionReady,
  ]);

  if (!sessionReady) {
    return <AdminLoadingState />;
  }

  if (!isAuthenticated || !canAccess) {
    return (
      <AdminLoadingState>Taking you to the right account…</AdminLoadingState>
    );
  }

  return children;
}
