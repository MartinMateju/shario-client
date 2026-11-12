import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";

const LOCATION_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const LOCATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PORTAL_TAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const normalizePortalLocationReference = (value) => {
  const normalized = normalizeValue(value);

  if (!normalized || normalized.length > 160) return "";

  return LOCATION_SLUG_PATTERN.test(normalized) ||
    LOCATION_OBJECT_ID_PATTERN.test(normalized)
    ? normalized
    : "";
};

export const normalizePortalTab = (value) => {
  const normalized = normalizeValue(value).replaceAll("_", "-");

  if (!normalized || normalized.length > 80) return "";

  return PORTAL_TAB_PATTERN.test(normalized) ? normalized : "";
};

export const getPortalLocationReference = (location) => {
  const slug = normalizePortalLocationReference(location?.slug);

  if (slug && !LOCATION_OBJECT_ID_PATTERN.test(slug)) return slug;

  return normalizePortalLocationReference(location?.id ?? location?._id);
};

const getLocationIdReference = (location) =>
  normalizePortalLocationReference(location?.id ?? location?._id);

export const findPortalLocationByReference = (locations, value) => {
  const reference = normalizePortalLocationReference(value);

  if (!reference || !Array.isArray(locations)) return null;

  return (
    locations.find(
      (location) =>
        getPortalLocationReference(location) === reference ||
        getLocationIdReference(location) === reference,
    ) || null
  );
};

export const getPortalLocationReferenceFromSearchParams = (searchParams) => {
  if (!searchParams || typeof searchParams.get !== "function") return "";

  return (
    normalizePortalLocationReference(searchParams.get("location")) ||
    normalizePortalLocationReference(searchParams.get("locationId"))
  );
};

export const getPortalLocationReferenceFromPath = (value) => {
  const raw = String(value ?? "").trim();

  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(raw)
  ) {
    return "";
  }

  try {
    const parsed = new URL(raw, "https://tenant.invalid");

    if (
      parsed.origin !== "https://tenant.invalid" ||
      !/^\/portal(?:\/|$)/.test(parsed.pathname)
    ) {
      return "";
    }

    return getPortalLocationReferenceFromSearchParams(parsed.searchParams);
  } catch {
    return "";
  }
};

export const buildCustomerPortalPath = ({
  location,
  locationReference,
  tab,
} = {}) => {
  const reference =
    getPortalLocationReference(location) ||
    normalizePortalLocationReference(locationReference);
  const normalizedTab = normalizePortalTab(tab);
  const searchParams = new URLSearchParams();

  if (reference) searchParams.set("location", reference);
  if (normalizedTab) searchParams.set("tab", normalizedTab);

  const query = searchParams.toString();
  return query ? `/portal?${query}` : "/portal";
};

export const retainCustomerPortalLocation = (href, locationReference) => {
  const reference = normalizePortalLocationReference(locationReference);
  const normalizedHref = String(href || "").trim();

  if (!reference) return href;

  if (
    !normalizedHref.startsWith("/") ||
    normalizedHref.startsWith("//") ||
    normalizedHref.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(normalizedHref)
  ) {
    return href;
  }

  try {
    const parsed = new URL(normalizedHref, "https://tenant.invalid");

    if (
      parsed.origin !== "https://tenant.invalid" ||
      !/^\/portal(?:\/|$)/.test(parsed.pathname)
    ) {
      return href;
    }

    parsed.searchParams.delete("locationId");
    parsed.searchParams.set("location", reference);
    const query = parsed.searchParams.toString();

    return `${parsed.pathname}${query ? `?${query}` : ""}${parsed.hash}`;
  } catch {
    return href;
  }
};

export const buildLocalizedCustomerPortalUrl = ({
  origin,
  locale,
  location,
  locationReference,
  tab,
} = {}) => {
  let parsedOrigin;

  try {
    parsedOrigin = new URL(String(origin || ""));
  } catch {
    return "";
  }

  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password
  ) {
    return "";
  }

  const portalPath = buildCustomerPortalPath({
    location,
    locationReference,
    tab,
  });
  const localizedPath = `/${resolveRolloutEligibleLocaleCode(locale)}${portalPath}`;

  return new URL(localizedPath, parsedOrigin.origin).href;
};

export const resolvePortalLocationSelection = ({
  locations,
  requestedReference,
  hasRequestedReference = Boolean(String(requestedReference ?? "").trim()),
  selectedLocationId,
} = {}) => {
  const availableLocations = (Array.isArray(locations) ? locations : []).filter(
    (location) => location?.isActive !== false,
  );
  const requestedLocation = findPortalLocationByReference(
    availableLocations,
    requestedReference,
  );

  if (requestedLocation) {
    return {
      availableLocations,
      location: requestedLocation,
      reason: "requested",
    };
  }

  if (hasRequestedReference) {
    return {
      availableLocations,
      location: null,
      reason: "unavailable",
    };
  }

  const selectedLocation = findPortalLocationByReference(
    availableLocations,
    selectedLocationId,
  );

  if (selectedLocation) {
    return {
      availableLocations,
      location: selectedLocation,
      reason: "selected",
    };
  }

  if (availableLocations.length === 1) {
    return {
      availableLocations,
      location: availableLocations[0],
      reason: "single",
    };
  }

  return {
    availableLocations,
    location: null,
    reason: availableLocations.length > 1 ? "required" : "empty",
  };
};
