"use client";

import { useMemo } from "react";
import { useMessages } from "next-intl";

// Older customer components still address labels as translation.KEY[language].
// Resolve those labels from the active next-intl catalog, so Redux's historic
// CZ/EN compatibility value cannot silently switch a customer's UI to English.
export function createLegacyTranslation(catalog) {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [
      key,
      typeof value === "string"
        ? { CZ: value, EN: value }
        : createLegacyTranslation(value),
    ]),
  );
}

export function useLegacyTranslation() {
  const messages = useMessages();
  return useMemo(
    () =>
      createLegacyTranslation(
        Object.fromEntries(
          Object.entries(messages.Legacy).filter(([key]) => /^[A-Z]/.test(key)),
        ),
      ),
    [messages.Legacy],
  );
}
