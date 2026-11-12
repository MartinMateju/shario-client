import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicTenantConfig: vi.fn(),
}));

vi.mock("@/lib/publicTenant/server", () => ({
  getPublicTenantConfig: mocks.getPublicTenantConfig,
}));

import { GET as getRobots } from "@/app/robots.txt/route";
import { GET as getSitemap } from "@/app/sitemap.xml/route";

const request = (pathname, host = "studio-olivka.shario.io") => ({
  url: `https://127.0.0.1${pathname}`,
  headers: new Headers({
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": "https",
  }),
});

describe("tenant-aware SEO routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TENANT_ROOT_DOMAIN", "shario.io");
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
    vi.stubEnv("PLATFORM_HOSTNAMES", "");
    vi.stubEnv("CUSTOM_DOMAIN_TENANTS", "{}");
  });

  it("publishes only capability-backed tenant URLs", async () => {
    mocks.getPublicTenantConfig.mockResolvedValueOnce({
      tenant: {
        slug: "studio-olivka",
        settings: {
          publicDefaultLanguage: "en",
          supportedPublicLanguages: ["en", "cs"],
        },
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: false,
          vouchers: true,
          help: false,
        },
      },
      notFound: false,
      unavailable: false,
    });

    const response = await getSitemap(request("/sitemap.xml"));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(mocks.getPublicTenantConfig).toHaveBeenCalledWith("studio-olivka");
    expect(xml).toContain("https://studio-olivka.shario.io/en");
    expect(xml).toContain("https://studio-olivka.shario.io/cs/book");
    expect(xml).toContain("https://studio-olivka.shario.io/en/courses");
    expect(xml).toContain("https://studio-olivka.shario.io/en/vouchers");
    expect(xml).not.toContain("/memberships");
    expect(xml).not.toContain("/help");
    expect(xml).not.toContain("studio-grohova");
  });

  it("removes hidden pages from every locale while preserving visible pages", async () => {
    mocks.getPublicTenantConfig.mockResolvedValueOnce({
      tenant: {
        slug: "studio-olivka",
        settings: {
          publicDefaultLanguage: "en",
          supportedPublicLanguages: ["en", "cs"],
        },
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: true,
          vouchers: true,
          help: true,
        },
        publicSite: {
          pages: {
            book: { visible: false },
            courses: { visible: false },
            memberships: { visible: false },
            vouchers: { visible: true },
            help: { visible: false },
          },
        },
      },
      notFound: false,
      unavailable: false,
    });

    const response = await getSitemap(request("/sitemap.xml"));
    const xml = await response.text();

    expect(response.status).toBe(200);
    for (const locale of ["en", "cs"]) {
      expect(xml).toContain(`https://studio-olivka.shario.io/${locale}</loc>`);
      expect(xml).toContain(
        `https://studio-olivka.shario.io/${locale}/vouchers</loc>`,
      );
      for (const page of ["book", "courses", "memberships", "help"]) {
        expect(xml).not.toContain(`/${locale}/${page}`);
      }
    }
  });

  it("returns an empty sitemap and no-index robots for unpublished tenants", async () => {
    mocks.getPublicTenantConfig
      .mockResolvedValueOnce({
        tenant: null,
        notFound: true,
        unavailable: false,
      })
      .mockResolvedValueOnce({
        tenant: null,
        notFound: true,
        unavailable: false,
      });

    const sitemapResponse = await getSitemap(request("/sitemap.xml"));
    const robotsResponse = await getRobots(request("/robots.txt"));

    expect(sitemapResponse.status).toBe(404);
    expect(await sitemapResponse.text()).not.toContain("<url>");
    expect(robotsResponse.status).toBe(404);
    expect(await robotsResponse.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("never reflects an unconfigured hostname", async () => {
    const sitemapResponse = await getSitemap(
      request("/sitemap.xml", "attacker.example"),
    );
    const robotsResponse = await getRobots(
      request("/robots.txt", "attacker.example"),
    );

    expect(sitemapResponse.status).toBe(404);
    expect(await sitemapResponse.text()).not.toContain("attacker.example");
    expect(robotsResponse.status).toBe(404);
    expect(await robotsResponse.text()).toBe("User-agent: *\nDisallow: /\n");
    expect(mocks.getPublicTenantConfig).not.toHaveBeenCalled();
  });
});
