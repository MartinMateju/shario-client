import { describe, expect, it } from "vitest";

import {
  PRODUCT_CATEGORY_KEYS,
  PRODUCT_KIND,
  getProductAvailabilityKey,
  getProductBookingMode,
  getProductCategoryKey,
  getProductTypeTranslationKey,
  isPublicProductType,
  normalizeProductCategory,
  normalizeProductKind,
  normalizeProductRecord,
  normalizeProductsResponse,
} from "@/lib/features/products/products.contract.mjs";

describe("product DTO normalization", () => {
  it("normalizes identifiers and enriches intentional legacy mappings", () => {
    const canonical = { id: "product-1", kind: "class", name: "Wheel" };
    const normalized = normalizeProductRecord(canonical);

    expect(normalized).toEqual({
      id: "product-1",
      _id: "product-1",
      kind: "class",
      name: "Wheel",
    });
    expect(normalized).not.toBe(canonical);
    expect(
      normalizeProductRecord({ _id: "legacy-1", type: "workshop" }),
    ).toMatchObject({
      id: "legacy-1",
      _id: "legacy-1",
      kind: "open-studio",
      bookingMode: "public",
    });
  });

  it("does not silently infer ambiguous legacy types", () => {
    expect(normalizeProductRecord({ type: "service" })).toEqual({
      type: "service",
    });
    expect(normalizeProductKind("system")).toBe("");
    expect(normalizeProductKind("physical-product")).toBe("");
    expect(normalizeProductRecord(null)).toBeNull();
    expect(normalizeProductRecord([])).toBeNull();
  });

  it("normalizes paginated, array, malformed, and mixed responses", () => {
    expect(
      normalizeProductsResponse({
        products: [
          { id: "one", kind: "voucher" },
          { _id: "two", type: "private-workshop" },
        ],
      }).map((product) => [product.id, product.kind]),
    ).toEqual([
      ["one", "voucher"],
      ["two", "open-studio"],
    ]);
    expect(normalizeProductsResponse({ products: "invalid" })).toEqual([]);
    expect(normalizeProductsResponse([null, "invalid", []])).toEqual([]);
  });
});

describe("canonical product taxonomy", () => {
  it("exposes the five supported kinds and UI category order", () => {
    expect(Object.values(PRODUCT_KIND)).toEqual([
      "open-studio",
      "class",
      "membership",
      "voucher",
      "private-studio",
    ]);
    expect(PRODUCT_CATEGORY_KEYS).toEqual([
      "openStudio",
      "classes",
      "memberships",
      "vouchers",
      "privateStudio",
    ]);
  });

  it.each([
    ["private-workshop", "openStudio", "openStudio", "onRequest", true],
    ["public-course", "class", "classes", "scheduled", true],
    ["gift-card", "voucher", "vouchers", "always", true],
    ["blocker", "privateStudio", "privateStudio", "internal", false],
    ["service", "other", "legacy", "internal", false],
  ])(
    "maps %s into its translation, category, availability and visibility",
    (type, translation, category, availability, isPublic) => {
      expect(getProductTypeTranslationKey(type)).toBe(translation);
      expect(getProductCategoryKey(type)).toBe(category);
      expect(getProductAvailabilityKey(type)).toBe(availability);
      expect(isPublicProductType(type)).toBe(isPublic);
    },
  );

  it("separates an exclusive Open Studio from an internal Private Studio", () => {
    expect(
      getProductBookingMode({
        kind: "open-studio",
        bookingMode: "private",
      }),
    ).toBe("private");
    expect(normalizeProductKind("private-studio")).toBe("private-studio");
  });

  it("accepts legacy URL categories but canonicalizes them", () => {
    expect(normalizeProductCategory("studioAccess")).toBe("openStudio");
    expect(normalizeProductCategory("classesEvents")).toBe("classes");
    expect(normalizeProductCategory("privateStudio")).toBe("privateStudio");
  });
});
