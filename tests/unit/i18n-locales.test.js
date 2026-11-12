import { describe, expect, it } from "vitest";

import {
  ALL_LOCALE_CODES,
  canRoutePreviewLocales,
  CORE_LOCALE_CODES,
  DEFAULT_TIME_ZONE,
  getEnabledLocaleCodes,
  getRolloutEligibleLocaleFromPathname,
  getLegacyLanguageForLocale,
  getLocaleDefinition,
  LOCALE_REGISTRY,
  LOCALE_STATUS,
  PLANNED_LOCALE_CODES,
  PREVIEW_LOCALE_CODES,
  normalizeLegacyLanguage,
  normalizeLocaleCode,
  normalizeRolloutEligibleLocaleCode,
  parseEnabledLocaleList,
  resolveRolloutEligibleLocaleCode,
  resolveLocale,
  resolveTimeZone,
  stripRolloutEligibleLocalePrefix,
  WAVE_ONE_LOCALE_CODES,
  WAVE_TWO_A_LOCALE_CODES,
  WAVE_TWO_B_LOCALE_CODES,
  WAVE_TWO_C_LOCALE_CODES,
  WAVE_TWO_D_LOCALE_CODES,
  WAVE_TWO_E_LOCALE_CODES,
  WAVE_TWO_LOCALE_CODES,
} from "@/i18n/locales";
import { buildLocaleMetadataContext } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
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
import messagesPtPt from "@/messages/pt-PT.json";
import messagesRo from "@/messages/ro.json";
import messagesSk from "@/messages/sk.json";
import messagesSv from "@/messages/sv.json";
import messagesTr from "@/messages/tr.json";

const PREVIEW_CATALOGS = {
  de: messagesDe,
  pl: messagesPl,
  sk: messagesSk,
  da: messagesDa,
  fr: messagesFr,
  es: messagesEs,
  it: messagesIt,
  "pt-PT": messagesPtPt,
  sv: messagesSv,
  nb: messagesNb,
  fi: messagesFi,
  hu: messagesHu,
  el: messagesEl,
  tr: messagesTr,
  nl: messagesNl,
  ro: messagesRo,
};

function collectLeafPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? collectLeafPaths(child, path)
      : [path];
  });
}

