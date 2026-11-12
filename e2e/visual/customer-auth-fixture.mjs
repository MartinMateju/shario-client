import { createServer } from "node:http";

const port = Number(process.env.CUSTOMER_AUTH_FIXTURE_PORT || 4311);

const corsHeaders = (request) => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-origin": request.headers.origin || "*",
  "cache-control": "no-store",
  vary: "Origin",
});

const sendJson = (request, response, status, payload) => {
  response.writeHead(status, {
    ...corsHeaders(request),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const tenant = {
  id: "64b000000000000000000001",
  name: "Atelier Nami",
  slug: "studio-alpha",
  settings: {
    defaultLanguage: "en",
    publicDefaultLanguage: "en",
    supportedPublicLanguages: ["en", "cs"],
    currency: "CZK",
    timezone: "Europe/Prague",
  },
  publicCapabilities: {
    bookStudio: true,
    courses: true,
    memberships: true,
    help: true,
    registration: true,
  },
  publicSite: {
    branding: {
      displayName: "Atelier Nami",
      logoUrl: "https://visual-assets.example.test/customer-auth-logo.svg",
      coverImageUrl: "https://visual-assets.example.test/public-home-hero.svg",
      accentColor: "#2748D8",
      secondaryColor: "#D9785D",
      backgroundColor: "#F5F1EA",
      textColor: "#22221F",
      stylePreset: "modern-minimal-v1",
      description: {
        cs: "Keramické studio pro klidnou tvorbu.",
        en: "A calm place to make with clay.",
      },
    },
    pages: {},
    header: {
      navOrder: ["book", "courses", "memberships", "help"],
      hiddenItems: [],
      primaryCta: "book",
      announcement: { text: { cs: "", en: "" }, url: "" },
    },
    footer: {
      description: { cs: "", en: "" },
      openingHours: { cs: "", en: "" },
      copyright: { cs: "", en: "" },
      email: "hello@atelier-nami.test",
      phone: "",
      address: "Brno",
      social: {},
      legal: {
        privacy: "https://legal.example.test/privacy",
        studioRules: "https://legal.example.test/studio-rules",
        terms: "https://legal.example.test/terms",
      },
    },
    login: {
      headline: {
        cs: "Vítejte zpět v ateliéru.",
        en: "Welcome back to your studio.",
      },
      supportingText: {
        cs: "Rezervace, výrobky a kredity na jednom klidném místě.",
        en: "Bookings, pottery pieces and credits in one calm place.",
      },
      helpText: {
        cs: "Potřebujete pomoc? Ozvěte se svému studiu.",
        en: "Need a hand? Contact your studio.",
      },
      backgroundImageUrl:
        "https://visual-assets.example.test/customer-auth-hero.svg",
    },
  },
};

const repeatToLength = (value, length) =>
  value.repeat(Math.ceil(length / value.length)).slice(0, length);

const longCopyTenant = {
  ...tenant,
  id: "64b000000000000000000002",
  name: "Atelier Longform",
  slug: "studio-long",
  publicSite: {
    ...tenant.publicSite,
    branding: {
      ...tenant.publicSite.branding,
      displayName: "Atelier Longform",
      coverImageUrl: "",
    },
    login: {
      ...tenant.publicSite.login,
      headline: {
        ...tenant.publicSite.login.headline,
        en: repeatToLength(
          "A welcoming studio account for every maker and every carefully finished piece. ",
          160,
        ),
      },
      supportingText: {
        ...tenant.publicSite.login.supportingText,
        en: repeatToLength(
          "Keep upcoming bookings, pottery pieces, course details and studio credits together in one calm customer space. ",
          800,
        ),
      },
      helpText: {
        ...tenant.publicSite.login.helpText,
        en: repeatToLength(
          "If you need help accessing the account, contact the studio team and they will help you continue safely. ",
          800,
        ),
      },
    },
  },
};

const createPresetTenant = ({ id, slug, name, stylePreset }) => ({
  ...tenant,
  id,
  name,
  slug,
  publicSite: {
    ...tenant.publicSite,
    branding: {
      ...tenant.publicSite.branding,
      displayName: name,
      stylePreset,
    },
  },
});

const presetTenants = {
  "studio-alpha": tenant,
  "studio-long": longCopyTenant,
  "studio-classic": createPresetTenant({
    id: "64b000000000000000000003",
    slug: "studio-classic",
    name: "Atelier Classic",
    stylePreset: "classic-editorial-v1",
  }),
  "studio-warm": createPresetTenant({
    id: "64b000000000000000000004",
    slug: "studio-warm",
    name: "Atelier Warm",
    stylePreset: "warm-organic-v1",
  }),
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  if (pathname === "/ready") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ready");
    return;
  }

  const publicTenantMatch = pathname.match(
    /^\/public\/tenants\/([^/]+)\/config$/,
  );
  const publicTenant = publicTenantMatch
    ? presetTenants[publicTenantMatch[1]]
    : null;

  if (method === "GET" && publicTenant) {
    sendJson(request, response, 200, { tenant: publicTenant });
    return;
  }

  if (method === "GET" && pathname === "/auth/customer/social/providers") {
    sendJson(request, response, 200, { providers: ["google", "apple"] });
    return;
  }

  if (
    method === "GET" &&
    /^\/public\/tenants\/(studio-alpha|studio-long|studio-classic|studio-warm)\/ai\/concierge\/config$/.test(
      pathname,
    )
  ) {
    sendJson(request, response, 200, { config: { enabled: false } });
    return;
  }

  if (
    method === "POST" &&
    ["/auth/refresh", "/auth/customer/refresh"].includes(pathname)
  ) {
    sendJson(request, response, 401, { code: "UNAUTHENTICATED" });
    return;
  }

  sendJson(request, response, 404, {
    code: "NOT_FOUND",
    path: `${method} ${pathname}`,
  });
});

server.listen(port, "0.0.0.0");

const stop = () => server.close(() => process.exit(0));

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
