import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildInternalAdminUrl,
  buildPlatformUrl,
  buildRegisteredTenantOnboardingUrl,
  buildTenantUrl,
  encodeTenantSlugPathSegment,
  getAuthenticatedTenantSlug,
  getTenantHostname,
  getTenantSlugFromHostname,
  getTenantSlugFromWorkspaceInput,
  getTenantSlugParam,
  getValidatedTenantSlugParam,
  isLocalHostname,
  isValidTenantSlug,
  normalizeRootHostname,
  normalizeTenantSlug,
} from "@/utils/tenantRouting";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tenant slug validation", () => {
  it("normalizes valid slugs and rejects reserved or malformed values", () => {
    expect(normalizeTenantSlug(" Studio-Grohova ")).toBe("studio-grohova");
    expect(isValidTenantSlug(" Studio-Grohova ")).toBe(true);
    expect(isValidTenantSlug("admin")).toBe(false);
    expect(isValidTenantSlug("studio.grohova")).toBe(false);
    expect(isValidTenantSlug("-studio")).toBe(false);
    expect(isValidTenantSlug("")).toBe(false);
  });

  it("reads route parameters without using browser or Redux state", () => {
    expect(getTenantSlugParam({ tenantSlug: ["Studio-One", "ignored"] })).toBe(
      "studio-one",
    );
    expect(getTenantSlugParam({ "tenant-slug": "Studio-Two" })).toBe(
      "studio-two",
    );
    expect(getValidatedTenantSlugParam({ tenantSlug: "api" })).toBe("");
    expect(getValidatedTenantSlugParam({ tenantSlug: "valid-studio" })).toBe(
      "valid-studio",
    );
  });

  it("resolves a workspace slug across refresh-response shapes", () => {
    expect(
      getAuthenticatedTenantSlug({
        tenant: { slug: "current-studio" },
        user: { tenantSlug: "user-studio" },
        workspaceAccess: { tenantSlug: "access-studio" },
      }),
    ).toBe("current-studio");
    expect(
      getAuthenticatedTenantSlug({
        tenant: null,
        user: { tenantSlug: " User-Studio " },
        workspaceAccess: { tenantSlug: "access-studio" },
      }),
    ).toBe("user-studio");
    expect(
      getAuthenticatedTenantSlug({
        tenant: {},
        user: {},
        workspaceAccess: {
          membership: { tenant: { slug: "access-studio" } },
        },
      }),
    ).toBe("access-studio");
    expect(
      getAuthenticatedTenantSlug({
        tenant: { slug: "admin" },
        user: { tenantSlug: "../invalid" },
        workspaceAccess: {},
      }),
    ).toBe("");
  });

  it("encodes only validated tenant path segments", () => {
    expect(encodeTenantSlugPathSegment("studio-one")).toBe("studio-one");
    expect(() => encodeTenantSlugPathSegment("admin")).toThrow(TypeError);
    expect(() => encodeTenantSlugPathSegment("studio/one")).toThrow(
      "A valid tenant slug is required.",
    );
  });

  it.each([
    ["shario.localhost:3000", "shario.localhost"],
    ["http://www.shario.localhost:3000/development", "shario.localhost"],
    ["https://www.shario.io:443/path", "shario.io"],
  ])("normalizes root hostname %s to %s", (value, expected) => {
    expect(normalizeRootHostname(value)).toBe(expected);
  });

  it.each([
    "file://shario.io",
    "https://shario.io@evil.example",
    "*.shario.io",
    "127.0.0.1",
    "[::1]",
    "not a host",
  ])("rejects unsafe or unusable root hostname %s", (value) => {
    expect(normalizeRootHostname(value)).toBe("");
  });
});

