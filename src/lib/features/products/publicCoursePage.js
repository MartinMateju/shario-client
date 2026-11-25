import { isPublicCatalogProduct } from "@/components/public-tenant/publicProductTaxonomy";
import { normalizeProductsResponse } from "./products.contract.mjs";

export const PUBLIC_COURSE_PAGE_SIZE = 100;
export const MAX_PUBLIC_COURSE_PAGE_COUNT = 10_000;

export function normalizePublicCoursePage(response) {
  const source = Array.isArray(response) ? response : response?.products || [];
  const normalized = normalizeProductsResponse(response);
  return {
    products: normalized.filter((product) =>
      isPublicCatalogProduct(product, "courses"),
    ),
    // Pagination follows the response page, not the displayed/valid subset.
    hasMore: source.length >= PUBLIC_COURSE_PAGE_SIZE,
    sourceIds: normalized.map((product) => product.id).filter(Boolean),
  };
}

export function nextPublicCoursePage(lastPage, pages, lastPageParam) {
  if (!lastPage.hasMore) return undefined;
  const previousIds = new Set(
    pages.slice(0, -1).flatMap((page) => page.sourceIds),
  );
  if (
    pages.length > 1 &&
    lastPage.sourceIds.length &&
    lastPage.sourceIds.every((id) => previousIds.has(id))
  ) {
    return undefined;
  }
  return lastPageParam + 1;
}

export function flattenPublicCoursePages(data) {
  if (!data) return undefined;
  const seen = new Set();
  return data.pages
    .flatMap((page) => page.products)
    .filter((product) => {
      if (product.id && seen.has(product.id)) return false;
      if (product.id) seen.add(product.id);
      return true;
    });
}
