import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

import { routing } from "@/i18n/routing";
import proxy from "@/proxy";

const legacyPath = "/en/tenants/clay-house/public-site-preview";
const query = "?nonce=preview-_r_1e_-en&draft=a%2Bb&draft=c";
const requestFor = (origin, pathname = legacyPath, options = {}) =>
  new NextRequest(`${origin}${pathname}${query}`, {
    ...options,
    headers: { host: new URL(origin).host, ...options.headers },
  });

beforeEach(() => {
  for (const key of [
    "TENANT_ROOT_DOMAIN",
    "NEXT_PUBLIC_ROOT_DOMAIN",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_API_URL",
    "PLATFORM_HOSTNAMES",
    "LEGACY_TENANT_SLUGS",
  ]) {
    vi.stubEnv(key, "");
  }
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv(
    "CUSTOM_DOMAIN_TENANTS",
    JSON.stringify({ "clay.example": "clay-house" }),
  );
});

afterEach(() => vi.unstubAllEnvs());

describe("cached website editor preview routing", () => {
  it.each([
    ["https://clay-house.shario.io", "GET", "en", "production"],
    ["https://clay-house.shario.io", "HEAD", "cs", "production"],
    ["https://clay.example", "GET", "cs", "production"],
    ["https://clay.example", "HEAD", "en", "production"],
    ["http://clay-house.shario.localhost:3015", "GET", "en", "development"],
  ])(
    "recovers %s %s preview requests through the public %s route",
    (origin, method, locale, environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const response = proxy(
        requestFor(origin, legacyPath.replace("/en/", `/${locale}/`), {
          method,
        }),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `${origin}/${locale}/public-site-preview${query}`,
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(
        response.headers.get("x-middleware-request-x-shario-internal-rewrite"),
      ).toBeNull();

      const destination = new URL(response.headers.get("location"));
      const followed = proxy(
        new NextRequest(destination, {
          method,
          headers: { host: destination.host },
        }),
      );
      expect(followed.status).toBe(200);
      expect(followed.headers.get("x-middleware-rewrite")).toBe(
        `${origin}/${locale}/tenants/clay-house/public-site-preview${query}`,
      );
    },
  );

  it.each(routing.locales)("preserves the supported %s locale", (locale) => {
    const response = proxy(
      requestFor(
        "https://clay-house.shario.io",
        legacyPath.replace("/en/", `/${locale}/`),
      ),
    );
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")).pathname).toBe(
      `/${locale}/public-site-preview`,
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "does not redirect %s requests",
    async (method) => {
      const response = proxy(
        requestFor("https://clay-house.shario.io", legacyPath, { method }),
      );
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each([
    ["https://other-studio.shario.io", legacyPath],
    ["https://clay.example", "/en/tenants/other-studio/public-site-preview"],
    ["https://shario.io", legacyPath],
    ["https://www.shario.io", legacyPath],
    ["https://admin.shario.io", legacyPath],
    ["https://unknown.example", legacyPath],
    ["https://clay-house.shario.io", "/en/tenants/clay-house/app"],
    ["https://clay-house.shario.io", "/en/internal-admin/public-site-preview"],
    ["https://clay-house.shario.io", `${legacyPath}/`],
    ["https://clay-house.shario.io", `${legacyPath}/extra`],
    [
      "https://clay-house.shario.io",
      "/en/tenants/CLAY-HOUSE/public-site-preview",
    ],
    [
      "https://clay-house.shario.io",
      "/en/tenants/clay%2Dhouse/public-site-preview",
    ],
  ])("keeps %s%s blocked", async (origin, pathname) => {
    const response = proxy(requestFor(origin, pathname));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("rejects platform and admin hosts even if a custom-domain mapping names the same tenant", () => {
    vi.stubEnv("PLATFORM_HOSTNAMES", "workspace.example");
    vi.stubEnv(
      "CUSTOM_DOMAIN_TENANTS",
      JSON.stringify({
        "workspace.example": "clay-house",
        "shario.io": "clay-house",
        "admin.shario.io": "clay-house",
      }),
    );

    for (const origin of [
      "https://workspace.example",
      "https://shario.io",
      "https://admin.shario.io",
    ]) {
      const response = proxy(requestFor(origin));
      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("does not add a redirect for unsupported locales", () => {
    const response = proxy(
      requestFor(
        "https://clay-house.shario.io",
        legacyPath.replace("/en/", "/xx/"),
      ),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserves the trusted internal rewrite without a redirect loop", () => {
    const response = proxy(
      requestFor("https://clay-house.shario.io", legacyPath, {
        headers: { "x-shario-internal-rewrite": "1" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
