import { describe, expect, it, vi } from "vitest";

import { createFirstPartyAuthSignature } from "@/lib/auth/firstPartyAuthProxy.server";
import { getPublicServerReadHeaders } from "@/lib/publicTenant/publicReadHeaders.server";

const secret = "test-proxy-secret-with-at-least-32-bytes";
const origin = "https://booking.commonground.example";
const target =
  "/public/tenants/common-ground/products/courses?locationId=abc&page=1&limit=100";
const tenantSlug = "common-ground";
const headersFor = (entries = {}) =>
  new Headers({
    host: "booking.commonground.example",
    "x-vercel-forwarded-for": "203.0.113.42",
    ...entries,
  });
const settings = {
  vercel: "1",
  secret,
  apiBaseUrl: "https://api.shario.io",
  rootHostname: "shario.io",
  customDomainTenants: JSON.stringify({
    "booking.commonground.example": tenantSlug,
  }),
  readRequestHeaders: async () => headersFor(),
  now: () => 1795000000000,
  createNonce: () => "fixed-nonce-with-24-bytes-12345678",
};
const run = (overrides = {}, input = {}) =>
  getPublicServerReadHeaders(
    {
      url: `https://api.shario.io${target}`,
      tenantSlug,
      ...input,
    },
    { ...settings, ...overrides },
  );

describe("anonymous public SSR request proofs", () => {
  it("signs the exact allowed GET target and trusted visitor IP without credentials", async () => {
    const result = await run({
      readRequestHeaders: async () =>
        headersFor({
          cookie: "customerRefreshToken=secret",
          authorization: "Bearer secret",
          "x-forwarded-host": "evil.example",
          "x-forwarded-for": "198.51.100.50",
          "x-shario-auth-proxy-origin": "https://evil.example",
          "x-shario-auth-proxy-signature": "forged",
        }),
    });
    expect(result).toEqual({
      accept: "application/json",
      origin,
      "x-shario-auth-proxy-origin": origin,
      "x-shario-auth-proxy-timestamp": "1795000000000",
      "x-shario-auth-proxy-nonce": "fixed-nonce-with-24-bytes-12345678",
      "x-shario-auth-proxy-client-ip": "203.0.113.42",
      "x-shario-auth-proxy-signature": createFirstPartyAuthSignature({
        secret,
        timestamp: "1795000000000",
        nonce: "fixed-nonce-with-24-bytes-12345678",
        method: "GET",
        target,
        origin,
        clientIp: "203.0.113.42",
      }),
    });
    // Verified independently using the backend's exported signature function.
    expect(result["x-shario-auth-proxy-signature"]).toBe(
      "759c5735c0bbb1250adf3c2205530c29055eb36758a8f0b3c8ba784a6f435f1f",
    );
  });

  it.each([
    "/config",
    "/memberships",
    "/vouchers/products",
    "/products/courses/overview?location=vaclavska",
    "/products/courses",
    "/products/courses/locations",
    "/products/507f1f77bcf86cd799439011?locationId=abc",
  ])("supports public config/course read %s", async (suffix) => {
    const result = await run(
      {},
      { url: `https://api.shario.io/public/tenants/${tenantSlug}${suffix}` },
    );
    expect(result["x-shario-auth-proxy-signature"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each(["shario.io", "www.shario.io", "common-ground.shario.io"])(
    "keeps platform and legacy tenant SSR independently rate limited on %s",
    async (host) => {
      const result = await run({
        readRequestHeaders: async () => headersFor({ host }),
      });
      expect(result.origin).toBe(`https://${host}`);
    },
  );

  it.each([
    "https://evil.example/public/tenants/common-ground/config",
    "https://api.shario.io/auth/customer",
    "https://api.shario.io/public/tenants/common-ground/vouchers/checkout",
    "https://api.shario.io/public/tenants/common-ground/memberships/checkout",
    "https://api.shario.io/public/tenants/another/config",
    "https://api.shario.io/public/tenants/common-ground/products/id/sessions",
    "https://api.shario.io/public/tenants/common-ground/products/id#fragment",
    "https://user:secret@api.shario.io/public/tenants/common-ground/config",
  ])("never signs an arbitrary target %s", async (url) => {
    await expect(run({}, { url })).rejects.toThrow("Invalid public API target");
  });

  it.each([
    "evil.example",
    "other.shario.io",
    "booking.commonground.example:443",
    "shario.io@evil.example",
  ])(
    "never mints trusted proof for an unknown or mismatched serving host %s",
    async (host) => {
      expect(
        await run({
          readRequestHeaders: async () =>
            headersFor({
              host,
              "x-forwarded-host": "booking.commonground.example",
            }),
        }),
      ).toEqual({ accept: "application/json" });
    },
  );

  it("does not sign a custom host mapped to a different tenant", async () => {
    expect(
      await run({
        customDomainTenants: '{"booking.commonground.example":"other"}',
      }),
    ).toEqual({ accept: "application/json" });
  });

  it("rejects a configured API path prefix that the signed backend does not serve", async () => {
    await expect(
      run(
        { apiBaseUrl: "https://api.shario.io/api" },
        {
          url: "https://api.shario.io/api/public/tenants/common-ground/config",
        },
      ),
    ).rejects.toThrow("Invalid public API target");
  });

  it.each(["", "203.0.113.42, 198.51.100.1", "not-an-ip"])(
    "fails closed if the trusted edge IP is unavailable or malformed: %s",
    async (clientIp) => {
      await expect(
        run({
          readRequestHeaders: async () =>
            headersFor({
              "x-vercel-forwarded-for": clientIp,
              "x-forwarded-for": "203.0.113.42",
            }),
        }),
      ).rejects.toThrow("Trusted public client IP unavailable");
    },
  );

  it("keeps IPv6 byte-exact for the API proof", async () => {
    const result = await run({
      readRequestHeaders: async () =>
        headersFor({ "x-vercel-forwarded-for": "2001:db8::42" }),
    });
    expect(result["x-shario-auth-proxy-client-ip"]).toBe("2001:db8::42");
  });

  it.each([{ vercel: "0" }, { secret: "" }])(
    "preserves unsigned baseline without the trusted provider/configuration",
    async (overrides) => {
      const readRequestHeaders = vi.fn();
      expect(await run({ ...overrides, readRequestHeaders })).toEqual({
        accept: "application/json",
      });
      expect(readRequestHeaders).not.toHaveBeenCalled();
    },
  );

  it("supports static/background calls outside a Next request", async () => {
    expect(
      await run({
        readRequestHeaders: async () => {
          throw new Error("No request context");
        },
      }),
    ).toEqual({ accept: "application/json" });
  });

  it("creates a fresh nonce for every public request", async () => {
    const first = await run({ createNonce: undefined });
    const second = await run({ createNonce: undefined });
    expect(first["x-shario-auth-proxy-nonce"]).not.toBe(
      second["x-shario-auth-proxy-nonce"],
    );
    expect(first["x-shario-auth-proxy-nonce"]).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});
