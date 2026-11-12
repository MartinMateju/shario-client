import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  bookingPaymentOptionCoversTotal,
  getSafeBookingIntentToken,
  normalizeBookingIntentResponse,
  normalizeBookingPaymentOptions,
} from "@/lib/features/bookingIntents/bookingIntentsApiSlice";

describe("secure booking intent contracts", () => {
  it("preserves minute balances separately from payment eligibility", () => {
    const [option] = normalizeBookingPaymentOptions([
      {
        method: "membership_credits",
        benefitKey: "hours",
        unit: "minute",
        available: 480,
        required: 90,
        coversTotal: true,
      },
    ]);
    expect(option).toMatchObject({
      available: true,
      availableUnits: 480,
      required: 90,
      unit: "minute",
    });
    expect(bookingPaymentOptionCoversTotal(option, 10000)).toBe(true);
    const [insufficient] = normalizeBookingPaymentOptions([
      {
        method: "membership_credits",
        unit: "minute",
        available: 30,
        required: 90,
        coversTotal: false,
        unavailableReason: "membership_insufficient_hours",
      },
    ]);
    expect(insufficient.availableUnits).toBe(30);
    expect(bookingPaymentOptionCoversTotal(insufficient, 10000)).toBe(false);
  });
  it("normalizes the server quote and merges display-safe entities", () => {
    const result = normalizeBookingIntentResponse({
      token: "intent-token-123",
      intent: {
        productId: "product-1",
        locationId: "location-1",
        start: "2026-08-03T08:00:00.000Z",
        end: "2026-08-03T10:00:00.000Z",
        quantity: 2,
      },
      quote: {
        currency: "eur",
        subtotalAmountMinor: 9000,
        discountAmountMinor: 1500,
        totalAmountMinor: 7500,
        product: { id: "product-1", name: "Wheel class" },
        location: { id: "location-1", name: "Main studio" },
      },
      paymentOptions: [{ method: "card", available: true }],
    });

    expect(result.intent.product).toEqual(
      expect.objectContaining({ id: "product-1" }),
    );
    expect(result.intent.location).toEqual(
      expect.objectContaining({ id: "location-1" }),
    );
    expect(result.quote).toEqual(
      expect.objectContaining({
        currency: "EUR",
        subtotalMinor: 9000,
        discountMinor: 1500,
        totalMinor: 7500,
      }),
    );
  });

  it("keeps multiple membership benefits independently selectable", () => {
    const options = normalizeBookingPaymentOptions([
      {
        method: "membership_credits",
        benefitKey: "open-studio-hours",
        available: true,
        coversTotal: true,
      },
      {
        method: "membership_credits",
        benefitKey: "monthly-visit",
        available: true,
        coversTotal: true,
      },
    ]);

    expect(options.map((option) => option.optionId)).toEqual([
      "membership_credits:open-studio-hours",
      "membership_credits:monthly-visit",
    ]);
    expect(new Set(options.map((option) => option.optionId)).size).toBe(2);
    expect(bookingPaymentOptionCoversTotal(options[0], 7500)).toBe(true);
    expect(
      bookingPaymentOptionCoversTotal(
        {
          method: "membership_credits",
          available: 10,
          required: 20,
          coversTotal: false,
          balanceMinor: null,
        },
        7500,
      ),
    ).toBe(false);
  });

  it("accepts only bounded opaque intent tokens", () => {
    expect(getSafeBookingIntentToken("valid-intent_123")).toBe(
      "valid-intent_123",
    );
    expect(getSafeBookingIntentToken("../../bookings")).toBe("");
    expect(getSafeBookingIntentToken("short")).toBe("");
  });

  it("posts creation and idempotent checkout to the dedicated endpoints", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/lib/features/bookingIntents/bookingIntentsApiSlice.js",
      ),
      "utf8",
    );

    expect(source).toContain(
      "`/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/booking-intents`",
    );
    expect(source).toContain(
      "`${authenticatedBookingIntentUrl(token)}/checkout`",
    );
    expect(source).toContain('"Idempotency-Key"');
    expect(source).toContain("membershipBenefitKey");
  });
});
