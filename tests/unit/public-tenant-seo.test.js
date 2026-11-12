import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPublicRobotsText,
  buildPublicSitemapXml,
  getTenantPublicSeoPaths,
  normalizePublicSeoLocaleCodes,
  resolvePublicSeoSite,
} from "@/lib/publicTenant/seo";

const config = {
  nodeEnv: "production",
  rootDomain: "shario.io",
  platformHostnames: "",
  customDomainTenants: JSON.stringify({
    "olivka.example": "studio-olivka",
  }),
};

describe("public tenant SEO host isolation", () => {
  it("uses host-aware route handlers instead of shared static files", () => {
    const projectPath = (...segments) => path.join(process.cwd(), ...segments);
    const sitemapRoute = fs.readFileSync(
      projectPath("src", "app", "sitemap.xml", "route.js"),
      "utf8",
    );
    const robotsRoute = fs.readFileSync(
      projectPath("src", "app", "robots.txt", "route.js"),
      "utf8",
    );

    expect(fs.existsSync(projectPath("public", "sitemap.xml"))).toBe(false);
    expect(fs.existsSync(projectPath("public", "robots.txt"))).toBe(false);

    for (const source of [sitemapRoute, robotsRoute]) {
      expect(source).toContain("resolvePublicSeoSite");
      expect(source).toContain("getPublicTenantConfig");
      expect(source).not.toContain("studiogrohova");
      expect(source).not.toContain("studio-grohova");
    }
    expect(sitemapRoute).toContain("getPublicTenantLocaleCodes");
  });

  it("resolves only direct, validated tenant subdomains", () => {
    expect(
      resolvePublicSeoSite({
        ...config,
        requestUrl: "https://127.0.0.1/sitemap.xml",
        forwardedHost: "studio-olivka.shario.io",
        forwardedProto: "https",
      }),
    ).toEqual({
      kind: "tenant",
      origin: "https://studio-olivka.shario.io",
      tenantSlug: "studio-olivka",
    });

    for (const forwardedHost of [
      "nested.studio-olivka.shario.io",
      "api.shario.io",
      "attacker.example",
      "studio-olivka.shario.io:444",
    ]) {
      expect(
        resolvePublicSeoSite({
          ...config,
          requestUrl: "https://127.0.0.1/sitemap.xml",
          forwardedHost,
          forwardedProto: "https",
        }).kind,
      ).not.toBe("tenant");
    }
  });

  it("maps only explicitly configured custom domains", () => {
    expect(
      resolvePublicSeoSite({
        ...config,
        requestUrl: "https://127.0.0.1/robots.txt",
        host: "olivka.example",
      }),
    ).toEqual({
      kind: "tenant",
      origin: "https://olivka.example",
      tenantSlug: "studio-olivka",
    });
    expect(
      resolvePublicSeoSite({
        ...config,
        requestUrl: "https://127.0.0.1/robots.txt",
        host: "unconfigured.example",
      }),
    ).toEqual({
      kind: "unknown",
      origin: "",
      tenantSlug: "",
    });
  });

  it("lists only the tenant root and enabled public capabilities", () => {
    expect(
      getTenantPublicSeoPaths({
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: false,
          vouchers: true,
          help: true,
          registration: true,
        },
      }),
    ).toEqual(["/", "/book", "/courses", "/vouchers", "/help"]);
  });

  it("never emits another tenant's URL or private customer surfaces", () => {
    const xml = buildPublicSitemapXml({
      origin: "https://studio-olivka.shario.io",
      locales: ["en", "cs"],
      paths: [
        "/",
        "/book",
        "/courses",
        "/memberships",
        "/vouchers",
        "/help",
        "/login",
        "/portal",
        "/checkout/success",
        "/app",
      ],
    });

    expect(xml).toContain("<loc>https://studio-olivka.shario.io/en</loc>");
    expect(xml).toContain("<loc>https://studio-olivka.shario.io/cs/help</loc>");
    expect(xml).toContain(
      "<loc>https://studio-olivka.shario.io/en/vouchers</loc>",
    );
    expect(xml).not.toContain("studiogrohova");
    expect(xml).not.toContain("studio-grohova");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/portal");
    expect(xml).not.toContain("/checkout");
    expect(xml).not.toContain("/app");
  });

  it("keeps preview locales out of sitemaps and preserves canonical URL tags", () => {
    const xml = buildPublicSitemapXml({
      origin: "https://shario.io",
      locales: [
        "en",
        "cs",
        "fr-FR",
        "pt_PT",
        "sv-SE",
        "no-NO",
        "nn-NO",
        "fi-FI",
        "hu-HU",
        "el-GR",
        "tr-TR",
        "nl-NL",
        "ro-RO",
        "pt-BR",
      ],
      paths: ["/"],
    });

    expect(xml).toContain("<loc>https://shario.io/en</loc>");
    expect(xml).toContain("<loc>https://shario.io/cs</loc>");
    expect(xml).toContain("<loc>https://shario.io/nl</loc>");
    expect(xml).not.toContain("/fr");
    expect(xml).not.toContain("/pt-PT");
    expect(xml).not.toContain("/pt-pt");
    expect(xml).not.toContain("/sv");
    expect(xml).not.toContain("/nb");
    expect(xml).not.toContain("/no/");
    expect(xml).not.toContain("/nn/");
    expect(xml).not.toContain("/fi");
    expect(xml).not.toContain("/hu");
    expect(xml).not.toContain("/el");
    expect(xml).not.toContain("/tr");
    expect(xml).not.toContain("/ro");
    expect(
      normalizePublicSeoLocaleCodes([
        "fr-FR",
        "pt_PT",
        "pt-pt",
        "sv-SE",
        "no-NO",
        "nn-NO",
        "fi-FI",
        "hu-HU",
        "el-GR",
        "tr-TR",
        "nl-NL",
        "ro-RO",
        "pt-BR",
      ]),
    ).toEqual(["fr", "pt-PT", "sv", "nb", "fi", "hu", "el", "tr", "nl", "ro"]);

    const robots = buildPublicRobotsText({
      origin: "https://shario.io",
      locales: [
        "pt_PT",
        "sv-SE",
        "no-NO",
        "nn-NO",
        "fi-FI",
        "hu-HU",
        "el-GR",
        "tr-TR",
        "nl-NL",
        "ro-RO",
      ],
      indexable: true,
    });

    expect(robots).toContain("Disallow: /pt-PT/app");
    expect(robots).not.toContain("/pt-pt/");
    expect(robots).toContain("Disallow: /sv/app");
    expect(robots).toContain("Disallow: /nb/app");
    expect(robots).not.toContain("/no/");
    expect(robots).not.toContain("/nn/");
    expect(robots).toContain("Disallow: /fi/app");
    expect(robots).toContain("Disallow: /hu/app");
    expect(robots).toContain("Disallow: /el/app");
    expect(robots).toContain("Disallow: /tr/app");
    expect(robots).toContain("Disallow: /nl/app");
    expect(robots).toContain("Disallow: /ro/app");
  });

  it("disallows auth, workspace, portal and checkout paths", () => {
    const robots = buildPublicRobotsText({
      origin: "https://studio-olivka.shario.io",
      locales: ["en", "cs"],
      indexable: true,
    });

    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /en/app");
    expect(robots).toContain("Disallow: /cs/portal");
    expect(robots).toContain("Disallow: /en/login");
    expect(robots).toContain("Disallow: /cs/memberships/checkout");
    expect(robots).toContain(
      "Sitemap: https://studio-olivka.shario.io/sitemap.xml",
    );
    expect(robots).not.toContain("studio-grohova");
  });

  it("fails closed when a tenant is not indexable", () => {
    expect(
      buildPublicRobotsText({
        origin: "https://draft.shario.io",
        indexable: false,
      }),
    ).toBe("User-agent: *\nDisallow: /\n");
  });
});
