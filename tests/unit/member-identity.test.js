import { describe, expect, it } from "vitest";

import {
  formatMakerId,
  normalizeMemberNumber,
  resolvePieceMakerCode,
  resolveUserMemberId,
} from "@/utils/memberIdentity";

describe("member identity helpers", () => {
  it("normalizes incremental member numbers and formats their display with #", () => {
    expect(normalizeMemberNumber(234)).toBe("234");
    expect(normalizeMemberNumber("234")).toBe("234");
    expect(normalizeMemberNumber("0234")).toBe("");
    expect(formatMakerId("234")).toBe("#234");
    expect(formatMakerId("#234")).toBe("#234");
  });

  it("uses the immutable piece snapshot before mutable user identity", () => {
    expect(
      resolvePieceMakerCode({
        makerCode: "234",
        user: { memberNumber: 999, customId: "U-legacy" },
      }),
    ).toBe("234");
  });

  it("does not surface a legacy QR identifier when no member number exists", () => {
    expect(resolveUserMemberId({ customId: "U-legacy" })).toBe("");
    expect(formatMakerId("U-legacy")).toBe("—");
  });
});
