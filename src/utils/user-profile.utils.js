import {
  PERMISSIONS,
  WORKSPACE_MEMBERSHIP_STATUSES,
  getWorkspaceAccessPermissions,
  getWorkspaceAccessRole,
  hasAnyPermission,
  hasPermission,
  isWorkspaceOwner,
  normalizeWorkspaceAccess,
} from "@/config/permissions";

const TENANT_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "STAFF",
  "MANAGER",
  "MODERATOR",
  "INSTRUCTOR",
  "ACCOUNTANT",
  "VIEWER",
  "CUSTOM",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "TENANT_STAFF",
  "TENANT_USER",
]);

const normalizeRole = (role) => {
  if (typeof role !== "string") {
    return "";
  }

  return role.trim().replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
};

const addRole = (roles, value) => {
  if (Array.isArray(value)) {
    value.forEach((role) => addRole(roles, role));
    return;
  }

  if (value && typeof value === "object") {
    addRole(roles, value.key);
    addRole(roles, value.name);
    addRole(roles, value.role);
    addRole(roles, value.code);
    addRole(roles, value.slug);
    return;
  }

  const role = normalizeRole(value);

  if (role) {
    roles.add(role);
  }
};

export const getUserAccess = (
  user,
  workspaceAccess = user?.workspaceAccess ??
    user?.tenantMembership ??
    user?.membership,
) => {
  const roles = new Set();
  const hasWorkspaceAccess =
    workspaceAccess !== null &&
    workspaceAccess !== undefined &&
    typeof workspaceAccess === "object";
  const normalizedWorkspaceAccess = hasWorkspaceAccess
    ? normalizeWorkspaceAccess(workspaceAccess)
    : null;
  const useLegacyAuth = workspaceAccess === undefined;

  if (hasWorkspaceAccess) {
    addRole(roles, getWorkspaceAccessRole(normalizedWorkspaceAccess));
    addRole(roles, normalizedWorkspaceAccess?.role);
    addRole(roles, normalizedWorkspaceAccess?.membership?.role);
  }

  if (useLegacyAuth) {
    // Support legacy JWT structures while older API responses do not expose a
    // dedicated workspace-access object. An explicit null means that the user
    // is a portal customer and deliberately disables this fallback.
    addRole(roles, user?.tenantRole);
    addRole(roles, user?.tenant_role);
    addRole(roles, user?.tenantRoles);
    addRole(roles, user?.role);
    addRole(roles, user?.roles);
    addRole(roles, user?.userRole);
    addRole(roles, user?.accessLevel);
    addRole(roles, user?.tenant?.role);
  }

  const legacyTenantUser = Boolean(
    user?.isAdmin ||
    user?.isModerator ||
    user?.isOwner ||
    user?.isStaff ||
    user?.isTenantUser,
  );

  const roleBasedTenantUser = [...roles].some((role) => TENANT_ROLES.has(role));
  const status = String(
    normalizedWorkspaceAccess?.status ||
      normalizedWorkspaceAccess?.membership?.status ||
      "active",
  )
    .trim()
    .toLowerCase();
  const isActiveWorkspaceMember =
    hasWorkspaceAccess && status === WORKSPACE_MEMBERSHIP_STATUSES.ACTIVE;

  const isTenantUser = hasWorkspaceAccess
    ? isActiveWorkspaceMember && roleBasedTenantUser
    : workspaceAccess === null
      ? false
      : legacyTenantUser || roleBasedTenantUser;

  let roleKey = "customer";

  if (
    (useLegacyAuth && user?.isOwner) ||
    roles.has("OWNER") ||
    roles.has("TENANT_OWNER")
  ) {
    roleKey = "owner";
  } else if (
    (useLegacyAuth && user?.isAdmin) ||
    roles.has("ADMIN") ||
    roles.has("TENANT_ADMIN")
  ) {
    roleKey = "admin";
  } else if (roles.has("MANAGER")) {
    roleKey = "manager";
  } else if (
    (useLegacyAuth && user?.isModerator) ||
    roles.has("MODERATOR") ||
    (useLegacyAuth && user?.isStaff) ||
    roles.has("STAFF") ||
    roles.has("TENANT_STAFF") ||
    roles.has("TENANT_USER")
  ) {
    roleKey = "staff";
  } else if (roles.has("INSTRUCTOR")) {
    roleKey = "instructor";
  } else if (roles.has("ACCOUNTANT")) {
    roleKey = "accountant";
  } else if (roles.has("VIEWER")) {
    roleKey = "viewer";
  } else if (roles.has("CUSTOM")) {
    roleKey = "custom";
  }

  const permissions = getWorkspaceAccessPermissions(normalizedWorkspaceAccess);
  const legacyWorkspaceManager =
    workspaceAccess === undefined &&
    (roleKey === "owner" || roleKey === "admin" || roleKey === "manager");
  const canManageWorkspace = normalizedWorkspaceAccess
    ? isWorkspaceOwner(normalizedWorkspaceAccess) ||
      hasPermission(normalizedWorkspaceAccess, PERMISSIONS.WORKSPACE_UPDATE)
    : legacyWorkspaceManager;
  const canManageTeam = normalizedWorkspaceAccess
    ? isWorkspaceOwner(normalizedWorkspaceAccess) ||
      hasAnyPermission(normalizedWorkspaceAccess, [
        PERMISSIONS.TEAM_MANAGE,
        PERMISSIONS.ROLES_MANAGE,
      ])
    : legacyWorkspaceManager;

  return {
    canManageTeam,
    canManageWorkspace,
    isEndCustomer: !isTenantUser,
    isActiveWorkspaceMember,
    isTenantUser,
    permissions,
    roleKey,
    roles: [...roles],
    workspaceAccess: normalizedWorkspaceAccess,
  };
};

export const getUserDisplayName = (user) => {
  const firstName = user?.firstname || user?.firstName || "";

  const lastName = user?.lastname || user?.lastName || "";

  return (
    [firstName, lastName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    ""
  );
};

export const getUserInitials = (user, fallback = "SK") => {
  const displayName = getUserDisplayName(user);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || fallback;
};
