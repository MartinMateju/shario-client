import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCountryCode,
  getCountryFromLocales,
  getCountryOptions,
  getCurrencyForCountry,
  getTimeZoneOptions,
} from "@/config/regions";
import {
  CURRENCY_PREFERENCE_COOKIE_NAME,
  getVisitorPreferences,
  persistCurrencyPreference,
  resolveVisitorCurrency,
  VISITOR_COUNTRY_COOKIE_NAME,
} from "@/utils/visitorPreferences";
import { resolveBrowserLocale } from "@/i18n/browserLocale";

afterEach(() => {
  for (const name of [
    CURRENCY_PREFERENCE_COOKIE_NAME,
    VISITOR_COUNTRY_COOKIE_NAME,
  ])
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  vi.restoreAllMocks();
});

describe("international visitor preferences", () => {
  it.each([
    ["PL", "PLN"],
    ["DE", "EUR"],
    ["BG", "EUR"],
    ["CZ", "CZK"],
    ["GB", "GBP"],
    ["CH", "CHF"],
    ["DK", "DKK"],
    ["SE", "SEK"],
    ["NO", "NOK"],
    ["CA", "CAD"],
    ["AU", "AUD"],
    ["JP", "USD"],
    ["HU", "USD"],
    ["", "USD"],
  ])("suggests %s country currency %s", (country, currency) => {
    expect(getCurrencyForCountry(country)).toBe(currency);
  });
  it("uses real locale regions without guessing a country from language", () => {
    expect(getCountryFromLocales(["en", "pl", "en-PL"])).toBe("PL");
    expect(getCountryFromLocales(["not a locale", "en_GB"])).toBe("GB");
    expect(getCountryFromLocales(["en", "pl"])).toBe("");
    expect(resolveVisitorCurrency({ locales: ["pl"] })).toBe("USD");
  });
  it("keeps tenant and manual choices ahead of country and browser", () => {
    expect(
      resolveVisitorCurrency({
        tenantCurrency: "GBP",
        selectedCurrency: "EUR",
        country: "PL",
        locales: ["en-US"],
      }),
    ).toBe("GBP");
    expect(
      resolveVisitorCurrency({ selectedCurrency: "EUR", country: "PL" }),
    ).toBe("EUR");
    expect(
      resolveVisitorCurrency({
        selectedCurrency: "invalid",
        country: "PL",
        locales: ["en-GB"],
      }),
    ).toBe("PLN");
    expect(resolveVisitorCurrency({ country: "JP", locales: ["en-GB"] })).toBe(
      "USD",
    );
  });
  it("keeps language independent and remembers the manual currency on registration", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-CA"]);
    document.cookie = `${VISITOR_COUNTRY_COOKIE_NAME}=PL; Path=/`;
    expect(getVisitorPreferences({ locale: "en" })).toMatchObject({
      locale: "en",
      country: "PL",
      currency: "PLN",
    });
    persistCurrencyPreference("chf");
    expect(getVisitorPreferences({ locale: "cs" })).toMatchObject({
      locale: "cs",
      country: "PL",
      currency: "CHF",
    });
  });
  it("offers international countries and timezones while preserving saved values", () => {
    expect(getCountryCode("Czech Republic")).toBe("CZ");
    expect(getCountryCode("Poland")).toBe("PL");
    expect(getCountryOptions("en", "PL")).toContainEqual({
      value: "PL",
      label: "Poland",
    });
    expect(getCountryOptions("en", "Legacy region")).toContainEqual({
      value: "Legacy region",
      label: "Legacy region",
    });
    expect(getTimeZoneOptions("Europe/Warsaw")).toContain("Europe/Warsaw");
  });
  it("negotiates supported languages using browser quality preferences", () => {
    expect(resolveBrowserLocale("en-GB,cs;q=0.8", ["en", "cs"])).toBe("en");
    expect(
      resolveBrowserLocale("en;q=0.4,pl-PL;q=0.9,cs;q=0", ["en", "cs", "pl"]),
    ).toBe("pl");
    expect(resolveBrowserLocale("ja-JP,cs;q=0.8", ["en", "cs"])).toBe("cs");
    expect(resolveBrowserLocale("ja-JP,*;q=0.1", ["en", "cs"])).toBeNull();
    expect(resolveBrowserLocale("pt-BR", ["en", "pt-PT"])).toBeNull();
  });
});
