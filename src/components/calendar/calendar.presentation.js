import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import { eventTones, getCalendarEventTone } from "./calendar.config";
import { normalizeCalendarCustomerReference } from "./calendar.customerReference";
import { getCalendarActivityName } from "./calendar.resources";

// Booking privacy has a stable color across products, dates and ownership.
// The light public / dark private treatment also differs in luminance, while
// explicit labels communicate the same meaning without relying on color.
export const CALENDAR_BOOKING_COLORS = Object.freeze({
  public: Object.freeze({
    accent: "#4F8177",
    background: "#DDEEE9",
    border: "#4F8177",
    text: "#254F48",
  }),
  private: Object.freeze({
    accent: "#DCCFDC",
    background: "#674A64",
    border: "#543B52",
    text: "#FFFFFF",
  }),
});

const CLOSURE_COLOR = {
  accent: "#737373",
  background: "#F0F0EE",
  border: "#CACAC5",
  text: "#202838",
};

const asText = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

export function getCalendarAvailabilityLabel(
  availability,
  t,
  studio,
  { includeActivity = true } = {},
) {
  if (!availability) return "";
  if (availability.state === "closed") return t("events.closed");
  if (["past", "blocked"].includes(availability.state)) {
    return t("events.unavailable");
  }
  if (availability.isBookable && availability.remaining == null) {
    return t("toolbar.newBooking");
  }

  const remaining = Math.max(0, Number(availability.remaining) || 0);
  const placesLabel = t("events.availability", { remaining });
  if (!includeActivity) return placesLabel;
  const activityId = asText(availability.activityId).toUpperCase();
  if (!activityId) return placesLabel;

  const activity = getCalendarActivityName(studio, activityId, t);
  if (!activity) return placesLabel;

  const label = t("availability.activityPlaces", { activity, remaining });
  return label === "availability.activityPlaces"
    ? `${activity}: ${placesLabel}`
    : label;
}

export const getCalendarProductKey = (event = {}) =>
  asText(event.productId) || asText(event.productName) || asText(event.kind);

export function getCalendarBookingMode(event = {}) {
  const mode = String(event.bookingMode || "").toLowerCase();
  if (mode)
    return ["private", "exclusive"].includes(mode) ? "private" : "public";
  return ["private", "privatestudio", "exclusiveopenstudio"].includes(
    String(event.kind || "").toLowerCase(),
  )
    ? "private"
    : "public";
}

export function getCalendarEventColor(event = {}) {
  if (event.isClosure) return CLOSURE_COLOR;
  if (!event.isSuggested) {
    return CALENDAR_BOOKING_COLORS[getCalendarBookingMode(event)];
  }

  const productKey = asText(event.productId) || asText(event.productName);
  if (!productKey) {
    const tone = getCalendarEventTone(event.kind);
    // Suggested sessions without product metadata retain their category color.
    return {
      legacyTone: eventTones[tone === "neutral" ? "coral" : tone],
    };
  }

  let hash = 2166136261;
  for (const character of productKey) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  const hue = hash % 360;
  return {
    accent: `hsl(${hue} 68% 36%)`,
    background: `hsl(${hue} 72% 89%)`,
    border: `hsl(${hue} 52% 65%)`,
    text: "#202838",
  };
}

export function getCalendarEventSurfaceStyle(event = {}) {
  const color = getCalendarEventColor(event);
  return color.legacyTone
    ? undefined
    : {
        backgroundColor: color.background,
        borderColor: color.border,
        color: color.text,
      };
}

export function getBookingAttendanceCount(event = {}) {
  const value =
    event.guests ??
    event.participantCount ??
    event.numberOfGuests ??
    event.quantity ??
    event.used;
  if (
    !["string", "number"].includes(typeof value) ||
    String(value).trim() === ""
  ) {
    return null;
  }
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) return null;
  const isClass = [event.kind, event.tag].some((kind) =>
    ["class", "course"].includes(String(kind || "").toLowerCase()),
  );
  // Zero enrolment is meaningful for a class; private blocks and ordinary
  // sessions use zero when no attendee count was supplied.
  return count > 0 || isClass ? count : null;
}

