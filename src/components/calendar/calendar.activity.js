import { getCalendarActivityName } from "./calendar.resources";

export const CALENDAR_BOOKING_ACTIVITIES = Object.freeze([
  "SHARED_TABLE",
  "WORKSTATION",
]);

export const isCalendarActivityRequired = (studio) =>
  String(studio?.booking?.activitySelectionMode || "")
    .trim()
    .toUpperCase() === "REQUIRED";

export function getCalendarBookingActivity(event, studio, t) {
  // Courses have a predefined activity; customers do not choose one when
  // enrolling. Availability suggestions and studio closures are not bookings.
  if (
    !event ||
    !isCalendarActivityRequired(studio) ||
    event.isClosure ||
    event.isSuggested ||
    [event.kind, event.tag].some((kind) =>
      [
        "class",
        "course",
        "privatestudio",
        "private-studio",
        "private-session",
        "block",
        "blocker",
      ].includes(
        String(kind || "")
          .trim()
          .toLowerCase(),
      ),
    )
  ) {
    return null;
  }

  const id = String(event.activityId || event.plannedActivity || "")
    .trim()
    .toUpperCase();
  if (!CALENDAR_BOOKING_ACTIVITIES.includes(id)) return null;

  return {
    id,
    label: getCalendarActivityName(studio, id, t || ((key) => key)),
  };
}
