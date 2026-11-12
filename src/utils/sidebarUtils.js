import {
  getDateHourAsString,
  getProductByBooking,
} from "@/utils/utilityFunctions";
import { isActiveBookingParticipant } from "@/utils/bookingAttendance";

export const numberOfGuests = Array.from({ length: 12 }, (_, index) => ({
  id: index,
  name: index + 1,
}));

export const times = Array.from({ length: 37 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  return {
    id: index + 1,
    name: `${hours}:${String(minutes).padStart(2, "0")}`,
    applicable: true,
  };
});

const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return String(value._id || value.id || "");
};

export const getTimeId = (time) => {
  const [hours, minutes] = String(time || "0:00")
    .split(":")
    .map(Number);
  return Number(hours || 0) + (Number(minutes || 0) >= 30 ? 0.5 : 0);
};

export const getTimeDiff = (startTime, endTime) => {
  const read = (value) =>
    getTimeId(typeof value === "object" ? value?.name : value);
  const start = read(startTime);
  let end = read(endTime);
  if (end === 0) end = 24;
  return Math.max(0, end - start);
};

export const getFormattedBookingTerm = (booking) => {
  if (!booking?.start) return "";
  const start = new Date(booking.start);
  const end = new Date(booking.end || booking.start);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${start.getDate()}.${start.getMonth() + 1}. ${start.getFullYear()}, ${getDateHourAsString(
    start,
  )}-${getDateHourAsString(end)}`;
};

export const filterBookingsByProduct = (bookings = [], product) => {
  const productId = getEntityId(product);

  return (Array.isArray(bookings) ? bookings : [])
    .filter((booking) => getEntityId(booking?.bookingProduct) === productId)
    .map((booking) => ({
      name: getFormattedBookingTerm(booking),
      id: getEntityId(booking),
    }));
};

const getAllCourseRefs = (booking, bookings, result = []) => {
  const next = (Array.isArray(bookings) ? bookings : []).find(
    (candidate) => getEntityId(candidate?.bookingRef) === getEntityId(booking),
  );

  if (!next) return result;
  result.push(next);
  return getAllCourseRefs(next, bookings, result);
};

export const getFollowUpCourses = (booking, bookings, products) =>
  getAllCourseRefs(booking, bookings).map((item) => ({
    start: item.start,
    end: item.end,
    name: getProductByBooking(products, item)?.name || "",
  }));

export const getNumberOfParticipantsAsString = (booking, products) => {
  const product = getProductByBooking(products, booking);
  if (!booking || !product) return "";

  return `${Number(booking.numberOfGuests) || 0}/${
    Number(product.maxNumberOfParticipants) || 0
  }`;
};

export const hasUserBookedCourse = (booking, userId) => {
  if (!booking || !userId) return false;

  const target = String(userId);
  const participants = Array.isArray(booking.participants)
    ? booking.participants
    : Array.isArray(booking.numberOfGuests)
      ? booking.numberOfGuests
      : booking.numberOfGuests && typeof booking.numberOfGuests === "object"
        ? Object.values(booking.numberOfGuests)
        : [];

  return participants.some((participant) => {
    if (!isActiveBookingParticipant(participant)) return false;
    return [getEntityId(participant), participant?.customId, participant?.email]
      .filter(Boolean)
      .map(String)
      .includes(target);
  });
};

export const getNumberOfCourseParticipants = (booking) => {
  const capacity = Math.max(0, Number(booking?.numberOfParticipants) || 0);
  const used = Math.max(0, Number(booking?.numberOfGuests) || 0);
  const remaining = Math.max(0, capacity - used);

  return Array.from({ length: remaining + 1 }, (_, index) => ({
    name: String(index),
    id: index,
    applicable: true,
  }));
};

export const generateTitle = (product) => product?.name || "";
export const getBookingLecturer = (booking) => booking?.lecturer || "";
export const isCourseCapacityFulfilled = (booking) =>
  Number(booking?.numberOfGuests) >= Number(booking?.numberOfParticipants);
export const isCourseCapacityFull = (product, booking, guestsNumber) =>
  Boolean(
    product?.type?.includes("course") &&
    Number(guestsNumber) >
      Number(booking?.numberOfParticipants) - Number(booking?.numberOfGuests),
  );
export const isCourseBookingAvailable = (product, bookings) =>
  !product?.type?.includes("course") ||
  filterBookingsByProduct(bookings, product).length > 0;
export const hasTimeElapsed = (value) =>
  Boolean(value && new Date(value).getTime() < Date.now() - 86_400_000);
export const isNumberOfHoursValid = (startTime, endTime) =>
  !startTime || !endTime || getTimeDiff(startTime, endTime) >= 1;
