import { createServer } from "node:http";

import { responseForRequest } from "./admin-fixtures.js";

const port = Number(process.env.PORT || 4311);
const apiOrigin = `http://127.0.0.1:${port}`;
const editorPath = "/tenants/current/settings/public-site";
const previewPath = `${editorPath}/preview`;
const publishPath = `${editorPath}/publish`;
const publicConfigPath = "/public/tenants/studio-alpha/config";

const clone = (value) => JSON.parse(JSON.stringify(value));
const isRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const merge = (current, patch) => {
  if (!isRecord(current) || !isRecord(patch)) return clone(patch);

  return Object.fromEntries(
    [...new Set([...Object.keys(current), ...Object.keys(patch)])].map(
      (key) => [
        key,
        key in patch ? merge(current[key], patch[key]) : clone(current[key]),
      ],
    ),
  );
};

const fixtureUrl = new URL(`${apiOrigin}${editorPath}`);
const baseEditor = responseForRequest({ method: "GET", url: fixtureUrl });
const initialDraft = merge(baseEditor.draft, {
  branding: {
    logoUrl: "/images/workspace/brush-loaded.webp",
    faviconUrl: "/images/workspace/brush-rake.webp",
    coverImageUrl: "/images/workspace/brush-loaded.webp",
  },
  login: {
    headline: { en: "Welcome back", cs: "Vítejte zpět" },
    supportingText: {
      en: "Continue your studio journey.",
      cs: "Pokračujte ve své cestě studiem.",
    },
    helpText: { en: "Need help?", cs: "Potřebujete pomoc?" },
    backgroundImageUrl: "/images/workspace/brush-rake.webp",
  },
  pages: {
    book: {
      title: { en: "Book the studio", cs: "Rezervujte studio" },
      description: {
        en: "Choose an open-studio time.",
        cs: "Vyberte si čas v otevřeném studiu.",
      },
    },
    courses: {
      title: { en: "Courses", cs: "Kurzy" },
      description: {
        en: "Learn something new with us.",
        cs: "Naučte se s námi něco nového.",
      },
    },
    memberships: {
      title: { en: "Memberships", cs: "Členství" },
      description: {
        en: "Make the studio your creative home.",
        cs: "Udělejte si ze studia svůj tvůrčí domov.",
      },
    },
    vouchers: {
      title: { en: "Gift vouchers", cs: "Dárkové poukazy" },
      description: {
        en: "Give someone time to create.",
        cs: "Darujte někomu čas na tvorbu.",
      },
    },
    help: {
      title: { en: "Studio help", cs: "Pomoc studia" },
      description: {
        en: "Find answers before your visit.",
        cs: "Najděte odpovědi před návštěvou.",
      },
    },
  },
  header: {
    navOrder: ["book", "courses", "memberships", "vouchers", "help"],
  },
  footer: {
    description: { en: "Studio footer", cs: "Patička studia" },
    openingHours: { en: "Mon–Sun", cs: "Po–Ne" },
    copyright: { en: "Studio Olivie", cs: "Studio Olivie" },
    social: {
      instagram: "https://instagram.com/studio-olivie",
      facebook: "https://facebook.com/studio-olivie",
      youtube: "https://youtube.com/@studio-olivie",
      website: "https://studio-olivie.example.com/",
    },
    legal: {
      studioRules: "/studio-rules",
      terms: "/terms",
      privacy: "/privacy",
      cancellation: "/cancellation",
    },
  },
});

let draft;
let published;
let draftRevision;
let publishedRevision;
let publicContractMode;
let publicTenantSlug;
let portalLocation;

const reset = () => {
  draft = clone(initialDraft);
  published = clone(initialDraft);
  draftRevision = 8;
  publishedRevision = 8;
  publicContractMode = "valid";
  publicTenantSlug = "studio-alpha";
  portalLocation = "/en/login";
};

reset();

