import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlatformTelemetry, {
  filterPrivateTelemetry,
} from "@/components/analytics/PlatformTelemetry";
const capture = vi.hoisted(() => ({ analytics: vi.fn(), speed: vi.fn() }));
vi.mock("@vercel/analytics/next", () => ({
  Analytics: (props) => {
    capture.analytics(props);
    return null;
  },
}));
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: (props) => {
    capture.speed(props);
    return null;
  },
}));

describe("invitation URL privacy", () => {
  it.each([
    "https://shario.io/en/team-invitation?token=private-token",
    "https://shario.io/cs/team-invitation?token=private-token",
    "/team-invitation?token=private-token",
  ])(
    "does not send private invitation URL %s to either telemetry collector",
    (url) => {
      render(<PlatformTelemetry />);
      const event = { type: "pageview", url };
      expect(capture.analytics.mock.lastCall[0].beforeSend(event)).toBeNull();
      expect(capture.speed.mock.lastCall[0].beforeSend(event)).toBeNull();
    },
  );
  it("preserves ordinary page telemetry", () => {
    const event = { type: "pageview", url: "https://shario.io/en/pricing" };
    expect(filterPrivateTelemetry(event)).toBe(event);
  });
});
