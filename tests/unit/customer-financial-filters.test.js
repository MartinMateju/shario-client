import { describe, expect, it } from "vitest";
import {
  EMPTY_FINANCIAL_FILTERS,
  countFinancialFilters,
  validateFinancialFilters,
} from "@/components/tables/people/customer-financial-filters.utils";
import {
  formatCustomerTotalSpent,
  getCustomerCredits,
} from "@/components/tables/people/people-table.utils";

describe("customer financial filter input", () => {
  it("allows zero, open bounds and Czech decimal input without losing signed balances", () => {
    expect(
      validateFinancialFilters({
        spendMin: "1 250,50",
        creditMin: "-10",
        creditMax: "0",
      }),
    ).toEqual({
      values: {
        ...EMPTY_FINANCIAL_FILTERS,
        spendMin: "1250.5",
        creditMin: "-10",
        creditMax: "0",
      },
      errors: {},
    });
    expect(
      countFinancialFilters({
        spendMin: 0,
        spendMax: 100,
        spendFrom: "2026-11-01",
        creditMax: 0,
      }),
    ).toBe(3);
  });

  it.each(["NaN", "Infinity", "1e3", "12.345", "9007199254740991", "1,2,3"])(
    "rejects invalid money input %s",
    (value) => {
      expect(
        validateFinancialFilters({ spendMin: value }).errors.spendMin,
      ).toBe("invalidAmount");
    },
  );

  it("checks actual calendar dates and both range directions", () => {
    expect(
      validateFinancialFilters({
        spendMin: "11",
        spendMax: "10",
        creditMin: "0",
        creditMax: "-1",
        spendFrom: "2026-11-17",
        spendTo: "2026-11-16",
      }).errors,
    ).toEqual({
      spendingRange: "spendingRange",
      creditRange: "creditRange",
      dateRange: "dateRange",
    });
    expect(
      validateFinancialFilters({ spendFrom: "2026-02-30" }).errors.spendFrom,
    ).toBe("invalidDate");
    expect(
      validateFinancialFilters({
        spendFrom: "2024-02-29",
        spendTo: "2024-02-29",
      }).errors,
    ).toEqual({});
  });

  it("honors zero-decimal currencies", () => {
    expect(
      validateFinancialFilters({ creditMin: "10.5" }, "JPY").errors.creditMin,
    ).toBe("invalidAmount");
    expect(validateFinancialFilters({ creditMin: "10" }, "JPY").errors).toEqual(
      {},
    );
  });
});

describe("financial filter display", () => {
  const customer = {
    totalSpentByCurrency: [{ currency: "EUR", amountMinor: 99900 }],
    totalSpentCurrency: "EUR",
  };
  it("shows the selected period amount independently of lifetime spending", () => {
    expect(
      formatCustomerTotalSpent(
        {
          ...customer,
          periodSpentByCurrency: [{ currency: "EUR", amountMinor: 12550 }],
          periodSpentCurrency: "EUR",
        },
        "en",
        true,
      ),
    ).toBe("€125.5");
    expect(
      formatCustomerTotalSpent(
        { ...customer, periodSpentByCurrency: [], periodSpentCurrency: "EUR" },
        "en",
        true,
      ),
    ).toBe("€0.00");
  });
  it("never substitutes lifetime spending or stale credits for unknown authoritative values", () => {
    expect(formatCustomerTotalSpent(customer, "en", true)).toBe("—");
    expect(
      formatCustomerTotalSpent(
        { ...customer, periodSpentByCurrency: null },
        "en",
        true,
      ),
    ).toBe("—");
    expect(
      getCustomerCredits({ moneyCredits: null, creditBalance: 100 }),
    ).toBeNull();
  });
});
