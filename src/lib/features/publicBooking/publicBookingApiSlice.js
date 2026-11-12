import { apiSlice } from "@/lib/features/api/apiSlice";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

const publicBookingBase = (tenantSlug) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/booking`;

const publicProductsBase = (tenantSlug) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/products`;

const WEEKDAYS = Object.freeze([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
const CLOCK_PATTERN = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;

const normalizeIdentifier = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const getId = (value) => normalizeIdentifier(value?.id ?? value?._id ?? "");

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeActivitySelectionMode = (value) => {
  const mode = normalizeText(value).toUpperCase();

  return ["REQUIRED", "OPTIONAL", "HIDDEN"].includes(mode) ? mode : "OPTIONAL";
};

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizePositiveInteger = (value, fallback, minimum = 1) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.floor(value))
    : fallback;

const normalizeTimeZone = (value) => {
  const candidate = normalizeText(value);

  if (!candidate) return "";

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "";
  }
};

const normalizeOpeningHours = (value) => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    WEEKDAYS.flatMap((weekday) => {
      const source = value[weekday];

      if (!isRecord(source)) {
        return [];
      }

      const day = {};
      if (typeof source.isOpen === "boolean") day.isOpen = source.isOpen;
      if (CLOCK_PATTERN.test(source.openTime)) day.openTime = source.openTime;
      if (CLOCK_PATTERN.test(source.closeTime)) {
        day.closeTime = source.closeTime;
      }

      return [[weekday, day]];
    }),
  );
};

const normalizeLocation = (value) => {
  if (!isRecord(value)) return null;

  const id = getId(value);
  if (!id) return null;

  const address = isRecord(value.address) ? value.address : {};
  const booking = isRecord(value.booking) ? value.booking : {};
  const activityCapacities = Array.isArray(booking.activityCapacities)
    ? booking.activityCapacities
        .map((entry) => ({
          activity: normalizeText(entry?.activity),
          capacity:
            typeof entry?.capacity === "number" &&
            Number.isFinite(entry.capacity)
              ? Math.max(1, Math.floor(entry.capacity))
              : null,
        }))
        .filter((entry) => entry.activity && entry.capacity !== null)
    : [];

  return {
    id,
    _id: id,
    name: normalizeText(value.name),
    slug: normalizeText(value.slug),
    isPrimary: value.isPrimary === true,
    isActive: value.isActive !== false,
    address: {
      line1: normalizeText(address.line1),
      line2: normalizeText(address.line2),
      city: normalizeText(address.city),
      postalCode: normalizeText(address.postalCode),
      country: normalizeText(address.country),
    },
    booking: {
      enabled: booking.enabled === true,
      globalCapacity: normalizePositiveInteger(booking.globalCapacity, 1),
      timezone: normalizeTimeZone(booking.timezone ?? booking.timeZone),
      slotStepMinutes: normalizePositiveInteger(
        booking.slotStepMinutes,
        30,
        15,
      ),
      minBookingMinutes: normalizePositiveInteger(
        booking.minBookingMinutes,
        60,
        15,
      ),
      maxBookingMinutes: normalizePositiveInteger(
        booking.maxBookingMinutes,
        360,
        15,
      ),
      allowPublicOverlap:
        booking.allowPublicOverlap === true ||
        booking.allowPublicSoloOverlap === true,
      allowPublicSoloOverlap:
        booking.allowPublicSoloOverlap === true ||
        booking.allowPublicOverlap === true,
      maxConcurrentOpenStudioBookings:
        normalizePositiveInteger(booking.maxConcurrentOpenStudioBookings, 0) ||
        normalizePositiveInteger(booking.maxPublicOverlaps, 0) ||
        normalizePositiveInteger(booking.maxPublicSoloOverlaps, 0) ||
        1,
      maxPublicOverlaps:
        normalizePositiveInteger(booking.maxPublicOverlaps, 0) ||
        normalizePositiveInteger(booking.maxConcurrentOpenStudioBookings, 0) ||
        normalizePositiveInteger(booking.maxPublicSoloOverlaps, 0) ||
        1,
      maxPublicSoloOverlaps:
        normalizePositiveInteger(booking.maxPublicSoloOverlaps, 0) ||
        normalizePositiveInteger(booking.maxConcurrentOpenStudioBookings, 0) ||
        normalizePositiveInteger(booking.maxPublicOverlaps, 0) ||
        1,
      activitySelectionMode: normalizeActivitySelectionMode(
        booking.activitySelectionMode,
      ),
      activityCapacities,
    },
    openingHours: normalizeOpeningHours(value.openingHours),
    publicInstructions: normalizeText(value.publicInstructions),
    timeZone: normalizeTimeZone(value.timeZone ?? value.timezone),
  };
};

