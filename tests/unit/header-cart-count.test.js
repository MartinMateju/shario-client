import { describe, expect, it } from "vitest";
import { selectCartCount } from "@/components/headers/header.utils";
import cartReducer, {
  addToCart,
  incrementQuantity,
  removeItem,
} from "@/lib/features/cart/cartSlice";
import { getCartItemTotalMajor } from "@/components/modals/cartModal.utils";
const booking = {
  id: "booking-1",
  locationId: "studio",
  product: {
    id: "open-studio",
    kind: "open-studio",
    price: 125,
    currency: "CZK",
  },
  bookingMode: "public",
  start: "2026-11-10T10:00:00Z",
  end: "2026-11-10T11:00:00Z",
  quantity: 2,
  numberOfGuests: 3,
};
const count = (cartState) =>
  selectCartCount({
    cart: cartState,
  });
describe("header cart order-entry count", () => {
  it("counts a one-hour booking once while preserving its billing units and guests", () => {
    const state = cartReducer(
      undefined,
      addToCart({
        cartItem: booking,
      }),
    );
    expect(count(state)).toBe(1);
    expect(state.cart[0]).toMatchObject({
      quantity: 2,
      numberOfGuests: 3,
    });
    expect(getCartItemTotalMajor(state.cart[0])).toBe(750);
  });
  it("counts distinct bookings and tracks removal regardless of duration or party size", () => {
    const first = cartReducer(
      undefined,
      addToCart({
        cartItem: booking,
      }),
    );
    const second = cartReducer(
      first,
      addToCart({
        cartItem: {
          ...booking,
          id: "booking-2",
          start: "2026-11-11T10:00:00Z",
          end: "2026-11-11T13:00:00Z",
          quantity: 6,
          numberOfGuests: 1,
        },
      }),
    );
    expect(count(second)).toBe(2);
    expect(second.cart.map(getCartItemTotalMajor)).toEqual([750, 750]);
    expect(count(cartReducer(second, removeItem("booking-1")))).toBe(1);
  });
  it("counts mixed product rows once each while quantities continue to affect prices", () => {
    const items = [
      booking,
      {
        id: "class",
        bookingCourse: "class-session",
        quantity: 4,
        product: {
          id: "class",
          kind: "class",
          price: 100,
          currency: "CZK",
        },
      },
      {
        id: "service",
        quantity: 3,
        product: {
          id: "service",
          type: "service",
          price: 50,
          currency: "CZK",
        },
      },
      {
        id: "voucher",
        quantity: 2,
        product: {
          id: "voucher",
          kind: "voucher",
          price: 500,
          currency: "CZK",
        },
      },
    ];
    const state = items.reduce(
      (current, cartItem) =>
        cartReducer(
          current,
          addToCart({
            cartItem,
          }),
        ),
      undefined,
    );
    expect(count(state)).toBe(4);
    expect(state.cart.map(getCartItemTotalMajor)).toEqual([
      750, 400, 150, 1000,
    ]);
    const increased = cartReducer(state, incrementQuantity("service"));
    expect(count(increased)).toBe(4);
    expect(
      getCartItemTotalMajor(
        increased.cart.find((item) => item.id === "service"),
      ),
    ).toBe(200);
  });
  it.each([[], null, undefined, {}])(
    "returns zero for an empty or unavailable cart",
    (cart) => {
      expect(
        selectCartCount({
          cart: {
            cart,
          },
        }),
      ).toBe(0);
    },
  );
});
