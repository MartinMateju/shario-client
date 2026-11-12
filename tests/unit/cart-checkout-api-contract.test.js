import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      Object.assign(
        captured.endpoints,
        endpoints({
          query: (definition) => definition,
          mutation: (definition) => definition,
        }),
      );
      return {};
    },
  },
}));

import "@/lib/features/checkout/checkoutSlice";
import "@/lib/features/credits/creditsApiSlice";

describe("cart checkout idempotency API contract", () => {
  it("requests an uncached server quote for the current cart", () => {
    const body = {
      cart: [{ product: { id: "studio" }, quantity: 2 }],
      locale: "cs",
    };
    expect(
      captured.endpoints.getCartCheckoutQuote.query({
        ...body,
        ownerScope: "tenant/customer-one",
      }),
    ).toEqual({
      url: "/checkout/quote",
      method: "POST",
      cache: "no-store",
      body,
    });
    expect(captured.endpoints.getCartCheckoutQuote.keepUnusedDataFor).toBe(0);
  });

  it("redeems membership with the selected benefit and an idempotency header", () => {
    const body = {
      cart: [{ product: { id: "studio" }, quantity: 2 }],
      locale: "cs",
      membershipBenefitKey: "personal_hours",
    };
    expect(
      captured.endpoints.checkoutWithMembership.query({
        ...body,
        idempotencyKey: "membership-123",
      }),
    ).toEqual({
      url: "/checkout/membership",
      method: "POST",
      headers: { "Idempotency-Key": "membership-123" },
      body,
    });
    expect(
      captured.endpoints.checkoutWithMembership.invalidatesTags({
        status: "confirmed",
        orderId: "member-order",
      }),
    ).toEqual(
      expect.arrayContaining([
        { type: "Membership", id: "MINE" },
        { type: "MembershipLedger", id: "MINE" },
        { type: "Booking", id: "MINE" },
      ]),
    );
    expect(
      captured.endpoints.checkoutWithMembership.invalidatesTags(undefined, {
        status: 409,
      }),
    ).toEqual([]);
  });
  it("refreshes customer bookings and orders after immediate server confirmation", () => {
    expect(
      captured.endpoints.checkout.invalidatesTags({
        status: "confirmed",
        orderId: "free-order",
      }),
    ).toEqual([
      { type: "Booking", id: "MINE" },
      { type: "Booking", id: "LIST" },
      { type: "Booking", id: "MINE-AVAILABILITY" },
      { type: "Order", id: "LIST" },
    ]);
  });

  it.each([
    [{ url: "https://checkout.stripe.com/session" }, undefined],
    [{ status: "requires_payment", orderId: "pending-order" }, undefined],
    [{ status: "confirmed" }, undefined],
    [undefined, { status: 500 }],
  ])(
    "keeps existing bookings cached until checkout is confirmed",
    (result, error) => {
      expect(
        captured.endpoints.checkout.invalidatesTags(result, error),
      ).toEqual([]);
    },
  );

  it.each([
    ["checkout", "/checkout"],
    ["checkoutWithCredits", "/checkout/credits"],
  ])(
    "sends %s idempotency through a header while preserving the cart body",
    (endpoint, url) => {
      const cart = [
        { product: { id: "studio" }, quantity: 2, numberOfGuests: 3 },
      ];
      const request = {
        locale: "en",
        cart,
        idempotencyKey: "cart-12345678-1234-1234-1234-123456789abc",
      };
      const first = captured.endpoints[endpoint].query(request);
      const retry = captured.endpoints[endpoint].query(request);
      expect(first).toEqual({
        url,
        method: "POST",
        headers: { "Idempotency-Key": request.idempotencyKey },
        body: { locale: "en", cart },
      });
      expect(retry.headers).toEqual(first.headers);
      expect(first.body).not.toHaveProperty("idempotencyKey");
      expect(request.idempotencyKey).toBe(first.headers["Idempotency-Key"]);
    },
  );
});

describe("anonymous guest checkout API contract", () => {
  it("quotes vouchers anonymously with codes in the uncached POST body", () => {
    const cart = [{ product: { _id: "course" }, quantity: 1, guests: [] }];
    expect(
      captured.endpoints.quoteGuestCourseVoucher.query({
        tenantSlug: "klei",
        cart,
        promoCode: "ABC-DEF-123",
        locale: "cs",
      }),
    ).toEqual({
      url: "/public/tenants/klei/checkout/guest/voucher/quote",
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      body: { cart, promoCode: "ABC-DEF-123", locale: "cs" },
    });
  });
  it("sends the attempt header without credentials or internal request arguments", () => {
    const cart = [{ product: { _id: "course" }, quantity: 1, guests: [] }];
    const guestInfo = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.test",
    };
    expect(
      captured.endpoints.guestCheckout.query({
        tenantSlug: "klei",
        idempotencyKey: "674459ec-62f6-49a9-9494-d3673325f914",
        cart,
        guestInfo,
        locale: "cs",
        acceptedTerms: true,
      }),
    ).toEqual({
      url: "/public/tenants/klei/checkout/guest",
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: { "Idempotency-Key": "674459ec-62f6-49a9-9494-d3673325f914" },
      body: { cart, guestInfo, locale: "cs", acceptedTerms: true },
    });
  });

  it("puts return proof in the status POST body and disables retained response cache", () => {
    const request = captured.endpoints.getGuestCheckoutOrderStatus.query({
      tenantSlug: "klei",
      orderId: "order-1",
      accessToken: "secret-proof",
    });
    expect(request).toEqual({
      url: "/public/tenants/klei/checkout/guest/orders/order-1/status",
      method: "POST",
      body: { accessToken: "secret-proof" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    expect(request.url).not.toContain("secret-proof");
    expect(
      captured.endpoints.getGuestCheckoutOrderStatus.keepUnusedDataFor,
    ).toBe(0);
  });

  it("retains the legacy no-proof GET without a token parameter", () => {
    const request = captured.endpoints.getGuestCheckoutOrderStatus.query({
      tenantSlug: "klei",
      orderId: "legacy-order",
    });
    expect(request.method).toBe("GET");
    expect(request).not.toHaveProperty("body");
    expect(request.credentials).toBe("omit");
  });
});
