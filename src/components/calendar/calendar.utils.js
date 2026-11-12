import {
  getCourseCapacityUsage,
  isCourseBooking,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";
import {
  getOpeningWindowsForWeekday,
  openingWindowBounds,
  openingWindowAtMinute,
  openingWindowFirstStart,
} from "@/utils/openingHours";

import { isGlobalBlockingKind } from "./calendar.config";

const MINUTE = 60 * 1000;
const FORMATTER_CACHE_LIMIT = 64;
const dateTimeFormatters = new Map();
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const getDateTimeFormatter = (key, locale, options) => {
  const cached = dateTimeFormatters.get(key);
  if (cached) return cached;

  if (dateTimeFormatters.size >= FORMATTER_CACHE_LIMIT) {
    dateTimeFormatters.delete(dateTimeFormatters.keys().next().value);
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  dateTimeFormatters.set(key, formatter);
  return formatter;
};

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function addMonths(value, amount) {
  const date = new Date(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

export function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

export function startOfMonthGrid(value) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1, 12);
  return startOfWeek(first);
}

export function localDateKey(value) {
  const date = asDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateKey(value, timeZone) {
  const date = asDate(value);
  if (!date) return "";
  if (!timeZone) return localDateKey(date);

  const parts = getDateTimeFormatter(`date:${timeZone}`, "en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getCalendarDayState(value, now = new Date(), timeZone) {
  const dayKey = localDateKey(value);
  const todayKey = dateKey(now, timeZone);

  if (dayKey < todayKey) return "past";
  if (dayKey > todayKey) return "future";
  return "today";
}

export function getCustomerCalendarDaySurface(dayState) {
  if (dayState === "past") {
    return "var(--calendar-day-past-surface, color-mix(in srgb, var(--tenant-text-on-surface) 6%, var(--tenant-background)))";
  }

  if (dayState === "today") {
    return "var(--calendar-day-today-surface, color-mix(in srgb, var(--tenant-accent) 10%, var(--tenant-surface)))";
  }

  return "var(--calendar-day-future-surface, color-mix(in srgb, var(--tenant-accent) 2%, var(--tenant-surface)))";
}

/**
 * Customer-facing availability uses the calendar canvas palette, falling back
 * to tenant surfaces when rendered outside the calendar. Keeping this
 * mapping next to the availability engine prevents the day, week and month
 * views from assigning different visual meanings to the same state.
 */
export function getCustomerCalendarSlotSurface(state) {
  switch (state) {
    case "limited":
      return "var(--calendar-slot-limited-surface, color-mix(in srgb, var(--tenant-accent) 9%, var(--tenant-surface)))";
    case "full":
      return "var(--calendar-slot-full-surface, color-mix(in srgb, var(--tenant-text-on-surface) 8%, var(--tenant-surface)))";
    case "blocked":
      return "var(--calendar-slot-blocked-surface, color-mix(in srgb, var(--tenant-text-on-surface) 12%, var(--tenant-background)))";
    case "closed":
      return "var(--calendar-slot-closed-surface, color-mix(in srgb, var(--tenant-text-on-surface) 4%, var(--tenant-background)))";
    case "past":
      return "var(--calendar-slot-past-surface, color-mix(in srgb, var(--tenant-text-on-surface) 7%, var(--tenant-background)))";
    case "available":
    default:
      return "var(--tenant-calendar-available-surface, color-mix(in srgb, var(--tenant-accent) 1%, #FFFFFF))";
  }
}

export function wallTimeMinutes(value, timeZone) {
  const date = asDate(value);
  if (!date) return 0;
  if (!timeZone) return date.getHours() * 60 + date.getMinutes();

  const parts = getDateTimeFormatter(`wall-time:${timeZone}`, "en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return get("hour") * 60 + get("minute");
}

export function formatTime(value, locale, timeZone) {
  const date = asDate(value);
  if (!date) return "";
  return getDateTimeFormatter(
    `time:${locale || ""}:${timeZone || ""}`,
    locale,
    {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

export function formatRange(start, end, locale, timeZone) {
  return `${formatTime(start, locale, timeZone)} – ${formatTime(
    end,
    locale,
    timeZone,
  )}`;
}

const getActualCalendarHours = (studio) => ({
  start:
    studio?.actualCalendarHours?.start ?? studio?.calendarHours?.start ?? 8,
  end: studio?.actualCalendarHours?.end ?? studio?.calendarHours?.end ?? 20,
});

const getWallWeekdayKey = (value) => {
  const key = localDateKey(value);
  if (!key) return "";

  const wallDate = new Date(`${key}T12:00:00Z`);
  return WEEKDAY_KEYS[wallDate.getUTCDay()] || "";
};

const toCalendarDisplayHours = (windows) => ({
  start: Math.max(
    0,
    Math.floor(Math.min(...windows.map(({ openMinutes }) => openMinutes)) / 60),
  ),
  end: Math.min(
    24,
    Math.ceil(
      Math.max(...windows.map(({ closeMinutes }) => closeMinutes)) / 60,
    ),
  ),
});

/**
 * Day uses its selected weekday while Week uses the union of its visible
 * weekdays. A closed-only view falls back to the studio-wide valid schedule so
 * the calendar still has a useful disabled canvas.
 */
export function getCalendarDisplayHours(studio, days = []) {
  const requestedDays = (Array.isArray(days) ? days : [days]).filter(Boolean);
  const requestedWindows = requestedDays.flatMap((day) =>
    getOpeningWindowsForWeekday(studio?.openingHours, getWallWeekdayKey(day)),
  );

  if (requestedWindows.length) {
    return toCalendarDisplayHours(requestedWindows);
  }

  const studioWindows = WEEKDAY_KEYS.flatMap((dayKey) =>
    getOpeningWindowsForWeekday(studio?.openingHours, dayKey),
  );

  if (studioWindows.length) {
    return toCalendarDisplayHours(studioWindows);
  }

  const fallback = getActualCalendarHours(studio);
  const start = Number(fallback.start);
  const end = Number(fallback.end);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { start: 8, end: 20 };
  }

  return {
    start: Math.max(0, Math.floor(start)),
    end: Math.min(24, Math.ceil(end)),
  };
}

export function getCalendarHours(studio) {
  const display = studio?.displayCalendarHours;

  if (
    Number.isFinite(display?.start) &&
    Number.isFinite(display?.end) &&
    display.end > display.start
  ) {
    return display;
  }

  return getCalendarDisplayHours(studio);
}

export function getStudioOpeningWindow(studio, day) {
  const dayKey = getWallWeekdayKey(day);
  const calendar = getActualCalendarHours(studio);
  const openMinutes = Number(calendar.start) * 60;
  const closeMinutes = Math.min(24 * 60, Number(calendar.end) * 60);
  return openingWindowBounds(
    getOpeningWindowsForWeekday(studio?.openingHours, dayKey, {
      openMinutes,
      closeMinutes,
    }),
  );
}

export function slotFitsOpeningHours(studio, day, startMinute, endMinute) {
  const window = openingWindowAtMinute(
    getStudioOpeningWindow(studio, day),
    startMinute,
  );

  return (
    Boolean(window) &&
    startMinute >= window.openMinutes &&
    endMinute <= window.closeMinutes
  );
}

export function getWeekDays(value) {
  const first = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function getMonthDays(value) {
  const first = startOfMonthGrid(value);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function getTimeSlots(studio, step = 30) {
  const resolvedStep = Math.max(
    15,
    Number(studio?.slotStepMinutes || step || 30),
  );
  const { start, end } = getCalendarHours(studio);
  const slots = [];
  for (let minute = start * 60; minute <= end * 60; minute += resolvedStep) {
    slots.push({
      minute,
      label: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
        minute % 60,
      ).padStart(2, "0")}`,
      isHour: minute % 60 === 0,
    });
  }
  return slots;
}

export function overlaps(a, b) {
  const aStart = asDate(a.start)?.getTime();
  const aEnd = asDate(a.end)?.getTime();
  const bStart = asDate(b.start)?.getTime();
  const bEnd = asDate(b.end)?.getTime();
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && aEnd > bStart;
}

export function eventPosition(event, studio, pixelsPerMinute) {
  const { start } = getCalendarHours(studio);
  const eventStart = asDate(event.start);
  const eventEnd = asDate(event.end);
  const startDayKey = dateKey(eventStart, studio?.timeZone);
  const endDayKey = dateKey(eventEnd, studio?.timeZone);
  const startDay = Date.parse(`${startDayKey}T00:00:00Z`);
  const endDay = Date.parse(`${endDayKey}T00:00:00Z`);
  const dayOffset =
    Number.isFinite(startDay) && Number.isFinite(endDay)
      ? Math.max(0, Math.round((endDay - startDay) / (24 * 60 * MINUTE)))
      : 0;
  const from = wallTimeMinutes(eventStart, studio?.timeZone) - start * 60;
  const to =
    wallTimeMinutes(eventEnd, studio?.timeZone) +
    dayOffset * 24 * 60 -
    start * 60;

  return {
    top: Math.max(0, from) * pixelsPerMinute,
    height: Math.max(28, (to - from) * pixelsPerMinute),
  };
}

/**
 * Proper interval partitioning. It handles transitive overlap groups such as
 * A overlaps B, B overlaps C, while A does not overlap C.
 */
export function layoutOverlaps(events) {
  const sorted = [...events]
    .filter((event) => asDate(event.start) && asDate(event.end))
    .sort((a, b) => {
      const startDiff = asDate(a.start) - asDate(b.start);
      return startDiff || asDate(b.end) - asDate(a.end);
    });
  const result = {};
  let group = [];
  let groupEnd = -Infinity;

  const placeGroup = () => {
    if (!group.length) return;
    const columnEnds = [];
    const placed = group.map((event) => {
      const start = asDate(event.start).getTime();
      const end = asDate(event.end).getTime();
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = end;
      return { event, column };
    });
    const columns = Math.max(1, columnEnds.length);
    placed.forEach(({ event, column }) => {
      result[event.id] = {
        column,
        columns,
        left: (column / columns) * 100,
        width: 100 / columns,
      };
    });
  };

  sorted.forEach((event) => {
    const start = asDate(event.start).getTime();
    const end = asDate(event.end).getTime();
    if (group.length && start >= groupEnd) {
      placeGroup();
      group = [];
      groupEnd = -Infinity;
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, end);
  });
  placeGroup();
  return result;
}

export function bookingIsVisible(booking) {
  const status = String(booking?.status || "").toLowerCase();
  return status !== "cancelled" && status !== "canceled";
}

export function bookingsForDay(bookings, day, studio) {
  // `day` represents the calendar's selected wall-clock date. Booking
  // instants, however, must be interpreted in the studio timezone.
  const key = localDateKey(day);
  return bookings.filter(
    (booking) =>
      bookingIsVisible(booking) &&
      booking.locationId === studio?.id &&
      dateKey(booking.start, studio?.timeZone) === key,
  );
}

export function bookingUnits(booking) {
  if (isCourseBooking(booking)) return getCourseCapacityUsage(booking) ?? 0;
  return Math.max(
    1,
    Number(
      booking?.capacityUsed ?? booking?.guests ?? booking?.numberOfGuests ?? 1,
    ) || 1,
  );
}

export function capacityAt(bookings, studio, activityId, start, end) {
  const resource = studio?.resources?.find((item) => item.id === activityId);
  const limit = Number(resource?.capacity ?? 0);
  const probe = { start, end };
  const used = bookings
    .filter(
      (booking) =>
        bookingIsVisible(booking) &&
        booking?.isSuggested !== true &&
        booking.locationId === studio?.id &&
        (!isCourseBooking(booking) ||
          booking.courseEquipmentRequired !== false) &&
        (booking.activityId === activityId ||
          (isCourseBooking(booking) &&
            ["", "undefined"].includes(bookingActivityId(booking)))) &&
        overlaps(booking, probe),
    )
    .reduce((sum, booking) => sum + bookingUnits(booking), 0);

  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function getCapacityTone({ used, limit }) {
  if (!limit || used >= limit) return "full";
  if (used / limit >= 0.8) return "limited";
  return "available";
}

const normalizedId = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return normalizedId(value.id || value._id || value.locationId);
};

const normalizedActivityId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const bookingLocationId = (booking) =>
  normalizedId(booking?.locationId || booking?.location);

const bookingActivityId = (booking) =>
  normalizedActivityId(booking?.activityId || booking?.plannedActivity);

const positiveLimit = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const getStudioBookingSetting = (studio, key) =>
  studio?.[key] ?? studio?.booking?.[key];

const getGlobalCapacity = (studio) =>
  positiveLimit(getStudioBookingSetting(studio, "globalCapacity"));

const getPublicLaneCapacity = (studio) => {
  const hasActivityCapacity =
    (Array.isArray(studio?.resources) && studio.resources.length > 0) ||
    (Array.isArray(studio?.booking?.activityCapacities) &&
      studio.booking.activityCapacities.length > 0);
  const availabilityMode =
    studio?.availabilityMode || (hasActivityCapacity ? "capacity" : "lanes");

  // Reservation count and people capacity are independent limits, including
  // in studios with activity resources. Match the drawer's policy aliases.
  const allowsOverlap =
    getStudioBookingSetting(studio, "allowPublicOverlap") ??
    getStudioBookingSetting(studio, "allowPublicSoloOverlap");
  const configuredLimit = positiveLimit(
    getStudioBookingSetting(studio, "maxConcurrentOpenStudioBookings") ??
      getStudioBookingSetting(studio, "maxPublicOverlaps") ??
      studio?.publicLaneCount ??
      getStudioBookingSetting(studio, "maxPublicSoloOverlaps"),
  );
  const hasLanePolicy =
    availabilityMode === "lanes" ||
    allowsOverlap !== undefined ||
    configuredLimit !== null;

  if (!hasLanePolicy) return null;
  if (allowsOverlap !== true) return 1;
  return configuredLimit || 1;
};

const getCapacityResources = (studio) => {
  const directResources = Array.isArray(studio?.resources)
    ? studio.resources
    : [];
  const configuredResources = Array.isArray(studio?.booking?.activityCapacities)
    ? studio.booking.activityCapacities
    : [];
  const source = directResources.length ? directResources : configuredResources;

  return source
    .map((resource) => {
      const id = normalizedId(resource?.id || resource?.activity || resource);
      return {
        ...resource,
        id,
        capacity: positiveLimit(resource?.capacity),
      };
    })
    .filter(({ id }) => id);
};

const bookingBelongsToStudio = (booking, studio) => {
  const studioId = normalizedId(
    studio?.id || studio?.locationId || studio?._id,
  );
  const locationId = bookingLocationId(booking);
  if (!studioId) return true;
  return Boolean(locationId && locationId === studioId);
};

const bookingGloballyBlocks = (booking, studio) => {
  if (booking?.isClosure === true || isGlobalBlockingKind(booking?.kind))
    return true;
  // Course privacy snapshots describe the class, not exclusive studio use.
  // Only an explicit location opt-in permits sharing its reserved capacity.
  if (isCourseBooking(booking)) {
    return (
      getStudioBookingSetting(studio, "groupBookingBlocksAll") !== false ||
      getCourseCapacityUsage(booking) === null
    );
  }

  const tag = String(booking?.tag || "").toLowerCase();
  const kind = String(booking?.kind || "").toLowerCase();
  const bookingMode = String(
    booking?.bookingMode ?? booking?.bookingType ?? "",
  ).toLowerCase();
  const legacyCapacityBooking =
    !bookingMode &&
    ["open-studio", "workshop", "public-workshop", "private-workshop"].includes(
      tag,
    );
  const blockingKinds = [
    "private",
    "private-session",
    "private-studio",
    "privatestudio",
    "exclusive",
    "exclusive-open-studio",
    "exclusiveopenstudio",
    "block",
    "blocker",
  ];

  if (
    booking?.isExclusive === true ||
    bookingMode === "private" ||
    bookingMode === "exclusive" ||
    legacyCapacityBooking ||
    blockingKinds.includes(kind) ||
    blockingKinds.includes(tag)
  ) {
    return true;
  }

  const groupBookingsBlock =
    getStudioBookingSetting(studio, "groupBookingBlocksAll") === true;
  const groupKinds = ["class", "course", "group", "group-booking", "workshop"];
  return (
    groupBookingsBlock &&
    (groupKinds.includes(kind) || groupKinds.includes(tag))
  );
};

const bookingsForProbe = (bookings, studio, probe) =>
  (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      bookingIsVisible(booking) &&
      booking?.isSuggested !== true &&
      bookingBelongsToStudio(booking, studio) &&
      overlaps(booking, probe),
  );

/**
 * Returns peak concurrent usage inside the requested interval. Summing every
 * intersecting booking would incorrectly reject a long slot when one booking
 * ends before another begins, even though their combined total never exists
 * at a single moment.
 */
const peakConcurrentUsage = (bookings, probe, unitsForBooking) => {
  const probeStart = asDate(probe?.start)?.getTime();
  const probeEnd = asDate(probe?.end)?.getTime();
  if (!Number.isFinite(probeStart) || !Number.isFinite(probeEnd)) return 0;

  const deltas = new Map();
  bookings.forEach((booking) => {
    const bookingStart = asDate(booking?.start)?.getTime();
    const bookingEnd = asDate(booking?.end)?.getTime();
    if (
      !Number.isFinite(bookingStart) ||
      !Number.isFinite(bookingEnd) ||
      bookingStart >= probeEnd ||
      bookingEnd <= probeStart
    ) {
      return;
    }

    const units = Math.max(0, Number(unitsForBooking(booking)) || 0);
    if (!units) return;

    const start = Math.max(probeStart, bookingStart);
    const end = Math.min(probeEnd, bookingEnd);
    deltas.set(start, (deltas.get(start) || 0) + units);
    deltas.set(end, (deltas.get(end) || 0) - units);
  });

  let used = 0;
  let peak = 0;
  [...deltas.entries()]
    .sort(([left], [right]) => left - right)
    .forEach(([, delta]) => {
      used += delta;
      peak = Math.max(peak, used);
    });

  return peak;
};

const bookingLaneUnits = (booking) => {
  if (isCourseBooking(booking)) return 0;
  if (Array.isArray(booking?.grouped)) {
    return booking.grouped.filter(
      (groupedBooking) =>
        bookingIsVisible(groupedBooking) &&
        !isCourseBooking(groupedBooking) &&
        groupedBooking?.isSuggested !== true,
    ).length;
  }
  return 1;
};

const selectTightestConstraint = (constraints) =>
  [...constraints].sort((left, right) => {
    const leftHeadroom = left.remaining / Math.max(1, left.required);
    const rightHeadroom = right.remaining / Math.max(1, right.required);
    if (leftHeadroom !== rightHeadroom) return leftHeadroom - rightHeadroom;

    const leftRatio = left.capacity
      ? left.remaining / left.capacity
      : Number.POSITIVE_INFINITY;
    const rightRatio = right.capacity
      ? right.remaining / right.capacity
      : Number.POSITIVE_INFINITY;
    return leftRatio - rightRatio;
  })[0] || null;

const activityCandidates = (studio, requestedActivityId) => {
  const resources = getCapacityResources(studio);
  const requested = normalizedActivityId(requestedActivityId);

  if (requested) {
    const resource = resources.find(
      ({ id }) => normalizedActivityId(id) === requested,
    );
    if (resource) return [resource];

    if (studio?.availabilityMode === "capacity" || resources.length) {
      return [{ id: String(requestedActivityId), capacity: 0, missing: true }];
    }

    return [{ id: String(requestedActivityId), capacity: null }];
  }

  if (studio?.availabilityMode === "capacity" && resources.length) {
    return resources;
  }

  if (studio?.availabilityMode === "capacity") {
    return [{ id: "", capacity: 0, missing: true }];
  }

  return [{ id: "", capacity: null }];
};

const evaluateActivityAvailability = ({
  studio,
  overlapping,
  probe,
  resource,
  guests,
}) => {
  const constraints = [];
  const requestedGuests = Math.max(1, Number(guests) || 1);
  const resourceCapacity =
    resource?.missing === true ||
    (studio?.availabilityMode === "capacity" &&
      positiveLimit(resource?.capacity) === null)
      ? 0
      : positiveLimit(resource?.capacity);
  const resourceId = normalizedActivityId(resource?.id);

  if (resourceCapacity !== null || resource?.missing === true) {
    const capacity = resourceCapacity || 0;
    const matchingBookings = overlapping.filter(
      (booking) =>
        (!isCourseBooking(booking) ||
          booking.courseEquipmentRequired !== false) &&
        (bookingActivityId(booking) === resourceId ||
          (isCourseBooking(booking) &&
            ["", "undefined"].includes(bookingActivityId(booking)))),
    );
    const used = peakConcurrentUsage(matchingBookings, probe, bookingUnits);
    constraints.push({
      type: "activity",
      capacity,
      used,
      remaining: Math.max(0, capacity - used),
      required: requestedGuests,
    });
  }

  const globalCapacity = getGlobalCapacity(studio);
  if (globalCapacity !== null) {
    const used = peakConcurrentUsage(overlapping, probe, bookingUnits);
    constraints.push({
      type: "global",
      capacity: globalCapacity,
      used,
      remaining: Math.max(0, globalCapacity - used),
      required: requestedGuests,
    });
  }

  overlapping.forEach((booking) => {
    if (isCourseBooking(booking)) return;
    const capacity = positiveLimit(booking.publicCapacityLimit);
    if (capacity === null) return;
    // A public session's fixed total applies only while that session exists.
    // Scope the peak to its interval so adjacent sessions do not add together.
    const limitedProbe = {
      start: new Date(
        Math.max(
          asDate(probe.start).getTime(),
          asDate(booking.start).getTime(),
        ),
      ),
      end: new Date(
        Math.min(asDate(probe.end).getTime(), asDate(booking.end).getTime()),
      ),
    };
    const used = peakConcurrentUsage(overlapping, limitedProbe, bookingUnits);
    constraints.push({
      type: "public",
      capacity,
      used,
      remaining: Math.max(0, capacity - used),
      required: requestedGuests,
    });
  });

  const laneCapacity = getPublicLaneCapacity(studio);
  if (laneCapacity !== null) {
    const used = peakConcurrentUsage(overlapping, probe, bookingLaneUnits);
    constraints.push({
      type: "lanes",
      capacity: laneCapacity,
      used,
      remaining: Math.max(0, laneCapacity - used),
      required: 1,
    });
  }

  const peopleConstraints = constraints.filter(({ type }) => type !== "lanes");
  const blockedLane = constraints.find(
    ({ type, remaining, required }) => type === "lanes" && remaining < required,
  );
  // A free reservation lane is not one free person. Display the actual people
  // capacity unless the reservation-count policy prevents any new booking.
  const tightest =
    blockedLane ||
    selectTightestConstraint(
      peopleConstraints.length ? peopleConstraints : constraints,
    );
  const isBookable = constraints.every(
    ({ remaining, required }) => remaining >= required,
  );
  const isLimited =
    isBookable &&
    constraints.some(
      ({ used, capacity }) =>
        getCapacityTone({ used, limit: capacity }) === "limited",
    );

  return {
    state: isBookable ? (isLimited ? "limited" : "available") : "full",
    isBookable,
    remaining: tightest?.remaining ?? null,
    capacity: tightest?.capacity ?? null,
    used: tightest?.used ?? 0,
    remainingAfterBooking: tightest
      ? Math.max(0, tightest.remaining - tightest.required)
      : null,
    activityId: resource?.id || "",
    constraints,
  };
};

const unavailableSlotResult = ({
  state,
  activityId,
  start,
  end,
  startMinute,
  endMinute,
}) => ({
  state,
  isBookable: false,
  remaining: 0,
  capacity: null,
  used: 0,
  remainingAfterBooking: 0,
  activityId: activityId || "",
  start,
  end,
  startMinute,
  endMinute,
  constraints: [],
});

/**
 * Authoritative customer-calendar availability check. It evaluates the whole
 * requested duration and combines blockers, activity capacity, global guest
 * capacity and parallel public-booking lanes.
 */
export function getCalendarSlotAvailability({
  studio,
  bookings = [],
  day,
  startMinute,
  endMinute,
  activityId = "",
  guests = 1,
  bookingMode = "public",
  now = new Date(),
} = {}) {
  const numericStart = Number(startMinute);
  const numericEnd = Number(endMinute);
  const validDay = asDate(day);
  const validMinutes =
    Number.isFinite(numericStart) &&
    Number.isFinite(numericEnd) &&
    numericStart >= 0 &&
    numericStart < 24 * 60 &&
    numericEnd <= 48 * 60 &&
    numericEnd > numericStart;

  if (
    !studio ||
    !validDay ||
    !validMinutes ||
    studio?.bookingEnabled === false ||
    getStudioBookingSetting(studio, "enabled") === false
  ) {
    return unavailableSlotResult({
      state: "closed",
      activityId,
      start: null,
      end: null,
      startMinute: numericStart,
      endMinute: numericEnd,
    });
  }

  const start = makeSlotDate(validDay, numericStart, studio?.timeZone);
  const end = makeSlotDate(validDay, numericEnd, studio?.timeZone);
  const base = {
    activityId,
    start,
    end,
    startMinute: numericStart,
    endMinute: numericEnd,
  };

  if (
    !asDate(start) ||
    !asDate(end) ||
    !slotFitsOpeningHours(studio, validDay, numericStart, numericEnd)
  ) {
    return unavailableSlotResult({ state: "closed", ...base });
  }

  const nowValue = asDate(now)?.getTime();
  if (Number.isFinite(nowValue) && start.getTime() <= nowValue) {
    return unavailableSlotResult({ state: "past", ...base });
  }

  const probe = { start, end };
  const overlapping = bookingsForProbe(bookings, studio, probe);
  const requestedPrivate = ["private", "exclusive"].includes(
    String(bookingMode).toLowerCase(),
  );
  if (
    overlapping.some((booking) => bookingGloballyBlocks(booking, studio)) ||
    (overlapping.length > 0 && requestedPrivate)
  ) {
    return unavailableSlotResult({ state: "blocked", ...base });
  }

  const sharedBookings = overlapping.filter(
    (booking) => !bookingGloballyBlocks(booking, studio),
  );
  const evaluations = activityCandidates(studio, activityId).map((resource) =>
    evaluateActivityAvailability({
      studio,
      overlapping: sharedBookings,
      probe,
      resource,
      guests,
    }),
  );
  const preferred = [...evaluations].sort((left, right) => {
    if (left.isBookable !== right.isBookable) return left.isBookable ? -1 : 1;
    if (left.state !== right.state) return left.state === "available" ? -1 : 1;
    return (right.remaining ?? -1) - (left.remaining ?? -1);
  })[0];

  return {
    ...(preferred || {
      state: "full",
      isBookable: false,
      remaining: 0,
      capacity: 0,
      used: 0,
      remainingAfterBooking: 0,
      activityId: activityId || "",
      constraints: [],
    }),
    start,
    end,
    startMinute: numericStart,
    endMinute: numericEnd,
  };
}

const getMinimumSlotDuration = (studio) => {
  const stepMinutes = Math.max(15, Number(studio?.slotStepMinutes) || 30);
  return {
    stepMinutes,
    duration: Math.max(stepMinutes, Number(studio?.minBookingMinutes) || 60),
  };
};

const getSlotStatesForDay = ({
  studio,
  bookings,
  day,
  activityId,
  guests,
  bookingMode,
  now,
}) => {
  const openingWindow = getStudioOpeningWindow(studio, day);
  if (!openingWindow.isOpen) return [];

  const { stepMinutes, duration } = getMinimumSlotDuration(studio);
  const slots = [];
  for (const window of openingWindow.windows || [openingWindow]) {
    const latestStart = Math.min(24 * 60 - 1, window.closeMinutes - duration);
    for (
      let startMinute = openingWindowFirstStart(window, stepMinutes);
      startMinute <= latestStart;
      startMinute += stepMinutes
    ) {
      slots.push(
        getCalendarSlotAvailability({
          studio,
          bookings,
          day,
          startMinute,
          endMinute: startMinute + duration,
          activityId,
          guests,
          bookingMode,
          now,
        }),
      );
    }
  }
  return slots;
};

/** Returns only genuinely selectable, minimum-duration slots for one day. */
export function getBookableSlotsForDay({
  studio,
  bookings = [],
  day,
  activityId = "",
  guests = 1,
  bookingMode = "public",
  now = new Date(),
  limit,
} = {}) {
  if (!studio || !asDate(day)) return [];

  const maximum =
    limit !== undefined && limit !== null && Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : Number.POSITIVE_INFINITY;

  return getSlotStatesForDay({
    studio,
    bookings,
    day,
    activityId,
    guests,
    bookingMode,
    now,
  })
    .filter(({ isBookable }) => isBookable)
    .slice(0, maximum)
    .map((slot) => ({ ...slot, day: asDate(day) }));
}

/** Availability-first summary used by the customer month navigator. */
export function getCalendarDayAvailability({
  studio,
  bookings = [],
  day,
  activityId = "",
  guests = 1,
  bookingMode = "public",
  now = new Date(),
  limit,
} = {}) {
  const openingWindow =
    studio && asDate(day)
      ? getStudioOpeningWindow(studio, day)
      : { isOpen: false };
  const slots = openingWindow.isOpen
    ? getSlotStatesForDay({
        studio,
        bookings,
        day,
        activityId,
        guests,
        bookingMode,
        now,
      })
    : [];
  const allBookableSlots = slots.filter(({ isBookable }) => isBookable);
  const maximum =
    limit !== undefined && limit !== null && Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : Number.POSITIVE_INFINITY;
  const bookableSlots = allBookableSlots
    .slice(0, maximum)
    .map((slot) => ({ ...slot, day: asDate(day) }));
  const availableSlots = slots.filter(
    ({ state }) => state === "available",
  ).length;
  const limitedSlots = slots.filter(({ state }) => state === "limited").length;
  const futureSlots = slots.filter(({ state }) => state !== "past");
  const availabilityRatio = futureSlots.length
    ? allBookableSlots.length / futureSlots.length
    : 0;

  let state = "closed";
  if (slots.length && slots.every((slot) => slot.state === "past")) {
    state = "past";
  } else if (allBookableSlots.length) {
    state =
      availableSlots === 0 || availabilityRatio <= 0.25
        ? "limited"
        : "available";
  } else if (futureSlots.some((slot) => slot.state === "full")) {
    state = "full";
  } else if (futureSlots.some((slot) => slot.state === "blocked")) {
    state = "blocked";
  }

  const nextAvailable = allBookableSlots[0]
    ? { ...allBookableSlots[0], day: asDate(day) }
    : null;
  return {
    state,
    isBookable: allBookableSlots.length > 0,
    availableSlots,
    limitedSlots,
    totalSlots: slots.length,
    bookableSlots,
    nextAvailable,
    remaining: nextAvailable?.remaining ?? 0,
    capacity: nextAvailable?.capacity ?? null,
    activityId: nextAvailable?.activityId || activityId || "",
    availabilityRatio,
    fullSlots: slots.filter(({ state: slotState }) => slotState === "full")
      .length,
    blockedSlots: slots.filter(
      ({ state: slotState }) => slotState === "blocked",
    ).length,
    pastSlots: slots.filter(({ state: slotState }) => slotState === "past")
      .length,
  };
}

export function makeSlotDate(day, minutes, timeZone) {
  const safeMinutes = Math.max(0, Math.min(48 * 60, Number(minutes) || 0));
  const dayOffset = Math.floor(safeMinutes / (24 * 60));
  const dateValue = localDateKey(addDays(day, dayOffset));
  const hour = Math.floor((safeMinutes % (24 * 60)) / 60);
  const minute = safeMinutes % 60;

  const timeValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}`;

  return zonedDateTimeToUtc(dateValue, timeValue, timeZone);
}

// Shared presentation metadata for tenant and customer cards. The card's
// guests remain its party size; used may count shared lanes or studio capacity.
export function getCalendarEventCapacity(event, bookings, studio) {
  if (
    event.isClosure ||
    isGlobalBlockingKind(event.kind) ||
    event.bookingMode === "private"
  ) {
    return {};
  }
  if (event.kind === "course" || event.kind === "class") {
    return {
      capacity: Number(event.capacity ?? 0),
      used: Number(
        event.guests ?? event.participantCount ?? event.numberOfGuests ?? 0,
      ),
    };
  }

  const overlapping = bookings.filter(
    (booking) =>
      bookingIsVisible(booking) &&
      bookingBelongsToStudio(booking, studio) &&
      overlaps(booking, event) &&
      !bookingGloballyBlocks(booking, studio),
  );
  const resource = activityCandidates(studio, event.activityId)[0];
  const availability = evaluateActivityAvailability({
    studio,
    overlapping,
    probe: event,
    resource,
    guests: 1,
  });
  return { capacity: availability.capacity, used: availability.used };
}

export function buildCustomerEvents(
  bookings,
  studio,
  t,
  availabilityBookings = bookings,
) {
  const visible = bookings.filter(bookingIsVisible);
  const groups = new Map();

  visible.forEach((booking) => {
    const privateBooking =
      isGlobalBlockingKind(booking.kind) || booking.bookingMode === "private";
    const classSession = booking.kind === "class" || booking.kind === "course";
    const key = [
      booking.start,
      booking.end,
      booking.activityId || "all",
      booking.kind || "public",
      booking.productId ||
        booking.bookingProduct ||
        booking.productName ||
        booking.publicTitle ||
        booking.title ||
        "",
      booking.bookingMode || booking.bookingType || "public",
      // Class sessions already aggregate their attendees and have independent
      // capacities. Like exclusive and own bookings, keep their cards separate.
      privateBooking || classSession || booking.isMine
        ? booking.id || booking._id
        : "shared",
    ].join("|");
    const existing = groups.get(key) || {
      ...booking,
      grouped: [],
      id:
        booking.isMine || classSession
          ? booking.id || booking._id
          : `safe-${key}`,
    };
    existing.grouped.push(booking);
    groups.set(key, existing);
  });

  return [...groups.values()].map((event) => {
    const isClosure =
      event.isClosure === true ||
      ["block", "blocker"].includes(event.kind) ||
      ["block", "blocker"].includes(event.tag) ||
      (event.isClosure !== false &&
        event.kind === "privateStudio" &&
        !event.productId &&
        !event.bookingProduct &&
        !event.productName);
    const guests = event.grouped.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(
            item.guests ??
              item.participantCount ??
              item.numberOfGuests ??
              bookingUnits(item),
          ) || 0,
        ),
      0,
    );
    const capacityUsed = event.grouped.reduce(
      (sum, item) => sum + bookingUnits(item),
      0,
    );
    const customerIds = [
      ...new Set(event.grouped.flatMap((item) => item.customerIds || [])),
    ];
    const shared = {
      ...event,
      title: isClosure
        ? t("events.unavailable")
        : event.productName ||
          event.publicTitle ||
          event.title ||
          t("events.class"),
      guests,
      capacityUsed,
      customerIds: isClosure ? [] : customerIds,
      isClosure,
      privacySafe: true,
    };

    // Product cards share the same studio constraints. Count all concurrent
    // bookings for fullness while retaining this card's own party size above.
    return {
      ...shared,
      ...getCalendarEventCapacity(shared, availabilityBookings, studio),
    };
  });
}

export function minutesToDate(day, minutes) {
  return new Date(
    new Date(day).setHours(Math.floor(minutes / 60), minutes % 60, 0, 0),
  );
}

export function durationMinutes(start, end) {
  return Math.max(0, (asDate(end) - asDate(start)) / MINUTE);
}

/**
 * Picks a real, client-only booking suggestion from the studio's currently
 * visible availability. The result is only a preview: callers must wait for
 * an explicit customer action before opening checkout or persisting anything.
 */
export function pickSuggestedCalendarSlot({
  studio,
  bookings = [],
  selectedActivityId = "",
  now = new Date(),
  daysToSearch = 21,
  random = Math.random,
} = {}) {
  if (!studio) return null;

  const stepMinutes = Math.max(15, Number(studio.slotStepMinutes) || 30);
  const duration = Math.max(
    stepMinutes,
    Number(studio.minBookingMinutes) || 60,
  );
  const todayKey = dateKey(now, studio.timeZone);
  const [year, month, dayOfMonth] = todayKey.split("-").map(Number);
  if (![year, month, dayOfMonth].every(Number.isFinite)) return null;

  const firstDay = new Date(year, month - 1, dayOfMonth, 12, 0, 0, 0);
  if (!Number.isFinite(asDate(now)?.getTime())) return null;

  const candidates = [];
  const searchLength = Math.max(1, Math.min(60, Number(daysToSearch) || 21));
  const resourceIds = selectedActivityId
    ? [selectedActivityId]
    : studio?.availabilityMode === "capacity"
      ? getCapacityResources(studio).map(({ id }) => id)
      : [""];

  if (!resourceIds.length) return null;

  for (let offset = 0; offset < searchLength; offset += 1) {
    const day = addDays(firstDay, offset);
    resourceIds.forEach((activityId) => {
      candidates.push(
        ...getBookableSlotsForDay({
          studio: {
            ...studio,
            minBookingMinutes: duration,
            slotStepMinutes: stepMinutes,
          },
          bookings,
          day,
          activityId,
          guests: 1,
          now,
        }),
      );
    });
  }

  if (!candidates.length) return null;

  const randomValue = Number(typeof random === "function" ? random() : 0);
  const safeRandom = Number.isFinite(randomValue)
    ? Math.min(0.999999, Math.max(0, randomValue))
    : 0;
  return candidates[Math.floor(safeRandom * candidates.length)] || null;
}