export const normalizePublicLocations = (response) => {
  const source = Array.isArray(response)
    ? response
    : Array.isArray(response?.locations)
      ? response.locations
      : Array.isArray(response?.data?.locations)
        ? response.data.locations
        : [];

  return source.map(normalizeLocation).filter(Boolean);
};

const normalizeSlot = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const start = String(value.start ?? "").trim();
  const end = String(value.end ?? "").trim();
  if (!start || !end) return null;

  const remainingCapacity = Number(value.remainingCapacity);

  return {
    ...value,
    start,
    end,
    available: value.available !== false,
    remainingCapacity: Number.isFinite(remainingCapacity)
      ? Math.max(0, Math.floor(remainingCapacity))
      : null,
  };
};

export const normalizePublicAvailability = (response) => {
  const payload = response?.data ?? response ?? {};

  return {
    location: normalizeLocation(payload.location),
    product: payload.product ?? null,
    date: String(payload.date ?? "").trim(),
    timeZone: normalizeTimeZone(payload.timeZone ?? payload.timezone),
    slots: (Array.isArray(payload.slots) ? payload.slots : [])
      .map(normalizeSlot)
      .filter(Boolean),
  };
};

const normalizeOccupancyBlock = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const start = String(value.start ?? "").trim();
  const end = String(value.end ?? "").trim();

  if (!start || !end) return null;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  if (endTime <= startTime) return null;

  return { start, end, kind: "occupied" };
};

/**
 * Deliberately strict public DTO. Unknown server fields are discarded so an
 * accidental backend expansion cannot reach calendar state or the browser UI.
 */
export const normalizePublicOccupancy = (response) => {
  const payload = response?.data ?? response ?? {};

  return {
    location: normalizeLocation(payload.location),
    from: String(payload.from ?? "").trim(),
    to: String(payload.to ?? "").trim(),
    timeZone: normalizeTimeZone(payload.timeZone ?? payload.timezone),
    blocks: (Array.isArray(payload.blocks) ? payload.blocks : [])
      .map(normalizeOccupancyBlock)
      .filter(Boolean),
  };
};

const normalizeCourseSession = (value) => {
  const slot = normalizeSlot(value);
  if (!slot) return null;

  const id = getId(value);
  if (!id) return null;

  const waitlistSource = isRecord(value.waitlist) ? value.waitlist : {};
  const waitlistReason = [
    "available",
    "disabled",
    "join_closed",
    "session_started",
  ].includes(normalizeText(waitlistSource.reason).toLowerCase())
    ? normalizeText(waitlistSource.reason).toLowerCase()
    : null;
  const joinDeadline = normalizeText(waitlistSource.joinDeadline);
  const lecturerSource = isRecord(value.lecturer) ? value.lecturer : {};

  // Course sessions are a public boundary. Explicitly allowlist every field so
  // an accidental server expansion (for example attendee names or emails)
  // cannot reach the browser.
  return {
    id,
    _id: id,
    start: slot.start,
    end: slot.end,
    available: slot.available,
    remainingCapacity: slot.remainingCapacity,
    language: String(value.language ?? "")
      .trim()
      .toLowerCase(),
    lecturer:
      normalizeText(lecturerSource.name ?? lecturerSource.displayName) ||
      normalizeText(value.lecturer)
        ? {
            name:
              normalizeText(
                lecturerSource.name ?? lecturerSource.displayName,
              ) || normalizeText(value.lecturer),
          }
        : null,
    location:
      typeof value.location === "string" || typeof value.location === "number"
        ? normalizeLocation({ id: value.location })
        : normalizeLocation(value.location),
    capacity: Number.isFinite(Number(value.capacity))
      ? Math.max(0, Math.floor(Number(value.capacity)))
      : null,
    waitlist: {
      enabled: waitlistSource.enabled === true,
      accepting: waitlistSource.accepting === true,
      joinDeadline:
        joinDeadline && Number.isFinite(new Date(joinDeadline).getTime())
          ? joinDeadline
          : null,
      reason: waitlistReason,
    },
  };
};

export const normalizePublicCourseSessions = (response) => {
  const source = Array.isArray(response)
    ? response
    : Array.isArray(response?.sessions)
      ? response.sessions
      : Array.isArray(response?.data?.sessions)
        ? response.data.sessions
        : [];

  return source.map(normalizeCourseSession).filter(Boolean);
};

