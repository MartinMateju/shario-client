const httpsMode = process.env.E2E_HTTPS_MODE === "1";
const originFor = (hostname) =>
  httpsMode ? `https://${hostname}` : `http://${hostname}:4310`;

export const E2E = Object.freeze({
  frontendPort: httpsMode ? 443 : 4310,
  locale: "en",
  alphaSlug: "studio-alpha",
  betaSlug: "studio-beta",
  alphaCustomHostname: "studio-alpha.test",
});

export function tenantOrigin(slug) {
  return originFor(`${slug}.shario.localhost`);
}

export function platformOrigin() {
  return originFor("shario.localhost");
}

export function platformUrl(pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localizedPath =
    normalizedPath === "/"
      ? `/${E2E.locale}`
      : `/${E2E.locale}${normalizedPath}`;

  return `${platformOrigin()}${localizedPath}`;
}

export function isPlatformRoute(url, pathname) {
  return (
    url.hostname === "shario.localhost" &&
    url.origin === platformOrigin() &&
    url.pathname === `/${E2E.locale}${pathname}`
  );
}

export function tenantUrl(slug, pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localizedPath =
    normalizedPath === "/"
      ? `/${E2E.locale}`
      : `/${E2E.locale}${normalizedPath}`;

  return `${tenantOrigin(slug)}${localizedPath}`;
}

export function customTenantOrigin(hostname) {
  return originFor(hostname);
}

export function customTenantUrl(hostname, pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localizedPath =
    normalizedPath === "/"
      ? `/${E2E.locale}`
      : `/${E2E.locale}${normalizedPath}`;

  return `${customTenantOrigin(hostname)}${localizedPath}`;
}

export function isCustomTenantRoute(url, hostname, pathname) {
  return (
    url.hostname === hostname &&
    url.origin === customTenantOrigin(hostname) &&
    url.pathname === `/${E2E.locale}${pathname}`
  );
}

export function isTenantRoute(url, slug, pathname) {
  return (
    url.hostname === `${slug}.shario.localhost` &&
    url.origin === tenantOrigin(slug) &&
    url.pathname === `/${E2E.locale}${pathname}`
  );
}
