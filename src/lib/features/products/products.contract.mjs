/**
 * Canonical tenant-operated catalog kinds.
 *
 * `kind` is the owner-facing discriminator for all new writes. `type` remains
 * a read compatibility field while existing product records are migrated.
 */
export const PRODUCT_KIND = Object.freeze({
  OPEN_STUDIO: "open-studio",
  CLASS: "class",
  MEMBERSHIP: "membership",
  VOUCHER: "voucher",
  PRIVATE_STUDIO: "private-studio",
});

export const PRODUCT_KINDS = Object.freeze(Object.values(PRODUCT_KIND));

export const OPEN_STUDIO_BOOKING_MODE = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
  CUSTOMER_CHOICE: "customer-choice",
});

export const OPEN_STUDIO_BOOKING_MODES = Object.freeze(
  Object.values(OPEN_STUDIO_BOOKING_MODE),
);

export const PRODUCT_CATEGORY_KEYS = Object.freeze([
  "openStudio",
  "classes",
  "memberships",
  "vouchers",
  "privateStudio",
]);

export const PRODUCT_CATEGORY_ALIASES = Object.freeze({
  studioAccess: "openStudio",
  classesEvents: "classes",
});

const KIND_KEYS = Object.freeze({
  [PRODUCT_KIND.OPEN_STUDIO]: "openStudio",
  [PRODUCT_KIND.CLASS]: "class",
  [PRODUCT_KIND.MEMBERSHIP]: "membership",
  [PRODUCT_KIND.VOUCHER]: "voucher",
  [PRODUCT_KIND.PRIVATE_STUDIO]: "privateStudio",
});

const KIND_CATEGORIES = Object.freeze({
  [PRODUCT_KIND.OPEN_STUDIO]: "openStudio",
  [PRODUCT_KIND.CLASS]: "classes",
  [PRODUCT_KIND.MEMBERSHIP]: "memberships",
  [PRODUCT_KIND.VOUCHER]: "vouchers",
  [PRODUCT_KIND.PRIVATE_STUDIO]: "privateStudio",
});

const KIND_AVAILABILITY = Object.freeze({
  [PRODUCT_KIND.OPEN_STUDIO]: "onRequest",
  [PRODUCT_KIND.CLASS]: "scheduled",
  [PRODUCT_KIND.MEMBERSHIP]: "always",
  [PRODUCT_KIND.VOUCHER]: "always",
  [PRODUCT_KIND.PRIVATE_STUDIO]: "internal",
});

/**
 * Legacy API `type` values are deliberately dual-read. Ambiguous historical
 * workshop product records are the historical name for Open Studio. Ambiguous
 * generic/service and internal helper types are intentionally not inferred;
 * they remain in a separate read/retire legacy surface.
 */
const LEGACY_TYPE_KINDS = Object.freeze({
  course: PRODUCT_KIND.CLASS,
  workshop: PRODUCT_KIND.OPEN_STUDIO,
  "public-course": PRODUCT_KIND.CLASS,
  "private-course": PRODUCT_KIND.CLASS,
  "public-workshop": PRODUCT_KIND.OPEN_STUDIO,
  "private-workshop": PRODUCT_KIND.OPEN_STUDIO,
  membership: PRODUCT_KIND.MEMBERSHIP,
  "credit-pack": PRODUCT_KIND.MEMBERSHIP,
  coupon: PRODUCT_KIND.VOUCHER,
  "gift-card": PRODUCT_KIND.VOUCHER,
  blocker: PRODUCT_KIND.PRIVATE_STUDIO,
});

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const readKindCandidate = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value.kind || value.type;
  }

  return value;
};

export const normalizeProductKind = (value) => {
  const candidate = normalizeCode(readKindCandidate(value));

  if (PRODUCT_KINDS.includes(candidate)) return candidate;
  return LEGACY_TYPE_KINDS[candidate] || "";
};

export const isLocationSpecificProduct = (product) =>
  [PRODUCT_KIND.OPEN_STUDIO, PRODUCT_KIND.PRIVATE_STUDIO].includes(
    normalizeProductKind(product),
  );

export const getProductLocationId = (product) =>
  String(
    product?.locationId ||
      product?.location?.id ||
      product?.location?._id ||
      (typeof product?.location === "string" ? product.location : ""),
  ).trim();

// Use only for choosing a product for a new booking, never to filter history.
export const isProductAvailableAtLocation = (product, locationId) =>
  !isLocationSpecificProduct(product) ||
  Boolean(
    locationId && getProductLocationId(product) === String(locationId).trim(),
  );

export const normalizeProductCategory = (value) => {
  const category = String(value || "").trim();
  const canonical = PRODUCT_CATEGORY_ALIASES[category] || category;

  return PRODUCT_CATEGORY_KEYS.includes(canonical) ? canonical : "";
};

