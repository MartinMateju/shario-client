import createNextIntlPlugin from "next-intl/plugin";

import { buildSecurityHeaderRules } from "./src/config/securityHeaders.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "shario.localhost",
    "*.shario.localhost",
    "*.localhost",
    "studio-alpha.test",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.shario.io",
        pathname: "/media/public/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
  turbopack: {},
  async headers() {
    return buildSecurityHeaderRules();
  },
};

export default withNextIntl(nextConfig);
