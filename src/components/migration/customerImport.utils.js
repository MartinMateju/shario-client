import { formatMakerId } from "@/utils/memberIdentity";

export const CUSTOMER_IMPORT_FIELDS = Object.freeze([
  "fullName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "memberNumber",
  "externalId",
  "passwordHash",
]);

export const CUSTOMER_PASSWORD_HASH_HEADER = "Legacy Password Hash (bcrypt)";

const CUSTOMER_CREDIT_HANDOFF_HEADERS = new Set([
  "Opening Credit Balance",
  "Credit Currency",
]);

export const isCustomerPasswordHashHeader = (header) =>
  header === CUSTOMER_PASSWORD_HASH_HEADER;

export const isCustomerCreditHandoffHeader = (header) =>
  CUSTOMER_CREDIT_HANDOFF_HEADERS.has(header);

export const PRODUCT_IMPORT_FIELDS = Object.freeze([
  "name",
  "kind",
  "description",
  "sku",
  "price",
  "extraCharge",
  "currency",
  "capacity",
  "bookingMode",
  "registrationPolicy",
  "isActive",
  "sortOrder",
  "externalId",
]);

export const BOOKING_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "customerExternalId",
  "customerEmail",
  "customerPhone",
  "productExternalId",
  "productSku",
  "productName",
  "locationCode",
  "locationSlug",
  "locationName",
  "start",
  "end",
  "date",
  "startTime",
  "endTime",
  "numberOfGuests",
  "status",
  "language",
  "plannedActivity",
  "lecturer",
  "description",
  "note",
]);

export const MEMBERSHIP_PLAN_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "name",
  "description",
  "terms",
  "price",
  "currency",
  "billingType",
  "billingInterval",
  "intervalCount",
  "durationDays",
  "locationScope",
  "locationCodes",
  "creditAllowance",
  "discountPercent",
  "customPerk",
  "benefits",
  "status",
  "sortOrder",
]);

export const MEMBERSHIP_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "customerExternalId",
  "customerEmail",
  "customerPhone",
  "planExternalId",
  "planName",
  "planVersion",
  "locationCode",
  "locationSlug",
  "locationName",
  "status",
  "startedAt",
  "periodStart",
  "periodEnd",
  "cancelledAt",
  "currency",
  "amount",
  "allowanceBalances",
  "note",
]);

export const CREDIT_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "customerExternalId",
  "customerEmail",
  "customerPhone",
  "balance",
  "currency",
  "note",
]);

export const VOUCHER_PRODUCT_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "name",
  "description",
  "sku",
  "value",
  "currency",
  "isActive",
  "sortOrder",
]);

export const VOUCHER_IMPORT_FIELDS = Object.freeze([
  "externalId",
  "promoCode",
  "productExternalId",
  "productSku",
  "productName",
  "value",
  "currency",
  "status",
  "expiresAt",
  "redeemedAt",
  "customerExternalId",
  "customerEmail",
  "customerPhone",
  "note",
]);

export const DATA_IMPORT_ENTITIES = Object.freeze({
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  BOOKINGS: "bookings",
  MEMBERSHIP_PLANS: "membership-plans",
  MEMBERSHIPS: "memberships",
  CREDITS: "credits",
  VOUCHER_PRODUCTS: "voucher-products",
  VOUCHERS: "vouchers",
});

