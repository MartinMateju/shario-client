const ID_FIELDS = Object.freeze(["id", "_id"]);

export const ACCESS_CODE_TYPES = Object.freeze([
  "single_booking",
  "reusable",
  "emergency_reserve",
]);

export const ACCESS_CODE_STATUSES = Object.freeze([
  "draft",
  "available",
  "disabled",
  "retired",
]);

const getId = (value) => {
  if (!value || typeof value !== "object") return "";

  for (const field of ID_FIELDS) {
    const candidate = String(value[field] ?? "").trim();
    if (candidate) return candidate;
  }

  return "";
};

const normalizeCollection = (response, keys) => {
  const candidates = [response, response?.data];
  let source = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      source = candidate;
      break;
    }

    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) {
        source = candidate[key];
        break;
      }
    }

    if (source.length) break;
  }

  const seen = new Set();

  return source
    .map((item) => {
      const id = getId(item);
      return id ? { ...item, id } : null;
    })
    .filter((item) => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
};

export const normalizeAccessCodePools = (response) =>
  normalizeCollection(response, ["pools", "accessCodePools", "items"]);

export const normalizeAccessCodes = (response) =>
  normalizeCollection(response, ["codes", "accessCodes", "items"]);

export const normalizeAccessCodeAudit = (response) =>
  normalizeCollection(response, ["events", "audit", "items"]);

const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const HEADER_ALIASES = Object.freeze({
  code: new Set(["code", "accesscode", "doorcode", "entrycode"]),
  label: new Set(["label", "name"]),
  type: new Set(["type", "codetype"]),
  status: new Set(["status"]),
  validFrom: new Set(["validfrom", "starts", "startsat"]),
  validUntil: new Set(["validuntil", "expires", "expiresat"]),
  notes: new Set(["notes", "note"]),
  programmedAndTested: new Set(["programmedandtested", "verified", "ready"]),
});

const resolveHeader = (value) => {
  const normalized = normalizeHeader(value);

  return (
    Object.entries(HEADER_ALIASES).find(([, aliases]) =>
      aliases.has(normalized),
    )?.[0] || ""
  );
};

const detectDelimiter = (source) => {
  const firstLine = String(source).split(/\r?\n/u, 1)[0] || "";
  let commas = 0;
  let semicolons = 0;
  let quoted = false;

  for (let index = 0; index < firstLine.length; index += 1) {
    if (firstLine[index] === '"') quoted = !quoted;
    if (quoted) continue;
    if (firstLine[index] === ",") commas += 1;
    if (firstLine[index] === ";") semicolons += 1;
  }

  return semicolons > commas ? ";" : ",";
};

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return { rows, unclosedQuote: quoted };
};

const isTruthyCsvValue = (value) =>
  ["1", "true", "yes", "y", "ready", "verified"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );

const emptyCsvRecord = () => ({
  code: "",
  label: "",
  type: "",
  status: "",
  validFrom: "",
  validUntil: "",
  notes: "",
  programmedAndTested: false,
});

const normalizeEnumValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/**
 * Parses a small, deliberately strict CSV format in the browser. Door codes
 * stay strings throughout so values such as 001527 are never coerced to a
 * number. Quoted commas and doubled quotes are supported.
 */
export const parseAccessCodeCsv = (text) => {
  const parsed = parseCsvRows(text);
  const sourceRows = parsed.rows.filter((cells) =>
    cells.some((cell) => String(cell).trim()),
  );
  const errors = parsed.unclosedQuote
    ? [{ row: Math.max(sourceRows.length, 1), message: "unclosed_quote" }]
    : [];

  if (!sourceRows.length) return { rows: [], errors };

  const resolvedFirstRow = sourceRows[0].map(resolveHeader);
  const hasHeader = resolvedFirstRow.includes("code");
  const header = hasHeader ? resolvedFirstRow : ["code"];
  const dataRows = hasHeader ? sourceRows.slice(1) : sourceRows;
  const seen = new Set();
  const rows = [];

  dataRows.forEach((cells, index) => {
    const result = emptyCsvRecord();

    header.forEach((field, column) => {
      if (!field || !Object.hasOwn(result, field)) return;
      const value = String(cells[column] ?? "").trim();
      result[field] =
        field === "programmedAndTested" ? isTruthyCsvValue(value) : value;
    });

    result.type = normalizeEnumValue(result.type);
    result.status = normalizeEnumValue(result.status);

    if (!result.code) {
      errors.push({
        row: index + (hasHeader ? 2 : 1),
        message: "code_required",
      });
      return;
    }

    if (seen.has(result.code)) {
      errors.push({
        row: index + (hasHeader ? 2 : 1),
        message: "duplicate_code",
      });
      return;
    }

    seen.add(result.code);
    rows.push(result);
  });

  return { rows, errors };
};

const nullableIsoDate = (value) => {
  const source = String(value ?? "").trim();
  if (!source) return null;

  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? source : parsed.toISOString();
};

export const buildAccessCodePayload = (form) => ({
  poolId: String(form?.poolId ?? "").trim(),
  code: String(form?.code ?? "").trim(),
  label: String(form?.label ?? "").trim(),
  notes: String(form?.notes ?? "").trim(),
  type: ACCESS_CODE_TYPES.includes(form?.type) ? form.type : "single_booking",
  status: ACCESS_CODE_STATUSES.includes(form?.status)
    ? form.status
    : form?.programmedAndTested
      ? "available"
      : "draft",
  validFrom: nullableIsoDate(form?.validFrom),
  validUntil: form?.neverExpires ? null : nullableIsoDate(form?.validUntil),
  programmedAndTested: Boolean(form?.programmedAndTested),
});

export const getPoolCounts = (pool) => {
  const counts =
    pool?.counts && typeof pool.counts === "object" ? pool.counts : {};

  return {
    total: Number(counts.total ?? pool?.totalCount ?? 0) || 0,
    available: Number(counts.available ?? pool?.availableCount ?? 0) || 0,
    reusable: Number(counts.reusable ?? pool?.reusableCount ?? 0) || 0,
    expiring: Number(counts.expiring ?? pool?.expiringCount ?? 0) || 0,
    emergency: Number(counts.emergency ?? pool?.emergencyCount ?? 0) || 0,
  };
};

export const isPoolLowStock = (pool) => {
  if (typeof pool?.lowStock === "boolean") return pool.lowStock;

  const { available } = getPoolCounts(pool);
  const threshold = Number(pool?.lowStockThreshold ?? 0);
  return threshold > 0 && available <= threshold;
};

export const formatMaskedCode = (code) =>
  String(code?.maskedCode ?? code?.maskedValue ?? code?.displayCode ?? "••••");

/** Effective access is independent of bookings/classes; legacy omitted flags
 * are resolved by the API, which remains the authority for plan entitlement. */
export const getAccessCodeAvailability = (tenant, error) => {
  const payload = error?.data?.error ?? error?.data;
  const code = payload?.code;
  const requiredModule = payload?.details?.module ?? payload?.requiredModule;
  if (Number(error?.status) === 403 && requiredModule === "access_codes") {
    if (code === "TENANT_MODULE_NOT_ENTITLED") return "notEntitled";
    if (code === "TENANT_MODULE_DISABLED") return "disabled";
  }
  if (tenant?.workspaceModules?.access_codes?.selected === false)
    return "disabled";
  if (tenant?.modules?.access_codes === false) return "unavailable";
  return null;
};
