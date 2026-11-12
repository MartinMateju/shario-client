const getWeekRange = (value) => {
  const first = new Date(value);
  first.setHours(12, 0, 0, 0);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const last = new Date(first);
  last.setDate(last.getDate() + 6);

  return [first, last];
};

const CZECH_GENITIVE_MONTHS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

export function getCalendarTitle(view, date, locale) {
  if (view === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (view === "day") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  const [first, last] = getWeekRange(date);
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    if (String(locale).toLowerCase().startsWith("cs")) {
      return `${first.getDate()}.–${last.getDate()}. ${CZECH_GENITIVE_MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    }

    const monthYear = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(last);

    return `${first.getDate()}–${last.getDate()} ${monthYear}`;
  }

  const firstLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(first);
  const lastLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(last);

  return `${firstLabel} – ${lastLabel}`;
}
