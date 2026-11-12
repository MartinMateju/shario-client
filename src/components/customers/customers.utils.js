import { formatMakerId } from "@/utils/memberIdentity";

const DISPLAY_FALLBACK = "—";
const API_ERROR_FALLBACK = "Something went wrong.";

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toTrimmedString = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const getLocalizedText = (value, locale = "en") => {
  const direct = toTrimmedString(value);
  if (direct) return direct;
  if (!isRecord(value)) return "";

  const normalizedLocale = String(locale || "en").toLowerCase();
  const language =
    normalizedLocale.startsWith("cs") || normalizedLocale === "cz"
      ? "cs"
      : normalizedLocale.split(/[-_]/)[0] || "en";
  const preferredKeys =
    language === "cs"
      ? ["cs", "CS", "cz", "CZ", "en", "EN"]
      : [language, language.toUpperCase(), "en", "EN", "cs", "CS", "cz", "CZ"];

  for (const key of [...preferredKeys, "default", "value", "label"]) {
    const candidate = toTrimmedString(value[key]);
    if (candidate) return candidate;
  }

  return "";
};

export const getEntityId = (value) => {
  const candidates = isRecord(value)
    ? [
        value.id,
        value._id,
        value.customerId,
        value.userId,
        value.membershipId,
        value.planVersionId,
        value.planId,
        value.bookingId,
        value.locationId,
        value.uuid,
      ]
    : [value];

  for (let candidate of candidates) {
    if (isRecord(candidate)) {
      candidate = firstDefined(candidate.$oid, candidate.id, candidate._id);
    }
    const identifier = toTrimmedString(candidate);
    if (identifier) return identifier;
  }

  return "";
};

export const getCustomerName = (value, fallback = DISPLAY_FALLBACK) => {
  const wrappedCustomer = [value?.customer, value?.user].find(isRecord);
  const customer = isRecord(wrappedCustomer) ? wrappedCustomer : value;

  if (!isRecord(customer)) return fallback;

  const directName = getLocalizedText(
    firstDefined(customer.displayName, customer.fullName, customer.name),
  );
  if (directName) return directName;

  const firstName = toTrimmedString(
    firstDefined(customer.firstName, customer.firstname, customer.givenName),
  );
  const lastName = toTrimmedString(
    firstDefined(customer.lastName, customer.lastname, customer.familyName),
  );
  const composedName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    composedName ||
    toTrimmedString(customer.email) ||
    formatMakerId(customer.memberNumber, fallback)
  );
};

const entityStateValues = (value) => {
  if (!isRecord(value?.entities)) return null;

  if (Array.isArray(value.ids)) {
    return value.ids
      .map((id) => value.entities[id])
      .filter((entity) => entity !== undefined && entity !== null);
  }

  return Object.values(value.entities).filter(
    (entity) => entity !== undefined && entity !== null,
  );
};

