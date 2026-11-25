import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/publicTenant/publicReadHeaders.server", () => ({
  getPublicServerReadHeaders: async () => ({ accept: "application/json" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key) => key,
}));
vi.mock("@/components/public-tenant/PublicBookingProductDetailPage", () => ({
  default: () => null,
}));
vi.mock("@/components/courses/CustomerCoursesPage", () => ({
  PublicCustomerCoursesPage: () => null,
}));

import { generateMetadata } from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/[productId]/page";
import { generateMetadata as generateCatalogMetadata } from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/page";

const tenantSlug = "klei";
const productId = "111111111111111111111111";
const locationId = "222222222222222222222222";
const product = {
  id: productId,
  kind: "class",
  name: "Pottery wheel",
  isActive: true,
  courseContent: {
    name: { cs: "Točení na kruhu", en: "Pottery wheel" },
    description: { cs: "Kurz pro začátečníky.", en: "A beginner course." },
    locationIds: [locationId],
  },
};
const locations = [{ id: locationId, slug: "vaclavska", isActive: true }];
const json = (body, status = 200) => ({
  headers: new Headers(),
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
let fetchMock;
let locationResponse;
let scopedResponse;
let productResponse;
let catalogResponse;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
  locationResponse = () => json({ locations });
  scopedResponse = () => json({ product });
  productResponse = () => json({ product });
  catalogResponse = () => json({ locations, locationId, products: [product] });
  fetchMock = vi.fn(async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/config")) {
      return json({
        tenant: {
          slug: tenantSlug,
          name: "Klei",
          publicCapabilities: { courses: true },
          publicSite: { pages: { courses: { visible: true } } },
        },
      });
    }
    if (url.pathname.endsWith("/courses/locations")) return locationResponse();
    if (url.pathname.endsWith("/products/courses/overview"))
      return catalogResponse();
    if (url.pathname.endsWith(`/products/${productId}`)) {
      return url.searchParams.has("locationId")
        ? scopedResponse()
        : productResponse();
    }
    throw new Error(`Unexpected public read: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("public course catalogue indexing follows its SSR read outcome", () => {
  const catalogMetadata = (searchParams = {}) =>
    generateCatalogMetadata({
      params: Promise.resolve({ locale: "cs", tenantSlug }),
      searchParams: Promise.resolve(searchParams),
    });

  it("does not index the catalogue when the overview has no studio context", async () => {
    catalogResponse = () => json({ products: [product] });
    const result = await catalogMetadata();
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(result.alternates.canonical).toBe("/cs/courses");
  });

  it("does not index a catalogue API error as an empty catalogue", async () => {
    catalogResponse = () => json({}, 503);
    const result = await catalogMetadata({ location: "vaclavska" });
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      "https://api.example.test/public/tenants/klei/products/courses/overview?location=vaclavska",
    );
  });

  it.each([{ products: [] }, { products: [product] }])(
    "keeps a successful catalogue indexable: %j",
    async ({ products }) => {
      catalogResponse = () => json({ locations, locationId, products });
      expect(await catalogMetadata()).not.toHaveProperty("robots");
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const metadata = (searchParams = {}) =>
  generateMetadata({
    params: Promise.resolve({ locale: "cs", tenantSlug, productId }),
    searchParams: Promise.resolve(searchParams),
  });
const expectUnavailableMetadata = async (searchParams = {}) => {
  const result = await metadata(searchParams);
  expect(result.robots).toEqual({ index: false, follow: true });
  expect(result.title).toBe("Točení na kruhu");
  expect(result.description).toBe("Kurz pro začátečníky.");
  expect(result.alternates.canonical).toBe(`/cs/courses/${productId}`);
};

describe("public course metadata uses the actual studio-scoped SSR reads", () => {
  it.each([429, 503])(
    "does not index a loading placeholder when locations return %s but the product is available",
    async (status) => {
      locationResponse = () => json({}, status);
      await expectUnavailableMetadata();
      expect(
        fetchMock.mock.calls.some(([url]) => url.includes("locationId=")),
      ).toBe(false);
    },
  );

  it("does not index a loading placeholder when the locations request times out", async () => {
    locationResponse = () => {
      throw new DOMException("Timed out", "TimeoutError");
    };
    await expectUnavailableMetadata();
  });

  it("does not index a malformed locations response", async () => {
    locationResponse = () => json({ locations: null });
    await expectUnavailableMetadata();
  });

  it.each([404, 503])(
    "does not index an unavailable selected-studio product (%s) using the unscoped product",
    async (status) => {
      scopedResponse = () => json({}, status);
      await expectUnavailableMetadata({ location: "vaclavska" });
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
        `https://api.example.test/public/tenants/klei/products/${productId}?locationId=${locationId}`,
      );
    },
  );

  it.each([
    { location: "unknown" },
    { location: "" },
    { locationId: "unknown" },
  ])(
    "does not silently choose another studio for an invalid explicit selection %j",
    async (searchParams) => {
      await expectUnavailableMetadata(searchParams);
      expect(
        fetchMock.mock.calls.some(([url]) => url.includes("locationId=")),
      ).toBe(false);
    },
  );

  it("keeps a confirmed missing course as a real 404", async () => {
    productResponse = () => json({}, 404);
    await expect(metadata()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("/courses/locations")),
    ).toBe(false);
  });

  it("allows indexing again after the location-scoped reads recover", async () => {
    locationResponse = () => json({}, 503);
    await expectUnavailableMetadata();
    locationResponse = () => json({ locations });
    const result = await metadata();
    expect(result).not.toHaveProperty("robots");
    expect(result.title).toBe("Točení na kruhu");
    expect(result.alternates.canonical).toBe(`/cs/courses/${productId}`);
  });
});
