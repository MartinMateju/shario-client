import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicCommerceCatalog } from "@/lib/publicTenant/commerceCatalog.server";
vi.mock("@/lib/publicTenant/publicReadHeaders.server", () => ({
  getPublicServerReadHeaders: async () => ({
    accept: "application/json",
    "x-shario-auth-proxy-signature": "visitor-proof",
  }),
}));
let fetchMock;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("server-rendered public catalogues", () => {
  it.each([
    [
      "memberships",
      "memberships",
      { tenant: { slug: "klei" }, locations: [], plans: [] },
    ],
    ["vouchers", "vouchers/products", []],
  ])(
    "fetches only published %s anonymously and preserves a valid empty result",
    async (kind, path, data) => {
      fetchMock.mockResolvedValueOnce(Response.json(data));
      const snapshot = await getPublicCommerceCatalog("klei", kind);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.example.test/public/tenants/klei/${path}`,
        {
          credentials: "omit",
          cache: "no-store",
          redirect: "manual",
          headers: {
            accept: "application/json",
            "x-shario-auth-proxy-signature": "visitor-proof",
          },
          signal: expect.anything(),
        },
      );
      expect(snapshot).toMatchObject({
        kind,
        tenantSlug: "klei",
        data,
        fetchedAt: expect.any(Number),
      });
    },
  );
  it.each([
    ["memberships", { tenant: { slug: "other" }, plans: [], locations: [] }],
    ["memberships", { tenant: { slug: "klei" }, plans: null, locations: [] }],
    ["vouchers", { error: "unavailable" }],
  ])("leaves invalid %s responses available for retry", async (kind, body) => {
    fetchMock.mockResolvedValueOnce(Response.json(body));
    expect(await getPublicCommerceCatalog("klei", kind)).toBeNull();
  });
  it("falls back to browser retry after a transient API failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await getPublicCommerceCatalog("klei", "vouchers")).toBeNull();
  });
});