const normalizeApiCollection = (response, collectionKeys, groupedKeys = []) => {
  const queue = [response];
  const seen = new Set();

  while (queue.length) {
    const candidate = queue.shift();
    if (Array.isArray(candidate)) return candidate;
    if (!isRecord(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);

    for (const key of collectionKeys) {
      if (Array.isArray(candidate[key])) return candidate[key];
    }

    const grouped = groupedKeys.flatMap((key) =>
      Array.isArray(candidate[key]) ? candidate[key] : [],
    );
    if (grouped.length) return grouped;

    for (const key of ["items", "results", "rows", "records"]) {
      if (Array.isArray(candidate[key])) return candidate[key];
    }

    const normalizedEntities = entityStateValues(candidate);
    if (normalizedEntities) return normalizedEntities;

    for (const key of ["data", "result", "payload", "response"]) {
      if (Array.isArray(candidate[key])) return candidate[key];
      if (isRecord(candidate[key])) queue.push(candidate[key]);
    }
  }

  return [];
};

export const normalizeBookings = (response) =>
  normalizeApiCollection(
    response,
    ["bookings", "reservations"],
    ["workshops", "courses"],
  );

export const normalizeMemberships = (response) =>
  normalizeApiCollection(response, [
    "memberships",
    "userMemberships",
    "subscriptions",
  ]);

export const normalizePlans = (response) =>
  normalizeApiCollection(response, ["plans", "membershipPlans"]);

export const normalizeLocations = (response) =>
  normalizeApiCollection(response, ["locations", "studioLocations"]);

const unwrapPlan = (value) =>
  isRecord(value?.plan) &&
  !value?.publishedVersion &&
  !value?.currentPublishedVersion
    ? value.plan
    : value;

export const getPublishedPlanVersion = (value) => {
  const plan = unwrapPlan(value);
  if (!isRecord(plan)) return null;

  const explicitVersion = firstDefined(
    plan.publishedVersion,
    plan.currentPublishedVersion,
    plan.latestPublishedVersion,
  );
  if (explicitVersion !== undefined) return explicitVersion;

  if (Array.isArray(plan.versions)) {
    const publishedVersion = plan.versions.find((version) => {
      const status = String(
        firstDefined(version?.status, version?.publicationStatus, ""),
      ).toLowerCase();
      return version?.isPublished === true || status === "published";
    });
    if (publishedVersion) return publishedVersion;
  }

  const version = plan.version;
  if (
    isRecord(version) &&
    (version.isPublished === true ||
      [version.status, version.publicationStatus]
        .filter(Boolean)
        .some((status) => String(status).toLowerCase() === "published"))
  ) {
    return version;
  }

  if (
    plan.isPublished === true ||
    String(plan.status || plan.publicationStatus || "").toLowerCase() ===
      "published"
  ) {
    return plan;
  }

  return null;
};

const getReadablePlanVersion = (value) => {
  const plan = unwrapPlan(value);
  const published = getPublishedPlanVersion(plan);

  if (isRecord(published)) return published;
  if (!isRecord(plan)) return null;

  return (
    (isRecord(plan.version) && plan.version) ||
    (isRecord(plan.currentVersion) && plan.currentVersion) ||
    plan
  );
};

export const getPlanName = (
  value,
  locale = "en",
  fallback = DISPLAY_FALLBACK,
) => {
  const plan = unwrapPlan(value);
  const version = getReadablePlanVersion(plan);
  const candidates = [
    version?.name,
    version?.title,
    plan?.name,
    plan?.title,
    plan?.label,
  ];

  for (const candidate of candidates) {
    const name = getLocalizedText(candidate, locale);
    if (name) return name;
  }

  return fallback;
};

export const getPlanPrices = (value) => {
  const plan = unwrapPlan(value);
  const version = getReadablePlanVersion(plan);
  const sources = [version, plan].filter(isRecord);

  for (const source of sources) {
    for (const prices of [
      source.prices,
      source.priceOptions,
      source.pricing?.prices,
    ]) {
      if (Array.isArray(prices)) return prices;
    }

    if (isRecord(source.price)) return [source.price];

    const currency = toTrimmedString(source.currency).toUpperCase();
    const amountMinor = firstDefined(source.amountMinor, source.priceMinor);
    if (currency && amountMinor !== undefined) {
      return [{ currency, amountMinor }];
    }

    const amount = source.amount;
    if (currency && amount !== undefined) return [{ currency, amount }];
  }

  return [];
};

export const getPlanLocationIds = (value) => {
  const plan = unwrapPlan(value);
  const version = getReadablePlanVersion(plan);
  const scope = firstDefined(version?.locationScope, plan?.locationScope);
  const scopeType = isRecord(scope)
    ? String(scope.type || scope.mode || "").toLowerCase()
    : typeof scope === "string"
      ? scope.toLowerCase()
      : "";

  if (["all", "any", "global"].includes(scopeType)) return [];

  const locations = firstDefined(
    isRecord(scope) ? scope.locationIds : undefined,
    isRecord(scope) ? scope.locations : undefined,
    Array.isArray(scope) ? scope : undefined,
    version?.locationIds,
    version?.locations,
    plan?.locationIds,
    plan?.locations,
  );

  if (!Array.isArray(locations)) return [];

  return [
    ...new Set(
      locations.map((location) => getEntityId(location)).filter(Boolean),
    ),
  ];
};

const normalizeStatus = (value, fallback) => {
  const statusValue = isRecord(value)
    ? firstDefined(value.status, value.state, value.value, value.key)
    : value;
  const status = toTrimmedString(statusValue)
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return status === "canceled" ? "cancelled" : status || fallback;
};

export const getMembershipName = (
  value,
  locale = "en",
  fallback = DISPLAY_FALLBACK,
) => {
  const membership = isRecord(value?.membership) ? value.membership : value;
  const candidates = [
    membership?.planSnapshot?.name,
    membership?.planVersion?.name,
    membership?.plan?.name,
    membership?.membershipPlan?.name,
    membership?.planName,
    membership?.name,
  ];

  for (const candidate of candidates) {
    const name = getLocalizedText(candidate, locale);
    if (name) return name;
  }

  return fallback;
};

export const getMembershipStatus = (value, fallback = "pending") => {
  const membership = isRecord(value?.membership) ? value.membership : value;
  return normalizeStatus(
    firstDefined(
      membership?.status,
      membership?.membershipStatus,
      membership?.state,
    ),
    fallback,
  );
};

export const getBookingName = (
  value,
  locale = "en",
  fallback = DISPLAY_FALLBACK,
) => {
  const booking = isRecord(value?.booking) ? value.booking : value;
  const candidates = [
    booking?.productSnapshot?.name,
    booking?.product?.name,
    booking?.session?.product?.name,
    booking?.productName,
    booking?.serviceName,
    booking?.title,
    booking?.name,
  ];

  for (const candidate of candidates) {
    const name = getLocalizedText(candidate, locale);
    if (name) return name;
  }

  return fallback;
};

export const getBookingLocation = (
  value,
  locale = "en",
  fallback = DISPLAY_FALLBACK,
) => {
  const booking = isRecord(value?.booking) ? value.booking : value;
  const candidates = [
    booking?.locationSnapshot,
    booking?.location,
    booking?.venue,
    booking?.product?.location,
    booking?.locationName,
    booking?.venueName,
  ];

  for (const candidate of candidates) {
    const location = isRecord(candidate)
      ? getLocalizedText(
          firstDefined(candidate.name, candidate.title, candidate.label),
          locale,
        )
      : toTrimmedString(candidate);
    if (location) return location;
  }

  return fallback;
};

export const getBookingStatus = (value, fallback = "pending") => {
  const booking = isRecord(value?.booking) ? value.booking : value;
  if (booking?.isCancelled === true || booking?.isCanceled === true) {
    return "cancelled";
  }

  return normalizeStatus(
    firstDefined(
      booking?.status,
      booking?.state,
      booking?.bookingState,
      isRecord(booking?.bookingStatus)
        ? (booking.bookingStatus.status ?? booking.bookingStatus.state)
        : booking?.bookingStatus,
    ),
    fallback,
  );
};

const toSafeMessage = (value) => {
  if (typeof value !== "string") return "";
  const message = value.replace(/\s+/g, " ").trim();

  if (!message || /<(?:script|html|!doctype)\b/i.test(message)) return "";
  return message.length > 500 ? `${message.slice(0, 499)}…` : message;
};

const findErrorMessage = (
  value,
  seen = new Set(),
  depth = 0,
  inspectFieldValues = false,
) => {
  const direct = toSafeMessage(value);
  if (direct) return direct;
  if (depth > 6 || !value || typeof value !== "object" || seen.has(value)) {
    return "";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = findErrorMessage(entry, seen, depth + 1, true);
      if (message) return message;
    }
    return "";
  }

  for (const key of ["message", "detail", "description", "reason"]) {
    const message = findErrorMessage(value[key], seen, depth + 1, true);
    if (message) return message;
  }

  for (const key of ["errors", "error", "data", "body", "cause"]) {
    const message = findErrorMessage(
      value[key],
      seen,
      depth + 1,
      key === "errors" || key === "data" || key === "body",
    );
    if (message) return message;
  }

  if (inspectFieldValues) {
    for (const [key, nested] of Object.entries(value)) {
      if (["status", "statusCode", "code", "stack", "name"].includes(key)) {
        continue;
      }
      const message = findErrorMessage(nested, seen, depth + 1, true);
      if (message) return message;
    }
  }

  return "";
};

