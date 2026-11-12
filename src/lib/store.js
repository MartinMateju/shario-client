import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  createMigrate,
  createTransform,
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";

import { apiSlice } from "@/lib/features/api/apiSlice";
import { authCacheIsolationMiddleware } from "@/lib/features/auth/authCacheIsolationMiddleware";
import authReducer from "@/lib/features/auth/authSlice";
import cartReducer from "@/lib/features/cart/cartSlice";
import configReducer from "@/lib/features/config/configSlice";
import creditsReducer from "@/lib/features/credits/creditsSlice";
import languageReducer from "@/lib/features/language/languageSlice";
import { isMongoObjectId } from "@/lib/features/locations/location.utils";
import passReducer from "@/lib/features/pass/passSlice";
import studioContextReducer from "@/lib/features/studio/studioContextSlice";

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },

  setItem(_key, value) {
    return Promise.resolve(value);
  },

  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

/**
 * Keeps the persisted cart JSON-serializable.
 *
 * Values such as start, end and date must remain:
 * - number
 * - string
 * - null
 */
export const cartTransform = createTransform(
  (inboundState, key) => {
    if (key !== "cart" || !inboundState?.cart) {
      return inboundState;
    }

    return {
      ...inboundState,
      // Keep items across checkout redirects, but never reopen a stale dialog.
      isOpen: false,

      cart: inboundState.cart.map((item) => {
        const next = { ...item };

        if (next.start instanceof Date) {
          next.start = next.start.getTime();
        }

        if (next.end instanceof Date) {
          next.end = next.end.getTime();
        }

        if (next.date instanceof Date) {
          next.date = next.date.getTime();
        }

        if (typeof next.start === "object" && next.start !== null) {
          next.start = null;
        }

        if (typeof next.end === "object" && next.end !== null) {
          next.end = null;
        }

        if (typeof next.date === "object" && next.date !== null) {
          next.date = null;
        }

        return next;
      }),
    };
  },

  // Keep rehydrated values serializable.
  (outboundState, key) => {
    if (key !== "cart" || !outboundState?.cart) {
      return outboundState;
    }

    return {
      ...outboundState,
      isOpen: false,

      cart: outboundState.cart.map((item) => {
        const next = { ...item };

        if (typeof next.start === "object" && next.start !== null) {
          next.start = null;
        }

        if (typeof next.end === "object" && next.end !== null) {
          next.end = null;
        }

        if (typeof next.date === "object" && next.date !== null) {
          next.date = null;
        }

        return next;
      }),
    };
  },

  {
    whitelist: ["cart"],
  },
);

const purgeLegacyWorkshopRows = (cartState) => {
  if (!cartState || !Array.isArray(cartState.cart)) {
    return cartState;
  }

  return {
    ...cartState,
    cart: cartState.cart.filter((item) => {
      const isCourse = Boolean(item?.bookingCourse);
      const isGuestIncrease =
        item?.product?.type === "guest-increase" && item?.bookingWorkshop;

      if (isCourse || isGuestIncrease) {
        return true;
      }

      return isMongoObjectId(String(item?.locationId || "").trim());
    }),
  };
};

const migrations = {
  4: (state) => {
    if (!state) {
      return state;
    }

    return {
      ...state,
      cart: purgeLegacyWorkshopRows(state.cart),
      studioContext: {
        tenantId: null,
        activeStudioId: null,
      },
    };
  },
  5: (state) => {
    if (!state) {
      return state;
    }

    /*
     * Access tokens and identity context are intentionally memory-only.
     * Each browser origin must restore its session from the shared,
     * HTTP-only refresh cookie. Removing legacy persisted auth also prevents
     * the central login origin from reviving a tenant session after logout.
     */
    const { auth: _legacyAuth, ...persistedState } = state;

    return persistedState;
  },
};

const persistConfig = {
  key: "shario-root",
  version: 5,
  storage,
  migrate: createMigrate(migrations, { debug: false }),

  whitelist: ["cart", "studioContext"],

  transforms: [cartTransform],
};

const rootReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,

  auth: authReducer,
  language: languageReducer,
  cart: cartReducer,
  config: configReducer,
  credits: creditsReducer,
  pass: passReducer,
  studioContext: studioContextReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * A store is created per mounted locale tree so SSR never shares language
 * state between requests. The route locale, not a browser-only cookie, seeds
 * the legacy CZ/EN slice before any connected child renders.
 */
export const makeStore = ({ legacyLanguage = "EN" } = {}) => {
  const store = configureStore({
    reducer: persistedReducer,
    preloadedState: {
      language: {
        language: legacyLanguage,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(authCacheIsolationMiddleware, apiSlice.middleware),
    devTools: process.env.NODE_ENV !== "production",
  });

  const teardownListeners = setupListeners(store.dispatch);

  /*
   * The server renders before anything is rehydrated from localStorage, so
   * hydration must read this same snapshot. Persisted slices arrive with
   * REHYDRATE right after hydration.
   */
  const serverState = store.getState();

  return {
    store,
    serverState,
    persistor: persistStore(store),
    teardownListeners,
  };
};

export const selectIsPersistedStateRehydrated = (state) =>
  state?._persist?.rehydrated === true;
