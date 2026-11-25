import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ readHeaders: vi.fn() }));
vi.mock("@/lib/publicTenant/publicReadHeaders.server", () => ({
  getPublicServerReadHeaders: mocks.readHeaders,
}));
import { getPublicTenantConfig } from "@/lib/publicTenant/server";

import {
  getPublicCourseInitialData,
  getPublicCourseLocationRequest,
  getPublicCourseProduct,
} from "@/lib/publicTenant/courses.server";

const product = {
  id: "wheel",
  kind: "class",
  name: "Wheel course",
  isActive: true,
};
const locations = [
  { id: "a", slug: "vaclavska", isPrimary: true, isActive: true },
  { id: "b", slug: "grohova", isActive: true },
  { id: "closed", slug: "closed", isActive: false },
];
let fetchMock;
const response = (data, status = 200) => ({
  headers: new Headers(),
  status,
  ok: status === 200,
  json: async () => data,
});

beforeEach(() => {
  mocks.readHeaders
    .mockReset()
    .mockResolvedValue({ accept: "application/json" });
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("public course server data", () => {
  it("loads a bounded, credential-free catalogue scoped to the requested tenant and studio", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ locations, locationId: "b", products: [product] }),
    );
    const data = await getPublicCourseInitialData("klei", "grohova");
    expect(data).toMatchObject({
      tenantSlug: "klei",
      locationId: "b",
      products: [{ id: "wheel" }],
    });
    expect(data.locations.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/public/tenants/klei/products/courses/overview?location=grohova",
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toMatchObject({
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
        headers: { accept: "application/json" },
      });
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.headers).not.toHaveProperty("cookie");
      expect(options.headers).not.toHaveProperty("authorization");
    }
  });

  it("preserves continuation metadata when a full response contains filtered rows", async () => {
    const records = [
      ...Array.from({ length: 99 }, (_, index) => ({
        ...product,
        id: `course-${index}`,
      })),
      { id: "not-public-course", kind: "voucher" },
    ];
    const startedAt = Date.now();
    fetchMock.mockResolvedValueOnce(
      response({ locations, locationId: "b", products: records }),
    );
    const data = await getPublicCourseInitialData("klei", "grohova");
    expect(data.products).toHaveLength(99);
    expect(data.catalogPage.hasMore).toBe(true);
    expect(data.catalogPage.sourceIds).toHaveLength(100);
    expect(data.fetchedAt).toBeGreaterThanOrEqual(startedAt);
    expect(data.fetchedAt).toBeLessThanOrEqual(Date.now());
  });

  it("selects the primary studio only when no explicit location was provided", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ locations, locationId: "a", products: [product] }),
    );
    expect((await getPublicCourseInitialData("klei", null)).locationId).toBe(
      "a",
    );
  });

  it.each(["missing", "closed", ""])(
    "does not broaden invalid explicit location %s",
    async (reference) => {
      fetchMock.mockResolvedValue(
        response({ locations, locationId: "", products: [] }),
      );
      const data = await getPublicCourseInitialData("klei", reference);
      expect(data.locationId).toBe("");
      expect(data.products).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  const missingToken = {
    message: "Missing access token.",
    statusCode: 401,
    status: "fail",
    code: "UNAUTHORIZED",
  };
  const rejected = (status, budget, body) =>
    Response.json(body, {
      status,
      headers: { "x-shario-public-lookup-budget": budget },
    });

  it.each([
    ["route not found", response({}, 404)],
    [
      "legacy public router falling through to verifyJWT",
      rejected(401, "lookup", missingToken),
    ],
  ])(
    "keeps server-rendered cards for an unregistered overview (%s)",
    async (_, unavailable) => {
      fetchMock
        .mockResolvedValueOnce(unavailable)
        .mockResolvedValueOnce(response({ locations }))
        .mockResolvedValueOnce(response([product]));
      const data = await getPublicCourseInitialData("klei", "grohova");
      expect(data).toMatchObject({
        locationId: "b",
        products: [{ id: "wheel" }],
        catalogPage: { hasMore: false, sourceIds: ["wheel"] },
      });
      expect(
        fetchMock.mock.calls.map(
          ([url]) => new URL(url).pathname + new URL(url).search,
        ),
      ).toEqual([
        "/api/public/tenants/klei/products/courses/overview?location=grohova",
        "/api/public/tenants/klei/products/courses/locations",
        "/api/public/tenants/klei/products/courses?locationId=b&page=1&limit=100",
      ]);
      for (const [, options] of fetchMock.mock.calls) {
        expect(options.credentials).toBe("omit");
        expect(options.headers).not.toHaveProperty("authorization");
      }
    },
  );

  it.each([
    [401, "catalogue", missingToken],
    [401, "lookup", { ...missingToken, message: "Invalid access token." }],
    [403, "lookup", { code: "AUTH_FIRST_PARTY_PROXY_INVALID" }],
    [404, "catalogue", { code: "PUBLIC_COURSES_NOT_AVAILABLE" }],
    [404, "lookup", { code: "PUBLIC_WORKSPACE_NOT_FOUND" }],
    [429, "lookup", { code: "PUBLIC_TENANT_LOOKUP_RATE_LIMITED" }],
    [503, "catalogue", {}],
  ])(
    "preserves an upstream refusal or outage (%i, %s)",
    async (status, budget, body) => {
      fetchMock.mockResolvedValueOnce(rejected(status, budget, body));
      expect(await getPublicCourseInitialData("klei", "grohova")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects an overview that returned a different studio", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ locations, locationId: "a", products: [product] }),
    );
    expect(await getPublicCourseInitialData("klei", "grohova")).toBeNull();
  });

  it("loads only the selected studio's public course detail", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ locations }))
      .mockResolvedValueOnce(response({ product }));
    const data = await getPublicCourseInitialData("klei", "grohova", "wheel");
    expect(data.product.id).toBe("wheel");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.example.test/api/public/tenants/klei/products/wheel?locationId=b",
    );
  });

  it("renders a queryless canonical detail at a studio where the course is published", async () => {
    const published = { ...product, courseContent: { locationIds: ["b"] } };
    fetchMock
      .mockResolvedValueOnce(response({ locations }))
      .mockResolvedValueOnce(response({ product: published }))
      .mockResolvedValueOnce(response({ product: published }));
    const data = await getPublicCourseInitialData("klei", null, "wheel");
    expect(data.locationId).toBe("b");
    expect(data.product.id).toBe("wheel");
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://api.example.test/api/public/tenants/klei/products/wheel?locationId=b",
    );
  });

  it.each([
    { id: "foreign", kind: "class" },
    { ...product, kind: "voucher" },
    { ...product, isActive: false },
  ])("rejects a mismatched or non-public product", async (record) => {
    fetchMock.mockResolvedValue(response({ product: record }));
    expect(await getPublicCourseProduct("klei", "wheel")).toEqual({
      product: null,
      notFound: true,
    });
  });

  it.each([400, 404])(
    "distinguishes an invalid or missing course (%s) from a temporary API outage",
    async (status) => {
      fetchMock.mockResolvedValueOnce(response({}, status));
      expect(await getPublicCourseProduct("klei", "wheel")).toEqual({
        product: null,
        notFound: true,
      });
      fetchMock.mockRejectedValueOnce(
        new DOMException("Timed out", "TimeoutError"),
      );
      expect(await getPublicCourseProduct("klei", "wheel")).toEqual({
        product: null,
        notFound: false,
        unavailable: true,
      });
    },
  );

  it("fails closed for invalid tenant context and tolerates API outages", async () => {
    expect(await getPublicCourseInitialData("../another-tenant")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new Error("Unavailable"));
    expect(await getPublicCourseInitialData("klei")).toBeNull();
  });

  it("uses the same location/legacy-locationId precedence as browser links", () => {
    expect(getPublicCourseLocationRequest()).toBeNull();
    expect(getPublicCourseLocationRequest({ location: "" })).toBe("");
    expect(
      getPublicCourseLocationRequest({
        location: ["grohova", "vaclavska"],
        locationId: "a",
      }),
    ).toBe("grohova");
    expect(
      getPublicCourseLocationRequest({
        locationId: "a",
        utm_source: "campaign",
      }),
    ).toBe("a");
  });
});

