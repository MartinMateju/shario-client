export const normalizeEmailLogResponse = (response) => {
  if (Array.isArray(response)) {
    return { logs: response, totalCount: response.length };
  }

  const logs = Array.isArray(response?.logs)
    ? response.logs
    : Array.isArray(response?.items)
      ? response.items
      : [];
  return {
    logs,
    totalCount: Number.isFinite(Number(response?.totalCount))
      ? Number(response.totalCount)
      : logs.length,
  };
};
