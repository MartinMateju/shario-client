import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  WORKSPACE_ROLES,
  getWorkspaceAccessPermissions,
  getWorkspaceAccessRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isWorkspaceAccessActive,
  isWorkspaceOwner,
  normalizePermission,
  normalizePermissions,
  normalizeWorkspaceAccess,
  normalizeWorkspaceRole,
} from "@/config/permissions";

describe("workspace permission normalization", () => {
  it("normalizes role and permission values from legacy object shapes", () => {
    expect(normalizeWorkspaceRole(" Tenant-Owner ")).toBe("tenant_owner");
    expect(normalizeWorkspaceRole({ code: "Studio Manager" })).toBe(
      "studio_manager",
    );
    expect(normalizeWorkspaceRole(null)).toBe("");

    expect(normalizePermission({ permission: " BOOKINGS.CREATE " })).toBe(
      PERMISSIONS.BOOKINGS_CREATE,
    );
    expect(normalizePermission(42)).toBe("");
  });

  it("deduplicates permissions and ignores malformed entries", () => {
    expect(
      normalizePermissions([
        " bookings.view ",
        { key: "bookings.view" },
        { code: "BOOKINGS.CREATE" },
        null,
        42,
      ]),
    ).toEqual([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE]);
    expect(normalizePermissions("bookings.view")).toEqual([]);
  });

  it("reads canonical and nested membership access contracts", () => {
    expect(
      getWorkspaceAccessRole({
        membership: { tenantRole: "Accountant" },
      }),
    ).toBe(WORKSPACE_ROLES.ACCOUNTANT);

    expect(
      getWorkspaceAccessPermissions({
        membership: {
          role: {
            permissions: [
              PERMISSIONS.INVOICES_VIEW,
              PERMISSIONS.INVOICES_EXPORT,
            ],
          },
        },
      }),
    ).toEqual([PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_EXPORT]);
  });
});

describe("workspace authorization decisions", () => {
  it("gives an active owner every workspace permission", () => {
    const owner = { roleKey: WORKSPACE_ROLES.OWNER, status: "active" };

    expect(isWorkspaceOwner(owner)).toBe(true);
    expect(isWorkspaceAccessActive(owner)).toBe(true);
    expect(hasPermission(owner, PERMISSIONS.WORKSPACE_DELETE)).toBe(true);
  });

  it("denies suspended and revoked memberships, including owners", () => {
    const suspendedOwner = {
      roleKey: WORKSPACE_ROLES.OWNER,
      status: "suspended",
    };
    const revokedWildcard = {
      roleKey: WORKSPACE_ROLES.ADMIN,
      status: "revoked",
      permissions: ["*"],
    };

    expect(isWorkspaceAccessActive(suspendedOwner)).toBe(false);
    expect(hasPermission(suspendedOwner, PERMISSIONS.WORKSPACE_VIEW)).toBe(
      false,
    );
    expect(hasPermission(revokedWildcard, PERMISSIONS.WORKSPACE_VIEW)).toBe(
      false,
    );
  });

  it("supports explicit and wildcard permissions for active members", () => {
    const staff = {
      roleKey: WORKSPACE_ROLES.STAFF,
      status: "active",
      effectivePermissions: [
        PERMISSIONS.BOOKINGS_VIEW,
        PERMISSIONS.BOOKINGS_CREATE,
      ],
    };
    const platformBypass = {
      roleKey: WORKSPACE_ROLES.ADMIN,
      status: "suspended",
      isPlatformBypass: true,
      permissions: ["*"],
    };

    expect(hasPermission(staff, PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    expect(hasPermission(staff, PERMISSIONS.BOOKINGS_REFUND)).toBe(false);
    expect(hasPermission(platformBypass, PERMISSIONS.WORKSPACE_DELETE)).toBe(
      true,
    );
    expect(hasPermission(staff, "")).toBe(false);
    expect(hasPermission(null, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
  });

  it("evaluates any-of and all-of permission groups safely", () => {
    const accountant = {
      roleKey: WORKSPACE_ROLES.ACCOUNTANT,
      permissions: [PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_EXPORT],
    };

    expect(
      hasAnyPermission(accountant, [
        PERMISSIONS.BOOKINGS_REFUND,
        PERMISSIONS.INVOICES_VIEW,
      ]),
    ).toBe(true);
    expect(
      hasAllPermissions(accountant, [
        PERMISSIONS.INVOICES_VIEW,
        PERMISSIONS.INVOICES_EXPORT,
      ]),
    ).toBe(true);
    expect(
      hasAllPermissions(accountant, [
        PERMISSIONS.INVOICES_VIEW,
        PERMISSIONS.PAYMENTS_REFUND,
      ]),
    ).toBe(false);
    expect(hasAnyPermission(accountant, [])).toBe(false);
    expect(hasAllPermissions(accountant, null)).toBe(false);
  });
});

describe("normalizeWorkspaceAccess", () => {
  it("normalizes nested access, preferences, status, and version aliases", () => {
    const normalized = normalizeWorkspaceAccess({
      workspaceAccess: {
        membership: {
          role: "staff",
          status: "ACTIVE",
          preferences: {
            defaultLocationId: "location-1",
            notifications: { email: true },
          },
        },
        effectivePermissions: [
          PERMISSIONS.BOOKINGS_VIEW,
          PERMISSIONS.BOOKINGS_VIEW,
        ],
        authorizationVersion: 7,
        customField: "preserved",
      },
    });

    expect(normalized).toMatchObject({
      roleKey: WORKSPACE_ROLES.STAFF,
      status: "active",
      permissions: [PERMISSIONS.BOOKINGS_VIEW],
      effectivePermissions: [PERMISSIONS.BOOKINGS_VIEW],
      accessVersion: 7,
      authorizationVersion: 7,
      customField: "preserved",
      preferences: {
        defaultLocation: "location-1",
        defaultLocationId: "location-1",
        notifications: { email: true },
      },
      membership: {
        role: "staff",
        status: "active",
      },
    });
  });

  it("uses safe defaults and rejects non-object access values", () => {
    expect(
      normalizeWorkspaceAccess({
        roleKey: "viewer",
        preferences: { defaultLocation: "location-2" },
      }),
    ).toMatchObject({
      roleKey: WORKSPACE_ROLES.VIEWER,
      status: "active",
      permissions: [],
      accessVersion: 0,
      authorizationVersion: 0,
      preferences: {
        defaultLocation: "location-2",
        defaultLocationId: "location-2",
      },
    });
    expect(normalizeWorkspaceAccess(null)).toBeNull();
    expect(normalizeWorkspaceAccess([])).toBeNull();
  });
});