export const DATA_IMPORT_ENTITY_CONFIG = Object.freeze({
  [DATA_IMPORT_ENTITIES.CUSTOMERS]: Object.freeze({
    fields: CUSTOMER_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(mapping?.fullName || mapping?.firstName || mapping?.lastName),
    invalidationTags: [{ type: "User", id: "LIST" }, "SetupCenter"],
    rowLabelFields: [
      "fullName",
      "firstname",
      "lastname",
      "email",
      "memberNumber",
    ],
  }),
  [DATA_IMPORT_ENTITIES.PRODUCTS]: Object.freeze({
    fields: PRODUCT_IMPORT_FIELDS,
    requiredMapping: (mapping) => Boolean(mapping?.name && mapping?.kind),
    invalidationTags: [
      { type: "Product", id: "LIST" },
      "Product",
      "SetupCenter",
    ],
    rowLabelFields: ["name", "sku", "externalId"],
  }),
  [DATA_IMPORT_ENTITIES.BOOKINGS]: Object.freeze({
    fields: BOOKING_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(
        ((mapping?.start && mapping?.end) ||
          (mapping?.date && mapping?.startTime && mapping?.endTime)) &&
        (mapping?.productName ||
          mapping?.productSku ||
          mapping?.productExternalId),
      ),
    invalidationTags: [
      { type: "Booking", id: "LIST" },
      "Booking",
      "SetupCenter",
    ],
    rowLabelFields: [
      "externalId",
      "customerEmail",
      "customerPhone",
      "productName",
      "start",
      "date",
    ],
  }),
  [DATA_IMPORT_ENTITIES.MEMBERSHIP_PLANS]: Object.freeze({
    fields: MEMBERSHIP_PLAN_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(mapping?.name && mapping?.price && mapping?.billingType),
    invalidationTags: [
      { type: "MembershipPlan", id: "LIST" },
      { type: "MembershipCatalog", id: "PUBLIC" },
      "SetupCenter",
    ],
    rowLabelFields: ["name", "externalId"],
  }),
  [DATA_IMPORT_ENTITIES.MEMBERSHIPS]: Object.freeze({
    fields: MEMBERSHIP_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(
        (mapping?.customerExternalId ||
          mapping?.customerEmail ||
          mapping?.customerPhone) &&
        (mapping?.planExternalId || mapping?.planName) &&
        mapping?.startedAt &&
        mapping?.periodEnd,
      ),
    invalidationTags: [
      { type: "Membership", id: "LIST" },
      { type: "User", id: "LIST" },
      { type: "MembershipLedger", id: "MINE" },
      "SetupCenter",
    ],
    rowLabelFields: [
      "customerEmail",
      "customerPhone",
      "customerExternalId",
      "externalId",
    ],
  }),
  [DATA_IMPORT_ENTITIES.CREDITS]: Object.freeze({
    fields: CREDIT_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(
        (mapping?.customerExternalId ||
          mapping?.customerEmail ||
          mapping?.customerPhone) &&
        mapping?.balance,
      ),
    invalidationTags: [
      "Credits",
      "CreditTransactions",
      { type: "User", id: "LIST" },
      "SetupCenter",
    ],
    rowLabelFields: [
      "customerEmail",
      "customerPhone",
      "customerExternalId",
      "externalId",
    ],
  }),
  [DATA_IMPORT_ENTITIES.VOUCHER_PRODUCTS]: Object.freeze({
    fields: VOUCHER_PRODUCT_IMPORT_FIELDS,
    requiredMapping: (mapping) => Boolean(mapping?.name && mapping?.value),
    invalidationTags: [
      { type: "Product", id: "LIST" },
      "Product",
      { type: "Coupon", id: "LIST" },
      "SetupCenter",
    ],
    rowLabelFields: ["name", "sku", "externalId"],
  }),
  [DATA_IMPORT_ENTITIES.VOUCHERS]: Object.freeze({
    fields: VOUCHER_IMPORT_FIELDS,
    requiredMapping: (mapping) =>
      Boolean(
        mapping?.promoCode &&
        mapping?.value &&
        (mapping?.productExternalId ||
          mapping?.productSku ||
          mapping?.productName),
      ),
    invalidationTags: [
      { type: "Coupon", id: "LIST" },
      "RedeemedCoupons",
      "SetupCenter",
    ],
    rowLabelFields: ["promoCode", "externalId"],
  }),
});

export const getDataImportEntityConfig = (entity) =>
  DATA_IMPORT_ENTITY_CONFIG[entity] ??
  DATA_IMPORT_ENTITY_CONFIG[DATA_IMPORT_ENTITIES.CUSTOMERS];

