import { CUSTOMER_AVATAR_TONES } from "./people-table.constants";
import {
  formatMajorCurrencyAmount,
  formatMinorCurrencyAmount,
} from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { formatMakerId, normalizeMemberNumber } from "@/utils/memberIdentity";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const humanizeValue = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const KNOWN_ENUM_TRANSLATIONS = new Set([
  "roles.owner",
  "roles.admin",
  "roles.manager",
  "roles.moderator",
  "roles.lecturer",
  "roles.instructor",
  "roles.staff",
  "access.full",
  "access.schedule",
  "access.bookings",
  "access.limited",
  "access.read_only",
]);

export const translateValue = (t, key, fallback) => {
  if (typeof t?.has === "function" && !t.has(key)) {
    return fallback || humanizeValue(key.split(".").at(-1));
  }

  if (typeof t?.has !== "function" && !KNOWN_ENUM_TRANSLATIONS.has(key)) {
    return fallback || humanizeValue(key.split(".").at(-1));
  }

  try {
    return t(key);
  } catch {
    return fallback || humanizeValue(key.split(".").at(-1));
  }
};

export const getId = (item) => item?._id || item?.id || item?.userId;

export const normalizeCollection = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

export const getFullName = (item) => {
  const firstName = item?.firstname || item?.firstName || "";
  const lastName = item?.lastname || item?.lastName || "";

  return (
    [firstName, lastName].filter(Boolean).join(" ") ||
    item?.name ||
    item?.displayName ||
    formatMakerId(item?.memberNumber, "") ||
    "—"
  );
};

export const getInitials = (item) => {
  const initials = getFullName(item)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials === "—" ? "SK" : initials;
};

export const getAvatarTone = (item) => {
  const seed = String(getId(item) || item?.email || getFullName(item));
  const index = [...seed].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );

  return CUSTOMER_AVATAR_TONES[index % CUSTOMER_AVATAR_TONES.length];
};

export const getAvatarUrl = (item) =>
  item?.avatarUrl || item?.avatar || item?.image || item?.photo || null;

export const getCustomerMembership = (customer) => {
  const membership =
    customer?.activeMembership ||
    customer?.currentMembership ||
    customer?.membership ||
    customer?.membershipPlan;

  if (!membership) return { key: "none", label: "" };

  if (typeof membership === "string") {
    return {
      key: membership.toLowerCase().replaceAll(" ", "_"),
      label: membership,
    };
  }

  const label =
    membership.name ||
    membership.title ||
    membership.planName ||
    membership.plan ||
    membership.type ||
    "";

  return {
    key: String(membership.slug || membership.key || label || "none")
      .toLowerCase()
      .replaceAll(" ", "_"),
    label,
  };
};

const toFiniteNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export const getMembershipTone = (membershipKey) => {
  const key = String(membershipKey || "").toLowerCase();

  if (key === "none") return "bg-[#F0EFEC] text-[#696863]";
  if (key.includes("studio") || key.includes("pass")) {
    return "bg-[#FFF0EA] text-[#D65338]";
  }
  if (key.includes("clay") || key.includes("club")) {
    return "bg-[#FBF2DA] text-[#80621C]";
  }
  if (key.includes("hour") || key.includes("pack") || key.includes("credit")) {
    return "bg-skab-cobalt-100 text-primary-text";
  }

  return "bg-[#EAF1E5] text-[#536342]";
};

export const getCustomerCredits = (customer) =>
  toFiniteNumber(
    customer?.moneyCredits ??
      customer?.creditBalance ??
      customer?.creditsBalance ??
      customer?.credits?.balance ??
      customer?.credits ??
      customer?.balance ??
      0,
  );

