import { isSupportedCartItem } from "./cartItemScope";
import { createSlice, nanoid } from "@reduxjs/toolkit";
const toTime = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  const t = x.getTime();
  return Number.isFinite(t) ? t : NaN;
};
const toNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
const toQuantity = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, number) : 1;
};
const buildCartKey = (item) => {
  // 1) Classes: unique by the legacy bookingCourse slot id
  if (item?.bookingCourse) {
    return `class:${String(item.bookingCourse)}`;
  }

  // 2) Guest increase: unique by bookingWorkshop (the booking being updated)
  // (You can still decide to allow multiple guest-increase items for same booking;
  //  here we MERGE them instead of creating duplicates.)
  if (item?.product?.type === "guest-increase" && item?.bookingWorkshop) {
    return `guest-increase:${String(item.bookingWorkshop)}`;
  }

  // 3) Open Studio (default): location + product + exact start/end.
  // Two studios can offer the same product at the same time, so location is
  // part of the identity.
  const locationId = item?.locationId ? String(item.locationId) : "no-location";
  const pid = item?.product?.id
    ? String(item.product.id)
    : item?.product?._id
      ? String(item.product._id)
      : "no-product";
  const s = toTime(item?.start);
  const e = toTime(item?.end);
  return `open-studio:${locationId}:${pid}:${s}:${e}`;
};
const mergeGuestIncrease = (existing, incoming) => {
  // existing & incoming are cart items for same bookingWorkshop
  const addExisting = toNonNegativeNumber(existing?.numberOfGuests);
  const addIncoming = toNonNegativeNumber(incoming?.numberOfGuests);
  const mergedAdd = addExisting + addIncoming;

  // quantity for guest-increase = 30m blocks for pricing (keep the larger / latest)
  const qExisting = toQuantity(existing?.quantity);
  const qIncoming = toQuantity(incoming?.quantity);
  const mergedQty = Math.max(qExisting, qIncoming);
  return {
    ...existing,
    ...incoming,
    numberOfGuests: mergedAdd,
    quantity: mergedQty,
  };
};
const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: [],
    isOpen: false,
    ownerScope: null,
  },
  reducers: {
    bindCartOwner: (state, action) => {
      const ownerScope = action.payload || null;
      // Persist ownership with the basket, never the access token. An unowned
      // basket can follow its first sign-in; an owned basket cannot switch users.
      if (state.ownerScope && state.ownerScope !== ownerScope) {
        state.cart = [];
        state.isOpen = false;
      }
      state.ownerScope = ownerScope;
    },
    addToCart: (state, action) => {
      const newItemRaw = action.payload?.cartItem;
      if (!newItemRaw) return;
      if (!isSupportedCartItem(newItemRaw)) return;

      // ✅ Normalize dates to SERIALIZABLE values (number timestamps)
      const startMs = toTime(newItemRaw?.start);
      const endMs = toTime(newItemRaw?.end);
      const newItem = {
        ...newItemRaw,
        // Ensure every cart row has a stable id (used by increment/decrement)
        id: newItemRaw.id || nanoid(),
        quantity: toQuantity(newItemRaw.quantity),
        // ✅ Store as numbers (serializable). If invalid, keep null.
        start: Number.isFinite(startMs) ? startMs : null,
        end: Number.isFinite(endMs) ? endMs : null,
      };
      const key = buildCartKey(newItem);

      // Find existing by key (for classes + Open Studio + guest-increase)
      const existingIdx = state.cart.findIndex(
        (it) => buildCartKey(it) === key,
      );

      // 1) Classes: do NOT allow duplicates
      if (newItem.bookingCourse) {
        if (existingIdx !== -1) {
          console.warn(
            "Duplicate Class entry prevented:",
            newItem.bookingCourse,
          );
          return;
        }
        state.cart.push(newItem);
        return;
      }

      // 2) Guest-increase: merge by bookingWorkshop (recommended)
      if (
        newItem?.product?.type === "guest-increase" &&
        newItem?.bookingWorkshop
      ) {
        if (existingIdx !== -1) {
          state.cart[existingIdx] = mergeGuestIncrease(
            state.cart[existingIdx],
            newItem,
          );
          return;
        }
        state.cart.push(newItem);
        return;
      }

      // 3) Open Studio: prevent duplicates by product + start/end
      if (existingIdx !== -1) {
        console.warn("Duplicate Open Studio entry prevented");
        return;
      }
      state.cart.push(newItem);
    },
    incrementQuantity: (state, action) => {
      const item = state.cart.find((it) => it.id === action.payload);
      if (!item) return;
      item.quantity = toQuantity(item.quantity) + 1;
    },
    decrementQuantity: (state, action) => {
      const item = state.cart.find((it) => it.id === action.payload);
      if (!item) return;
      const q = toQuantity(item.quantity);
      item.quantity = Math.max(1, q - 1);
    },
    removeItem: (state, action) => {
      // ✅ More robust: remove by id if available, otherwise fallback to legacy key
      const payload = action.payload;
      const byIdIdx = state.cart.findIndex((it) => it.id === payload);
      if (byIdIdx !== -1) {
        state.cart.splice(byIdIdx, 1);
        return;
      }

      // Legacy fallback: "<start_ms>_<productId>"
      state.cart = state.cart.filter((item) => {
        const startMs = toTime(item.start);
        const productId = item?.product?._id ? String(item.product._id) : "";
        return `${startMs}_${productId}` !== payload;
      });
    },
    clearCart: (state) => {
      state.cart = [];
    },
    removeBookingItems: (state) => {
      state.cart = [];
    },
    openCart: (state) => {
      state.isOpen = true;
    },
    closeCart: (state) => {
      state.isOpen = false;
    },
  },
});
export const {
  bindCartOwner,
  addToCart,
  incrementQuantity,
  decrementQuantity,
  removeItem,
  clearCart,
  removeBookingItems,
  openCart,
  closeCart,
} = cartSlice.actions;
export default cartSlice.reducer;
export const selectCurrentCart = (state) => state.cart.cart;
export const selectCartIsOpen = (state) => state.cart.isOpen;
