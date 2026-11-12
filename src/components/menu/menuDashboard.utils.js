import { getCustomerBookings } from "@/lib/features/bookings/customerBookingPagination";
import { isCustomerBookingNextVisit } from "@/lib/features/bookings/customerBookingState";
import { formatGreetingName } from "@/lib/features/dashboard/dashboardGreeting";
import {
  formatZonedTimeRange,
  getEntityId,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";

const COPY = Object.freeze({
  en: Object.freeze({
    admin: "Admin",
    moderator: "Moderator",
    eyebrow: "Your studio",
    greeting: "Welcome back",
    intro:
      "Your bookings, creative work and studio benefits in one calm place.",
    book: "Book a session",
    currentStudio: "Current studio",
    upcoming: "Next visit",
    upcomingLoading: "Finding your next visit…",
    upcomingError: "Your next visit is temporarily unavailable.",
    upcomingEmpty: "Nothing booked yet",
    upcomingEmptyDescription:
      "Choose a time in the calendar whenever you are ready.",
    chooseTime: "Choose a time",
    manageBooking: "View booking",
    cancelBooking: "Cancel booking",
    member: "Member ID",
    credits: "Credits",
    copyMemberId: "Copy member ID",
    copiedMemberId: "Member ID copied",
    calendarEyebrow: "Studio calendar",
    calendarTitle: "Plan your next visit",
    calendarDescription:
      "Choose a studio, then select an available time in the calendar.",
    calendarSuggestion: Object.freeze({
      eyebrow: "Try the calendar",
      title: "Here is an available time to start with",
      description:
        "This is only a suggestion. Select it to continue, or choose any other time in the calendar.",
      action: "Select this time",
      dismiss: "Dismiss suggested time",
      unavailable:
        "No open time could be suggested right now. Browse another day or contact the studio.",
    }),
    calendarSelection: Object.freeze({
      summary: "Selected time",
      continue: "Continue",
      clear: "Clear selected time",
    }),
    bookingFallback: "Studio session",
    locationFallback: "Your studio",
    creditLoading: "Loading…",
    creditUnavailable: "Unavailable",
  }),
  cs: Object.freeze({
    admin: "Administrátor",
    moderator: "Moderátor",
    eyebrow: "Vaše studio",
    greeting: "Vítejte zpět",
    intro: "Rezervace, vaše tvorba a výhody studia na jednom klidném místě.",
    book: "Rezervovat návštěvu",
    currentStudio: "Aktuální studio",
    upcoming: "Další návštěva",
    upcomingLoading: "Hledáme váš nejbližší termín…",
    upcomingError: "Nejbližší termín teď nelze načíst.",
    upcomingEmpty: "Zatím nemáte rezervovaný termín",
    upcomingEmptyDescription:
      "Až budete chtít, vyberte si volný čas v kalendáři.",
    chooseTime: "Vybrat termín",
    manageBooking: "Zobrazit rezervaci",
    cancelBooking: "Zrušit rezervaci",
    member: "Členské ID",
    credits: "Kredity",
    copyMemberId: "Kopírovat členské ID",
    copiedMemberId: "Členské ID zkopírováno",
    calendarEyebrow: "Kalendář studia",
    calendarTitle: "Naplánujte si další návštěvu",
    calendarDescription: "Vyberte studio a potom volný termín v kalendáři.",
    calendarSuggestion: Object.freeze({
      eyebrow: "Vyzkoušejte kalendář",
      title: "Tímto dostupným termínem můžete začít",
      description:
        "Jde pouze o návrh. Vyberte ho, nebo si v kalendáři zvolte jiný termín.",
      action: "Vybrat tento termín",
      dismiss: "Skrýt navržený termín",
      unavailable:
        "Teď se nepodařilo navrhnout volný termín. Prohlédněte si jiný den nebo kontaktujte studio.",
    }),
    calendarSelection: Object.freeze({
      summary: "Vybraný termín",
      continue: "Pokračovat",
      clear: "Zrušit vybraný termín",
    }),
    bookingFallback: "Návštěva studia",
    locationFallback: "Vaše studio",
    creditLoading: "Načítáme…",
    creditUnavailable: "Nedostupné",
  }),
});

const getLocaleKey = (locale) =>
  String(locale).toLowerCase() === "cs" ? "cs" : "en";

const getLocalizedValue = (value, locale) => {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const localeKey = getLocaleKey(locale);
  const keys =
    localeKey === "cs" ? ["cs", "CZ", "en", "EN"] : ["en", "EN", "cs", "CZ"];

  for (const key of keys) {
    const candidate = String(value[key] ?? "").trim();
    if (candidate) return candidate;
  }

  return "";
};

const getProductId = (booking) =>
  getEntityId(
    booking?.productId ??
      booking?.product ??
      booking?.bookingProduct ??
      booking?.productSnapshot ??
      booking?.course,
  );

const getLocation = (booking, locations) => {
  if (
    booking?.location &&
    typeof booking.location === "object" &&
    !Array.isArray(booking.location)
  ) {
    return booking.location;
  }

  const locationId = getEntityId(booking?.locationId ?? booking?.location);
  return (
    (Array.isArray(locations) ? locations : []).find(
      (location) => getEntityId(location) === locationId,
    ) || null
  );
};

export const getPortalDashboardCopy = (locale) => COPY[getLocaleKey(locale)];

export const focusCustomerPortalCalendar = ({
  heading,
  section,
  reduceMotion = false,
} = {}) => {
  if (!heading || !section) return false;

  heading.focus({ preventScroll: true });
  section.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
  return true;
};

export const getPortalGreetingName = (name, locale) => {
  const firstName = String(name ?? "")
    .trim()
    .split(/\s+/)[0];

  if (!firstName) return "";
  return formatGreetingName(
    firstName,
    getLocaleKey(locale) === "cs" ? "cs-CZ" : "en-GB",
  );
};

export const getNextUpcomingBooking = (
  response,
  now = new Date(),
  locationId = "",
) => {
  const nowValue =
    now instanceof Date ? now.getTime() : new Date(now).getTime();
  const normalizedLocationId = String(locationId || "").trim();

  return (
    getCustomerBookings(response)
      .filter((booking) => {
        const bookingLocationId = getEntityId(
          booking?.locationId ?? booking?.location,
        );
        if (
          normalizedLocationId &&
          bookingLocationId !== normalizedLocationId
        ) {
          return false;
        }

        return isCustomerBookingNextVisit(booking, nowValue);
      })
      .sort(
        (left, right) =>
          new Date(left?.start ?? 0).getTime() -
          new Date(right?.start ?? 0).getTime(),
      )[0] || null
  );
};

export const formatUpcomingBooking = ({
  booking,
  products = [],
  locations = [],
  locale = "en",
  fallbackTitle = "Studio session",
  fallbackLocation = "Your studio",
} = {}) => {
  if (!booking) return null;

  const localeKey = getLocaleKey(locale);
  const localeTag = localeKey === "cs" ? "cs-CZ" : "en-GB";
  const productId = getProductId(booking);
  const embeddedProduct =
    booking?.product ?? booking?.bookingProduct ?? booking?.productSnapshot;
  const bookingProduct =
    embeddedProduct &&
    typeof embeddedProduct === "object" &&
    !Array.isArray(embeddedProduct)
      ? embeddedProduct
      : null;
  const product =
    bookingProduct ||
    (Array.isArray(products) ? products : []).find(
      (candidate) => getEntityId(candidate) === productId,
    ) ||
    null;
  const location = getLocation(booking, locations);
  const timezone = getLocationTimeZone(location);
  const start = new Date(booking?.start ?? 0);
  const end = new Date(booking?.end ?? booking?.start ?? 0);
  const validStart = !Number.isNaN(start.getTime());
  const validEnd = !Number.isNaN(end.getTime());
  const date = validStart
    ? new Intl.DateTimeFormat(localeTag, {
        timeZone: timezone,
        weekday: "short",
        day: "numeric",
        month: "long",
      }).format(start)
    : "";
  const time =
    validStart && validEnd
      ? formatZonedTimeRange(start, end, timezone, localeTag)
      : "";

  return {
    id: getEntityId(booking),
    title:
      getLocalizedValue(
        product?.name ?? booking?.name ?? booking?.title,
        localeKey,
      ) || fallbackTitle,
    date,
    time,
    locationName: String(location?.name ?? "").trim() || fallbackLocation,
  };
};
