const LOCATIONS_PATH = "/app/settings/locations";
const LOCATION_CREATE_PATH = `${LOCATIONS_PATH}/new`;

const buildLocationHref = (pathname, searchParams, omittedParams = []) => {
  const query = new URLSearchParams(searchParams?.toString?.() ?? "");

  for (const param of omittedParams) {
    query.delete(param);
  }

  const queryString = query.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
};

export const getLocationCreateHref = (searchParams) =>
  buildLocationHref(LOCATION_CREATE_PATH, searchParams, ["action"]);

export const getLocationEditHref = (locationId, searchParams) =>
  buildLocationHref(
    `${LOCATIONS_PATH}/${encodeURIComponent(String(locationId || "").trim())}/edit`,
    searchParams,
    ["action", "guide", "locationId"],
  );

export const getLocationListHref = (
  searchParams,
  { clearSetupStep = false } = {},
) =>
  buildLocationHref(LOCATIONS_PATH, searchParams, [
    "action",
    "guide",
    "locationId",
    ...(clearSetupStep ? ["setupStep"] : []),
  ]);