export function getCalendarBookingPresentation(event = {}, options = {}) {
  const { t, fullLabel } = options;
  const translate = (key, values, fallback) =>
    typeof t === "function" ? t(key, values) : fallback;
  const isBooking = !event.isSuggested && !event.isClosure;
  const isPrivate = getCalendarBookingMode(event) === "private";
  const modeLabel = isBooking
    ? translate(
        isPrivate ? "events.bookingPrivate" : "events.bookingPublic",
        undefined,
        isPrivate ? "Private" : "Public",
      )
    : "";
  const title =
    (event.isClosure && asText(event.title)) ||
    asText(event.productName) ||
    asText(event.title) ||
    translate("events.booking", undefined, "Booking");
  const capacity = Math.max(0, Number(event.capacity) || 0);
  const count = getBookingAttendanceCount(event);
  const full =
    isBooking &&
    !isPrivate &&
    capacity > 0 &&
    Number(event.used ?? count ?? 0) >= capacity;
  const peopleLabel =
    isBooking && count !== null
      ? translate(
          "events.people",
          { count },
          `${count} ${count === 1 ? "person" : "people"}`,
        )
      : "";
  const attendanceLabel = peopleLabel;
  const customerIds = [
    ...new Set(
      (Array.isArray(event.customerIds)
        ? event.customerIds
        : [event.customerMemberNumber ?? event.memberNumber ?? event.customerId]
      )
        .map(normalizeCalendarCustomerReference)
        .filter(Boolean),
    ),
  ];
  const customerReference = isBooking
    ? customerIds.map((id) => `#${id}`).join(", ")
    : "";
  const customerLabel = !customerReference
    ? ""
    : customerIds.length > 1
      ? translate(
          "events.customerIds",
          { ids: customerReference },
          `Customers ${customerReference}`,
        )
      : customerIds.length === 1
        ? translate(
            "events.customerId",
            { id: customerIds[0] },
            `Customer #${customerIds[0]}`,
          )
        : "";

  return {
    title,
    isBooking,
    isPrivate,
    modeLabel,
    full,
    fullLabel: fullLabel || translate("events.full", undefined, "Full"),
    peopleLabel,
    attendanceLabel,
    customerReference,
    customerLabel,
    myBookingLabel: translate("events.myBooking", undefined, "My booking"),
  };
}

// Workspace/public availability calendars retain their neutral reading surface.
export const CALENDAR_CANVAS_STYLE = Object.freeze({
  "--tenant-background": "#F1F5F9",
  "--tenant-surface": "#FFFFFF",
  "--tenant-text": "#1E293B",
  "--tenant-text-on-surface": "#1E293B",
  "--tenant-muted-text": "#475569",
  "--tenant-muted-on-surface": "#475569",
  "--tenant-text-muted": "#475569",
  "--tenant-border": "#CBD5E1",
  "--tenant-label-color": "#1E293B",
  "--tenant-heading-color": "#1E293B",
  "--tenant-accent-link": `var(--tenant-accent-on-light, ${SKAB_BRAND_COLORS.primary})`,
  "--tenant-accent-on-surface": `var(--tenant-accent-on-light, ${SKAB_BRAND_COLORS.primary})`,
  "--tenant-secondary-on-surface": "var(--tenant-secondary-on-light, #9A3412)",
  "--tenant-interactive-hover": `var(--tenant-accent-on-light, ${SKAB_BRAND_COLORS.primary})`,
  "--tenant-interactive-hover-on-surface": `var(--tenant-accent-on-light, ${SKAB_BRAND_COLORS.primary})`,
  "--tenant-calendar-available-surface": "#F2FAF5",
  "--tenant-calendar-available-text": "#1E293B",
  "--tenant-calendar-available-accent": `var(--tenant-accent-on-light, ${SKAB_BRAND_COLORS.primary})`,
  "--calendar-day-future-surface": "#FFFFFF",
  "--calendar-day-today-surface": "#EFF6FF",
  "--calendar-day-past-surface": "#EEF2F6",
  "--calendar-slot-limited-surface": "#FFF7E5",
  "--calendar-slot-full-surface": "#E7EDF4",
  "--calendar-slot-blocked-surface": "#E2E8F0",
  "--calendar-slot-closed-surface": "#E2E8F0",
  "--calendar-slot-past-surface": "#EEF2F6",
  "--color-canvas": "#F8FAFC",
  "--color-surface": "#FFFFFF",
  "--color-surface-muted": "#F1F5F9",
  "--color-line": "#CBD5E1",
  backgroundColor: "#F8FAFC",
  color: "#1E293B",
});

