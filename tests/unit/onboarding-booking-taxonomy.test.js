import { describe, expect, it } from "vitest";

import { BOOKING_OPTIONS } from "../../src/components/onboarding/onboarding.constants.js";

describe("legacy booking questionnaire taxonomy", () => {
  it("offers only customer-bookable Open Studio and Class choices", () => {
    expect(BOOKING_OPTIONS.map(({ value }) => value)).toEqual([
      "open_studio",
      "class",
    ]);
    expect(BOOKING_OPTIONS).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "private_sessions" }),
      ]),
    );
  });
});
