import { isAnyStudioModuleEnabled } from "@/utils/studioFlow";

/*
 * The portal page starts the dashboard header queries alongside the calendar
 * queries, and Menu subscribes to the same cache entries once it mounts. Both
 * must build their arguments here so they keep sharing one request.
 */
export const getUpcomingBookingsQueryArgs = (locationId) => ({
  scope: "upcoming",
  page: 1,
  limit: 5,
  locationId,
});

export const isPortalCreditsEnabled = (modules) => modules?.credits !== false;

export const isPortalBookingAccountEnabled = (modules) =>
  isAnyStudioModuleEnabled(modules, ["bookings", "courses"]);
