import { describe, expect, it } from "vitest";

import {
  getPublicCatalogProductKind,
  getPublicProductHref,
  getPublicProductRoute,
  isPublicCatalogProduct,
} from "@/components/public-tenant/publicProductTaxonomy";

describe("public product routing taxonomy", () => {
  it("maps each sellable kind to one unambiguous customer route", () => {
    expect(getPublicCatalogProductKind("book")).toBe("open-studio");
    expect(getPublicCatalogProductKind("courses")).toBe("class");
    expect(getPublicCatalogProductKind("vouchers")).toBe("voucher");

    expect(getPublicProductRoute({ kind: "open-studio" })).toBe("book");
    expect(getPublicProductRoute({ kind: "class" })).toBe("courses");
    expect(getPublicProductRoute({ kind: "voucher" })).toBe("vouchers");
  });

  it("dual-reads legacy product types into their canonical public catalog", () => {
    expect(isPublicCatalogProduct({ type: "workshop" }, "book")).toBe(true);
    expect(isPublicCatalogProduct({ type: "private-workshop" }, "book")).toBe(
      true,
    );
    expect(isPublicCatalogProduct({ type: "course" }, "courses")).toBe(true);
    expect(isPublicCatalogProduct({ type: "private-course" }, "courses")).toBe(
      true,
    );
    expect(isPublicCatalogProduct({ type: "coupon" }, "vouchers")).toBe(true);
    expect(isPublicCatalogProduct({ type: "gift-card" }, "vouchers")).toBe(
      true,
    );
  });

  it("keeps each route isolated and never exposes internal Private Studio", () => {
    expect(isPublicCatalogProduct({ kind: "class" }, "book")).toBe(false);
    expect(isPublicCatalogProduct({ kind: "voucher" }, "book")).toBe(false);
    expect(isPublicCatalogProduct({ kind: "private-studio" }, "book")).toBe(
      false,
    );
    expect(isPublicCatalogProduct({ type: "blocker" }, "book")).toBe(false);
    expect(
      isPublicCatalogProduct({ kind: "open-studio", isActive: false }, "book"),
    ).toBe(false);
  });

  it("builds encoded links only for routable public kinds", () => {
    expect(
      getPublicProductHref({ id: "open studio/1", kind: "open-studio" }),
    ).toBe("/book/open%20studio%2F1");
    expect(getPublicProductHref({ id: "class-1", type: "course" })).toBe(
      "/courses/class-1",
    );
    expect(
      getPublicProductHref({ id: "private", kind: "private-studio" }),
    ).toBe("");
  });
});
