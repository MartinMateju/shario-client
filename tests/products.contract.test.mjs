import assert from "node:assert/strict";
import test from "node:test";

import {
  OPEN_STUDIO_BOOKING_MODE,
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
} from "../src/lib/features/products/products.contract.mjs";

test("exposes exactly five canonical tenant product kinds and tabs", () => {
  assert.deepEqual(Object.values(PRODUCT_KIND), [
    "open-studio",
    "class",
    "membership",
    "voucher",
    "private-studio",
  ]);
  assert.deepEqual(PRODUCT_CATEGORY_KEYS, [
    "openStudio",
    "classes",
    "memberships",
    "vouchers",
    "privateStudio",
  ]);
});

test("normalizes identifiers and dual-reads the workshop product as Open Studio", () => {
  const source = {
    id: "product-1",
    name: "Open studio",
    type: "private-workshop",
  };
  const product = normalizeProductRecord(source);

  assert.deepEqual(product, {
    id: "product-1",
    _id: "product-1",
    name: "Open studio",
    type: "private-workshop",
    kind: "open-studio",
    locationId: null,
    bookingMode: "private",
  });
  assert.notEqual(product, source);
});

test("does not silently classify ambiguous legacy records", () => {
  assert.equal(normalizeProductKind("service"), "");
  assert.equal(normalizeProductKind("system"), "");
  assert.equal(normalizeProductKind("physical-product"), "");
  assert.equal(getProductCategoryKey("service"), "legacy");
  assert.deepEqual(
    normalizeProductRecord({ _id: "legacy-1", type: "service" }),
    {
      _id: "legacy-1",
      id: "legacy-1",
      type: "service",
    },
  );
});

test("maps legacy course, workshop, voucher and blocker records intentionally", () => {
  assert.equal(normalizeProductKind("public-workshop"), "open-studio");
  assert.equal(getProductBookingMode({ type: "public-workshop" }), "public");
  assert.equal(normalizeProductKind("private-course"), "class");
  assert.equal(normalizeProductKind("coupon"), "voucher");
  assert.equal(normalizeProductKind("blocker"), "private-studio");
  assert.equal(getProductTypeTranslationKey("workshop"), "openStudio");
  assert.equal(getProductCategoryKey("course"), "classes");
  assert.equal(getProductAvailabilityKey("blocker"), "internal");
  assert.equal(isPublicProductType("blocker"), false);
});

test("keeps Open Studio booking mode separate from Private Studio kind", () => {
  assert.equal(
    getProductBookingMode({ kind: "open-studio", bookingMode: "private" }),
    OPEN_STUDIO_BOOKING_MODE.PRIVATE,
  );
  assert.equal(
    normalizeProductKind({ kind: "open-studio", bookingMode: "private" }),
    PRODUCT_KIND.OPEN_STUDIO,
  );
  assert.equal(normalizeProductKind("private-studio"), "private-studio");
});

test("accepts old URL tab aliases while emitting canonical categories", () => {
  assert.equal(normalizeProductCategory("studioAccess"), "openStudio");
  assert.equal(normalizeProductCategory("classesEvents"), "classes");
  assert.equal(normalizeProductCategory("privateStudio"), "privateStudio");
  assert.equal(normalizeProductCategory("retail"), "");
});

test("normalizes paginated, legacy array and malformed responses", () => {
  assert.deepEqual(
    normalizeProductsResponse({
      products: [
        { id: "one", kind: "class" },
        { _id: "two", type: "workshop" },
      ],
    }).map((product) => [product.id, product.kind]),
    [
      ["one", "class"],
      ["two", "open-studio"],
    ],
  );
  assert.deepEqual(normalizeProductsResponse({ products: "invalid" }), []);
  assert.deepEqual(normalizeProductsResponse([null, "invalid", []]), []);
});
