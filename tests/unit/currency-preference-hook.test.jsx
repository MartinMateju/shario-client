import { act, cleanup, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import useCurrencyPreference from "@/hooks/useCurrencyPreference";
import {
  CURRENCY_PREFERENCE_COOKIE_NAME,
  persistCurrencyPreference,
  VISITOR_COUNTRY_COOKIE_NAME,
} from "@/utils/visitorPreferences";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "cookie");
  vi.restoreAllMocks();
  persistCurrencyPreference("USD");
  for (const name of [
    CURRENCY_PREFERENCE_COOKIE_NAME,
    VISITOR_COUNTRY_COOKIE_NAME,
  ])
    document.cookie = `${name}=; Path=/; Max-Age=0`;
});

describe("currency preference hook", () => {
  it.each(["discarded", "blocked"])(
    "keeps manual selections when cookies are %s",
    (mode) => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-PL"]);
      const originalCookie = Object.getOwnPropertyDescriptor(
        Document.prototype,
        "cookie",
      );
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get() {
          if (mode === "blocked")
            throw new DOMException("Cookies are blocked", "SecurityError");
          return originalCookie.get.call(document);
        },
        set() {
          if (mode === "blocked")
            throw new DOMException("Cookies are blocked", "SecurityError");
        },
      });
      const first = renderHook(() => useCurrencyPreference());
      expect(first.result.current.currency).toBe("PLN");
      act(() => first.result.current.setCurrency("CHF"));
      expect(first.result.current.currency).toBe("CHF");
      first.unmount();
      expect(
        renderHook(() => useCurrencyPreference()).result.current.currency,
      ).toBe("CHF");
    },
  );
  it("shares explicit anonymous choices across mounted surfaces and remounts", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-PL"]);
    const first = renderHook(() => useCurrencyPreference());
    const second = renderHook(() => useCurrencyPreference());
    expect(first.result.current.currency).toBe("PLN");
    act(() => first.result.current.setCurrency("CHF"));
    expect(second.result.current.currency).toBe("CHF");
    first.unmount();
    expect(
      renderHook(() => useCurrencyPreference()).result.current.currency,
    ).toBe("CHF");
  });
  it("locks saved SaaS billing currency ahead of operational currency, browser and anonymous choices", () => {
    document.cookie = `${CURRENCY_PREFERENCE_COOKIE_NAME}=PLN; Path=/`;
    const store = configureStore({
      reducer: () => ({
        auth: {
          token: "session",
          userInfo: { id: "owner" },
          tenant: { billingCurrency: "EUR", settings: { currency: "PLN" } },
        },
      }),
    });
    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useCurrencyPreference(), { wrapper });
    expect(result.current).toMatchObject({
      currency: "EUR",
      isTenantCurrency: true,
    });
    act(() => result.current.setCurrency("USD"));
    expect(result.current.currency).toBe("EUR");
    expect(document.cookie).toContain(`${CURRENCY_PREFERENCE_COOKIE_NAME}=PLN`);
  });
  it("does not use persisted tenant snapshots after logout", () => {
    document.cookie = `${VISITOR_COUNTRY_COOKIE_NAME}=CA; Path=/`;
    const store = configureStore({
      reducer: () => ({
        auth: {
          token: null,
          userInfo: null,
          tenant: { settings: { currency: "EUR" } },
        },
      }),
    });
    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );
    expect(
      renderHook(() => useCurrencyPreference(), { wrapper }).result.current
        .currency,
    ).toBe("CAD");
  });

  it("uses USD for legacy unsupported tenant billing currencies instead of visitor detection", () => {
    document.cookie = `${VISITOR_COUNTRY_COOKIE_NAME}=PL; Path=/`;
    const { result } = renderHook(() =>
      useCurrencyPreference({ tenantCurrency: "JPY" }),
    );
    expect(result.current).toMatchObject({
      currency: "USD",
      isTenantCurrency: true,
    });
    act(() => result.current.setCurrency("PLN"));
    expect(result.current.currency).toBe("USD");
  });
});
