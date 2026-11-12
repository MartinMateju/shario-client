"use client";

import { useEffect, useMemo, useState } from "react";
import { openingWindowAtMinute } from "@/utils/openingHours";

import {
  dateKey,
  getCalendarHours,
  getStudioOpeningWindow,
  localDateKey,
  wallTimeMinutes,
} from "./calendar.utils";

export default function NowMarker({ day, studio, pixelsPerMinute, left = 0 }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const top = useMemo(() => {
    if (dateKey(now, studio?.timeZone) !== localDateKey(day)) return null;
    const { start, end } = getCalendarHours(studio);
    const openingWindow = getStudioOpeningWindow(studio, day);
    const minute = wallTimeMinutes(now, studio?.timeZone);

    if (
      !openingWindowAtMinute(openingWindow, minute) ||
      minute < start * 60 ||
      minute > end * 60
    ) {
      return null;
    }

    return (minute - start * 60) * pixelsPerMinute;
  }, [day, now, pixelsPerMinute, studio]);

  if (top == null) return null;

  return (
    <div
      data-calendar-now-marker="true"
      className="pointer-events-none absolute right-0 z-30 h-px bg-[#FF4E35]"
      style={{ top, left }}
    >
      <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[#FF4E35]" />
    </div>
  );
}
