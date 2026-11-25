import { configureStore } from "@reduxjs/toolkit";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import PublicCommerceCatalogHydration from "@/components/public-tenant/PublicCommerceCatalogHydration";
import PublicMembershipCatalog from "@/components/memberships/PublicMembershipCatalog";
import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import { apiSlice } from "@/lib/features/api/apiSlice";

const context = vi.hoisted(() => ({ tenant: null }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: context.tenant.slug }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }) => <a href={href}>{children}</a>,
  useRouter: () => ({}),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: context.tenant }),
  useOptionalPublicTenant: () => ({ tenant: context.tenant }),
}));

const makeTenant = (slug) =>
  normalizePublicTenant({
    slug,
    settings: { currency: "CZK" },
    publicCapabilities: { memberships: true, vouchers: true },
  });
const dataFor = (kind, name, slug) =>
  kind === "memberships"
    ? {
        tenant: { slug, currency: "CZK" },
        locations: [],
        plans: [
          {
            id: "plan",
            publishedVersion: {
              id: "version",
              name,
              prices: [{ currency: "CZK", amountMinor: 55000 }],
              billing: { type: "recurring", interval: "month" },
              benefits: [],
            },
          },
        ],
      }
    : [
        {
          id: "voucher",
          type: "coupon",
          isActive: true,
          name,
          price: 500,
          currency: "CZK",
          hasVoucherDesign: true,
        },
      ];

const storeForCatalog = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer, auth: () => ({}) },
    middleware: (defaults) => defaults().concat(apiSlice.middleware),
  });
const view = (
  store,
  kind,
  snapshot,
  { portal = false, onCheckoutRedirect } = {},
) => (
  <Provider store={store}>
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <PublicCommerceCatalogHydration initialData={snapshot}>
        {kind === "memberships" ? (
          <PublicMembershipCatalog />
        ) : (
          <PublicVoucherCatalogPage
            portal={portal}
            onCheckoutRedirect={onCheckoutRedirect}
          />
        )}
      </PublicCommerceCatalogHydration>
    </NextIntlClientProvider>
  </Provider>
);

afterEach(() => vi.unstubAllGlobals());

