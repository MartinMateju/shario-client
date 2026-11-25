import { getLocalizedPublicTenantText } from "@/components/public-tenant/publicTenant.config";

import { resolveIntlLocale } from "@/i18n/formatting";

import { formatMajorCurrencyAmount, minorUnitsToMajor } from "@/utils/money";
import {
  DEFAULT_STUDIO_COMMERCE_CURRENCY,
  isStudioCommerceCurrency,
} from "@/config/currencies";

export const ORDER_TABS = [
  "all",
  "awaitingPayment",
  "processing",
  "completed",
  "failed",
  "cancelled",
];

export const PRODUCT_TYPE_OPTIONS = [
  "course",
  "workshop",
  "membership",
  "credit-pack",
  "gift-card",
  "physical-product",
  "coupon",
  "service",
  "booking-addon",
  "system",
];

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const getOrderId = (order) =>
  String(order?.id || order?._id || "").trim();

export const getOrderNumber = (order) => {
  const explicitNumber = order?.orderNumber || order?.number || order?.customId;

  if (explicitNumber) {
    const value = String(explicitNumber);
    return value.startsWith("#") ? value : `#${value}`;
  }

  const orderId = getOrderId(order);

  return orderId ? `#SK-${orderId.slice(-6).toUpperCase()}` : "—";
};

export const getOrderCustomer = (order) => {
  const user =
    order?.createdBy && typeof order.createdBy === "object"
      ? order.createdBy
      : null;

  // A legacy guest's creator can be the migration operator. The saved contact
  // snapshot identifies the customer; never fill it with the operator's details.
  if (order?.legacyOrder && order?.customer?.email) {
    return { ...order.customer };
  }

  return {
    ...(order?.customer || {}),
    ...(user || {}),
  };
};

export const getCustomerName = (order) => {
  const customer = getOrderCustomer(order);
  const fullName = [
    customer?.firstname || customer?.firstName,
    customer?.lastname || customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer?.name || customer?.email || "—";
};

export const getCustomerEmail = (order) => getOrderCustomer(order)?.email || "";

export const getCustomerInitials = (order) => {
  const customer = getOrderCustomer(order);
  const initials = `${
    customer?.firstname?.[0] || customer?.firstName?.[0] || ""
  }${customer?.lastname?.[0] || customer?.lastName?.[0] || ""}`;

  if (initials.trim()) return initials.toUpperCase();

  return (
    getCustomerName(order)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "C"
  );
};

export const getCartItems = (order) =>
  Array.isArray(order?.lineItems) && order.lineItems.length
    ? order.lineItems.map((item) => ({
        ...item,
        product: { name: item.description },
      }))
    : Array.isArray(order?.cart?.cartItems)
      ? order.cart.cartItems
      : [];

export const getProductName = (item, locale = "en") => {
  const product = item?.product || item;
  return getLocalizedPublicTenantText(product?.name, locale, "—");
};

const isMinorAmount = (value) => Number.isSafeInteger(value) && value >= 0;

// Financial values are verified by the server against immutable order and
// refund records. A cart price is not a safe fallback for a missing snapshot.
export const getSalesAmounts = (order) => {
  const amounts = order?.salesAmounts;
  if (
    amounts?.status !== "available" ||
    !isStudioCommerceCurrency(amounts.currency) ||
    !isMinorAmount(amounts.grossAmountMinor) ||
    !isMinorAmount(amounts.refundedAmountMinor) ||
    !isMinorAmount(amounts.netAmountMinor) ||
    amounts.grossAmountMinor - amounts.refundedAmountMinor !==
      amounts.netAmountMinor
  )
    return null;
  return { ...amounts, currency: amounts.currency.trim().toUpperCase() };
};

export const getOrderTotal = (order) => {
  const amounts = getSalesAmounts(order);
  return amounts
    ? minorUnitsToMajor(amounts.grossAmountMinor, amounts.currency)
    : null;
};

export const getOrderLineAmount = (order, item) => {
  const amounts = getSalesAmounts(order);
  const lines = order?.lineItems;
  if (
    !amounts ||
    !Array.isArray(lines) ||
    !lines.length ||
    lines.some((line) => !isMinorAmount(line.grossAmountMinor)) ||
    lines.reduce((total, line) => total + line.grossAmountMinor, 0) !==
      amounts.grossAmountMinor ||
    !isMinorAmount(item?.grossAmountMinor)
  )
    return null;
  return minorUnitsToMajor(item.grossAmountMinor, amounts.currency);
};

export const summarizePaidOrderValue = (
  orders,
  { isTruncated = false } = {},
) => {
  if (isTruncated) return { amount: null, currency: null, reason: "truncated" };
  const paid = orders.filter((order) => order?.isPaid === true);
  const amounts = paid.map(getSalesAmounts);
  if (amounts.some((value) => !value)) {
    return { amount: null, currency: null, reason: "incomplete" };
  }
  const currencies = new Set(amounts.map((value) => value.currency));
  if (currencies.size > 1)
    return { amount: null, currency: null, reason: "mixedCurrencies" };
  const totalMinor = amounts.reduce(
    (total, value) => total + value.netAmountMinor,
    0,
  );
  if (!Number.isSafeInteger(totalMinor))
    return { amount: null, currency: null, reason: "incomplete" };
  const currency = amounts[0]?.currency || null;
  return {
    amount: currency ? minorUnitsToMajor(totalMinor, currency) : 0,
    currency,
    reason: null,
  };
};

export const getOrderCurrency = (order) => {
  const firstProduct = getCartItems(order)[0]?.product;

  return String(
    order?.salesAmounts?.currency ||
      order?.currency ||
      order?.cart?.currency ||
      firstProduct?.currency ||
      DEFAULT_STUDIO_COMMERCE_CURRENCY,
  ).toUpperCase();
};

export const formatMoney = (
  value,
  currency = DEFAULT_STUDIO_COMMERCE_CURRENCY,
  locale = "en",
) =>
  value === null || value === undefined
    ? "—"
    : formatMajorCurrencyAmount(value, currency, locale);

const isSameCalendarDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const formatOrderTimestamp = (value, locale = "en", t) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (isSameCalendarDay(date, now)) return `${t("dates.today")}, ${time}`;
  if (isSameCalendarDay(date, yesterday)) {
    return `${t("dates.yesterday")}, ${time}`;
  }

  const day = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    day: "numeric",
    month: "short",
  }).format(date);

  return `${day}, ${time}`;
};

