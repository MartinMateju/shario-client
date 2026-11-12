import {
  getOpenStudioGuestLimit,
  isCustomerChoiceOpenStudio,
} from "@/lib/features/products/products.contract.mjs";
import {
  getOpeningWindowsForWeekday,
  openingWindowBounds,
  openingWindowAtMinute,
  openingWindowFirstStart,
} from "./openingHours";

const MINUTE = 60_000;
const FORMATTER_CACHE_LIMIT = 64;
const dateTimeFormatters = new Map();

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

export const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
};

export const getBookingLocationId = (booking) =>
  getEntityId(booking?.locationId || booking?.location);

export const formatLocationAddress = (
  location,
  { includeCountry = true } = {},
) => {
  if (!location) return "";
  if (typeof location.address === "string") return location.address.trim();

  const address = location.address || {};
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const city = [address.postalCode, address.city].filter(Boolean).join(" ");

  return [street, city, includeCountry ? address.country : ""]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

export const getLocationTimeZone = (location) =>
  location?.booking?.timezone ||
  location?.timezone ||
  location?.timeZone ||
  "Europe/Prague";

const getZonedParts = (date, timeZone) => {
  const parts = getDateTimeFormatter(`zoned-parts:${timeZone}`, "en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

/**
 * Converts a wall-clock value in an IANA timezone to a real UTC Date.
 * The second pass handles DST boundaries where the first offset estimate
 * lands on the other side of a transition.
 */
export const zonedDateTimeToUtc = (dateValue, timeValue, timeZone) => {
  if (!dateValue || !timeValue) return null;

  const [year, month, day] = String(dateValue).split("-").map(Number);
  const [hour, minute] = String(timeValue).split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const target = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = target;

  for (let pass = 0; pass < 2; pass += 1) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );

    guess += target - represented;
  }

  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
};

export const formatWallTime = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return getDateTimeFormatter(`wall-time:${timeZone}`, "en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatWallDate = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = getDateTimeFormatter(`wall-date:${timeZone}`, "en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const formatZonedDate = (value, timeZone, locale = "en-GB") => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return getDateTimeFormatter(`zoned-date:${locale}:${timeZone}`, locale, {
    timeZone,
    dateStyle: "medium",
  }).format(date);
};

export const formatZonedTimeRange = (
  startValue,
  endValue,
  timeZone,
  locale = "en-GB",
) => {
  const start = startValue instanceof Date ? startValue : new Date(startValue);
  const end = endValue instanceof Date ? endValue : new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const formatter = getDateTimeFormatter(
    `zoned-range:${locale}:${timeZone}`,
    locale,
    {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );

  return `${formatter.format(start)}–${formatter.format(end)}`;
};

const toMinutes = (time, fallback) => {
  if (!time) return fallback;
  const [hours, minutes] = String(time).split(":").map(Number);
  if (![hours, minutes].every(Number.isFinite)) return fallback;
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const safe = Math.max(0, Math.min(24 * 60, minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60,
  ).padStart(2, "0")}`;
};

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const getOpeningWindow = (location, dateValue) => {
  const midday = new Date(`${dateValue}T12:00:00Z`);
  const dayKey = WEEKDAYS[midday.getUTCDay()] || "monday";
  return openingWindowBounds(
    getOpeningWindowsForWeekday(location?.openingHours, dayKey, {
      openMinutes: 8 * 60,
      closeMinutes: 20 * 60,
    }),
  );
};

export const buildStartTimeOptions = (location, dateValue) => {
  const bounds = getOpeningWindow(location, dateValue);
  if (!bounds.isOpen) return [];

  const step = Math.max(15, Number(location?.booking?.slotStepMinutes) || 30);
  const minimum = Math.max(
    15,
    Number(location?.booking?.minBookingMinutes) || 60,
  );
  const values = [];

  for (const window of bounds.windows || [bounds]) {
    for (
      let minute = openingWindowFirstStart(window, step);
      minute < 24 * 60 && minute + minimum <= window.closeMinutes;
      minute += step
    ) {
      values.push(minutesToTime(minute));
    }
  }

  return values;
};

export const buildDurationOptions = (location, dateValue, startTime) => {
  if (!startTime) return [];
  const startMinutes = toMinutes(startTime, 0);
  const window = openingWindowAtMinute(
    getOpeningWindow(location, dateValue),
    startMinutes,
  );
  if (!window) return [];
  const { closeMinutes } = window;
  const step = Math.max(15, Number(location?.booking?.slotStepMinutes) || 30);
  const minimum = Math.max(
    15,
    Number(location?.booking?.minBookingMinutes) || 60,
  );
  const maximum = Math.max(
    minimum,
    Number(location?.booking?.maxBookingMinutes) || 360,
  );
  const values = [];

  for (let duration = minimum; duration <= maximum; duration += step) {
    if (startMinutes + duration > closeMinutes) break;
    values.push(duration);
  }

  return values;
};

export const formatDuration = (minutes, language = "EN") => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = language === "CZ" ? "h" : "h";
  const minuteLabel = language === "CZ" ? "min" : "min";

  if (hours && rest) return `${hours} ${hourLabel} ${rest} ${minuteLabel}`;
  if (hours) return `${hours} ${hourLabel}`;
  return `${rest} ${minuteLabel}`;
};

const CAPACITY_BOOKING_TAGS = new Set([
  "open-studio",
  "workshop",
  "public-workshop",
  "private-workshop",
  "private-studio",
  "private-session",
]);

const INTERNAL_PRIVATE_STUDIO_TAGS = new Set([
  "private-studio",
  "private-session",
  "privatestudio",
  "block",
  "blocker",
]);

export const isCourseBooking = (booking) =>
  [booking?.tag, booking?.kind].some((value) =>
    ["class", "course"].includes(String(value || "").toLowerCase()),
  );

// Course sessions reserve their scheduled places even before they fill up.
// The customer API supplies capacityUsed including live enrollment holds;
// legacy populated rows can still provide the scheduled product capacity.
export const getCourseCapacityUsage = (booking) => {
  if (booking?.courseCapacityUnavailable === true) return null;
  const capacities = [
    booking?.capacityUsed,
    booking?.maxNumberOfParticipants,
    booking?.capacity,
    booking?.bookingProduct?.maxNumberOfParticipants,
    booking?.product?.maxNumberOfParticipants,
  ]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!capacities.length) return null;
  return Math.max(...capacities, Number(booking?.numberOfGuests) || 0);
};

const isPrivateStudioBooking = (booking) =>
  booking?.isClosure === true ||
  [booking?.tag, booking?.kind].some((value) =>
    INTERNAL_PRIVATE_STUDIO_TAGS.has(String(value || "").toLowerCase()),
  );

const normalizeMode = (value, fallback = "private") =>
  String(value || fallback).toLowerCase() === "public" ? "public" : "private";

const isBlockingBooking = (booking, now = new Date()) => {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.paymentStatus || "").toUpperCase();
  const tag = String(booking?.tag || "").toLowerCase();
  const pendingUntil = new Date(booking?.paymentExpiresAt).getTime();
  const hasActivePayment =
    !paymentStatus ||
    paymentStatus === "CONFIRMED" ||
    (paymentStatus === "PENDING_PAYMENT" &&
      Number.isFinite(pendingUntil) &&
      pendingUntil > now.getTime());

  return (
    status !== "cancelled" &&
    status !== "canceled" &&
    hasActivePayment &&
    (CAPACITY_BOOKING_TAGS.has(tag) ||
      isCourseBooking(booking) ||
      isPrivateStudioBooking(booking))
  );
};

const overlaps = (booking, start, end) => {
  const bookingStart = new Date(booking?.start).getTime();
  const bookingEnd = new Date(booking?.end).getTime();
  return (
    [bookingStart, bookingEnd, start, end].every(Number.isFinite) &&
    bookingStart < end &&
    bookingEnd > start
  );
};

const getGuestCount = (booking) =>
  isCourseBooking(booking)
    ? (getCourseCapacityUsage(booking) ?? 0)
    : Math.max(1, Math.floor(Number(booking?.numberOfGuests) || 1));

const getBookingMode = (booking) =>
  normalizeMode(booking?.bookingMode ?? booking?.bookingType);

/**
 * Friendly client preflight using the same Location policy fields as the
 * backend. Checkout remains authoritative and can still return a 409 if the
 * slot changes between selection and payment.
 *
 * Booking mode is intentional: party size never turns a shared Open Studio
 * booking into an exclusive one. Private Studio is a distinct internal block
 * and is always exclusive.
 */
const checkLocationAvailabilityAtTime = ({
  location,
  bookings = [],
  start,
  end,
  guests = 1,
  bookingMode,
  bookingType,
  activity = "UNDEFINED",
  product,
  now = new Date(),
}) => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const locationId = getEntityId(location);
  const config = location?.booking || {};

  if (!locationId || !config.enabled) {
    return { available: false, reason: "LOCATION_NOT_AVAILABLE" };
  }

  const overlapping = bookings.filter(
    (booking) =>
      isBlockingBooking(booking, now) &&
      getBookingLocationId(booking) === locationId &&
      overlaps(booking, startMs, endMs),
  );

  const requestedGuests = Math.max(1, Math.floor(Number(guests) || 1));
  const requestedMode = normalizeMode(bookingMode ?? bookingType);
  const customerChoice = isCustomerChoiceOpenStudio(product);
  if (
    customerChoice &&
    requestedGuests >
      getOpenStudioGuestLimit({
        product,
        location,
        bookingMode: requestedMode,
        activity,
      })
  ) {
    return { available: false, reason: "LOCATION_CAPACITY_EXCEEDED" };
  }
  const hasInternalPrivateStudio = overlapping.some(isPrivateStudioBooking);
  const hasExclusiveOpenStudio = overlapping.some(
    (booking) =>
      !isPrivateStudioBooking(booking) &&
      !isCourseBooking(booking) &&
      getBookingMode(booking) === "private",
  );
  const hasBlockingCourse = overlapping.some(
    (booking) =>
      isCourseBooking(booking) &&
      (config.groupBookingBlocksAll !== false ||
        getCourseCapacityUsage(booking) === null),
  );

  if (
    overlapping.length > 0 &&
    (hasInternalPrivateStudio ||
      hasExclusiveOpenStudio ||
      hasBlockingCourse ||
      requestedMode === "private")
  ) {
    return { available: false, reason: "LOCATION_OVERLAP_NOT_ALLOWED" };
  }

  const openStudioBookings = overlapping.filter(
    (booking) => !isCourseBooking(booking),
  );
  if (openStudioBookings.length > 0) {
    const allowsPublicOverlap =
      config.allowPublicOverlap ?? config.allowPublicSoloOverlap;

    if (allowsPublicOverlap !== true) {
      return { available: false, reason: "LOCATION_OVERLAP_NOT_ALLOWED" };
    }

    const limit = Math.max(
      1,
      Number(
        config.maxConcurrentOpenStudioBookings ??
          config.maxPublicOverlaps ??
          config.maxPublicSoloOverlaps,
      ) || 1,
    );

    if (openStudioBookings.length + 1 > limit) {
      return { available: false, reason: "LOCATION_CAPACITY_EXCEEDED" };
    }
  }

  const totalGuests = overlapping.reduce(
    (total, booking) => total + getGuestCount(booking),
    requestedGuests,
  );
  const globalCapacity = Math.max(1, Number(config.globalCapacity) || 1);

  if (totalGuests > globalCapacity) {
    return { available: false, reason: "LOCATION_CAPACITY_EXCEEDED" };
  }

  const publicLimits = overlapping
    .filter((booking) => !isCourseBooking(booking))
    .map((booking) => Number(booking?.publicCapacityLimit))
    .filter((limit) => Number.isSafeInteger(limit) && limit > 0);
  if (
    customerChoice &&
    requestedMode === "public" &&
    product?.openStudioPolicy?.publicCapacityMode === "fixed"
  ) {
    publicLimits.push(Number(product.openStudioPolicy.publicCapacityLimit));
  }
  if (publicLimits.some((limit) => totalGuests > limit)) {
    return { available: false, reason: "LOCATION_CAPACITY_EXCEEDED" };
  }

  const activityLimit = (config.activityCapacities || []).find(
    (item) => String(item.activity) === String(activity),
  );

  if (activityLimit && !(customerChoice && requestedMode === "private")) {
    const used = overlapping
      .filter(
        (booking) =>
          (!isCourseBooking(booking) ||
            booking.courseEquipmentRequired !== false) &&
          (String(
            booking?.plannedActivity || booking?.activityId || "UNDEFINED",
          ) === String(activity) ||
            (isCourseBooking(booking) &&
              ["", "UNDEFINED"].includes(
                String(
                  booking?.plannedActivity || booking?.activityId || "",
                ).toUpperCase(),
              ))),
      )
      .reduce(
        (total, booking) => total + getGuestCount(booking),
        requestedGuests,
      );

    if (used > Math.max(1, Number(activityLimit.capacity) || 1)) {
      return {
        available: false,
        reason: "LOCATION_ACTIVITY_CAPACITY_EXCEEDED",
      };
    }
  }

  return { available: true, reason: null };
};

/** Check peak simultaneous occupancy, rather than summing adjacent visits. */
export const checkLocationAvailability = (request) => {
  const startMs = new Date(request.start).getTime();
  const endMs = new Date(request.end).getTime();
  const locationId = getEntityId(request.location);
  const now = request.now ?? new Date();
  const overlapping = (request.bookings ?? []).filter(
    (booking) =>
      isBlockingBooking(booking, now) &&
      getBookingLocationId(booking) === locationId &&
      overlaps(booking, startMs, endMs),
  );
  const boundaries = new Set([
    startMs,
    ...overlapping
      .map((booking) => new Date(booking.start).getTime())
      .filter((point) => point > startMs && point < endMs),
  ]);

  for (const point of boundaries) {
    const result = checkLocationAvailabilityAtTime({
      ...request,
      now,
      bookings: overlapping.filter(
        (booking) =>
          new Date(booking.start).getTime() <= point &&
          new Date(booking.end).getTime() > point,
      ),
    });
    if (!result.available) return result;
  }

  return { available: true, reason: null };
};

export const durationInMinutes = (start, end) => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (![startMs, endMs].every(Number.isFinite)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / MINUTE));
};
