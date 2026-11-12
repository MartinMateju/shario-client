export const isActiveBookingParticipant = (participant) =>
  participant?.attendanceStatus !== "removed";

export const activeBookingParticipants = (booking) =>
  (Array.isArray(booking?.participants) ? booking.participants : []).filter(
    isActiveBookingParticipant,
  );
