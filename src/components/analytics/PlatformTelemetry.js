"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";

const isSensitivePath = (pathname) =>
  pathname.split("/").includes("team-invitation") ||
  /\/login\/complete(?:\/|$)/.test(pathname);

export const filterPrivateTelemetry = (event) => {
  try {
    const url = new URL(event.url, "https://shario.io");
    if (isSensitivePath(url.pathname) || /sessionHandoff/i.test(url.hash))
      return null;
  } catch {
    return null;
  }
  return event;
};

export default function PlatformTelemetry() {
  const pathname = usePathname() || "";
  // Do not initialize third-party scripts on the fragment handoff page.
  if (isSensitivePath(pathname)) return null;

  return (
    <>
      <Analytics beforeSend={filterPrivateTelemetry} />
      <SpeedInsights beforeSend={filterPrivateTelemetry} />
    </>
  );
}
