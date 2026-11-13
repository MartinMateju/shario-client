import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import {
  formatWallDate,
  formatWallTime,
  getLocationTimeZone,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";

export const getBookingEditorHref = (id) =>
  `/app/bookings/${encodeURIComponent(String(id))}/edit`;

export const toBookingWallInput = (value, timezone) => {
  const date = formatWallDate(value, timezone);
  const time = formatWallTime(value, timezone);
  return date && time ? `${date}T${time}` : "";
};

export const createBookingEditorDraft = (editor) => {
  const timezone = getLocationTimeZone(editor.location);
  return {
    start: toBookingWallInput(editor.booking.start, timezone),
    end: toBookingWallInput(editor.booking.end, timezone),
    lecturer: editor.booking.lecturer || "",
    note: editor.booking.note || "",
    participants: (editor.participants || []).map((participant) => ({
      ...participant,
      draftKey: `existing-${participant.id}`,
    })),
  };
};

const serializeParticipant = (participant) => {
  if (participant.id) return { id: participant.id };
  if (participant.customerId) return { customerId: participant.customerId };
  return {
    name: String(participant.name || "").trim(),
    ...(participant.email?.trim() ? { email: participant.email.trim() } : {}),
    ...(participant.phone?.trim() ? { phone: participant.phone.trim() } : {}),
  };
};

const changedWallTimeToIso = (value, original, timezone) => {
  // Keep the exact original instant, including seconds and the DST offset,
  // until the user changes this field.
  if (value === toBookingWallInput(original, timezone)) return original;
  const [date, time] = String(value).split("T");
  const result = zonedDateTimeToUtc(date, time, timezone);
  if (!result || toBookingWallInput(result, timezone) !== value) return null;
  return result.toISOString();
};

export const buildBookingEditorPayload = (editor, draft) => {
  const payload = {
    revision: editor.revision,
    lecturer: draft.lecturer.trim(),
    note: draft.note.trim(),
  };
  if (editor.capabilities?.canReschedule) {
    const timezone = getLocationTimeZone(editor.location);
    const start = changedWallTimeToIso(
      draft.start,
      editor.booking.start,
      timezone,
    );
    const end = changedWallTimeToIso(draft.end, editor.booking.end, timezone);
    if (!start || !end || new Date(end) <= new Date(start)) return null;
    // Metadata-only saves must not trigger rescheduling side effects.
    if (start !== editor.booking.start || end !== editor.booking.end) {
      payload.start = start;
      payload.end = end;
    }
  }
  if (editor.capabilities?.canEditParticipants) {
    const participants = draft.participants.map(serializeParticipant);
    const original = (editor.participants || []).map(serializeParticipant);
    if (JSON.stringify(participants) !== JSON.stringify(original)) {
      payload.participants = participants;
    }
  }
  return payload;
};

export const isCustomerAlreadyAttending = (participants, customer) =>
  participants.some(
    (participant) =>
      (participant.customerId &&
        String(participant.customerId) === String(customer.id)) ||
      (participant.memberNumber &&
        customer.memberNumber &&
        Number(participant.memberNumber) === Number(customer.memberNumber)) ||
      (!participant.memberNumber &&
        participant.customId &&
        customer.customId &&
        String(participant.customId) === String(customer.customId)),
  );

export const getBookingEditorError = (error, t, fallback = "request") => {
  const keys = {
    BOOKING_EDIT_STALE: "stale",
    BOOKING_EDIT_CAPACITY_EXCEEDED: "capacity",
    BOOKING_EDIT_PAYMENT_IN_PROGRESS: "payment",
    BOOKING_EDIT_NOT_ALLOWED: "notAllowed",
    BOOKING_EDITOR_CUSTOMER_NOT_FOUND: "customer",
    BOOKING_EDIT_DURATION_REQUIRES_PAYMENT_WORKFLOW: "duration",
    BOOKING_EDIT_ATTENDANCE_REVIEW_REQUIRED: "attendanceReview",
  };
  const code = error?.data?.code;
  if (code === "BOOKING_EDIT_ACCESS_DELIVERY_IN_PROGRESS")
    return t(`lockReasons.${code}`);
  if (keys[code]) return t(`errors.${keys[code]}`);
  return getLocalizedApiErrorMessage(error, t(`errors.${fallback}`));
};

export const getBookingEditorLockReason = (code, t, fallback) =>
  code === "BOOKING_EDIT_ATTENDANCE_REVIEW_REQUIRED"
    ? t("errors.attendanceReview")
    : [
          "BOOKING_EDIT_NOT_ALLOWED",
          "BOOKING_EDIT_PAYMENT_IN_PROGRESS",
          "BOOKING_EDIT_ACCESS_DETAILS_ISSUED",
          "BOOKING_EDIT_ACCESS_DELIVERY_IN_PROGRESS",
        ].includes(code)
      ? t(`lockReasons.${code}`)
      : t(fallback);
