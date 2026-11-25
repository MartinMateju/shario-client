import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderAmount from "@/components/sales/OrderAmount";
import OrderDetailsDialog from "@/components/sales/OrderDetailsDialog";
import {
  buildOrdersCsv,
  formatMoney,
  getOrderLineAmount,
  getOrderTotal,
  getPaymentStatusKey,
  getSalesAmounts,
  summarizePaidOrderValue,
} from "@/components/sales/sales.utils";
import messages from "@/messages/en.json";

const t = (key) =>
  key.split(".").reduce((value, part) => value[part], messages.Sales);
const order = (changes = {}) => ({
  _id: "order-one",
  isPaid: true,
  currency: "CZK",
  cart: { totalPrice: 1000 },
  salesAmounts: {
    status: "available",
    currency: "CZK",
    grossAmountMinor: 80000,
    refundedAmountMinor: 20000,
    netAmountMinor: 60000,
    reason: null,
  },
  ...changes,
});

describe("verified sales monetary values", () => {
  it("uses the discounted snapshot and subtracts completed refunds, not cart or cash amounts", () => {
    const paid = order({ paidAmountMinor: 10000 });
    expect(getOrderTotal(paid)).toBe(800);
    expect(summarizePaidOrderValue([paid])).toEqual({
      amount: 600,
      currency: "CZK",
      reason: null,
    });
  });

  it("excludes unpaid orders from the headline while retaining paid cancelled orders after refunds", () => {
    const cancelled = order({
      status: "cancelled_order",
      salesAmounts: {
        ...order().salesAmounts,
        refundedAmountMinor: 80000,
        netAmountMinor: 0,
      },
    });
    expect(
      summarizePaidOrderValue([
        cancelled,
        { isPaid: false, cart: { totalPrice: 9000 } },
      ]).amount,
    ).toBe(0);
  });

  it.each([
    undefined,
    null,
    { status: "unavailable", reason: "missing_financial_snapshot" },
  ])(
    "does not guess missing financial data or coerce it to zero: %j",
    (salesAmounts) => {
      const historical = order({ salesAmounts });
      expect(getOrderTotal(historical)).toBeNull();
      expect(formatMoney(getOrderTotal(historical), "CZK")).toBe("—");
      expect(summarizePaidOrderValue([order(), historical])).toEqual({
        amount: null,
        currency: null,
        reason: "incomplete",
      });
    },
  );

  it.each([
    { grossAmountMinor: null },
    { netAmountMinor: "60000" },
    { refundedAmountMinor: -1 },
    { netAmountMinor: 80000 },
    { currency: "UNKNOWN" },
    { grossAmountMinor: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    "rejects invalid money DTOs rather than accepting approximate totals: %j",
    (invalid) => {
      expect(
        getSalesAmounts(
          order({ salesAmounts: { ...order().salesAmounts, ...invalid } }),
        ),
      ).toBeNull();
    },
  );

  it("does not add different currencies or present a truncated set as a total", () => {
    const euro = order({
      salesAmounts: { ...order().salesAmounts, currency: "EUR" },
    });
    expect(summarizePaidOrderValue([order(), euro]).reason).toBe(
      "mixedCurrencies",
    );
    expect(summarizePaidOrderValue([order()], { isTruncated: true })).toEqual({
      amount: null,
      currency: null,
      reason: "truncated",
    });
  });

  it("uses zero-decimal currency units and preserves verified zero values", () => {
    const yen = order({
      salesAmounts: { ...order().salesAmounts, currency: "JPY" },
    });
    expect(getOrderTotal(yen)).toBe(80000);
    expect(summarizePaidOrderValue([yen]).amount).toBe(60000);
    const free = order({
      salesAmounts: {
        ...order().salesAmounts,
        grossAmountMinor: 0,
        refundedAmountMinor: 0,
        netAmountMinor: 0,
      },
    });
    expect(getOrderTotal(free)).toBe(0);
    expect(summarizePaidOrderValue([free]).amount).toBe(0);
    expect(summarizePaidOrderValue([])).toEqual({
      amount: 0,
      currency: null,
      reason: null,
    });
  });

  it("uses captured discounted line prices only when they reconcile to the verified order", () => {
    const line = {
      description: "Historical class",
      grossAmountMinor: 80000,
      quantity: 1,
    };
    const paid = order({ lineItems: [line] });
    expect(getOrderLineAmount(paid, line)).toBe(800);
    expect(
      getOrderLineAmount(order(), {
        product: { price: 2000 },
        totalPrice: 1000,
      }),
    ).toBeNull();
    expect(
      getOrderLineAmount(
        order({ lineItems: [{ ...line, grossAmountMinor: 100000 }] }),
        line,
      ),
    ).toBeNull();
  });

  it("does not label a paid order's processing failure as a failed payment", () => {
    expect(getPaymentStatusKey(order({ status: "failed_order" }))).toBe("paid");
  });

  it("does not describe a paid order as unpaid when its payment timestamp is missing", () => {
    render(
      <OrderDetailsDialog
        order={order()}
        locale="en"
        t={t}
        onClose={() => {}}
        onCopy={() => {}}
      />,
    );
    expect(
      screen.getByText(messages.Sales.details.paymentDateUnknown),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(messages.Sales.details.notPaid),
    ).not.toBeInTheDocument();
  });

  it("shows the gross, refunded and remaining values clearly in the shared row/detail display", () => {
    render(<OrderAmount order={order()} locale="en" t={t} />);
    expect(
      screen.getByText(formatMoney(800, "CZK", "en").replace(/\s/g, " ")),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Refunded:/)).toHaveTextContent("200.00");
    expect(screen.getByText(/^Value after refunds:/)).toHaveTextContent(
      "600.00",
    );
  });

  it("explicitly labels unverified monetary values in the shared display", () => {
    render(
      <OrderAmount
        order={order({ salesAmounts: undefined })}
        locale="en"
        t={t}
      />,
    );
    expect(screen.getByText("Unavailable")).toHaveAttribute(
      "title",
      messages.Sales.money.unavailableDetail,
    );
    expect(screen.queryByText(/1,000/)).not.toBeInTheDocument();
  });

  it("exports final order value, refunds and net value with currency and explicit unavailable cells", () => {
    const csv = buildOrdersCsv({
      orders: [order(), order({ _id: "legacy", salesAmounts: undefined })],
      locale: "en",
      t,
    });
    expect(csv.split("\n")[0]).toContain(
      '"Order value","Refunded","Value after refunds","Currency","Amount availability"',
    );
    expect(csv.split("\n")[0]).toContain('"Created at"');
    expect(csv.split("\n")[1]).toContain('"800","200","600","CZK","Available"');
    expect(csv.split("\n")[2]).toContain('"","","","","Unavailable"');
    expect(csv).not.toContain("Sales.export.createdAt");
  });
});
