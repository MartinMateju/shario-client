import { getEntityId } from "./calendar.adapters";
import { isGlobalBlockingKind } from "./calendar.config";
import {
  openingWindowAtMinute,
  openingWindowFirstStart,
} from "@/utils/openingHours";
import {
  asDate,
  bookingIsVisible,
  dateKey,
  getCalendarSlotAvailability,
  getStudioOpeningWindow,
  makeSlotDate,
  wallTimeMinutes,
} from "./calendar.utils";

const unavailable = (state = "closed") => ({ selection: null, state });

const getMinimumDuration = (studio) => {
  const step = Math.max(15, Number(studio?.slotStepMinutes) || 30);
  return (
    Math.ceil(Math.max(step, Number(studio?.minBookingMinutes) || 60) / step) *
    step
  );
};

const getCourseRemaining = (event) => {
  const capacity = Number(event.capacity ?? event.maxNumberOfParticipants);
  const attendees = Number(
    event.participantCount ?? event.guests ?? event.numberOfGuests,
  );
  return event.remainingCapacity !== undefined &&
    event.remainingCapacity !== null
    ? Number(event.remainingCapacity)
    : Number.isFinite(capacity) && Number.isFinite(attendees)
      ? capacity - attendees
      : null;
};

/** Turn a calendar occupancy card into a new, independently checked booking. */
export function getCustomerCalendarBookingSelection({
  event,
  studio,
  bookings = [],
  now = new Date(),
  selectedActivityId = "",
} = {}) {
  const studioId = getEntityId(studio);
  const locationId = getEntityId(event?.locationId || event?.location);
  const start = event?.start ? asDate(event.start) : null;
  const end = event?.end ? asDate(event.end) : null;
  const currentTime = asDate(now);
  if (
    !studioId ||
    locationId !== studioId ||
    !start ||
    !end ||
    end <= start ||
    !currentTime ||
    studio.bookingEnabled === false ||
    studio.booking?.enabled === false ||
    !bookingIsVisible(event) ||
    event.archive === true
  ) {
    return unavailable();
  }
  if (start <= currentTime) return unavailable("past");
  if (event.isClosure || isGlobalBlockingKind(event.kind)) {
    return unavailable("blocked");
  }

  const productId = getEntityId(
    event.productId || event.bookingProduct || event.product,
  );
  const activityId = event.activityId || selectedActivityId || "";

  if (["class", "course"].includes(event.kind)) {
    const courseSessionId = getEntityId(
      event.courseSessionId || event.id || event._id,
    );
    // Aggregated occupancy keys must never be sent as real session IDs.
    if (!productId || !courseSessionId || courseSessionId.startsWith("safe-")) {
      return unavailable();
    }
    // This is a navigation intent: the course page refreshes seats and holds.
    // capacityUsed reserves studio space for a class and is not its attendance.
    const remaining = getCourseRemaining(event);
    if (
      event.available === false ||
      (remaining !== null &&
        (!Number.isSafeInteger(remaining) || remaining < 1))
    ) {
      return unavailable("full");
    }
    return {
      state: remaining === 1 ? "limited" : "available",
      selection: {
        studio,
        activityId,
        start,
        end,
        productId,
        courseSessionId,
        quantity: 1,
      },
    };
  }

  if (["private", "exclusive"].includes(event.bookingMode)) {
    return unavailable("blocked");
  }

  const duration = getMinimumDuration(studio);
  const maximum = Number(studio.maxBookingMinutes);
  if (!Number.isFinite(duration) || (maximum > 0 && duration > maximum)) {
    return unavailable();
  }

  // Availability expects a local calendar-date carrier, not a UTC instant.
  // Otherwise a browser in another timezone can select the adjacent day.
  const [year, month, day] = dateKey(start, studio.timeZone)
    .split("-")
    .map(Number);
  const startMinute = wallTimeMinutes(start, studio.timeZone);
  const availability = getCalendarSlotAvailability({
    studio,
    bookings,
    day: new Date(year, month - 1, day, 12),
    startMinute,
    endMinute: startMinute + duration,
    activityId,
    guests: 1,
    bookingMode: "public",
    now: currentTime,
  });
  if (!availability.isBookable) return unavailable(availability.state);

  return {
    state: availability.state,
    selection: {
      studio,
      activityId: availability.activityId || activityId,
      start: availability.start,
      end: availability.end,
      ...(productId ? { productId } : {}),
      quantity: 1,
    },
  };
}

