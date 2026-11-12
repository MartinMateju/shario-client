import { defineRouting } from "next-intl/routing";

import { DEFAULT_LOCALE, getEnabledLocaleCodes } from "./locales";

export const enabledLocaleCodes = getEnabledLocaleCodes(
  process.env.NEXT_PUBLIC_ENABLED_LOCALES,
  {
    nodeEnv: process.env.NODE_ENV,
    previewGate: process.env.NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES,
  },
);

export const routing = defineRouting({
  locales: enabledLocaleCodes,
  defaultLocale: DEFAULT_LOCALE,

  localePrefix: "always",
  localeDetection: true,

  localeCookie: {
    name: "NEXT_LOCALE",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  },
});
