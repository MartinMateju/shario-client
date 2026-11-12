import { readFileSync } from "node:fs";
import path from "node:path";

import { ROLLOUT_ELIGIBLE_LOCALE_CODES } from "../../src/i18n/locales.js";

export const homepageLocales = ROLLOUT_ELIGIBLE_LOCALE_CODES;

// Read raw catalogs so the English fallback cannot hide missing translations.
export const homepageCatalogs = Object.fromEntries(
  homepageLocales.map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        path.join(process.cwd(), "src/messages", `${locale}.json`),
        "utf8",
      ),
    ),
  ]),
);
