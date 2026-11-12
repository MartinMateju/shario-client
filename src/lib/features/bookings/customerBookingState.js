const RESERVATION_STATES = new Set([
  "confirmed",
  "awaiting_payment",
  "awaiting_confirmation",
  "expired",
  "failed",
  "cancelled",
  "completed",
]);

const asTimestamp = (value) => new Date(value).getTime();
const normalized = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const getCustomerBookingState = (booking, now = new Date()) => {
  const status = normalized(booking?.status);
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (status === "completed") return "completed";

  const suppliedState = normalized(booking?.reservationState);
  const payment = normalized(booking?.paymentStatus);
  let state = RESERVATION_STATES.has(suppliedState) ? suppliedState : "";

  // Older customer DTOs did not carry reservationState. Preserve their real
  // bookings while keeping checkout attempts distinguishable from visits.
  if (!state) {
    if (["confirmed", "paid"].includes(payment)) {
      state =
        booking?.isActiveReservation === false
          ? "awaiting_confirmation"
          : "confirmed";
    } else if (["pending_payment", "pending", "unpaid"].includes(payment)) {
      state = "awaiting_payment";
    } else if (["expired", "failed"].includes(payment)) {
      state = payment;
    } else if (payment === "refunded") {
      state = "cancelled";
    } else {
      state = "confirmed";
    }
  }

  // A cached active hold must expire locally even before the next API poll.
  const expiry = asTimestamp(booking?.paymentExpiresAt);
  if (
    state === "awaiting_payment" &&
    booking?.paymentExpiresAt &&
    Number.isFinite(expiry) &&
    expiry <= asTimestamp(now)
  ) {
    return "expired";
  }
  return state;
};

const hasUpcomingTime = (booking, now) => {
  const end = asTimestamp(booking?.end ?? booking?.start);
  return Number.isFinite(end) && end >= asTimestamp(now);
};

export const isCustomerBookingUpcoming = (booking, now = new Date()) =>
  hasUpcomingTime(booking, now) &&
  ["confirmed", "awaiting_payment", "awaiting_confirmation"].includes(
    getCustomerBookingState(booking, now),
  );

export const isCustomerBookingNextVisit = (booking, now = new Date()) =>
  hasUpcomingTime(booking, now) &&
  booking?.isActiveReservation !== false &&
  getCustomerBookingState(booking, now) === "confirmed";