const corsHeaders = (request) => ({
  "access-control-allow-origin":
    request.headers.origin || "http://studio-alpha.shario.localhost:4310",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
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

const sendHtml = (request, response, body) => {
  response.writeHead(200, {
    ...corsHeaders(request),
    "content-type": "text/html; charset=utf-8",
  });
  response.end(body);
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const editor = () => ({
  draftRevision,
  publishedRevision,
  hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published),
  draftUpdatedAt: "2026-08-09T15:00:00.000Z",
  publishedAt: "2026-08-09T14:00:00.000Z",
  publicationStatus: "live",
});

const editorResponse = ({ preview = false } = {}) => ({
  tenant: {
    name: "Studio Olivie",
    slug: "studio-alpha",
    ...(preview
      ? {
          publicCapabilities: {
            bookStudio: true,
            courses: true,
            memberships: true,
            vouchers: true,
            help: true,
            registration: true,
          },
        }
      : {}),
  },
  draft: clone(draft),
  published: clone(published),
  editor: editor(),
  ...(preview
    ? {
        preview: {
          publicationStatus: "live",
          publiclyAvailable: true,
          hasExplicitPublicationState: true,
        },
      }
    : {}),
});

const stateResponse = () => ({
  draft: clone(draft),
  published: clone(published),
  editor: editor(),
  controls: {
    publicContractMode,
    publicTenantSlug,
    portalLocation,
  },
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", apiOrigin);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  if (["/health", "/ready"].includes(pathname)) {
    sendJson(request, response, 200, {
      status: pathname === "/ready" ? "ready" : "ok",
    });
    return;
  }

  if (method === "POST" && pathname === "/__rollout/reset") {
    reset();
    sendJson(request, response, 200, stateResponse());
    return;
  }

  if (method === "GET" && pathname === "/__rollout/state") {
    sendJson(request, response, 200, stateResponse());
    return;
  }

  if (method === "POST" && pathname === "/__rollout/corrupt") {
    const body = await readJson(request);
    published.branding.stylePreset = String(body.stylePreset || "");
    sendJson(request, response, 200, stateResponse());
    return;
  }

  if (method === "POST" && pathname === "/__rollout/control") {
    const body = await readJson(request);
    if (["valid", "malformed"].includes(body.publicContractMode)) {
      publicContractMode = body.publicContractMode;
    }
    if (typeof body.publicTenantSlug === "string") {
      publicTenantSlug = body.publicTenantSlug;
    }
    if (typeof body.portalLocation === "string") {
      portalLocation = body.portalLocation;
    }
    sendJson(request, response, 200, stateResponse());
    return;
  }

  if (method === "GET" && pathname === editorPath) {
    sendJson(request, response, 200, editorResponse());
    return;
  }

  if (method === "GET" && pathname === previewPath) {
    sendJson(request, response, 200, editorResponse({ preview: true }));
    return;
  }

  if (method === "PATCH" && pathname === editorPath) {
    const body = await readJson(request);
    if (body.revision !== draftRevision) {
      sendJson(request, response, 409, {
        code: "PUBLIC_SITE_REVISION_CONFLICT",
        message: "The draft revision is stale.",
      });
      return;
    }

    draft = merge(draft, body.patch || {});
    draftRevision += 1;
    sendJson(request, response, 200, editorResponse());
    return;
  }

  if (method === "POST" && pathname === publishPath) {
    const body = await readJson(request);
    if (body.revision !== draftRevision) {
      sendJson(request, response, 409, {
        code: "PUBLIC_SITE_REVISION_CONFLICT",
        message: "The publish revision is stale.",
      });
      return;
    }

    published = clone(draft);
    publishedRevision = draftRevision;
    sendJson(request, response, 200, editorResponse());
    return;
  }

  if (method === "GET" && pathname === publicConfigPath) {
    if (publicContractMode === "malformed") {
      response.writeHead(200, {
        ...corsHeaders(request),
        "content-type": "application/json; charset=utf-8",
      });
      response.end("{malformed-public-contract");
      return;
    }
    sendJson(request, response, 200, {
      tenant: {
        id: "64a000000000000000000001",
        name: "Studio Olivie",
        slug: publicTenantSlug,
        settings: {
          defaultLanguage: "en",
          currency: "CZK",
          timezone: "Europe/Prague",
        },
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: true,
          vouchers: true,
          help: true,
          registration: true,
        },
        publicSite: clone(published),
      },
    });
    return;
  }

  if (method === "GET" && ["/en", "/en/login"].includes(pathname)) {
    sendHtml(
      request,
      response,
      `<main data-tenant-style="${published.branding.stylePreset}">rollout fixture</main>`,
    );
    return;
  }

  if (method === "GET" && pathname === "/en/portal") {
    response.writeHead(307, {
      ...corsHeaders(request),
      location: portalLocation,
    });
    response.end();
    return;
  }

  if (
    method === "GET" &&
    pathname === "/public/tenants/studio-alpha/ai/concierge/config"
  ) {
    sendJson(request, response, 200, { config: { enabled: false } });
    return;
  }

  if (method === "GET" && pathname === "/auth/customer/social/providers") {
    sendJson(request, response, 200, { providers: ["google", "apple"] });
    return;
  }

  if (method === "POST" && pathname === "/auth/customer/refresh") {
    sendJson(request, response, 401, { code: "UNAUTHENTICATED" });
    return;
  }

  const fixtureResponse = responseForRequest({ method, url });
  if (fixtureResponse !== null) {
    sendJson(request, response, 200, fixtureResponse);
    return;
  }

  sendJson(request, response, 404, {
    code: "NOT_FOUND",
    path: `${method} ${pathname}`,
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `Public-site style rollout fixture ready on ${apiOrigin}\n`,
  );
});

const close = () => server.close(() => process.exit(0));
process.once("SIGINT", close);
process.once("SIGTERM", close);
