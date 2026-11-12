import { normalizeLocaleCode } from "./locales";

export const resolveBrowserLocale = (acceptLanguage, supportedLocales) => {
  const preferences = String(acceptLanguage || "")
    .split(",")
    .map((entry, index) => {
      const [language, ...parameters] = entry.trim().split(";");
      const weight = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const quality = weight ? Number(weight.trim().slice(2)) : 1;
      return { locale: normalizeLocaleCode(language), quality, index };
    })
    .filter(
      ({ locale, quality }) =>
        locale && Number.isFinite(quality) && quality > 0 && quality <= 1,
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    );
  return (
    preferences.find(({ locale }) => supportedLocales.includes(locale))
      ?.locale || null
  );
};
