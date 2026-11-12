import { describe, expect, it, vi } from "vitest";
import cartReducer, {
  addToCart,
  clearCart,
  closeCart,
  decrementQuantity,
  incrementQuantity,
  openCart,
  removeItem,
  removePieceItems,
  removeBookingItems,
  prunePieceItems,
  selectCheckoutKind,
  selectCartIsOpen,
  selectCurrentCart,
} from "@/lib/features/cart/cartSlice";
const initialState = {
  cart: [],
  isOpen: false,
};
const openStudio = (overrides = {}) => ({
  id: "cart-item-1",
  locationId: "location-a",
  product: {
    _id: "product-a",
    type: "workshop",
  },
  quantity: 1,
  start: "2026-07-23T08:00:00.000Z",
  end: "2026-07-23T09:00:00.000Z",
  ...overrides,
});
describe("cart item identity and normalization", () => {
  it("normalizes Open Studio dates and quantities into serializable values", () => {
    const state = cartReducer(
      initialState,
      addToCart({
        cartItem: openStudio({
          quantity: 0,
          start: new Date("2026-07-23T08:00:00.000Z"),
          end: new Date("2026-07-23T09:00:00.000Z"),
        }),
      }),
    );
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0]).toMatchObject({
      id: "cart-item-1",
      quantity: 1,
      start: Date.parse("2026-07-23T08:00:00.000Z"),
      end: Date.parse("2026-07-23T09:00:00.000Z"),
    });
  });
  it("generates a stable row id and stores null for invalid dates", () => {
    const state = cartReducer(
      initialState,
      addToCart({
        cartItem: openStudio({
          id: undefined,
          start: "invalid",
          end: undefined,
        }),
      }),
    );
    expect(state.cart[0].id).toEqual(expect.any(String));
    expect(state.cart[0].id).not.toBe("");
    expect(state.cart[0].start).toBeNull();
    expect(state.cart[0].end).toBeNull();
  });
  it("ignores malformed add actions", () => {
    expect(cartReducer(initialState, addToCart({}))).toEqual(initialState);
  });
  it("prevents duplicate Open Studio entries at the same location and time", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const once = cartReducer(
      initialState,
      addToCart({
        cartItem: openStudio(),
      }),
    );
    const twice = cartReducer(
      once,
      addToCart({
        cartItem: openStudio({
          id: "cart-item-2",
          quantity: 3,
        }),
      }),
    );
    expect(twice.cart).toHaveLength(1);
    expect(twice.cart[0].quantity).toBe(1);
    expect(warning).toHaveBeenCalledWith(
      "Duplicate Open Studio entry prevented",
    );
  });
  it("allows the same product and time at a different location", () => {
    const once = cartReducer(
      initialState,
      addToCart({
        cartItem: openStudio(),
      }),
    );
    const twice = cartReducer(
      once,
      addToCart({
        cartItem: openStudio({
          id: "cart-item-2",
          locationId: "location-b",
        }),
      }),
    );
    expect(twice.cart.map((item) => item.locationId)).toEqual([
      "location-a",
      "location-b",
    ]);
  });
  it("prevents duplicate Class slots regardless of other row fields", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = openStudio({
      bookingCourse: "course-slot-a",
      id: "course-row-1",
    });
    const second = openStudio({
      bookingCourse: "course-slot-a",
      id: "course-row-2",
      locationId: "location-b",
      product: {
        _id: "product-b",
        type: "course",
      },
    });
    const once = cartReducer(
      initialState,
      addToCart({
        cartItem: first,
      }),
    );
    const twice = cartReducer(
      once,
      addToCart({
        cartItem: second,
      }),
    );
    expect(twice.cart).toHaveLength(1);
    expect(twice.cart[0].id).toBe("course-row-1");
    expect(warning).toHaveBeenCalledWith(
      "Duplicate Class entry prevented:",
      "course-slot-a",
    );
  });
  it("merges guest increases for the same Open Studio booking", () => {
    const first = openStudio({
      id: "guest-row-1",
      bookingWorkshop: "booking-a",
      numberOfGuests: 2,
      quantity: 2,
      product: {
        _id: "guest-product",
        type: "guest-increase",
      },
    });
    const second = openStudio({
      id: "guest-row-2",
      bookingWorkshop: "booking-a",
      numberOfGuests: 3,
      quantity: 4,
      product: {
        _id: "guest-product",
        type: "guest-increase",
      },
    });
    const once = cartReducer(
      initialState,
      addToCart({
        cartItem: first,
      }),
    );
    const twice = cartReducer(
      once,
      addToCart({
        cartItem: second,
      }),
    );
    expect(twice.cart).toHaveLength(1);
    expect(twice.cart[0]).toMatchObject({
      id: "guest-row-2",
      numberOfGuests: 5,
      quantity: 4,
    });
  });
  it("clamps invalid guest counts and quantities while merging", () => {
    const first = openStudio({
      bookingWorkshop: "booking-a",
      numberOfGuests: -2,
      quantity: 0,
      product: {
        _id: "guest-product",
        type: "guest-increase",
      },
    });
    const second = openStudio({
      bookingWorkshop: "booking-a",
      numberOfGuests: "invalid",
      quantity: "invalid",
      product: {
        _id: "guest-product",
        type: "guest-increase",
      },
    });
    const once = cartReducer(
      initialState,
      addToCart({
        cartItem: first,
      }),
    );
    const twice = cartReducer(
      once,
      addToCart({
        cartItem: second,
      }),
    );
    expect(twice.cart[0].numberOfGuests).toBe(0);
    expect(twice.cart[0].quantity).toBe(1);
  });
});
describe("cart mutations and selectors", () => {
  const populated = {
    cart: [
      {
        ...openStudio(),
        start: Date.parse("2026-07-23T08:00:00.000Z"),
        end: Date.parse("2026-07-23T09:00:00.000Z"),
      },
    ],
    isOpen: false,
  };
  it("increments and decrements quantity without going below one", () => {
    const incremented = cartReducer(
      populated,
      incrementQuantity("cart-item-1"),
    );
    const decremented = cartReducer(
      incremented,
      decrementQuantity("cart-item-1"),
    );
    const floored = cartReducer(decremented, decrementQuantity("cart-item-1"));
    expect(incremented.cart[0].quantity).toBe(2);
    expect(decremented.cart[0].quantity).toBe(1);
    expect(floored.cart[0].quantity).toBe(1);
  });
  it("leaves state unchanged for missing quantity targets", () => {
    expect(cartReducer(populated, incrementQuantity("missing"))).toEqual(
      populated,
    );
    expect(cartReducer(populated, decrementQuantity("missing"))).toEqual(
      populated,
    );
  });
  it("removes rows by stable id", () => {
    expect(cartReducer(populated, removeItem("cart-item-1")).cart).toHaveLength(
      0,
    );
  });
  it("supports the legacy start-and-product removal key", () => {
    const key = `${Date.parse("2026-07-23T08:00:00.000Z")}_product-a`;
    expect(cartReducer(populated, removeItem(key)).cart).toHaveLength(0);
  });
  it("opens, closes, and clears the cart", () => {
    const opened = cartReducer(populated, openCart());
    const closed = cartReducer(opened, closeCart());
    const cleared = cartReducer(opened, clearCart());
    expect(opened.isOpen).toBe(true);
    expect(closed.isOpen).toBe(false);
    expect(cleared).toEqual({
      cart: [],
      isOpen: true,
    });
  });
  it("selects cart rows and visibility", () => {
    const rootState = {
      cart: populated,
    };
    expect(selectCurrentCart(rootState)).toBe(populated.cart);
    expect(selectCartIsOpen(rootState)).toBe(false);
  });
});
