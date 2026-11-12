import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  setupCenterApiSlice: {
    endpoints: { getSetupCenter: { initiate: vi.fn() } },
  },
  useTrackSetupEventMutation: () => [vi.fn()],
}));

import { buildLaunchEvent } from "@/components/setup-center/useGuidedSetupStep";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

describe("Launch Center event contract", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("emits a UUID event id and a stable browser-session id", () => {
    const first = buildLaunchEvent({
      event: "step_opened",
      stepId: "studio",
      source: "guided_form",
      metadata: { form: "workspace_settings" },
    });
    const second = buildLaunchEvent({
      event: "step_completed",
      stepId: "studio",
      source: "guided_form",
    });

    expect(first).toMatchObject({
      event: "step_opened",
      stepId: "studio",
      source: "guided_form",
      metadata: { form: "workspace_settings" },
    });
    expect(first.eventId).toMatch(UUID_PATTERN);
    expect(second.eventId).toMatch(UUID_PATTERN);
    expect(second.eventId).not.toBe(first.eventId);
    expect(first.sessionId).toMatch(SESSION_PATTERN);
    expect(second.sessionId).toBe(first.sessionId);
  });

  it("never attaches a step id to a non-step event", () => {
    expect(
      buildLaunchEvent({
        event: "test_booking_opened",
        stepId: "practice_booking",
        source: "final_review",
      }),
    ).toEqual({
      event: "test_booking_opened",
      source: "final_review",
      eventId: expect.stringMatching(UUID_PATTERN),
      sessionId: expect.stringMatching(SESSION_PATTERN),
    });
  });
});