export const getCustomerTotalSpent = (customer) => {
  const value =
    customer?.totalSpent ??
    customer?.lifetimeValue ??
    customer?.lifetimeSpend ??
    customer?.revenue ??
    customer?.statistics?.totalSpent;
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

export const getCustomerLastBooking = (customer) => {
  if (Object.hasOwn(customer || {}, "lastBookingAt")) {
    return customer.lastBookingAt || null;
  }

  return (
    customer?.lastBooking?.start ||
    customer?.lastBooking?.date ||
    customer?.statistics?.lastBookingAt ||
    null
  );
};

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

export const getCustomerStatus = (customer) => {
  const status = normalizeStatus(
    customer?.customerStatus || customer?.accountStatus || customer?.status,
  );

  if (["invited", "pending", "pending_invitation"].includes(status)) {
    return "invited";
  }

  if (["inactive", "disabled", "archived", "blocked"].includes(status)) {
    return "inactive";
  }

  if (
    customer?.isAccessGranted === false ||
    customer?.isActive === false ||
    customer?.active === false
  ) {
    return "inactive";
  }

  if (customer?.invitedAt && !customer?.lastLoginAt && !customer?.activatedAt) {
    return "invited";
  }

  return "active";
};

export const getStaffRole = (staff) => {
  const rawRole =
    staff?.tenantRole ||
    staff?.role?.name ||
    staff?.role ||
    (staff?.isOwner && "owner") ||
    (staff?.isAdmin && "admin") ||
    "lecturer";

  return String(rawRole).toLowerCase().replaceAll(" ", "_");
};

export const getStaffAccess = (staff) => {
  const access =
    staff?.accessLevel ||
    staff?.permissionsLabel ||
    staff?.access ||
    (staff?.isAdmin ? "full" : "schedule");

  if (Array.isArray(access)) return access.join(", ");
  return String(access || "schedule")
    .toLowerCase()
    .replaceAll(" ", "_");
};

export const getStaffLocation = (staff) =>
  staff?.location?.name ||
  staff?.locationName ||
  staff?.studio?.name ||
  staff?.studioName ||
  staff?.location ||
  "all";

export const getStaffLastActive = (staff) =>
  staff?.lastActiveAt || staff?.lastLoginAt || staff?.updatedAt || null;

export const getStaffStatus = (staff) => {
  const status = normalizeStatus(
    staff?.memberStatus || staff?.accountStatus || staff?.status,
  );

  if (["invited", "pending", "pending_invitation"].includes(status)) {
    return "invited";
  }

  if (["inactive", "disabled", "archived", "blocked"].includes(status)) {
    return "inactive";
  }

  if (staff?.isActive === false || staff?.active === false) return "inactive";
  if (staff?.invitedAt && !staff?.lastLoginAt && !staff?.activatedAt)
    return "invited";

  return "active";
};

export const getStatusTone = (status) => {
  const tones = {
    active: "bg-[#E8F0E3] text-[#4C6040]",
    invited: "bg-skab-cobalt-100 text-primary-text",
    inactive: "bg-[#EFEEEB] text-[#686762]",
  };

  return tones[status] || tones.inactive;
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

export const formatCustomerTotalSpent = (customer, locale = "en") => {
  if (Object.hasOwn(customer || {}, "totalSpentByCurrency")) {
    const totals = customer.totalSpentByCurrency;
    // Null means the API could not expose an authoritative total. Do not
    // replace it with a stale legacy value or invent a zero balance.
    if (!Array.isArray(totals)) return "—";
    if (totals.length === 0) {
      return customer.totalSpentCurrency
        ? formatMoney(0, locale, customer.totalSpentCurrency)
        : "0";
    }
    if (
      totals.some(
        (total) =>
          typeof total?.amountMinor !== "number" ||
          !Number.isSafeInteger(total.amountMinor) ||
          total.amountMinor < 0 ||
          !/^[A-Z]{3}$/.test(total?.currency || ""),
      )
    ) {
      return "—";
    }

    // Recorded currencies stay separate; there is no implicit conversion.
    return totals
      .map(({ currency, amountMinor }) =>
        formatMinorCurrencyAmount(amountMinor, currency, locale),
      )
      .join(" · ");
  }

  return formatMoney(
    getCustomerTotalSpent(customer),
    locale,
    customer?.totalSpentCurrency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
  );
};

const isSameCalendarDay = (first, second) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export const formatRelativeDate = (value, locale, t, { never = true } = {}) => {
  if (!value) return never ? t("dates.never") : "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameCalendarDay(date, now)) return t("dates.today");
  if (isSameCalendarDay(date, yesterday)) return t("dates.yesterday");

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
};

const isThisMonth = (value) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

export const buildPeopleSummary = ({ usersData, customers }) => {
  const sourceSummary = usersData?.summary || usersData?.meta?.summary || {};

  const calculated = customers.reduce(
    (summary, customer) => {
      const membership = getCustomerMembership(customer);
      summary.credits += getCustomerCredits(customer);
      if (membership.key !== "none") summary.activeMemberships += 1;
      if (isThisMonth(customer?.createdAt || customer?.registeredAt)) {
        summary.newThisMonth += 1;
      }
      if (getCustomerStatus(customer) !== "active") summary.needsAttention += 1;
      return summary;
    },
    { credits: 0, activeMemberships: 0, newThisMonth: 0, needsAttention: 0 },
  );

  return {
    totalCustomers:
      sourceSummary.totalCustomers ?? usersData?.totalCount ?? customers.length,
    activeMemberships:
      sourceSummary.activeMemberships ?? calculated.activeMemberships,
    credits:
      sourceSummary.customerCredits ??
      sourceSummary.credits ??
      calculated.credits,
    newThisMonth: sourceSummary.newThisMonth ?? calculated.newThisMonth,
    needsAttention:
      sourceSummary.needsAttention ??
      sourceSummary.inactiveCustomers ??
      calculated.needsAttention,
  };
};

const normalizeCustomerFilterText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeCustomerFilterKey = (value) =>
  normalizeCustomerFilterText(value).replace(/[\s-]+/g, "_");

export const filterCustomers = (customers, filters = {}) => {
  const search = normalizeCustomerFilterText(filters.search);
  const membershipFilter = normalizeCustomerFilterKey(filters.membership);
  const statusFilter = normalizeCustomerFilterKey(filters.status);

  return customers.filter((customer) => {
    const membership = getCustomerMembership(customer);
    const memberNumber = normalizeMemberNumber(customer?.memberNumber);
    const haystack = [
      getFullName(customer),
      customer?.email,
      customer?.customId,
      customer?.phone,
      customer?.phoneNumber,
      memberNumber,
      memberNumber ? `#${memberNumber}` : "",
    ]
      .map(normalizeCustomerFilterText)
      .filter(Boolean)
      .join(" ");

    return (
      (!search || haystack.includes(search)) &&
      (!membershipFilter ||
        normalizeCustomerFilterKey(membership.key) === membershipFilter) &&
      (!statusFilter ||
        normalizeCustomerFilterKey(getCustomerStatus(customer)) ===
          statusFilter)
    );
  });
};

export const buildMembershipOptions = (customers) => {
  const options = new Map();

  customers.forEach((customer) => {
    const membership = getCustomerMembership(customer);
    if (membership.key !== "none" && membership.label) {
      options.set(membership.key, membership.label);
    }
  });

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label));
};

