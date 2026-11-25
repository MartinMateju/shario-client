import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, get } from "node:https";
import { fileURLToPath } from "node:url";
import { getCustomDomainProxyTarget } from "../../e2e/support/custom-domain-https-proxy.mjs";
import { setupCustomDomainTls } from "../../e2e/support/custom-domain-tls.mjs";

const { loopbackResult } = createRequire(import.meta.url)(
  "../../e2e/support/custom-domain-dns-preload.cjs",
);

test("fixture TLS is trusted by Node using only its isolated CA", async () => {
  const results = fileURLToPath(
    new URL("../../test-results/", import.meta.url),
  );
  mkdirSync(results, { recursive: true });
  const directory = mkdtempSync(`${results}tls-chain-regression-`);
  const previous = {
    mode: process.env.E2E_HTTPS_MODE,
    directory: process.env.E2E_HTTPS_CERT_DIR,
  };
  let server;
  try {
    process.env.E2E_HTTPS_MODE = "1";
    process.env.E2E_HTTPS_CERT_DIR = directory;
    const tls = setupCustomDomainTls();
    server = createServer(
      { cert: readFileSync(tls.certPath), key: readFileSync(tls.keyPath) },
      (_request, response) => response.end("trusted"),
    );
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const response = await new Promise((resolve, reject) => {
      get(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          servername: "studio-alpha.test",
          ca: readFileSync(tls.caPath),
          rejectUnauthorized: true,
        },
        (result) => {
          result.resume();
          result.on("end", () => resolve(result.statusCode));
        },
      ).on("error", reject);
    });
    assert.equal(response, 200);
    assert.equal(setupCustomDomainTls().spkiHash, tls.spkiHash);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (previous.mode === undefined) delete process.env.E2E_HTTPS_MODE;
    else process.env.E2E_HTTPS_MODE = previous.mode;
    if (previous.directory === undefined) delete process.env.E2E_HTTPS_CERT_DIR;
    else process.env.E2E_HTTPS_CERT_DIR = previous.directory;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTPS fixture keeps public app URLs while forwarding only to loopback servers", () => {
  assert.deepEqual(
    getCustomDomainProxyTarget(
      "studio-alpha.test",
      "/api/tenant-auth/auth/customer",
    ),
    {
      host: "studio-alpha.test",
      port: 4310,
      path: "/api/tenant-auth/auth/customer",
    },
  );
  assert.deepEqual(
    getCustomDomainProxyTarget("api.shario.localhost:3443", "/auth/customer"),
    {
      host: "api.shario.localhost:3443",
      port: 4311,
      path: "/auth/customer",
    },
  );
});

test("HTTPS fixture cannot proxy production or arbitrary hosts/absolute targets", () => {
  for (const host of [
    "api.shario.io",
    "booking.commonground.example",
    "attacker.example",
    "studio-alpha.test:4310",
    "studio-alpha.test@evil.example",
  ]) {
    assert.equal(getCustomDomainProxyTarget(host, "/auth/customer"), null);
    assert.equal(loopbackResult(host), null);
  }
  for (const target of [
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/auth\r\ninjected",
  ]) {
    assert.equal(getCustomDomainProxyTarget("studio-alpha.test", target), null);
  }
});

test("test DNS resolves only explicit fixture hosts", () => {
  assert.deepEqual(loopbackResult("api.shario.localhost"), {
    address: "127.0.0.1",
    family: 4,
  });
  assert.deepEqual(loopbackResult("studio-alpha.test", { all: true }), [
    { address: "127.0.0.1", family: 4 },
  ]);
  assert.equal(loopbackResult("unknown.shario.localhost"), null);
});

test("release smoke requires both ordinary and HTTPS custom-domain browser coverage", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.match(
    packageJson.scripts["test:e2e:smoke"],
    /playwright test --config=playwright\.smoke\.config\.js\s*&&\s*(?:npx\s+)?playwright test --config=playwright\.custom-domain-auth\.config\.mjs/,
  );
  const workflow = readFileSync(
    new URL("../../.github/workflows/e2e-smoke.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /run: npm run test:e2e:smoke/);
  assert.match(workflow, /custom-domain-auth-results\.xml/);
  const customConfig = readFileSync(
    new URL("../../playwright.custom-domain-auth.config.mjs", import.meta.url),
    "utf8",
  );
  assert.match(customConfig, /grep: \/@custom-domain-auth\//);
  assert.match(customConfig, /grepInvert: undefined/);
});
