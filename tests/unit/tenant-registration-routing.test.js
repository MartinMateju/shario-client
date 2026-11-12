import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildRegisterTenantRequest } from "@/lib/features/auth/authApiSlice";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("tenant owner registration routing", () => {
  it("keeps workspace creation separate from tenant customer registration", () => {
    const authApi = read("src", "lib", "features", "auth", "authApiSlice.js");
    const usersApi = read(
      "src",
      "lib",
      "features",
      "users",
      "usersApiSlice.js",
    );

    expect(
      buildRegisterTenantRequest({
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
        firstname: "Ada",
        lastname: "Lovelace",
        authContext: "workspace",
      }),
    ).toEqual({
      url: "/auth/tenant/register",
      method: "POST",
      body: {
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
        firstname: "Ada",
        lastname: "Lovelace",
      },
    });
    expect(authApi).toMatch(
      /registerTenant:\s*builder\.mutation\(\{[\s\S]*?query:\s*buildRegisterTenantRequest/,
    );
    expect(usersApi).toMatch(/registerNewUser:[\s\S]*?url: "\/auth\/register"/);
  });

  it("redirects a created owner workspace to protected tenant onboarding", () => {
    const registerPage = read("src", "app", "[locale]", "register", "page.js");
    const onboardingRoute = path.join(
      process.cwd(),
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "app",
      "onboarding",
      "page.js",
    );

    expect(registerPage).toContain("buildRegisteredTenantOnboardingUrl");
    expect(registerPage).toContain("useRegisterTenantMutation");
    expect(fs.existsSync(onboardingRoute)).toBe(true);
  });

  it("waits for refresh-cookie session restoration before onboarding can redirect", () => {
    const appLayout = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "app",
      "layout.js",
    );
    const boundary = read(
      "src",
      "components",
      "auth",
      "TenantSurfaceBoundary.js",
    );

    expect(appLayout).toContain('TenantSurfaceBoundary surface="app"');
    expect(boundary).toContain("if (!sessionReady");
    expect(boundary).toContain("return <LoadingState");
  });

  it("suppresses social-provider discovery when public tenant data is degraded", () => {
    const socialButtons = read(
      "src",
      "components",
      "auth",
      "CustomerSocialAuthButtons.js",
    );

    expect(socialButtons).toContain("useOptionalPublicTenant");
    expect(socialButtons).toContain("degraded: publicTenantContext?.degraded");
    expect(socialButtons).toContain("skip: !shouldQueryProviders");
  });

  it("uses one shared validated root-domain resolver for proxy rewrites and client redirects", () => {
    const proxy = read("src", "proxy.js");
    const tenantRouting = read("src", "utils", "tenantRouting.js");

    expect(proxy).toContain('from "./utils/tenantRouting"');
    expect(proxy).toContain(
      "normalizeRootHostname(process.env.TENANT_ROOT_DOMAIN)",
    );
    expect(proxy).toContain("getConfiguredRootHostname()");
    expect(tenantRouting).toContain("export const normalizeRootHostname");
    expect(tenantRouting).toContain("export const getConfiguredRootHostname");
    expect(tenantRouting).toContain("process.env.NEXT_PUBLIC_ROOT_DOMAIN");
    expect(tenantRouting).toContain("process.env.NEXT_PUBLIC_SITE_URL");
    expect(tenantRouting).toContain("process.env.NEXT_PUBLIC_API_URL");
  });
});
