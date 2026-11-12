import nextConfig from "../../next.config.mjs";
import {
  buildSecurityHeaderRules,
  CONTENT_SECURITY_POLICY,
  YOUTUBE_PRIVACY_EMBED_ORIGIN,
} from "../../src/config/securityHeaders.mjs";

const findContentSecurityPolicy = (rules) =>
  rules
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value;

describe("security headers", () => {
  it("allows only the privacy-enhanced YouTube origin for framed media", () => {
    expect(CONTENT_SECURITY_POLICY).toBe(
      `frame-src 'self' ${YOUTUBE_PRIVACY_EMBED_ORIGIN}`,
    );
    expect(CONTENT_SECURITY_POLICY).not.toContain("https://www.youtube.com");
    expect(CONTENT_SECURITY_POLICY).not.toContain("*.youtube.com");
    expect(CONTENT_SECURITY_POLICY).not.toContain("*;");
  });

  it("returns a fresh, site-wide Next.js header rule", () => {
    const firstRules = buildSecurityHeaderRules();
    const secondRules = buildSecurityHeaderRules();

    expect(firstRules[0]).toEqual({
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: CONTENT_SECURITY_POLICY,
        },
      ],
    });
    expect(firstRules).not.toBe(secondRules);
    expect(firstRules[0].headers).not.toBe(secondRules[0].headers);
  });

  it("does not expose invitation links through referrers or search indexing", () => {
    const rules = buildSecurityHeaderRules();
    for (const source of ["/team-invitation", "/:locale/team-invitation"]) {
      expect(rules.find((rule) => rule.source === source)?.headers).toEqual([
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ]);
    }
  });

  it("allows the YouTube thumbnail host used by public video cards", () => {
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      protocol: "https",
      hostname: "i.ytimg.com",
      pathname: "/vi/**",
    });
  });

  it("is wired into the exported Next.js configuration", async () => {
    const rules = await nextConfig.headers();

    expect(findContentSecurityPolicy(rules)).toBe(CONTENT_SECURITY_POLICY);
  });
});
