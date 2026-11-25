import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicTenantConfig: vi.fn(),
  getPublicCourseProduct: vi.fn(),
  getPublicCourseInitialData: vi.fn(),
}));

vi.mock("@/lib/publicTenant/server", () => ({
  getPublicTenantConfig: mocks.getPublicTenantConfig,
}));
vi.mock("@/lib/publicTenant/courses.server", () => ({
  getPublicCourseProduct: mocks.getPublicCourseProduct,
  getPublicCourseInitialData: mocks.getPublicCourseInitialData,
  getPublicCourseLocationRequest: () => null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations:
    async ({ locale }) =>
    (key) =>
      `${locale}:${key}`,
}));
vi.mock("@/components/courses/CustomerCoursesPage", () => ({
  PublicCustomerCoursesPage: () => null,
}));
vi.mock("@/components/public-tenant/PublicBookingProductDetailPage", () => ({
  default: () => null,
}));

import { generateMetadata as courseListMetadata } from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/page";
import { generateMetadata as courseDetailMetadata } from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/[productId]/page";

const productId = "c764bfc87c9659e28dd52325";
const setTenant = (tenantSlug, pages = {}) =>
  mocks.getPublicTenantConfig.mockResolvedValue({
    tenant: {
      slug: tenantSlug,
      publicCapabilities: { courses: true },
      publicSite: { pages },
    },
    notFound: false,
    unavailable: false,
  });

describe("public course metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicCourseProduct.mockResolvedValue({
      product: null,
      notFound: false,
    });
    mocks.getPublicCourseInitialData.mockResolvedValue({
      product: { id: productId, kind: "class", name: "Public course" },
      products: [],
    });
  });

  it.each([
    ["cs", "common-ground", "https://common-ground.shario.io"],
    ["en", "clay-house", "https://clay-house.shario.io"],
    ["nl", "studio-olivka", "https://ceramics.example"],
  ])(
    "gives %s course pages their own tenant-relative URLs",
    async (locale, tenantSlug, origin) => {
      setTenant(tenantSlug);
      const parent = Promise.resolve({
        metadataBase: new URL(origin),
        alternates: { canonical: `${origin}/${locale}` },
        openGraph: {
          title: "Studio home",
          description: "Home description",
          siteName: "Studio brand",
          url: `${origin}/${locale}`,
          images: [{ url: `${origin}/studio-cover.jpg` }],
          type: "website",
        },
      });
      const params = Promise.resolve({ locale, tenantSlug, productId });
      const input = {
        params,
        searchParams: Promise.resolve({
          location: "vaclavska",
          courseSessionId: "session-123",
          utm_source: "newsletter",
        }),
      };
      const list = await courseListMetadata(input, parent);
      const detail = await courseDetailMetadata(input, parent);

      expect(list.alternates).toEqual({ canonical: `/${locale}/courses` });
      expect(detail.alternates).toEqual({
        canonical: `/${locale}/courses/${productId}`,
      });
      for (const metadata of [list, detail]) {
        expect(metadata.openGraph).toMatchObject({
          title: metadata.title,
          description: metadata.description,
          url: metadata.alternates.canonical,
          siteName: "Studio brand",
          images: [{ url: `${origin}/studio-cover.jpg` }],
          type: "website",
        });
        expect(new URL(metadata.alternates.canonical, origin).origin).toBe(
          origin,
        );
        expect(metadata.alternates.canonical).not.toContain("?");
        expect(metadata).not.toHaveProperty("metadataBase");
        expect(metadata).not.toHaveProperty("robots");
      }
      expect(list.title).toBe(`${locale}:metadataTitle`);
      expect(detail.title).toBe(`${locale}:courseMetadataTitle`);
      expect(mocks.getPublicTenantConfig).toHaveBeenCalledWith(tenantSlug);
    },
  );

  it("preserves localized studio copy in page and Open Graph metadata", async () => {
    setTenant("clay-house", {
      courses: {
        title: { cs: "Keramické kurzy v Brně", en: "Pottery courses" },
        description: { cs: "Přijďte tvořit s lektorem.", en: "Make with us." },
      },
    });

    const metadata = await courseListMetadata({
      params: Promise.resolve({ locale: "cs", tenantSlug: "clay-house" }),
    });

    expect(metadata.title).toBe("Keramické kurzy v Brně");
    expect(metadata.description).toBe("Přijďte tvořit s lektorem.");
    expect(metadata.openGraph).toEqual({
      title: "Keramické kurzy v Brně",
      description: "Přijďte tvořit s lektorem.",
      url: "/cs/courses",
    });
  });

  it("uses a distinct canonical for each course and ignores selected sessions", async () => {
    setTenant("clay-house");
    const detail = (id, location, courseSessionId) =>
      courseDetailMetadata({
        params: Promise.resolve({
          locale: "cs",
          tenantSlug: "clay-house",
          productId: id,
        }),
        searchParams: Promise.resolve({ location, courseSessionId }),
      });

    const first = await detail(productId, "vaclavska", "session-a");
    const anotherSession = await detail(productId, "grohova", "session-b");
    const otherCourse = await detail(
      "82499e02bd2839a034d63627",
      "vaclavska",
      "session-c",
    );

    expect(first.alternates.canonical).toBe(
      "/cs/courses/c764bfc87c9659e28dd52325",
    );
    expect(anotherSession.alternates).toEqual(first.alternates);
    expect(otherCourse.alternates.canonical).toBe(
      "/cs/courses/82499e02bd2839a034d63627",
    );
  });

  it.each([courseListMetadata, courseDetailMetadata])(
    "keeps hidden courses unavailable to metadata generation",
    async (generateMetadata) => {
      setTenant("clay-house", { courses: { visible: false } });

      await expect(
        generateMetadata({
          params: Promise.resolve({
            locale: "en",
            tenantSlug: "clay-house",
            productId,
          }),
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    },
  );
});

describe("public course detail identity", () => {
  it("uses localized published course copy instead of generic metadata", async () => {
    setTenant("klei");
    mocks.getPublicCourseProduct.mockResolvedValue({
      product: {
        id: productId,
        kind: "class",
        name: "Legacy name",
        courseContent: {
          name: { cs: "Točení na kruhu v Brně", en: "Pottery wheel" },
          description: {
            cs: "Kurz pro začátečníky.\n Dvě hodiny tvoření.",
            en: "Learn to throw.",
          },
        },
      },
    });
    const metadata = await courseDetailMetadata({
      params: Promise.resolve({ locale: "cs", tenantSlug: "klei", productId }),
    });
    expect(metadata.title).toBe("Točení na kruhu v Brně");
    expect(metadata.description).toBe(
      "Kurz pro začátečníky. Dvě hodiny tvoření.",
    );
    expect(metadata.openGraph.title).toBe(metadata.title);
    expect(mocks.getPublicCourseProduct).toHaveBeenCalledWith(
      "klei",
      productId,
    );
  });

  it("returns 404 for a missing or unpublished course", async () => {
    setTenant("klei");
    mocks.getPublicCourseProduct.mockResolvedValue({
      product: null,
      notFound: true,
    });
    await expect(
      courseDetailMetadata({
        params: Promise.resolve({
          locale: "cs",
          tenantSlug: "klei",
          productId,
        }),
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("does not index fallback metadata during an API outage", async () => {
    setTenant("klei");
    mocks.getPublicCourseProduct.mockResolvedValue({
      product: null,
      unavailable: true,
    });
    const metadata = await courseDetailMetadata({
      params: Promise.resolve({ locale: "en", tenantSlug: "klei", productId }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
