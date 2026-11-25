import { describe, expect, it, vi } from "vitest";

import {
  canonicalizeAuthProxyBody,
  createFirstPartyAuthSignature,
  forwardFirstPartyAuthRequest,
} from "@/lib/auth/firstPartyAuthProxy.server";

const origin = "https://booking.commonground.example";
const secret = "test-proxy-secret-with-at-least-32-bytes";
const settings = {
  apiBaseUrl: "https://api.shario.io",
  customDomainTenants: JSON.stringify({
    "booking.commonground.example": "common-ground",
  }),
  secret,
  nodeEnv: "production",
  vercel: "0",
};
const makeRequest = (
  path = "auth/customer/refresh",
  { body, url, headers = {}, method = "POST" } = {},
) =>
  new Request(url || `${origin}/api/tenant-auth/${path}`, {
    method,
    headers: {
      origin,
      "sec-fetch-site": "same-origin",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const run = (
  request,
  overrides = {},
  path = ["auth", "customer", "refresh"],
) => {
  const executeFetch =
    overrides.executeFetch ||
    vi.fn().mockResolvedValue(Response.json({ ok: true }));
  return {
    executeFetch,
    response: forwardFirstPartyAuthRequest(request, path, {
      ...settings,
      executeFetch,
      ...overrides,
    }),
  };
};

describe("signed custom-domain auth BFF", () => {
  it("matches the independently verified backend HMAC contract", () => {
    expect(
      createFirstPartyAuthSignature({
        secret,
        timestamp: "1795000000000",
        nonce: "fixed-nonce-with-24-bytes-12345678",
        method: "POST",
        target: "/auth/customer/refresh?source=booking",
        origin,
        cookie: "customerRefreshToken=opaque; preference=cs",
        body: { nested: { z: 1, a: true }, list: [{ b: "two", a: "one" }] },
      }),
    ).toBe("7644a2a28d672dad2cd68ca304284ebfefd8d2a2901c5b6d99197e3c6ab2a867");
    expect(canonicalizeAuthProxyBody(undefined)).toBe("");
  });

  it("matches the backend v2 proof including the verified browser IP", () => {
    expect(
      createFirstPartyAuthSignature({
        secret,
        timestamp: "1795000000000",
        nonce: "fixed-nonce-with-24-bytes-12345678",
        method: "POST",
        target: "/auth/customer/refresh?source=booking",
        origin,
        clientIp: "203.0.113.42",
        cookie: "customerRefreshToken=opaque; preference=cs",
        body: { nested: { z: 1, a: true }, list: [{ b: "two", a: "one" }] },
      }),
    ).toBe("501a96716bdbd818351b95e3e61d5d1330f3242deb71ca1bc58eed94782469a7");
  });

  it("signs the exact API target, canonical JSON and full cookie header while discarding spoofed internal headers", async () => {
    const body = {
      tenantSlug: "common-ground",
      password: "example",
      nested: { z: 1, a: true },
    };
    const cookie = "customerRefreshToken=opaque; preference=cs";
    const { response, executeFetch } = run(
      makeRequest("auth/customer?source=booking", {
        body,
        headers: {
          cookie,
          authorization: "Bearer signed-access-token",
          "x-shario-auth-proxy-origin": "https://evil.example",
          "x-shario-auth-proxy-signature": "forged",
          "x-forwarded-host": "evil.example",
        },
      }),
      {
        now: () => 1795000000000,
        createNonce: () => "fixed-nonce-with-24-bytes-12345678",
      },
      ["auth", "customer"],
    );
    expect((await response).status).toBe(200);
    const [url, options] = executeFetch.mock.calls[0];
    expect(url).toBe("https://api.shario.io/auth/customer?source=booking");
    expect(options).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "manual",
    });
    expect(options.headers.get("origin")).toBe(origin);
    expect(options.headers.get("x-shario-auth-proxy-origin")).toBe(origin);
    expect(options.headers.get("cookie")).toBe(cookie);
    expect(options.headers.get("authorization")).toBe(
      "Bearer signed-access-token",
    );
    expect(options.headers.has("x-forwarded-host")).toBe(false);
    expect(options.body).toBe(
      '{"nested":{"a":true,"z":1},"password":"example","tenantSlug":"common-ground"}',
    );
    expect(options.headers.get("x-shario-auth-proxy-signature")).toBe(
      createFirstPartyAuthSignature({
        secret,
        timestamp: "1795000000000",
        nonce: "fixed-nonce-with-24-bytes-12345678",
        method: "POST",
        target: "/auth/customer?source=booking",
        origin,
        cookie,
        body,
      }),
    );
  });

  it("forwards each host-only refresh cookie separately and never caches the session response", async () => {
    const cookies = [
      "customerRefreshToken=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
      "customerRefreshToken=new; Path=/; HttpOnly; Secure; SameSite=Lax",
    ];
    const headers = new Headers({ "content-type": "application/json" });
    cookies.forEach((cookie) => headers.append("set-cookie", cookie));
    const upstream = new Response('{"accessToken":"short-lived"}', { headers });
    const { response } = run(makeRequest(), {
      executeFetch: vi.fn().mockResolvedValue(upstream),
    });
    const result = await response;
    expect(result.headers.getSetCookie()).toEqual(cookies);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(await result.json()).toEqual({ accessToken: "short-lived" });
  });

  it("generates a fresh unpredictable nonce for every request", async () => {
    const first = run(makeRequest());
    const second = run(makeRequest());
    await Promise.all([first.response, second.response]);
    const nonce1 = first.executeFetch.mock.calls[0][1].headers.get(
      "x-shario-auth-proxy-nonce",
    );
    const nonce2 = second.executeFetch.mock.calls[0][1].headers.get(
      "x-shario-auth-proxy-nonce",
    );
    expect(nonce1).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(nonce2).not.toBe(nonce1);
  });

  it("binds the Vercel-supplied client IP to the signed proof, preserving visitor rate limits", async () => {
    const cookie = "customerRefreshToken=opaque";
    const { response, executeFetch } = run(
      makeRequest(undefined, {
        headers: {
          cookie,
          "x-vercel-forwarded-for": "2001:db8::42",
          "x-forwarded-for": "192.0.2.99",
          "x-shario-auth-proxy-client-ip": "192.0.2.88",
        },
      }),
      {
        vercel: "1",
        now: () => 1795000000000,
        createNonce: () => "fixed-nonce-with-24-bytes-12345678",
      },
    );
    expect((await response).status).toBe(200);
    const headers = executeFetch.mock.calls[0][1].headers;
    expect(headers.get("x-shario-auth-proxy-client-ip")).toBe("2001:db8::42");
    expect(headers.has("x-forwarded-for")).toBe(false);
    expect(headers.get("x-shario-auth-proxy-signature")).toBe(
      createFirstPartyAuthSignature({
        secret,
        timestamp: "1795000000000",
        nonce: "fixed-nonce-with-24-bytes-12345678",
        method: "POST",
        target: "/auth/customer/refresh",
        origin,
        clientIp: "2001:db8::42",
        cookie,
      }),
    );
  });

  it("does not trust provider-looking IP headers outside the Vercel runtime", async () => {
    const { response, executeFetch } = run(
      makeRequest(undefined, {
        headers: {
          "x-vercel-forwarded-for": "192.0.2.42",
          "x-shario-auth-proxy-client-ip": "192.0.2.42",
        },
      }),
      { vercel: "0" },
    );
    expect((await response).status).toBe(200);
    expect(
      executeFetch.mock.calls[0][1].headers.has("x-shario-auth-proxy-client-ip"),
    ).toBe(false);
  });

  it.each(["", "not-an-ip", "192.0.2.1, 192.0.2.2", "https://192.0.2.1"])(
    "fails closed if the expected Vercel client IP is missing or malformed: %s",
    async (clientIp) => {
      const { response, executeFetch } = run(
        makeRequest(undefined, {
          headers: { "x-vercel-forwarded-for": clientIp },
        }),
        { vercel: "1" },
      );
      expect((await response).status).toBe(503);
      expect(executeFetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { headers: { origin: "https://evil.example" } },
    { headers: { origin: "" } },
    { headers: { "sec-fetch-site": "cross-site" } },
    {
      url: "https://evil.example/api/tenant-auth/auth/customer/refresh",
      headers: {
        origin: "https://evil.example",
        "x-forwarded-host": "booking.commonground.example",
      },
    },
    {
      url: "http://booking.commonground.example/api/tenant-auth/auth/customer/refresh",
      headers: { origin: "http://booking.commonground.example" },
    },
  ])(
    "rejects an untrusted browser/serving origin before forwarding",
    async (options) => {
      const { response, executeFetch } = run(makeRequest(undefined, options));
      expect((await response).status).toBe(403);
      expect(executeFetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { customDomainTenants: "{}" },
    { customDomainTenants: "invalid" },
    { customDomainTenants: '{"booking.commonground.example":"admin"}' },
  ])("rejects hosts without a valid configured tenant", async (overrides) => {
    const { response, executeFetch } = run(makeRequest(), overrides);
    expect((await response).status).toBe(403);
    expect(executeFetch).not.toHaveBeenCalled();
  });

  it.each([
    { secret: "too-short" },
    { apiBaseUrl: "https://user:password@api.shario.io" },
    { apiBaseUrl: "http://api.shario.io" },
    { apiBaseUrl: origin },
    { apiBaseUrl: "https://api.shario.io/unexpected-prefix" },
  ])(
    "fails closed when server configuration is incomplete or unsafe",
    async (overrides) => {
      const { response, executeFetch } = run(makeRequest(), overrides);
      expect((await response).status).toBe(503);
      expect(executeFetch).not.toHaveBeenCalled();
    },
  );

  it("rejects another tenant's login before signing it", async () => {
    const { response, executeFetch } = run(
      makeRequest("auth/customer", { body: { tenantSlug: "other-studio" } }),
      {},
      ["auth", "customer"],
    );
    expect((await response).status).toBe(403);
    expect(executeFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["admin", "users"],
    ["auth", "..", "bookings"],
    ["https:", "evil.example"],
  ])("only forwards explicitly allowed auth paths", async (...segments) => {
    const { response, executeFetch } = run(makeRequest(), {}, segments);
    expect((await response).status).toBe(404);
    expect(executeFetch).not.toHaveBeenCalled();
  });

  it("rejects oversized JSON before signing or sending credentials", async () => {
    const { response, executeFetch } = run(
      makeRequest(undefined, { body: { password: "x".repeat(70_000) } }),
    );
    expect((await response).status).toBe(413);
    expect(executeFetch).not.toHaveBeenCalled();
  });

  it("preserves API authentication errors and retry-after without exposing internal headers", async () => {
    const { response } = run(makeRequest(), {
      executeFetch: vi.fn().mockResolvedValue(
        Response.json(
          { code: "LOGIN_RATE_LIMIT" },
          {
            status: 429,
            headers: { "retry-after": "60", "x-internal": "private" },
          },
        ),
      ),
    });
    const result = await response;
    expect(result.status).toBe(429);
    expect(result.headers.get("retry-after")).toBe("60");
    expect(result.headers.has("x-internal")).toBe(false);
    expect(await result.json()).toEqual({ code: "LOGIN_RATE_LIMIT" });
  });

  it("does not redirect credentials to another upstream", async () => {
    const { response, executeFetch } = run(makeRequest(), {
      executeFetch: vi.fn().mockResolvedValue(
        new Response(null, {
          status: 307,
          headers: { location: "https://evil.example" },
        }),
      ),
    });
    expect((await response).status).toBe(502);
    expect(executeFetch).toHaveBeenCalledOnce();
    expect(executeFetch.mock.calls[0][1].redirect).toBe("manual");
  });
});
