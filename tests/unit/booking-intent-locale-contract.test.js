import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
const captured = vi.hoisted(() => ({
  endpoints: {},
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        mutation: (definition) => definition,
        query: (definition) => definition,
      };
      captured.endpoints = endpoints(builder);
      return {};
    },
  },
}));
await import("@/lib/features/bookingIntents/bookingIntentsApiSlice");
describe("booking intent client locale contract", () => {
  it("canonicalizes rollout and legacy locale payloads", () => {
    expect(
      captured.endpoints.createPublicBookingIntent.query({
        tenantSlug: "studio-one",
        productId: "product-1",
        locale: "CZ",
      }).body,
    ).toMatchObject({
      productId: "product-1",
      locale: "cs",
    });
    expect(
      captured.endpoints.createPublicBookingIntent.query({
        tenantSlug: "studio-one",
        productId: "product-1",
        locale: "pl_PL",
      }).body.locale,
    ).toBe("pl");
    expect(
      captured.endpoints.checkoutBookingIntent.query({
        token: "valid-token-123",
        paymentMethod: "card",
        termsAccepted: true,
        locale: "de-DE",
      }).body.locale,
    ).toBe("de");
    expect(
      captured.endpoints.createPublicBookingIntent.query({
        tenantSlug: "studio-one",
        productId: "product-1",
        locale: "pt_PT",
      }).body.locale,
    ).toBe("pt-PT");
    expect(
      captured.endpoints.createPublicBookingIntent.query({
        tenantSlug: "studio-one",
        productId: "product-1",
        locale: "no_NO",
      }).body.locale,
    ).toBe("nb");
    expect(
      captured.endpoints.checkoutBookingIntent.query({
        token: "valid-token-123",
        paymentMethod: "card",
        termsAccepted: true,
        locale: "fi-FI",
      }).body.locale,
    ).toBe("fi");
    for (const [locale, expected] of [
      ["hu-HU", "hu"],
      ["el_GR", "el"],
      ["tr-TR", "tr"],
      ["nl_NL", "nl"],
      ["ro-RO", "ro"],
    ]) {
      expect(
        captured.endpoints.checkoutBookingIntent.query({
          token: "valid-token-123",
          paymentMethod: "card",
          termsAccepted: true,
          locale,
        }).body.locale,
      ).toBe(expected);
    }
  });
});
