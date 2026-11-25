import { NextRequest } from "next/server";
import { REHYDRATE } from "redux-persist";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

import proxy from "@/proxy";
import { getPublicAuthTransportConfig } from "@/lib/auth/authTransportConfig.server";
import { forwardFirstPartyAuthRequest } from "@/lib/auth/firstPartyAuthProxy.server";
import { createAuthTransportConfig } from "@/lib/features/auth/authTransportConfig";
import { needsFirstPartyAuthTransport } from "@/lib/features/auth/firstPartyAuthTransport";

const browserWindow = window;
const NativeRequest = Request;
const stores = [];
let makeStore;
let api;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.shario.test");
  ({ makeStore } = await import("@/lib/store"));
  const { apiSlice } = await import("@/lib/features/api/apiSlice");
  api = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      platformAliasTransportProbe: builder.mutation({ query: (args) => args }),
    }),
  });
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.io");
  vi.stubEnv("TENANT_ROOT_DOMAIN", "shario.io");
  vi.stubEnv(
    "PLATFORM_HOSTNAMES",
    "https://WORKSPACE.example./login, www.workspace.example",
  );
  vi.stubEnv(
    "CUSTOM_DOMAIN_TENANTS",
    '{"booking.commonground.example":"common-ground"}',
  );
  vi.stubEnv("LEGACY_TENANT_SLUGS", "");
});

afterEach(() => {
  for (const created of stores.splice(0)) {
    created.store.dispatch(api.util.resetApiState());
    created.persistor.pause();
  }
});

const createStore = (authTransportConfig = getPublicAuthTransportConfig()) => {
  const created = makeStore({ authTransportConfig });
  stores.push(created);
  return created.store;
};

