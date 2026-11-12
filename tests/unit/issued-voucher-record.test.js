import { describe, expect, it } from "vitest";

import {
  formatIssuedVoucherAmount,
  formatIssuedVoucherDate,
  formatIssuedVoucherRemaining,
  formatVoucherCreditsReceived,
  getIssuedVoucherName,
  getIssuedVoucherStatus,
} from "@/components/vouchers/voucherRecord";

describe("issued voucher display", () => {
  it("shows authoritative original, remaining and converted amounts separately", () => {
    const voucher = {
      originalValueMinor: 150000,
      remainingValueMinor: 40000,
      walletRedeemedValueMinor: 40000,
      currency: "CZK",
      product: { price: 9999, currency: "EUR" },
    };
    expect(formatIssuedVoucherAmount(voucher, "en")).toContain("1,500");
    expect(formatIssuedVoucherRemaining(voucher, "en")).toContain("400");
    expect(formatVoucherCreditsReceived(voucher, "en")).toContain("400");
    expect(
      formatVoucherCreditsReceived(
        { ...voucher, walletRedeemedValueMinor: 0 },
        "en",
      ).replace(/\s/g, " "),
    ).toBe("CZK 0");
    expect(formatIssuedVoucherRemaining({ currency: "CZK" })).toBe("—");
    expect(
      formatVoucherCreditsReceived(
        { valueMinorSnapshot: 50000, currencySnapshot: "CZK" },
        "en",
      ),
    ).toContain("500");
  });

  it("preserves partial and reserved statuses while archive remains independent", () => {
    expect(
      getIssuedVoucherStatus({
        status: "partially_redeemed",
        archivedAt: "2026-10-01",
      }),
    ).toBe("partially_redeemed");
    expect(getIssuedVoucherStatus({ status: "reserved" })).toBe("reserved");
    expect(getIssuedVoucherStatus({ status: "review_required" })).toBe(
      "review",
    );
    expect(
      getIssuedVoucherStatus({ status: "active", archivedAt: "2026-10-01" }),
    ).toBe("active");
  });
  it("shows refund review before active, redeemed or revoked status", () => {
    expect(
      getIssuedVoucherStatus({ isActive: true, refundReviewRequired: true }),
    ).toBe("review");
    expect(
      getIssuedVoucherStatus({
        isActive: false,
        redeemedAt: "2026-09-15T00:00:00Z",
        refundReviewRequired: true,
      }),
    ).toBe("review");
    expect(
      getIssuedVoucherStatus({
        isActive: false,
        revokedAt: "2026-09-15T00:00:00Z",
        refundReviewRequired: true,
      }),
    ).toBe("review");
  });
  it("displays expiry in the studio timezone even when the customer is elsewhere", () => {
    const instant = "2026-09-30T23:30:00.000Z";
    expect(formatIssuedVoucherDate(instant, "en-GB", "Europe/Prague")).toBe(
      "01/10/2026",
    );
    expect(formatIssuedVoucherDate(instant, "en-GB", "America/New_York")).toBe(
      "30/09/2026",
    );
    expect(formatIssuedVoucherDate(instant, "en-GB", "invalid-zone")).toBe(
      "30/09/2026",
    );
    expect(formatIssuedVoucherDate("invalid", "en-GB")).toBe("—");
  });
  it("uses the purchased value, currency and name after the offering changes", () => {
    const voucher = {
      valueMinorSnapshot: 50000,
      currencySnapshot: "CZK",
      productNameSnapshot: { CZ: "Původní poukaz", EN: "Original voucher" },
      creditsAmount: 700,
      currency: "EUR",
      product: { price: 999, currency: "USD", name: "Changed offering" },
    };
    const amount = formatIssuedVoucherAmount(voucher, "en");
    expect(amount).toContain("500");
    expect(amount).toContain("CZK");
    expect(amount).not.toContain("999");
    expect(getIssuedVoucherName(voucher, "cs")).toBe("Původní poukaz");
    expect(getIssuedVoucherName(voucher, "en")).toBe("Original voucher");
  });

  it("uses a legacy issued amount but never guesses from a mutable catalog price", () => {
    expect(
      formatIssuedVoucherAmount({ creditsAmount: 150, currency: "EUR" }, "en"),
    ).toContain("150");
    expect(
      formatIssuedVoucherAmount({ product: { price: 999, currency: "USD" } }),
    ).toBe("—");
    expect(
      formatIssuedVoucherAmount({
        valueMinorSnapshot: null,
        currencySnapshot: "CZK",
      }),
    ).toBe("—");
    expect(
      formatIssuedVoucherAmount({
        creditsAmount: 150,
        product: { currency: "EUR" },
      }),
    ).toBe("—");
  });

  it("keeps zero values and currencies without fractional units accurate", () => {
    expect(
      formatIssuedVoucherAmount(
        { valueMinorSnapshot: 0, currencySnapshot: "CZK" },
        "en",
      ),
    ).toContain("0");
    expect(
      formatIssuedVoucherAmount(
        { valueMinorSnapshot: 500, currencySnapshot: "JPY" },
        "en",
      ),
    ).toContain("500");
  });

  it("prioritizes revocation and redemption before expiry and treats the expiry instant as expired", () => {
    const expiresAt = "2026-09-15T10:00:00.000Z";
    const now = Date.parse(expiresAt);
    expect(getIssuedVoucherStatus({ isActive: true, expiresAt }, now - 1)).toBe(
      "active",
    );
    expect(getIssuedVoucherStatus({ isActive: true, expiresAt }, now)).toBe(
      "expired",
    );
    expect(
      getIssuedVoucherStatus(
        { isActive: false, expiresAt, redeemedAt: expiresAt },
        now,
      ),
    ).toBe("redeemed");
    expect(
      getIssuedVoucherStatus(
        {
          isActive: false,
          expiresAt,
          redeemedAt: expiresAt,
          revokedAt: expiresAt,
        },
        now,
      ),
    ).toBe("revoked");
    expect(
      getIssuedVoucherStatus({ isActive: false, expiresAt: null }, now),
    ).toBe("inactive");
    expect(
      getIssuedVoucherStatus({ isActive: true, expiresAt: null }, now),
    ).toBe("active");
  });
});
