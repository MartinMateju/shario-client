const PRESET_IDS = new Set([
  "classic-editorial-v1",
  "modern-minimal-v1",
  "warm-organic-v1",
]);
const SAFE_COLOR = /^#[0-9A-F]{6}$/i;
const phase = String(
  process.env.SHARIO_ROLLOUT_PHASE || "backend",
).toLowerCase();
const apiUrl = String(process.env.SHARIO_ROLLOUT_API_URL || "").replace(
  /\/$/,
  "",
);
const siteUrl = String(process.env.SHARIO_ROLLOUT_SITE_URL || "").replace(
  /\/$/,
  "",
);
const tenantSlug = String(process.env.SHARIO_ROLLOUT_TENANT_SLUG || "").trim();
const locale = String(process.env.SHARIO_ROLLOUT_LOCALE || "en").trim();
const expectedPresetId = String(
  process.env.SHARIO_ROLLOUT_EXPECTED_PRESET || "",
).trim();
const expectedPaletteJson = String(
  process.env.SHARIO_ROLLOUT_EXPECTED_PALETTE || "",
).trim();
let expectedPaletteInput = {};
if (expectedPaletteJson) {
  try {
    expectedPaletteInput = JSON.parse(expectedPaletteJson);
  } catch {
    throw new Error(
      "SHARIO_ROLLOUT_EXPECTED_PALETTE must be valid JSON when provided.",
    );
  }
  if (
    !expectedPaletteInput ||
    typeof expectedPaletteInput !== "object" ||
    Array.isArray(expectedPaletteInput)
  ) {
    throw new Error("SHARIO_ROLLOUT_EXPECTED_PALETTE must be a JSON object.");
  }
}
const expectedPalette = {
  accentColor: String(
    process.env.SHARIO_ROLLOUT_EXPECTED_ACCENT_COLOR ||
      expectedPaletteInput.accentColor ||
      "",
  ).trim(),
  secondaryColor: String(
    process.env.SHARIO_ROLLOUT_EXPECTED_SECONDARY_COLOR ||
      expectedPaletteInput.secondaryColor ||
      "",
  ).trim(),
  backgroundColor: String(
    process.env.SHARIO_ROLLOUT_EXPECTED_BACKGROUND_COLOR ||
      expectedPaletteInput.backgroundColor ||
      "",
  ).trim(),
  textColor: String(
    process.env.SHARIO_ROLLOUT_EXPECTED_TEXT_COLOR ||
      expectedPaletteInput.textColor ||
      "",
  ).trim(),
};

if (!["backend", "frontend"].includes(phase)) {
  throw new Error("SHARIO_ROLLOUT_PHASE must be backend or frontend.");
}
if (!apiUrl || !tenantSlug) {
  throw new Error(
    "SHARIO_ROLLOUT_API_URL and SHARIO_ROLLOUT_TENANT_SLUG are required.",
  );
}
if (phase === "frontend" && !siteUrl) {
  throw new Error(
    "SHARIO_ROLLOUT_SITE_URL is required for frontend verification.",
  );
}
if (phase === "frontend") {
  let parsedSiteUrl;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    throw new Error("SHARIO_ROLLOUT_SITE_URL must be a valid absolute URL.");
  }
  const hostname = parsedSiteUrl.hostname.toLowerCase();
  if (
    (hostname === "shario.io" || hostname.endsWith(".shario.io")) &&
    hostname !== `${tenantSlug.toLowerCase()}.shario.io`
  ) {
    throw new Error(
      `SHARIO_ROLLOUT_SITE_URL targets ${hostname}; expected ${tenantSlug}.shario.io or an explicit custom domain.`,
    );
  }
}
if (!PRESET_IDS.has(expectedPresetId)) {
  throw new Error(
    "SHARIO_ROLLOUT_EXPECTED_PRESET must be one of the three stable preset IDs.",
  );
}
for (const [key, value] of Object.entries(expectedPalette)) {
  if (!SAFE_COLOR.test(value)) {
    throw new Error(
      `SHARIO_ROLLOUT_EXPECTED_${key.replace(/Color$/, "_COLOR").toUpperCase()} must use #RRGGBB.`,
    );
  }
}

