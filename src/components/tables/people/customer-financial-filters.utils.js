import {
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
} from "@/utils/money";

export const EMPTY_FINANCIAL_FILTERS = Object.freeze({
  spendMin: "",
  spendMax: "",
  spendFrom: "",
  spendTo: "",
  creditMin: "",
  creditMax: "",
});

const amountFields = ["spendMin", "spendMax", "creditMin", "creditMax"];
const dateFields = ["spendFrom", "spendTo"];

export const pickFinancialFilters = (filters = {}) =>
  Object.fromEntries(
    Object.keys(EMPTY_FINANCIAL_FILTERS).map((key) => [
      key,
      String(filters[key] ?? ""),
    ]),
  );

export const hasSpendingPeriod = (filters = {}) =>
  Boolean(filters.spendFrom || filters.spendTo);

export const validateFinancialFilters = (filters, currency = "CZK") => {
  const values = pickFinancialFilters(filters);
  const errors = {};
  const factor = 10 ** getStripeMinorUnitDigits(currency);

  for (const field of amountFields) {
    const value = values[field].trim().replace(/\s/g, "").replace(",", ".");
    values[field] = value;
    if (!value) continue;
    const amount = Number(value);
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(Math.round(amount * factor)) ||
      !isValidMajorCurrencyPrecision(amount, currency)
    ) {
      errors[field] = "invalidAmount";
    } else {
      values[field] = String(amount);
    }
  }

  for (const field of dateFields) {
    const value = values[field].trim();
    values[field] = value;
    if (!value) continue;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      errors[field] = "invalidDate";
    }
  }

  for (const [min, max, key] of [
    ["spendMin", "spendMax", "spendingRange"],
    ["creditMin", "creditMax", "creditRange"],
  ]) {
    if (
      values[min] !== "" &&
      values[max] !== "" &&
      !errors[min] &&
      !errors[max] &&
      Number(values[min]) > Number(values[max])
    ) {
      errors[key] = key;
    }
  }
  if (
    values.spendFrom &&
    values.spendTo &&
    !errors.spendFrom &&
    !errors.spendTo &&
    values.spendFrom > values.spendTo
  ) {
    errors.dateRange = "dateRange";
  }
  return { values, errors };
};

export const financialFiltersDiffer = (first, second) =>
  Object.keys(EMPTY_FINANCIAL_FILTERS).some(
    (key) => String(first?.[key] ?? "") !== String(second?.[key] ?? ""),
  );

export const countFinancialFilters = (filters = {}) =>
  [
    ["spendMin", "spendMax"],
    ["spendFrom", "spendTo"],
    ["creditMin", "creditMax"],
  ].filter((fields) =>
    fields.some((key) => String(filters[key] ?? "").trim() !== ""),
  ).length;
