import {
  getPortalLocationReference,
  normalizePortalLocationReference,
} from "@/utils/customerPortalLocation";

export const getBookingLocationReference = (booking) =>
  getPortalLocationReference(booking?.location) ||
  normalizePortalLocationReference(
    typeof booking?.location === "string" ? booking.location : "",
  ) ||
  normalizePortalLocationReference(booking?.locationId);

export const getConfirmedOrderLocationReference = (data) => {
  const confirmation = data?.confirmation ?? data ?? {};
  const bookings = Array.isArray(confirmation.bookings)
    ? confirmation.bookings
    : confirmation.booking
      ? [confirmation.booking]
      : [];
  const references = bookings.map(getBookingLocationReference);

  // A cart can contain bookings at different studios. Only infer a destination
  // when every booking in the confirmation identifies the same studio.
  if (!references.length || references.some((reference) => !reference)) {
    return "";
  }

  const uniqueReferences = [...new Set(references)];
  return uniqueReferences.length === 1 ? uniqueReferences[0] : "";
};
