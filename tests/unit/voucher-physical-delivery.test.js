import { describe, expect, it } from "vitest";
import {
  buildVoucherPhysicalDelivery,
  getVoucherPhysicalDeliveryForm,
  isVoucherPostageValid,
} from "@/components/vouchers/voucherPhysicalDelivery.mjs";

describe("voucher postage input", () => {
  it("defaults existing and new offerings to digital", () => {
    const form = getVoucherPhysicalDeliveryForm();
    expect(form).toEqual({
      voucherPhysicalDeliveryEnabled: false,
      voucherPostageFee: "0",
    });
    expect(buildVoucherPhysicalDelivery(form)).toEqual({
      enabled: false,
      postageFeeMinor: 0,
    });
  });
  it.each([
    ["CZK", 7500, "75"],
    ["EUR", 755, "7.55"],
    ["JPY", 750, "750"],
    ["CLP", 500, "500"],
  ])(
    "round-trips the fee in %s without changing its minor units",
    (currency, minor, input) => {
      const form = {
        ...getVoucherPhysicalDeliveryForm(
          { physicalDelivery: { enabled: true, postageFeeMinor: minor } },
          currency,
        ),
        currency,
      };
      expect(form.voucherPostageFee).toBe(input);
      expect(isVoucherPostageValid(form)).toBe(true);
      expect(buildVoucherPhysicalDelivery(form)).toEqual({
        enabled: true,
        postageFeeMinor: minor,
      });
    },
  );
  it.each([
    ["EUR", ""],
    ["EUR", "-1"],
    ["EUR", "1.001"],
    ["JPY", "1.5"],
    ["CLP", "0.01"],
    ["EUR", "1000000.01"],
    ["JPY", "100000001"],
    ["EUR", "Infinity"],
  ])(
    "rejects invalid or excessive %s postage %s",
    (currency, voucherPostageFee) => {
      expect(
        isVoucherPostageValid({
          currency,
          voucherPostageFee,
          voucherPhysicalDeliveryEnabled: true,
        }),
      ).toBe(false);
    },
  );
  it("allows free postage and the currency-aware maximum, and clears a disabled fee", () => {
    for (const [currency, voucherPostageFee] of [
      ["EUR", "0"],
      ["JPY", "0"],
      ["EUR", "1000000"],
      ["JPY", "100000000"],
    ]) {
      expect(
        isVoucherPostageValid({
          currency,
          voucherPostageFee,
          voucherPhysicalDeliveryEnabled: true,
        }),
      ).toBe(true);
    }
    expect(
      buildVoucherPhysicalDelivery({
        voucherPhysicalDeliveryEnabled: false,
        voucherPostageFee: "7.50",
        currency: "EUR",
      }),
    ).toEqual({ enabled: false, postageFeeMinor: 0 });
  });
});
