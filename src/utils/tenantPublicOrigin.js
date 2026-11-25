const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

const PUBLIC_QUERY_KEYS = new Set([
  "location",
  "category",
  "search",
  "q",
  "page",
  "sort",
  "direction",
  "from",
]);

/** Only public navigation may move hosts without a session handoff. */
export const isMigratablePublicTenantPath = (pathname, search = "") => {
  if (
    !/^\/(?:$|(?:memberships|vouchers)\/?$|(?:courses|book|help)(?:\/[a-zA-Z0-9_-]+)?\/?$)/.test(
      pathname,
    )
  ) {
    return false;
  }
  return [...new URLSearchParams(search).keys()].every(
    (key) => PUBLIC_QUERY_KEYS.has(key) || /^utm_[a-z_]+$/.test(key),
  );
};

/** A public origin is supplied by the API after domain ownership/plan checks. */
export const normalizeTenantPublicOrigin = (value) => {
  const raw = String(value || "").trim();
  if (!raw || /[\\\u0000-\u0020\u007f]/.test(raw)) return "";

  try {
    const url = new URL(raw);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const local =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (!HOSTNAME_PATTERN.test(hostname) && !local) ||
      (IPV4_PATTERN.test(hostname) && !local) ||
      (process.env.NODE_ENV === "production" && (local || url.port)) ||
      (url.protocol !== "https:" &&
        !(
          process.env.NODE_ENV !== "production" &&
          local &&
          url.protocol === "http:"
        ))
    ) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
};
