export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const isMongoObjectId = (value) => {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value.trim());
};

export const getLocationId = (location) => {
  const value = location?.id ?? location?._id;

  if (value === undefined || value === null) {
    return "";
  }

  const locationId = String(value).trim();

  return isMongoObjectId(locationId) ? locationId : "";
};

export const getTenantIdFromUser = (user) => {
  const tenant = user?.tenant;
  const candidates = [
    user?.tenantId,
    tenant?._id,
    tenant?.id,
    typeof tenant === "string" ? tenant : null,
  ];

  const tenantId = candidates
    .map((value) => String(value || "").trim())
    .find(isMongoObjectId);

  return tenantId || "";
};

export const normalizeLocationsResponse = (response) => {
  const source = Array.isArray(response)
    ? response
    : Array.isArray(response?.locations)
      ? response.locations
      : [];

  const seen = new Set();

  return source
    .map((location) => {
      const id = getLocationId(location);

      return id
        ? {
            ...location,
            id,
          }
        : null;
    })
    .filter((location) => {
      if (!location || seen.has(location.id)) {
        return false;
      }

      seen.add(location.id);

      return true;
    });
};

export const formatLocationAddress = (location) => {
  const address = location?.address;

  if (!address || typeof address !== "object") {
    return "";
  }

  const street = [address.line1, address.line2]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

  const city = [address.postalCode, address.city]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  return [street, city].filter(Boolean).join(", ");
};

export const getBookingLocationId = (booking) => {
  const explicitId = String(booking?.locationId || "").trim();

  if (isMongoObjectId(explicitId)) {
    return explicitId;
  }

  if (booking?.location && typeof booking.location === "object") {
    return getLocationId(booking.location);
  }

  const referencedId = String(booking?.location || "").trim();

  return isMongoObjectId(referencedId) ? referencedId : "";
};

export const getPrimaryLocation = (locations = []) => {
  const availableLocations = Array.isArray(locations) ? locations : [];

  return (
    availableLocations.find(
      (location) => location?.isPrimary && location?.isActive !== false,
    ) ||
    availableLocations.find((location) => location?.isActive !== false) ||
    null
  );
};
