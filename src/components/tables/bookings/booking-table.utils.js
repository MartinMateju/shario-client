import { resolveIntlLocale } from "@/i18n/formatting";

import { ACTIVITY_TONES } from "./booking-table.constants";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();

const getId = (value) => value?._id || value?.id || value;

const sameId = (first, second) =>
  String(getId(first) || "") === String(getId(second) || "");

export const getLocalDateValue = (date = new Date()) => {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

export const countActiveFilters = (filters) =>
  Object.entries(filters || {}).filter(([key, value]) => {
    if (["search", "locationId", "futureOnly"].includes(key)) return false;
    return String(value || "").trim() !== "";
  }).length;

export const buildBookingRequest = ({
  filters,
  view,
  page,
  limit,
  sortOrder,
  isAdmin,
}) => {
  const now = new Date();
  const today = getLocalDateValue(now);
  const requestFilters = { ...filters };

  if (view === "today") {
    requestFilters.dateFrom = today;
    requestFilters.dateTo = today;
  }

  if (view === "upcoming" && !requestFilters.dateFrom) {
    requestFilters.dateFrom = today;
  }

  if (view === "awaitingPayment") {
    requestFilters.paymentStatus = "PENDING_PAYMENT";
  }

  if (view === "cancelled") {
    requestFilters.status = "cancelled";
  }

  return {
    search: requestFilters.search?.trim() || "",
    dateFrom: requestFilters.dateFrom || undefined,
    dateTo: requestFilters.dateTo || undefined,
    // Filter by the end so an ongoing booking stays visible. The API applies
    // this before pagination and counts, alongside any explicit start dates.
    endAfter: requestFilters.futureOnly ? now.toISOString() : undefined,
    lecturerId: requestFilters.lecturerId || undefined,
    productId: requestFilters.productId || undefined,
    authorId: requestFilters.authorId || undefined,
    locationId: requestFilters.locationId || undefined,
    paymentStatus: requestFilters.paymentStatus || undefined,
    status: requestFilters.status || undefined,
    isAdmin,
    page,
    limit,
    sortBy: "start",
    sortOrder,
  };
};

export const resolveBookingProduct = (booking, products = []) => {
  if (booking?.bookingProduct && typeof booking.bookingProduct === "object") {
    return booking.bookingProduct;
  }

  const productId =
    booking?.bookingProduct || booking?.product || booking?.productId;

  return products.find((product) => sameId(product, productId)) || null;
};

export const resolveBookingCustomer = (booking, users = []) => {
  const embeddedCustomer =
    booking?.customer || booking?.user || booking?.createdBy;

  if (embeddedCustomer && typeof embeddedCustomer === "object") {
    return embeddedCustomer;
  }

  const userId = booking?.customerId || booking?.userId || booking?.createdBy;

  return users.find((user) => sameId(user, userId)) || null;
};

export const getCustomerName = (customer) => {
  const firstName = customer?.firstname || customer?.firstName || "";
  const lastName = customer?.lastname || customer?.lastName || "";

  return (
    [firstName, lastName].filter(Boolean).join(" ") ||
    customer?.name ||
    customer?.customId ||
    "—"
  );
};

export const getCustomerInitials = (customer) => {
  const initials = getCustomerName(customer)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials === "—" ? "SK" : initials;
};

export const getBookingGuestCount = (booking) =>
  Number(
    booking?.numberOfGuests ?? booking?.guestsCount ?? booking?.guestCount ?? 1,
  );

export const getBookingAmount = (booking) => {
  // A current product price (or an entire multi-booking order) is not the
  // amount charged for this booking. Missing historical amounts stay unknown.
  for (const value of [
    booking?.totalPrice,
    booking?.totalAmount,
    booking?.amount,
    booking?.paymentAmount,
  ]) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value !== "number" && typeof value !== "string") continue;
    if (typeof value === "string" && !value.trim()) continue;
    const amount = Number(value);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return null;
};

export const formatMoney = (
  amount,
  locale = "en",
  currency = DEFAULT_STUDIO_COMMERCE_CURRENCY,
) => {
  if (amount === null || amount === undefined) return "—";
  const normalizedCurrency = String(
    currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
  ).toUpperCase();

  return formatMajorCurrencyAmount(amount, normalizedCurrency, locale);
};

const isSameCalendarDay = (first, second) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export const formatBookingDateTime = (booking, locale, t) => {
  const start = new Date(booking?.start);
  const end = new Date(booking?.end);

  if (Number.isNaN(start.getTime())) return "—";

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  let dateLabel;

  if (isSameCalendarDay(start, today)) {
    dateLabel = t("dates.today");
  } else if (isSameCalendarDay(start, tomorrow)) {
    dateLabel = t("dates.tomorrow");
  } else {
    dateLabel = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(start);
  }

  const timeFormatter = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startTime = timeFormatter.format(start);
  const endTime = Number.isNaN(end.getTime()) ? "" : timeFormatter.format(end);

  return `${dateLabel} · ${startTime}${endTime ? `–${endTime}` : ""}`;
};

export const getLocationLabel = (location) => {
  if (!location || typeof location !== "object") return "—";

  return location.name || location.locationName || "—";
};

