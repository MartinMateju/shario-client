const ACTIVE_ROLLBACK_STATUSES = new Set(["queued", "processing"]);

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const unwrapDataImportPayload = (response) => {
  const responseObject = asObject(response);
  const data = asObject(responseObject.data);

  return Object.keys(data).length > 0 ? data : responseObject;
};

export const normalizeImportHistoryPage = (response, requestedPage = 1) => {
  const payload = unwrapDataImportPayload(response);
  const sessions = Array.isArray(payload.sessions)
    ? payload.sessions
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.results)
        ? payload.results
        : [];
  const pagination = asObject(payload.pagination);
  const page =
    asNonNegativeInteger(pagination.page ?? payload.page, requestedPage) || 1;
  const limit =
    asNonNegativeInteger(
      pagination.limit ?? payload.limit,
      sessions.length || 20,
    ) || 20;
  const total = asNonNegativeInteger(
    pagination.total ?? payload.total,
    sessions.length,
  );
  const totalPages = Math.max(
    1,
    asNonNegativeInteger(
      pagination.totalPages ?? payload.totalPages,
      Math.ceil(total / limit),
    ),
  );

  return {
    sessions,
    pagination: { page, limit, total, totalPages },
  };
};

export const normalizeImportSessionDetail = (response) => {
  const payload = unwrapDataImportPayload(response);
  const session = asObject(payload.session);

  return session.id || session._id ? session : payload;
};

export const normalizeRollbackPreview = (response) => {
  const payload = unwrapDataImportPayload(response);

  return {
    sessionId: payload.sessionId ?? null,
    revision: payload.revision ?? null,
    previewToken: payload.previewToken ?? null,
    available: payload.available === true,
    eligibleRows: asNonNegativeInteger(payload.eligibleRows),
    blockedRows: asNonNegativeInteger(payload.blockedRows),
    compensatedRows: asNonNegativeInteger(payload.compensatedRows),
    mutationRows: asNonNegativeInteger(payload.mutationRows),
    totalRows: asNonNegativeInteger(payload.totalRows),
    reasonGroups: Array.isArray(payload.reasonGroups)
      ? payload.reasonGroups.map((group) => ({
          code: String(asObject(group).code || "unknown")
            .trim()
            .toLowerCase(),
          count: asNonNegativeInteger(asObject(group).count),
        }))
      : [],
    checkedAt: payload.checkedAt ?? null,
  };
};

export const getSessionId = (session) => session?.id ?? session?._id ?? null;

export const getSessionFileName = (session) =>
  session?.originalFileName ??
  session?.fileName ??
  session?.source?.fileName ??
  null;

export const getSessionCreatedAt = (session) =>
  session?.createdAt ?? session?.uploadedAt ?? session?.startedAt ?? null;

export const getSessionEntity = (session) =>
  session?.entityType ?? session?.entity ?? null;

export const getSessionRollback = (session) => asObject(session?.rollback);

export const isRollbackActive = (status) =>
  ACTIVE_ROLLBACK_STATUSES.has(status);

export const canRequestRollback = (session) =>
  session?.status === "completed" &&
  ["available", "failed", "partial", "blocked"].includes(
    getSessionRollback(session).status,
  );

export const isFutureDate = (value) => {
  const timestamp = new Date(value).getTime();

  return Boolean(value) && Number.isFinite(timestamp) && timestamp > Date.now();
};

export const createRollbackIdempotencyKey = (sessionId, revision) => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `rollback-${sessionId}-${revision}-${Date.now()}`;
};

export const downloadCsvReport = ({ csv, fileName }) => {
  if (typeof csv !== "string" || !csv.trim()) {
    throw new Error("EMPTY_IMPORT_REPORT");
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
