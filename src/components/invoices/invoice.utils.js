import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { formatMinorCurrencyAmount } from "@/utils/money";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const getInvoiceId = (invoice) =>
  String(invoice?.id ?? invoice?._id ?? invoice?.invoiceId ?? "").trim();

export const getInvoiceNumber = (invoice, fallback = "—") =>
  String(
    invoice?.number ??
      invoice?.invoiceNumber ??
      invoice?.documentNumber ??
      fallback,
  );

export const getInvoiceType = (invoice) => {
  const value = String(
    invoice?.type ?? invoice?.documentType ?? "invoice",
  ).toLowerCase();

  return value === "credit_note" || value === "credit-note"
    ? "credit_note"
    : "invoice";
};

export const getInvoiceStatus = (invoice) => {
  const value = String(
    invoice?.documentStatus ??
      invoice?.status ??
      invoice?.lifecycleStatus ??
      "draft",
  ).toLowerCase();

  if (["finalized", "issued"].includes(value)) return "issued";
  if (["cancelled", "canceled"].includes(value)) return "void";
  if (["partially_credited", "partially-credited"].includes(value)) {
    return "partially_credited";
  }

  return value || "draft";
};

export const getInvoicePaymentStatus = (invoice) => {
  const value = String(invoice?.paymentStatus ?? "").toLowerCase();

  if (value) return value.replaceAll("-", "_");
  if (invoice?.paidAt) return "paid";

  return "unpaid";
};

export const getInvoiceCreditStatus = (invoice) => {
  const explicit = String(invoice?.creditStatus || "").toLowerCase();
  if (explicit) return explicit.replaceAll("-", "_");

  const credited = Number(invoice?.creditedAmountMinor || 0);
  if (credited <= 0) return "none";
  if (credited >= getInvoiceTotalMinor(invoice)) return "full";

  return "partial";
};

export const getInvoiceCurrency = (invoice) =>
  String(
    invoice?.currency ??
      invoice?.totals?.currency ??
      DEFAULT_STUDIO_COMMERCE_CURRENCY,
  ).toUpperCase();

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const getInvoiceTotalMinor = (invoice) =>
  toFiniteNumber(
    invoice?.totalAmountMinor ??
      invoice?.totalGrossMinor ??
      invoice?.grossAmountMinor ??
      invoice?.amountDueMinor ??
      invoice?.totals?.totalAmountMinor ??
      invoice?.totals?.grossAmountMinor ??
      invoice?.totals?.grossMinor ??
      0,
  );

export const getInvoiceSubtotalMinor = (invoice) =>
  toFiniteNumber(
    invoice?.subtotalAmountMinor ??
      invoice?.netAmountMinor ??
      invoice?.totals?.subtotalAmountMinor ??
      invoice?.totals?.netAmountMinor ??
      invoice?.totals?.netMinor ??
      0,
  );

export const getInvoiceTaxMinor = (invoice) =>
  toFiniteNumber(
    invoice?.taxAmountMinor ??
      invoice?.totals?.taxAmountMinor ??
      invoice?.totals?.taxMinor ??
      0,
  );

export const getInvoiceAmountPaidMinor = (invoice) =>
  toFiniteNumber(invoice?.amountPaidMinor ?? 0);

export const getInvoiceAmountDueMinor = (invoice) =>
  toFiniteNumber(
    invoice?.amountDueMinor ??
      Math.max(
        0,
        getInvoiceTotalMinor(invoice) - getInvoiceAmountPaidMinor(invoice),
      ),
  );

export const getInvoiceCustomer = (invoice) =>
  invoice?.customerSnapshot ??
  invoice?.buyerSnapshot ??
  invoice?.buyer ??
  invoice?.customer ??
  {};

export const getInvoiceCustomerName = (invoice) => {
  const customer = getInvoiceCustomer(invoice);
  const name = [
    customer?.firstname ?? customer?.firstName,
    customer?.lastname ?? customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer?.legalName ||
    customer?.companyName ||
    customer?.name ||
    name ||
    customer?.email ||
    "—"
  );
};

export const getInvoiceCustomerEmail = (invoice) =>
  String(getInvoiceCustomer(invoice)?.email ?? "");

export const getInvoiceSeller = (invoice) =>
  invoice?.sellerSnapshot ?? invoice?.seller ?? {};

export const getInvoiceLines = (invoice) => {
  for (const value of [invoice?.lines, invoice?.lineItems, invoice?.items]) {
    if (Array.isArray(value)) return value;
  }

  return [];
};

export const getInvoiceLocationName = (invoice) =>
  invoice?.locationSnapshot?.name ??
  invoice?.location?.name ??
  invoice?.locationName ??
  "—";

