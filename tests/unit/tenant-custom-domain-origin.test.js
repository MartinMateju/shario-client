import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import {
  buildTenantUrl,
  normalizeTenantPublicOrigin,
} from "@/utils/tenantRouting";
import {
  getTenantPublicCanonicalOrigin,
  getPublicTenantOriginRedirect,
} from "@/lib/publicTenant/seo";

const origin = "https://booking.commonground.example";
const tenant = { slug: "common-ground", publicOrigin: origin };
const site = {
  kind: "tenant",
  tenantSlug: tenant.slug,
  origin: "https://common-ground.shario.io",
};
const configuration = {
  rootDomain: "shario.io",
  nodeEnv: "production",
  customDomainTenants: JSON.stringify({
    "booking.commonground.example": "common-ground",
    "another-studio.example": "another-studio",
  }),
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("tenant public origin", () => {
  it("preserves the API-provided origin through public config normalization", () => {
    expect(normalizePublicTenant({ tenant }).publicOrigin).toBe(origin);
    expect(
      normalizePublicTenant({
        tenant: { ...tenant, publicOrigin: "javascript:alert(1)" },
      }).publicOrigin,
    ).toBe("");
  });

  it.each([
    "https://user:pass@booking.commonground.example",
    "https://booking.commonground.example/courses",
    "https://booking.commonground.example/?target=other",
    "https://booking.commonground.example/#other",
    "https://booking.commonground.example\\@evil.example",
    "http://booking.commonground.example",
    "https://127.0.0.1",
    "https://localhost",
    "https://booking.commonground.example:444",
    "//booking.commonground.example",
  ])("rejects unsafe production origin %s", (value) => {
    vi.stubEnv("NODE_ENV", "production");
    expect(normalizeTenantPublicOrigin(value)).toBe("");
  });

  it("builds branded customer links while preserving query parameters", () => {
    expect(
      buildTenantUrl({
        slug: tenant.slug,
        tenant,
        locale: "cs",
        pathname: "/courses/course-1?location=vaclavska#dates",
      }),
    ).toBe(`${origin}/cs/courses/course-1?location=vaclavska#dates`);
  });

  it("never borrows a different tenant's origin or moves workspace login", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
    expect(
      buildTenantUrl({
        slug: "another-studio",
        tenant,
        locale: "cs",
        pathname: "/portal",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://another-studio.shario.io/cs/portal");
    expect(
      buildTenantUrl({
        slug: tenant.slug,
        tenant,
        locale: "cs",
        pathname: "/app",
        baseUrl: "https://shario.io",
      }),
    ).toBe("https://common-ground.shario.io/cs/app");
  });

  it.each([
    "/portal",
    "/memberships/checkout/success",
    "/vouchers/success",
    "/courses?session_id=checkout-return",
    "/courses?token=private-token",
  ])(
    "keeps %s on the session origin rather than moving a platform login",
    (pathname) => {
      vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
      expect(
        buildTenantUrl({
          slug: tenant.slug,
          tenant,
          locale: "cs",
          pathname,
          baseUrl: "https://shario.io",
        }),
      ).toBe(`https://common-ground.shario.io/cs${pathname}`);
      expect(
        buildTenantUrl({
          slug: tenant.slug,
          tenant,
          locale: "cs",
          pathname,
          baseUrl: origin,
        }),
      ).toBe(`${origin}/cs${pathname}`);
    },
  );

  it("uses the actual browser origin for a signed-in custom-domain portal link", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shario.io");
    vi.stubGlobal("window", { location: { href: `${origin}/cs/courses` } });
    expect(
      buildTenantUrl({
        slug: tenant.slug,
        tenant,
        locale: "cs",
        pathname: "/portal",
      }),
    ).toBe(`${origin}/cs/portal`);
  });
});

describe("custom-domain canonical rollout", () => {
  it("uses the primary origin only after the matching host mapping is deployed", () => {
    expect(getTenantPublicCanonicalOrigin(tenant, site, configuration)).toBe(
      origin,
    );
    expect(
      getTenantPublicCanonicalOrigin(tenant, site, {
        ...configuration,
        customDomainTenants: "{}",
      }),
    ).toBe(site.origin);
    expect(
      getTenantPublicCanonicalOrigin(
        { ...tenant, publicOrigin: "https://another-studio.example" },
        site,
        configuration,
      ),
    ).toBe(site.origin);
    expect(
      getTenantPublicCanonicalOrigin(
        { ...tenant, slug: "another-studio" },
        site,
        configuration,
      ),
    ).toBe(site.origin);
  });

  it("preserves public course paths and filters when moving old public links", () => {
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site,
        pathname: "/cs/courses/course-1",
        search: "?location=vaclavska",
        ...configuration,
      }),
    ).toBe(`${origin}/cs/courses/course-1?location=vaclavska`);
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site,
        pathname: "/courses",
        ...configuration,
      }),
    ).toBe(`${origin}/courses`);
  });

  it.each(["/cs", "/en", "/cs/", "/en/"])(
    "moves the localized homepage %s with its public query intact",
    (pathname) => {
      expect(
        getPublicTenantOriginRedirect({
          tenant,
          site,
          pathname,
          search: "?utm_source=website",
          ...configuration,
        }),
      ).toBe(`${origin}${pathname}?utm_source=website`);
    },
  );

  it("keeps localized homepages with private query parameters on their current origin", () => {
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site,
        pathname: "/cs",
        search: "?session_id=checkout-return",
        ...configuration,
      }),
    ).toBe("");
  });

  it("does not redirect a localized homepage already on the primary origin", () => {
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site: { ...site, origin },
        pathname: "/cs",
        ...configuration,
      }),
    ).toBe("");
  });

  it.each([
    "/cs/app",
    "/cs/portal",
    "/cs/login",
    "/cs/checkout/success",
    "/cs/memberships/checkout/success",
    "/cs/memberships/checkout/cancel",
    "/cs/vouchers/success",
    "/cs/vouchers/cancel",
    "/cs/kurzy-keramiky-brno/success",
    "/cs/kurzy-keramiky-brno/cancel",
    "/cs/waitlists/offer",
    "/cs/public-site-preview",
    "//evil.example",
    "/\\evil.example",
    "/cs/courses\n",
  ])(
    "does not redirect private, token-bearing or unsafe path %s",
    (pathname) => {
      expect(
        getPublicTenantOriginRedirect({
          tenant,
          site,
          pathname,
          ...configuration,
        }),
      ).toBe("");
    },
  );

  it("does not loop or redirect before both rollout conditions are met", () => {
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site: { ...site, origin },
        pathname: "/cs/courses",
        ...configuration,
      }),
    ).toBe("");
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site,
        pathname: "/cs/courses",
        ...configuration,
        customDomainTenants: "{}",
      }),
    ).toBe("");
    expect(
      getPublicTenantOriginRedirect({
        tenant: { slug: tenant.slug },
        site,
        pathname: "/cs/courses",
        ...configuration,
      }),
    ).toBe("");
  });

  it.each([
    "?guestToken=secret",
    "?session_id=cs_123",
    "?orderId=order-1",
    "?next=%2Fcheckout",
    "?sessionHandoff=secret",
  ])("preserves the original host for non-public query %s", (search) => {
    expect(
      getPublicTenantOriginRedirect({
        tenant,
        site,
        pathname: "/cs/courses",
        search,
        ...configuration,
      }),
    ).toBe("");
  });
});
