import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("public vouchers contract", () => {
  it("owns an anonymous public-foundation route and capability gate", () => {
    const route = read(
      "src/app/[locale]/tenants/[tenantSlug]/(public-foundation)/vouchers/page.js",
    );
    const page = read(
      "src/components/public-tenant/PublicVoucherCatalogPage.js",
    );

    expect(route).toContain("PublicVoucherCatalogPage");
    expect(route).not.toContain("portal");
    expect(page).toContain('PublicCapabilityGate capability="vouchers"');
    expect(page).toContain(
      "skip: previewMode || !tenantSlug || !vouchersEnabled",
    );
    expect(page).not.toContain("redeemPromoCode");
    expect(page).not.toContain("getUserRedeemedCoupons");
    expect(page).toContain('product?.type || ""');
    expect(page).toContain("product?.voucherTemplate");
    expect(page).toContain("Number(product?.price) > 0");
  });

  it("uses credential-free transport for public listing and checkout", () => {
    const source = read("src/lib/features/coupons/couponsApiSlice.js");

    expect(source).toContain('credentials: "omit"');
    expect(source).toContain('getPublicCouponPath(tenantSlug, "products")');
    expect(source).toContain('getPublicCouponPath(tenantSlug, "checkout")');
    expect(source).not.toContain('credentials: "include"');
  });

  it("does not start public catalog queries for disabled capabilities", () => {
    const products = read(
      "src/components/public-tenant/PublicProductCatalogPage.js",
    );
    const help = read("src/components/public-tenant/PublicHelpPage.js");

    expect(products).toContain("!capabilityEnabled");
    expect(help).toContain("!tenantSlug || !helpEnabled");
  });

  it("allows tenants to choose gift vouchers as the public primary action", () => {
    const fields = read(
      "src/components/public-site-editor/PublicSiteEditorFields.js",
    );
    const editorUtils = read(
      "src/components/public-site-editor/publicSiteEditor.utils.js",
    );

    expect(fields).toContain(
      '["auto", "book", "courses", "memberships", "vouchers"]',
    );
    expect(editorUtils).toContain('"vouchers",');
  });
});
