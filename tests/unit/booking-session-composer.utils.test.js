import { describe, expect, it } from "vitest";

import {
  addMinutesToTime,
  buildBookingSessionPayload,
  filterSchedulableProducts,
  getBookingSessionPayloadError,
  getBookingSessionPrefillIssue,
  getBookingSessionReturnPath,
  getPrefillDurationMinutes,
  normalizeWorkspaceReturnPath,
  parseBookingSessionPrefill,
} from "@/components/bookings/bookingSessionComposer.utils";

describe("booking session composer helpers", () => {
  it("keeps only active product types supported by the session endpoint", () => {
    const products = filterSchedulableProducts([
      { id: "course", type: "course" },
      { id: "public", type: "public-course" },
      { id: "private", type: "private-course" },
      { id: "blocker", type: "blocker" },
      { id: "workshop", type: "workshop" },
      { id: "service", type: "service" },
      { id: "inactive", type: "course", isActive: false },
    ]);

    expect(products.map((product) => product.id)).toEqual([
      "course",
      "public",
      "private",
      "blocker",
    ]);
  });

  it("parses canonical prefill and supports activityId as a legacy product alias", () => {
    expect(
      parseBookingSessionPrefill(
        new URLSearchParams(
          "activityId=legacy-product&locationId=location-1&start=2026-08-03T07%3A00%3A00.000Z&end=2026-08-03T09%3A00%3A00.000Z&isRoot=true&setupStep=PRACTICE_BOOKING",
        ),
      ),
    ).toEqual({
      productId: "legacy-product",
      locationId: "location-1",
      start: "2026-08-03T07:00:00.000Z",
      end: "2026-08-03T09:00:00.000Z",
      isRoot: true,
      setupStep: "practice_booking",
      returnTo: "",
    });

    expect(
      parseBookingSessionPrefill(
        new URLSearchParams(
          "productId=canonical&activityId=legacy&returnTo=%2Fapp%2Fcalendar%3Fview%3Dweek",
        ),
      ),
    ).toMatchObject({
      productId: "canonical",
      returnTo: "/app/calendar?view=week",
    });
  });

  it("builds the existing server payload and handles a midnight end time", () => {
    const payload = buildBookingSessionPayload({
      dates: ["2026-08-04", "2026-08-03", "2026-08-04", "invalid"],
      startTime: "23:00",
      durationMinutes: 60,
      productId: "product-1",
      locationId: "location-1",
      lecturer: "  Eva  ",
      language: "cs",
      description: "  Beginner class ",
      note: " Internal ",
      isRoot: true,
    });

    expect(payload).toEqual({
      dates: ["2026-08-03", "2026-08-04"],
      startTime: "23:00",
      endTime: "00:00",
      bookingProduct: "product-1",
      locationId: "location-1",
      lecturer: "Eva",
      language: "cs",
      description: "Beginner class",
      note: "Internal",
      isRoot: true,
    });
    expect(getBookingSessionPayloadError(payload)).toBe("");
    expect(addMinutesToTime("invalid", 60)).toBe("");
    expect(
      getPrefillDurationMinutes(
        "2026-08-03T09:00:00.000Z",
        "2026-08-03T10:30:00.000Z",
      ),
    ).toBe(90);
  });

  it("reports explicit unavailable prefill without silently substituting it", () => {
    expect(
      getBookingSessionPrefillIssue({
        productRequested: true,
        productAvailable: false,
        locationRequested: true,
        locationAvailable: false,
      }),
    ).toBe("prefillProduct");
    expect(
      getBookingSessionPrefillIssue({
        productRequested: true,
        productAvailable: true,
        locationRequested: true,
        locationAvailable: false,
      }),
    ).toBe("prefillLocation");
    expect(
      getBookingSessionPrefillIssue({
        scheduleRequested: true,
        scheduleAvailable: false,
      }),
    ).toBe("prefillSchedule");
    expect(
      getBookingSessionPrefillIssue({
        scheduleRequested: true,
        scheduleAvailable: true,
        durationAvailable: false,
      }),
    ).toBe("prefillDuration");
    expect(getBookingSessionPrefillIssue()).toBe("");
  });

  it("keeps guided return navigation inside the workspace", () => {
    expect(normalizeWorkspaceReturnPath("/app/calendar?view=week")).toBe(
      "/app/calendar?view=week",
    );
    expect(normalizeWorkspaceReturnPath("//evil.example/app")).toBe("");
    expect(normalizeWorkspaceReturnPath("https://evil.example/app")).toBe("");
    expect(normalizeWorkspaceReturnPath("/login")).toBe("");
    expect(
      getBookingSessionReturnPath({
        returnTo: "//evil.example",
        setupStep: "practice_booking",
      }),
    ).toBe("/app/setup?step=practice_booking");
    expect(getBookingSessionReturnPath()).toBe("/app/bookings");
  });
});
