import { normalizeProductsResponse } from "./products.contract.mjs";

const PUBLIC_COURSE_PAGE_SIZE = 100;
const MAX_PUBLIC_COURSE_PAGE_COUNT = 10_000;

export const collectPublicCourseProducts = async ({
  baseQuery,
  buildRequest,
}) => {
  const products = [];
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PUBLIC_COURSE_PAGE_COUNT; page += 1) {
    const result = await baseQuery(buildRequest(page, PUBLIC_COURSE_PAGE_SIZE));

    if (result.error) return { error: result.error };

    const pageProducts = normalizeProductsResponse(result.data);
    let addedProductCount = 0;
    for (const product of pageProducts) {
      if (product.id && seenIds.has(product.id)) continue;
      if (product.id) seenIds.add(product.id);
      products.push(product);
      addedProductCount += 1;
    }

    if (
      pageProducts.length < PUBLIC_COURSE_PAGE_SIZE ||
      (page > 1 && addedProductCount === 0)
    ) {
      return { data: products };
    }
  }

  return {
    error: {
      status: "CUSTOM_ERROR",
      error: "Public course catalog exceeded the supported page limit.",
    },
  };
};