export const getApiErrorMessage = (error, fallback = API_ERROR_FALLBACK) => {
  const candidates = [
    [error?.data, true],
    [error?.response?.data, true],
    [error?.body, true],
    [error, false],
  ];

  for (const [candidate, inspectFieldValues] of candidates) {
    const message = findErrorMessage(
      candidate,
      new Set(),
      0,
      inspectFieldValues,
    );
    if (message) return message;
  }

  return toSafeMessage(fallback) || API_ERROR_FALLBACK;
};

const normalizeLocale = (locale) => {
  const normalized = String(locale || "en").trim();
  const lower = normalized.toLowerCase();

  if (lower === "cz" || lower === "cs" || lower.startsWith("cs-")) {
    return "cs-CZ";
  }
  if (lower === "en") return "en-GB";
  return normalized || "en-GB";
};

const toFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const formatCustomerCurrency = (
  amount,
  currency,
  locale = "en",
  fallback = DISPLAY_FALLBACK,
) => {
  const value = toFiniteNumber(amount);
  const currencyCode = toTrimmedString(currency).toUpperCase();
  if (value === null || !/^[A-Z]{3}$/.test(currencyCode)) return fallback;

  try {
    return new Intl.NumberFormat(normalizeLocale(locale), {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currencyCode,
      }).format(value);
    } catch {
      return fallback;
    }
  }
};

