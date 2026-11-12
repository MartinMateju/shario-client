import { getCalendarEventTone } from "./calendar.config";
import { normalizeCalendarCustomerReference } from "./calendar.customerReference";
import { DEFAULT_CALENDAR_ACTIVITY_NAMES } from "./calendar.resources";
import { getCourseCapacityUsage } from "@/utils/locationBookingUtils";
import { activeBookingParticipants } from "@/utils/bookingAttendance";
import { getOpeningWindowsForWeekday } from "@/utils/openingHours";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const CANONICAL_EVENT_KINDS = new Set([
  "class",
  "sharedOpenStudio",
  "exclusiveOpenStudio",
  "privateStudio",
]);

export const getEntityId = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const id = value._id || value.id || value.locationId;

  return id ? String(id) : "";
};

export const getBookingLocationId = (booking) => {
  return getEntityId(booking?.locationId || booking?.location);
};

const getOpeningHourBounds = (location) => {
  const windows = WEEKDAYS.flatMap((day) =>
    getOpeningWindowsForWeekday(location?.openingHours, day),
  );

  return {
    openMinutes: windows.map(({ openMinutes }) => openMinutes),
    closeMinutes: windows.map(({ closeMinutes }) => closeMinutes),
  };
};

const getActualCalendarHours = (location) => {
  const { openMinutes, closeMinutes } = getOpeningHourBounds(location);

  if (openMinutes.length) {
    return {
      start: Math.max(0, Math.floor(Math.min(...openMinutes) / 60)),
      end: Math.min(24, Math.ceil(Math.max(...closeMinutes) / 60)),
    };
  }

  return (
    location?.actualCalendarHours ||
    location?.calendarHours || { start: 8, end: 20 }
  );
};

const getCalendarHours = (location) => getActualCalendarHours(location);