const request = async (url, { redirect = "follow" } = {}) => {
  const response = await fetch(url, {
    headers: { accept: "application/json,text/html;q=0.9" },
    redirect,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  return { response, text };
};

const requireStatus = ({ response, text }, expected, label) => {
  if (!expected.includes(response.status)) {
    throw new Error(
      `${label} returned ${response.status}; expected ${expected.join(" or ")}. ` +
        text.slice(0, 240),
    );
  }
};

const health = await request(`${apiUrl}/health`);
requireStatus(health, [200], "Backend health");
const readiness = await request(`${apiUrl}/ready`);
requireStatus(readiness, [200], "Backend readiness");
const configResult = await request(
  `${apiUrl}/public/tenants/${encodeURIComponent(tenantSlug)}/config`,
);
requireStatus(configResult, [200], "Public tenant contract");

let payload;
try {
  payload = JSON.parse(configResult.text);
} catch {
  throw new Error("Public tenant contract did not return valid JSON.");
}

const branding = payload?.tenant?.publicSite?.branding;
const presetId = branding?.stylePreset;
if (payload?.tenant?.slug !== tenantSlug) {
  throw new Error(
    `Public tenant contract returned ${String(payload?.tenant?.slug)}; expected ${tenantSlug}.`,
  );
}
if (!PRESET_IDS.has(presetId)) {
  throw new Error(`Unexpected public style preset: ${String(presetId)}`);
}
if (presetId !== expectedPresetId) {
  throw new Error(
    `Published style preset is ${presetId}; expected ${expectedPresetId}.`,
  );
}
for (const key of [
  "accentColor",
  "secondaryColor",
  "backgroundColor",
  "textColor",
]) {
  if (!SAFE_COLOR.test(String(branding?.[key] || ""))) {
    throw new Error(`Published branding.${key} is missing or unsafe.`);
  }
  if (branding[key].toUpperCase() !== expectedPalette[key].toUpperCase()) {
    throw new Error(
      `Published branding.${key} is ${branding[key]}; expected ${expectedPalette[key]}.`,
    );
  }
}

const report = {
  phase,
  backend: {
    apiUrl,
    health: health.response.status,
    ready: readiness.response.status,
    tenantSlug,
    presetId,
    palette: Object.fromEntries(
      ["accentColor", "secondaryColor", "backgroundColor", "textColor"].map(
        (key) => [key, branding[key]],
      ),
    ),
  },
};

if (phase === "frontend") {
  const paths = [
    { key: "public", path: `/${locale}`, statuses: [200] },
    { key: "login", path: `/${locale}/login`, statuses: [200] },
    {
      key: "portal",
      path: `/${locale}/portal`,
      statuses: [200, 302, 303, 307, 308],
    },
  ];
  report.frontend = { siteUrl, pages: {} };

  for (const entry of paths) {
    const result = await request(`${siteUrl}${entry.path}`, {
      redirect: entry.key === "portal" ? "manual" : "follow",
    });
    requireStatus(result, entry.statuses, `Frontend ${entry.key}`);
    if (entry.key === "portal" && result.response.status !== 200) {
      const location = result.response.headers.get("location");
      if (!location) {
        throw new Error("Frontend portal redirect did not include Location.");
      }
      const actual = new URL(location, `${siteUrl}${entry.path}`);
      const expected = new URL(`/${locale}/login`, siteUrl);
      if (
        actual.origin !== expected.origin ||
        actual.pathname !== expected.pathname
      ) {
        throw new Error(
          `Frontend portal redirected to ${actual.href}; expected ${expected.href}.`,
        );
      }
    }
    if (
      result.response.status === 200 &&
      !result.text.includes(`data-tenant-style="${presetId}"`)
    ) {
      throw new Error(
        `Frontend ${entry.key} did not render published preset ${presetId}.`,
      );
    }
    report.frontend.pages[entry.key] = {
      status: result.response.status,
      location: result.response.headers.get("location"),
    };
  }
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
