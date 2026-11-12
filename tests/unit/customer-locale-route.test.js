import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: new Headers(),
  cookieValues: new Map(),
  redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => mocks.headers,
  cookies: async () => ({
    get: (name) =>
      mocks.cookieValues.has(name)
        ? { value: mocks.cookieValues.get(name) }
        : undefined,
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { enforcePublicTenantRouteLocale } from "@/lib/publicTenant/localeRouting";
import { getCustomerLocaleCookieName } from "@/i18n/customerLocalePreference";

const tenant = {
  slug: "studio-a",
  settings: {
    adminLanguage: "en",
    publicDefaultLanguage: "cs",
    supportedPublicLanguages: ["cs", "en"],
  },
};
const run = (locale = "en", studio = tenant) =>
  enforcePublicTenantRouteLocale({ tenant: studio, locale });
const preference = (kind, value, slug = "studio-a") =>
  mocks.cookieValues.set(getCustomerLocaleCookieName(kind, slug), value);

beforeEach(() => {
  mocks.headers = new Headers({
    "x-shario-public-pathname": "/portal",
    "x-shario-public-search": "?tab=studio-calendar&location=vaclavska",
  });
  mocks.cookieValues.clear();
  mocks.redirect.mockClear();
});

describe("initial tenant language", () => {
  it("selects the studio primary before the browser/workspace default and preserves deep links", async () => {
    mocks.cookieValues.set("NEXT_LOCALE", "en");
    mocks.cookieValues.set("SHARIO_LOCALE_PREFERENCE", "en");
    await run();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/cs/portal?tab=studio-calendar&location=vaclavska",
    );
  });
  it("localizes the root even when its primary is the placeholder locale", async () => {
    mocks.headers.set("x-shario-public-pathname", "/");
    mocks.headers.delete("x-shario-public-search");
    await run("en", { ...tenant, settings: { publicDefaultLanguage: "en" } });
    expect(mocks.redirect).toHaveBeenCalledWith("/en");
  });
  it("prefers an explicit current choice over a saved account default", async () => {
    preference("current", "en");
    preference("default", "cs");
    await run();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/en/portal?tab=studio-calendar&location=vaclavska",
    );
  });
  it("uses a saved default on a later visit without a session choice", async () => {
    preference("default", "en");
    await run();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/en/portal?tab=studio-calendar&location=vaclavska",
    );
  });
  it("ignores disabled languages and other studio preferences", async () => {
    preference("current", "de");
    preference("default", "fr");
    preference("default", "en", "studio-b");
    await run();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/cs/portal?tab=studio-calendar&location=vaclavska",
    );
  });
  it("preserves an explicitly supported URL without a redirect loop", async () => {
    preference("current", "cs");
    mocks.headers.set("x-shario-public-pathname", "/en/portal");
    await run();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("still clamps explicit unsupported URLs", async () => {
    mocks.headers.set("x-shario-public-pathname", "/de/portal/account");
    await run("de");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/cs/portal/account?tab=studio-calendar&location=vaclavska",
    );
  });
});
