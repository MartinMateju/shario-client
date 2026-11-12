import { describe, expect, it } from "vitest";

import { handleCustomerPortalFixtureRequest } from "../../e2e/visual/customer-portal-fixture.mjs";
import { getOpenStudioProducts } from "@/components/sidebars/openStudioBooking.utils";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import {
  getProductDescription,
  getProductName,
} from "@/components/products/products.utils";

const BRNO = "64b000000000000000000021";
const PRAGUE = "64b000000000000000000022";

async function getFixture(path) {
  let status;
  let payload;
  await handleCustomerPortalFixtureRequest(
    { method: "GET", url: path, headers: {} },
    {
      writeHead: (code) => {
        status = code;
      },
      end: (body) => {
        payload = JSON.parse(body);
      },
    },
  );
  expect(status).toBe(200);
  return payload;
}

describe("customer portal catalog fixture", () => {
  it("serves a published voucher offer for the authenticated shop", async () => {
    const { products } = await getFixture(
      "/public/tenants/studio-alpha/vouchers/products",
    );
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      type: "coupon",
      isActive: true,
      hasVoucherDesign: true,
      price: 500,
      currency: "CZK",
    });
    expect(getProductName(products[0], "en")).toBe("Gift of clay");
    expect(getProductName(products[0], "cs")).toBe("Tvoření jako dárek");
    expect(getProductDescription(products[0], "en")).toBe(
      "Studio credit for a creative visit.",
    );
    expect(getProductDescription(products[0], "cs")).toBe(
      "Kredit na tvoření v ateliéru.",
    );
    const catalog = await getFixture("/products/customer-catalog");
    expect(catalog.products.map((product) => product.id)).not.toContain(
      products[0].id,
    );
  });

  it.each([BRNO, PRAGUE])(
    "offers both bookable session types scoped to %s",
    async (locationId) => {
      const { products } = await getFixture(
        `/products/customer-catalog?locationId=${locationId}&limit=100`,
      );
      expect(
        products.every((product) => product.locationId === locationId),
      ).toBe(true);
      const bookable = getOpenStudioProducts(products).filter((product) =>
        isProductAvailableAtLocation(product, locationId),
      );
      expect(bookable.map((product) => product.name.en)).toEqual([
        "Open Studio",
        "Glazing Lab",
      ]);
      expect(bookable.map((product) => product.name.cs)).toEqual([
        "Otevřený ateliér",
        "Glazovací dílna",
      ]);
      const otherLocation = locationId === BRNO ? PRAGUE : BRNO;
      expect(
        bookable.some((product) =>
          isProductAvailableAtLocation(product, otherLocation),
        ),
      ).toBe(false);
    },
  );

  it("keeps an unscoped catalog complete with distinct product identities per studio", async () => {
    const { products } = await getFixture(
      "/products/customer-catalog?limit=100",
    );
    expect(products).toHaveLength(5);
    expect(new Set(products.map((product) => product.id)).size).toBe(5);
    const catalogs = await Promise.all(
      [BRNO, PRAGUE].map((locationId) =>
        getFixture(`/products/customer-catalog?locationId=${locationId}`),
      ),
    );
    const allScopedIds = catalogs.flatMap(({ products }) =>
      products.map((product) => product.id),
    );
    expect(new Set(allScopedIds)).toEqual(
      new Set(products.map((product) => product.id)),
    );
    expect(allScopedIds).toHaveLength(products.length);
    for (const locationId of [BRNO, PRAGUE]) {
      const { bookings } = await getFixture(
        `/bookings/mine?locationId=${locationId}&limit=20`,
      );
      expect(bookings.length).toBeGreaterThan(0);
      for (const booking of bookings) {
        const product = products.find(
          (product) => product.id === booking.product.id,
        );
        expect(
          product,
          "Booking history must resolve its original product.",
        ).toBeDefined();
        expect(product.locationId).toBe(locationId);
      }
    }
  });

  it("does not expose another studio's products for an unknown location", async () => {
    expect(
      await getFixture("/products/customer-catalog?locationId=unknown-studio"),
    ).toEqual({ products: [] });
  });
});
