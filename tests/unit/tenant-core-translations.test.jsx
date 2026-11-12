import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { loadMessages } from "@/i18n/catalogs";
import messagesDa from "@/messages/da.json";
import messagesDe from "@/messages/de.json";
import messagesEn from "@/messages/en.json";
import messagesEs from "@/messages/es.json";
import messagesFi from "@/messages/fi.json";
import messagesEl from "@/messages/el.json";
import messagesFr from "@/messages/fr.json";
import messagesHu from "@/messages/hu.json";
import messagesIt from "@/messages/it.json";
import messagesNb from "@/messages/nb.json";
import messagesNl from "@/messages/nl.json";
import messagesPl from "@/messages/pl.json";
import messagesPt from "@/messages/pt-PT.json";
import messagesRo from "@/messages/ro.json";
import messagesSk from "@/messages/sk.json";
import messagesSv from "@/messages/sv.json";
import messagesTr from "@/messages/tr.json";

const catalogs = Object.freeze({
  da: messagesDa,
  de: messagesDe,
  es: messagesEs,
  fi: messagesFi,
  el: messagesEl,
  fr: messagesFr,
  hu: messagesHu,
  it: messagesIt,
  nb: messagesNb,
  nl: messagesNl,
  pl: messagesPl,
  "pt-PT": messagesPt,
  ro: messagesRo,
  sk: messagesSk,
  sv: messagesSv,
  tr: messagesTr,
});

const TENANT_CORE_NAMESPACES = Object.freeze([
  "Dashboard",
  "WorkspaceSettingsNav",
  "WorkspaceSettings",
]);

const collectLeafPaths = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? collectLeafPaths(child, path)
      : [path];
  });

function TenantCoreProbe() {
  const dashboard = useTranslations("Dashboard");
  const navigation = useTranslations("WorkspaceSettingsNav");
  const settings = useTranslations("WorkspaceSettings");

  return (
    <>
      <p>{dashboard("greetingMorning", { name: "Martin" })}</p>
      <p>{navigation("title")}</p>
      <p>{settings("title")}</p>
    </>
  );
}

describe("preview tenant-core translations", () => {
  afterEach(() => cleanup());

  it.each(Object.entries(catalogs))(
    "keeps every required tenant-core key in %s",
    (_locale, messages) => {
      for (const namespace of TENANT_CORE_NAMESPACES) {
        expect(collectLeafPaths(messages[namespace]).sort()).toEqual(
          collectLeafPaths(messagesEn[namespace]).sort(),
        );
      }
    },
  );

  it.each(Object.keys(catalogs))(
    "renders localized tenant-core copy for %s without English fallback",
    async (locale) => {
      const messages = await loadMessages(locale);
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TenantCoreProbe />
        </NextIntlClientProvider>,
      );

      expect(
        screen.queryByText("Good morning, Martin"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
      expect(screen.queryByText("General settings")).not.toBeInTheDocument();
    },
  );
});