export const formatFullDate = (value, locale = "en") => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const getOrderStatusKey = (order) => {
  const status = String(order?.status || "").toLowerCase();

  if (status === "failed_order" || status === "failed") return "failed";
  if (status === "cancelled_order" || status === "cancelled") {
    return "cancelled";
  }
  if (status === "processing_order" || status === "processing") {
    return "processing";
  }
  if (status === "processed_order" || status === "completed") {
    return "completed";
  }

  // A paid pending order is already safe to fulfil while its final processing
  // work is still running. This preserves the approved Processing state without
  // sending an unsupported status value to the current backend validator.
  if (order?.isPaid) return "processing";

  return "awaitingPayment";
};

export const getPaymentStatusKey = (order) => {
  // Processing an order can fail after its payment has succeeded.
  if (order?.isPaid) return "paid";
  if (getOrderStatusKey(order) === "failed") return "failed";
  return "unpaid";
};

export const getPaymentMethodKey = (order) => {
  const explicitMethod = String(
    order?.paymentMethod || order?.payment?.method || "",
  ).toLowerCase();

  if (explicitMethod.includes("credit")) return "credits";
  if (explicitMethod.includes("cash")) return "cash";
  if (explicitMethod.includes("bank")) return "bankTransfer";
  if (explicitMethod.includes("card") || order?.stripe?.paymentIntentId) {
    return "card";
  }

  if (order?.isPaid && order?.legacyOrder) return "unknown";
  return order?.isPaid ? "credits" : "online";
};

export const getPaymentReference = (order) =>
  order?.payment?.cardLast4 || order?.cardLast4 || "";

export const getRangeStart = (range) => {
  if (range === "all") return undefined;

  const date = new Date();

  if (range === "month") {
    date.setDate(1);
  } else {
    const days = Number.parseInt(range, 10);
    date.setDate(date.getDate() - (Number.isFinite(days) ? days : 30));
  }

  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

export const getBackendStatus = (statusKey) => {
  if (statusKey === "completed") return "processed_order";
  if (statusKey === "failed") return "failed_order";
  if (statusKey === "cancelled") return "cancelled_order";
  if (statusKey === "awaitingPayment" || statusKey === "processing") {
    return "pending_order";
  }

  return undefined;
};

export const isPendingSubgroup = (statusKey) =>
  statusKey === "awaitingPayment" || statusKey === "processing";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const buildOrdersCsv = ({ orders, locale, t }) => {
  const header = [
    t("columns.order"),
    t("columns.customer"),
    t("columns.products"),
    t("columns.total"),
    t("money.refunded"),
    t("money.net"),
    t("csv.currency"),
    t("csv.amountStatus"),
    t("columns.payment"),
    t("columns.status"),
    t("csv.createdAt"),
  ];

  const rows = orders.map((order) => {
    const amounts = getSalesAmounts(order);
    const products = getCartItems(order)
      .map((item) => {
        const quantity = Number(item?.quantity || 1);
        const suffix = quantity > 1 ? ` × ${quantity}` : "";
        return `${getProductName(item, locale)}${suffix}`;
      })
      .join(", ");

    return [
      getOrderNumber(order),
      `${getCustomerName(order)} <${getCustomerEmail(order)}>`,
      products,
      amounts
        ? minorUnitsToMajor(amounts.grossAmountMinor, amounts.currency)
        : "",
      amounts
        ? minorUnitsToMajor(amounts.refundedAmountMinor, amounts.currency)
        : "",
      amounts
        ? minorUnitsToMajor(amounts.netAmountMinor, amounts.currency)
        : "",
      amounts?.currency || "",
      t(amounts ? "money.verified" : "money.unavailable"),
      t(`payments.${getPaymentStatusKey(order)}`),
      t(`statuses.${getOrderStatusKey(order)}`),
      formatFullDate(order?.createdAt, locale),
    ];
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
};

export const downloadOrdersCsv = ({ orders, locale, t }) => {
  const csv = buildOrdersCsv({ orders, locale, t });
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `shario-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
