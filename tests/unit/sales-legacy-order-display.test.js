import { describe, expect, it } from "vitest";
import {
  getCustomerEmail,
  getCustomerInitials,
  getCustomerName,
  getOrderCustomer,
  getPaymentMethodKey,
} from "@/components/sales/sales.utils";
import { ROLLOUT_ELIGIBLE_LOCALE_CODES } from "@/i18n/locales";

const operator = {
  _id: "migration-operator",
  firstname: "Migration",
  lastname: "Operator",
  email: "operator@example.test",
  phone: "operator-phone",
};
const guestOrder = {
  legacyOrder: true,
  isPaid: true,
  createdBy: operator,
  customer: {
    firstname: "Guest",
    lastname: "Customer",
    email: "guest@example.test",
  },
  stripe: {},
  paymentAllocations: [],
};

describe("legacy sales order display", () => {
  it("shows the saved guest identity without leaking the audit operator into missing fields", () => {
    expect(getCustomerName(guestOrder)).toBe("Guest Customer");
    expect(getCustomerEmail(guestOrder)).toBe("guest@example.test");
    expect(getCustomerInitials(guestOrder)).toBe("GC");
    expect(getOrderCustomer(guestOrder)).toEqual(guestOrder.customer);
    expect(getOrderCustomer(guestOrder)).not.toHaveProperty("phone");
    expect(getOrderCustomer(guestOrder)).not.toHaveProperty("_id");
  });

  it("supports guest snapshot name aliases without populated operator names taking priority", () => {
    const order = {
      ...guestOrder,
      customer: {
        firstName: "Historical",
        lastName: "Guest",
        email: "guest@example.test",
      },
    };
    expect(getCustomerName(order)).toBe("Historical Guest");
    expect(getCustomerInitials(order)).toBe("HG");
  });

  it("keeps registered-customer contact lookup when the historical snapshot has no email", () => {
    const order = {
      legacyOrder: true,
      customer: { firstname: "Original", lastname: "Name", customId: "1003" },
      createdBy: {
        firstname: "Registered",
        lastname: "Customer",
        email: "registered@example.test",
      },
    };
    expect(getCustomerName(order)).toBe("Registered Customer");
    expect(getCustomerEmail(order)).toBe("registered@example.test");
    expect(getOrderCustomer(order).customId).toBe("1003");
  });

  it("preserves existing modern order identity precedence", () => {
    expect(
      getOrderCustomer({ ...guestOrder, legacyOrder: false }),
    ).toMatchObject(operator);
  });

  it("does not infer credits from a legacy paid flag without a recorded payment method", () => {
    expect(getPaymentMethodKey(guestOrder)).toBe("unknown");
    expect(
      getPaymentMethodKey({
        legacyOrder: true,
        isPaid: true,
        customer: { firstname: "Registered", lastname: "Customer" },
        credits: { appliedMajor: 0, requestedMajor: 0, currency: "CZK" },
        paymentAllocations: [],
      }),
    ).toBe("unknown");
  });

  it.each([
    [{ paymentMethod: "credits" }, "credits"],
    [{ payment: { method: "cash" } }, "cash"],
    [{ paymentMethod: "bank_transfer" }, "bankTransfer"],
    [{ paymentMethod: "card" }, "card"],
    [{ stripe: { paymentIntentId: "pi_recorded" } }, "card"],
  ])("retains explicitly recorded legacy methods: %j", (recorded, expected) => {
    expect(getPaymentMethodKey({ ...guestOrder, ...recorded })).toBe(expected);
  });

  it("preserves existing unpaid and modern payment fallbacks", () => {
    expect(getPaymentMethodKey({ ...guestOrder, isPaid: false })).toBe(
      "online",
    );
    expect(getPaymentMethodKey({ isPaid: true, legacyOrder: false })).toBe(
      "credits",
    );
    expect(getPaymentMethodKey({ isPaid: false })).toBe("online");
  });

  it.each(ROLLOUT_ELIGIBLE_LOCALE_CODES)(
    "includes the unknown-method label in %s",
    async (locale) => {
      const messages = await import(`../../src/messages/${locale}.json`);
      expect(messages.default.Sales.paymentMethods.unknown).toEqual(
        expect.any(String),
      );
      expect(messages.default.Sales.paymentMethods.unknown.trim()).not.toBe("");
    },
  );
});