describe("locale registry", () => {
  it("records the approved core, Wave 1, and Wave 2 roadmap", () => {
    expect(CORE_LOCALE_CODES).toEqual(["en", "cs"]);
    expect(WAVE_ONE_LOCALE_CODES).toEqual(["de", "pl", "sk", "da"]);
    expect(WAVE_TWO_A_LOCALE_CODES).toEqual(["fr", "es", "it", "pt-PT"]);
    expect(WAVE_TWO_B_LOCALE_CODES).toEqual(["sv", "nb", "fi"]);
    expect(WAVE_TWO_C_LOCALE_CODES).toEqual(["hu", "el", "tr"]);
    expect(WAVE_TWO_D_LOCALE_CODES).toEqual(["nl"]);
    expect(WAVE_TWO_E_LOCALE_CODES).toEqual(["ro"]);
    expect(WAVE_TWO_LOCALE_CODES).toEqual([
      "fr",
      "es",
      "it",
      "pt-PT",
      "sv",
      "nb",
      "fi",
      "hu",
      "el",
      "tr",
      "nl",
      "ro",
    ]);
    expect(ALL_LOCALE_CODES).toEqual([
      ...CORE_LOCALE_CODES,
      ...WAVE_ONE_LOCALE_CODES,
      ...WAVE_TWO_LOCALE_CODES,
    ]);
  });

  it.each(ALL_LOCALE_CODES)("provides complete metadata for %s", (code) => {
    expect(LOCALE_REGISTRY[code]).toMatchObject({
      code,
      nativeName: expect.any(String),
      shortLabel: expect.any(String),
      intlLocale: expect.any(String),
      openGraphLocale: expect.any(String),
      direction: "ltr",
      rolloutWave: expect.any(Number),
      status: expect.stringMatching(/^(ready|preview|planned)$/),
    });
  });

  it("publishes every Wave 2 locale as preview, except locales promoted to ready", () => {
    const readyWaveTwoLocaleCodes = new Set(["nl"]);
    for (const code of [
      ...WAVE_TWO_A_LOCALE_CODES,
      ...WAVE_TWO_B_LOCALE_CODES,
      ...WAVE_TWO_C_LOCALE_CODES,
      ...WAVE_TWO_D_LOCALE_CODES,
      ...WAVE_TWO_E_LOCALE_CODES,
    ]) {
      const expectedStatus = readyWaveTwoLocaleCodes.has(code)
        ? LOCALE_STATUS.READY
        : LOCALE_STATUS.PREVIEW;
      expect(getLocaleDefinition(code)?.status).toBe(expectedStatus);
    }
    expect(PLANNED_LOCALE_CODES).toEqual([]);
  });

  it("requires complete English key parity for Dutch, now that it is ready", () => {
    expect(getLocaleDefinition("nl")?.status).toBe(LOCALE_STATUS.READY);
    expect(collectLeafPaths(messagesNl).sort()).toEqual(
      collectLeafPaths(messagesEn).sort(),
    );
  });

  it.each(PREVIEW_LOCALE_CODES)(
    "requires complete English key parity before %s can be marked ready",
    (code) => {
      if (getLocaleDefinition(code)?.status !== LOCALE_STATUS.READY) {
        expect(getLocaleDefinition(code)?.status).toBe(LOCALE_STATUS.PREVIEW);
        return;
      }

      expect(collectLeafPaths(PREVIEW_CATALOGS[code]).sort()).toEqual(
        collectLeafPaths(messagesEn).sort(),
      );
    },
  );

  it("normalizes canonical locale variants", () => {
    expect(normalizeLocaleCode(" PT_pt ")).toBe("pt-PT");
    expect(normalizeLocaleCode("DE")).toBe("de");
    expect(normalizeLocaleCode("en-GB")).toBe("en");
    expect(normalizeLocaleCode("cs_CZ")).toBe("cs");
    expect(normalizeLocaleCode("cz")).toBe("cs");
    expect(normalizeLocaleCode("de_DE")).toBe("de");
    expect(normalizeLocaleCode("pl-PL")).toBe("pl");
    expect(normalizeLocaleCode("sk_SK")).toBe("sk");
    expect(normalizeLocaleCode("da-DK")).toBe("da");
    expect(normalizeLocaleCode("fr-FR")).toBe("fr");
    expect(normalizeLocaleCode("fr-CA")).toBe("fr");
    expect(normalizeLocaleCode("es_ES")).toBe("es");
    expect(normalizeLocaleCode("es-MX")).toBe("es");
    expect(normalizeLocaleCode("it-IT")).toBe("it");
    expect(normalizeLocaleCode("it-CH")).toBe("it");
    expect(normalizeLocaleCode("pt")).toBe("pt-PT");
    expect(normalizeLocaleCode("pt_PT")).toBe("pt-PT");
    expect(normalizeLocaleCode("pt-BR")).toBeNull();
    expect(normalizeLocaleCode("sv-SE")).toBe("sv");
    expect(normalizeLocaleCode("nb-NO")).toBe("nb");
    expect(normalizeLocaleCode("no_NO")).toBe("nb");
    expect(normalizeLocaleCode("no-SE")).toBe("nb");
    expect(normalizeLocaleCode("nn-NO")).toBeNull();
    expect(normalizeLocaleCode("fi-FI")).toBe("fi");
    expect(normalizeLocaleCode("hu-HU")).toBe("hu");
    expect(normalizeLocaleCode("el-GR")).toBe("el");
    expect(normalizeLocaleCode("gr_GR")).toBe("el");
    expect(normalizeLocaleCode("tr-TR")).toBe("tr");
    expect(normalizeLocaleCode("nl_NL")).toBe("nl");
    expect(normalizeLocaleCode("ro_RO")).toBe("ro");
    expect(normalizeLocaleCode("unknown")).toBeNull();
  });

  it("keeps API locale snapshots inside the live rollout contract", () => {
    expect(normalizeRolloutEligibleLocaleCode("CZ")).toBe("cs");
    expect(normalizeRolloutEligibleLocaleCode("de-DE")).toBe("de");
    expect(normalizeRolloutEligibleLocaleCode("pl_PL")).toBe("pl");
    expect(normalizeRolloutEligibleLocaleCode("sk-SK")).toBe("sk");
    expect(normalizeRolloutEligibleLocaleCode("da-DK")).toBe("da");
    expect(normalizeRolloutEligibleLocaleCode("fr-FR")).toBe("fr");
    expect(normalizeRolloutEligibleLocaleCode("es_ES")).toBe("es");
    expect(normalizeRolloutEligibleLocaleCode("it-IT")).toBe("it");
    expect(normalizeRolloutEligibleLocaleCode("pt_PT")).toBe("pt-PT");
    expect(normalizeRolloutEligibleLocaleCode("sv-SE")).toBe("sv");
    expect(normalizeRolloutEligibleLocaleCode("nb-NO")).toBe("nb");
    expect(normalizeRolloutEligibleLocaleCode("no_NO")).toBe("nb");
    expect(normalizeRolloutEligibleLocaleCode("fi-FI")).toBe("fi");
    expect(normalizeRolloutEligibleLocaleCode("hu-HU")).toBe("hu");
    expect(normalizeRolloutEligibleLocaleCode("el_GR")).toBe("el");
    expect(normalizeRolloutEligibleLocaleCode("tr-TR")).toBe("tr");
    expect(normalizeRolloutEligibleLocaleCode("nl-NL")).toBe("nl");
    expect(normalizeRolloutEligibleLocaleCode("ro-RO")).toBe("ro");
    expect(resolveRolloutEligibleLocaleCode("pt-BR")).toBe("en");
  });

  it("parses and strips only live rollout locale path prefixes", () => {
    expect(getRolloutEligibleLocaleFromPathname("/pt_PT/app")).toBe("pt-PT");
    expect(getRolloutEligibleLocaleFromPathname("/fr-FR/login")).toBe("fr");
    expect(getRolloutEligibleLocaleFromPathname("/sv-SE/app")).toBe("sv");
    expect(getRolloutEligibleLocaleFromPathname("/no-NO/portal")).toBe("nb");
    expect(getRolloutEligibleLocaleFromPathname("/fi-FI/login")).toBe("fi");
    expect(stripRolloutEligibleLocalePrefix("/pt-PT/app/products")).toBe(
      "/app/products",
    );
    expect(stripRolloutEligibleLocalePrefix("/pt_PT/login/complete")).toBe(
      "/login/complete",
    );
    expect(getRolloutEligibleLocaleFromPathname("/hu/app")).toBe("hu");
    expect(getRolloutEligibleLocaleFromPathname("/el-GR/app")).toBe("el");
    expect(getRolloutEligibleLocaleFromPathname("/tr_TR/app")).toBe("tr");
    expect(getRolloutEligibleLocaleFromPathname("/nl-NL/app")).toBe("nl");
    expect(getRolloutEligibleLocaleFromPathname("/ro-RO/app")).toBe("ro");
    expect(getRolloutEligibleLocaleFromPathname("/pt-BR/app")).toBeNull();
    expect(stripRolloutEligibleLocalePrefix("/hu/app")).toBe("/app");
    expect(stripRolloutEligibleLocalePrefix("/el-GR/app")).toBe("/app");
    expect(stripRolloutEligibleLocalePrefix("/tr_TR/app")).toBe("/app");
    expect(stripRolloutEligibleLocalePrefix("/nl_NL/app")).toBe("/app");
    expect(stripRolloutEligibleLocalePrefix("/ro_RO/app")).toBe("/app");
    expect(stripRolloutEligibleLocalePrefix("/pt-BR/app")).toBe("/pt-BR/app");
  });
});

