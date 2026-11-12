const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const MAX_AGGREGATED_PAGES = 10_000;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toNonNegativeInteger = (value, fallback) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getCustomerBookings = (response) => {
  if (Array.isArray(response?.bookings)) return response.bookings;
  if (Array.isArray(response)) return response;

  return [
    ...(Array.isArray(response?.workshops) ? response.workshops : []),
    ...(Array.isArray(response?.courses) ? response.courses : []),
  ];
};

export const getCustomerBookingPagination = (
  response,
  { page = 1, limit = 20 } = {},
) => {
  const bookings = getCustomerBookings(response);
  const pagination = response?.pagination ?? response?.meta ?? {};
  const currentPage = toPositiveInteger(
    response?.currentPage ?? response?.page ?? pagination?.page,
    toPositiveInteger(page, 1),
  );
  const pageSize = toPositiveInteger(
    response?.pageSize ?? response?.limit ?? pagination?.limit,
    toPositiveInteger(limit, bookings.length || 20),
  );
  const totalCount = toNonNegativeInteger(
    response?.totalCount ?? response?.total ?? pagination?.totalCount,
    bookings.length,
  );
  const totalPages = toNonNegativeInteger(
    response?.totalPages ?? pagination?.totalPages,
    totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
  );

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
  };
};

const getBookingKey = (booking) => {
  const id = booking?.id ?? booking?._id;

  return id === undefined || id === null || id === "" ? null : String(id);
};

export const mergeCustomerBookingPages = (responses) => {
  const merged = [];
  const seenIds = new Set();

  responses.forEach((response) => {
    getCustomerBookings(response).forEach((booking) => {
      const key = getBookingKey(booking);

      if (key && seenIds.has(key)) return;
      if (key) seenIds.add(key);
      merged.push(booking);
    });
  });

  return merged;
};

const getExplicitTotalPages = (response) => {
  const pagination = response?.pagination ?? response?.meta ?? {};
  const value = Number(response?.totalPages ?? pagination?.totalPages);

  return Number.isInteger(value) && value >= 0 ? value : null;
};

const aggregationError = (message) => ({
  error: {
    status: "CUSTOM_ERROR",
    error: message,
  },
});

/**
 * Fetches the complete customer-booking collection without assuming that the
 * first (maximum 100-row) server page is the whole calendar.
 */
export const fetchAllCustomerBookingPages = async ({
  params = {},
  fetchPage,
  maxPages = MAX_AGGREGATED_PAGES,
}) => {
  if (typeof fetchPage !== "function") {
    return aggregationError("A booking page fetcher is required.");
  }

  const requestedLimit = toPositiveInteger(params.limit, DEFAULT_PAGE_SIZE);
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  const safeMaxPages = toPositiveInteger(maxPages, MAX_AGGREGATED_PAGES);
  const responses = [];
  let page = 1;
  let expectedPages = null;

  while (page <= (expectedPages ?? safeMaxPages)) {
    if (page > safeMaxPages) {
      return aggregationError(
        "The customer booking calendar is too large to load safely.",
      );
    }

    const result = await fetchPage({
      ...params,
      page,
      limit,
    });

    if (result?.error) return { error: result.error };

    const response = result?.data ?? {};
    const pageBookings = getCustomerBookings(response);
    responses.push(response);

    const reportedTotalPages = getExplicitTotalPages(response);

    if (reportedTotalPages !== null) {
      if (reportedTotalPages > safeMaxPages) {
        return aggregationError(
          "The customer booking calendar is too large to load safely.",
        );
      }

      expectedPages =
        expectedPages === null
          ? reportedTotalPages
          : Math.max(expectedPages, reportedTotalPages);
    }

    if (reportedTotalPages === null && pageBookings.length < limit) break;
    if (expectedPages !== null && page >= expectedPages) break;
    if (expectedPages === null && page >= safeMaxPages) {
      return aggregationError(
        "The customer booking calendar is too large to load safely.",
      );
    }

    page += 1;
  }

  const firstResponse = responses[0] ?? {};
  const bookings = mergeCustomerBookingPages(responses);
  const pagination = getCustomerBookingPagination(firstResponse, {
    page: 1,
    limit,
  });

  return {
    data: {
      ...(firstResponse && typeof firstResponse === "object"
        ? firstResponse
        : {}),
      bookings,
      totalCount: Math.max(pagination.totalCount, bookings.length),
      aggregatedPageCount: responses.length,
      allPagesLoaded: true,
    },
  };
};
