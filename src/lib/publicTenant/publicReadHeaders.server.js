import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

import { createFirstPartyAuthSignature } from "@/lib/auth/firstPartyAuthProxy.server";
import {
  getConfiguredRootHostname,
  isValidTenantSlug,
} from "@/utils/tenantRouting";

const getAllowedOrigin = (
  requestHeaders,
  tenantSlug,
  rootHostname,
  mapping,
) => {
  const host = String(requestHeaders.get("host") || "").toLowerCase();
  // The serving Host is checked against our configuration. Never use a
  // caller-provided forwarded host or proxy-origin header to mint a proof.
  if (!host || !/^[a-z0-9.-]+$/.test(host)) return "";
  if (
    host === rootHostname ||
    host === `www.${rootHostname}` ||
    host === `${tenantSlug}.${rootHostname}`
  ) {
    return `https://${host}`;
  }
  try {
    const domains = JSON.parse(mapping || "{}");
    if (!domains || typeof domains !== "object" || Array.isArray(domains))
      return "";
    const mappedSlug = Object.entries(domains).find(
      ([domain]) => domain.trim().toLowerCase() === host,
    )?.[1];
    return mappedSlug === tenantSlug ? `https://${host}` : "";
  } catch {
    return "";
  }
};

// Public SSR remains anonymous. A short-lived v2 proof only lets the API apply
// its existing lookup budget to the visitor's verified edge IP, rather than
// pooling every visitor behind Vercel's outbound IP. No session is forwarded.
export async function getPublicServerReadHeaders(
  { url, tenantSlug },
  {
    vercel = process.env.VERCEL,
    secret = process.env.AUTH_FIRST_PARTY_PROXY_SECRET,
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
    rootHostname,
    customDomainTenants = process.env.CUSTOM_DOMAIN_TENANTS,
    readRequestHeaders = headers,
    now = Date.now,
    createNonce = () => randomBytes(24).toString("base64url"),
  } = {},
) {
  const result = { accept: "application/json" };
  const normalizedSecret = String(secret || "").trim();
  // Preserve the existing unsigned path during a backend-first rollout and
  // for local/static callers without a trusted Vercel request context.
  if (vercel !== "1" || Buffer.byteLength(normalizedSecret, "utf8") < 32)
    return result;
  if (!isValidTenantSlug(tenantSlug)) throw new Error("Invalid public tenant");

  const target = new URL(url);
  const configuredApi = new URL(apiBaseUrl);
  const prefix = `/public/tenants/${encodeURIComponent(tenantSlug)}/`;
  const suffix = target.pathname.startsWith(prefix)
    ? target.pathname.slice(prefix.length)
    : "";
  if (
    target.origin !== configuredApi.origin ||
    target.protocol !== "https:" ||
    // The API currently mounts its signed public endpoints at the root.
    configuredApi.pathname !== "/" ||
    configuredApi.search ||
    configuredApi.hash ||
    configuredApi.username ||
    configuredApi.password ||
    target.username ||
    target.password ||
    target.hash ||
    !/^(?:config|memberships|vouchers\/products|products\/(?:courses(?:\/(?:locations|overview))?|[A-Za-z0-9_-]+))$/.test(
      suffix,
    )
  ) {
    throw new Error("Invalid public API target");
  }

  let requestHeaders;
  try {
    requestHeaders = await readRequestHeaders();
  } catch {
    return result;
  }
  const origin = getAllowedOrigin(
    requestHeaders,
    tenantSlug,
    rootHostname || getConfiguredRootHostname() || "shario.io",
    customDomainTenants,
  );
  if (!origin) return result;

  const clientIp = String(
    requestHeaders.get("x-vercel-forwarded-for") || "",
  ).trim();
  if (!isIP(clientIp)) throw new Error("Trusted public client IP unavailable");
  const timestamp = String(now());
  const nonce = createNonce();
  return {
    ...result,
    origin,
    "x-shario-auth-proxy-origin": origin,
    "x-shario-auth-proxy-timestamp": timestamp,
    "x-shario-auth-proxy-nonce": nonce,
    "x-shario-auth-proxy-client-ip": clientIp,
    "x-shario-auth-proxy-signature": createFirstPartyAuthSignature({
      secret: normalizedSecret,
      timestamp,
      nonce,
      method: "GET",
      target: `${target.pathname}${target.search}`,
      origin,
      clientIp,
    }),
  };
}