describe("locale rollout parsing and routing", () => {
  it("keeps only English and Czech enabled by default in tests", () => {
    expect(parseEnabledLocaleList()).toEqual([]);
    expect(
      getEnabledLocaleCodes(undefined, {
        nodeEnv: "test",
        previewGate: undefined,
      }),
    ).toEqual(["en", "cs"]);
    expect(
      getEnabledLocaleCodes("   ", {
        nodeEnv: "test",
        previewGate: undefined,
      }),
    ).toEqual(["en", "cs"]);
  });

  it("enables every preview locale by default in development", () => {
    for (const value of [undefined, "", "   "]) {
      expect(
        getEnabledLocaleCodes(value, {
          nodeEnv: "development",
          previewGate: "false",
        }),
      ).toEqual(["en", "cs", ...PREVIEW_LOCALE_CODES]);
    }
  });

  it("honours an explicit development allow-list instead of the default", () => {
    expect(
      getEnabledLocaleCodes("de,sk", {
        nodeEnv: "development",
        previewGate: "false",
      }),
    ).toEqual(["en", "cs", "de", "sk"]);

    expect(
      getEnabledLocaleCodes("unknown", {
        nodeEnv: "development",
        previewGate: "false",
      }),
    ).toEqual(["en", "cs"]);
  });

  it("parses, validates, orders, and deduplicates the preview allow-list", () => {
    expect(
      parseEnabledLocaleList(
        " PL, de;DA de unknown fr-CA es-MX it-CH pt_PT sv-SE no_NO fi-FI hu-HU el_GR tr-TR nl_NL ro_RO ",
      ),
    ).toEqual([
      "de",
      "pl",
      "da",
      "fr",
      "es",
      "it",
      "pt-PT",
      "sv",
      "nb",
      "fi",
      "hu",
      "el",
      "tr",
      "nl",
      "ro",
    ]);
    expect(
      getEnabledLocaleCodes(
        " PL, de;DA de unknown fr-CA es-MX it-CH pt_PT sv-SE no_NO fi-FI hu-HU el_GR tr-TR nl_NL ro_RO ",
      ),
    ).toEqual([
      "en",
      "cs",
      "de",
      "pl",
      "da",
      "fr",
      "es",
      "it",
      "pt-PT",
      "sv",
      "nb",
      "fi",
      "hu",
      "el",
      "tr",
      "nl",
      "ro",
    ]);
  });

  it("allows the preview allow-list directly outside production", () => {
    expect(
      getEnabledLocaleCodes(PREVIEW_LOCALE_CODES.join(","), {
        nodeEnv: "development",
        previewGate: "false",
      }),
    ).toEqual(["en", "cs", ...PREVIEW_LOCALE_CODES]);
    expect(
      canRoutePreviewLocales({
        nodeEnv: "test",
        previewGate: undefined,
      }),
    ).toBe(true);
  });

  it("requires the explicit preview gate for production routing", () => {
    for (const value of [undefined, "", "   "]) {
      expect(
        getEnabledLocaleCodes(value, {
          nodeEnv: "production",
          previewGate: "true",
        }),
      ).toEqual(["en", "cs"]);
    }

    for (const previewGate of [undefined, "", "false", "TRUE", "1", "yes"]) {
      expect(
        getEnabledLocaleCodes(PREVIEW_LOCALE_CODES.join(","), {
          nodeEnv: "production",
          previewGate,
        }),
      ).toEqual(["en", "cs"]);
    }

    expect(
      getEnabledLocaleCodes(PREVIEW_LOCALE_CODES.join(","), {
        nodeEnv: "production",
        previewGate: "true",
      }),
    ).toEqual(["en", "cs", ...PREVIEW_LOCALE_CODES]);
  });

  it("builds next-intl routing from the same validated environment list", () => {
    expect(routing.locales).toEqual(
      getEnabledLocaleCodes(process.env.NEXT_PUBLIC_ENABLED_LOCALES, {
        nodeEnv: process.env.NODE_ENV,
        previewGate: process.env.NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES,
      }),
    );
    expect(routing.defaultLocale).toBe("en");
    expect(routing.localePrefix).toBe("always");
    expect(routing.localeDetection).toBe(true);
  });

  it("resolves requests only against currently routeable locales", () => {
    expect(resolveLocale("cs", ["en", "cs"])).toBe("cs");
    expect(resolveLocale("de", ["en", "cs"])).toBe("en");
    expect(resolveLocale("DE", ["en", "cs", "de"])).toBe("de");
    expect(resolveLocale("fr", ["en", "cs", "de"])).toBe("en");
  });
});

