import { describe, expect, it } from "vitest";

import {
  buildBookingSessionPayload,
  filterSchedulableProducts,
  getSchedulableProductKind,
  isClassSessionProduct,
  isPrivateStudioProduct,
} from "../../src/components/bookings/bookingSessionComposer.utils.js";

describe("booking session product taxonomy", () => {
  it("offers only Class and Private Studio for internal scheduling", () => {
    const products = [
      { id: "class", kind: "class", isActive: true },
      { id: "block", kind: "private-studio", isActive: true },
      { id: "open", kind: "open-studio", isActive: true },
      { id: "voucher", kind: "voucher", isActive: true },
      { id: "archived", kind: "class", isActive: false },
    ];

    expect(filterSchedulableProducts(products).map(({ id }) => id)).toEqual([
      "class",
      "block",
    ]);
    expect(isClassSessionProduct(products[0])).toBe(true);
    expect(isPrivateStudioProduct(products[1])).toBe(true);
  });

  it("dual-reads legacy course and blocker records without exposing workshop", () => {
    expect(getSchedulableProductKind({ type: "course" })).toBe("class");
    expect(getSchedulableProductKind({ type: "private-course" })).toBe("class");
    expect(getSchedulableProductKind({ type: "blocker" })).toBe(
      "private-studio",
    );
    expect(getSchedulableProductKind({ type: "workshop" })).toBe("");
  });

  it("writes the canonical kind in session payloads", () => {
    expect(
      buildBookingSessionPayload({
        dates: ["2026-08-12"],
        startTime: "09:00",
        durationMinutes: 90,
        productId: "product-1",
        locationId: "location-1",
        productKind: "private-studio",
      }),
    ).toMatchObject({
      kind: "private-studio",
      bookingProduct: "product-1",
      startTime: "09:00",
      endTime: "10:30",
    });
  });
});
