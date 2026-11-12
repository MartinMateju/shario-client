const PLATFORM_SCRIPT_PATHS = new Set([
  "/_vercel/insights/script.js",
  "/_vercel/speed-insights/script.js",
]);

export async function installLocalVercelTelemetryRoutes(page) {
  // Production builds include Vercel scripts, but local `next start` does not
  // provide those platform endpoints. Keep unrelated console errors visible.
  await page.route(
    (url) =>
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "shario.localhost" ||
        url.hostname.endsWith(".shario.localhost")) &&
      PLATFORM_SCRIPT_PATHS.has(url.pathname),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* Vercel telemetry is supplied by the local browser fixture. */",
      }),
  );
}
