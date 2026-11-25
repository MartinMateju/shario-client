import { configureStore } from "@reduxjs/toolkit";
import { createApi, setupListeners } from "@reduxjs/toolkit/query/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ baseQuery: vi.fn() }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: createApi({
    reducerPath: "publicHydrationApi",
    baseQuery: mocks.baseQuery,
    tagTypes: ["Product", "PublicBooking"],
    endpoints: () => ({}),
  }),
}));

import {
  productsApiSlice as api,
  useGetPublicCourseProductsQuery,
  useGetPublicProductQuery,
} from "@/lib/features/products/productsApiSlice";
import {
  useGetPublicCourseLocationsQuery,
  useGetPublicCourseSessionsQuery,
} from "@/lib/features/publicBooking/publicBookingApiSlice";
import PublicCourseHydrationBoundary, {
  seedPublicCourseCache,
  usePublicCourseHydration,
} from "@/components/courses/PublicCourseHydrationBoundary";
import { normalizePublicCoursePage } from "@/lib/features/products/publicCoursePage";
import { PUBLIC_COURSE_FRESHNESS_SECONDS } from "@/lib/publicTenant/courseHydration";

const course = (id) => ({ id, name: id, kind: "class", isActive: true });
const snapshot = (products = [course("SSR course")], extra = {}) => {
  const page = normalizePublicCoursePage(products);
  return {
    tenantSlug: "klei",
    locationId: "studio-a",
    fetchedAt: Date.now(),
    locations: [{ id: "studio-a", name: "SSR studio", isActive: true }],
    products: page.products,
    catalogPage: { hasMore: page.hasMore, sourceIds: page.sourceIds },
    ...extra,
  };
};
const stores = [];
const cleanups = [];
function makeStore() {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (defaults) => defaults().concat(api.middleware),
  });
  stores.push(store);
  cleanups.push(setupListeners(store.dispatch));
  return store;
}
function Catalog({
  initialData,
  tenantSlug = "klei",
  locationId = "studio-a",
}) {
  const skip = usePublicCourseHydration();
  const query = useGetPublicCourseProductsQuery(
    { tenantSlug, locationId },
    {
      skip,
      refetchOnMountOrArgChange: PUBLIC_COURSE_FRESHNESS_SECONDS,
      refetchOnFocus: true,
    },
  );
  const locations = useGetPublicCourseLocationsQuery(
    { tenantSlug },
    {
      skip,
      refetchOnMountOrArgChange: PUBLIC_COURSE_FRESHNESS_SECONDS,
      refetchOnFocus: true,
    },
  );
  const products =
    query.currentData ??
    (initialData?.tenantSlug === tenantSlug &&
    initialData?.locationId === locationId &&
    !query.isError
      ? initialData.products
      : []);
  return (
    <>
      <div>
        {products.map((p) => (
          <p key={p.id}>{p.name}</p>
        ))}
      </div>
      <p>{(locations.currentData ?? initialData?.locations)?.[0]?.name}</p>
      <p>{query.isUninitialized ? "uninitialized" : "subscribed"}</p>
      {query.isError ? <p role="alert">Catalogue error</p> : null}
      <button disabled={query.isUninitialized} onClick={query.refetch}>
        Refresh
      </button>
    </>
  );
}
function View({ store, initialData, ...args }) {
  return (
    <Provider store={store}>
      <PublicCourseHydrationBoundary initialData={initialData}>
        <Catalog initialData={initialData} {...args} />
      </PublicCourseHydrationBoundary>
    </Provider>
  );
}

beforeEach(() => {
  mocks.baseQuery
    .mockReset()
    .mockImplementation(async ({ url }) => ({
      data: url.endsWith("locations")
        ? [{ id: "studio-a", name: "Live studio" }]
        : [course("Live course")],
    }));
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  stores.splice(0).forEach((store) => store.dispatch(api.util.resetApiState()));
});