describe("public membership refresh", () => {
  const snapshotFor = (slug) => ({
    fetchedAt: Date.now(),
    kind: "memberships",
    tenantSlug: slug,
    data: dataFor("memberships", "Published plan", slug),
  });
  const fail = (status) =>
    Response.json({ message: "Unavailable" }, { status });

  it("keeps the same plan and its accepted terms during a failed focus refresh and a retry", async () => {
    context.tenant = makeTenant("studio-a");
    const snapshot = snapshotFor("studio-a");
    snapshot.data.plans[0].publishedVersion.terms = "Monthly membership terms.";
    const refresh = Promise.withResolvers();
    const retry = Promise.withResolvers();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(refresh.promise)
      .mockReturnValueOnce(retry.promise);
    vi.stubGlobal("fetch", fetchMock);
    const store = storeForCatalog();
    render(view(store, "memberships", snapshot));

    const checkbox = screen.getByRole("checkbox");
    checkbox.focus();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    act(() => {
      store.dispatch(apiSlice.internalActions.onFocus());
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { name: "Published plan" }),
    ).toBeVisible();

    await act(async () => refresh.resolve(fail(503)));
    expect(
      await screen.findByText(en.PublicTenant.catalog.refreshError),
    ).toBeVisible();
    const retryButton = screen.getByRole("button", {
      name: en.PublicTenant.catalog.retry,
    });
    expect(checkbox).toHaveFocus();
    expect(
      screen.queryByText(en.Memberships.catalog.loadError),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(
      screen.getByRole("button", { name: en.Memberships.catalog.choosePlan }),
    ).toBeEnabled();
    fireEvent.click(retryButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("checkbox")).toBeChecked();

    await act(async () =>
      retry.resolve(
        Response.json(dataFor("memberships", "Updated plan", "studio-a")),
      ),
    );
    await screen.findByRole("heading", { name: "Updated plan" });
    expect(
      screen.queryByRole("button", { name: en.PublicTenant.catalog.retry }),
    ).not.toBeInTheDocument();
  });

  it("shows the blocking error for an initial failure after switching studios", async () => {
    context.tenant = makeTenant("studio-a");
    const store = storeForCatalog();
    const snapshot = snapshotFor("studio-a");
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(503));
    vi.stubGlobal("fetch", fetchMock);
    const component = render(view(store, "memberships", snapshot));
    expect(
      screen.getByRole("heading", { name: "Published plan" }),
    ).toBeVisible();

    context.tenant = makeTenant("studio-b");
    component.rerender(view(store, "memberships", snapshot));
    expect(
      screen.queryByRole("heading", { name: "Published plan" }),
    ).not.toBeInTheDocument();
    await screen.findByText(en.Memberships.catalog.loadError);
    expect(
      screen.queryByRole("button", { name: en.Memberships.catalog.choosePlan }),
    ).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("/public/tenants/studio-b/");
  });

  it.each([403, 404])(
    "keeps previously published plans hidden after a %i, including while retrying",
    async (status) => {
      context.tenant = makeTenant("studio-a");
      const retry = Promise.withResolvers();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fail(status))
        .mockReturnValueOnce(retry.promise);
      vi.stubGlobal("fetch", fetchMock);
      const store = storeForCatalog();
      render(view(store, "memberships", snapshotFor("studio-a")));
      expect(
        screen.getByRole("heading", { name: "Published plan" }),
      ).toBeVisible();

      act(() => {
        store.dispatch(apiSlice.internalActions.onFocus());
      });
      await screen.findByText(en.Memberships.catalog.loadError);
      expect(
        screen.queryByRole("heading", { name: "Published plan" }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: en.Memberships.common.retry }),
      );
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(
        screen.queryByRole("heading", { name: "Published plan" }),
      ).not.toBeInTheDocument();

      await act(async () => retry.resolve(fail(503)));
      await screen.findByText(en.Memberships.catalog.loadError);
      expect(
        screen.queryByRole("heading", { name: "Published plan" }),
      ).not.toBeInTheDocument();
    },
  );
});

