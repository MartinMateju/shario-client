import { getRequestConfig } from "next-intl/server";

import { loadMessages } from "./catalogs";
import { resolveLocale, resolveTimeZone } from "./locales";
import { routing } from "./routing";

const timeZone = resolveTimeZone(process.env.NEXT_PUBLIC_DEFAULT_TIME_ZONE);

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = resolveLocale(requestedLocale, routing.locales);

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone,
  };
});
