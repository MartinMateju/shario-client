import { describe, expect, it } from "vitest";
import { getCreditTransactionDetails } from "@/components/credits/creditTransactionHistory.utils";

describe("localized credit-history details", () => {
  it.each([
    ["added", "Credits added"],
    ["used", "Credits used"],
    ["refund", "Credits refunded"],
    ["refund", "Refund for an administratively cancelled Class place"],
  ])(
    "does not repeat the %s system description in English",
    (type, description) => {
      expect(getCreditTransactionDetails({ type, description })).toBe("");
    },
  );

  it("retains an administrator's custom reason without its English wrapper", () => {
    expect(
      getCreditTransactionDetails({
        type: "admin_granted",
        reason: "Compensatie voor de sluiting",
        description: "Admin granted credits: Compensatie voor de sluiting",
      }),
    ).toBe("Compensatie voor de sluiting");
  });

  it.each([
    ["added", "Credits purchased (order order-123)"],
    ["used", "Credits used as discount (order order-123)"],
    ["used", "Payment with credits for order order-123"],
  ])(
    "retains the %s order reference with the supplied localized label",
    (type, description) => {
      expect(
        getCreditTransactionDetails(
          { type, description },
          {
            orderLabel: "Bestelling",
          },
        ),
      ).toBe("Bestelling order-123");
    },
  );

  it("preserves product names and voucher codes from historical system templates", () => {
    expect(
      getCreditTransactionDetails({
        type: "refund",
        description: "Refund for cancelled booking - Ateliér Sever",
      }),
    ).toBe("Ateliér Sever");
    expect(
      getCreditTransactionDetails({
        type: "coupon_redeemed",
        reason: "coupon redeemed",
        description: "Uplatněn poukaz ABC-123-XYZ (Volný vstup)",
      }),
    ).toBe("ABC-123-XYZ (Volný vstup)");
    expect(
      getCreditTransactionDetails({
        type: "coupon_redeemed",
        reason: "coupon redeemed",
        description: "Uplatněn poukaz ABC-123-XYZ (Voucher)",
      }),
    ).toBe("ABC-123-XYZ");
  });

  it("hides only recognized system reasons while retaining imported custom notes", () => {
    const imported = {
      type: "migration_credit",
      description: "Imported source credit allocation adjustment",
    };
    expect(
      getCreditTransactionDetails({ ...imported, reason: "migration" }),
    ).toBe("");
    expect(
      getCreditTransactionDetails({ ...imported, reason: "Původní zůstatek" }),
    ).toBe("Původní zůstatek");
    expect(
      getCreditTransactionDetails({
        type: "migration_rollback_debit",
        description: "Import rollback credit compensation",
        reason: "migration_rollback",
      }),
    ).toBe("");
    expect(
      getCreditTransactionDetails({
        type: "refund",
        description:
          "Booking payment returned to the converted voucher's studio-credit wallet",
        reason: "Booking refund after voucher conversion",
      }),
    ).toBe("");
  });

  it("keeps tenant-authored text, including English and system-like phrases", () => {
    expect(
      getCreditTransactionDetails({
        type: "admin_granted",
        reason: "Service recovery",
        description: "Granted by Martin",
      }),
    ).toBe("Service recovery · Granted by Martin");
    expect(
      getCreditTransactionDetails({
        type: "admin_granted",
        reason: "migration",
        description: "Credits refunded",
      }),
    ).toBe("migration · Credits refunded");
  });
});