describe.each(["memberships", "vouchers"])("public %s catalogue", (kind) => {
  it("does not render or reseed a prefetched route after the browser learns the catalogue is unavailable", async () => {
    const tenantSlug = "studio-a";
    context.tenant = makeTenant(tenantSlug);
    const store = storeForCatalog();
    const endpoint =
      apiSlice.endpoints[
        kind === "memberships" ? "getPublicMembershipCatalog" : "getCoupons"
      ];
    const selectCatalog = endpoint.select({ tenantSlug });
    const snapshot = {
      fetchedAt: Date.now(),
      kind,
      tenantSlug,
      data: dataFor(kind, "Original offer", tenantSlug),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 403 }))
      .mockResolvedValueOnce(
        Response.json(dataFor(kind, "Restored offer", tenantSlug)),
      );
    vi.stubGlobal("fetch", fetchMock);
    const firstVisit = render(view(store, kind, snapshot));
    await screen.findAllByText("Original offer");
    const firstFulfilledAt = selectCatalog(store.getState()).fulfilledTimeStamp;
    await waitFor(() => expect(Date.now()).toBeGreaterThan(firstFulfilledAt));
    const prefetchedRoute = {
      ...snapshot,
      fetchedAt: Date.now(),
      data: dataFor(kind, "Prefetched offer", tenantSlug),
    };
    act(() => {
      store.dispatch(apiSlice.internalActions.onFocus());
    });
    await waitFor(() =>
      expect(selectCatalog(store.getState()).data).toBeNull(),
    );
    firstVisit.unmount();

    // Inspect the first render separately from the hydration effect on remount.
    expect(renderToString(view(store, kind, prefetchedRoute))).not.toContain(
      "Prefetched offer",
    );
    render(view(store, kind, prefetchedRoute));
    expect(selectCatalog(store.getState()).data).toBeNull();
    expect(screen.queryByText("Prefetched offer")).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", {
        name: en.PublicTenant.catalog.retry,
      }),
    );
    await screen.findAllByText("Restored offer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows published rows in the server HTML, reuses them on mount and isolates studio switches", async () => {
    context.tenant = makeTenant("studio-a");
    const snapshot = {
      fetchedAt: Date.now(),
      kind,
      tenantSlug: "studio-a",
      data: dataFor(kind, "Studio A offer", "studio-a"),
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(renderToString(view(storeForCatalog(), kind, snapshot))).toContain(
      "Studio A offer",
    );
    const store = storeForCatalog();
    const component = render(view(store, kind, snapshot));
    await screen.findAllByText("Studio A offer");
    expect(fetchMock).not.toHaveBeenCalled();

    let finish;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    context.tenant = makeTenant("studio-b");
    component.rerender(view(store, kind, snapshot));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryAllByText("Studio A offer")).toHaveLength(0);
    expect(fetchMock.mock.calls[0][0]).toContain("/public/tenants/studio-b/");
    await act(async () =>
      finish(Response.json(dataFor(kind, "Studio B offer", "studio-b"))),
    );
    await screen.findAllByText("Studio B offer");
  });

  it("preserves a more recent browser result and does not overwrite an in-flight refresh", async () => {
    context.tenant = makeTenant("studio-a");
    const store = storeForCatalog();
    const endpoint =
      apiSlice.endpoints[
        kind === "memberships" ? "getPublicMembershipCatalog" : "getCoupons"
      ];
    const arg = { tenantSlug: "studio-a" };
    const snapshot = {
      fetchedAt: Date.now() - 100,
      kind,
      tenantSlug: arg.tenantSlug,
      data: dataFor(kind, "Older offer", arg.tenantSlug),
    };
    let finish;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const active = store.dispatch(endpoint.initiate(arg));
    const component = render(view(store, kind, snapshot));
    expect(endpoint.select(arg)(store.getState()).status).toBe("pending");
    expect(endpoint.select(arg)(store.getState()).data).toBeUndefined();
    await act(async () => {
      finish(Response.json(dataFor(kind, "Live offer", arg.tenantSlug)));
      await active;
    });
    await screen.findAllByText("Live offer");
    component.rerender(view(store, kind, { ...snapshot }));
    await screen.findAllByText("Live offer");
    expect(screen.queryAllByText("Older offer")).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    active.unsubscribe();
  });

  it("refreshes an expired snapshot and shows the live response", async () => {
    context.tenant = makeTenant("studio-a");
    const snapshot = {
      fetchedAt: Date.now() - 61_000,
      kind,
      tenantSlug: "studio-a",
      data: dataFor(kind, "Old offer", "studio-a"),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(dataFor(kind, "Live offer", "studio-a")),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(view(storeForCatalog(), kind, snapshot));
    await screen.findAllByText("Live offer");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByText("Old offer")).toHaveLength(0);
  });
});

