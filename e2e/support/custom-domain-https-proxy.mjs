import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

import { setupCustomDomainTls } from "./custom-domain-tls.mjs";

const APP_HOSTS = new Set([
  "studio-alpha.test",
  "shario.localhost",
  "studio-alpha.shario.localhost",
  "studio-beta.shario.localhost",
]);

export function getCustomDomainProxyTarget(hostHeader, requestTarget) {
  const host = String(hostHeader || "").toLowerCase();
  const api =
    host === "api.shario.localhost:3443" || host === "api.shario.localhost";
  if (!api && !APP_HOSTS.has(host)) return null;
  if (
    !requestTarget?.startsWith("/") ||
    requestTarget.startsWith("//") ||
    /[\\\r\n]/.test(requestTarget)
  )
    return null;
  return {
    port: api ? 4311 : 4310,
    host,
    path: requestTarget,
  };
}

export function startCustomDomainHttpsProxy() {
  if (process.env.E2E_HTTPS_MODE !== "1")
    throw new Error("HTTPS proxy requires E2E_HTTPS_MODE=1.");
  const tls = setupCustomDomainTls();
  const server = https.createServer(
    {
      key: fs.readFileSync(tls.keyPath),
      cert: fs.readFileSync(tls.certPath),
    },
    (req, res) => {
      if (
        req.headers.host === "127.0.0.1:3443" &&
        req.url === "/__e2e_https_ready"
      ) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("isolated HTTPS fixture ready");
        return;
      }
      const target = getCustomDomainProxyTarget(req.headers.host, req.url);
      if (!target) {
        res.writeHead(421);
        res.end("Unknown test host or request target");
        return;
      }
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: target.port,
          method: req.method,
          path: target.path,
          headers: {
            ...req.headers,
            host: target.host,
            "x-forwarded-host": target.host,
            "x-forwarded-proto": "https",
            "x-forwarded-for": "127.0.0.1",
          },
          timeout: 30_000,
        },
        (response) => {
          res.writeHead(response.statusCode || 502, response.headers);
          response.pipe(res);
        },
      );
      upstream.on("timeout", () =>
        upstream.destroy(new Error("Test upstream timed out")),
      );
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502);
        res.end("Test upstream unavailable");
      });
      req.on("aborted", () => upstream.destroy());
      req.pipe(upstream);
    },
  );
  server.listen(3443, "127.0.0.1", () =>
    console.log("Custom-domain HTTPS test proxy listening on loopback:3443"),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => {
      server.close();
      server.closeAllConnections();
    });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  startCustomDomainHttpsProxy();
