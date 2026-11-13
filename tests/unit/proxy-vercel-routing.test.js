import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

import proxy from "@/proxy";

const request = (hostname, pathname = "/en") =>
  new NextRequest(`https://${hostname}${pathname}`, {
    headers: { host: hostname, "accept-language": "en" },
  });

beforeEach(() => {
  for (const [key, value] of Object.entries({
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_URL: "shario-client-deployment-team.vercel.app",
    VERCEL_BRANCH_URL: "shario-client-git-feature-team.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "shario-client.vercel.app",
    TENANT_ROOT_DOMAIN: "shario.io",
    NEXT_PUBLIC_ROOT_DOMAIN: "shario.io",
    NEXT_PUBLIC_SITE_URL: "https://shario.io",
    NEXT_PUBLIC_API_URL: "https://api.shario.io",
    PLATFORM_HOSTNAMES: "",
    CUSTOM_DOMAIN_TENANTS: '{"shared-space.example":"shared-space"}',
    LEGACY_TENANT_SLUGS: "",
  })) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => vi.unstubAllEnvs());

describe("Vercel deployment hostname routing", () => {
  it.each([
    "shario-client-deployment-team.vercel.app",
    "shario-client-git-feature-team.vercel.app",
    "shario-client.vercel.app",
  ])("serves the platform on the exact project hostname %s", (hostname) => {
    const response = proxy(request(hostname));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("keeps locale redirects on the active deployment URL", () => {
    const response = proxy(
      request("shario-client-deployment-team.vercel.app", "/pricing?plan=plus"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://shario-client-deployment-team.vercel.app/en/pricing?plan=plus",
    );
  });

  it.each([
    "other-team.vercel.app",
    "tenant.shario-client-deployment-team.vercel.app",
    "shario-client-deployment-team.vercel.app.example",
  ])("rejects unrelated and nested deployment hosts %s", (hostname) => {
    expect(proxy(request(hostname)).status).toBe(404);
  });

  it("ignores deployment variables outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(
      proxy(request("shario-client-deployment-team.vercel.app")).status,
    ).toBe(404);
  });

  it.each(["shared-space.shario.io", "shared-space.example"])(
    "preserves tenant routing on %s",
    (hostname) => {
      const response = proxy(request(hostname, "/en/portal"));
      expect(response.status).toBe(200);
      expect(
        new URL(response.headers.get("x-middleware-rewrite")).pathname,
      ).toBe("/en/tenants/shared-space/portal");
    },
  );

  it("does not expose internal tenant routes on deployment URLs", () => {
    expect(
      proxy(
        request(
          "shario-client-deployment-team.vercel.app",
          "/en/tenants/shared-space/app",
        ),
      ).status,
    ).toBe(404);
  });
});
