import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  PRODUCT_CATEGORY_KEYS,
  PRODUCT_KIND,
  getProductAvailabilityKey,
  getProductBookingMode,
  getProductCategoryKey,
  getProductLocationId,
  getProductTypeTranslationKey,
  isPublicProductType,
  normalizeProductCategory,
  normalizeProductKind,
} from "@/lib/features/products/products.contract.mjs";
import { formatMajorCurrencyAmount } from "@/utils/money";

export const PRODUCT_CATEGORIES = PRODUCT_CATEGORY_KEYS;

export const PRODUCT_FORM_TYPES = Object.freeze({
  openStudio: Object.freeze([PRODUCT_KIND.OPEN_STUDIO]),
  classes: Object.freeze([PRODUCT_KIND.CLASS]),
  vouchers: Object.freeze([PRODUCT_KIND.VOUCHER]),
  privateStudio: Object.freeze([PRODUCT_KIND.PRIVATE_STUDIO]),
  // Memberships use the plan manager. Legacy generic membership records are
  // edit-only and their derived kind is injected by getProductFormTypes.
  legacy: Object.freeze([]),
});

const SETUP_TEMPLATE_SECTIONS = Object.freeze({
  open_studio: "openStudio",
  "open-studio": "openStudio",
  course: "classes",
  workshop: "openStudio",
  class: "classes",
  voucher: "vouchers",
  membership: "memberships",
  private_session: "openStudio",
  private_studio: "privateStudio",
  "private-studio": "privateStudio",
});

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const getProductId = (product) =>
  String(product?.id || product?._id || "").trim();

export const getProductName = (product, locale = "en") => {
  if (!product?.name) return "—";

  if (typeof product.name === "object") {
    const key = locale === "cs" ? "CZ" : "EN";
    return product.name[key] || product.name.CZ || product.name.EN || "—";
  }

  return String(product.name);
};

export const getProductDescription = (product, locale = "en") => {
  if (!product?.description) return "";

  if (typeof product.description === "object") {
    const key = locale === "cs" ? "CZ" : "EN";
    return (
      product.description[key] ||
      product.description.CZ ||
      product.description.EN ||
      ""
    );
  }

  return String(product.description);
};

export const getProductKind = (product) => normalizeProductKind(product);

export const getProductTypeKey = (product) =>
  getProductTypeTranslationKey(product);

export const getProductCategory = (product) => getProductCategoryKey(product);

export const getOpenStudioProductsAtLocation = (
  products,
  locationId,
  { excludeProductId = "" } = {},
) => {
  const selectedLocationId = String(locationId || "").trim();
  if (!selectedLocationId || !Array.isArray(products)) return [];

  return products.filter(
    (product) =>
      normalizeProductKind(product) === PRODUCT_KIND.OPEN_STUDIO &&
      getProductLocationId(product) === selectedLocationId &&
      !product.isArchived &&
      (!excludeProductId || getProductId(product) !== excludeProductId),
  );
};

export const getOpenStudioBookingMode = (product) =>
  getProductBookingMode(product);

export const getAvailabilityKey = (product) =>
  getProductAvailabilityKey(product);

/**
 * Generic membership products predate the plan manager. They stay editable
 * beside real plans, but cannot be created through the product dialog.
 */
export const isLegacyCatalogProduct = (product) =>
  !getProductKind(product) ||
  (!product?.kind &&
    ["membership", "credit-pack"].includes(
      String(product?.type || "").toLowerCase(),
    ));

export const isPrivateStudioProduct = (product) =>
  getProductKind(product) === PRODUCT_KIND.PRIVATE_STUDIO;

export const isSystemProduct = (product) =>
  String(product?.type || "").toLowerCase() === "system" &&
  !isPrivateStudioProduct(product);

export const isProductActive = (product) => product?.isActive !== false;

export const isProductBookableOnline = (product) =>
  isProductActive(product) &&
  [PRODUCT_KIND.OPEN_STUDIO, PRODUCT_KIND.CLASS, PRODUCT_KIND.VOUCHER].includes(
    getProductKind(product),
  ) &&
  isPublicProductType(product);

export const needsProductAttention = (product) => {
  const price = Number(product?.price);

  return (
    getProductName(product) === "—" ||
    !getProductKind(product) ||
    (!isPrivateStudioProduct(product) &&
      (!Number.isFinite(price) || price <= 0))
  );
};

export const formatProductPrice = (product, locale = "en") => {
  if (isPrivateStudioProduct(product)) return "—";

  const value = Number(product?.price || 0);
  const currency = String(
    product?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
  ).toUpperCase();

  return formatMajorCurrencyAmount(value, currency, locale);
};

export const getCategoryCounts = (products = []) => {
  const counts = Object.fromEntries(
    PRODUCT_CATEGORIES.map((category) => [category, 0]),
  );

  products.forEach((product) => {
    const category = getProductCategory(product);

    if (category in counts) counts[category] += 1;
  });

  return counts;
};

/**
 * Kept under its historical name because call sites consume it as form option
 * codes. Returned values are canonical product kinds, never legacy types.
 */
export const getProductFormTypes = (catalogKind, currentKind) => {
  const canonicalCatalogKind =
    normalizeProductCategory(catalogKind) || catalogKind;
  const allowed =
    PRODUCT_FORM_TYPES[canonicalCatalogKind] || PRODUCT_FORM_TYPES.openStudio;
  const normalizedCurrentKind = normalizeProductKind(currentKind);

  if (!normalizedCurrentKind || allowed.includes(normalizedCurrentKind)) {
    return [...allowed];
  }

  return [normalizedCurrentKind, ...allowed];
};

export const getDefaultProductType = (catalogKind) => {
  const canonicalCatalogKind =
    normalizeProductCategory(catalogKind) || catalogKind;

  return (
    PRODUCT_FORM_TYPES[canonicalCatalogKind]?.[0] || PRODUCT_KIND.OPEN_STUDIO
  );
};

export const resolveCatalogSection = ({
  category,
  productKind,
  productType,
  setupTemplate,
  fallback = "openStudio",
} = {}) => {
  const directSection = normalizeProductCategory(category);
  if (directSection) return directSection;

  const setupSection = SETUP_TEMPLATE_SECTIONS[setupTemplate];
  if (setupSection) return setupSection;

  const kindSection = getProductCategory({
    kind: productKind,
    type: productType,
  });
  if (PRODUCT_CATEGORIES.includes(kindSection)) return kindSection;

  return normalizeProductCategory(fallback) || "openStudio";
};

export const buildProductUpdatePayload = (product, patch = {}) => ({
  id: getProductId(product),
  ...patch,
});
