import { render, screen } from "@testing-library/react";
import { act, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useSelector, useStore } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";

const sessionRestore = vi.hoisted(() => ({
  rehydratedAtStart: [],
  configs: [],
}));
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
      sessionRestore.configs.push(
        store.dispatch(
          (_dispatch, _getState, extra) => extra.authTransportConfig,
        ),
      );
    },
  };
});

import StoreProvider from "@/providers/StoreProvider";
import { useGetCouponsQuery } from "@/lib/features/coupons/couponsApiSlice";

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
    sessionRestore.configs = [];
    storeControl.cartItemBeforeHydration = null;
  });

  it("server-renders its children instead of waiting for rehydration", () => {
    const html = renderToString(page);

    expect(html).toContain("<h1>Studio Alpha</h1>");
    expect(html).toContain("0 in cart");
    expect(sessionRestore.rehydratedAtStart).toEqual([]);
  });

  it("refreshes offers on window focus after the locale store remounts", async () => {
    function Offers({ tenantSlug }) {
      const { currentData } = useGetCouponsQuery(
        { tenantSlug },
        { refetchOnFocus: true },
      );
      return <p>{currentData?.[0]?.name}</p>;
    }
    const offersPage = (slug) => (
      <StrictMode>
        <StoreProvider key={slug}>
          <Offers tenantSlug={slug} />
        </StoreProvider>
      </StrictMode>
    );
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json([{ name: "First studio offer" }]))
      .mockResolvedValueOnce(Response.json([{ name: "Second studio offer" }]))
      .mockResolvedValueOnce(Response.json([{ name: "Updated second offer" }]));
    try {
      const page = render(offersPage("studio-a"));
      await screen.findByText("First studio offer");
      page.rerender(offersPage("studio-b"));
      await screen.findByText("Second studio offer");

      act(() => window.dispatchEvent(new Event("focus")));
      await screen.findByText("Updated second offer");
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[2][0]).toContain("/public/tenants/studio-b/");
    } finally {
      fetchMock.mockRestore();
    }
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

  it("provides server-supplied aliases on the first child render and session restore", async () => {
    const config = { platformHostnames: ["workspace.example"] };
    const renderedConfigs = [];
    function ConfigProbe() {
      const store = useStore();
      renderedConfigs.push(
        store.dispatch(
          (_dispatch, _getState, extra) => extra.authTransportConfig,
        ),
      );
      return <span>Alias ready</span>;
    }
    const configuredPage = (
      <StoreProvider authTransportConfig={config}>
        <ConfigProbe />
      </StoreProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(configuredPage);
    expect(renderedConfigs).toEqual([config]);
    document.body.appendChild(container);
    let root;
    await act(async () => {
      root = hydrateRoot(container, configuredPage);
    });
    await vi.waitFor(() =>
      expect(sessionRestore.configs.length).toBeGreaterThan(0),
    );
    expect(
      renderedConfigs.every(
        (value) => value.platformHostnames[0] === "workspace.example",
      ),
    ).toBe(true);
    expect(
      sessionRestore.configs.every(
        (value) => value.platformHostnames[0] === "workspace.example",
      ),
    ).toBe(true);
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
