import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VoucherOrdersPanel, {
  VoucherOrderDialog,
} from "@/components/vouchers/VoucherOrdersPanel";
import messages from "@/messages/en.json";
import csMessages from "@/messages/cs.json";

const state = vi.hoisted(() => ({
  tenant: { id: "studio-a" },
  access: { roleKey: "owner", status: "active", permissions: [] },
  list: vi.fn(),
  query: vi.fn(),
  dispatch: vi.fn(),
  download: vi.fn(),
  reset: vi.fn(),
  save: vi.fn(),
  refetch: vi.fn(),
  detail: null,
  fetching: false,
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => state.tenant,
  selectCurrentWorkspaceAccess: () => state.access,
}));
vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useGetCouponOrdersWithFiltersMutation: () => [state.list],
  useGetCouponOrderQuery: (id) => {
    state.query(id);
    return {
      currentData: state.detail,
      isFetching: state.fetching,
      isError: false,
      refetch: state.refetch,
    };
  },
  useDispatchCouponOrderMutation: () => [state.dispatch],
  useDownloadCouponOrderPdfMutation: () => [
    state.download,
    { reset: state.reset },
  ],
}));
vi.mock("@/components/vouchers/purchase/voucherPurchaseAccess", () => ({
  savePurchasedVoucherPdf: (...args) => state.save(...args),
}));
const delivery = {
  requested: true,
  status: "awaiting_dispatch",
  postageFeeMinor: 750,
  currency: "EUR",
  canDispatch: true,
  address: {
    firstname: "Ada",
    lastname: "Nováková",
    street: "Clay street 7",
    city: "Brno",
    postalCode: "602 00",
    countryCode: "CZ",
  },
};
const order = {
  _id: "order-1",
  email: "ada@example.test",
  productNameSnapshot: "Wheel course gift",
  totalSnapshot: 107.5,
  currencySnapshot: "EUR",
  quantity: 1,
  createdAt: "2026-10-20T10:00:00Z",
  physicalDelivery: {
    ...delivery,
    canDispatch: false,
    blockedReason: "details_required",
  },
};
const renderInLocale = (component, locale = "en") =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "cs" ? csMessages : messages}
      timeZone="UTC"
    >
      {component}
    </NextIntlClientProvider>,
  );