export const getPaymentStatusConfig = (status) => {
  const normalized = normalizeStatus(status);
  const configs = {
    CONFIRMED: {
      labelKey: "payment.paid",
      className: "bg-[#E9F1E7] text-[#47613E]",
    },
    PAID: {
      labelKey: "payment.paid",
      className: "bg-[#E9F1E7] text-[#47613E]",
    },
    PENDING_PAYMENT: {
      labelKey: "payment.pending",
      className: "bg-[#FFF0EB] text-[#C45238]",
    },
    PENDING: {
      labelKey: "payment.pending",
      className: "bg-[#FFF0EB] text-[#C45238]",
    },
    CREDITS: {
      labelKey: "payment.credits",
      className: "bg-skab-cobalt-50 text-primary-text",
    },
    REFUNDED: {
      labelKey: "payment.refunded",
      className: "bg-[#F0EFEC] text-[#696862]",
    },
    FAILED: {
      labelKey: "payment.failed",
      className: "bg-[#FDECEC] text-[#B64242]",
    },
    EXPIRED: {
      labelKey: "payment.expired",
      className: "bg-[#F0EFEC] text-[#696862]",
    },
  };

  return (
    configs[normalized] || {
      label: status || "—",
      className: "bg-[#F0EFEC] text-[#696862]",
    }
  );
};

export const getBookingStatusConfig = (status) => {
  const normalized = normalizeStatus(status);
  const configs = {
    CONFIRMED: {
      labelKey: "status.confirmed",
      className: "bg-[#E9F1E7] text-[#47613E]",
    },
    PENDING: {
      labelKey: "status.pending",
      className: "bg-[#FFF0EB] text-[#C45238]",
    },
    PAYMENT_PENDING: {
      labelKey: "status.awaitingPayment",
      className: "bg-[#FFF0EB] text-[#C45238]",
    },
    PROCESSED: {
      labelKey: "status.processed",
      className: "bg-skab-cobalt-50 text-primary-text",
    },
    DELIVERED: {
      labelKey: "status.delivered",
      className: "bg-[#EDF0E8] text-[#5E6B4D]",
    },
    COMPLETED: {
      labelKey: "status.completed",
      className: "bg-[#EDF0E8] text-[#5E6B4D]",
    },
    CANCELLED: {
      labelKey: "status.cancelled",
      className: "bg-[#F0EFEC] text-[#696862]",
    },
  };

  return (
    configs[normalized] || {
      label: status || "—",
      className: "bg-[#F0EFEC] text-[#696862]",
    }
  );
};

export const getActivityTone = (booking, product) => {
  const source = `${booking?.tag || ""}${product?.name || ""}`;
  const hash = [...source].reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);

  return ACTIVITY_TONES[hash % ACTIVITY_TONES.length];
};

export const buildBookingSummary = ({
  bookingsData,
  bookings,
  products,
  totalCount,
}) => {
  const source = bookingsData?.summary || bookingsData?.stats || {};
  const todayValue = getLocalDateValue();

  const todayFallback = bookings.filter((booking) => {
    const start = new Date(booking?.start);
    return (
      !Number.isNaN(start.getTime()) && getLocalDateValue(start) === todayValue
    );
  }).length;

  const awaitingFallback = bookings.filter((booking) => {
    return normalizeStatus(booking?.paymentStatus) === "PENDING_PAYMENT";
  }).length;

  const revenueFallback = bookings.reduce((total, booking) => {
    if (normalizeStatus(booking?.paymentStatus) !== "CONFIRMED") return total;
    const amount = getBookingAmount(booking);
    return total === null || amount === null ? null : total + amount;
  }, 0);

  return {
    total: source.totalBookings ?? source.total ?? totalCount,
    upcoming: source.upcomingBookings ?? source.upcoming ?? null,
    today: source.todayBookings ?? source.today ?? todayFallback,
    awaitingPayment:
      source.awaitingPaymentBookings ??
      source.awaitingPayment ??
      source.pendingPayment ??
      awaitingFallback,
    cancelled: source.cancelledBookings ?? source.cancelled ?? null,
    revenue: source.revenue ?? source.totalRevenue ?? revenueFallback,
  };
};

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
};

export const exportBookingsToCsv = ({
  bookings,
  products,
  users,
  locale,
  t,
}) => {
  if (typeof window === "undefined" || bookings.length === 0) return;

  const headers = [
    t("exportColumns.id"),
    t("exportColumns.customer"),
    t("exportColumns.email"),
    t("exportColumns.booking"),
    t("exportColumns.start"),
    t("exportColumns.end"),
    t("exportColumns.location"),
    t("exportColumns.guests"),
    t("exportColumns.payment"),
    t("exportColumns.status"),
    t("exportColumns.amount"),
  ];

  const rows = bookings.map((booking) => {
    const product = resolveBookingProduct(booking, products);
    const customer = resolveBookingCustomer(booking, users);

    return [
      booking?._id || booking?.id || "",
      getCustomerName(customer),
      customer?.email || "",
      product?.name || "",
      booking?.start || "",
      booking?.end || "",
      getLocationLabel(booking?.location, t),
      getBookingGuestCount(booking),
      booking?.paymentStatus || "",
      booking?.status || "",
      getBookingAmount(booking) === null
        ? ""
        : formatMoney(
            getBookingAmount(booking),
            locale,
            booking?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
          ),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `shario-bookings-${getLocalDateValue()}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
};

export const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
};
