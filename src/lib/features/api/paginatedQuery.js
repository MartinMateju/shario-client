const MAX_PAGE_COUNT = 10_000;

const getPageCount = (value) => {
  const pageCount = Number(value);

  if (!Number.isSafeInteger(pageCount) || pageCount < 1) return 1;
  return pageCount;
};

const getDefaultItemId = (item) => String(item?.id ?? item?._id ?? "").trim();

export const collectPaginatedQuery = async ({
  baseQuery,
  buildRequest,
  selectItems,
  selectPageCount,
  getItemId = getDefaultItemId,
}) => {
  const firstResult = await baseQuery(buildRequest(1));

  if (firstResult.error) return { error: firstResult.error };

  const firstResponse = firstResult.data;
  const items = [];
  const seenIds = new Set();
  const appendItems = (response) => {
    const pageItems = selectItems(response);

    for (const item of Array.isArray(pageItems) ? pageItems : []) {
      const id = getItemId(item);

      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      items.push(item);
    }
  };

  appendItems(firstResponse);

  let pageCount = getPageCount(selectPageCount(firstResponse));

  if (pageCount > MAX_PAGE_COUNT) {
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: "Pagination response exceeded the supported page limit.",
      },
    };
  }

  for (let page = 2; page <= pageCount; page += 1) {
    const result = await baseQuery(buildRequest(page));

    if (result.error) return { error: result.error };

    appendItems(result.data);
    pageCount = Math.max(pageCount, getPageCount(selectPageCount(result.data)));

    if (pageCount > MAX_PAGE_COUNT) {
      return {
        error: {
          status: "CUSTOM_ERROR",
          error: "Pagination response exceeded the supported page limit.",
        },
      };
    }
  }

  return { data: { firstResponse, items } };
};
