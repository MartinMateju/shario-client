import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
}));

import { isPublicCatalogProduct } from "@/components/public-tenant/publicProductTaxonomy";

describe("public catalog selection preservation", () => {
  it("restores the selection through an opaque server-issued intent", () => {
    const detailSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/public-tenant/PublicBookingProductDetailPage.js",
      ),
      "utf8",
    );

    expect(detailSource).toContain("useCreatePublicBookingIntentMutation");
    expect(detailSource).toContain("productId,");
    expect(detailSource).toContain("locationId: selectedSlotLocationId");
    expect(detailSource).toContain("courseSessionId,");
    expect(detailSource).toMatch(
      /const effectiveQuantity = openStudio\s*\? Math\.min\(quantity, maxGuests\)\s*: quantity;/,
    );
    expect(detailSource).toContain("numberOfGuests: effectiveQuantity");
    expect(detailSource).toContain(
      "quantity: course ? courseQuantity : effectiveQuantity",
    );
    expect(detailSource).toContain(
      "`/portal/booking/confirm?intent=${encodeURIComponent(",
    );
    expect(detailSource).not.toContain(
      "parsePublicBookingIntent(searchParams)",
    );
  });

  it("does not render a product on the wrong kind of public detail route", () => {
    expect(isPublicCatalogProduct({ type: "public-course" }, "courses")).toBe(
      true,
    );
    expect(isPublicCatalogProduct({ type: "public-course" }, "book")).toBe(
      false,
    );
    expect(isPublicCatalogProduct({ type: "public-workshop" }, "book")).toBe(
      true,
    );
    expect(isPublicCatalogProduct({ type: "public-workshop" }, "courses")).toBe(
      false,
    );
  });

  it("links catalog cards to encoded product detail routes", () => {
    const catalogSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/public-tenant/PublicProductCatalogPage.js",
      ),
      "utf8",
    );

    const taxonomySource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/public-tenant/publicProductTaxonomy.js",
      ),
      "utf8",
    );

    expect(catalogSource).toContain("getPublicProductHref(product)");
    expect(taxonomySource).toContain("`/${route}/${encodeURIComponent(id)}`");
    expect(taxonomySource).toContain('[PRODUCT_KIND.OPEN_STUDIO]: "book"');
    expect(taxonomySource).toContain('[PRODUCT_KIND.CLASS]: "courses"');
    expect(catalogSource).toContain("getProductId(product)");
  });

  it("preserves the chosen membership plan and version in the login return URL", () => {
    const membershipSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/memberships/PublicMembershipCatalog.js",
      ),
      "utf8",
    );

    expect(membershipSource).toContain(
      'nextSearch.set("planId", getEntityId(plan))',
    );
    expect(membershipSource).toContain(
      'nextSearch.set("planVersionId", getEntityId(getPlanVersion(plan)))',
    );
    expect(membershipSource).toContain(
      'customerContext ? "/portal/membership/plans" : "/memberships"',
    );
    expect(membershipSource).toContain("?${nextSearch.toString()}`)");
  });
});
