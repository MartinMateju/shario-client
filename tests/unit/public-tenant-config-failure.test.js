import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("@/lib/publicTenant/publicReadHeaders.server", () => ({
  getPublicServerReadHeaders: mocks.headers,
}));

import { getPublicTenantConfig } from "@/lib/publicTenant/server";

let fetchMock;
let warning;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
  mocks.headers.mockReset().mockResolvedValue({ accept: "application/json" });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  warning = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("public studio configuration failures", () => {
  it("reports a throttled bootstrap without retrying it or treating the studio as missing", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "372" }),
      json,
    });
    expect(await getPublicTenantConfig("common-ground")).toEqual({
      tenant: null,
      unavailable: true,
      notFound: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "public_tenant_config_unavailable",
      { reason: "rate_limited", status: 429, retryAfterSeconds: 372 },
    );
  });

  it.each([403, 503])(
    "distinguishes an upstream %s from a missing studio",
    async (status) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status,
        headers: new Headers({ "retry-after": "untrusted response text" }),
      });
      expect((await getPublicTenantConfig("common-ground")).unavailable).toBe(
        true,
      );
      expect(warning).toHaveBeenCalledExactlyOnceWith(
        "public_tenant_config_unavailable",
        { reason: "upstream_http_error", status },
      );
    },
  );

  it("does not log raw transport errors or mint unsigned fallback requests", async () => {
    mocks.headers.mockRejectedValue(
      new Error("private proof, URL and IP details"),
    );
    expect((await getPublicTenantConfig("common-ground")).unavailable).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "public_tenant_config_unavailable",
      { reason: "request_failed" },
    );
  });

  it("records timeouts separately and can recover on a new render", async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException("private host details", "TimeoutError"),
    );
    expect((await getPublicTenantConfig("common-ground")).unavailable).toBe(
      true,
    );
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "public_tenant_config_unavailable",
      { reason: "timeout" },
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tenant: {
          slug: "common-ground",
          name: "Atelier KLEI",
          publicSite: {
            branding: { logoUrl: "https://images.example.test/klei.png" },
          },
        },
      }),
    });
    const result = await getPublicTenantConfig("common-ground");
    expect(result.unavailable).toBe(false);
    expect(result.tenant.publicSite.branding.logoUrl).toBe(
      "https://images.example.test/klei.png",
    );
  });

  it("preserves confirmed 404 handling without an availability warning", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await getPublicTenantConfig("missing-studio")).toEqual({
      tenant: null,
      unavailable: false,
      notFound: true,
    });
    expect(warning).not.toHaveBeenCalled();
  });
});