export const formatCustomerDate = (
  value,
  locale = "en",
  options = {},
  fallback = DISPLAY_FALLBACK,
) => {
  if (value === null || value === undefined || value === "") return fallback;

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const formatOptions = isRecord(options)
    ? options
    : { day: "numeric", month: "short", year: "numeric" };
  const resolvedOptions = Object.keys(formatOptions).length
    ? formatOptions
    : { day: "numeric", month: "short", year: "numeric" };

  try {
    return new Intl.DateTimeFormat(
      normalizeLocale(locale),
      resolvedOptions,
    ).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("en-GB", resolvedOptions).format(date);
    } catch {
      return fallback;
    }
  }
};

export const createIdempotencyKey = (prefix = "customer") => {
  const safePrefix =
    String(prefix || "customer")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "customer";
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) return `${safePrefix}-${randomUuid}`;

  const randomBytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return `${safePrefix}-${token}`;
  }

  return `${safePrefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const payloadSource = (value) =>
  isRecord(value?.form) ? value.form : isRecord(value) ? value : {};

export const buildCreateCustomerPayload = (value = {}) => {
  const source = payloadSource(value);

  return {
    firstname: toTrimmedString(
      firstDefined(source.firstname, source.firstName),
    ),
    lastname: toTrimmedString(firstDefined(source.lastname, source.lastName)),
    email: toTrimmedString(source.email).toLowerCase(),
    phone: toTrimmedString(firstDefined(source.phone, source.phoneNumber)),
    password:
      typeof source.password === "string"
        ? source.password
        : String(source.password ?? ""),
  };
};

export const buildCreditGrantPayload = (value = {}) => {
  const source = payloadSource(value);
  const idempotencyKey = toTrimmedString(source.idempotencyKey);

  return {
    targetUserId: getEntityId(
      firstDefined(source.targetUserId, source.userId, source.customer),
    ),
    amount: toFiniteNumber(source.amount),
    reason: toTrimmedString(source.reason),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
};

export const buildMembershipAssignmentPayload = (value = {}) => {
  const source = payloadSource(value);
  const plan = isRecord(source.plan) ? source.plan : null;
  const publishedVersion = firstDefined(
    source.planVersion,
    plan ? getPublishedPlanVersion(plan) : undefined,
  );
  const locationId = getEntityId(
    firstDefined(source.locationId, source.location),
  );

  return {
    userId: getEntityId(
      firstDefined(source.userId, source.customerId, source.customer),
    ),
    planId: getEntityId(firstDefined(source.planId, plan)),
    planVersionId: getEntityId(
      firstDefined(source.planVersionId, publishedVersion),
    ),
    currency: toTrimmedString(source.currency).toUpperCase(),
    ...(locationId ? { locationId } : {}),
    reason: toTrimmedString(source.reason),
    note: toTrimmedString(source.note),
    autoRenew: false,
  };
};
