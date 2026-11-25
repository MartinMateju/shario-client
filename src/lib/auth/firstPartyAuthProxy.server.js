import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

import { FIRST_PARTY_AUTH_METHODS } from "@/lib/features/auth/firstPartyAuthTransport";
import { isValidTenantSlug } from "@/utils/tenantRouting";

const MAX_BODY_BYTES = 65_536;
const UPSTREAM_TIMEOUT_MS = 15_000;

const errorResponse = (status, code) =>
  Response.json(
    { code, message: "The authentication request could not be completed." },
    { status, headers: { "cache-control": "private, no-store" } },
  );

const canonicalizeValue = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalizeValue(item)]),
    );
  }
  return value;
};

export const canonicalizeAuthProxyBody = (body) =>
  body === undefined ? "" : JSON.stringify(canonicalizeValue(body));

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const createFirstPartyAuthSignature = ({
  secret,
  timestamp,
  nonce,
  method,
  target,
  origin,
  clientIp,
  cookie,
  body,
}) =>
  createHmac("sha256", secret)
    .update(
      [
        clientIp ? "shario-auth-proxy-v2" : "shario-auth-proxy-v1",
        timestamp,
        nonce,
        method,
        target,
        origin,
        ...(clientIp ? [clientIp] : []),
        sha256(cookie || ""),
        sha256(canonicalizeAuthProxyBody(body)),
      ].join("\n"),
      "utf8",
    )
    .digest("hex");

const getConfiguredTenant = (hostname, mapping) => {
  try {
    const domains = JSON.parse(mapping || "{}");
    if (!domains || typeof domains !== "object" || Array.isArray(domains)) {
      return "";
    }
    const slug = Object.entries(domains).find(
      ([host]) => String(host).trim().toLowerCase() === hostname,
    )?.[1];
    return isValidTenantSlug(slug) ? String(slug).trim().toLowerCase() : "";
  } catch {
    return "";
  }
};

const readJsonBody = async (request) => {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return { error: errorResponse(413, "AUTH_PROXY_BODY_TOO_LARGE") };
  }
  if (!request.body) return { body: undefined };

  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return { error: errorResponse(413, "AUTH_PROXY_BODY_TOO_LARGE") };
    }
    chunks.push(Buffer.from(value));
  }
  if (!length) return { body: undefined };
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  ) {
    return { error: errorResponse(415, "AUTH_PROXY_JSON_REQUIRED") };
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: errorResponse(400, "AUTH_PROXY_INVALID_BODY") };
    }
    return { body };
  } catch {
    return { error: errorResponse(400, "AUTH_PROXY_INVALID_BODY") };
  }
};

export const forwardFirstPartyAuthRequest = async (
  request,
  path,
  {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
    customDomainTenants = process.env.CUSTOM_DOMAIN_TENANTS,
    secret = process.env.AUTH_FIRST_PARTY_PROXY_SECRET,
    nodeEnv = process.env.NODE_ENV,
    vercel = process.env.VERCEL,
    executeFetch = fetch,
    now = Date.now,
    createNonce = () => randomBytes(24).toString("base64url"),
  } = {},
) => {
  const pathname = `/${Array.isArray(path) ? path.join("/") : ""}`;
  const method = request.method.toUpperCase();
  if (FIRST_PARTY_AUTH_METHODS[pathname] !== method) {
    return errorResponse(404, "AUTH_PROXY_ROUTE_NOT_FOUND");
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const tenantSlug = getConfiguredTenant(
    requestUrl.hostname,
    customDomainTenants,
  );
  const browserOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // The exact serving origin must be configured. Never derive it from a
  // client-supplied forwarded host or a returnOrigin/body parameter.
  if (
    !tenantSlug ||
    requestUrl.username ||
    requestUrl.password ||
    (nodeEnv === "production" &&
      (requestUrl.protocol !== "https:" || requestUrl.port)) ||
    browserOrigin !== origin ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    return errorResponse(403, "AUTH_PROXY_ORIGIN_REJECTED");
  }

  const normalizedSecret = String(secret || "").trim();
  if (Buffer.byteLength(normalizedSecret, "utf8") < 32) {
    return errorResponse(503, "AUTH_PROXY_NOT_CONFIGURED");
  }

  // Vercel overwrites this edge header; an arbitrary deployment or incoming
  // X-Forwarded-For is not a trusted client-IP source. Bind the trusted IP to
  // the HMAC so the API can rate-limit each visitor instead of the shared BFF.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const clientIp =
    vercel === "1"
      ? String(request.headers.get("x-vercel-forwarded-for") || "").trim()
      : "";
  if (vercel === "1" && !isIP(clientIp)) {
    return errorResponse(503, "AUTH_PROXY_CLIENT_IP_UNAVAILABLE");
  }

  let upstreamUrl;
  try {
    const upstream = new URL(String(apiBaseUrl || ""));
    if (
      !["http:", "https:"].includes(upstream.protocol) ||
      upstream.username ||
      upstream.password ||
      upstream.search ||
      upstream.hash ||
      upstream.pathname !== "/" ||
      (nodeEnv === "production" && upstream.protocol !== "https:") ||
      upstream.origin === origin
    )
      throw new Error("Invalid configured upstream");
    upstreamUrl = new URL(`${pathname}${requestUrl.search}`, upstream);
  } catch {
    return errorResponse(503, "AUTH_PROXY_NOT_CONFIGURED");
  }

  let parsed;
  try {
    parsed = await readJsonBody(request);
  } catch {
    return errorResponse(400, "AUTH_PROXY_INVALID_BODY");
  }
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  if (
    body?.tenantSlug &&
    String(body.tenantSlug).trim().toLowerCase() !== tenantSlug
  ) {
    return errorResponse(403, "AUTH_PROXY_TENANT_REJECTED");
  }

  const timestamp = String(now());
  const nonce = createNonce();
  const cookie = request.headers.get("cookie") || "";
  const upstreamHeaders = new Headers({
    accept: "application/json",
    origin,
    "x-shario-auth-proxy-origin": origin,
    "x-shario-auth-proxy-timestamp": timestamp,
    "x-shario-auth-proxy-nonce": nonce,
    "x-shario-auth-proxy-signature": createFirstPartyAuthSignature({
      secret: normalizedSecret,
      timestamp,
      nonce,
      method,
      target: `${upstreamUrl.pathname}${upstreamUrl.search}`,
      origin,
      clientIp,
      cookie,
      body,
    }),
  });
  if (clientIp) upstreamHeaders.set("x-shario-auth-proxy-client-ip", clientIp);
  if (cookie) upstreamHeaders.set("cookie", cookie);
  const authorization = request.headers.get("authorization");
  if (authorization) upstreamHeaders.set("authorization", authorization);
  if (body !== undefined)
    upstreamHeaders.set("content-type", "application/json");

  try {
    const upstream = await executeFetch(upstreamUrl.href, {
      method,
      headers: upstreamHeaders,
      body: body === undefined ? undefined : canonicalizeAuthProxyBody(body),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    // Never follow an upstream redirect with session cookies or credentials.
    if (upstream.status >= 300 && upstream.status < 400) {
      return errorResponse(502, "AUTH_PROXY_UPSTREAM_FAILED");
    }
    const responseHeaders = new Headers({
      "cache-control": "private, no-store",
      "content-type":
        upstream.headers.get("content-type") || "application/json",
      "x-content-type-options": "nosniff",
    });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) responseHeaders.set("retry-after", retryAfter);
    for (const cookieValue of upstream.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookieValue);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse(502, "AUTH_PROXY_UPSTREAM_FAILED");
  }
};
