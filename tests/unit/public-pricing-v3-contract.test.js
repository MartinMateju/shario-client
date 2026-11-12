import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const locales = [
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
];
const readSource = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const readPricing = (locale) =>
  JSON.parse(readSource(`src/messages/${locale}.json`)).MarketingHome.pricing;
const numericValues = (value) =>
  (
    String(value)
      .replace(/(?<=\d)[\s.,\u00a0](?=\d{3}\b)/gu, "")
      .match(/\d+/g) || []
  ).map(Number);

describe("public Plan V3 pricing contract", () => {
  it("fetches prices from the backend without duplicating amounts", () => {
    const source = readSource("src/config/subscriptionPlans.js");
    expect(source).not.toContain("CURRENT_PLAN_PRICES");
    expect(readSource("src/app/[locale]/page.js")).not.toContain(
      "priceCurrency:",
    );
  });

  it("publishes V3 scale, email, automation and AI limits in every locale", () => {
    for (const locale of locales) {
      const pricing = readPricing(locale);

      expect(numericValues(pricing.starter.feature1), locale).toEqual([1, 1]);
      expect(numericValues(pricing.starter.feature3), locale).toEqual([500]);
      expect(numericValues(pricing.starter.feature4), locale).toEqual([200]);

      expect(numericValues(pricing.professional.feature1), locale).toEqual([
        1, 3,
      ]);
      expect(numericValues(pricing.professional.feature3), locale).toEqual([
        3, 2500,
      ]);
      expect(numericValues(pricing.professional.feature4), locale).toEqual([
        2000,
      ]);

      expect(numericValues(pricing.studioPlus.feature1), locale).toEqual([
        2, 6,
      ]);
      expect(numericValues(pricing.studioPlus.feature3), locale).toEqual([
        5000,
      ]);
      expect(numericValues(pricing.studioPlus.feature4), locale).toEqual([
        10000,
      ]);

      expect(numericValues(pricing.enterprise.feature4), locale).toEqual([]);
    }
  });

  it("uses the canonical V3 catalog on the public pricing page", () => {
    const dedicated = readSource(
      "src/components/Marketing/PricingMarketingPage.js",
    );

    for (const source of [dedicated]) {
      expect(source).toContain("getCurrentPlanPrice");
      expect(source).not.toContain("getFoundingPlanPrice");
      expect(source).not.toContain("ENTERPRISE_ONBOARDING_FROM");
    }

    const english = readPricing("en");
    const czech = readPricing("cs");
    expect(english.eyebrow).toBe("Transparent pricing");
    expect(czech.eyebrow).toBe("Přehledné ceny");
    expect(english.note).not.toMatch(/founding|early adopters/i);
    expect(english.enterprise.feature4).not.toMatch(/20,000|790/);
  });
});
