import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getPublicTenantConfig: vi.fn(),
}));
vi.mock("@/lib/publicTenant/server", () => ({
  getPublicTenantConfig: mocks.getPublicTenantConfig,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key) => key,
}));
vi.mock("@/components/public-tenant/PublicBookingAvailabilityPage", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicBookingProductDetailPage", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicProductCatalogPage", () => ({
  default: () => null,
}));
vi.mock("@/components/courses/CustomerCoursesPage", () => ({
  PublicCustomerCoursesPage: () => null,
  PublicCustomerCourseDetailPage: () => null,
}));
vi.mock("@/components/public-tenant/PublicHelpPage", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicKnowledgeResourcePage", () => ({
  default: () => null,
}));
vi.mock("@/components/memberships/PublicMembershipCatalog", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicVoucherCatalogPage", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ children }) => children,
}));
import * as book from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/book/page";
import * as bookDetail from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/book/[productId]/page";
import * as courses from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/page";
import * as courseDetail from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/[productId]/page";
import * as memberships from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/memberships/page";
import * as vouchers from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/vouchers/page";
import * as help from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/help/page";
import * as helpDetail from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/help/[resourceId]/page";
const routes = [
  ["/book", "book", book],
  ["/book/product", "book", bookDetail],
  ["/courses", "courses", courses],
  ["/courses/product", "courses", courseDetail],
  ["/memberships", "memberships", memberships],
  ["/vouchers", "vouchers", vouchers],
  ["/help", "help", help],
  ["/help/resource", "help", helpDetail],
];
const params = Promise.resolve({
  locale: "en",
  tenantSlug: "clay-house",
  productId: "product",
  resourceId: "resource",
});
const setPages = (pages) =>
  mocks.getPublicTenantConfig.mockResolvedValue({
    tenant: {
      slug: "clay-house",
      publicSite: {
        pages,
      },
    },
    notFound: false,
    unavailable: false,
  });
describe.each(routes)(
  "public visibility for %s",
  (_pathname, pageKey, route) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    it("returns not found for hidden pages and their metadata", async () => {
      setPages({
        [pageKey]: {
          visible: false,
          title: {
            en: "Hidden title",
          },
        },
      });
      await expect(
        route.default({
          params,
          children: "content",
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      await expect(
        route.generateMetadata({
          params,
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.getPublicTenantConfig).toHaveBeenCalledWith("clay-house");
    });
    it.each([undefined, true])(
      "keeps pages available when visible is %s",
      async (visible) => {
        setPages({
          [pageKey]: {
            visible,
          },
        });
        await expect(
          route.default({
            params,
            children: "content",
          }),
        ).resolves.toBeTruthy();
        await expect(
          route.generateMetadata({
            params,
          }),
        ).resolves.toHaveProperty("title");
      },
    );
    it("does not hide the page when another page is hidden", async () => {
      setPages({
        [pageKey === "help" ? "book" : "help"]: {
          visible: false,
        },
      });
      await expect(
        route.default({
          params,
          children: "content",
        }),
      ).resolves.toBeTruthy();
    });
  },
);
describe.each([
  ["/courses", courses],
  ["/courses/product", courseDetail],
])("shared course visibility for %s", (_pathname, route) => {
  it("returns not found for page and metadata when customer Courses is disabled", async () => {
    mocks.getPublicTenantConfig.mockResolvedValue({
      tenant: {
        slug: "clay-house",
        publicCapabilities: {
          courses: true,
        },
        publicSite: {
          pages: {
            courses: {
              visible: true,
            },
          },
          customerPortal: {
            pages: {
              courses: {
                enabled: false,
              },
            },
          },
        },
      },
      notFound: false,
      unavailable: false,
    });
    await expect(
      route.default({
        params,
        children: "content",
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(
      route.generateMetadata({
        params,
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
