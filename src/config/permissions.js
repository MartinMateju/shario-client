/**
 * Workspace permission identifiers are part of the frontend/backend contract.
 * Keep their string values in sync with the server permission catalogue.
 */
export const PERMISSIONS = Object.freeze({
  WORKSPACE_VIEW: "workspace.view",
  WORKSPACE_UPDATE: "workspace.update",
  WORKSPACE_CONFIGURATION_MANAGE: "workspace.configuration.manage",
  WORKSPACE_PUBLISH: "workspace.publish",
  WORKSPACE_OWNERSHIP_TRANSFER: "workspace.ownership.transfer",
  WORKSPACE_DELETE: "workspace.delete",

  TEAM_VIEW: "team.view",
  TEAM_MANAGE: "team.manage",
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",

  LOCATIONS_VIEW: "locations.view",
  LOCATIONS_MANAGE: "locations.manage",

  ACCESS_CODES_VIEW: "access_codes.view",
  ACCESS_CODES_MANAGE: "access_codes.manage",
  ACCESS_CODES_REVEAL: "access_codes.reveal",
  ACCESS_CODES_IMPORT: "access_codes.import",
  ACCESS_CODES_AUDIT_VIEW: "access_codes.audit.view",

  BOOKINGS_VIEW: "bookings.view",
  BOOKINGS_CREATE: "bookings.create",
  BOOKINGS_UPDATE: "bookings.update",
  BOOKINGS_CANCEL: "bookings.cancel",
  BOOKINGS_REFUND: "bookings.refund",
  BOOKINGS_IMPORT: "bookings.import",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_EXPORT: "customers.export",
  CUSTOMERS_IMPORT: "customers.import",

  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_REFUND: "payments.refund",
  PAYMENTS_CONNECT_MANAGE: "payments.connect.manage",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  PRODUCTS_IMPORT: "products.import",
  COURSES_VIEW: "courses.view",
  COURSES_MANAGE: "courses.manage",
  MEMBERSHIPS_VIEW: "memberships.view",
  MEMBERSHIPS_MANAGE: "memberships.manage",
  MEMBERSHIPS_IMPORT: "memberships.import",
  ORDERS_VIEW: "orders.view",
  ORDERS_MANAGE: "orders.manage",
  INVOICES_VIEW: "invoices.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_FINALIZE: "invoices.finalize",
  INVOICES_SEND: "invoices.send",
  INVOICES_CREDIT: "invoices.credit",
  INVOICES_PAYMENTS_MANAGE: "invoices.payments.manage",
  INVOICES_EXPORT: "invoices.export",
  CREDITS_VIEW: "credits.view",
  CREDITS_MANAGE: "credits.manage",
  CREDITS_IMPORT: "credits.import",
  VOUCHERS_VIEW: "vouchers.view",
  VOUCHERS_MANAGE: "vouchers.manage",
  VOUCHERS_IMPORT: "vouchers.import",
  DATA_IMPORTS_ROLLBACK: "data-imports.rollback",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",
  TASKS_VIEW: "tasks.view",
  TASKS_MANAGE: "tasks.manage",
  PLANNING_SUBMIT: "planning.submit",
  PLANNING_TEAM_VIEW: "planning.team.view",
  PLANNING_MANAGE: "planning.manage",
  COMMUNICATIONS_VIEW: "communications.view",
  COMMUNICATIONS_MANAGE: "communications.manage",
  COMMUNICATIONS_SEND: "communications.send",
  COMMUNICATIONS_ASSIGN: "communications.assign",
  COMMUNICATIONS_SETTINGS_MANAGE: "communications.settings.manage",
  COMMUNICATIONS_AUDIT_VIEW: "communications.audit.view",

  AI_USE: "ai.use",
  AI_SETTINGS_MANAGE: "ai.settings.manage",
  AI_AUDIT_VIEW: "ai.audit.view",
  KNOWLEDGE_VIEW: "knowledge.view",
  KNOWLEDGE_MANAGE: "knowledge.manage",
  KNOWLEDGE_PUBLISH: "knowledge.publish",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  SUBSCRIPTION_VIEW: "subscription.view",
  SUBSCRIPTION_MANAGE: "subscription.manage",
});

export const DATA_IMPORT_PERMISSIONS = Object.freeze([
  PERMISSIONS.CUSTOMERS_IMPORT,
  PERMISSIONS.PRODUCTS_IMPORT,
  PERMISSIONS.BOOKINGS_IMPORT,
  PERMISSIONS.MEMBERSHIPS_IMPORT,
  PERMISSIONS.CREDITS_IMPORT,
  PERMISSIONS.VOUCHERS_IMPORT,
]);