const setBrowserHostname = (hostname) => {
  const location = new URL(`https://${hostname}/en/login`);
  vi.stubGlobal(
    "window",
    new Proxy(browserWindow, {
      get(target, property) {
        if (property === "location") return location;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  );
  // Browsers resolve relative Request URLs against the document; Node's
  // native Request does not. Keep the actual RTK Query fetch implementation.
  vi.stubGlobal(
    "Request",
    class extends NativeRequest {
      constructor(input, init) {
        super(
          typeof input === "string" ? new URL(input, location).href : input,
          init,
        );
      }
    },
  );
};

describe("platform alias authentication transport", () => {
  it("exports only normalized public platform aliases and no tenant map or credentials", () => {
    vi.stubEnv(
      "PLATFORM_HOSTNAMES",
      " https://user:private@WWW.Workspace.Example.:443/a?secret=value, workspace.example, WORKSPACE.EXAMPLE., http://[, *.example, ",
    );
    vi.stubEnv("TENANT_CUSTOM_DOMAIN_PROXY_SECRET", "private-proxy-secret");
    expect(getPublicAuthTransportConfig()).toEqual({
      platformHostnames: ["www.workspace.example", "workspace.example"],
    });
    expect(getPublicAuthTransportConfig()).not.toHaveProperty(
      "customDomainTenants",
    );
  });

  it.each(["workspace.example", "www.workspace.example"])(
    "preserves direct login, registration and refresh on the platform alias %s accepted by the router",
    async (hostname) => {
      vi.stubEnv("NODE_ENV", "production");
      const page = proxy(
        new NextRequest(`https://${hostname}/en/login`, {
          headers: { host: hostname },
        }),
      );
      expect(page.status).toBe(200);
      expect(page.headers.get("x-middleware-rewrite")).toBeNull();

      setBrowserHostname(hostname);
      const fetch = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetch);
      const store = createStore();

      for (const url of ["/auth", "/auth/register", "/auth/refresh"]) {
        const result = await store.dispatch(
          api.endpoints.platformAliasTransportProbe.initiate({
            url,
            method: "POST",
            body: { email: "test@example.test" },
          }),
        );
        expect(result).toMatchObject({ data: { ok: true } });
        const request = fetch.mock.calls.at(-1)[0];
        expect(request.url).toBe(`https://api.shario.test${url}`);
        expect(request.credentials).toBe("include");
        expect(request.headers.has("x-tenant-slug")).toBe(false);
        expect(await request.clone().json()).toEqual({
          email: "test@example.test",
        });
      }
    },
  );

  it.each([
    ["shario.io", "https://api.shario.test/auth/refresh", "include"],
    ["common-ground.shario.io", "https://api.shario.test/auth/refresh", "include"],
    [
      "booking.commonground.example",
      "https://booking.commonground.example/api/tenant-auth/auth/refresh",
      "same-origin",
    ],
    [
      "workspace.example.attacker.test",
      "https://workspace.example.attacker.test/api/tenant-auth/auth/refresh",
      "same-origin",
    ],
  ])(
    "keeps the expected session transport on %s",
    async (hostname, url, credentials) => {
      setBrowserHostname(hostname);
      const fetch = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetch);
      const store = createStore();
      const result = await store.dispatch(
        api.endpoints.platformAliasTransportProbe.initiate({
          url: "/auth/refresh",
          method: "POST",
        }),
      );
      expect(result).toMatchObject({ data: { ok: true } });
      expect(fetch.mock.calls[0][0]).toMatchObject({ url, credentials });
      expect(fetch.mock.calls[0][0].headers.has("x-tenant-slug")).toBe(false);
    },
  );

  it("matches aliases exactly, preserving www and rejecting subdomains and suffix tricks", () => {
    const config = createAuthTransportConfig({
      platformHostnames: ["https://WWW.Workspace.Example./path"],
    });
    expect(
      needsFirstPartyAuthTransport({
        ...config,
        hostname: "WWW.WORKSPACE.EXAMPLE.",
      }),
    ).toBe(false);
    for (const hostname of [
      "workspace.example",
      "tenant.www.workspace.example",
      "www.workspace.example.attacker.test",
      "not-www.workspace.example",
    ]) {
      expect(needsFirstPartyAuthTransport({ ...config, hostname })).toBe(true);
    }
  });

  it("seeds immutable config before the first thunk and never replaces it with persisted state", async () => {
    const input = { platformHostnames: ["workspace.example"] };
    const store = createStore(input);
    const runtime = store.dispatch(
      (_dispatch, _getState, extra) => extra.authTransportConfig,
    );
    expect(runtime).toEqual(input);
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(runtime.platformHostnames)).toBe(true);
    expect(store.getState()).not.toHaveProperty("authTransportConfig");
    input.platformHostnames.push("attacker.test");
    await vi.waitFor(() =>
      expect(store.getState()._persist.rehydrated).toBe(true),
    );
    store.dispatch({
      type: REHYDRATE,
      key: "root",
      payload: {
        authTransportConfig: { platformHostnames: ["attacker.test"] },
      },
    });
    expect(
      store.dispatch(
        (_dispatch, _getState, extra) => extra.authTransportConfig,
      ),
    ).toBe(runtime);
    expect(runtime.platformHostnames).toEqual(["workspace.example"]);
    const independentStore = createStore({
      platformHostnames: ["other.example"],
    });
    expect(
      independentStore.dispatch(
        (_dispatch, _getState, extra) =>
          extra.authTransportConfig.platformHostnames,
      ),
    ).toEqual(["other.example"]);
  });

  it("does not let a platform alias or forwarded tenant header bypass the tenant BFF boundary", async () => {
    const executeFetch = vi.fn();
    const request = new NativeRequest(
      "https://workspace.example/api/tenant-auth/auth",
      {
        method: "POST",
        headers: {
          origin: "https://workspace.example",
          "content-type": "application/json",
          "x-forwarded-host": "booking.commonground.example",
          "x-tenant-slug": "common-ground",
        },
        body: JSON.stringify({ tenantSlug: "common-ground" }),
      },
    );
    const result = await forwardFirstPartyAuthRequest(request, ["auth"], {
      customDomainTenants: process.env.CUSTOM_DOMAIN_TENANTS,
      apiBaseUrl: "https://api.shario.test",
      secret: "synthetic-test-secret-at-least-32-bytes",
      nodeEnv: "production",
      vercel: "0",
      executeFetch,
    });
    expect(result.status).toBe(403);
    expect((await result.json()).code).toBe("AUTH_PROXY_ORIGIN_REJECTED");
    expect(executeFetch).not.toHaveBeenCalled();
  });
});
