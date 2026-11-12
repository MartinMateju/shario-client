import { describe, expect, it } from "vitest";

import {
  AI_SETTINGS_LOCALE_OPTIONS,
  resolveAiSettingsLocale,
} from "@/components/ai/aiLocaleSettings";
import {
  formatAdvisorDateTime,
  formatAdvisorEvidenceValue,
} from "@/components/ai/business-advisor.utils";
import { resolveIntlLocale } from "@/i18n/formatting";
import { buildKnowledgeCoverageRequest } from "@/lib/features/ai/aiApi.utils";
import { formatMinorCurrencyAmount } from "@/utils/money";

describe("client AI rollout locale contract", () => {
  it("offers exactly the rollout-eligible AI settings locales", () => {
    expect(AI_SETTINGS_LOCALE_OPTIONS.map(({ code }) => code)).toEqual([
      "en",
      "cs",
      "de",
      "pl",
      "sk",
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
    expect(resolveAiSettingsLocale("de-DE")).toBe("de");
    expect(resolveAiSettingsLocale("fr-FR")).toBe("fr");
    expect(resolveAiSettingsLocale("pt_PT")).toBe("pt-PT");
    expect(resolveAiSettingsLocale("no-NO")).toBe("nb");
    expect(resolveAiSettingsLocale("hu-HU")).toBe("hu");
    expect(resolveAiSettingsLocale("el-GR")).toBe("el");
    expect(resolveAiSettingsLocale("tr-TR")).toBe("tr");
    expect(resolveAiSettingsLocale("nl-NL")).toBe("nl");
    expect(resolveAiSettingsLocale("ro-RO")).toBe("ro");
  });

  it.each([
    ["en", "en-US"],
    ["CZ", "cs-CZ"],
    ["de-DE", "de-DE"],
    ["pl", "pl-PL"],
    ["sk-SK", "sk-SK"],
    ["da", "da-DK"],
    ["fr-FR", "fr-FR"],
    ["es", "es-ES"],
    ["it-IT", "it-IT"],
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv-SE"],
    ["no_NO", "nb-NO"],
    ["fi-FI", "fi-FI"],
    ["hu-HU", "hu-HU"],
    ["el-GR", "el-GR"],
    ["tr-TR", "tr-TR"],
    ["nl_NL", "nl-NL"],
    ["ro_RO", "ro-RO"],
  ])("maps %s to the canonical Intl locale %s", (locale, expected) => {
    expect(resolveIntlLocale(locale)).toBe(expected);
  });

  it("falls back to English Intl formatting for invalid locales", () => {
    expect(resolveIntlLocale("not-a-locale")).toBe("en-US");
  });

  it("preserves rollout locales in AI API requests", () => {
    expect(
      buildKnowledgeCoverageRequest({
        cacheScope: "ignored",
        locale: "pl-PL",
        locationId: " location-id ",
      }),
    ).toEqual({
      url: "/ai/knowledge/coverage",
      params: { locale: "pl", locationId: "location-id" },
    });
    expect(buildKnowledgeCoverageRequest({ locale: "pt_PT" }).params).toEqual({
      locale: "pt-PT",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "no_NO" }).params).toEqual({
      locale: "nb",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "hu-HU" }).params).toEqual({
      locale: "hu",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "el_GR" }).params).toEqual({
      locale: "el",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "tr-TR" }).params).toEqual({
      locale: "tr",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "nl_NL" }).params).toEqual({
      locale: "nl",
    });
    expect(buildKnowledgeCoverageRequest({ locale: "ro_RO" }).params).toEqual({
      locale: "ro",
    });
  });

  it("formats AI evidence and money with regional rollout rules", () => {
    const date = "2026-08-15T10:30:00.000Z";
    expect(formatAdvisorDateTime(date, { locale: "de", timezone: "UTC" })).toBe(
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(date)),
    );
    expect(
      formatAdvisorEvidenceValue(
        { value: 1234.5, unit: "count" },
        { locale: "pl" },
      ),
    ).toBe(
      new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(
        1234.5,
      ),
    );
    expect(formatMinorCurrencyAmount(123_456, "EUR", "da")).toBe(
      new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(1234.56),
    );
    expect(formatMinorCurrencyAmount(123_456, "EUR", "pt_PT")).toBe(
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(1234.56),
    );
  });
});
