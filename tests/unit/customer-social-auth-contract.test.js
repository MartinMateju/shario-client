import { describe, expect, it } from "vitest";

import { normalizeCustomerSocialProviders } from "@/lib/features/auth/authApiSlice";
import {
  buildCustomerSocialStartUrl,
  CUSTOMER_SOCIAL_PROVIDERS,
  shouldQueryCustomerSocialProviders,
} from "@/utils/tenantAuthRouting";

describe("customer social authentication contracts", () => {
  it("normalizes the backend provider map and exposes only supported providers", () => {
    expect(
      normalizeCustomerSocialProviders({
        providers: {
          google: { available: true },
          apple: { available: false },
          facebook: { available: true },
        },
      }),
    ).toEqual(["google"]);
  });

  it("normalizes array variants, removes disabled providers, and deduplicates names", () => {
    expect(
      normalizeCustomerSocialProviders({
        data: {
          providers: [
            " GOOGLE ",
            { provider: "google" },
            { id: "apple", enabled: false },
            { name: "APPLE", available: true },
            "github",
          ],
        },
      }),
    ).toEqual(["google", "apple"]);
    expect(CUSTOMER_SOCIAL_PROVIDERS).toEqual(["google", "apple"]);
  });

  it("builds a customer-only provider start URL with tenant return context", () => {
    const startUrl = buildCustomerSocialStartUrl({
      apiBaseUrl: "https://api.shario.io",
      provider: " GOOGLE ",
      tenantSlug: " Studio-Olivka ",
      locale: "cs",
      nextPath:
        "/courses/course-1?productId=product-1&locationId=location-1#dates",
      returnOrigin: "https://studio-olivka.shario.io",
    });
    const parsed = new URL(startUrl);

    expect(parsed.origin).toBe("https://api.shario.io");
    expect(parsed.pathname).toBe("/auth/customer/social/google/start");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      tenantSlug: "studio-olivka",
      locale: "cs",
      returnOrigin: "https://studio-olivka.shario.io",
      next: "/courses/course-1?productId=product-1&locationId=location-1#dates",
    });
  });

  it.each([
    ["fr-FR", "fr"],
    ["es_ES", "es"],
    ["it-IT", "it"],
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv"],
    ["nb-NO", "nb"],
    ["no_NO", "nb"],
    ["fi-FI", "fi"],
    ["hu-HU", "hu"],
    ["el_GR", "el"],
    ["tr-TR", "tr"],
    ["nl_NL", "nl"],
    ["ro-RO", "ro"],
    ["ja-JP", "en"],
    ["pt-BR", "en"],
  ])("canonicalizes social-auth locale %s to %s", (locale, expected) => {
    const startUrl = buildCustomerSocialStartUrl({
      apiBaseUrl: "https://api.shario.io",
      provider: "google",
      tenantSlug: "studio-olivka",
      locale,
      returnOrigin: "https://studio-olivka.shario.io",
    });

    expect(new URL(startUrl).searchParams.get("locale")).toBe(expected);
  });

  it.each(["facebook", "github", "", "google-drive"])(
    "rejects an unsupported provider: %j",
    (provider) => {
      expect(
        buildCustomerSocialStartUrl({
          apiBaseUrl: "https://api.shario.io",
          provider,
          tenantSlug: "studio-olivka",
          locale: "en",
          returnOrigin: "https://studio-olivka.shario.io",
        }),
      ).toBe("");
    },
  );

  it.each([
    "javascript:alert(1)",
    "https://studio-olivka.shario.io/path",
    "https://studio-olivka.shario.io/?token=secret",
    "https://user:password@studio-olivka.shario.io",
  ])("rejects an unsafe return origin: %j", (returnOrigin) => {
    expect(
      buildCustomerSocialStartUrl({
        apiBaseUrl: "https://api.shario.io",
        provider: "google",
        tenantSlug: "studio-olivka",
        locale: "en",
        returnOrigin,
      }),
    ).toBe("");
  });

  it("drops an unsafe next destination without dropping the safe start URL", () => {
    const startUrl = buildCustomerSocialStartUrl({
      apiBaseUrl: "https://api.shario.io",
      provider: "apple",
      tenantSlug: "studio-olivka",
      locale: "en",
      nextPath: "//attacker.example/steal-session",
      returnOrigin: "https://studio-olivka.shario.io",
    });
    const parsed = new URL(startUrl);

    expect(parsed.pathname).toBe("/auth/customer/social/apple/start");
    expect(parsed.searchParams.has("next")).toBe(false);
  });

  it("does not query customer providers for an unpublished or unavailable workspace", () => {
    expect(
      shouldQueryCustomerSocialProviders({
        tenantSlug: "studio-draft",
        degraded: true,
      }),
    ).toBe(false);
    expect(
      shouldQueryCustomerSocialProviders({
        tenantSlug: "",
        degraded: false,
      }),
    ).toBe(false);
    expect(
      shouldQueryCustomerSocialProviders({
        tenantSlug: "studio-live",
        degraded: false,
      }),
    ).toBe(true);
  });
});