describe("anonymous server reads preserve the visitor rate-limit identity", () => {
  const proof = {
    accept: "application/json",
    "x-shario-auth-proxy-signature": "visitor-bound-proof",
    "x-shario-auth-proxy-client-ip": "203.0.113.8",
  };
  it("uses signed public-read headers for both configuration and each location-scoped course request", async () => {
    mocks.readHeaders.mockResolvedValue(proof);
    fetchMock.mockResolvedValueOnce(
      response({ tenant: { slug: "klei", name: "Klei" } }),
    );
    expect((await getPublicTenantConfig("klei")).tenant.slug).toBe("klei");
    fetchMock.mockResolvedValueOnce(
      response({ locations, locationId: "b", products: [product] }),
    );
    expect(
      (await getPublicCourseInitialData("klei", "grohova")).products[0].id,
    ).toBe("wheel");
    fetchMock.mockResolvedValueOnce(response({ product }));
    expect((await getPublicCourseProduct("klei", "wheel")).product.id).toBe(
      "wheel",
    );
    expect(mocks.readHeaders).toHaveBeenCalledTimes(3);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(mocks.readHeaders).toHaveBeenCalledWith({
        url,
        tenantSlug: "klei",
      });
      expect(options).toMatchObject({
        headers: proof,
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
      });
      expect(options.headers).not.toHaveProperty("authorization");
      expect(options.headers).not.toHaveProperty("cookie");
    }
  });

  it("does not silently issue unverified requests if visitor proof generation fails", async () => {
    mocks.readHeaders.mockRejectedValue(
      new Error("Trusted public client IP unavailable"),
    );
    expect((await getPublicTenantConfig("klei")).unavailable).toBe(true);
    expect(await getPublicCourseInitialData("klei")).toBeNull();
    expect((await getPublicCourseProduct("klei", "wheel")).unavailable).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
