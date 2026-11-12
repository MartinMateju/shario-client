import { getEntityId } from "@/components/calendar/calendar.adapters";
import { getCustomerBookings } from "@/lib/features/bookings/customerBookingPagination";

// Availability deliberately omits customer identity. The customer-owned list
// supplies ownership only; its class party size must not replace occupancy.
export const markCustomerCalendarOwnership = (bookings, ownedResponse) => {
  const ownedIds = new Set(
    getCustomerBookings(ownedResponse).map(getEntityId).filter(Boolean),
  );

  return (Array.isArray(bookings) ? bookings : []).map((booking) =>
    ownedIds.has(getEntityId(booking)) ? { ...booking, isMine: true } : booking,
  );
};