describe("tenant hostname resolution", () => {
  it.each([
    ["localhost", true],
    ["studio.localhost", true],
    ["127.0.0.1", true],
    ["::1", true],
    ["shario.io", false],
  ])("recognizes local hostname %s", (hostname, expected) => {
    expect(isLocalHostname(hostname)).toBe(expected);
  });

  it("builds tenant hostnames for production and nested localhost roots", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
    expect(
      getTenantHostname({
        slug: "studio-one",
        baseUrl: "https://shario.io",
      }),
    ).toBe("studio-one.shario.io");

    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");
    expect(
      getTenantHostname({
        slug: "studio-one",
        baseUrl: "http://localhost:3000",
      }),
    ).toBe("studio-one.shario.localhost");
    expect(() =>
      getTenantHostname({ slug: "www", baseUrl: "https://shario.io" }),
    ).toThrow(TypeError);
  });

  it.each([
    "shario.localhost:3000",
    "http://shario.localhost:3000",
    "http://www.shario.localhost:3000/development",
  ])(
    "normalizes an explicit root domain configured as %s",
    (configuredRoot) => {
      vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", configuredRoot);

      const result = new URL(
        buildTenantUrl({
          slug: "studio-one",
          locale: "en",
          pathname: "/app",
          baseUrl: "http://shario.localhost:3000/en/login",
        }),
      );

      expect(result.origin).toBe("http://studio-one.shario.localhost:3000");
      expect(result.pathname).toBe("/en/app");
      expect(getTenantSlugFromHostname(result.hostname)).toBe("studio-one");
    },
  );

  it("falls back to the configured site when the explicit root is invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "http://[");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://shario.localhost:3000");

    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "en",
        pathname: "/app",
        baseUrl: "http://shario.localhost:3000/en/login",
      }),
    ).toBe("http://studio-one.shario.localhost:3000/en/app");
  });

  it("infers a same-site local root from the configured API URL", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.shario.localhost:4000");

    expect(
      getTenantHostname({
        slug: "studio-one",
        baseUrl: "http://localhost:3000",
      }),
    ).toBe("studio-one.shario.localhost");
  });

  it("falls back safely when an explicit base URL is malformed", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.shario.io");

    expect(
      getTenantHostname({
        slug: "studio-one",
        baseUrl: "http://[",
      }),
    ).toBe("studio-one.shario.io");
  });

  it("extracts only a direct, non-reserved tenant subdomain", () => {
    expect(getTenantSlugFromHostname("studio-one.shario.io", "shario.io")).toBe(
      "studio-one",
    );
    expect(getTenantSlugFromHostname("studio-one.localhost", "shario.io")).toBe(
      "studio-one",
    );
    expect(getTenantSlugFromHostname("shario.io", "shario.io")).toBeNull();
    expect(
      getTenantSlugFromHostname("admin.shario.io", "shario.io"),
    ).toBeNull();
    expect(
      getTenantSlugFromHostname("nested.studio.shario.io", "shario.io"),
    ).toBeNull();
    expect(
      getTenantSlugFromHostname("unrelated.example", "shario.io"),
    ).toBeNull();
  });

  it.each([
    ["http://kacka-studio.shario.localhost:3000/en/login", "kacka-studio"],
    ["kacka-studio.shario.localhost:3000/en/app", "kacka-studio"],
    ["https://kacka-studio.shario.io/en/login", "kacka-studio"],
    ["http://kacka-studio.localhost:3000/cs/login", "kacka-studio"],
    [" KACKA-STUDIO ", "kacka-studio"],
  ])("normalizes workspace input %j to %j", (input, expected) => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

    expect(getTenantSlugFromWorkspaceInput(input)).toBe(expected);
  });

  it("rejects platform, nested, and malformed workspace inputs", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

    expect(getTenantSlugFromWorkspaceInput("shario.localhost")).toBe("");
    expect(getTenantSlugFromWorkspaceInput("admin.shario.io")).toBe("");
    expect(
      getTenantSlugFromWorkspaceInput(
        "https://nested.kacka-studio.shario.io/login",
      ),
    ).toBe("");
    expect(getTenantSlugFromWorkspaceInput("not a workspace")).toBe("");
  });
});

