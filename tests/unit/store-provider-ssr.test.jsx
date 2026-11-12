import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useSelector, useStore } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";

const sessionRestore = vi.hoisted(() => ({ rehydratedAtStart: [] }));
const storeControl = vi.hoisted(() => ({ cartItemBeforeHydration: null }));

// Lets a test change the client store before connected components hydrate,
// the way an early REHYDRATE would.
vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal();
  const { addToCart } = await import("@/lib/features/cart/cartSlice");

  return {
    ...actual,
    makeStore: (options) => {
      const created = actual.makeStore(options);

      if (storeControl.cartItemBeforeHydration) {
        created.store.dispatch(
          addToCart({ cartItem: storeControl.cartItemBeforeHydration }),
        );
      }

      return created;
    },
  };
});

vi.mock("@/hooks/useTokenRefresh", async () => {
  const { useStore: useReduxStore } = await import("react-redux");

  return {
    useTokenRefresh: () => {
      const store = useReduxStore();

      sessionRestore.rehydratedAtStart.push(
        store.getState()._persist?.rehydrated === true,
      );
    },
  };
});

import StoreProvider from "@/providers/StoreProvider";

function CartBadge() {
  const count = useSelector((state) => state.cart.cart.length);

  return <p>{`${count} in cart`}</p>;
}

function PersistedStateProbe() {
  const store = useStore();

  return <span data-store-ready={String(Boolean(store))} />;
}

const persistCart = (items) => {
  window.localStorage.setItem(
    "persist:shario-root",
    JSON.stringify({
      cart: JSON.stringify({ cart: items, isOpen: false }),
      studioContext: JSON.stringify({ tenantId: null, activeStudioId: null }),
      _persist: JSON.stringify({ version: 5, rehydrated: true }),
    }),
  );
};

const page = (
  <StoreProvider legacyLanguage="EN">
    <main>
      <h1>Studio Alpha</h1>
      <CartBadge />
      <PersistedStateProbe />
    </main>
  </StoreProvider>
);

describe("StoreProvider server rendering", () => {
  afterEach(() => {
    sessionRestore.rehydratedAtStart = [];
    storeControl.cartItemBeforeHydration = null;
  });

  it("server-renders its children instead of waiting for rehydration", () => {
    const html = renderToString(page);

    expect(html).toContain("<h1>Studio Alpha</h1>");
    expect(html).toContain("0 in cart");
    expect(sessionRestore.rehydratedAtStart).toEqual([]);
  });

  it("hydrates the server HTML, then applies the persisted cart", async () => {
    persistCart([
      {
        id: "item-1",
        locationId: "507f1f77bcf86cd799439011",
        start: null,
        end: null,
        date: null,
      },
    ]);

    const container = document.createElement("div");
    const recoverableErrors = [];

    container.innerHTML = renderToString(page);
    document.body.appendChild(container);

    const serverHeading = container.querySelector("h1");
    let root;

    await act(async () => {
      root = hydrateRoot(container, page, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("1 in cart");
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.querySelector("h1")).toBe(serverHeading);

    act(() => root.unmount());
    container.remove();
  });

  it("starts the session restore only after persisted state is rehydrated", async () => {
    const container = document.createElement("div");

    container.innerHTML = renderToString(page);
    document.body.appendChild(container);

    let root;

    await act(async () => {
      root = hydrateRoot(container, page);
    });

    await vi.waitFor(() => {
      expect(sessionRestore.rehydratedAtStart.length).toBeGreaterThan(0);
    });

    expect(sessionRestore.rehydratedAtStart.every(Boolean)).toBe(true);

    act(() => root.unmount());
    container.remove();
  });

  it("hydrates against the server snapshot when persisted state lands first", async () => {
    const container = document.createElement("div");
    const recoverableErrors = [];

    container.innerHTML = renderToString(page);
    document.body.appendChild(container);
    storeControl.cartItemBeforeHydration = {
      id: "item-early",
      locationId: "507f1f77bcf86cd799439011",
      start: null,
      end: null,
    };

    let root;

    await act(async () => {
      root = hydrateRoot(container, page, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("1 in cart");
    });

    expect(recoverableErrors).toEqual([]);

    act(() => root.unmount());
    container.remove();
  });
});
