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

export const getCreditTransactionDetails = (transaction) => {
  const details = [transaction?.reason, transaction?.description]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return [...new Set(details)].join(" · ");
};