/** Geometry for an editable draft, including ranges that cannot be booked. */
export function getCustomerCalendarBookingPreview({
  event,
  studio,
  selectedActivityId = "",
  pointerMinute,
} = {}) {
  const start = event?.start ? asDate(event.start) : null;
  const end = event?.end ? asDate(event.end) : null;
  if (
    !studio ||
    getEntityId(event?.locationId || event?.location) !== getEntityId(studio) ||
    !start ||
    !end ||
    end <= start ||
    !bookingIsVisible(event) ||
    event.archive === true
  )
    return null;
  const [year, month, day] = dateKey(start, studio.timeZone)
    .split("-")
    .map(Number);
  const calendarDay = new Date(year, month - 1, day, 12);
  const activityId = selectedActivityId || event.activityId || "";
  const productId = getEntityId(
    event.productId || event.bookingProduct || event.product,
  );
  const courseSessionId = getEntityId(
    event.courseSessionId || event.id || event._id,
  );
  const isCourse =
    ["class", "course"].includes(event.kind) &&
    productId &&
    courseSessionId &&
    !courseSessionId.startsWith("safe-");
  const step = Math.max(15, Number(studio.slotStepMinutes) || 30);
  const openingWindow = getStudioOpeningWindow(studio, calendarDay);
  const selectedWindow = openingWindowAtMinute(
    openingWindow,
    pointerMinute ?? wallTimeMinutes(start, studio.timeZone),
  );
  const origin = selectedWindow
    ? openingWindowFirstStart(selectedWindow, step)
    : openingWindow.openMinutes;
  const startMinute =
    !isCourse && Number.isFinite(pointerMinute)
      ? Math.max(
          0,
          Math.min(
            1440 - step,
            origin + Math.floor((pointerMinute - origin) / step) * step,
          ),
        )
      : wallTimeMinutes(start, studio.timeZone);
  return {
    originBookingId: getEntityId(event.id || event._id),
    day: calendarDay,
    startMinute,
    endMinute: Math.min(
      Math.max(1440, openingWindow.closeMinutes),
      isCourse &&
        dateKey(start, studio.timeZone) === dateKey(end, studio.timeZone)
        ? wallTimeMinutes(end, studio.timeZone)
        : startMinute + getMinimumDuration(studio),
    ),
    activityId,
    ...(isCourse
      ? {
          courseIntent: {
            courseSessionId,
            productId,
            start: start.toISOString(),
            end: end.toISOString(),
          },
        }
      : {}),
  };
}

/** Keep a course's identity only while the draft still matches that session. */
export function getBookingPreviewAvailability({
  selection,
  studio,
  bookings = [],
  availability,
  now = new Date(),
}) {
  const intent = selection?.metadata?.courseIntent;
  if (
    !intent ||
    makeSlotDate(
      selection.day,
      selection.startMinute,
      studio?.timeZone,
    ).getTime() !== new Date(intent.start).getTime() ||
    makeSlotDate(
      selection.day,
      selection.endMinute,
      studio?.timeZone,
    ).getTime() !== new Date(intent.end).getTime()
  ) {
    const duration = selection?.endMinute - selection?.startMinute;
    const minimum = getMinimumDuration(studio);
    const maximum = Number(studio?.maxBookingMinutes);
    return selection &&
      (duration < minimum || (maximum > 0 && duration > maximum))
      ? { ...availability, state: "closed", isBookable: false }
      : availability;
  }
  // Course seats cannot override the studio's opening/booking restrictions.
  if (availability?.state === "closed") return availability;
  const event = bookings.find(
    (item) =>
      ["class", "course"].includes(item.kind) &&
      getEntityId(item.courseSessionId || item.id || item._id) ===
        intent.courseSessionId &&
      getEntityId(item.locationId || item.location) === getEntityId(studio) &&
      getEntityId(item.productId || item.bookingProduct || item.product) ===
        intent.productId &&
      asDate(item.start)?.getTime() === new Date(intent.start).getTime() &&
      asDate(item.end)?.getTime() === new Date(intent.end).getTime(),
  );
  const current = getCustomerCalendarBookingSelection({
    event,
    studio,
    bookings,
    now,
  });
  return {
    ...availability,
    state: current.state,
    isBookable: Boolean(current.selection),
    remaining: current.selection ? getCourseRemaining(event) : 0,
    ...(current.selection
      ? {
          start: current.selection.start,
          end: current.selection.end,
          courseSelection: current.selection,
        }
      : {}),
  };
}

export function getBookingPreviewConfirmation(selection, availability) {
  const course = availability?.courseSelection;
  return selection?.metadata?.courseIntent && course
    ? {
        productId: course.productId,
        courseSessionId: course.courseSessionId,
        quantity: 1,
      }
    : {};
}
