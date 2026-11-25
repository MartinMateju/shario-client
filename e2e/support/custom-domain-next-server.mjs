import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const APP_HOSTS = new Set([
  "studio-alpha.test",
  "shario.localhost",
  "studio-alpha.shario.localhost",
  "studio-beta.shario.localhost",
]);
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function isTrustedCustomDomainProxyRequest(request) {
  const host = request.headers?.host;
  return Boolean(
    LOOPBACK.has(request.socket?.remoteAddress) &&
    APP_HOSTS.has(host) &&
    request.headers["x-forwarded-host"] === host &&
    request.headers["x-forwarded-proto"] === "https" &&
    request.url?.startsWith("/") &&
    !request.url.startsWith("//") &&
    !/[\\\r\n]/.test(request.url),
  );
}

const isReadinessProbe = (request) =>
  LOOPBACK.has(request.socket?.remoteAddress) &&
  request.headers?.host === "127.0.0.1:4310" &&
  request.method === "GET" &&
  request.url === "/api/health";

export async function startCustomDomainNextServer() {
  if (process.env.E2E_HTTPS_MODE !== "1" || process.env.VERCEL === "1") {
    throw new Error("This loopback Next fixture requires E2E_HTTPS_MODE=1.");
  }
  // The actual built BFF must enforce its production HTTPS/origin guards.
  // A preceding `npm run build` does not set NODE_ENV for this process.
  process.env.NODE_ENV = "production";
  const require = createRequire(import.meta.url);
  const loadConfig = require("next/dist/server/config").default;
  const { PHASE_PRODUCTION_SERVER } = require("next/constants");
  const config = await loadConfig(PHASE_PRODUCTION_SERVER, ROOT);
  // Next's config cache returns this same object to the router/render worker.
  // Model the trusted HTTPS ingress used by hosting adapters, only after the
  // loopback/host/header checks below. No application auth guards are changed.
  config.experimental = { ...config.experimental, trustHostHeader: true };
  config.skipProxyUrlNormalize = true;
  const { getRequestHandlers } = require("next/dist/server/lib/start-server");
  // Next 16's next()/next-start wrappers force an internal hostname and port
  // into NextRequest.url. Calling its real production router without those
  // options preserves https://studio-alpha.test even though TLS terminates on
  // the local fixture proxy. This uses the production .next bundle and proxy.
  const runtime = await getRequestHandlers({ dir: ROOT, isDev: false });
  const server = http.createServer((request, response) => {
    if (
      !isTrustedCustomDomainProxyRequest(request) &&
      !isReadinessProbe(request)
    ) {
      response.writeHead(421);
      response.end("Untrusted test ingress");
      return;
    }
    Promise.resolve(runtime.requestHandler(request, response)).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end("Test Next request failed");
    });
  });
  server.on("upgrade", (request, socket, head) => {
    if (!isTrustedCustomDomainProxyRequest(request)) {
      socket.destroy();
      return;
    }
    runtime.upgradeHandler(request, socket, head);
  });
  server.listen(4310, "127.0.0.1", () =>
    console.log(
      "Custom-domain production Next fixture listening on loopback:4310",
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      server.close();
      server.closeAllConnections();
      void runtime.server?.close();
    });
  }
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startCustomDomainNextServer();
}
