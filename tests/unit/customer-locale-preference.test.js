import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCustomerCurrentLocale,
  getCustomerCurrentLocale,
  getCustomerDefaultLocale,
  getCustomerLocaleCookieName,
  persistCustomerCurrentLocale,
  persistCustomerDefaultLocale,
} from "@/i18n/customerLocalePreference";

beforeEach(() => {
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0].trim()}=; Path=/; Max-Age=0`;
  }
});

describe("customer language preferences", () => {
  it("isolates current and default preferences by studio and from platform language", () => {
    document.cookie = "SKAB_LOCALE_PREFERENCE=en; Path=/";
    document.cookie = "NEXT_LOCALE=en; Path=/";
    persistCustomerCurrentLocale("CZ", "studio-a");
    persistCustomerDefaultLocale("en", "studio-a");
    persistCustomerCurrentLocale("en", "studio-b");
    expect(getCustomerCurrentLocale("studio-a")).toBe("cs");
    expect(getCustomerDefaultLocale("studio-a")).toBe("en");
    expect(getCustomerCurrentLocale("studio-b")).toBe("en");
    expect(getCustomerDefaultLocale("studio-b")).toBeNull();
    expect(document.cookie).toContain("SKAB_LOCALE_PREFERENCE=en");
    expect(document.cookie).toContain("NEXT_LOCALE=en");
  });
  it("clears the saved default without clearing current language", () => {
    persistCustomerCurrentLocale("cs", "studio-a");
    persistCustomerDefaultLocale("en", "studio-a");
    persistCustomerDefaultLocale(null, "studio-a");
    expect(getCustomerDefaultLocale("studio-a")).toBeNull();
    expect(getCustomerCurrentLocale("studio-a")).toBe("cs");
    clearCustomerCurrentLocale("studio-a");
    expect(getCustomerCurrentLocale("studio-a")).toBeNull();
  });
  it("ignores invalid values and unsafe tenant cookie names", () => {
    persistCustomerCurrentLocale("invalid", "studio-a");
    persistCustomerDefaultLocale("en", "studio-a; Domain=example.com");
    expect(document.cookie).toBe("");
    expect(getCustomerLocaleCookieName("unknown", "studio-a")).toBeNull();
    document.cookie = `${getCustomerLocaleCookieName("current", "studio-a")}=%XX; Path=/`;
    expect(getCustomerCurrentLocale("studio-a")).toBeNull();
  });
});
