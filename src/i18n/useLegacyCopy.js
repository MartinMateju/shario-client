"use client";

import { useMemo } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { legacyCopySchema } from "./legacyCopySchema";

export function createLocalizedCopy(
  messages,
  translate,
  schema = {},
  path = "",
) {
  const definition = schema[path];
  if (definition?.parameters) {
    return (...args) => {
      const values = {};
      definition.parameters.forEach((parameter, index) => {
        if (Array.isArray(parameter)) {
          parameter.forEach((name) => {
            values[name] = args[index]?.[name];
          });
        } else {
          values[parameter] = args[index];
        }
      });
      return translate(path, values);
    };
  }
  if (typeof messages === "string") return messages;
  const entries = Object.entries(messages).map(([key, value]) => [
    key,
    createLocalizedCopy(
      value,
      translate,
      schema,
      path ? `${path}.${key}` : key,
    ),
  ]);
  return definition?.array
    ? entries.map(([, value]) => value)
    : Object.fromEntries(entries);
}

/** Customer UI copy is always read from the active locale, including legacy screens. */
export function useLegacyCopy(name) {
  const messages = useMessages();
  const translate = useTranslations(`Legacy.screens.${name}`);
  const catalog = messages.Legacy.screens[name];
  return useMemo(
    () => createLocalizedCopy(catalog, translate, legacyCopySchema[name]),
    [catalog, name, translate],
  );
}

export function useLegacyText() {
  return useTranslations("Legacy.copy");
}

export function useLegacyLocale() {
  return useLocale();
}
