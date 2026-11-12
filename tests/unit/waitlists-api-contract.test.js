import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));
const SAFE_TOKEN = "a".repeat(32);

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        mutation: (definition) => definition,
        query: (definition) => definition,
      };
      captured.endpoints = endpoints(builder);

      return Object.fromEntries(
        Object.keys(captured.endpoints).map((name) => [
          `use${name[0].toUpperCase()}${name.slice(1)}${
            name.startsWith("get") ? "Query" : "Mutation"
          }`,
          vi.fn(),
        ]),
      );
    },
  },
}));

import {
  buildCourseParticipantCancellationRequest,
  normalizeAdminWaitlistRoster,
  normalizeCourseParticipantCancellationResponse,
  normalizeMyWaitlistResponse,
  normalizeWaitlistEntry,
  normalizeWaitlistOffer,
  normalizeWaitlistRefundSummary,
  normalizeWaitlistSettings,
} from "@/lib/features/waitlists/waitlistsApiSlice";

const COURSE_SESSION_ID = "64b64c84f5ad8f1b2c3d4e5f";
const COURSE_ORDER_ID = "74b64c84f5ad8f1b2c3d4e6a";

describe("waitlist API contract", () => {
  it.each([
    ["CZ", "cs"],
    ["de-DE", "de"],
    ["pl_PL", "pl"],
    ["sk-SK", "sk"],
    ["da-DK", "da"],
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
  ])("canonicalizes the waitlist locale %s to %s", (input, expected) => {
    expect(
      captured.endpoints.joinWaitlist.query({
        sessionId: "session-1",
        locale: input,
      }).body.locale,
    ).toBe(expected);
    expect(
      captured.endpoints.requestGuestWaitlistVerification.query({
        tenantSlug: "studio-one",
        sessionId: "session-1",
        email: "guest@example.test",
        firstName: "Ada",
        lastName: "Lovelace",
        locale: input,
      }).body.locale,
    ).toBe(expected);
  });

  it("uses the server-owned customer, guest and admin routes", () => {
    expect(
      captured.endpoints.joinWaitlist.query({
        sessionId: "session 1",
        locale: "cs-CZ",
      }),
    ).toEqual({
      url: "/waitlist/entries",
      method: "POST",
      body: { sessionId: "session 1", locale: "cs" },
    });
    expect(captured.endpoints.getMyWaitlists.query()).toEqual({
      url: "/waitlist/mine",
      params: undefined,
    });
    expect(
      captured.endpoints.getMyWaitlists.query({ sessionId: "session 1" }),
    ).toEqual({
      url: "/waitlist/mine",
      params: { sessionId: "session 1" },
    });
    expect(
      captured.endpoints.checkoutWaitlistOffer.query({
        entryId: "entry 1",
        sessionId: "session 1",
        locale: "en",
      }),
    ).toEqual({
      url: "/waitlist/entries/entry%201/checkout",
      method: "POST",
      body: { locale: "en" },
    });

    expect(
      captured.endpoints.requestGuestWaitlistVerification.query({
        tenantSlug: "Studio-One",
        sessionId: "session-1",
        email: "guest@example.test",
        firstName: "Ada",
        lastName: "Lovelace",
        locale: "en",
      }),
    ).toEqual({
      url: "/public/tenants/studio-one/waitlist/entries",
      method: "POST",
      credentials: "omit",
      body: {
        sessionId: "session-1",
        email: "guest@example.test",
        firstName: "Ada",
        lastName: "Lovelace",
        locale: "en",
      },
    });
    expect(
      captured.endpoints.checkoutGuestWaitlistOffer.query({
        tenantSlug: "studio-one",
        token: SAFE_TOKEN,
        email: "guest@example.test",
        checkout: { locale: "en" },
      }),
    ).toEqual({
      url: "/public/tenants/studio-one/waitlist/offers/checkout",
      method: "POST",
      credentials: "omit",
      body: {
        token: SAFE_TOKEN,
        email: "guest@example.test",
        checkout: { locale: "en" },
      },
    });

    expect(
      captured.endpoints.promoteAdminWaitlistEntry.query({
        sessionId: "session-1",
        entryId: "entry-1",
        reason: "One seat opened",
        overrideFifo: false,
      }),
    ).toEqual({
      url: "/bookings/session-1/waitlist/entry-1/promote",
      method: "POST",
      body: { reason: "One seat opened", overrideFifo: false },
    });
    expect(
      captured.endpoints.updateAdminWaitlistSettings.query({
        sessionId: "session-1",
        settings: { enabled: true, offerWindowHours: 24 },
      }),
    ).toEqual({
      url: "/bookings/session-1/waitlist/settings",
      method: "PATCH",
      body: { enabled: true, offerWindowHours: 24 },
    });

    expect(
      captured.endpoints.cancelCourseOrderParticipants.query({
        sessionId: COURSE_SESSION_ID,
        orderId: COURSE_ORDER_ID,
        reason: "  Customer requested cancellation  ",
      }),
    ).toEqual({
      url: `/bookings/${COURSE_SESSION_ID}/participants/${COURSE_ORDER_ID}`,
      method: "DELETE",
      body: { reason: "Customer requested cancellation" },
    });
  });

  it("rejects malformed paid participant cancellation requests before transport", () => {
    expect(() =>
      buildCourseParticipantCancellationRequest({
        sessionId: "not-an-object-id",
        orderId: COURSE_ORDER_ID,
        reason: "Customer request",
      }),
    ).toThrow("valid course session ID");
    expect(() =>
      buildCourseParticipantCancellationRequest({
        sessionId: COURSE_SESSION_ID,
        orderId: COURSE_ORDER_ID,
        reason: "   ",
      }),
    ).toThrow("1 to 500 characters");
    expect(() =>
      buildCourseParticipantCancellationRequest({
        sessionId: COURSE_SESSION_ID,
        orderId: COURSE_ORDER_ID,
        reason: "x".repeat(501),
      }),
    ).toThrow("1 to 500 characters");
  });

  it("keeps guest waitlist traffic anonymous at header and cookie boundaries", () => {
    const baseSource = readFileSync(
      resolve(process.cwd(), "src/lib/features/api/apiSlice.js"),
      "utf8",
    );
    const waitlistSource = readFileSync(
      resolve(process.cwd(), "src/lib/features/waitlists/waitlistsApiSlice.js"),
      "utf8",
    );

    for (const endpoint of [
      "requestGuestWaitlistVerification",
      "verifyGuestWaitlist",
      "manageGuestWaitlist",
      "withdrawGuestWaitlist",
      "inspectWaitlistOffer",
      "checkoutGuestWaitlistOffer",
    ]) {
      expect(baseSource).toContain(`"${endpoint}"`);
    }
    expect(waitlistSource.match(/credentials: "omit"/g)?.length).toBe(6);
  });

  it("invalidates the same per-session tag exposed by the public course query", () => {
    expect(
      captured.endpoints.joinWaitlist.invalidatesTags(null, null, {
        sessionId: "session-1",
      }),
    ).toContainEqual({
      type: "PublicBooking",
      id: "COURSE_SESSION:session-1",
    });
    expect(
      captured.endpoints.leaveWaitlist.invalidatesTags(
        { entry: { sessionId: "session-1" } },
        null,
        { entryId: "entry-1" },
      ),
    ).toContainEqual({
      type: "PublicBooking",
      id: "COURSE_SESSION:session-1",
    });
    expect(
      captured.endpoints.checkoutWaitlistOffer.invalidatesTags(
        { checkoutUrl: "https://checkout.stripe.com/test" },
        null,
        { entryId: "entry-1", sessionId: "session-1" },
      ),
    ).toContainEqual({
      type: "PublicBooking",
      id: "COURSE_SESSION:session-1",
    });

    const cancellationTags =
      captured.endpoints.cancelCourseOrderParticipants.invalidatesTags(
        null,
        null,
        { sessionId: COURSE_SESSION_ID, orderId: COURSE_ORDER_ID },
      );
    expect(cancellationTags).toEqual(
      expect.arrayContaining([
        { type: "Booking", id: "LIST" },
        { type: "Booking", id: COURSE_SESSION_ID },
        { type: "Order", id: "LIST" },
        { type: "Waitlist", id: `ADMIN:${COURSE_SESSION_ID}` },
        {
          type: "PublicBooking",
          id: `COURSE_SESSION:${COURSE_SESSION_ID}`,
        },
        "Credits",
        "CreditTransactions",
      ]),
    );
  });

  it("drops customer identity and queue order from customer and guest DTOs", () => {
    const entry = normalizeWaitlistEntry({
      id: "entry-1",
      sessionId: "session-1",
      state: "waiting",
      joinedAt: "2026-08-07T09:00:00.000Z",
      position: 4,
      email: "private@example.test",
      customer: { name: "Private Person" },
      refund: {
        amount: 1250,
        amountMinor: 125000,
        currency: "CZK",
        refundedAt: "2026-08-07T12:00:00.000Z",
      },
      price: { amount: 1250, currency: "czk", version: "price-v1" },
    });

    expect(entry).toEqual({
      id: "entry-1",
      sessionId: "session-1",
      state: "waiting",
      joinedAt: "2026-08-07T09:00:00.000Z",
      offerExpiresAt: null,
      price: { amount: 1250, currency: "CZK", version: "price-v1" },
      session: null,
    });
    expect(JSON.stringify(entry)).not.toContain("position");
    expect(JSON.stringify(entry)).not.toContain("private@example.test");
    expect(JSON.stringify(entry)).not.toContain("Private Person");
    expect(entry).not.toHaveProperty("refund");

    expect(
      normalizeMyWaitlistResponse({
        entry: {
          id: "entry-1",
          sessionId: "session-1",
          state: "offered",
        },
      }).entries,
    ).toHaveLength(1);
  });

  it("strictly retains only the privacy-safe refund summary on terminal entries", () => {
    const refund = {
      amount: 1250,
      amountMinor: 125000,
      currency: "czk",
      refundedAt: "2026-08-07T12:00:00+02:00",
      refundId: "re_secret",
      status: "succeeded",
      paymentMethod: "card",
    };

    expect(normalizeWaitlistRefundSummary(refund)).toEqual({
      amount: 1250,
      amountMinor: 125000,
      currency: "CZK",
      refundedAt: "2026-08-07T10:00:00.000Z",
    });
    expect(
      normalizeWaitlistRefundSummary({
        amount: 1250,
        amountMinor: 1250,
        currency: "JPY",
        refundedAt: "2026-08-07T12:00:00.000Z",
      }),
    ).toMatchObject({ amount: 1250, amountMinor: 1250, currency: "JPY" });
    expect(
      normalizeWaitlistEntry({
        id: "entry-refunded",
        sessionId: "session-1",
        state: "expired",
        refund,
      }),
    ).toEqual(
      expect.objectContaining({
        id: "entry-refunded",
        state: "expired",
        refund: {
          amount: 1250,
          amountMinor: 125000,
          currency: "CZK",
          refundedAt: "2026-08-07T10:00:00.000Z",
        },
      }),
    );
    expect(
      JSON.stringify(
        normalizeWaitlistEntry({
          id: "entry-refunded",
          sessionId: "session-1",
          state: "cancelled",
          refund,
        }),
      ),
    ).not.toMatch(/re_secret|succeeded|paymentMethod|card/);
  });

  it("drops malformed refund summaries and never attaches them to live entries or offers", () => {
    for (const invalidRefund of [
      {
        amount: "1250",
        amountMinor: 125000,
        currency: "CZK",
        refundedAt: "2026-08-07T12:00:00Z",
      },
      {
        amount: 1250,
        amountMinor: 125000.5,
        currency: "CZK",
        refundedAt: "2026-08-07T12:00:00Z",
      },
      {
        amount: 1250,
        amountMinor: 125000,
        currency: "CZ",
        refundedAt: "2026-08-07T12:00:00Z",
      },
      {
        amount: 1250,
        amountMinor: 125000,
        currency: "XYZ",
        refundedAt: "2026-08-07T12:00:00Z",
      },
      {
        amount: 1250,
        amountMinor: 125000,
        currency: "CZK",
        refundedAt: "not-a-date",
      },
      {
        amount: 1250,
        amountMinor: 125000,
        currency: "CZK",
        refundedAt: "1970-01-01T00:00:00.000Z",
      },
      {
        amount: 1250,
        amountMinor: 125001,
        currency: "CZK",
        refundedAt: "2026-08-07T12:00:00Z",
      },
    ]) {
      expect(normalizeWaitlistRefundSummary(invalidRefund)).toBeNull();
    }

    expect(
      normalizeWaitlistEntry({
        id: "entry-live",
        sessionId: "session-1",
        state: "payment_pending",
        refund: {
          amount: 1250,
          amountMinor: 125000,
          currency: "CZK",
          refundedAt: "2026-08-07T12:00:00.000Z",
        },
      }),
    ).not.toHaveProperty("refund");
    expect(
      normalizeWaitlistOffer({
        offer: {
          entryId: "entry-live",
          sessionId: "session-1",
          state: "offered",
          refund: {
            amount: 1250,
            amountMinor: 125000,
            currency: "CZK",
            refundedAt: "2026-08-07T12:00:00.000Z",
          },
        },
      }),
    ).not.toHaveProperty("refund");
  });

  it("retains order and identity only in the authenticated admin roster", () => {
    const result = normalizeAdminWaitlistRoster({
      entries: [
        {
          id: "entry-2",
          sessionId: "session-1",
          state: "waiting",
          position: 2,
          customer: { name: "Second", email: "second@example.test" },
        },
        {
          id: "entry-1",
          sessionId: "session-1",
          state: "waiting",
          position: 1,
          customer: { name: "First", email: "first@example.test" },
        },
      ],
      summary: { booked: 7, capacity: 8, waiting: 2, offered: 0 },
    });

    expect(result.entries.map((entry) => entry.id)).toEqual([
      "entry-1",
      "entry-2",
    ]);
    expect(result.entries[0]).toMatchObject({
      position: 1,
      customer: { name: "First", email: "first@example.test" },
    });
    expect(result.summary).toEqual({
      booked: 7,
      capacity: 8,
      waiting: 2,
      offered: 0,
    });
  });

  it("normalizes immutable offer prices and legacy-safe setting bounds", () => {
    expect(
      normalizeWaitlistOffer({
        offer: {
          entryId: "entry-1",
          sessionId: "session-1",
          state: "payment_pending",
          expiresAt: "2026-08-08T09:00:00.000Z",
          guestCheckoutAllowed: true,
          requiresAuthentication: false,
          price: { amount: 990, currency: "eur", version: "catalog-v3" },
        },
      }),
    ).toMatchObject({
      price: { amount: 990, currency: "EUR", version: "catalog-v3" },
      state: "payment_pending",
      guestCheckoutAllowed: true,
      requiresAuthentication: false,
    });

    expect(normalizeWaitlistSettings({ settings: {} })).toEqual({
      enabled: false,
      autoPromote: true,
      offerWindowHours: 24,
      cutoffHours: 2,
    });
    expect(
      normalizeWaitlistSettings({
        settings: { offerWindowHours: 999, cutoffHours: -5 },
      }),
    ).toMatchObject({ offerWindowHours: 168, cutoffHours: 0 });
  });

  it("normalizes idempotent paid cancellation and immutable refund details", () => {
    expect(
      normalizeCourseParticipantCancellationResponse({
        data: {
          sessionId: COURSE_SESSION_ID,
          orderId: COURSE_ORDER_ID,
          removedParticipants: 2.9,
          idempotent: true,
          refund: {
            amount: 1250,
            amountMinor: 125000,
            currency: "czk",
            method: "money_credits",
            newBalance: 1950,
          },
        },
      }),
    ).toEqual({
      sessionId: COURSE_SESSION_ID,
      orderId: COURSE_ORDER_ID,
      removedParticipants: 2,
      idempotent: true,
      refund: {
        amount: 1250,
        amountMinor: 125000,
        currency: "CZK",
        method: "money_credits",
        newBalance: 1950,
      },
    });
  });
});
