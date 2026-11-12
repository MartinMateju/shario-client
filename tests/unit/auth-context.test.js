import { describe, expect, it } from "vitest";

import {
  AUTH_CONTEXTS,
  getLogoutEndpointForAuthContext,
  getRefreshEndpointForAuthContext,
  getTenantPostLoginPath,
  isAuthResponseForContext,
  isCustomerSocialCompletePath,
  resolveAuthContextForLocation,
} from "@/lib/features/auth/authContext";

const encodeTokenSegment = (value) =>
  globalThis
    .btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const buildAccessToken = (userInfo) =>
  [
    encodeTokenSegment({ alg: "none", typ: "JWT" }),
    encodeTokenSegment({ UserInfo: userInfo }),
    "test-signature",
  ].join(".");

describe("authentication audience resolver", () => {
  it.each([
    ["shario.localhost", "/en/login", AUTH_CONTEXTS.WORKSPACE],
    ["admin.shario.localhost", "/en", AUTH_CONTEXTS.WORKSPACE],
    ["studio-olivie.shario.localhost", "/en", AUTH_CONTEXTS.CUSTOMER],
    [
      "studio-olivie.shario.localhost",
      "/en/portal/bookings",
      AUTH_CONTEXTS.CUSTOMER,
    ],
    [
      "studio-olivie.shario.localhost",
      "/en/app/products",
      AUTH_CONTEXTS.WORKSPACE,
    ],
    [
      "studio-olivie.shario.localhost",
      "/pt-PT/app/products",
      AUTH_CONTEXTS.WORKSPACE,
    ],
    ["booking.custom-studio.test", "/pt_PT/app", AUTH_CONTEXTS.WORKSPACE],
    ["studio-olivie.shario.localhost", "/pt-BR/app", AUTH_CONTEXTS.CUSTOMER],
    ["booking.custom-studio.test", "/cs/login", AUTH_CONTEXTS.CUSTOMER],
    ["booking.custom-studio.test", "/cs/app", AUTH_CONTEXTS.WORKSPACE],
  ])("resolves %s%s as %s", (hostname, pathname, expected) => {
    expect(
      resolveAuthContextForLocation({
        hostname,
        pathname,
        rootHostname: "shario.localhost",
      }),
    ).toBe(expected);
  });

  it("routes contextual central login responses to their safe surface", () => {
    expect(
      getTenantPostLoginPath({
        authContext: "customer",
        tenant: { onboarding: { completed: false } },
        workspaceAccess: null,
      }),
    ).toBe("/portal");
    expect(
      getTenantPostLoginPath({
        authContext: "workspace",
        tenant: { onboarding: { completed: false } },
        workspaceAccess: { role: "owner" },
      }),
    ).toBe("/app/onboarding");
    expect(
      getTenantPostLoginPath({
        authContext: "workspace",
        tenant: { onboarding: { completed: true } },
        workspaceAccess: {
          preferences: { defaultLandingPage: "/app/products" },
        },
      }),
    ).toBe("/app/products");
  });

  it("uses audience-specific refresh and logout endpoints", () => {
    expect(getRefreshEndpointForAuthContext("customer")).toBe(
      "/auth/customer/refresh",
    );
    expect(getLogoutEndpointForAuthContext("customer")).toBe(
      "/auth/customer/logout",
    );
    expect(getRefreshEndpointForAuthContext("workspace")).toBe("/auth/refresh");
    expect(getLogoutEndpointForAuthContext("workspace")).toBe("/auth/logout");
  });

  it("leaves the social callback refresh to its callback component", () => {
    expect(isCustomerSocialCompletePath("/en/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/pt-PT/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/pt_PT/login/complete/")).toBe(true);
    expect(isCustomerSocialCompletePath("/sv/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/no-NO/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/fi-FI/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/hu/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/el-GR/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/tr_TR/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/nl-NL/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/ro_RO/login/complete")).toBe(true);
    expect(isCustomerSocialCompletePath("/ja/login/complete")).toBe(false);
    expect(isCustomerSocialCompletePath("/pt-BR/login/complete")).toBe(false);
    expect(isCustomerSocialCompletePath("/portal")).toBe(false);
  });
});

describe("authentication audience response contract", () => {
  it("accepts a customer token even when the rich profile is an underlying owner", () => {
    const response = {
      accessToken: buildAccessToken({
        id: "owner-1",
        authContext: "customer",
        platformRole: "none",
        tenantRole: "customer",
        tenantId: "tenant-1",
      }),
      authContext: "customer",
      tenant: { id: "tenant-1", slug: "studio-olivie" },
      user: {
        id: "owner-1",
        platformRole: "none",
        tenantRole: "owner",
      },
      workspaceAccess: null,
    };

    expect(isAuthResponseForContext(response, AUTH_CONTEXTS.CUSTOMER)).toBe(
      true,
    );
    expect(isAuthResponseForContext(response, AUTH_CONTEXTS.WORKSPACE)).toBe(
      false,
    );
  });

  it("rejects response/token audience mismatches and workspace access on customer sessions", () => {
    const response = {
      accessToken: buildAccessToken({
        id: "owner-1",
        authContext: "workspace",
        platformRole: "none",
        tenantRole: "owner",
      }),
      authContext: "customer",
      tenant: { slug: "studio-olivie" },
      user: { id: "owner-1" },
      workspaceAccess: null,
    };

    expect(isAuthResponseForContext(response, AUTH_CONTEXTS.CUSTOMER)).toBe(
      false,
    );
    expect(
      isAuthResponseForContext(
        {
          ...response,
          accessToken: buildAccessToken({
            id: "owner-1",
            authContext: "customer",
            platformRole: "none",
            tenantRole: "customer",
            tenantId: "tenant-1",
          }),
          tenant: { id: "tenant-1", slug: "studio-olivie" },
          workspaceAccess: { role: "owner" },
        },
        AUTH_CONTEXTS.CUSTOMER,
      ),
    ).toBe(false);
  });

  it.each([
    ["a mismatched tenant", { tenantId: "tenant-2" }],
    ["an owner tenant role", { tenantRole: "owner" }],
    ["a workspace role", { workspaceRole: "owner" }],
    ["a membership id", { membershipId: "membership-1" }],
    ["an authorization version", { authorizationVersion: 7 }],
    ["an admin flag", { isAdmin: true }],
    ["an owner flag", { isOwner: true }],
    ["a staff flag", { isStaff: true }],
  ])("rejects a customer token containing %s", (_label, claimOverride) => {
    const response = {
      accessToken: buildAccessToken({
        id: "owner-1",
        authContext: "customer",
        platformRole: "none",
        tenantRole: "customer",
        tenantId: "tenant-1",
        ...claimOverride,
      }),
      authContext: "customer",
      tenant: { id: "tenant-1", slug: "studio-olivie" },
      user: { id: "owner-1", tenantRole: "owner" },
      workspaceAccess: null,
    };

    expect(isAuthResponseForContext(response, AUTH_CONTEXTS.CUSTOMER)).toBe(
      false,
    );
  });
});