export const WORKSPACE_ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  ACCOUNTANT: "accountant",
  VIEWER: "viewer",
  CUSTOM: "custom",
});

export const WORKSPACE_MEMBERSHIP_STATUSES = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REVOKED: "revoked",
});

const normalizeString = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizeWorkspaceRole = (value) => {
  if (value && typeof value === "object") {
    return normalizeWorkspaceRole(
      value.key ?? value.code ?? value.slug ?? value.name ?? value.role,
    );
  }

  return normalizeString(value).replaceAll("-", "_").replaceAll(" ", "_");
};

export const normalizePermission = (value) => {
  if (value && typeof value === "object") {
    return normalizePermission(
      value.key ?? value.code ?? value.permission ?? value.name,
    );
  }

  return normalizeString(value);
};

export const normalizePermissions = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizePermission).filter(Boolean))];
};

const getMembership = (access) =>
  access?.membership && typeof access.membership === "object"
    ? access.membership
    : access;

export const getWorkspaceAccessRole = (access) => {
  const membership = getMembership(access);

  return normalizeWorkspaceRole(
    access?.roleKey ??
      access?.role ??
      membership?.roleKey ??
      membership?.role ??
      membership?.tenantRole,
  );
};

export const getWorkspaceAccessPermissions = (access) =>
  normalizePermissions(
    access?.effectivePermissions ??
      access?.permissions ??
      access?.role?.permissions ??
      access?.membership?.effectivePermissions ??
      access?.membership?.permissions ??
      access?.membership?.role?.permissions,
  );

export const isWorkspaceOwner = (access) =>
  getWorkspaceAccessRole(access) === WORKSPACE_ROLES.OWNER;

export const isWorkspaceAccessActive = (access) => {
  if (access?.isPlatformBypass === true) {
    return true;
  }

  const membership = getMembership(access);
  const status = normalizeString(membership?.status ?? access?.status);

  return !status || status === WORKSPACE_MEMBERSHIP_STATUSES.ACTIVE;
};

export const hasPermission = (access, permission) => {
  const normalizedPermission = normalizePermission(permission);

  if (!normalizedPermission || !isWorkspaceAccessActive(access)) {
    return false;
  }

  if (isWorkspaceOwner(access)) {
    return true;
  }

  const permissions = getWorkspaceAccessPermissions(access);

  return (
    permissions.includes("*") || permissions.includes(normalizedPermission)
  );
};

export const hasAnyPermission = (access, permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  return permissions.some((permission) => hasPermission(access, permission));
};

export const hasAllPermissions = (access, permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  return permissions.every((permission) => hasPermission(access, permission));
};

/**
 * Accept both the canonical API shape and older membership-shaped responses.
 * Unknown response properties are retained so the client stays forwards
 * compatible as the access contract grows.
 */
export const normalizeWorkspaceAccess = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source =
    value.workspaceAccess && typeof value.workspaceAccess === "object"
      ? value.workspaceAccess
      : value;
  const membership = getMembership(source);
  const role = getWorkspaceAccessRole(source);
  const permissions = getWorkspaceAccessPermissions(source);
  const status = normalizeString(
    membership?.status || source?.status || "active",
  );
  const sourcePreferences = source.preferences ?? membership?.preferences;
  const preferences =
    sourcePreferences && typeof sourcePreferences === "object"
      ? {
          ...sourcePreferences,
          defaultLocation:
            sourcePreferences.defaultLocation ??
            sourcePreferences.defaultLocationId ??
            null,
          defaultLocationId:
            sourcePreferences.defaultLocationId ??
            sourcePreferences.defaultLocation ??
            null,
        }
      : sourcePreferences;

  return {
    ...source,
    ...(source.membership && typeof source.membership === "object"
      ? {
          membership: {
            ...source.membership,
            role: source.membership.role ?? role,
            status,
          },
        }
      : {}),
    role: source.role ?? role,
    roleKey: role,
    status,
    permissions,
    effectivePermissions: permissions,
    ...(preferences !== undefined ? { preferences } : {}),
    accessVersion: source.accessVersion ?? source.authorizationVersion ?? 0,
    authorizationVersion:
      source.authorizationVersion ?? source.accessVersion ?? 0,
  };
};
