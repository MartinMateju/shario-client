"use client";

import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isWorkspaceAccessActive,
  isWorkspaceOwner,
} from "@/config/permissions";
import {
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
  selectIsWorkspaceAccessResolved,
} from "@/lib/features/auth/authSlice";
import { useRouter } from "@/i18n/navigation";
import { useGetCurrentWorkspaceAccessQuery } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import { getUserAccess } from "@/utils/user-profile.utils";

const toPermissionList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
};

/**
 * Controls presentation only. Every protected backend endpoint must still use
 * server-side permission middleware.
 */
export default function PermissionBoundary({
  children,
  permission,
  permissions,
  allOf,
  anyOf,
  ownerOnly = false,
  fallback = null,
  fallbackHref = "/app",
  loadingFallback = null,
}) {
  const router = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const accessResolved = useSelector(selectIsWorkspaceAccessResolved);
  const {
    data: accessData,
    isLoading,
    isFetching,
  } = useGetCurrentWorkspaceAccessQuery(undefined, {
    skip: !isAuthenticated || accessResolved,
  });
  const queryHasAccess = Boolean(
    accessData &&
    Object.prototype.hasOwnProperty.call(accessData, "workspaceAccess"),
  );
  const resolvedAccess = accessResolved
    ? workspaceAccess
    : queryHasAccess
      ? accessData.workspaceAccess
      : undefined;

  const effectiveAccess = useMemo(() => {
    if (accessResolved || queryHasAccess) {
      return resolvedAccess;
    }

    // Temporary compatibility for sessions issued by an older backend. Only
    // legacy workspace managers receive the wildcard fallback.
    const legacyAccess = getUserAccess(currentUser);

    if (!legacyAccess.isTenantUser) {
      return null;
    }

    return {
      role: legacyAccess.roleKey,
      roleKey: legacyAccess.roleKey,
      permissions: legacyAccess.canManageWorkspace ? ["*"] : [],
    };
  }, [accessResolved, currentUser, queryHasAccess, resolvedAccess]);

  const requiredAll = [
    ...toPermissionList(permission),
    ...toPermissionList(permissions),
    ...toPermissionList(allOf),
  ];
  const requiredAny = toPermissionList(anyOf);
  const hasRequiredPermissions = Boolean(
    effectiveAccess &&
    isWorkspaceAccessActive(effectiveAccess) &&
    (!ownerOnly || isWorkspaceOwner(effectiveAccess)) &&
    (requiredAll.length === 0 ||
      (requiredAll.length === 1
        ? hasPermission(effectiveAccess, requiredAll[0])
        : hasAllPermissions(effectiveAccess, requiredAll))) &&
    (requiredAny.length === 0 ||
      hasAnyPermission(effectiveAccess, requiredAny)),
  );
  const isCheckingAccess =
    isAuthenticated &&
    !accessResolved &&
    !queryHasAccess &&
    (isLoading || isFetching);

  useEffect(() => {
    if (
      isCheckingAccess ||
      !isAuthenticated ||
      hasRequiredPermissions ||
      !fallbackHref
    ) {
      return;
    }

    router.replace(fallbackHref);
  }, [
    fallbackHref,
    hasRequiredPermissions,
    isAuthenticated,
    isCheckingAccess,
    router,
  ]);

  if (isCheckingAccess || (!accessResolved && !currentUser)) {
    return loadingFallback;
  }

  return hasRequiredPermissions ? children : fallback;
}