export const publicBookingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicBookingLocations: builder.query({
      query: ({ tenantSlug }) => ({
        url: `${publicBookingBase(tenantSlug)}/locations`,
        credentials: "omit",
      }),
      transformResponse: normalizePublicLocations,
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "PublicBooking", id: `LOCATIONS:${tenantSlug}` },
      ],
    }),
    getPublicCourseLocations: builder.query({
      query: ({ tenantSlug }) => ({
        url: `${publicProductsBase(tenantSlug)}/courses/locations`,
        credentials: "omit",
      }),
      transformResponse: normalizePublicLocations,
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "PublicBooking", id: `COURSE_LOCATIONS:${tenantSlug}` },
      ],
    }),

    getPublicBookingOccupancyLocations: builder.query({
      query: ({ tenantSlug }) => ({
        url: `${publicBookingBase(tenantSlug)}/occupancy-locations`,
        credentials: "omit",
      }),
      transformResponse: normalizePublicLocations,
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "PublicBooking", id: `OCCUPANCY_LOCATIONS:${tenantSlug}` },
      ],
    }),

    getPublicBookingAvailability: builder.query({
      query: ({
        tenantSlug,
        locationId,
        productId,
        date,
        plannedActivity,
        bookingMode,
        numberOfGuests,
      }) => ({
        url: `${publicBookingBase(tenantSlug)}/availability`,
        params: {
          locationId,
          productId,
          date,
          ...(bookingMode ? { bookingMode } : {}),
          ...(numberOfGuests ? { numberOfGuests } : {}),
          ...(plannedActivity && plannedActivity !== "UNDEFINED"
            ? { plannedActivity }
            : {}),
        },
        credentials: "omit",
      }),
      transformResponse: normalizePublicAvailability,
      providesTags: (
        _result,
        _error,
        {
          tenantSlug,
          locationId,
          productId,
          date,
          plannedActivity,
          bookingMode,
          numberOfGuests,
        },
      ) => [
        {
          type: "PublicBooking",
          id: `AVAILABILITY:${tenantSlug}:${locationId}:${productId}:${date}:${plannedActivity || "UNDEFINED"}:${bookingMode || "public"}:${numberOfGuests || 1}`,
        },
      ],
    }),

    getPublicBookingOccupancy: builder.query({
      query: ({ tenantSlug, locationId, from, to }) => ({
        url: `${publicBookingBase(tenantSlug)}/occupancy`,
        params: { locationId, from, to },
        credentials: "omit",
      }),
      transformResponse: normalizePublicOccupancy,
      providesTags: (_result, _error, { tenantSlug, locationId, from, to }) => [
        {
          type: "PublicBooking",
          id: `OCCUPANCY:${tenantSlug}:${locationId}:${from}:${to}`,
        },
      ],
    }),

    getCustomerCourseSessions: builder.query({
      query: ({ productId, locationId }) => ({
        url: `/products/customer-catalog/${encodeURIComponent(
          String(productId || "").trim(),
        )}/sessions`,
        params: { locationId, limit: 100 },
      }),
      transformResponse: normalizePublicCourseSessions,
      providesTags: (result, _error, { productId, locationId }) => [
        {
          type: "PublicBooking",
          id: `CUSTOMER_COURSE_SESSIONS:${locationId}:${productId}`,
        },
        { type: "PublicBooking", id: "CUSTOMER_COURSES" },
        ...(result ?? []).map((session) => ({
          type: "PublicBooking",
          id: `COURSE_SESSION:${session.id}`,
        })),
      ],
    }),

    getPublicCourseSessions: builder.query({
      query: ({ tenantSlug, productId, locationId }) => ({
        url: `${publicProductsBase(tenantSlug)}/${encodeURIComponent(
          String(productId || "").trim(),
        )}/sessions`,
        credentials: "omit",
        ...(locationId ? { params: { locationId } } : {}),
      }),
      transformResponse: normalizePublicCourseSessions,
      providesTags: (result, _error, { tenantSlug, productId, locationId }) => [
        {
          type: "PublicBooking",
          id: `COURSE_SESSIONS:${tenantSlug}:${productId}${locationId ? `:${locationId}` : ""}`,
        },
        ...(result ?? []).map((session) => ({
          type: "PublicBooking",
          id: `COURSE_SESSION:${session.id}`,
        })),
      ],
    }),
  }),
});

export const {
  useGetPublicBookingLocationsQuery,
  useGetPublicCourseLocationsQuery,
  useGetPublicBookingOccupancyLocationsQuery,
  useGetPublicBookingAvailabilityQuery,
  useGetPublicBookingOccupancyQuery,
  useGetPublicCourseSessionsQuery,
  useGetCustomerCourseSessionsQuery,
} = publicBookingApiSlice;
