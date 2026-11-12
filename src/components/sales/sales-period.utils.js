export function localDateValue(date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// Parse calendar dates locally: Date("YYYY-MM-DD") would interpret them as UTC.
function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && localDateValue(date) === value
    ? date
    : null;
}

export function getSalesPeriod(filters, referenceDate = new Date()) {
  if (filters.dateRange === "all") {
    return { from: "", to: "", dateFrom: undefined, dateTo: undefined };
  }

  let from;
  let to;
  if (filters.dateRange === "custom") {
    from = parseLocalDate(filters.dateFrom);
    to = parseLocalDate(filters.dateTo);
    if (!from || !to || from > to) {
      throw new RangeError("A sales period requires valid, ordered dates.");
    }
  } else {
    to = new Date(referenceDate);
    to.setHours(0, 0, 0, 0);
    from = new Date(to);
    if (filters.dateRange === "month") {
      from.setDate(1);
    } else {
      const days = ["7", "30", "90"].includes(filters.dateRange)
        ? Number(filters.dateRange)
        : 30;
      from.setDate(from.getDate() - (days - 1));
    }
  }

  to.setHours(23, 59, 59, 999);
  return {
    from: localDateValue(from),
    to: localDateValue(to),
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  };
}

export function formatSalesPeriod(period, locale) {
  if (!period.from || !period.to) return "";
  const formatter = new Intl.DateTimeFormat(
    locale === "cs" ? "cs-CZ" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
  return formatter.formatRange(
    parseLocalDate(period.from),
    parseLocalDate(period.to),
  );
}