export const buildStaffRoleOptions = (staff) =>
  [...new Set(staff.map(getStaffRole).filter(Boolean))].sort();

const csvEscape = (value) => {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
};

const downloadCsv = (rows, fileName) => {
  if (typeof document === "undefined") return;

  const content = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportCustomersToCsv = ({ customers, locale, t }) => {
  const rows = [
    [
      t("exportColumns.name"),
      t("exportColumns.memberId"),
      t("exportColumns.email"),
      t("exportColumns.phone"),
      t("exportColumns.membership"),
      t("exportColumns.credits"),
      t("exportColumns.lastBooking"),
      t("exportColumns.totalSpent"),
      t("exportColumns.status"),
    ],
    ...customers.map((customer) => {
      const membership = getCustomerMembership(customer);
      return [
        getFullName(customer),
        normalizeMemberNumber(customer?.memberNumber),
        customer?.email || "",
        customer?.phone || customer?.phoneNumber || "",
        membership.label || t("membership.none"),
        formatMoney(getCustomerCredits(customer), locale),
        formatRelativeDate(getCustomerLastBooking(customer), locale, t, {
          never: false,
        }),
        formatCustomerTotalSpent(customer, locale),
        t(`status.${getCustomerStatus(customer)}`),
      ];
    }),
  ];

  downloadCsv(rows, "shario-customers.csv");
};

export const exportStaffToCsv = ({ staff, locale, t }) => {
  const rows = [
    [
      t("exportColumns.name"),
      t("exportColumns.email"),
      t("exportColumns.phone"),
      t("exportColumns.role"),
      t("exportColumns.access"),
      t("exportColumns.location"),
      t("exportColumns.lastActive"),
      t("exportColumns.status"),
    ],
    ...staff.map((member) => [
      getFullName(member),
      member?.email || "",
      member?.phone || member?.phoneNumber || "",
      translateValue(t, `roles.${getStaffRole(member)}`),
      translateValue(t, `access.${getStaffAccess(member)}`),
      getStaffLocation(member),
      formatRelativeDate(getStaffLastActive(member), locale, t),
      t(`status.${getStaffStatus(member)}`),
    ]),
  ];

  downloadCsv(rows, "shario-team-members.csv");
};