const result = (value) => ({
  unwrap: () => Promise.resolve(value),
  abort: vi.fn(),
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
beforeEach(() => {
  vi.clearAllMocks();
  state.access = { roleKey: "owner", status: "active", permissions: [] };
  state.tenant = { id: "studio-a" };
  state.list.mockImplementation(() =>
    result({ couponOrders: [order], totalPages: 1, totalCount: 1 }),
  );
  state.detail = {
    order: {
      id: order._id,
      email: order.email,
      productName: order.productNameSnapshot,
      quantity: 1,
      total: 107.5,
      currency: "EUR",
    },
    physicalDelivery: delivery,
    documents: [
      { index: 0, filename: "voucher-1.pdf", contentType: "application/pdf" },
    ],
  };
  state.fetching = false;
  state.dispatch.mockImplementation(() =>
    result({
      ...state.detail,
      physicalDelivery: {
        ...delivery,
        status: "dispatched",
        canDispatch: false,
      },
    }),
  );
  state.download.mockImplementation(() =>
    result({ base64: btoa("%PDF-original") }),
  );
});

describe("voucher orders and dispatch", () => {
  it("clears protected rows and the open order when switching workspaces", async () => {
    const next = deferred();
    const view = renderInLocale(<VoucherOrdersPanel />);
    await screen.findByText("ada@example.test");
    fireEvent.click(screen.getByRole("button", { name: "View order" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    state.tenant = { id: "studio-b" };
    state.list.mockImplementationOnce(() => ({
      unwrap: () => next.promise,
      abort: vi.fn(),
    }));
    view.rerender(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <VoucherOrdersPanel />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.test")).not.toBeInTheDocument();
    expect(screen.queryByText("Clay street 7")).not.toBeInTheDocument();
    await act(async () => next.resolve({ couponOrders: [], totalPages: 0 }));
    expect(
      screen.getByText("No voucher orders match these filters."),
    ).toBeInTheDocument();
  });
  it("does not request orders without voucher view permission", () => {
    state.access = { roleKey: "custom", status: "active", permissions: [] };
    renderInLocale(<VoucherOrdersPanel />);
    expect(
      screen.getByText(messages.VoucherFoundation.orders.noAccess),
    ).toBeInTheDocument();
    expect(state.list).not.toHaveBeenCalled();
  });
  it("shows snapshot totals and applies delivery filters with actual booleans", async () => {
    renderInLocale(<VoucherOrdersPanel />);
    expect(await screen.findByText("ada@example.test")).toBeInTheDocument();
    expect(screen.getByText("€107.50")).toBeInTheDocument();
    expect(state.list).toHaveBeenLastCalledWith({
      search: "",
      sendPost: "all",
      physicalStatus: "all",
      page: 1,
      limit: 10,
    });
    fireEvent.change(screen.getByLabelText("Delivery"), {
      target: { value: "false" },
    });
    expect(state.list).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sendPost: false }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Postal status"), {
      target: { value: "awaiting_dispatch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sendPost: true,
          physicalStatus: "awaiting_dispatch",
        }),
      ),
    );
  });
  it("discards stale list responses and keeps filters available after a failure", async () => {
    const old = deferred();
    state.list.mockImplementationOnce(() => ({
      unwrap: () => old.promise,
      abort: vi.fn(),
    }));
    renderInLocale(<VoucherOrdersPanel />);
    fireEvent.change(screen.getByLabelText("Search orders"), {
      target: { value: "new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await screen.findByText("ada@example.test");
    await act(async () =>
      old.resolve({
        couponOrders: [{ ...order, email: "old@example.test" }],
        totalPages: 1,
      }),
    );
    expect(screen.queryByText("old@example.test")).not.toBeInTheDocument();
    state.list.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error("offline")),
    }));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not load these orders.",
    );
    expect(screen.queryByText("ada@example.test")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("ada@example.test");
  });
  it("shows the full protected address and downloads the existing PDF without creating codes", async () => {
    renderInLocale(
      <VoucherOrderDialog
        orderId="order-1"
        canManage={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Ada Nováková")).toBeInTheDocument();
    expect(within(dialog).getByText("Clay street 7")).toBeInTheDocument();
    expect(within(dialog).getByText("602 00 Brno")).toBeInTheDocument();
    expect(within(dialog).getByText("Czechia")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark as dispatched" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download voucher 1" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith(expect.any(Blob), 0),
    );
    expect(state.download).toHaveBeenCalledWith({
      orderId: "order-1",
      index: 0,
    });
    expect(state.reset).toHaveBeenCalledOnce();
    expect(state.dispatch).not.toHaveBeenCalled();
  });
  it.each([
    ["not_paid", "Payment must be confirmed before dispatch."],
    [
      "voucher_expired",
      "An issued voucher has expired. Review the order before dispatch.",
    ],
    [
      "address_incomplete",
      "The postal address is incomplete. Contact the customer before dispatch.",
    ],
  ])("honors server dispatch eligibility for %s", (blockedReason, text) => {
    state.detail = {
      ...state.detail,
      documents: [],
      physicalDelivery: { ...delivery, canDispatch: false, blockedReason },
    };
    renderInLocale(
      <VoucherOrderDialog
        orderId="order-1"
        canManage
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Mark as dispatched" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download voucher 1" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh order" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it("uses one operation id across a lost response and retry, and blocks duplicate clicks", async () => {
    const pending = deferred();
    state.dispatch.mockImplementationOnce(() => ({
      unwrap: () => pending.promise,
    }));
    const updated = vi.fn();
    renderInLocale(
      <VoucherOrderDialog
        orderId="order-1"
        canManage
        onClose={vi.fn()}
        onUpdated={updated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark as dispatched" }));
    expect(
      screen.getByRole("button", { name: "Saving dispatch…" }),
    ).toBeDisabled();
    expect(state.dispatch).toHaveBeenCalledOnce();
    const first = state.dispatch.mock.calls[0][0];
    expect(first).toEqual({
      orderId: "order-1",
      operationId: expect.any(String),
    });
    await act(async () => pending.reject(new Error("response lost")));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dispatch could not be confirmed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark as dispatched" }));
    await screen.findByText("Postal dispatch recorded.");
    expect(state.dispatch.mock.calls[1][0]).toEqual(first);
    expect(updated).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Mark as dispatched" }),
    ).not.toBeInTheDocument();
  });
  it("does not expose stale detail while refreshing", () => {
    state.fetching = true;
    renderInLocale(
      <VoucherOrderDialog
        orderId="order-2"
        canManage
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByText("Clay street 7")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark as dispatched" }),
    ).not.toBeInTheDocument();
  });
  it("shows unknown legacy postage as unknown rather than free", () => {
    state.detail = {
      ...state.detail,
      physicalDelivery: { ...delivery, postageFeeMinor: null },
    };
    renderInLocale(
      <VoucherOrderDialog
        orderId="order-1"
        canManage={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("Postage: —")).toBeInTheDocument();
    expect(screen.queryByText("Postage: €0")).not.toBeInTheDocument();
  });
  it("returns to page one after dispatch removes the final filtered row", async () => {
    state.list.mockImplementation((args) =>
      result({ couponOrders: [order], totalPages: args.page === 1 ? 2 : 2 }),
    );
    renderInLocale(<VoucherOrdersPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "View order" }));
    state.list.mockImplementation(() =>
      result({ couponOrders: [order], totalPages: 1 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark as dispatched" }));
    await screen.findByText("Postal dispatch recorded.");
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
  });
  it("renders Czech order and dispatch controls", async () => {
    renderInLocale(<VoucherOrdersPanel />, "cs");
    await screen.findByRole("button", { name: "Zobrazit objednávku" });
    expect(
      screen.getByRole("heading", { name: "Objednávky poukazů a odesílání" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Stav zásilky")).toBeInTheDocument();
  });
});
