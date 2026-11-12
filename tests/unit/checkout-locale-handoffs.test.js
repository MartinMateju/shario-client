import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

const checkoutSources = [
  ["cart", "src", "components", "modals", "CartModal.js"],
  ["credit purchase", "src", "components", "credits", "CreditPurchaseModal.js"],
  ["coupon sidebar", "src", "components", "sidebars", "SidebarForm.js"],
  [
    "public voucher",
    "src",
    "components",
    "public-tenant",
    "PublicVoucherCatalogPage.js",
  ],
];

describe("checkout locale handoffs", () => {
  it.each([
    ["fr-FR", "fr"],
    ["es_ES", "es"],
    ["it-IT", "it"],
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv"],
    ["nb-NO", "nb"],
    ["no_NO", "nb"],
    ["fi-FI", "fi"],
    ["hu-HU", "hu"],
    ["el_GR", "el"],
    ["tr-TR", "tr"],
    ["nl_NL", "nl"],
    ["ro-RO", "ro"],
    ["ja-JP", "en"],
    ["pt-BR", "en"],
  ])("canonicalizes checkout locale %s as %s", (locale, expected) => {
    expect(resolveRolloutEligibleLocaleCode(locale)).toBe(expected);
  });

  it.each(checkoutSources)(
    "uses the central resolver in %s",
    (_, ...segments) => {
      const source = read(...segments);

      expect(source).toContain("resolveRolloutEligibleLocaleCode");
      expect(source).not.toMatch(
        /locale\s*===\s*["']cs["']\s*\?\s*["']cs["']\s*:\s*["']en["']/,
      );
      expect(source).not.toMatch(
        /language\s*===\s*["']CZ["']\s*\?\s*["']cs["']\s*:\s*["']en["']/,
      );
    },
  );
});
