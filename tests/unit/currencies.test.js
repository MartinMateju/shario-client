import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PLATFORM_BILLING_CURRENCY,
  DEFAULT_STUDIO_COMMERCE_CURRENCY,
  PLATFORM_BILLING_CURRENCIES,
  STUDIO_COMMERCE_CURRENCIES,
  STUDIO_COMMERCE_CURRENCY_OPTIONS,
  getCurrencyName,
  getCurrencyOptions,
  isPlatformBillingCurrency,
  isStudioCommerceCurrency,
  normalizeCurrency,
  resolvePlatformBillingCurrency,
  resolveStudioCommerceCurrency,
} from "@/config/currencies";

describe("currency contracts", () => {
  it("keeps platform billing currencies within the studio currency set", () => {
    expect(
      PLATFORM_BILLING_CURRENCIES.every((currency) =>
        STUDIO_COMMERCE_CURRENCIES.includes(currency),
      ),
    ).toBe(true);
    expect(STUDIO_COMMERCE_CURRENCIES).toContain(
      DEFAULT_STUDIO_COMMERCE_CURRENCY,
    );
    expect(PLATFORM_BILLING_CURRENCIES).toContain(
      DEFAULT_PLATFORM_BILLING_CURRENCY,
    );
  });

  it("normalizes case, whitespace, null, and non-string values", () => {
    expect(normalizeCurrency(" eur ")).toBe("EUR");
    expect(normalizeCurrency(null)).toBe("");
    expect(normalizeCurrency(123)).toBe("123");
  });

  it("distinguishes commerce and platform billing support", () => {
    expect(isStudioCommerceCurrency(" jpy ")).toBe(true);
    expect(isPlatformBillingCurrency("jpy")).toBe(false);
    expect(isPlatformBillingCurrency("usd")).toBe(true);
    expect(isStudioCommerceCurrency("btc")).toBe(false);
  });

  it("resolves supported currencies and falls back predictably", () => {
    expect(resolveStudioCommerceCurrency(" usd ")).toBe("USD");
    expect(resolveStudioCommerceCurrency("btc")).toBe("CZK");
    expect(resolveStudioCommerceCurrency("", "EUR")).toBe("EUR");

    expect(resolvePlatformBillingCurrency(" gbp ")).toBe("GBP");
    expect(resolvePlatformBillingCurrency("JPY")).toBe("USD");
    expect(resolvePlatformBillingCurrency(null, "USD")).toBe("USD");
  });

  it("creates stable static commerce options", () => {
    expect(STUDIO_COMMERCE_CURRENCY_OPTIONS).toHaveLength(
      STUDIO_COMMERCE_CURRENCIES.length,
    );
    expect(STUDIO_COMMERCE_CURRENCY_OPTIONS[0]).toEqual({
      value: "CZK",
      label: "CZK — Czech koruna",
    });
  });
});

describe("localized currency labels", () => {
  it("uses Intl currency display names when available", () => {
    expect(getCurrencyName("eur", "en")).toMatch(/euro/i);
    expect(getCurrencyName("USD", "en")).toMatch(/dollar/i);
  });

  it("uses the built-in name when Intl rejects a locale", () => {
    const displayNames = vi
      .spyOn(Intl, "DisplayNames")
      .mockImplementation(() => {
        throw new RangeError("Unsupported locale");
      });

    expect(getCurrencyName("czk", "unsupported")).toBe("Czech koruna");
    expect(getCurrencyName("xyz", "unsupported")).toBe("XYZ");
    displayNames.mockRestore();
  });

  it("builds options for an explicit subset and locale", () => {
    const options = getCurrencyOptions(["EUR", "JPY"], "en");

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({ value: "EUR" });
    expect(options[0].label).toMatch(/^EUR — /);
    expect(options[1].label).toMatch(/^JPY — /);
  });
});
