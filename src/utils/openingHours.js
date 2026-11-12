export const OPENING_HOURS_WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_MINUTES = 24 * 60;

const clockMinutes = (value, allowMidnightEnd = false) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    minutes > 59 ||
    hours > 24 ||
    (hours === 24 && (!allowMidnightEnd || minutes !== 0))
  )
    return null;
  return hours * 60 + minutes;
};

/** A weekday's hours belong to the day on which its opening time occurs. */
export const getConfiguredOpeningInterval = (hours) => {
  if (!hours || hours.isOpen === false) return null;
  const openMinutes = clockMinutes(hours.openTime);
  const close = clockMinutes(hours.closeTime, true);
  if (openMinutes === null || close === null || close === openMinutes)
    return null;
  return {
    openMinutes,
    closeMinutes: close < openMinutes ? close + DAY_MINUTES : close,
  };
};

/** Civil-day windows include the previous weekday's overnight tail. */
export const getOpeningWindowsForWeekday = (openingHours, dayKey, fallback) => {
  const dayIndex = OPENING_HOURS_WEEKDAYS.indexOf(dayKey);
  if (dayIndex < 0) return [];
  const previousKey = OPENING_HOURS_WEEKDAYS[(dayIndex + 6) % 7];
  const previous = getConfiguredOpeningInterval(openingHours?.[previousKey]);
  const configured = openingHours?.[dayKey];
  const current = configured
    ? getConfiguredOpeningInterval(configured)
    : fallback;
  const windows = [];
  if (previous?.closeMinutes > DAY_MINUTES) {
    windows.push({
      openMinutes: 0,
      closeMinutes: previous.closeMinutes - DAY_MINUTES,
      stepOriginMinutes: previous.openMinutes - DAY_MINUTES,
    });
  }
  if (
    current &&
    Number.isFinite(current.openMinutes) &&
    Number.isFinite(current.closeMinutes) &&
    current.closeMinutes > current.openMinutes
  ) {
    windows.push({
      openMinutes: current.openMinutes,
      closeMinutes: current.closeMinutes,
    });
  }
  windows.sort((left, right) => left.openMinutes - right.openMinutes);
  const merged = [];
  for (const window of windows) {
    const last = merged.at(-1);
    if (last && window.openMinutes <= last.closeMinutes) {
      last.closeMinutes = Math.max(last.closeMinutes, window.closeMinutes);
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
};

export const openingWindowBounds = (windows) =>
  windows.length
    ? {
        isOpen: true,
        openMinutes: windows[0].openMinutes,
        closeMinutes: windows.at(-1).closeMinutes,
        ...(windows.length === 1 && windows[0].stepOriginMinutes !== undefined
          ? { stepOriginMinutes: windows[0].stepOriginMinutes }
          : {}),
        ...(windows.length > 1 ? { windows } : {}),
      }
    : { isOpen: false, openMinutes: 0, closeMinutes: 0 };

/** A selection must stay inside one continuous window, never bridge a closure. */
export const openingWindowAtMinute = (bounds, minute) => {
  if (!bounds?.isOpen) return null;
  const window = (bounds.windows || [bounds]).find(
    ({ openMinutes, closeMinutes }) =>
      minute >= openMinutes && minute < closeMinutes,
  );
  return window ? { ...window, isOpen: true } : null;
};

export const openingWindowFirstStart = (window, stepMinutes) => {
  const origin = window.stepOriginMinutes ?? window.openMinutes;
  const step = Math.max(1, Number(stepMinutes) || 30);
  return origin + Math.ceil((window.openMinutes - origin) / step) * step;
};