describe("voucher checkout refresh", () => {
  const snapshotFor = (slug) => ({
    tenantSlug: slug,
    kind: "vouchers",
    fetchedAt: Date.now(),
    data: dataFor("vouchers", "Clay voucher", slug),
  });
  const title = en.PublicTenant.vouchers.checkout;
  const catalog = en.PublicTenant.catalog;

  it.each([
    { portal: false, failure: 503 },
    { portal: true, failure: 503 },
    { portal: false, failure: 429 },
    { portal: true, failure: "offline" },
  ])(
    "retains the focused checkout through a $failure refresh failure and retry (portal=$portal)",
    async ({ portal, failure }) => {
      context.tenant = makeTenant("studio-a");
      const refresh = Promise.withResolvers();
      const retry = Promise.withResolvers();
      const fetchMock = vi
        .fn()
        .mockReturnValueOnce(refresh.promise)
        .mockReturnValueOnce(retry.promise);
      vi.stubGlobal("fetch", fetchMock);
      const store = storeForCatalog();
      render(view(store, "vouchers", snapshotFor("studio-a"), { portal }));

      const email = screen.getByLabelText(title.email);
      const message = screen.getByLabelText(title.giftMessage);
      fireEvent.change(email, { target: { value: "buyer@example.com" } });
      fireEvent.change(message, { target: { value: "Happy birthday!" } });
      message.focus();
      act(() => {
        store.dispatch(apiSlice.internalActions.onFocus());
      });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(screen.getByLabelText(title.giftMessage)).toBe(message);
      expect(message).toHaveFocus();
      expect(screen.queryByText(catalog.loading)).not.toBeInTheDocument();

      await act(async () => {
        if (failure === "offline")
          refresh.reject(new TypeError("Failed to fetch"));
        else refresh.resolve(Response.json({}, { status: failure }));
      });
      const retryButton = await screen.findByRole("button", {
        name: catalog.retry,
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        catalog.refreshError,
      );
      expect(message).toHaveFocus();
      expect(
        screen.getByRole("button", { name: title.continue }),
      ).toBeEnabled();
      fireEvent.click(retryButton);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(screen.getByLabelText(title.giftMessage)).toBe(message);

      await act(async () =>
        retry.resolve(
          Response.json(
            dataFor("vouchers", "Updated clay voucher", "studio-a"),
          ),
        ),
      );
      await screen.findByText("Updated clay voucher");
      expect(
        screen.queryByRole("button", { name: catalog.retry }),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(title.email)).toHaveValue(
        "buyer@example.com",
      );
      expect(message).toHaveValue("Happy birthday!");
    },
  );

  it("keeps checkout hidden after access is denied until a successful response", async () => {
    context.tenant = makeTenant("studio-a");
    const retry = Promise.withResolvers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 403 }))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const store = storeForCatalog();
    render(view(store, "vouchers", snapshotFor("studio-a")));
    expect(screen.getByLabelText(title.email)).toBeVisible();

    act(() => {
      store.dispatch(apiSlice.internalActions.onFocus());
    });
    await screen.findByText(catalog.error);
    expect(screen.queryByLabelText(title.email)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: catalog.retry }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Clay voucher")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(title.email)).not.toBeInTheDocument();

    await act(async () => retry.resolve(Response.json({}, { status: 503 })));
    await screen.findByText(catalog.error);
    expect(screen.queryByLabelText(title.email)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: catalog.retry }));
    await screen.findByText(catalog.empty);
    expect(screen.queryByLabelText(title.email)).not.toBeInTheDocument();
  });
});

