import {
  getConfiguredRootHostname,
  isLocalHostname,
} from "@/utils/tenantRouting";
import { normalizePlatformHostname } from "@/lib/features/auth/authTransportConfig";

export const FIRST_PARTY_AUTH_PREFIX = "/api/tenant-auth";

// Keep this transport deliberately narrower than a general API proxy. Only
// requests that issue, rotate or clear a session cookie need the first-party
// hop; authenticated business requests continue to use the regular API.
export const FIRST_PARTY_AUTH_METHODS = Object.freeze({
  "/auth": "POST",
  "/auth/customer": "POST",
  "/auth/customer/login": "POST",
  "/auth/logout": "POST",
  "/auth/customer/logout": "POST",
  "/auth/refresh": "POST",
  "/auth/customer/refresh": "POST",
  "/auth/register": "POST",
  "/auth/session-handoff": "POST",
  "/auth/customer/session-handoff": "POST",
  "/account/password": "PATCH",
  "/users/pass": "PATCH",
});

export const needsFirstPartyAuthTransport = ({
  hostname = typeof window === "undefined" ? "" : window.location.hostname,
  rootHostname = getConfiguredRootHostname() || "shario.io",
  platformHostnames = [],
} = {}) => {
  const host = String(hostname).trim().toLowerCase().replace(/\.$/, "");
  const root = String(rootHostname).trim().toLowerCase().replace(/\.$/, "");

  return Boolean(
    host &&
    root &&
    !isLocalHostname(host) &&
    !platformHostnames.some(
      (alias) => normalizePlatformHostname(alias) === host,
    ) &&
    host !== root &&
    !host.endsWith(`.${root}`),
  );
};

export const getFirstPartyAuthRequest = (args, location) => {
  const request = typeof args === "string" ? { url: args } : args;
  const url = String(request?.url || "");
  const pathname = url.split("?")[0];
  const method = String(request?.method || "GET").toUpperCase();

  if (
    !needsFirstPartyAuthTransport(location) ||
    FIRST_PARTY_AUTH_METHODS[pathname] !== method
  ) {
    return null;
  }

  return {
    ...request,
    url: `${FIRST_PARTY_AUTH_PREFIX}${url}`,
    credentials: "same-origin",
  };
};
