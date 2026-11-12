import { describe, expect, it } from "vitest";

import {
  buildCreateCustomerPayload,
  buildCreditGrantPayload,
  buildMembershipAssignmentPayload,
  createIdempotencyKey,
  formatCustomerCurrency,
  formatCustomerDate,
  getApiErrorMessage,
  getBookingLocation,
  getBookingName,
  getBookingStatus,
  getCustomerName,
  getEntityId,
  getMembershipName,
  getMembershipStatus,
  getPlanLocationIds,
  getPlanName,
  getPlanPrices,
  getPublishedPlanVersion,
  normalizeBookings,
  normalizeLocations,
  normalizeMemberships,
  normalizePlans,
} from "../../src/components/customers/customers.utils";

describe("customer entity and collection normalization", () => {
  it("reads common entity identifiers without stringifying unknown objects", () => {
    expect(getEntityId({ id: " customer-1 " })).toBe("customer-1");
    expect(getEntityId({ _id: { $oid: "mongo-1" } })).toBe("mongo-1");
    expect(getEntityId({ id: "", _id: "mongo-fallback" })).toBe(
      "mongo-fallback",
    );
    expect(getEntityId({ bookingId: 42 })).toBe("42");
    expect(getEntityId(0)).toBe("0");
    expect(getEntityId({ name: "No identifier" })).toBe("");
  });

  it("builds customer names across legacy and populated membership shapes", () => {
    expect(
      getCustomerName({ firstname: " Ada ", lastname: " Lovelace " }),
    ).toBe("Ada Lovelace");
    expect(
      getCustomerName({ user: { firstName: "Grace", lastName: "Hopper" } }),
    ).toBe("Grace Hopper");
    expect(getCustomerName({ displayName: "  Studio Member  " })).toBe(
      "Studio Member",
    );
    expect(getCustomerName({ email: "member@example.com" })).toBe(
      "member@example.com",
    );
    expect(getCustomerName(null)).toBe("—");
  });

  it("normalizes direct, nested, entity-adapter, and split booking responses", () => {
    const direct = [{ id: "booking-1" }];
    expect(normalizeBookings(direct)).toBe(direct);
    expect(
      normalizeBookings({
        data: {
          workshops: [{ id: "workshop-1" }],
          courses: [{ id: "course-1" }],
        },
      }),
    ).toEqual([{ id: "workshop-1" }, { id: "course-1" }]);
    expect(
      normalizeBookings({
        ids: ["b", "a"],
        entities: { a: { id: "a" }, b: { id: "b" } },
      }),
    ).toEqual([{ id: "b" }, { id: "a" }]);
    expect(normalizeBookings({ data: { bookings: [] } })).toEqual([]);
  });

  it("normalizes memberships, plans, and locations from supported envelopes", () => {
    expect(
      normalizeMemberships({ data: { userMemberships: [{ id: "m-1" }] } }),
    ).toEqual([{ id: "m-1" }]);
    expect(normalizeMemberships({ items: [{ id: "m-2" }] })).toEqual([
      { id: "m-2" },
    ]);
    expect(
      normalizePlans({ result: { membershipPlans: [{ id: "p-1" }] } }),
    ).toEqual([{ id: "p-1" }]);
    expect(normalizeLocations({ payload: { rows: [{ id: "l-1" }] } })).toEqual([
      { id: "l-1" },
    ]);
    expect(normalizeLocations({ unexpected: true })).toEqual([]);
  });
});

describe("customer membership and booking presentation", () => {
  const plan = {
    id: "plan-1",
    name: "Draft name",
    publishedVersion: {
      id: "version-3",
      name: { en: "Studio Plus", cs: "Studio Plus CZ" },
      prices: [
        { currency: "CZK", amountMinor: 12_000 },
        { currency: "EUR", amountMinor: 4900 },
      ],
      locationScope: {
        type: "selected",
        locationIds: ["location-1", { _id: "location-2" }, "location-1"],
      },
    },
  };

  it("resolves the published plan version, localized name, prices, and scope", () => {
    expect(getPublishedPlanVersion(plan)).toBe(plan.publishedVersion);
    expect(getPlanName(plan, "cs")).toBe("Studio Plus CZ");
    expect(getPlanPrices(plan)).toEqual(plan.publishedVersion.prices);
    expect(getPlanLocationIds(plan)).toEqual(["location-1", "location-2"]);
    expect(
      getPlanLocationIds({
        status: "published",
        locationScope: { type: "all", locationIds: ["ignored"] },
      }),
    ).toEqual([]);
  });

  it("finds a published version in version history and supports scalar pricing", () => {
    const historicalPlan = {
      versions: [
        { id: "draft", status: "draft" },
        {
          id: "published",
          publicationStatus: "published",
          name: "Flex",
          currency: "eur",
          amountMinor: 2500,
        },
      ],
    };

    expect(getPublishedPlanVersion(historicalPlan)).toMatchObject({
      id: "published",
    });
    expect(getPlanName(historicalPlan)).toBe("Flex");
    expect(getPlanPrices(historicalPlan)).toEqual([
      { currency: "EUR", amountMinor: 2500 },
    ]);
    expect(
      getPublishedPlanVersion({ status: "draft", version: {} }),
    ).toBeNull();
  });

  it("normalizes membership names and statuses", () => {
    expect(
      getMembershipName(
        { planSnapshot: { name: { EN: "Founders", CZ: "Zakladatelé" } } },
        "cs",
      ),
    ).toBe("Zakladatelé");
    expect(getMembershipStatus({ membershipStatus: "cancelScheduled" })).toBe(
      "cancel_scheduled",
    );
    expect(getMembershipStatus({ status: "CANCELED" })).toBe("cancelled");
    expect(getMembershipStatus({})).toBe("pending");
  });

  it("normalizes booking product, location, and status variants", () => {
    const booking = {
      productSnapshot: { name: { en: "Wheel session", cs: "Práce na kruhu" } },
      location: { name: "Vinohrady" },
      bookingStatus: { status: "IN PROGRESS" },
    };

    expect(getBookingName(booking, "cs")).toBe("Práce na kruhu");
    expect(getBookingLocation(booking)).toBe("Vinohrady");
    expect(getBookingStatus(booking)).toBe("in_progress");
    expect(getBookingStatus({ isCanceled: true, status: "confirmed" })).toBe(
      "cancelled",
    );
    expect(getBookingName({ productName: "Hand building" })).toBe(
      "Hand building",
    );
    expect(getBookingLocation({ locationName: "Main studio" })).toBe(
      "Main studio",
    );
  });
});

