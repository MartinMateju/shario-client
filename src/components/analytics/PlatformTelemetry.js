"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const filterPrivateTelemetry = (event) => {
  try {
    if (
      new URL(event.url, "https://shario.io").pathname
        .split("/")
        .includes("team-invitation")
    )
      return null;
  } catch {
    return null;
  }
  return event;
};

export default function PlatformTelemetry() {
  return (
    <>
      <Analytics beforeSend={filterPrivateTelemetry} />
      <SpeedInsights beforeSend={filterPrivateTelemetry} />
    </>
  );
}
