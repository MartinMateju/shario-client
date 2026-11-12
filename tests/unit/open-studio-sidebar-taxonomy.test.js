import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  findOpenStudioProduct,
  getBookingDrawerCartFields,
  getBookingDrawerSelection,
  getOpenStudioBookingFields,
  getOpenStudioProducts,
} from "@/components/sidebars/openStudioBooking.utils";

describe("legacy Open Studio drawer taxonomy", () => {
  const products = [
    { id: "shared", kind: "open-studio", bookingMode: "public" },
    { id: "exclusive", type: "private-workshop" },
    { id: "legacy-shared", type: "workshop" },
    { id: "class", kind: "class" },
    { id: "legacy-class", type: "course" },
    { id: "voucher", kind: "voucher" },
    { id: "private-studio", kind: "private-studio" },
    { id: "legacy-blocker", type: "blocker" },
    { id: "inactive", kind: "open-studio", isActive: false },
  ];

  it("only offers active Open Studio products while dual-reading workshop records", () => {
    expect(
      getOpenStudioProducts(products).map((product) => product.id),
    ).toEqual(["shared", "exclusive", "legacy-shared"]);
  });

  it("restores an exact product before falling back to the requested mode", () => {
    expect(
      findOpenStudioProduct(products, {
        productId: "shared",
        bookingMode: "private",
      })?.id,
    ).toBe("shared");
    expect(
      findOpenStudioProduct(products, { bookingMode: "private" })?.id,
    ).toBe("exclusive");
  });

  it("emits canonical bookingMode plus the rollout bookingType alias", () => {
    expect(
      getOpenStudioBookingFields({
        kind: "open-studio",
        bookingMode: "public",
      }),
    ).toEqual({ bookingMode: "public", bookingType: "public" });
    expect(getOpenStudioBookingFields({ type: "private-workshop" })).toEqual({
      bookingMode: "private",
      bookingType: "private",
    });
  });

  it("keeps party size out of booking-mode selection in the drawer integration", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/sidebars/Sidebar.js"),
      "utf8",
    );

    expect(source).toContain(
      "getOpenStudioBookingFields(product, selectedBookingMode)",
    );
    expect(source).toContain("bookingMode,");
    expect(source).toContain("bookingType: bookingMode");
    expect(source).not.toContain("setBookingType");
    expect(source).not.toContain("nextGuests > 1");
    expect(source).not.toContain("workshopProducts");
  });

  it("restores a legacy courseSessionId prefill as a Class cart item only", () => {
    const selected = getBookingDrawerSelection(products, {
      courseSessionId: "session-1",
      productId: "legacy-class",
      bookingMode: "private",
    });

    expect(selected.flow).toBe("class");
    expect(selected.product?.id).toBe("legacy-class");
    expect(selected.availableProducts.map((product) => product.id)).toEqual([
      "class",
      "legacy-class",
    ]);
    expect(
      getBookingDrawerCartFields({
        flow: selected.flow,
        courseSessionId: "session-1",
        bookingMode: "private",
      }),
    ).toEqual({
      kind: "class",
      bookingCourse: "session-1",
      bookingRef: "session-1",
    });

    const normalFlow = getBookingDrawerSelection(products, {
      productId: "legacy-class",
    });
    expect(normalFlow.flow).toBe("open-studio");
    expect(normalFlow.availableProducts.map((product) => product.id)).toEqual([
      "shared",
      "exclusive",
      "legacy-shared",
    ]);
  });
});
