import { describe, expect, it, vi } from "vitest";

import {
  buildPeopleSummary,
  filterCustomers,
  getCustomerCredits,
  getCustomerStatus,
  getCustomerTotalSpent,
  getCustomerLastBooking,
  formatMoney,
  formatRelativeDate,
} from "@/components/tables/people/people-table.utils";

describe("customer credit balances", () => {
  it("uses the canonical moneyCredits balance returned by the users API", () => {
    expect(getCustomerCredits({ moneyCredits: 1250 })).toBe(1250);
    expect(getCustomerCredits({ moneyCredits: "600" })).toBe(600);
  });

  it("keeps the canonical balance authoritative, including zero", () => {
    expect(
      getCustomerCredits({
        moneyCredits: 0,
        creditBalance: 1250,
        credits: { balance: 900 },
      }),
    ).toBe(0);
  });

  it("continues to support legacy customer balance shapes", () => {
    expect(getCustomerCredits({ creditBalance: 500 })).toBe(500);
    expect(getCustomerCredits({ creditsBalance: 400 })).toBe(400);
    expect(getCustomerCredits({ credits: { balance: 300 } })).toBe(300);
    expect(getCustomerCredits({ credits: 200 })).toBe(200);
    expect(getCustomerCredits({ balance: 100 })).toBe(100);
  });

  it("returns zero for missing or invalid balances", () => {
    expect(getCustomerCredits({})).toBe(0);
    expect(getCustomerCredits({ moneyCredits: "not-a-number" })).toBe(0);
  });

  it("sums canonical money credit balances in the people overview", () => {
    const summary = buildPeopleSummary({
      usersData: null,
      customers: [
        { id: "customer-1", moneyCredits: 1250 },
        { id: "customer-2", moneyCredits: 600 },
        { id: "customer-3", moneyCredits: 0 },
      ],
    });

    expect(summary.credits).toBe(1850);
  });
});

describe("canonical customer state and optional statistics", () => {
  it("recognizes disabled access in both the status label and filter", () => {
    const customer = { id: "disabled", isAccessGranted: false };
    expect(getCustomerStatus(customer)).toBe("inactive");
    expect(filterCustomers([customer], { status: "inactive" })).toEqual([
      customer,
    ]);
    expect(filterCustomers([customer], { status: "active" })).toEqual([]);
  });

  it("does not invent zero spending when the API has no reliable aggregate", () => {
    for (const customer of [
      {},
      { totalSpent: null },
      { totalSpent: "invalid" },
    ]) {
      expect(getCustomerTotalSpent(customer)).toBeNull();
      expect(formatMoney(getCustomerTotalSpent(customer), "en")).toBe("—");
    }
    expect(getCustomerTotalSpent({ totalSpent: 0 })).toBe(0);
    expect(
      formatMoney(getCustomerTotalSpent({ totalSpent: 0 }), "en"),
    ).not.toBe("—");
    expect(getCustomerTotalSpent({ statistics: { totalSpent: 450.5 } })).toBe(
      450.5,
    );
  });

  it("retains supplied booking dates and renders unavailable history truthfully", () => {
    expect(
      getCustomerLastBooking({ lastBookingAt: "2026-01-01T12:00:00Z" }),
    ).toBe("2026-01-01T12:00:00Z");
    const translate = vi.fn(() => "Never");
    expect(
      formatRelativeDate(getCustomerLastBooking({}), "en", translate, {
        never: false,
      }),
    ).toBe("—");
    expect(translate).not.toHaveBeenCalled();
  });
});

describe("customer list filters", () => {
  const customers = [
    {
      id: "customer-1",
      firstname: "Barbora",
      lastname: "Žolmanová",
      email: "barbora@example.com",
      phone: "+420 732 883 553",
      memberNumber: 1347,
      activeMembership: { name: "Clay Club", slug: "clay-club" },
      status: "active",
    },
    {
      id: "customer-2",
      firstname: "Martina",
      lastname: "Váňová",
      email: "martina@example.com",
      memberNumber: 1348,
      isActive: false,
    },
    {
      id: "customer-3",
      firstname: "Anastasia",
      lastname: "Murinova",
      email: "anastasia@example.com",
      memberNumber: 1349,
      invitedAt: "2026-08-20T10:00:00.000Z",
    },
  ];

  it("searches names without requiring diacritics and accepts formatted member IDs", () => {
    expect(filterCustomers(customers, { search: "zolmanova" })).toEqual([
      customers[0],
    ]);
    expect(filterCustomers(customers, { search: "#1348" })).toEqual([
      customers[1],
    ]);
  });

  it("combines membership and status filters", () => {
    expect(
      filterCustomers(customers, {
        membership: "clay-club",
        status: "active",
      }),
    ).toEqual([customers[0]]);

    expect(
      filterCustomers(customers, {
        membership: "none",
        status: "inactive",
      }),
    ).toEqual([customers[1]]);
  });

  it("returns invited customers through the status filter", () => {
    expect(filterCustomers(customers, { status: "invited" })).toEqual([
      customers[2],
    ]);
  });
});
