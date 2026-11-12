import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleI18nRouting: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => mocks.handleI18nRouting,
}));

import { EXPLICIT_LOCALE_COOKIE_NAME } from "@/i18n/localePreference";
import proxy from "@/proxy";

const clearRoutingEnvironment = () => {
  for (const key of [
    "TENANT_ROOT_DOMAIN",
    "NEXT_PUBLIC_ROOT_DOMAIN",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_API_URL",
    "PLATFORM_HOSTNAMES",
    "CUSTOM_DOMAIN_TENANTS",
    "LEGACY_TENANT_SLUGS",
  ]) {
    vi.stubEnv(key, "");
  }
};

const createRequest = (
  pathname,
  { cookie, country = "CZ", host, language } = {},
) => {
  const requestHost = host || "shario.io";
  const headers = {
    host: requestHost,
  };

  if (cookie) headers.cookie = cookie;
  if (country) headers["x-vercel-ip-country"] = country;
  if (language) headers["accept-language"] = language;

  return new NextRequest(`https://${requestHost}${pathname}`, { headers });
};

beforeEach(() => {
  clearRoutingEnvironment();
  vi.stubEnv("NODE_ENV", "production");
  mocks.handleI18nRouting.mockReset();
  mocks.handleI18nRouting.mockImplementation(
    () => new Response(null, { status: 204 }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("platform visitor locale detection", () => {
  it.each([
    ["/?source=homepage", "/cs?source=homepage"],
    ["/pricing?billing=yearly", "/cs/pricing?billing=yearly"],
  ])(
    "uses browser language for a fresh platform visit from %s to %s",
    (requestedPath, expectedPath) => {
      const response = proxy(
        createRequest(requestedPath, { language: "cs-CZ,en;q=0.8" }),
      );
      const location = new URL(response.headers.get("location"));

      expect(response.status).toBe(307);
      expect(`${location.pathname}${location.search}`).toBe(expectedPath);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toBe(
        "Cookie, Accept-Language, x-vercel-ip-country",
      );
      expect(mocks.handleI18nRouting).not.toHaveBeenCalled();
    },
  );

  it("uses English browser preference in Poland despite an automatic locale cookie", () => {
    const response = proxy(
      createRequest("/", {
        cookie: "NEXT_LOCALE=cs",
        language: "en-GB,cs;q=0.5",
        country: "PL",
      }),
    );

    expect(new URL(response.headers.get("location")).pathname).toBe("/en");
    expect(response.headers.get("set-cookie")).toContain(
      "SHARIO_VISITOR_COUNTRY=PL",
    );
    expect(mocks.handleI18nRouting).not.toHaveBeenCalled();
  });

  it("keeps a language selected explicitly by the visitor", () => {
    const response = proxy(
      createRequest("/", {
        cookie: `${EXPLICIT_LOCALE_COOKIE_NAME}=en; NEXT_LOCALE=cs`,
        language: "cs-CZ",
      }),
    );

    expect(new URL(response.headers.get("location")).pathname).toBe("/en");
    expect(mocks.handleI18nRouting).not.toHaveBeenCalled();
  });

  it("keeps an explicitly prefixed English URL in English", () => {
    const response = proxy(createRequest("/en"));

    expect(response.status).toBe(204);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.handleI18nRouting).toHaveBeenCalledOnce();
  });

  it.each(["CZ", "PL", "US", "", "not-a-country"])(
    "delegates country %j to next-intl",
    (country) => {
      const response = proxy(createRequest("/", { country }));

      expect(response.status).toBe(204);
      expect(response.headers.get("location")).toBeNull();
      expect(mocks.handleI18nRouting).toHaveBeenCalledOnce();
    },
  );

  it("makes no country suggestion from an invalid edge hint", () => {
    const response = proxy(createRequest("/en", { country: "not-a-country" }));
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["atelier-klei.shario.io", 200],
    ["admin.shario.io", 204],
    ["customer.example", 404],
  ])("never applies platform geolocation to %s", (host, expectedStatus) => {
    const response = proxy(createRequest("/", { host }));

    expect(response.status).toBe(expectedStatus);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.handleI18nRouting).toHaveBeenCalledTimes(
      host === "atelier-klei.shario.io" ? 0 : 1,
    );
    expect(response.headers.get("set-cookie") || "").not.toContain(
      "SHARIO_VISITOR_COUNTRY",
    );
  });
});

describe("tenant initial language routing", () => {
  it.each([
    "/?source=home",
    "/portal?tab=studio-calendar&location=vaclavska",
    "/login?next=%2Fportal",
  ])(
    "defers %s to tenant settings instead of browser or global cookies",
    (pathname) => {
      const response = proxy(
        createRequest(pathname, {
          host: "atelier-klei.shario.io",
          language: "en-GB",
          cookie: "NEXT_LOCALE=en; SHARIO_LOCALE_PREFERENCE=en",
        }),
      );
      const rewrite = new URL(response.headers.get("x-middleware-rewrite"));
      const requested = new URL(`https://atelier-klei.shario.io${pathname}`);
      expect(response.headers.get("location")).toBeNull();
      expect(rewrite.pathname).toBe(
        `/en/tenants/atelier-klei${requested.pathname === "/" ? "" : requested.pathname}`,
      );
      expect(rewrite.search).toBe(requested.search);
      expect(
        response.headers.get("x-middleware-request-x-shario-public-pathname"),
      ).toBe(requested.pathname);
      expect(mocks.handleI18nRouting).not.toHaveBeenCalled();
    },
  );
  it("supports mapped custom domains", () => {
    vi.stubEnv("CUSTOM_DOMAIN_TENANTS", '{"customer.example":"atelier-klei"}');
    const response = proxy(
      createRequest("/portal", { host: "customer.example" }),
    );
    expect(new URL(response.headers.get("x-middleware-rewrite")).pathname).toBe(
      "/en/tenants/atelier-klei/portal",
    );
  });
  it.each([
    ["/rezervace/ucet", "/portal/account"],
    ["/heslo-reset", "/password/reset"],
    ["/credits/purchase-success", "/portal/credits/purchase-success"],
  ])(
    "keeps legacy %s language-neutral until tenant settings are resolved",
    (path, target) => {
      const response = proxy(
        createRequest(`${path}?source=legacy`, {
          host: "atelier-klei.shario.io",
        }),
      );
      const location = new URL(response.headers.get("location"));
      expect(location.pathname).toBe(target);
      expect(location.search).toBe("?source=legacy");
      expect(response.status).toBe(308);
    },
  );
  it.each(["/app/settings", "/admin", "/onboarding", "/en/portal"])(
    "keeps existing locale handling for %s",
    (path) => {
      proxy(createRequest(path, { host: "atelier-klei.shario.io" }));
      expect(mocks.handleI18nRouting).toHaveBeenCalledOnce();
    },
  );
});