describe("public course RTK hydration", () => {
  it("hydrates identical SSR markup and subscribes without repeating locations or page one", async () => {
    const initialData = snapshot();
    const serverStore = makeStore();
    const html = renderToString(
      <View store={serverStore} initialData={initialData} />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors = [];
    let root;
    await act(async () => {
      root = hydrateRoot(
        container,
        <View store={makeStore()} initialData={initialData} />,
        { onRecoverableError: (error) => errors.push(error.message) },
      );
    });
    await waitFor(() => expect(container.textContent).toContain("subscribed"));
    expect(container.textContent).toContain("SSR course");
    expect(errors).toEqual([]);
    expect(mocks.baseQuery).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    container.remove();
  });

  it("continues a full SSR first page at page two and retains exact tenant/studio scope", async () => {
    const initialData = snapshot(
      Array.from({ length: 100 }, (_, index) => course(`class-${index}`)),
    );
    mocks.baseQuery.mockResolvedValue({ data: [course("Page two")] });
    render(<View store={makeStore()} initialData={initialData} />);
    await screen.findByText("Page two");
    expect(mocks.baseQuery).toHaveBeenCalledTimes(1);
    expect(mocks.baseQuery.mock.calls[0][0]).toEqual({
      url: "/public/tenants/klei/products/courses",
      credentials: "omit",
      params: { page: 2, limit: 100, locationId: "studio-a" },
    });
    expect(screen.getByText("class-0")).toBeInTheDocument();
  });

  it("does not truncate after filtering invalid rows out of a full first page", async () => {
    const initialData = snapshot([
      ...Array.from({ length: 99 }, (_, index) => course(`class-${index}`)),
      { id: "hidden", kind: "voucher" },
    ]);
    expect(initialData.products).toHaveLength(99);
    mocks.baseQuery.mockResolvedValue({ data: [course("Next valid course")] });
    render(<View store={makeStore()} initialData={initialData} />);
    await screen.findByText("Next valid course");
    expect(mocks.baseQuery.mock.calls[0][0].params.page).toBe(2);
  });

  it("shows an error and supports a real retry after a later page fails", async () => {
    const initialData = snapshot(
      Array.from({ length: 100 }, (_, index) => course(`class-${index}`)),
    );
    mocks.baseQuery
      .mockResolvedValueOnce({ error: { status: 503 } })
      .mockResolvedValue({ data: [course("Recovered course")] });
    render(<View store={makeStore()} initialData={initialData} />);
    await screen.findByRole("alert");
    expect(screen.queryByText("class-0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Recovered course");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.baseQuery.mock.calls.at(-1)[0].params.page).toBe(1);
  });

  it("revalidates on focus and manual refresh after seeding", async () => {
    const store = makeStore();
    render(<View store={store} initialData={snapshot()} />);
    await screen.findByText("subscribed");
    expect(mocks.baseQuery).not.toHaveBeenCalled();
    await act(async () => {
      store.dispatch(api.internalActions.onFocus());
    });
    await screen.findByText("Live course");
    expect(mocks.baseQuery).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(mocks.baseQuery).toHaveBeenCalledTimes(3));
  });

  it.each(["old", "future", "missing"])(
    "fetches instead of trusting a %s snapshot",
    async (age) => {
      const initialData = snapshot();
      initialData.fetchedAt =
        age === "old"
          ? Date.now() - 31_000
          : age === "future"
            ? Date.now() + 60_000
            : undefined;
      render(<View store={makeStore()} initialData={initialData} />);
      await screen.findByText("Live course");
      expect(mocks.baseQuery).toHaveBeenCalledTimes(2);
    },
  );

  it("does not use another tenant or studio's seeded catalogue", async () => {
    render(
      <View
        store={makeStore()}
        initialData={snapshot()}
        tenantSlug="other"
        locationId="studio-b"
      />,
    );
    await screen.findByText("Live course");
    expect(screen.queryByText("SSR course")).not.toBeInTheDocument();
    expect(
      mocks.baseQuery.mock.calls.some(
        ([r]) =>
          r.url === "/public/tenants/other/products/courses" &&
          r.params.locationId === "studio-b",
      ),
    ).toBe(true);
  });

  it("does not overwrite a newer live cache with old SSR data", async () => {
    const store = makeStore();
    const initialData = snapshot();
    await store.dispatch(
      api.endpoints.getPublicCourseProducts.initiate({
        tenantSlug: "klei",
        locationId: "studio-a",
      }),
    );
    seedPublicCourseCache(store, initialData);
    const cached = api.endpoints.getPublicCourseProducts.select({
      tenantSlug: "klei",
      locationId: "studio-a",
    })(store.getState());
    expect(cached.data.pages[0].products[0].name).toBe("Live course");
  });

  it("does not replace an in-flight refresh with a server snapshot", async () => {
    let finish;
    mocks.baseQuery.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const store = makeStore();
    const args = { tenantSlug: "klei", locationId: "studio-a" };
    const pending = store.dispatch(
      api.endpoints.getPublicCourseProducts.initiate(args),
    );
    expect(
      api.endpoints.getPublicCourseProducts.select(args)(store.getState())
        .status,
    ).toBe("pending");
    seedPublicCourseCache(store, snapshot());
    expect(
      api.endpoints.getPublicCourseProducts.select(args)(store.getState())
        .status,
    ).toBe("pending");
    expect(
      api.endpoints.getPublicCourseProducts.select(args)(store.getState()).data,
    ).toBeUndefined();
    finish({ data: [course("Fresh pending result")] });
    await pending;
    expect(
      api.endpoints.getPublicCourseProducts.select(args)(store.getState()).data
        .pages[0].products[0].name,
    ).toBe("Fresh pending result");
  });

  it("drops previous studio rows during a live navigation to another tenant and studio", async () => {
    const store = makeStore();
    const initialData = snapshot();
    const view = render(<View store={store} initialData={initialData} />);
    await screen.findByText("subscribed");
    expect(screen.getByText("SSR course")).toBeInTheDocument();
    let finish;
    mocks.baseQuery.mockImplementation(({ url }) =>
      url.endsWith("locations")
        ? Promise.resolve({ data: [] })
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    view.rerender(
      <View
        store={store}
        initialData={initialData}
        tenantSlug="other"
        locationId="studio-b"
      />,
    );
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    expect(screen.queryByText("SSR course")).not.toBeInTheDocument();
    await act(async () => {
      finish({ data: [course("Other studio course")] });
    });
    await screen.findByText("Other studio course");
  });

  it("reports the safety page limit instead of a silently truncated success", async () => {
    const store = makeStore();
    const result = await store.dispatch(
      api.endpoints.getPublicCourseProducts.initiate(
        { tenantSlug: "klei", locationId: "studio-a" },
        { initialPageParam: 10_001 },
      ),
    );
    expect(result.isError).toBe(true);
    expect(result.error.status).toBe("CUSTOM_ERROR");
    expect(mocks.baseQuery).not.toHaveBeenCalled();
  });

  it("keeps session availability live while hydrating a studio-scoped product", async () => {
    function Detail() {
      const skip = usePublicCourseHydration();
      const product = useGetPublicProductQuery(
        { tenantSlug: "klei", productId: "wheel", locationId: "studio-a" },
        { skip, refetchOnMountOrArgChange: 30 },
      );
      const sessions = useGetPublicCourseSessionsQuery({
        tenantSlug: "klei",
        productId: "wheel",
        locationId: "studio-a",
      });
      return (
        <>
          <p>{product.currentData?.name}</p>
          <p>{sessions.isSuccess ? "Live dates loaded" : "Loading dates"}</p>
        </>
      );
    }
    mocks.baseQuery.mockResolvedValue({ data: [] });
    render(
      <Provider store={makeStore()}>
        <PublicCourseHydrationBoundary
          initialData={snapshot([], {
            product: course("wheel"),
            products: undefined,
            catalogPage: undefined,
          })}
        >
          <Detail />
        </PublicCourseHydrationBoundary>
      </Provider>,
    );
    await screen.findByText("wheel");
    await screen.findByText("Live dates loaded");
    expect(mocks.baseQuery).toHaveBeenCalledTimes(1);
    expect(mocks.baseQuery.mock.calls[0][0].url).toBe(
      "/public/tenants/klei/products/wheel/sessions",
    );
  });
});
