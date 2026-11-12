import fs from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Launch Center workflow routing", () => {
  it("rewrites the nested localhost URL to the tenant Modules route without local env configuration", () => {
    clearRoutingEnvironment();
    vi.stubEnv("NODE_ENV", "development");

    const request = new NextRequest(
      "http://studio-kacka.shario.localhost:3000/en/app/settings/modules?from=launch-center",
      {
        headers: {
          host: "studio-kacka.shario.localhost:3000",
        },
      },
    );

    const response = proxy(request);
    const rewrite = response.headers.get("x-middleware-rewrite");

    expect(response.status).toBe(200);
    expect(rewrite).toBeTruthy();
    expect(
      response.headers.get("x-middleware-request-x-shario-internal-rewrite"),
    ).toBe("1");
    expect(
      response.headers.get("x-middleware-request-x-shario-public-pathname"),
    ).toBe("/en/app/settings/modules");
    expect(
      response.headers.get("x-middleware-request-x-shario-public-search"),
    ).toBe("?from=launch-center");

    const rewrittenUrl = new URL(rewrite);

    expect(rewrittenUrl.pathname).toBe(
      "/en/tenants/studio-kacka/app/settings/modules",
    );
    expect(rewrittenUrl.search).toBe("?from=launch-center");

    const unmarkedInternalResponse = proxy(
      new NextRequest(rewrittenUrl, {
        headers: { host: "studio-kacka.shario.localhost:3000" },
      }),
    );
    const markedInternalResponse = proxy(
      new NextRequest(rewrittenUrl, {
        headers: {
          host: "studio-kacka.shario.localhost:3000",
          "x-shario-internal-rewrite": "1",
        },
      }),
    );

    expect(unmarkedInternalResponse.status).toBe(404);
    expect(markedInternalResponse.status).toBe(200);
  });

  it("keeps the production fallback on shario.io", () => {
    clearRoutingEnvironment();
    vi.stubEnv("NODE_ENV", "production");

    const productionResponse = proxy(
      new NextRequest(
        "https://studio-kacka.shario.io/en/app/settings/modules?from=launch-center",
        { headers: { host: "studio-kacka.shario.io" } },
      ),
    );
    const localResponse = proxy(
      new NextRequest(
        "http://studio-kacka.shario.localhost:3000/en/app/settings/modules?from=launch-center",
        { headers: { host: "studio-kacka.shario.localhost:3000" } },
      ),
    );

    expect(
      new URL(productionResponse.headers.get("x-middleware-rewrite")).pathname,
    ).toBe("/en/tenants/studio-kacka/app/settings/modules");
    expect(localResponse.status).toBe(404);
    expect(localResponse.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("keeps a concrete App Router owner for the rewritten destination", () => {
    const route = path.join(
      process.cwd(),
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "app",
      "(workspace)",
      "settings",
      "modules",
      "page.js",
    );

    expect(fs.existsSync(route)).toBe(true);
  });
});