export const CUSTOMER_IMPORT_STATUS = Object.freeze({
  UPLOADED: "uploaded",
  VALIDATING: "validating",
  VALIDATED: "validated",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

export const CUSTOMER_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const CUSTOMER_IMPORT_ALLOWED_EXTENSIONS = Object.freeze([
  ".csv",
  ".xlsx",
]);

const SUMMARY_KEYS = [
  "total",
  "valid",
  "warnings",
  "invalid",
  "duplicates",
  "memberNumberCollisions",
  "memberNumberReassignments",
  "toCreate",
  "toUpdate",
  "toSkip",
  "created",
  "updated",
  "skipped",
  "failed",
];

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const getImportId = (value) =>
  String(value?.id ?? value?._id ?? "").trim();

export const normalizeImportSession = (response) => {
  const root = asObject(response);
  const data = asObject(root.data);
  const session =
    root.importSession ??
    root.session ??
    root.import ??
    data.importSession ??
    data.session ??
    data.import ??
    (getImportId(data) ? data : null) ??
    root;

  return asObject(session);
};

export const normalizeImportHistory = (response) => {
  if (Array.isArray(response)) return response;

  const root = asObject(response);
  const data = asObject(root.data);

  for (const value of [
    root.imports,
    root.sessions,
    root.items,
    data.imports,
    data.sessions,
    data.items,
  ]) {
    if (Array.isArray(value)) return value;
  }

  return [];
};

export const getImportHeaders = (session) =>
  Array.isArray(session?.headers)
    ? session.headers.filter((value) => typeof value === "string" && value)
    : [];

export const getImportPreviewRows = (session) => {
  for (const value of [
    session?.sampleRows,
    session?.previewRows,
    session?.preview,
    session?.rows,
    session?.validation?.rows,
  ]) {
    if (Array.isArray(value)) return value;
  }

  return [];
};

export const normalizeCustomerImportMapping = (mapping, headers = []) => {
  return normalizeDataImportMapping(
    DATA_IMPORT_ENTITIES.CUSTOMERS,
    mapping,
    headers,
  );
};

export const normalizeDataImportMapping = (entity, mapping, headers = []) => {
  const source = asObject(mapping);
  const allowedHeaders = new Set(headers);
  const fields = getDataImportEntityConfig(entity).fields;

  return fields.reduce((result, field) => {
    const header = source[field];

    if (
      typeof header === "string" &&
      header &&
      (!allowedHeaders.size || allowedHeaders.has(header))
    ) {
      result[field] = header;
    }

    return result;
  }, {});
};

export const getFieldForHeader = (
  mapping,
  header,
  entity = DATA_IMPORT_ENTITIES.CUSTOMERS,
) =>
  getDataImportEntityConfig(entity).fields.find(
    (field) => mapping?.[field] === header,
  ) ?? "";

export const setCustomerImportColumnMapping = (mapping, header, field) => {
  return setDataImportColumnMapping(
    DATA_IMPORT_ENTITIES.CUSTOMERS,
    mapping,
    header,
    field,
  );
};

export const setDataImportColumnMapping = (entity, mapping, header, field) => {
  const next = { ...asObject(mapping) };
  const fields = getDataImportEntityConfig(entity).fields;

  for (const key of fields) {
    if (next[key] === header || key === field) delete next[key];
  }

  if (fields.includes(field) && header) {
    next[field] = header;
  }

  return next;
};

export const hasCustomerNameMapping = (mapping) =>
  hasRequiredImportMapping(DATA_IMPORT_ENTITIES.CUSTOMERS, mapping);

export const hasRequiredImportMapping = (entity, mapping) =>
  getDataImportEntityConfig(entity).requiredMapping(asObject(mapping));

export const getDataImportRowLabel = (entity, row) => {
  const normalized = asObject(row?.normalized);

  if (entity === DATA_IMPORT_ENTITIES.CUSTOMERS) {
    const name = [normalized.firstname, normalized.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (name) return name;
  }

  for (const field of getDataImportEntityConfig(entity).rowLabelFields) {
    const value = normalized[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      if (field === "memberNumber") return formatMakerId(value);
      return String(value).trim();
    }
  }

  return "—";
};

export const getCustomerImportSummary = (session) => {
  const summary = asObject(session?.summary ?? session?.validation?.summary);

  const normalized = SUMMARY_KEYS.reduce((result, key) => {
    const value = Number(summary[key]);
    result[key] = Number.isFinite(value) && value > 0 ? value : 0;
    return result;
  }, {});

  if (!normalized.total) {
    const totalRows = Number(session?.totalRows);
    normalized.total =
      Number.isFinite(totalRows) && totalRows > 0 ? totalRows : 0;
  }

  return normalized;
};

export const normalizeImportRows = (response) => {
  if (Array.isArray(response)) return response;

  const root = asObject(response);
  const data = asObject(root.data);

  for (const value of [root.rows, root.items, data.rows, data.items]) {
    if (Array.isArray(value)) return value;
  }

  return [];
};

export const getCustomerImportProcessedCount = (session) => {
  const summary = getCustomerImportSummary(session);
  return summary.created + summary.updated + summary.skipped + summary.failed;
};

export const getCustomerImportProgress = (session) => {
  const summary = getCustomerImportSummary(session);
  const processed = getCustomerImportProcessedCount(session);
  const denominator = Math.max(
    summary.valid,
    summary.toCreate + summary.toUpdate + summary.toSkip,
    1,
  );

  if (session?.status === CUSTOMER_IMPORT_STATUS.COMPLETED) return 100;

  return Math.min(99, Math.round((processed / denominator) * 100));
};

export const isCustomerImportRunning = (status) =>
  status === CUSTOMER_IMPORT_STATUS.QUEUED ||
  status === CUSTOMER_IMPORT_STATUS.PROCESSING;

export const isCustomerImportTerminal = (status) =>
  status === CUSTOMER_IMPORT_STATUS.COMPLETED ||
  status === CUSTOMER_IMPORT_STATUS.FAILED;

export const validateCustomerImportFile = (file) => {
  if (!file) return "required";

  const name = String(file.name ?? "").toLowerCase();
  const extension = CUSTOMER_IMPORT_ALLOWED_EXTENSIONS.find((candidate) =>
    name.endsWith(candidate),
  );

  if (!extension) return "type";
  if (Number(file.size) <= 0) return "empty";
  if (Number(file.size) > CUSTOMER_IMPORT_MAX_FILE_BYTES) return "size";

  return null;
};

export const getImportErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.data?.error?.message ??
  error?.data?.error ??
  error?.error ??
  error?.message ??
  fallback;

export const triggerBlobDownload = (blob, fileName) => {
  if (
    typeof Blob === "undefined" ||
    !(blob instanceof Blob) ||
    typeof document === "undefined"
  ) {
    return false;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
};

export const triggerCsvDownload = (csv, fileName) => {
  if (typeof Blob === "undefined" || typeof csv !== "string") {
    return false;
  }

  const utf8Csv = csv.startsWith("\uFEFF") ? csv : `\uFEFF${csv}`;

  return triggerBlobDownload(
    new Blob([utf8Csv], { type: "text/csv;charset=utf-8" }),
    fileName,
  );
};
