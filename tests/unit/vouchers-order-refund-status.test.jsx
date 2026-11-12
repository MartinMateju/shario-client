import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import VouchersTable from "@/components/tables/VouchersTable";
import VoucherOrderRefundStatus from "@/components/vouchers/VoucherOrderRefundStatus";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  list: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
  update: vi.fn(),
  orders: [
    {
      _id: "review-order",
      productNameSnapshot: "Partially redeemed voucher",
      refundState: "manual_review",
      refundReviewReason:
        "Refund includes redeemed value. <img src=x onerror=alert(1)>",
      status: "processed_coupon",
    },
    {
      _id: "revoked-order",
      productNameSnapshot: "Refunded voucher",
      refundState: "revoked",
      status: "processed_coupon",
    },
    {
      _id: "normal-order",
      productNameSnapshot: "Ordinary voucher",
      status: "processed_coupon",
      physicalDelivery: { requested: true, status: "dispatched" },
    },
  ],
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: { userInfo: { id: "user-1", isAdmin: false } },
      language: { language: "EN" },
    }),
}));

vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useGetUsersQuery: () => ({ isLoading: false }),
}));

vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useGetCouponOrdersWithFiltersMutation: () => [
    mocks.list,
    {
      data: { couponOrders: mocks.orders, totalCount: 3, totalPages: 1 },
      isLoading: false,
      isError: false,
    },
  ],
  useUpdateCouponOrderStatusMutation: () => [
    mocks.update,
    { isLoading: false },
  ],
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));

const mount = (children) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>,
  );

describe("voucher order refund status", () => {
  it("filters dispatched orders by postal status while preserving payment status filters", async () => {
    mount(<VouchersTable />);
    fireEvent.click(screen.getByRole("button", { name: "" }));
    const statusSelect = screen
      .getByRole("option", { name: "Všechny stavy" })
      .closest("select");
    fireEvent.change(statusSelect, { target: { value: "shipped_coupon" } });
    fireEvent.click(screen.getByRole("button", { name: "Vyhledat" }));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ physicalStatus: "dispatched" }),
      ),
    );
    expect(mocks.list.mock.lastCall[0]).not.toHaveProperty("status");
    fireEvent.change(statusSelect, { target: { value: "processed_coupon" } });
    fireEvent.click(screen.getByRole("button", { name: "Vyhledat" }));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "processed_coupon" }),
      ),
    );
    expect(mocks.list.mock.lastCall[0]).not.toHaveProperty("physicalStatus");
  });
  it("shows review reasons and completed refund badges in both mobile and desktop order views", () => {
    const { container } = mount(<VouchersTable />);
    expect(screen.getAllByText("Needs review")).toHaveLength(2);
    expect(screen.getAllByText("Refunded · codes revoked")).toHaveLength(2);
    expect(screen.getAllByText("Odesláno")).toHaveLength(2);
    expect(
      screen.getAllByText(mocks.orders[0].refundReviewReason),
    ).toHaveLength(2);
    const desktop = within(screen.getByRole("table"));
    expect(desktop.getByText("Needs review")).toBeInTheDocument();
    expect(desktop.getByText("Refunded · codes revoked")).toBeInTheDocument();
    expect(
      desktop.getByText(mocks.orders[0].refundReviewReason),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /resolve|refund|approve/i }),
    ).not.toBeInTheDocument();
  });

  it("adds no refund message for an order without a refund state", () => {
    const { container } = mount(
      <VoucherOrderRefundStatus order={mocks.orders[2]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
