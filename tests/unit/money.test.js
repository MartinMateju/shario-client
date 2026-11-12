import { describe, expect, it, vi } from "vitest";

import {
  formatMajorCurrencyAmount,
  formatMinorCurrencyAmount,
  getMajorCurrencyInputStep,
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
  minorUnitsToMajor,
  roundMajorCurrencyAmount,
  toNonNegativeMajorCurrencyAmount,
} from "@/utils/money";

const normalizeSpaces = (value) => value.replace(/\s/g, " ");

describe("currency precision", () => {
  it("uses the supported Stripe minor-unit rules", () => {
    expect(getStripeMinorUnitDigits("CZK")).toBe(2);
    expect(getStripeMinorUnitDigits("eur")).toBe(2);
    expect(getStripeMinorUnitDigits("JPY")).toBe(0);
    expect(getStripeMinorUnitDigits("clp")).toBe(0);
    expect(getMajorCurrencyInputStep("JPY")).toBe("1");
    expect(getMajorCurrencyInputStep("USD")).toBe("0.01");
  });

  it("converts minor units into major values", () => {
    expect(minorUnitsToMajor(12345, "CZK")).toBe(123.45);
    expect(minorUnitsToMajor("12345", "JPY")).toBe(12345);
    expect(minorUnitsToMajor("not-a-number", "EUR")).toBeNull();
  });

  it("rounds floating-point values using the currency precision", () => {
    expect(roundMajorCurrencyAmount(1.005, "EUR")).toBe(1.01);
    expect(roundMajorCurrencyAmount(-1.005, "EUR")).toBe(-1.01);
    expect(roundMajorCurrencyAmount(10.6, "JPY")).toBe(11);
    expect(roundMajorCurrencyAmount("invalid", "EUR", 99)).toBe(99);
  });

  it("clamps non-negative amounts and validates input precision", () => {
    expect(toNonNegativeMajorCurrencyAmount(-2.5, "EUR")).toBe(0);
    expect(toNonNegativeMajorCurrencyAmount(2.345, "EUR")).toBe(2.35);
    expect(toNonNegativeMajorCurrencyAmount("invalid", "EUR", 4)).toBe(4);

    expect(isValidMajorCurrencyPrecision(12.34, "EUR")).toBe(true);
    expect(isValidMajorCurrencyPrecision(12.345, "EUR")).toBe(false);
    expect(isValidMajorCurrencyPrecision(12, "JPY")).toBe(true);
    expect(isValidMajorCurrencyPrecision(12.5, "JPY")).toBe(false);
    expect(isValidMajorCurrencyPrecision("invalid", "EUR")).toBe(false);
  });
});

describe("currency formatting", () => {
  it("formats minor-unit values in English and Czech locales", () => {
    const english = normalizeSpaces(
      formatMinorCurrencyAmount(123450, "CZK", "en"),
    );
    const czech = normalizeSpaces(
      formatMinorCurrencyAmount(123450, "CZK", "cs"),
    );

    expect(english).toContain("1,234.5");
    expect(english).toContain("CZK");
    expect(czech).toContain("1 234,5");
    expect(czech).toContain("Kč");
  });

  it("formats zero-decimal currencies without a fractional amount", () => {
    const result = normalizeSpaces(
      formatMinorCurrencyAmount(1234, "JPY", "en"),
    );

    expect(result).toContain("1,234");
    expect(result).not.toMatch(/[.,]00/);
  });

  it("formats major values and returns the requested fallback when needed", () => {
    const result = normalizeSpaces(
      formatMajorCurrencyAmount(19.5, "EUR", "en"),
    );

    expect(result).toContain("19.50");
    expect(result).toContain("€");
    expect(formatMajorCurrencyAmount("invalid", "EUR", "en", "N/A")).toBe(
      "N/A",
    );
    expect(formatMinorCurrencyAmount(100, "", "en", "N/A")).toBe("N/A");
  });

  it("supports explicit locales and degrades safely when Intl rejects one", () => {
    expect(
      normalizeSpaces(formatMajorCurrencyAmount(10, "EUR", "de-DE")),
    ).toContain("10,00");

    const numberFormat = vi
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(() => {
        throw new RangeError("Unsupported locale");
      });

    expect(formatMinorCurrencyAmount(1050, "EUR", "xx")).toBe("10.5 EUR");
    expect(formatMajorCurrencyAmount(10.5, "EUR", "xx")).toBe("10.5 EUR");
    numberFormat.mockRestore();
  });
});
