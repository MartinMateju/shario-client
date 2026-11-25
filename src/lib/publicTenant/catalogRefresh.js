export function isTransientCatalogError(error) {
  const status = error?.status;
  return (
    status === "FETCH_ERROR" ||
    status === "TIMEOUT_ERROR" ||
    status === 408 ||
    status === 429 ||
    (typeof status === "number" && status >= 500 && status < 600)
  );
}

// RTK keeps the last successful data after a rejection. Once a listing is
// denied or withdrawn, a later temporary outage must not bring it back.
export async function clearUnavailableCatalog(
  _arg,
  { queryFulfilled, getCacheEntry, requestId, updateCachedData },
) {
  try {
    await queryFulfilled;
  } catch (rejection) {
    const entry = getCacheEntry();
    if (
      !isTransientCatalogError(rejection.error) &&
      entry.requestId === requestId &&
      entry.data != null
    ) {
      updateCachedData(() => null);
    }
  }
}
