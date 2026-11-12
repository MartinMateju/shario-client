import { describe, expect, it } from "vitest";

import {
  PRODUCT_CATEGORIES,
  getCategoryCounts,
  getDefaultProductType,
  getProductFormTypes,
  isLegacyCatalogProduct,
  isProductBookableOnline,
  resolveCatalogSection,
} from "@/components/products/products.utils";

describe("product catalog architecture", () => {
  it("keeps the owner-facing catalog to the five supported kinds", () => {
    expect(PRODUCT_CATEGORIES).toEqual([
      "openStudio",
      "classes",
      "memberships",
      "vouchers",
      "privateStudio",
    ]);
  });

  it("counts canonical and intentional legacy mappings without guessing", () => {
    expect(
      getCategoryCounts([
        { kind: "open-studio" },
        { type: "workshop" },
        { kind: "class" },
        { type: "private-course" },
        { kind: "membership" },
        { type: "coupon" },
        { kind: "private-studio" },
        { type: "blocker" },
        { type: "service" },
        { type: "system" },
      ]),
    ).toEqual({
      openStudio: 2,
      classes: 2,
      memberships: 1,
      vouchers: 1,
      privateStudio: 2,
    });
  });

  it("provides one canonical write kind for each product form", () => {
    expect(getProductFormTypes("openStudio")).toEqual(["open-studio"]);
    expect(getProductFormTypes("studioAccess")).toEqual(["open-studio"]);
    expect(getProductFormTypes("classes")).toEqual(["class"]);
    expect(getProductFormTypes("classesEvents")).toEqual(["class"]);
    expect(getProductFormTypes("vouchers")).toEqual(["voucher"]);
    expect(getProductFormTypes("privateStudio")).toEqual(["private-studio"]);
    expect(getDefaultProductType("vouchers")).toBe("voucher");
  });

  it("keeps ambiguous and generic membership records in read/retire legacy UI", () => {
    expect(getProductFormTypes("legacy", "membership")).toEqual(["membership"]);
    expect(isLegacyCatalogProduct({ type: "service" })).toBe(true);
    expect(isLegacyCatalogProduct({ type: "physical-product" })).toBe(true);
    expect(isLegacyCatalogProduct({ type: "membership" })).toBe(true);
    expect(
      isProductBookableOnline({ type: "membership", isActive: true }),
    ).toBe(false);
    expect(isLegacyCatalogProduct({ type: "workshop" })).toBe(false);
    expect(isLegacyCatalogProduct({ kind: "private-studio" })).toBe(false);
  });

  it("resolves canonical, old URL, setup-center and legacy deep links", () => {
    expect(resolveCatalogSection({ category: "memberships" })).toBe(
      "memberships",
    );
    expect(resolveCatalogSection({ category: "studioAccess" })).toBe(
      "openStudio",
    );
    expect(resolveCatalogSection({ category: "classesEvents" })).toBe(
      "classes",
    );
    expect(resolveCatalogSection({ setupTemplate: "course" })).toBe("classes");
    expect(resolveCatalogSection({ setupTemplate: "workshop" })).toBe(
      "openStudio",
    );
    expect(resolveCatalogSection({ productKind: "voucher" })).toBe("vouchers");
    expect(resolveCatalogSection({ productType: "workshop" })).toBe(
      "openStudio",
    );
    expect(
      resolveCatalogSection({ category: "retail", fallback: "studioAccess" }),
    ).toBe("openStudio");
  });
});
