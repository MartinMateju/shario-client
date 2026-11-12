export const SLOT_HEIGHT = 42;
export const SLOT_MINUTES = 30;
export const MIN_BOOKING_MINUTES = 60;
export const DAY_COLUMN_WIDTH = 12.5;
export const CALENDAR_START_HOUR = 6;

export function safeStr(value, fallback = "—") {
  const result = (value ?? "").toString().trim();
  return result.length ? result : fallback;
}

export function formatDateTime(value, locale = "cs-CZ") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getStartOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);

  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  return start;
}

export function buildWeekDays(startOfWeek) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);
    return day;
  });
}

export function buildTimeSlots({
  startHour = CALENDAR_START_HOUR,
  count = 37,
} = {}) {
  return Array.from({ length: count }, (_, index) => {
    const hour = startHour + Math.floor(index / 2);
    const minute = (index % 2) * 30;

    return {
      time: `${hour === 24 ? "00" : String(hour).padStart(2, "0")}:${String(
        minute,
      ).padStart(2, "0")}`,
      hour,
      minute,
      isHour: minute === 0,
    };
  });
}

export function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function diffMinutes(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function roundMinutesUp(date, step = SLOT_MINUTES) {
  const result = new Date(date);
  result.setSeconds(0, 0);

  const minutes = result.getMinutes();
  const rounded = Math.ceil(minutes / step) * step;

  if (rounded === 60) {
    result.setHours(result.getHours() + 1, 0, 0, 0);
  } else {
    result.setMinutes(rounded, 0, 0);
  }

  return result;
}

export function clampDateToCalendar(
  date,
  day,
  startHour = CALENDAR_START_HOUR,
) {
  const result = new Date(date);

  const min = new Date(day);
  min.setHours(startHour, 0, 0, 0);

  const max = new Date(day);
  max.setHours(24, 30, 0, 0);

  if (result < min) return min;
  if (result > max) return max;

  return result;
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export function getEventPosition({
  event,
  slotHeight = SLOT_HEIGHT,
  slotMinutes = SLOT_MINUTES,
  calendarStartHour = CALENDAR_START_HOUR,
}) {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  const startMinutes =
    (eventStart.getHours() - calendarStartHour) * 60 + eventStart.getMinutes();

  const endMinutes =
    (eventEnd.getHours() - calendarStartHour) * 60 + eventEnd.getMinutes();

  const durationMinutes = endMinutes - startMinutes;
  const pixelsPerMinute = slotHeight / slotMinutes;

  return {
    top: startMinutes * pixelsPerMinute,
    height: durationMinutes * pixelsPerMinute,
  };
}
