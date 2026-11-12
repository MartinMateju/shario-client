const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_BOOKING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const getSafeId = (value) => {
  const id = String(value || "").trim();
  return SAFE_ID.test(id) ? id : "";
};

const getSafeInstant = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 64) return "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const parsePublicBookingIntent = (searchParams) => {
  if (!searchParams || typeof searchParams.get !== "function") return null;

  const productId = getSafeId(searchParams.get("productId"));
  const locationId = getSafeId(searchParams.get("locationId"));
  const courseSessionId = getSafeId(
    searchParams.get("courseSessionId") || searchParams.get("bookingCourse"),
  );
  const start = getSafeInstant(searchParams.get("start"));
  const end = getSafeInstant(searchParams.get("end"));
  const quantityValue = Number(
    searchParams.get("quantity") || searchParams.get("numberOfGuests"),
  );
  const quantity =
    Number.isSafeInteger(quantityValue) &&
    quantityValue >= 1 &&
    quantityValue <= 50
      ? quantityValue
      : 1;

  if (!productId || !locationId || !start || !end) return null;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (endTime <= startTime || endTime - startTime > MAX_BOOKING_WINDOW_MS) {
    return null;
  }

  return {
    productId,
    locationId,
    start,
    end,
    courseSessionId,
    quantity,
    ...(["public", "private"].includes(
      searchParams.get("bookingMode") || searchParams.get("bookingType"),
    )
      ? {
          bookingMode:
            searchParams.get("bookingMode") || searchParams.get("bookingType"),
        }
      : {}),
    ...(["WORKSTATION", "SHARED_TABLE", "UNDEFINED"].includes(
      searchParams.get("activity"),
    )
      ? { activity: searchParams.get("activity") }
      : {}),
  };
};
