import { DEFAULT_LOCALE, normalizeLocaleCode } from "./locales";

const MESSAGE_CATALOG_LOADERS = Object.freeze({
  en: () => import("../messages/en.json").then((module) => module.default),
  cs: () => import("../messages/cs.json").then((module) => module.default),
  de: () => import("../messages/de.json").then((module) => module.default),
  pl: () => import("../messages/pl.json").then((module) => module.default),
  sk: () => import("../messages/sk.json").then((module) => module.default),
  da: () => import("../messages/da.json").then((module) => module.default),
  fr: () => import("../messages/fr.json").then((module) => module.default),
  es: () => import("../messages/es.json").then((module) => module.default),
  it: () => import("../messages/it.json").then((module) => module.default),
  "pt-PT": () =>
    import("../messages/pt-PT.json").then((module) => module.default),
  sv: () => import("../messages/sv.json").then((module) => module.default),
  nb: () => import("../messages/nb.json").then((module) => module.default),
  fi: () => import("../messages/fi.json").then((module) => module.default),
  hu: () => import("../messages/hu.json").then((module) => module.default),
  el: () => import("../messages/el.json").then((module) => module.default),
  tr: () => import("../messages/tr.json").then((module) => module.default),
  nl: () => import("../messages/nl.json").then((module) => module.default),
  ro: () => import("../messages/ro.json").then((module) => module.default),
});
export const CATALOG_LOCALE_CODES = Object.freeze(
  Object.keys(MESSAGE_CATALOG_LOADERS),
);
const catalogPromises = new Map();

// Each supported locale owns its entire catalog. Missing translations must be
// caught by i18n:check, never silently replaced with English at runtime.
export function loadMessages(value) {
  const locale = normalizeLocaleCode(value) || DEFAULT_LOCALE;
  const catalogLocale = MESSAGE_CATALOG_LOADERS[locale]
    ? locale
    : DEFAULT_LOCALE;

  if (catalogPromises.has(catalogLocale)) {
    return catalogPromises.get(catalogLocale);
  }

  const messagesPromise = MESSAGE_CATALOG_LOADERS[catalogLocale]();

  catalogPromises.set(catalogLocale, messagesPromise);

  return messagesPromise;
}
