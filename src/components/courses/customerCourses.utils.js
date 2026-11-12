import {
  getProductId,
  getProductName,
  getProductDescription,
} from "@/components/products/products.utils";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import {
  formatZonedDate,
  formatZonedTimeRange,
  getEntityId,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";

const courseText = (value, locale) => {
  if (!value || typeof value !== "object") return "";
  return String(
    value[locale] ||
      value.en ||
      value.cs ||
      Object.values(value).find(
        (entry) => typeof entry === "string" && entry.trim(),
      ) ||
      "",
  ).trim();
};

export const getCourseName = (product, locale) =>
  courseText(product?.courseContent?.name, locale) ||
  getProductName(product, locale);
export const getCourseDescription = (product, locale) =>
  courseText(product?.courseContent?.description, locale) ||
  getProductDescription(product, locale);
export const getCourseDetails = (product, locale) =>
  courseText(product?.courseContent?.details, locale);
export const getCourseDurationLabel = (product, locale) =>
  courseText(product?.courseContent?.durationLabel, locale);

export const getCourseSessionId = (session) =>
  String(session?.id || session?._id || "").trim();

export const getCourseSessionLocationId = (session) =>
  String(
    session?.location?.id ||
      session?.location?._id ||
      (typeof session?.location === "string" ? session.location : "") ||
      session?.locationId ||
      "",
  ).trim();

export const getCourseDurationMinutes = (session) => {
  const duration =
    (new Date(session?.end).getTime() - new Date(session?.start).getTime()) /
    60_000;
  return Number.isFinite(duration) && duration > 0
    ? Math.round(duration)
    : null;
};

export const getUpcomingLocationSessions = (
  sessions,
  locationId,
  now = Date.now(),
) =>
  (Array.isArray(sessions) ? sessions : [])
    .filter(
      (session) =>
        locationId &&
        getCourseSessionLocationId(session) === locationId &&
        getCourseSessionId(session) &&
        new Date(session.start).getTime() > now &&
        getCourseDurationMinutes(session),
    )
    .sort((a, b) => new Date(a.start) - new Date(b.start));

export const isCourseSessionBookable = (session) =>
  Boolean(
    session &&
    session.available !== false &&
    Number.isSafeInteger(session.remainingCapacity) &&
    session.remainingCapacity > 0,
  );

export const getCustomerCourseHref = ({
  productId,
  locationReference,
  sessionId,
}) => {
  const path = `/portal/courses/${encodeURIComponent(productId)}`;
  const href = sessionId
    ? `${path}?courseSessionId=${encodeURIComponent(sessionId)}`
    : path;
  return retainCustomerPortalLocation(href, locationReference);
};

export const getCourseImageUrls = (product) => {
  const safeImages = (values) => [
    ...new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          (/^https?:\/\//i.test(value) ||
            (value.startsWith("/") && !value.startsWith("//"))),
      ),
    ),
  ];
  const gallery = safeImages(
    Array.isArray(product?.courseContent?.images)
      ? product.courseContent.images
      : [],
  );
  if (gallery.length) return gallery;
  return safeImages([
    product?.imageSrc,
    product?.imageUrl,
    ...(Array.isArray(product?.images) ? product.images : []),
  ]);
};

// Cart records reference the existing product and reservation. Prices and
// availability are checked again by the existing checkout endpoint.
export const buildCustomerCourseCartItem = ({
  product,
  session,
  locationId,
  location,
  quantity,
  locale,
  now = Date.now(),
}) => {
  if (
    !getProductId(product) ||
    !session ||
    !getUpcomingLocationSessions([session], locationId, now).length ||
    !isCourseSessionBookable(session) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > session.remainingCapacity
  ) {
    return null;
  }

  const sessionId = getCourseSessionId(session);
  const selectedLocation =
    getEntityId(location) === locationId ? location : null;
  const timeZone =
    session.location?.timeZone ||
    session.location?.booking?.timezone ||
    getLocationTimeZone(selectedLocation);
  const displayLocale = locale === "en" ? "en-GB" : locale || "en-GB";
  return {
    title: getCourseName(product, locale),
    product,
    start: session.start,
    end: session.end,
    date: session.start,
    quantity,
    numberOfGuests: quantity,
    bookingCourse: sessionId,
    bookingRef: sessionId,
    bookingProduct: getProductId(product),
    locationId,
    locationName: session.location?.name || selectedLocation?.name || "",
    cartDate: formatZonedDate(session.start, timeZone, displayLocale),
    cartTime: formatZonedTimeRange(
      session.start,
      session.end,
      timeZone,
      displayLocale,
    ),
    language: session.language || locale,
    guests: Array.from({ length: quantity - 1 }, (_, index) => ({
      firstname: `Guest ${index + 1}`,
      lastname: "",
    })),
  };
};