export const getInvoiceOrderReference = (invoice) => {
  const order = invoice?.order ?? invoice?.sourceOrder;

  return String(
    invoice?.orderNumber ??
      invoice?.sourceOrderNumber ??
      invoice?.source?.id ??
      (typeof order === "object"
        ? (order?.orderNumber ?? order?.number ?? order?.customId)
        : "") ??
      "",
  );
};

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isCalendarDate = (value) => {
  if (typeof value !== "string" || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const safeTimezone = (timezone) => {
  const value = String(timezone || "UTC");

  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return "UTC";
  }
};

export const getInvoiceTimezone = (invoice, fallback = "UTC") =>
  safeTimezone(invoice?.timezone || fallback);

export const toInvoiceDateInput = (value, timezone = "UTC") => {
  if (!value) return "";
  if (isCalendarDate(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) =>
    parts.find((candidate) => candidate.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const addInvoiceCalendarDaysInput = (value, days) => {
  if (!isCalendarDate(value)) return "";

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Math.max(0, Number(days) || 0));

  return date.toISOString().slice(0, 10);
};

export const getInvoiceCalendarToday = (timezone = "UTC", now = new Date()) =>
  toInvoiceDateInput(now, timezone);

export const formatInvoiceDate = (
  value,
  locale = "en",
  timezone = "UTC",
  withTime = false,
) => {
  if (!value) return "—";

  const calendarDate = isCalendarDate(value);
  const date = calendarDate
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    // A bare YYYY-MM-DD is already a calendar date. Datetime values are
    // rendered in the immutable invoice (or current tenant) timezone.
    timeZone: calendarDate ? "UTC" : safeTimezone(timezone),
  }).format(date);
};

export const formatInvoiceMoney = (invoice, locale = "en") =>
  formatMinorCurrencyAmount(
    getInvoiceTotalMinor(invoice),
    getInvoiceCurrency(invoice),
    locale,
  );

export const isInvoiceDraft = (invoice) =>
  getInvoiceStatus(invoice) === "draft";

export const canCreditInvoice = (invoice) =>
  getInvoiceType(invoice) === "invoice" &&
  getInvoiceStatus(invoice) === "issued" &&
  Number(invoice?.creditedAmountMinor || 0) < getInvoiceTotalMinor(invoice);

export const getInvoiceError = (error, fallback) =>
  error?.data?.message ??
  error?.data?.error ??
  error?.error ??
  error?.message ??
  fallback;

export const downloadInvoiceFile = (result, fallbackFilename) => {
  const url = result?.downloadUrl ?? result?.url ?? result?.pdfUrl;
  if (!url) return false;

  const link = document.createElement("a");
  link.href = url;
  link.download = result?.filename || fallbackFilename;
  if (!result?.downloadUrl) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (result?.downloadUrl) {
    window.setTimeout(() => URL.revokeObjectURL(result.downloadUrl), 1000);
  }

  return true;
};

const csvCell = (value) => {
  const raw = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;

  return `"${safe.replaceAll('"', '""')}"`;
};

export const downloadInvoicesCsv = ({ invoices, locale, timezone, t }) => {
  const header = [
    t("table.number"),
    t("table.type"),
    t("table.customer"),
    t("table.issueDate"),
    t("table.dueDate"),
    t("table.status"),
    t("table.total"),
  ];
  const rows = invoices.map((invoice) => [
    getInvoiceNumber(invoice),
    t(`types.${getInvoiceType(invoice)}`),
    getInvoiceCustomerName(invoice),
    formatInvoiceDate(
      invoice?.issueDate ?? invoice?.issuedAt,
      locale,
      getInvoiceTimezone(invoice, timezone),
    ),
    formatInvoiceDate(
      invoice?.dueDate,
      locale,
      getInvoiceTimezone(invoice, timezone),
    ),
    t(`statuses.${getInvoiceStatus(invoice)}`),
    formatInvoiceMoney(invoice, locale),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shario-invoices-${getInvoiceCalendarToday(timezone)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const normalizeInvoicePage = (data) => {
  const invoices = Array.isArray(data)
    ? data
    : Array.isArray(data?.invoices)
      ? data.invoices
      : [];
  const pagination = data?.pagination ?? data?.meta ?? {};
  const total = Number(
    data?.total ?? data?.totalCount ?? pagination?.total ?? invoices.length,
  );
  const page = Number(data?.page ?? pagination?.page ?? 1);
  const limit = Number(data?.limit ?? pagination?.limit ?? 20);
  const totalPages = Math.max(
    Number(
      data?.totalPages ?? pagination?.totalPages ?? Math.ceil(total / limit),
    ),
    1,
  );

  return { invoices, total, page, limit, totalPages };
};
