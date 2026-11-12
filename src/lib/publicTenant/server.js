import { cache } from "react";

import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";

const PUBLIC_TENANT_CONFIG_TIMEOUT_MS = 5_000;

const getServerApiBaseUrl = () => {
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
    return {
      tenant: null,
      unavailable: true,
      notFound: false,
    };
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/public/tenants/${encodeURIComponent(tenantSlug)}/config`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(PUBLIC_TENANT_CONFIG_TIMEOUT_MS),
      },
    );

    if (response.status === 404) {
      return {
        tenant: null,
        unavailable: false,
        notFound: true,
      };
    }

    if (!response.ok) {
      return {
        tenant: null,
        unavailable: true,
        notFound: false,
      };
    }

    const payload = await response.json();
    const tenant = normalizePublicTenant(payload, tenantSlug);

    if (!tenant.slug || tenant.slug !== tenantSlug) {
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
  } catch {
    return {
      tenant: null,
      unavailable: true,
      notFound: false,
    };
  }
});
