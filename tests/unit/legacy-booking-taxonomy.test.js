import { describe, expect, it } from "vitest";
import {
  getBookingProductLabel,
  getOrderProductTypeLabel,
  getPublicClassProducts,
  isClassProduct,
  isOpenStudioBooking,
  isPrivateStudioBooking,
  normalizeBookingMode,
  normalizeBookingProductKind,
} from "@/utils/productBookingLabels";
describe("legacy booking surface taxonomy", () => {
  it.each([
    [
      {
        kind: "open-studio",
      },
      "open-studio",
    ],
    [
      {
        tag: "workshop",
      },
      "open-studio",
    ],
    [
      {
        type: "private-workshop",
      },
      "open-studio",
    ],
    [
      {
        kind: "class",
      },
      "class",
    ],
    [
      {
        tag: "course",
      },
      "class",
    ],
    [
      {
        tag: "private-session",
      },
      "private-studio",
    ],
    [
      {
        type: "blocker",
      },
      "private-studio",
    ],
  ])("dual-reads %j as %s", (record, expected) => {
    expect(normalizeBookingProductKind(record)).toBe(expected);
  });
  it("keeps fixed Open Studio mode independent from the guest count", () => {
    expect(
      normalizeBookingMode({
        kind: "open-studio",
        bookingMode: "public",
        numberOfGuests: 8,
      }),
    ).toBe("public");
    expect(
      normalizeBookingMode({
        kind: "open-studio",
        bookingMode: "private",
        numberOfGuests: 1,
      }),
    ).toBe("private");
  });
  it("gives each canonical booking kind an unambiguous display name", () => {
    expect(
      getBookingProductLabel(
        {
          tag: "workshop",
          bookingMode: "public",
        },
        "EN",
      ),
    ).toBe("Shared Open Studio");
    expect(
      getBookingProductLabel(
        {
          tag: "workshop",
          bookingMode: "private",
        },
        "EN",
      ),
    ).toBe("Exclusive Open Studio");
    expect(
      getBookingProductLabel(
        {
          tag: "course",
        },
        "EN",
      ),
    ).toBe("Class");
    expect(
      getBookingProductLabel(
        {
          tag: "private-session",
        },
        "EN",
      ),
    ).toBe("Private Studio");
  });
  it("uses canonical labels while retaining legacy order filter values", () => {
    expect(getOrderProductTypeLabel("public-workshop", "EN")).toBe(
      "Shared Open Studio",
    );
    expect(getOrderProductTypeLabel("private-workshop", "EN")).toBe(
      "Exclusive Open Studio",
    );
    expect(getOrderProductTypeLabel("public-course", "EN")).toBe(
      "Class · public",
    );
    expect(getOrderProductTypeLabel("blocker", "EN")).toBe("Private Studio");
  });
  it("keeps Class and Private Studio separate from Open Studio", () => {
    expect(
      isClassProduct({
        type: "course",
      }),
    ).toBe(true);
    expect(
      isOpenStudioBooking({
        tag: "workshop",
      }),
    ).toBe(true);
    expect(
      isPrivateStudioBooking({
        tag: "private-session",
      }),
    ).toBe(true);
    expect(
      isOpenStudioBooking({
        tag: "private-session",
      }),
    ).toBe(false);
  });
  it("lets the legacy Class modal read canonical and legacy public products", () => {
    expect(
      getPublicClassProducts([
        {
          id: "canonical",
          kind: "class",
        },
        {
          id: "legacy",
          type: "public-course",
        },
        {
          id: "compat",
          type: "course",
        },
        {
          id: "private",
          type: "private-course",
        },
        {
          id: "hidden",
          kind: "class",
          visibility: "private",
        },
        {
          id: "inactive",
          kind: "class",
          isActive: false,
        },
        {
          id: "open-studio",
          kind: "open-studio",
        },
      ]).map((product) => product.id),
    ).toEqual(["canonical", "legacy", "compat"]);
  });
});