describe("request time zone", () => {
  it("uses Europe/Prague as the stable default", () => {
    expect(resolveTimeZone()).toBe(DEFAULT_TIME_ZONE);
    expect(DEFAULT_TIME_ZONE).toBe("Europe/Prague");
  });

  it("accepts valid overrides and safely rejects invalid values", () => {
    expect(resolveTimeZone("UTC")).toBe("UTC");
    expect(resolveTimeZone(" Europe/Copenhagen ")).toBe("Europe/Copenhagen");
    expect(resolveTimeZone("not/a-time-zone")).toBe(DEFAULT_TIME_ZONE);
  });
});

describe("locale metadata rollout", () => {
  it("indexes ready locales and publishes only ready hreflang alternatives", () => {
    const context = buildLocaleMetadataContext("cs", ["en", "cs", "de"]);

    expect(context).toMatchObject({
      direction: "ltr",
      intlLocale: "cs-CZ",
      openGraphLocale: "cs_CZ",
      isIndexable: true,
      languageAlternates: {
        en: "/en",
        cs: "/cs",
      },
    });
    expect(context.openGraphAlternateLocales).toEqual(["en_US"]);
  });

  it("keeps an enabled preview locale out of search metadata", () => {
    const context = buildLocaleMetadataContext("de", ["en", "cs", "de"]);

    expect(context.isIndexable).toBe(false);
    expect(context.openGraphLocale).toBe("de_DE");
    expect(context.languageAlternates).toEqual({
      en: "/en",
      cs: "/cs",
    });
    expect(context.openGraphAlternateLocales).toEqual(["en_US", "cs_CZ"]);
  });
});

describe("legacy language bridge", () => {
  it.each(["en", ...PREVIEW_LOCALE_CODES])(
    "maps %s to the legacy English catalog",
    (locale) => {
      expect(getLegacyLanguageForLocale(locale)).toBe("EN");
      expect(normalizeLegacyLanguage(locale)).toBe("EN");
    },
  );

  it("preserves Czech aliases and safe defaults", () => {
    expect(getLegacyLanguageForLocale("cs")).toBe("CZ");
    expect(normalizeLegacyLanguage("CZ")).toBe("CZ");
    expect(normalizeLegacyLanguage("cs-CZ")).toBe("CZ");
    expect(normalizeLegacyLanguage("invalid")).toBe("CZ");
    expect(normalizeLegacyLanguage("invalid", null)).toBeNull();
  });
});
