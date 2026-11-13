const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toNonNegativeInteger = (value, fallback) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getCreditTransactionPagination = (
  response,
  { page = 1, limit = 15 } = {},
) => {
  const transactions = Array.isArray(response?.transactions)
    ? response.transactions
    : [];
  const pagination = response?.pagination ?? response?.meta ?? {};
  const currentPage = toPositiveInteger(
    pagination?.page ?? response?.page,
    toPositiveInteger(page, 1),
  );
  const pageSize = toPositiveInteger(
    pagination?.limit ?? response?.limit,
    toPositiveInteger(limit, transactions.length || 15),
  );
  const totalCount = toNonNegativeInteger(
    pagination?.totalCount ?? response?.totalCount ?? response?.total,
    transactions.length,
  );
  const totalPages = toNonNegativeInteger(
    pagination?.totalPages ?? response?.totalPages,
    totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
  );

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
  };
};

export const getCreditTransactionDescription = (transaction, language) => {
  const isCzech = language === "CZ";

  switch (transaction?.type) {
    case "added":
      return isCzech ? "Kredity přidány" : "Credits added";
    case "used":
      return isCzech ? "Kredity použity" : "Credits used";
    case "refund":
      return isCzech ? "Kredity vráceny" : "Credits refunded";
    case "coupon_redeemed":
      return isCzech ? "Poukaz uplatněn" : "Coupon redeemed";
    case "admin_granted":
      return isCzech ? "Přidáno studiem" : "Granted by studio";
    case "purchased":
      return isCzech ? "Zakoupené kredity" : "Purchased credits";
    default:
      return isCzech ? "Kreditní transakce" : "Credit transaction";
  }
};

export const getCreditTransactionDetails = (
  transaction,
  { orderLabel = "" } = {},
) => {
  const type = transaction?.type;
  let reason = String(transaction?.reason || "").trim();
  let description = String(transaction?.description || "").trim();

  // Historical API records mix system prose with tenant-authored notes. Strip
  // only known system templates; the translated transaction heading supplies
  // their label, while names, references and custom reasons remain visible.
  const defaultDescriptions = {
    added: "Credits added",
    used: "Credits used",
    refund: "Credits refunded",
  };
  if (description === defaultDescriptions[type]) description = "";

  if (
    type === "admin_granted" &&
    description.startsWith("Admin granted credits: ")
  ) {
    description = description.slice("Admin granted credits: ".length).trim();
  }

  const orderMatch =
    type === "added" || type === "purchased"
      ? /^Credits purchased \(order ([^)]+)\)$/.exec(description)
      : type === "used"
        ? /^Credits used as discount \(order ([^)]+)\)$/.exec(description) ||
          /^Payment with credits for order (.+)$/.exec(description)
        : null;
  if (orderMatch) {
    description = [orderLabel, orderMatch[1]].filter(Boolean).join(" ");
  }

  if (type === "refund") {
    const bookingMatch =
      /^Refund for (?:added booking time|cancelled booking) - (.*)$/.exec(
        description,
      );
    if (bookingMatch) description = bookingMatch[1].trim();
    if (
      description === "Refund for an administratively cancelled Class place"
    ) {
      description = "";
    }
    if (
      description ===
      "Booking payment returned to the converted voucher's studio-credit wallet"
    ) {
      description = "";
      if (reason === "Booking refund after voucher conversion") reason = "";
    }
  }

  if (type === "coupon_redeemed") {
    const voucherMatch =
      /^Uplatněn poukaz ([A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}) \((.*)\)$/.exec(
        description,
      );
    if (voucherMatch) {
      description =
        voucherMatch[2] && voucherMatch[2] !== "Voucher"
          ? `${voucherMatch[1]} (${voucherMatch[2]})`
          : voucherMatch[1];
      if (reason === "coupon redeemed") reason = "";
    }
  }

  if (
    ["migration_credit", "migration_debit"].includes(type) &&
    description === "Imported source credit allocation adjustment"
  ) {
    description = "";
    if (reason === "migration") reason = "";
  }
  if (
    ["migration_rollback_credit", "migration_rollback_debit"].includes(type) &&
    description === "Import rollback credit compensation"
  ) {
    description = "";
    if (reason === "migration_rollback") reason = "";
  }

  const details = [reason, description].filter(Boolean);

  return [...new Set(details)].join(" · ");
};