// The signed-in portal must honor its own palette all the way into the grid,
// not only in the surrounding toolbar. Status shades remain distinguishable
// on light and dark calendars without introducing a fixed white canvas.
export const CUSTOMER_CALENDAR_CANVAS_STYLE = Object.freeze({
  "--tenant-background": "var(--tenant-portal-calendar-background)",
  "--tenant-surface": "var(--tenant-portal-calendar-surface)",
  "--tenant-text": "var(--tenant-portal-calendar-text)",
  "--tenant-text-on-surface": "var(--tenant-portal-calendar-text-on-surface)",
  "--tenant-muted-text": "var(--tenant-portal-calendar-muted)",
  "--tenant-muted-on-surface": "var(--tenant-portal-calendar-muted)",
  "--tenant-text-muted": "var(--tenant-portal-calendar-muted)",
  "--tenant-border": "var(--tenant-portal-calendar-border)",
  "--tenant-label-color": "var(--tenant-portal-calendar-label)",
  "--tenant-heading-color": "var(--tenant-portal-calendar-heading)",
  "--tenant-accent-link": "var(--tenant-portal-calendar-accent)",
  "--tenant-accent-on-surface": "var(--tenant-portal-calendar-accent)",
  "--tenant-secondary-on-surface":
    "var(--tenant-portal-calendar-secondary-on-surface)",
  "--tenant-interactive-hover": "var(--tenant-portal-calendar-accent)",
  "--tenant-interactive-hover-on-surface":
    "var(--tenant-portal-calendar-accent)",
  "--tenant-calendar-available-surface":
    "var(--tenant-portal-calendar-available-surface)",
  "--tenant-calendar-available-text":
    "var(--tenant-portal-calendar-available-text)",
  "--tenant-calendar-available-accent":
    "var(--tenant-portal-calendar-available-accent)",
  "--calendar-day-future-surface": "var(--tenant-portal-calendar-background)",
  "--calendar-day-today-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-accent) 8%, var(--tenant-portal-calendar-background))",
  "--calendar-day-past-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-text) 6%, var(--tenant-portal-calendar-background))",
  "--calendar-slot-limited-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-accent) 9%, var(--tenant-portal-calendar-background))",
  "--calendar-slot-full-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-text) 8%, var(--tenant-portal-calendar-background))",
  "--calendar-slot-blocked-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-text) 12%, var(--tenant-portal-calendar-background))",
  "--calendar-slot-closed-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-text) 4%, var(--tenant-portal-calendar-background))",
  "--calendar-slot-past-surface":
    "color-mix(in srgb, var(--tenant-portal-calendar-text) 7%, var(--tenant-portal-calendar-background))",
  "--color-canvas": "var(--tenant-portal-calendar-background)",
  "--color-surface": "var(--tenant-portal-calendar-surface)",
  "--color-surface-muted": "var(--tenant-portal-calendar-surface)",
  "--color-line": "var(--tenant-portal-calendar-border)",
  backgroundColor: "var(--tenant-portal-calendar-background)",
  color: "var(--tenant-portal-calendar-text)",
});
