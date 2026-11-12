import {
  PRODUCT_KIND,
  normalizeProductKind,
} from "@/lib/features/products/products.contract.mjs";

const ROUTE_KIND = Object.freeze({
  book: PRODUCT_KIND.OPEN_STUDIO,
  "open-studio": PRODUCT_KIND.OPEN_STUDIO,
  openStudio: PRODUCT_KIND.OPEN_STUDIO,
  courses: PRODUCT_KIND.CLASS,
  classes: PRODUCT_KIND.CLASS,
  class: PRODUCT_KIND.CLASS,
  vouchers: PRODUCT_KIND.VOUCHER,
  voucher: PRODUCT_KIND.VOUCHER,
});

const KIND_ROUTE = Object.freeze({
  [PRODUCT_KIND.OPEN_STUDIO]: "book",
  [PRODUCT_KIND.CLASS]: "courses",
  [PRODUCT_KIND.VOUCHER]: "vouchers",
});

export const getPublicCatalogProductKind = (routeKind) =>
  ROUTE_KIND[String(routeKind || "").trim()] || "";

export const isPublicCatalogProduct = (product, routeKind) => {
  if (!product || product.isActive === false) return false;

  const expectedKind = getPublicCatalogProductKind(routeKind);
  const productKind = normalizeProductKind(product);

  return Boolean(expectedKind) && productKind === expectedKind;
};

export const getPublicProductRoute = (product) =>
  KIND_ROUTE[normalizeProductKind(product)] || "";

export const getPublicProductHref = (product) => {
  const route = getPublicProductRoute(product);
  const id = String(product?.id ?? product?._id ?? "").trim();

  return route && id ? `/${route}/${encodeURIComponent(id)}` : "";
};
