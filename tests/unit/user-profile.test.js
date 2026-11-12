import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/config/permissions";
import {
  getUserAccess,
  getUserDisplayName,
  getUserInitials,
} from "@/utils/user-profile.utils";

describe("getUserAccess", () => {
  it("treats explicit null workspace access as a portal customer", () => {
    const access = getUserAccess(
      {
        tenantRole: "OWNER",
        isOwner: true,
        roles: ["TENANT_ADMIN"],
      },
      null,
    );

    expect(access).toMatchObject({
      roleKey: "customer",
      isTenantUser: false,
      isActiveWorkspaceMember: false,
      isEndCustomer: true,
      canManageWorkspace: false,
      canManageTeam: false,
      workspaceAccess: null,
    });
    expect(access.roles).toEqual([]);
  });

  it("uses canonical active custom-role permissions for workspace decisions", () => {
    const access = getUserAccess(
      { tenantRole: "CUSTOMER" },
      {
        role: "custom",
        status: "ACTIVE",
        effectivePermissions: [
          PERMISSIONS.WORKSPACE_UPDATE,
          PERMISSIONS.TEAM_MANAGE,
        ],
      },
    );

    expect(access).toMatchObject({
      roleKey: "custom",
      isTenantUser: true,
      isActiveWorkspaceMember: true,
      isEndCustomer: false,
      canManageWorkspace: true,
      canManageTeam: true,
      permissions: [PERMISSIONS.WORKSPACE_UPDATE, PERMISSIONS.TEAM_MANAGE],
    });
  });

  it("denies inactive members even when their role grants permissions", () => {
    const access = getUserAccess(
      {},
      {
        role: "staff",
        status: "SUSPENDED",
        permissions: [PERMISSIONS.WORKSPACE_UPDATE, PERMISSIONS.TEAM_MANAGE],
      },
    );

    expect(access).toMatchObject({
      roleKey: "staff",
      isTenantUser: false,
      isActiveWorkspaceMember: false,
      isEndCustomer: true,
      canManageWorkspace: false,
      canManageTeam: false,
    });
  });

  it("supports legacy manager claims only when access was not resolved", () => {
    const legacy = getUserAccess({
      tenantRole: "TENANT_ADMIN",
      roles: [{ code: "STAFF" }],
    });
    const resolvedCustomer = getUserAccess(
      {
        tenantRole: "TENANT_ADMIN",
        isAdmin: true,
      },
      null,
    );

    expect(legacy).toMatchObject({
      roleKey: "admin",
      isTenantUser: true,
      canManageWorkspace: true,
      canManageTeam: true,
    });
    expect(legacy.roles).toEqual(
      expect.arrayContaining(["TENANT_ADMIN", "STAFF"]),
    );
    expect(resolvedCustomer).toMatchObject({
      roleKey: "customer",
      isTenantUser: false,
      canManageWorkspace: false,
      canManageTeam: false,
    });
  });

  it("recognizes nested owner membership contracts", () => {
    const access = getUserAccess(
      {},
      {
        membership: {
          role: {
            key: "owner",
            permissions: [],
          },
          status: "active",
        },
      },
    );

    expect(access).toMatchObject({
      roleKey: "owner",
      isTenantUser: true,
      isActiveWorkspaceMember: true,
      canManageWorkspace: true,
      canManageTeam: true,
    });
  });
});

describe("user identity presentation", () => {
  it("prefers first and last names before generic name or email fallbacks", () => {
    expect(
      getUserDisplayName({
        firstname: "Ada",
        lastname: "Lovelace",
        name: "Ignored Name",
        email: "ignored@example.test",
      }),
    ).toBe("Ada Lovelace");
    expect(getUserDisplayName({ name: "Grace Hopper" })).toBe("Grace Hopper");
    expect(getUserDisplayName({ email: "user@example.test" })).toBe(
      "user@example.test",
    );
  });

  it("builds at most two uppercase initials and uses a safe fallback", () => {
    expect(getUserInitials({ name: "ada byron lovelace" })).toBe("AB");
    expect(getUserInitials({ firstname: "Éva", lastname: "Novák" })).toBe("ÉN");
    expect(getUserInitials(null)).toBe("SK");
    expect(getUserInitials({}, "ST")).toBe("ST");
  });
});
