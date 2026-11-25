import { cache } from "react";

import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import { getPublicServerReadHeaders } from "@/lib/publicTenant/publicReadHeaders.server";

const PUBLIC_TENANT_CONFIG_TIMEOUT_MS = 5_000;

// Do not log response bodies, request URLs, cookies, IPs or proxy proofs. These
// fixed categories distinguish throttling from transport/configuration errors.
const reportConfigFailure = (reason, response) => {
  const rawRetryAfter = response?.headers?.get?.("retry-after");
  const retryAfterSeconds = /^\d{1,6}$/.test(rawRetryAfter || "")
    ? Number(rawRetryAfter)
    : undefined;
  console.warn("public_tenant_config_unavailable", {
    reason,
    ...(response ? { status: response.status } : {}),
    ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
  });
};

export const getServerApiBaseUrl = () => {
  const configuredUrl = String(process.env.NEXT_PUBLIC_API_URL || "").trim();

  if (!configuredUrl) return "";

  try {
    const apiUrl = new URL(configuredUrl);

    if (
      process.env.NODE_ENV !== "production" &&
      apiUrl.hostname.endsWith(".localhost")
    ) {
      apiUrl.hostname = "localhost";
    }

    return apiUrl.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
};

export const getPublicTenantConfig = cache(async (tenantSlug) => {
  const apiBaseUrl = getServerApiBaseUrl();

  if (!apiBaseUrl) {
    reportConfigFailure("missing_api_configuration");
    return {
      tenant: null,
      unavailable: true,
      notFound: false,
    };
  }

  try {
    const url = `${apiBaseUrl}/public/tenants/${encodeURIComponent(tenantSlug)}/config`;
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      headers: await getPublicServerReadHeaders({ url, tenantSlug }),
      signal: AbortSignal.timeout(PUBLIC_TENANT_CONFIG_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return {
        tenant: null,
        unavailable: false,
        notFound: true,
      };
    }

    if (!response.ok) {
      reportConfigFailure(
        response.status === 429 ? "rate_limited" : "upstream_http_error",
        response,
      );
      return {
        tenant: null,
        unavailable: true,
        notFound: false,
      };
    }

    const payload = await response.json();
    const tenant = normalizePublicTenant(payload, tenantSlug);

    if (!tenant.slug || tenant.slug !== tenantSlug) {
      reportConfigFailure("invalid_tenant_response");
      return {
        tenant: null,
        unavailable: true,
        notFound: false,
      };
    }

    return {
      tenant,
      unavailable: false,
      notFound: false,
    };
  } catch (error) {
    reportConfigFailure(
      error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "timeout"
        : "request_failed",
    );
    return {
      tenant: null,
      unavailable: true,
      notFound: false,
    };
  }
});