describe("safe customer formatting and errors", () => {
  it("extracts nested API and validation errors before using a fallback", () => {
    expect(
      getApiErrorMessage({ data: { message: "Email already exists" } }),
    ).toBe("Email already exists");
    expect(
      getApiErrorMessage({
        response: { data: { errors: { email: ["Invalid email"] } } },
      }),
    ).toBe("Invalid email");
    expect(getApiErrorMessage({ error: { detail: "Request failed" } })).toBe(
      "Request failed",
    );
    expect(
      getApiErrorMessage(
        { data: { message: "<script>x</script>" } },
        "Safe fallback",
      ),
    ).toBe("Safe fallback");
    expect(getApiErrorMessage(null, "Try again")).toBe("Try again");
    expect(
      getApiErrorMessage(
        { status: 409, data: { code: "CUSTOMER_DUPLICATE" } },
        "Customer already exists",
      ),
    ).toBe("Customer already exists");
  });

  it("formats major currency amounts with Intl and rejects invalid inputs", () => {
    expect(formatCustomerCurrency(1250.5, "czk", "en")).toBe(
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "CZK",
      }).format(1250.5),
    );
    expect(formatCustomerCurrency("", "CZK", "en", "N/A")).toBe("N/A");
    expect(formatCustomerCurrency("not-a-number", "CZK")).toBe("—");
    expect(formatCustomerCurrency(10, "invalid")).toBe("—");
  });

  it("formats valid dates with Intl and uses fallbacks for invalid dates", () => {
    const value = "2026-08-02T12:00:00.000Z";
    expect(
      formatCustomerDate(value, "en", { timeZone: "UTC", dateStyle: "medium" }),
    ).toBe(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
      }).format(new Date(value)),
    );
    expect(formatCustomerDate("bad-date", "en", {}, "Not set")).toBe("Not set");
    expect(formatCustomerDate(null)).toBe("—");
  });

  it("creates unique, prefixed idempotency keys", () => {
    const first = createIdempotencyKey(" Customer Message ");
    const second = createIdempotencyKey(" Customer Message ");

    expect(first).toMatch(/^customer-message-[a-z0-9-]+$/);
    expect(second).toMatch(/^customer-message-[a-z0-9-]+$/);
    expect(second).not.toBe(first);
  });
});

describe("customer action payload contracts", () => {
  it("builds the exact POST /users payload and drops tenant/form metadata", () => {
    expect(
      buildCreateCustomerPayload({
        firstName: " Ada ",
        lastName: " Lovelace ",
        email: " ADA@EXAMPLE.COM ",
        phoneNumber: " +420 700 111 222 ",
        password: "  keep-password-whitespace  ",
        tenantId: "must-not-leak",
        tenantSlug: "must-not-leak",
        role: "owner",
      }),
    ).toEqual({
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      phone: "+420 700 111 222",
      password: "  keep-password-whitespace  ",
    });
  });

  it("builds the exact /credits/admin/grant payload", () => {
    expect(
      buildCreditGrantPayload({
        customer: { id: "customer-2" },
        amount: "125.50",
        reason: " Manual correction ",
        currency: "CZK",
        tenantId: "must-not-leak",
      }),
    ).toEqual({
      targetUserId: "customer-2",
      amount: 125.5,
      reason: "Manual correction",
    });

    expect(
      buildCreditGrantPayload({
        targetUserId: "customer-2",
        amount: 50,
        reason: "Welcome credit",
        idempotencyKey: " credit-fixed ",
        tenantId: "must-not-leak",
      }),
    ).toEqual({
      targetUserId: "customer-2",
      amount: 50,
      reason: "Welcome credit",
      idempotencyKey: "credit-fixed",
    });
  });

  it("builds the exact /memberships/assign payload and forces manual renewal", () => {
    expect(
      buildMembershipAssignmentPayload({
        customer: { _id: "customer-3" },
        plan: {
          id: "plan-3",
          currentPublishedVersion: { _id: "version-7" },
        },
        currency: " eur ",
        location: { id: "location-2" },
        reason: " paid_offline ",
        note: " Paid at reception ",
        autoRenew: true,
        tenantId: "must-not-leak",
      }),
    ).toEqual({
      userId: "customer-3",
      planId: "plan-3",
      planVersionId: "version-7",
      currency: "EUR",
      locationId: "location-2",
      reason: "paid_offline",
      note: "Paid at reception",
      autoRenew: false,
    });

    expect(
      buildMembershipAssignmentPayload({
        userId: "customer-4",
        planId: "plan-4",
        planVersionId: "version-8",
        currency: "CZK",
        reason: "complimentary",
        note: "",
        locationId: "",
      }),
    ).toEqual({
      userId: "customer-4",
      planId: "plan-4",
      planVersionId: "version-8",
      currency: "CZK",
      reason: "complimentary",
      note: "",
      autoRenew: false,
    });
  });
});
