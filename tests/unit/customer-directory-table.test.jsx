import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CustomersDataTable from "@/components/tables/people/CustomersDataTable";
import {
  exportCustomersToCsv,
  formatCustomerTotalSpent,
} from "@/components/tables/people/people-table.utils";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

const customer = {
  id: "customer-1",
  firstname: "Maria",
  lastname: "Gomesova",
  email: "maria@example.com",
  isAccessGranted: false,
  moneyCredits: 450.5,
};

function renderCustomer(overrides = {}) {
  return render(
    <CustomersDataTable
      customers={[{ ...customer, ...overrides }]}
      selectedIds={new Set()}
      locale="en"
      t={(key) => key}
      onToggleRow={vi.fn()}
      onToggleAll={vi.fn()}
    />,
  );
}

describe("customer directory statistics", () => {
  it("offers a direct mobile credit action for the correct customer", () => {
    const onAddCredits = vi.fn();
    render(
      <CustomersDataTable
        customers={[customer]}
        selectedIds={new Set()}
        locale="en"
        t={(key) => key}
        onToggleRow={vi.fn()}
        onToggleAll={vi.fn()}
        onAddCredits={onAddCredits}
      />,
    );
    const card = screen.getByRole("article");
    fireEvent.click(
      within(card).getByRole("button", { name: "actions.addCredits" }),
    );
    expect(onAddCredits).toHaveBeenCalledExactlyOnceWith(customer);
  });

  it("does not offer mobile credit grants without permission", () => {
    renderCustomer();
    expect(
      within(screen.getByRole("article")).queryByRole("button", {
        name: "actions.addCredits",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders unknown booking/spending values and canonical inactive status on desktop and mobile", () => {
    const { container } = renderCustomer();
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent(/^—$/);
    expect(cells[6]).toHaveTextContent(/^—$/);
    expect(cells[7]).toHaveTextContent("status.inactive");
    expect(screen.queryByText("dates.never")).not.toBeInTheDocument();
    const mobile = container.querySelector("article");
    expect(within(mobile).getByText("status.inactive")).toBeInTheDocument();
    expect(
      within(mobile).getByText("columns.lastBooking").parentElement,
    ).toHaveTextContent("—");
    expect(
      within(mobile).getByText("columns.totalSpent").parentElement,
    ).toHaveTextContent("—");
  });

  it("preserves real zero spending and a supplied booking date", () => {
    renderCustomer({ totalSpent: 0, lastBookingAt: "2025-01-02T12:00:00Z" });
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent("Jan 2, 2025");
    expect(cells[6]).toHaveTextContent("0");
    expect(cells[6]).not.toHaveTextContent("—");
  });

  it("renders recorded minor-unit currencies separately on desktop and mobile", () => {
    const { container } = renderCustomer({
      lastBookingAt: "2025-01-02T12:00:00Z",
      totalSpentByCurrency: [
        { currency: "CZK", amountMinor: 12345 },
        { currency: "EUR", amountMinor: 2500 },
      ],
      totalSpent: null,
      totalSpentCurrency: null,
    });
    const expected = "CZK 123.45 · €25";
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[6].textContent).toBe(expected);
    const mobile = container.querySelector("article");
    expect(
      within(mobile).getByText("columns.totalSpent").nextElementSibling
        .textContent,
    ).toBe(expected);
    expect(
      within(mobile).getByText("columns.lastBooking").nextElementSibling,
    ).toHaveTextContent("Jan 2, 2025");
  });

  it("keeps explicit unknown metrics private even when legacy values remain", () => {
    const { container } = renderCustomer({
      lastBookingAt: null,
      lastBooking: { start: "2025-01-02T12:00:00Z" },
      totalSpentByCurrency: null,
      totalSpent: 900,
      statistics: { totalSpent: 800, lastBookingAt: "2025-01-03T12:00:00Z" },
    });
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent(/^—$/);
    expect(cells[6]).toHaveTextContent(/^—$/);
    const mobile = container.querySelector("article");
    expect(
      within(mobile).getByText("columns.totalSpent").nextElementSibling,
    ).toHaveTextContent(/^—$/);
  });

  it("formats authorized no-sales as zero in the tenant currency", () => {
    renderCustomer({
      totalSpentByCurrency: [],
      totalSpent: 0,
      totalSpentCurrency: "EUR",
    });
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[6]).toHaveTextContent(/^€0\.00$/);
    expect(
      formatCustomerTotalSpent({
        totalSpentByCurrency: [],
        totalSpentCurrency: null,
      }),
    ).toBe("0");
  });

  it("does not divide zero-decimal currencies or trust a stale scalar", () => {
    expect(
      formatCustomerTotalSpent({
        totalSpentByCurrency: [{ currency: "JPY", amountMinor: 12345 }],
        totalSpent: 123.45,
        totalSpentCurrency: "CZK",
      }),
    ).toBe("¥12,345");
    expect(
      formatCustomerTotalSpent({ totalSpent: 12.5, totalSpentCurrency: "EUR" }),
    ).toBe("€12.50");
  });

  it.each(
    [
      {},
      [{ currency: "EUR", amountMinor: null }],
      [{ currency: "EUR", amountMinor: "100" }],
      [{ currency: "EUR", amountMinor: Number.NaN }],
      [{ currency: "EUR", amountMinor: -1 }],
      [{ currency: "EUR", amountMinor: 1.5 }],
      [{ currency: "", amountMinor: 100 }],
    ].map((totals) => [totals]),
  )(
    "does not turn malformed canonical spending into a plausible total (%j)",
    (totals) => {
      expect(
        formatCustomerTotalSpent({
          totalSpentByCurrency: totals,
          totalSpent: 100,
        }),
      ).toBe("—");
    },
  );

  it("exports the same recorded currencies and explicit unknown values", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    exportCustomersToCsv({
      customers: [
        {
          ...customer,
          lastBookingAt: "2025-01-02T12:00:00Z",
          totalSpentByCurrency: [
            { currency: "CZK", amountMinor: 12345 },
            { currency: "EUR", amountMinor: 2500 },
          ],
        },
        {
          ...customer,
          lastBookingAt: null,
          totalSpentByCurrency: null,
          totalSpent: 999,
        },
      ],
      locale: "en",
      t: (key) => key,
    });
    const blob = createObjectURL.mock.calls.at(-1)[0];
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(content).toContain('"Jan 2, 2025",CZK 123.45 · €25,');
    expect(content).not.toContain("999");
    expect(content).toContain(",—,—,status.inactive");
  });
});
