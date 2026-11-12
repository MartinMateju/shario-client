// Calendar references are public member numbers, never internal user IDs.
export const normalizeCalendarCustomerReference = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const reference = String(value).trim().replace(/^#+/, "");
  if (!/^\d{1,16}$/.test(reference)) return "";
  const number = Number(reference);
  return Number.isSafeInteger(number) && number > 0 ? reference : "";
};
