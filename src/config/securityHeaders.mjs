export const YOUTUBE_PRIVACY_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export const CONTENT_SECURITY_POLICY = [
  `frame-src 'self' ${YOUTUBE_PRIVACY_EMBED_ORIGIN}`,
].join("; ");

export const buildSecurityHeaderRules = () => [
  {
    source: "/:path*",
    headers: [
      {
        key: "Content-Security-Policy",
        value: CONTENT_SECURITY_POLICY,
      },
    ],
  },
  ...["/team-invitation", "/:locale/team-invitation"].map((source) => ({
    source,
    headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ],
  })),
];