describe.each([
  { surface: "public page", portal: false },
  { surface: "customer portal", portal: true },
])("voucher selection on the $surface", ({ portal }) => {
  const checkout = en.PublicTenant.vouchers.checkout;
  const tenantSlug = "studio-a";
  const voucher = dataFor("vouchers", "Wheel voucher", tenantSlug)[0];
  const replacement = {
    ...voucher,
    id: "clay",
    name: "Clay voucher",
    price: 2000,
  };
  const offers = [voucher, replacement];
  const buttonFor = (name) =>
    screen.getByRole("button", { name: new RegExp(name) });
  const continueButton = () =>
    screen.getByRole("button", { name: checkout.continue });

  async function openCheckout(selection) {
    context.tenant = makeTenant(tenantSlug);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const store = storeForCatalog();
    const initialOffers =
      selection === "default" ? offers : [replacement, voucher];
    const onCheckoutRedirect = vi.fn();
    const snapshot = {
      tenantSlug,
      fetchedAt: Date.now(),
      kind: "vouchers",
      data: initialOffers,
    };
    // Public pages hydrate server-rendered offers. The portal loads them in the browser.
    if (portal) fetchMock.mockResolvedValueOnce(Response.json(initialOffers));
    const component = render(
      view(store, "vouchers", portal ? null : snapshot, {
        portal,
        onCheckoutRedirect,
      }),
    );
    await screen.findByRole("button", { name: /Wheel voucher/ });
    if (selection === "explicit") fireEvent.click(buttonFor(voucher.name));
    expect(buttonFor(voucher.name)).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText(checkout.email), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(checkout.giftMessage), {
      target: { value: "Enjoy the studio!" },
    });
    fireEvent.change(screen.getByLabelText(checkout.quantity), {
      target: { value: "2" },
    });

    const refresh = async (rows) => {
      fetchMock.mockResolvedValueOnce(Response.json(rows));
      act(() => {
        store.dispatch(apiSlice.internalActions.onFocus());
      });
      await waitFor(() => {
        const cards = screen.queryAllByRole("button", {
          name: /Wheel voucher|Clay voucher/,
        });
        expect(cards.map((card) => card.textContent)).toEqual(
          rows.map((row) => expect.stringContaining(row.name)),
        );
      });
    };
    const postedOrders = () =>
      fetchMock.mock.calls.filter(([, init]) => init.method === "POST");
    const submit = async (expectedId) => {
      const url = "https://checkout.stripe.com/c/pay/session-test";
      fetchMock.mockResolvedValueOnce(Response.json({ url }));
      fireEvent.click(continueButton());
      await waitFor(() => expect(onCheckoutRedirect).toHaveBeenCalledWith(url));
      const requests = postedOrders();
      expect(requests).toHaveLength(1);
      expect(requests[0][0]).toContain(
        `/public/tenants/${tenantSlug}/vouchers/checkout`,
      );
      expect(JSON.parse(requests[0][1].body)).toMatchObject({
        productId: expectedId,
        email: "buyer@example.com",
        giftMessage: "Enjoy the studio!",
        quantity: 2,
      });
    };
    return {
      refresh,
      submit,
      postedOrders,
      initialOffers,
      component,
      store,
      fetchMock,
    };
  }

  it("starts a new selection and clears buyer details when switching studios", async () => {
    const { component, store, fetchMock } = await openCheckout("explicit");
    context.tenant = makeTenant("studio-b");
    const otherOffer = { ...replacement, name: "Studio B offer" };
    fetchMock.mockResolvedValueOnce(Response.json([otherOffer, voucher]));
    component.rerender(view(store, "vouchers", null, { portal }));

    expect(
      await screen.findByRole("button", { name: /Studio B offer/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(buttonFor(voucher.name)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText(checkout.email)).toHaveValue("");
    expect(screen.getByLabelText(checkout.giftMessage)).toHaveValue("");
    expect(screen.getByLabelText(checkout.quantity)).toHaveValue("1");
  });

  it.each(["default", "explicit"])(
    "keeps the %s voucher when offers reorder",
    async (selection) => {
      const { initialOffers, refresh, submit } = await openCheckout(selection);
      await refresh([...initialOffers].reverse());
      expect(buttonFor(voucher.name)).toHaveAttribute("aria-pressed", "true");
      await submit(voucher.id);
    },
  );

  it.each([
    { selection: "default", empty: false },
    { selection: "explicit", empty: false },
    { selection: "default", empty: true },
  ])(
    "requires a new choice after the $selection voucher disappears (empty=$empty)",
    async ({ selection, empty }) => {
      const { refresh, submit, postedOrders } = await openCheckout(selection);
      await refresh(empty ? [] : [replacement]);
      if (empty) {
        expect(screen.getByText(en.PublicTenant.catalog.empty)).toBeVisible();
        expect(
          screen.queryByRole("button", { name: checkout.continue }),
        ).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole("status")).toHaveTextContent(checkout.reselect);
        expect(buttonFor(replacement.name)).toHaveAttribute(
          "aria-pressed",
          "false",
        );
        expect(continueButton()).toBeDisabled();
        // Also exercise the handler used for keyboard form submission.
        fireEvent.submit(continueButton().form);
      }
      expect(postedOrders()).toHaveLength(0);

      await refresh([replacement, voucher]);
      expect(screen.getByRole("status")).toHaveTextContent(checkout.reselect);
      expect(buttonFor(voucher.name)).toHaveAttribute("aria-pressed", "false");
      expect(buttonFor(replacement.name)).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(continueButton()).toBeDisabled();
      expect(screen.getByLabelText(checkout.email)).toHaveValue(
        "buyer@example.com",
      );
      expect(screen.getByLabelText(checkout.giftMessage)).toHaveValue(
        "Enjoy the studio!",
      );
      expect(screen.getByLabelText(checkout.quantity)).toHaveValue("2");
      fireEvent.click(buttonFor(replacement.name));
      expect(continueButton()).toBeEnabled();
      await submit(replacement.id);
    },
  );
});