export const formatLocationAddress = (location) => {
  if (typeof location?.address === "string") {
    return location.address.trim();
  }

  const address = location?.address || {};
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const city = [address.postalCode, address.city].filter(Boolean).join(" ");

  return [street, city, address.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

const getActivityLabel = (activity) => {
  const normalized = String(activity || "")
    .trim()
    .toUpperCase();

  if (DEFAULT_CALENDAR_ACTIVITY_NAMES[normalized]) {
    return DEFAULT_CALENDAR_ACTIVITY_NAMES[normalized];
  }

  return normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
};

export const normalizeLocationToCalendarStudio = (location) => {
  if (!location) return null;

  const id = getEntityId(location);

  if (!id) return null;

  const booking = location.booking || {};
  const configuredResources = Array.isArray(booking.activityCapacities)
    ? booking.activityCapacities
        .filter((item) => item?.activity && Number(item?.capacity) > 0)
        .map((item) => ({
          id: String(item.activity),
          name: getActivityLabel(item.activity),
          capacity: Number(item.capacity),
        }))
    : [];

  const resources = (
    Array.isArray(location.resources) && location.resources.length
      ? location.resources
      : configuredResources
  )
    .map((resource) => ({
      ...resource,
      id: getEntityId(resource?.id || resource?.activity || resource),
      name:
        resource?.name || getActivityLabel(resource?.activity || resource?.id),
      capacity: Number(resource?.capacity || 0),
    }))
    .filter(({ id }) => id);

  const allowsParallelBookings =
    (booking.allowPublicOverlap ?? booking.allowPublicSoloOverlap) === true;
  const concurrentBookingLimit =
    booking.maxConcurrentOpenStudioBookings ??
    booking.maxPublicOverlaps ??
    booking.maxPublicSoloOverlaps;

  return {
    ...location,
    id,
    locationId: id,
    name: location.name || "Studio location",
    addressLabel: formatLocationAddress(location),
    timeZone: booking.timezone || location.timeZone || "UTC",
    availabilityMode:
      location.availabilityMode ||
      (resources.length > 0 ? "capacity" : "lanes"),
    bookingEnabled: (location.bookingEnabled ?? booking.enabled) !== false,
    globalCapacity: Math.max(
      0,
      Number(location.globalCapacity ?? booking.globalCapacity ?? 0),
    ),
    allowPublicSoloOverlap: allowsParallelBookings,
    publicLaneCount: Math.max(
      1,
      Number(
        (allowsParallelBookings
          ? (concurrentBookingLimit ?? location.publicLaneCount)
          : 1) || 1,
      ),
    ),
    privateSessionBlocksAll: booking.privateSessionBlocksAll !== false,
    groupBookingBlocksAll: booking.groupBookingBlocksAll,
    calendarHours: getCalendarHours(location),
    actualCalendarHours: getActualCalendarHours(location),
    slotStepMinutes: Number(booking.slotStepMinutes || 30),
    minBookingMinutes: Number(booking.minBookingMinutes || 60),
    maxBookingMinutes: Number(booking.maxBookingMinutes || 360),
    resources,
  };
};

export const normalizeLocationsForCalendar = (locations) => {
  const ids = new Set();

  return (Array.isArray(locations) ? locations : [])
    .map(normalizeLocationToCalendarStudio)
    .filter((location) => {
      if (!location || ids.has(location.id)) return false;

      ids.add(location.id);
      return true;
    });
};

const getProduct = (booking, productsById) => {
  if (booking?.bookingProduct && typeof booking.bookingProduct === "object") {
    return booking.bookingProduct;
  }
  if (booking?.product && typeof booking.product === "object") {
    return booking.product;
  }

  const productId = getEntityId(
    booking?.bookingProduct || booking?.productId || booking?.product,
  );

  if (!productId || !productsById) return null;

  if (productsById instanceof Map) return productsById.get(productId) || null;

  return productsById[productId] || null;
};

const getDisplayName = (value, locale = "en") => {
  if (!value) return "";
  if (typeof value === "string") return value;

  const language = String(locale).toLowerCase().split("-")[0];
  const preferred =
    language === "cs" || language === "cz"
      ? value.cs || value.CZ || value.cz
      : value[language] || value[language.toUpperCase()];

  return preferred || value.en || value.EN || value.cs || value.CZ || "";
};

const getEventKind = (booking) => {
  const existingKind = String(booking?.kind || "");
  if (CANONICAL_EVENT_KINDS.has(existingKind)) return existingKind;
  if (existingKind === "course") return "class";
  if (["private", "block", "blocker"].includes(existingKind)) {
    return "privateStudio";
  }

  const tag = String(booking?.tag || "").toLowerCase();
  const defaultMode = [
    "open-studio",
    "workshop",
    "public-workshop",
    "private-workshop",
  ].includes(tag)
    ? "private"
    : "public";
  const bookingMode = String(
    booking?.bookingMode ?? booking?.bookingType ?? defaultMode,
  ).toLowerCase();

  if (tag === "class" || tag === "course") return "class";
  if (["private-studio", "private-session", "blocker", "block"].includes(tag)) {
    return "privateStudio";
  }

  return bookingMode === "public" ? "sharedOpenStudio" : "exclusiveOpenStudio";
};

const getCustomerReference = (customer) => {
  return (
    normalizeCalendarCustomerReference(customer?.memberNumber) ||
    normalizeCalendarCustomerReference(customer?.customId)
  );
};

const getCustomerIds = (booking, kind) => {
  const references = Array.isArray(booking.customerIds)
    ? booking.customerIds.map(normalizeCalendarCustomerReference)
    : kind === "class" || kind === "privateStudio" || booking.attendanceManaged
      ? activeBookingParticipants(booking).map(getCustomerReference)
      : [
          getCustomerReference(booking.author) ||
            getCustomerReference(booking.createdBy) ||
            normalizeCalendarCustomerReference(booking.customerId),
          ...activeBookingParticipants(booking).map(getCustomerReference),
        ];

  return [...new Set(references.filter(Boolean))];
};

const nonNegativeCount = (value, fallback) => {
  const count = Number(value);
  return value !== null && value !== undefined && Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : fallback;
};

export const normalizeBookingToCalendarEvent = (
  booking,
  { productsById, currentUserId, currentUserMemberNumber, locale } = {},
) => {
  if (!booking) return null;

  const id = getEntityId(booking);
  const locationId = getBookingLocationId(booking);

  if (!id || !locationId) return null;

  const product = getProduct(booking, productsById);
  const kind = getEventKind(booking);
  const createdById = getEntityId(booking.createdBy);
  const isMine =
    booking.isMine === true ||
    Boolean(currentUserId && createdById === String(currentUserId));
  const activity = String(
    booking.activityId || booking.plannedActivity || "",
  ).toUpperCase();
  const activityId = activity && activity !== "UNDEFINED" ? activity : null;
  const productId = getEntityId(
    product || booking.bookingProduct || booking.productId || booking.product,
  );
  const productName = getDisplayName(
    product?.name ||
      product?.title ||
      booking.productName ||
      booking.publicTitle,
    locale,
  );
  const isClosure =
    booking.isClosure === true ||
    [booking.tag, booking.kind].some((value) =>
      ["block", "blocker"].includes(String(value || "").toLowerCase()),
    ) ||
    (booking.isClosure !== false &&
      kind === "privateStudio" &&
      !productId &&
      !productName);
  const bookingMode =
    kind === "exclusiveOpenStudio" ||
    kind === "privateStudio" ||
    String(booking.bookingMode || booking.bookingType || "").toLowerCase() ===
      "private"
      ? "private"
      : "public";
  const guests = nonNegativeCount(
    booking.participantCount ??
      booking.guests ??
      booking.numberOfGuests ??
      (kind === "class" && Array.isArray(booking.participants)
        ? activeBookingParticipants(booking).length
        : undefined),
    1,
  );
  const fallbackTitle =
    kind === "class"
      ? "Class"
      : kind === "privateStudio"
        ? "Private Studio"
        : kind === "exclusiveOpenStudio"
          ? "Exclusive Open Studio"
          : "Shared Open Studio";
  const customerIds = isClosure ? [] : getCustomerIds(booking, kind);
  const ownMemberReference = normalizeCalendarCustomerReference(
    currentUserMemberNumber,
  );
  // A verified own session can use the signed-in customer's member number.
  // Classes may contain several attendees, so keep their public attendee list.
  if (
    !isClosure &&
    kind !== "class" &&
    isMine &&
    customerIds.length === 0 &&
    ownMemberReference
  ) {
    customerIds.push(ownMemberReference);
  }

  return {
    ...booking,
    id,
    locationId,
    productId,
    productName,
    title: isClosure
      ? booking.title || productName || fallbackTitle
      : productName || booking.title || fallbackTitle,
    publicTitle: productName || undefined,
    kind,
    bookingMode,
    isClosure,
    customerIds,
    tone: booking.tone || getCalendarEventTone(kind),
    activityId,
    guests,
    capacityUsed:
      kind === "class"
        ? getCourseCapacityUsage({
            ...booking,
            bookingProduct: product || booking.bookingProduct,
          })
        : Math.max(
            1,
            nonNegativeCount(
              booking.capacityUsed ?? booking.numberOfGuests,
              guests,
            ),
          ),
    ...(kind === "class"
      ? {
          capacity: nonNegativeCount(
            booking.capacity ??
              booking.maxNumberOfParticipants ??
              product?.maxNumberOfParticipants,
            0,
          ),
        }
      : {}),
    customerName: booking.customerName || booking.author?.name || "",
    teamMemberName: booking.teamMemberName || booking.lecturer || "",
    isMine,
  };
};

export const normalizeBookingsForCalendar = (bookings, options) => {
  return (Array.isArray(bookings) ? bookings : [])
    .map((booking) => normalizeBookingToCalendarEvent(booking, options))
    .filter(Boolean);
};