export const normalizeOpenStudioBookingMode = (value, fallback = "public") => {
  const candidate = normalizeCode(value);

  if (OPEN_STUDIO_BOOKING_MODES.includes(candidate)) return candidate;
  return OPEN_STUDIO_BOOKING_MODES.includes(fallback)
    ? fallback
    : OPEN_STUDIO_BOOKING_MODE.PUBLIC;
};

export const getProductBookingMode = (product) => {
  const explicitMode = product?.bookingMode;
  if (OPEN_STUDIO_BOOKING_MODES.includes(normalizeCode(explicitMode))) {
    return normalizeCode(explicitMode);
  }

  const legacyType = normalizeCode(product?.type);
  if (legacyType.startsWith("private-")) {
    return OPEN_STUDIO_BOOKING_MODE.PRIVATE;
  }

  return OPEN_STUDIO_BOOKING_MODE.PUBLIC;
};

export const isCustomerChoiceOpenStudio = (product) =>
  normalizeProductKind(product) === PRODUCT_KIND.OPEN_STUDIO &&
  getProductBookingMode(product) === OPEN_STUDIO_BOOKING_MODE.CUSTOMER_CHOICE;

export const resolveOpenStudioBookingMode = (product, selection = "public") =>
  isCustomerChoiceOpenStudio(product)
    ? selection === "private"
      ? "private"
      : "public"
    : getProductBookingMode(product);

export const getOpenStudioPrivateSurcharge = (product, bookingMode) =>
  isCustomerChoiceOpenStudio(product) && bookingMode === "private"
    ? Math.max(
        0,
        Number(product?.openStudioPolicy?.privateBookingSurcharge) || 0,
      )
    : 0;

// Capacities count everyone, including the customer who starts the booking.
export const getOpenStudioGuestLimit = ({
  product,
  location,
  bookingMode,
  activity,
}) => {
  const studioCapacity = Math.max(
    1,
    Number(location?.booking?.globalCapacity) || 1,
  );
  const productCapacity = Number(product?.maxNumberOfParticipants) || Infinity;
  const activityCapacity =
    Number(
      location?.booking?.activityCapacities?.find(
        (entry) => entry.activity === activity,
      )?.capacity,
    ) || Infinity;
  if (!isCustomerChoiceOpenStudio(product)) {
    return Math.max(
      1,
      Math.min(studioCapacity, productCapacity, activityCapacity),
    );
  }
  if (bookingMode === "private") return studioCapacity;
  const policy = product?.openStudioPolicy;
  const publicCapacity =
    policy?.publicCapacityMode === "fixed"
      ? Number(policy.publicCapacityLimit) || 1
      : activityCapacity;
  return Math.max(
    1,
    Math.min(studioCapacity, activityCapacity, publicCapacity),
  );
};

/**
 * The products API returns stable public DTOs with `id`. Older booking and
 * checkout screens still read Mongo's `_id`, so keep both names at the client
 * boundary while adding the canonical kind for dual-read compatibility.
 */
export const normalizeProductRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const id = String(value.id ?? value._id ?? "").trim();
  const kind = normalizeProductKind(value);

  return {
    ...value,
    ...(id ? { id, _id: id } : {}),
    ...(kind ? { kind } : {}),
    ...(isLocationSpecificProduct(value)
      ? { locationId: getProductLocationId(value) || null }
      : {}),
    ...(kind === PRODUCT_KIND.OPEN_STUDIO
      ? { bookingMode: getProductBookingMode(value) }
      : {}),
  };
};

export const normalizeProductResponse = (response) => {
  const product =
    response?.product ?? response?.data?.product ?? response?.data ?? response;

  return normalizeProductRecord(product);
};

export const normalizeProductsResponse = (response) => {
  const source = Array.isArray(response)
    ? response
    : Array.isArray(response?.products)
      ? response.products
      : [];

  return source.map(normalizeProductRecord).filter(Boolean);
};

export const getProductTypeTranslationKey = (value) =>
  KIND_KEYS[normalizeProductKind(value)] || "other";

export const getProductCategoryKey = (value) =>
  KIND_CATEGORIES[normalizeProductKind(value)] || "legacy";

export const getProductAvailabilityKey = (value) =>
  KIND_AVAILABILITY[normalizeProductKind(value)] || "internal";

export const isPublicProductType = (value) => {
  const kind = normalizeProductKind(value);

  return Boolean(kind) && kind !== PRODUCT_KIND.PRIVATE_STUDIO;
};

export const isCanonicalProductKind = (value) =>
  PRODUCT_KINDS.includes(normalizeCode(readKindCandidate(value)));
