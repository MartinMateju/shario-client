// Platform aliases are public routing configuration, not tenant identities.
// Preserve exact hostnames (including www) and discard URL credentials/paths.
export const normalizePlatformHostname = (value) => {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const raw = value.trim().toLowerCase();
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`,
    );
    const hostname = url.hostname.replace(/\.$/, "");
    return hostname && !hostname.includes("*") ? hostname : "";
  } catch {
    return "";
  }
};

export const createAuthTransportConfig = ({ platformHostnames = [] } = {}) =>
  Object.freeze({
    platformHostnames: Object.freeze([
      ...new Set(
        (Array.isArray(platformHostnames) ? platformHostnames : [])
          .map(normalizePlatformHostname)
          .filter(Boolean),
      ),
    ]),
  });
