import { describe, expect, it } from "vitest";
import { getOpenStudioProductsAtLocation } from "@/components/products/products.utils";
import {
  getProductLocationId,
  isProductAvailableAtLocation,
  normalizeProductRecord,
} from "@/lib/features/products/products.contract.mjs";

describe("product location boundaries", () => {
  it("counts inactive and legacy Open Studio products only at their own location", () => {
    const products = [
      { id: "active", kind: "open-studio", locationId: "a" },
      { id: "inactive", kind: "open-studio", locationId: "a", isActive: false },
      { id: "legacy", type: "private-workshop", location: { _id: "a" } },
      { id: "other", kind: "open-studio", locationId: "b" },
      { id: "unassigned", kind: "open-studio" },
      {
        id: "archived",
        kind: "open-studio",
        locationId: "a",
        isArchived: true,
      },
      { id: "class", kind: "class", type: "workshop", locationId: "a" },
      { id: "internal", kind: "private-studio", locationId: "a" },
    ];
    expect(
      getOpenStudioProductsAtLocation(products, "a").map(({ id }) => id),
    ).toEqual(["active", "inactive", "legacy"]);
    expect(
      getOpenStudioProductsAtLocation(products, "a", {
        excludeProductId: "active",
      }).map(({ id }) => id),
    ).toEqual(["inactive", "legacy"]);
    expect(getOpenStudioProductsAtLocation(products, "")).toEqual([]);
  });
  it.each([
    "open-studio",
    "private-studio",
    "workshop",
    "private-workshop",
    "blocker",
  ])(
    "scopes %s to one location and excludes unassigned records from new bookings",
    (kind) => {
      expect(
        isProductAvailableAtLocation(
          { type: kind, locationId: "grohova" },
          "grohova",
        ),
      ).toBe(true);
      expect(
        isProductAvailableAtLocation(
          { type: kind, locationId: "grohova" },
          "other",
        ),
      ).toBe(false);
      expect(isProductAvailableAtLocation({ type: kind }, "grohova")).toBe(
        false,
      );
      expect(isProductAvailableAtLocation({ type: kind }, "")).toBe(false);
    },
  );
  it.each(["class", "voucher", "membership"])(
    "preserves business-wide %s products",
    (kind) => {
      expect(isProductAvailableAtLocation({ kind }, "grohova")).toBe(true);
      expect(isProductAvailableAtLocation({ kind }, "other")).toBe(true);
    },
  );
  it("normalizes location references without altering historical data", () => {
    const original = {
      _id: "historic",
      type: "workshop",
      location: { _id: "grohova", name: "Grohova" },
      price: 125,
    };
    expect(getProductLocationId(original)).toBe("grohova");
    expect(normalizeProductRecord(original)).toMatchObject({
      id: "historic",
      locationId: "grohova",
      price: 125,
    });
    expect(original).not.toHaveProperty("locationId");
  });
});
