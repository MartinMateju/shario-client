import { describe, expect, it, vi } from "vitest";

vi.mock("@/translations/translation", () => ({ default: {} }));

import { formatTabToUrl } from "@/components/menu/menuUtils";

describe("customer portal tab routing", () => {
  it("retains the selected studio while changing tabs", () => {
    expect(
      formatTabToUrl("MY_BOOKINGS", {
        id: "64b000000000000000000002",
        slug: "studio-olivka",
      }),
    ).toBe("/portal?location=studio-olivka&tab=my-bookings");
  });

  it("keeps the generic portal valid when no studio is resolved", () => {
    expect(formatTabToUrl("STUDIO_CALENDAR")).toBe(
      "/portal?tab=studio-calendar",
    );
  });
});