describe("cross-origin route builders", () => {
  it.each(["/app", "/app/setup"])(
    "hands the platform route %s off to the tenant origin",
    (pathname) => {
      vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

      expect(
        buildTenantUrl({
          slug: "the-pottery-house",
          locale: "en",
          pathname,
          baseUrl: "http://shario.localhost:3000/en",
        }),
      ).toBe(`http://the-pottery-house.shario.localhost:3000/en${pathname}`);
    },
  );

  it("preserves protocol, port, query, and hash for tenant routes", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "cs",
        pathname: "/app/bookings?action=create#details",
        baseUrl: "http://localhost:3000",
      }),
    ).toBe(
      "http://studio-one.localhost:3000/cs/app/bookings?action=create#details",
    );
  });

  it("canonicalizes Wave 2 preview locale aliases in cross-origin URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

    expect(
      buildTenantUrl({
        slug: "the-pottery-house",
        locale: "pt_PT",
        pathname: "/app",
        baseUrl: "http://shario.localhost:3000/en",
      }),
    ).toBe("http://the-pottery-house.shario.localhost:3000/pt-PT/app");
    expect(
      buildPlatformUrl({
        locale: "fr-FR",
        pathname: "/login",
        baseUrl: "http://the-pottery-house.shario.localhost:3000/en",
      }),
    ).toBe("http://shario.localhost:3000/fr/login");
    expect(
      buildTenantUrl({
        slug: "the-pottery-house",
        locale: "no-NO",
        pathname: "/portal",
        baseUrl: "http://shario.localhost:3000/en",
      }),
    ).toBe("http://the-pottery-house.shario.localhost:3000/nb/portal");
  });

  it("sends a newly registered owner directly to tenant onboarding", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

    expect(
      buildRegisteredTenantOnboardingUrl({
        tenant: { slug: "created-studio" },
        requestedSlug: "ignored-studio",
        locale: "cs",
        baseUrl: "http://shario.localhost:3000",
      }),
    ).toBe("http://created-studio.shario.localhost:3000/cs/app/onboarding");

    expect(
      buildRegisteredTenantOnboardingUrl({
        tenant: {},
        requestedSlug: "fallback-studio",
        locale: "en",
        baseUrl: "http://shario.localhost:3000",
      }),
    ).toBe("http://fallback-studio.shario.localhost:3000/en/app/onboarding");
  });

  it("rejects a registration response without a safe tenant slug", () => {
    expect(() =>
      buildRegisteredTenantOnboardingUrl({
        tenant: { slug: "admin" },
        requestedSlug: "../invalid",
        locale: "en",
        baseUrl: "http://shario.localhost:3000",
      }),
    ).toThrow("Tenant registration did not return a valid workspace slug.");
  });

  it("builds platform and internal-admin routes from the same root", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
    expect(
      buildPlatformUrl({
        locale: "en",
        pathname: "/login",
        baseUrl: "https://studio-one.shario.io",
      }),
    ).toBe("https://shario.io/en/login");
    expect(
      buildInternalAdminUrl({
        locale: "cs",
        pathname: "/",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://admin.shario.io/cs");
  });

  it("uses canonical rollout locales and a safe invalid-locale fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "../cs",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/en/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "el-GR",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/el/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "tr_TR",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/tr/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "hu-HU",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/hu/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "sv-SE",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/sv/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "nl_NL",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/nl/portal");
    expect(
      buildTenantUrl({
        slug: "studio-one",
        locale: "ro_RO",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://studio-one.shario.io/ro/portal");
  });

  it("keeps the active local protocol and port when baseUrl is omitted", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");
    const result = new URL(
      buildTenantUrl({
        slug: "studio-one",
        locale: "en",
        pathname: "/bookings",
      }),
    );

    expect(result.protocol).toBe(window.location.protocol);
    expect(result.port).toBe(window.location.port);
    expect(result.hostname).toBe("studio-one.shario.localhost");
    expect(result.pathname).toBe("/en/bookings");
  });

  it("uses the configured platform URL outside a browser", () => {
    const browserWindow = globalThis.window;
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.shario.io");
    vi.stubGlobal("window", undefined);

    try {
      expect(buildPlatformUrl({ locale: "en", pathname: "/login" })).toBe(
        "https://shario.io/en/login",
      );
    } finally {
      vi.stubGlobal("window", browserWindow);
    }
  });

  it("uses the configured platform URL when browser location is invalid", () => {
    const browserWindow = globalThis.window;
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.shario.io");
    vi.stubGlobal("window", { location: { href: "http://[" } });

    try {
      expect(buildPlatformUrl({ locale: "en", pathname: "/login" })).toBe(
        "https://shario.io/en/login",
      );
    } finally {
      vi.stubGlobal("window", browserWindow);
    }
  });
});
