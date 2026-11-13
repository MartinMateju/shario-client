import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";

const SCHEDULABLE_PRODUCT_KINDS = new Set(["class", "private-studio"]);

const LEGACY_SCHEDULABLE_KIND = Object.freeze({
  course: "class",
  "public-course": "class",
  "private-course": "class",
  blocker: "private-studio",
});

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const SAFE_SETUP_STEP = /^[a-z0-9_-]{1,80}$/;

const getParam = (source, key) => {
  if (source?.get instanceof Function) return source.get(key);
  return source?.[key];
};

const text = (value) => String(value ?? "").trim();

export const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(value.id || value._id || "");
};

export const getSchedulableProductKind = (product) => {
  const kind = text(product?.kind).toLowerCase();
  if (SCHEDULABLE_PRODUCT_KINDS.has(kind)) return kind;

  return LEGACY_SCHEDULABLE_KIND[text(product?.type).toLowerCase()] || "";
};

/** @deprecated Use getSchedulableProductKind. */
export const getSchedulableProductType = getSchedulableProductKind;

export const isSchedulableProduct = (product) =>
  product?.isActive !== false &&
  SCHEDULABLE_PRODUCT_KINDS.has(getSchedulableProductKind(product));

export const filterSchedulableProducts = (products) =>
  (Array.isArray(products) ? products : []).filter(isSchedulableProduct);

export const isClassSessionProduct = (product) =>
  getSchedulableProductKind(product) === "class";

/** @deprecated Use isClassSessionProduct. */
export const isCourseSessionProduct = isClassSessionProduct;

export const isPrivateStudioProduct = (product) =>
  getSchedulableProductKind(product) === "private-studio";

export const getProductName = (product, locale = "en") => {
  return getLocalizedPublicTenantText(product?.name, locale);
};

export const getLocationsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.locations)) return response.locations;
  return [];
};

export const normalizeWorkspaceReturnPath = (value) => {
  const candidate = text(value);
  if (
    !candidate ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    !/^\/app(?:[/?#]|$)/.test(candidate)
  ) {
    return "";
  }

  try {
    const parsed = new URL(candidate, "https://workspace.invalid");
    if (parsed.origin !== "https://workspace.invalid") return "";
    if (!/^\/app(?:\/|$)/.test(parsed.pathname)) return "";

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
};

export const parseBookingSessionPrefill = (source) => {
  const setupStepCandidate = text(getParam(source, "setupStep")).toLowerCase();

  return {
    productId:
      text(getParam(source, "productId")) ||
      text(getParam(source, "activityId")),
    locationId: text(getParam(source, "locationId")),
    start: text(getParam(source, "start")),
    end: text(getParam(source, "end")),
    isRoot: TRUE_VALUES.has(text(getParam(source, "isRoot")).toLowerCase()),
    setupStep: SAFE_SETUP_STEP.test(setupStepCandidate)
      ? setupStepCandidate
      : "",
    returnTo: normalizeWorkspaceReturnPath(
      getParam(source, "returnTo") || getParam(source, "return"),
    ),
  };
};

export const getBookingSessionPrefillIssue = ({
  productRequested = false,
  productAvailable = true,
  locationRequested = false,
  locationAvailable = true,
  scheduleRequested = false,
  scheduleAvailable = true,
  durationAvailable = true,
} = {}) => {
  if (productRequested && !productAvailable) return "prefillProduct";
  if (locationRequested && !locationAvailable) return "prefillLocation";
  if (scheduleRequested && !scheduleAvailable) return "prefillSchedule";
  if (scheduleRequested && !durationAvailable) return "prefillDuration";
  return "";
};

export const getBookingSessionReturnPath = ({ returnTo, setupStep } = {}) => {
  const safeReturn = normalizeWorkspaceReturnPath(returnTo);
  if (safeReturn) return safeReturn;

  const safeStep = text(setupStep).toLowerCase();
  if (SAFE_SETUP_STEP.test(safeStep)) {
    return `/app/setup?step=${encodeURIComponent(safeStep)}`;
  }

  return "/app/bookings";
};

export const timeToMinutes = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text(value));
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
};

export const addMinutesToTime = (value, durationMinutes) => {
  const startMinutes = timeToMinutes(value);
  const duration = Number(durationMinutes);
  if (startMinutes === null || !Number.isFinite(duration) || duration <= 0) {
    return "";
  }

  const total = (startMinutes + Math.round(duration)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
};

export const getPrefillDurationMinutes = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return 0;
  }

  return Math.round((endDate - startDate) / 60_000);
};

export const normalizeSessionDates = (values) =>
  [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(text)
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    ),
  ].sort();

export const buildBookingSessionPayload = ({
  dates,
  startTime,
  durationMinutes,
  productId,
  locationId,
  productKind,
  lecturer = "",
  language = "en",
  description = "",
  note = "",
  isRoot = false,
}) => ({
  dates: normalizeSessionDates(dates),
  startTime: text(startTime),
  endTime: addMinutesToTime(startTime, durationMinutes),
  bookingProduct: text(productId),
  locationId: text(locationId),
  ...(SCHEDULABLE_PRODUCT_KINDS.has(text(productKind).toLowerCase())
    ? { kind: text(productKind).toLowerCase() }
    : {}),
  lecturer: text(lecturer),
  language: text(language).toLowerCase() === "cs" ? "cs" : "en",
  description: text(description),
  note: text(note),
  isRoot: Boolean(isRoot),
});

export const getBookingSessionPayloadError = (payload) => {
  if (!payload.bookingProduct) return "product";
  if (!payload.locationId) return "location";
  if (!payload.dates.length) return "date";
  if (!payload.startTime || !payload.endTime) return "time";
  return "";
};
