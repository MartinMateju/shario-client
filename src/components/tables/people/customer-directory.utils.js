export const getCompleteCustomerExport = (response, requestedIds) => {
  const rows = response?.data;
  if (
    response?.complete !== true ||
    !Array.isArray(rows) ||
    !Number.isSafeInteger(response.totalCount) ||
    response.totalCount !== rows.length
  ) {
    throw new Error("The customer export is incomplete.");
  }
  const ids = rows.map((row) => String(row?.id ?? row?._id ?? ""));
  const uniqueIds = new Set(ids);
  if (ids.some((id) => !id) || uniqueIds.size !== rows.length) {
    throw new Error("The customer export contains invalid or duplicate rows.");
  }
  if (
    requestedIds &&
    (uniqueIds.size !== requestedIds.length ||
      requestedIds.some((id) => !uniqueIds.has(String(id))))
  ) {
    throw new Error("The selected customer export is incomplete.");
  }
  return rows;
};
