export const E2E = Object.freeze({
  frontendPort: 4310,
  locale: "en",
  alphaSlug: "studio-alpha",
  betaSlug: "studio-beta",
  alphaCustomHostname: "studio-alpha.test",
});

export function tenantOrigin(slug) {
  return `http://${slug}.shario.localhost:${E2E.frontendPort}`;
}

export function platformOrigin() {
  return `http://shario.localhost:${E2E.frontendPort}`;
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
    url.port === String(E2E.frontendPort) &&
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
  return `http://${hostname}:${E2E.frontendPort}`;
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
    url.port === String(E2E.frontendPort) &&
    url.pathname === `/${E2E.locale}${pathname}`
  );
}

export function isTenantRoute(url, slug, pathname) {
  return (
    url.hostname === `${slug}.shario.localhost` &&
    url.port === String(E2E.frontendPort) &&
    url.pathname === `/${E2E.locale}${pathname}`
  );
}
