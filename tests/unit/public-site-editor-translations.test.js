import { analyzeIcuMessage } from "../../scripts/validate-locales.mjs";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  PUBLIC_TENANT_FONT_PRESET_IDS,
  PUBLIC_TENANT_STYLE_PRESET_IDS,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  PUBLIC_SITE_EDITOR_PAGE_KEYS,
  PUBLIC_SITE_EDITOR_TABS,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";
import messagesNl from "@/messages/nl.json";
import { ALL_LOCALE_CODES } from "@/i18n/locales";

const logoRedirectCatalogs = import.meta.glob("../../src/messages/*.json", {
  eager: true,
  import: "default",
});

const LOGO_REDIRECT_PATHS = Object.freeze([
  "branding.logoRedirectEnabled",
  "branding.logoRedirectHint",
  "branding.logoRedirectUrl",
  "branding.logoRedirectUrlHint",
  "branding.invalidLogoRedirectUrl",
  "messages.invalidLogoRedirectUrl",
]);

const APPEARANCE_PATHS = Object.freeze([
  "customerPortal.appearanceTitle",
  "customerPortal.appearanceDescription",
  "customerPortal.headerBackgroundColor",
  "customerPortal.primaryButtonColor",
  "customerPortal.calendarBackgroundColor",
  "customerPortal.profileMenuBackgroundColor",
  "customerPortal.appearanceHint",
  ...[
    "backgroundColor",
    "surfaceColor",
    "textColor",
    "headingColor",
    "headerTextColor",
    "calendarTextColor",
    "pageColors",
    "headerColors",
    "calendarColors",
    "buttonColors",
    "useAllBrandColors",
    "inheritedColor",
    "customColor",
    "personalOverrideHint",
  ].map((key) => `customerPortal.${key}`),
]);

const PORTAL_PREVIEW_PATHS = Object.freeze([
  "preview.portalProfileSettings",
  "preview.portalBookAction",
  ...["loading", "ready", "timeout", "reload", "frameTitle"].map(
    (key) => `preview.connection.${key}`,
  ),
]);

const PORTAL_VISIBILITY_PATHS = Object.freeze(
  [
    "pagesTitle",
    "pagesDescription",
    "pageEnabledLabel",
    "enabled",
    "disabled",
    "navigationTitle",
    "navigationDescription",
    "navigationVisibleLabel",
    "visible",
    "hidden",
    "pageDisabledHint",
    ...[
      "calendar",
      "memberships",
      "vouchers",
      "studioGuide",
      "bookings",
      "work",
      "credits",
      "invoices",
      "account",
      "notifications",
      "waitlists",
    ].map((key) => `pageLabels.${key}`),
    ...["bookSession", "memberships", "giftVouchers", "studioGuide"].map(
      (key) => `navigationLabels.${key}`,
    ),
  ].map((key) => `customerPortal.${key}`),
);

const NEW_RUNTIME_PATHS = Object.freeze([
  "builderActions.revisionNo",
  "header.urlExample",
  "footer.urlExample",
  ...[
    "title",
    "description",
    "visible",
    "hidden",
    "edit",
    "moveUp",
    "moveDown",
    "toggle",
    "sectionTitle",
    "sectionDescription",
    ...[
      "waysToVisit",
      "featured",
      "about",
      "gallery",
      "testimonials",
      "locations",
      "team",
      "faq",
    ].map((key) => `labels.${key}`),
  ].map((key) => `homeSections.${key}`),
  ...[
    "publishChanges",
    "publishWebsite",
    "publishingWebsite",
    "launchTitle",
    "launchDescription",
    "launchBlocked",
    "launchConfirmTitle",
    "launchConfirmDescription",
    "launched",
    "undo",
    "redo",
    "history",
    "historyTitle",
    "historyDescription",
    "historyEmpty",
    "historyError",
    "retryHistory",
    "restore",
    "restored",
    "restoreBlocked",
    "restoreConfirm",
    "close",
  ].map((key) => `builderActions.${key}`),
  "customerPortal.pageLabels.courses",
  "customerPortal.navigationLabels.courses",
  "preview.pages.portalCourses",
  ...[
    "title",
    "description",
    "location",
    "headline",
    "intro",
    "image",
    "inherit",
    "noLocations",
    "guestCheckoutEnabled",
    "guestCheckoutDescription",
  ].map((key) => `customerPortal.courses.${key}`),
  ...APPEARANCE_PATHS,
  ...PORTAL_PREVIEW_PATHS,
  ...PORTAL_VISIBILITY_PATHS,
  "branding.logoSize",
  ...LOGO_REDIRECT_PATHS,
  "branding.buttonTextColor",
  "branding.buttonTextColorHint",
  "branding.useAutomaticContrast",
  "branding.usingAutomaticContrast",
  "branding.customButtonTextColor",
  "branding.adjustedButtonTextColor",
  "pages.headlineColor",
  "pages.useTextColor",
  "pages.usingTextColor",
  "pages.customHeadlineColor",
  "pages.adjustedHeadlineColor",
  "pages.visibilityLabel",
  "pages.visible",
  "pages.hidden",
  "pages.hiddenDescription",
]);

// This fingerprints every one of the 291 editor messages that was already in
// production before the current portal and branding controls were added. A
// structural parity assertion alone can miss a symmetric rollback where the same key disappears
// from both locales; this fixed baseline catches that class of regression.
const PRIOR_RUNTIME_PATH_COUNT = 291;
const PRIOR_RUNTIME_PATHS_SHA256 =
  "f81388183daeefb9597e240c79b2b1aa737bde037d89f0aa8d5ec126da055164";

const STYLE_PRESET_MESSAGE_KEYS = Object.freeze({
  [PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL]: "classicEditorial",
  [PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL]: "modernMinimal",
  [PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC]: "warmOrganic",
});

const FONT_PRESET_MESSAGE_KEYS = Object.freeze({
  [PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS]: "skabSans",
  [PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF]: "editorialSerif",
  [PUBLIC_TENANT_FONT_PRESET_IDS.MODERN_CONDENSED]: "modernCondensed",
  [PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF]: "warmSerif",
});

const DEVICE_KEYS = Object.freeze(["desktop", "tablet", "mobile"]);

function collectLeafPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? collectLeafPaths(child, path)
      : [path];
  });
}

function readPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function fingerprint(paths) {
  return createHash("sha256").update(paths.sort().join("\n")).digest("hex");
}

function collectPlaceholders(value) {
  return analyzeIcuMessage(value).argumentSignatures;
}

function expectLocalizedString(catalog, path, locale) {
  const value = readPath(catalog, path);

  expect(value, `${path} in ${locale}`).toEqual(expect.any(String));
  expect(value.trim(), `${path} in ${locale} must not be empty`).not.toBe("");
}

describe("PublicSiteEditor translation contract", () => {
  const catalogs = [
    ["English", messagesEn.PublicSiteEditor],
    ["Czech", messagesCs.PublicSiteEditor],
  ];

  it("localizes the logo destination controls and validation in every supported locale", () => {
    for (const locale of ALL_LOCALE_CODES) {
      const catalog =
        logoRedirectCatalogs[`../../src/messages/${locale}.json`]
          ?.PublicSiteEditor;

      for (const path of LOGO_REDIRECT_PATHS) {
        expectLocalizedString(catalog, path, locale);
        if (locale !== "en") {
          expect(readPath(catalog, path), `${locale}: ${path}`).not.toBe(
            readPath(messagesEn.PublicSiteEditor, path),
          );
        }
      }
    }
  });

  it("keeps both locales structurally aligned with non-empty string leaves", () => {
    const englishPaths = collectLeafPaths(messagesEn.PublicSiteEditor).sort();
    const czechPaths = collectLeafPaths(messagesCs.PublicSiteEditor).sort();

    expect(czechPaths).toEqual(englishPaths);
    expect(englishPaths).toHaveLength(
      PRIOR_RUNTIME_PATH_COUNT + NEW_RUNTIME_PATHS.length,
    );

    for (const [locale, catalog] of catalogs) {
      for (const path of englishPaths) {
        expectLocalizedString(catalog, path, locale);
      }
    }
  });

  it("keeps ICU placeholders aligned between English and Czech", () => {
    for (const path of collectLeafPaths(messagesEn.PublicSiteEditor)) {
      expect(
        collectPlaceholders(readPath(messagesCs.PublicSiteEditor, path)),
        path,
      ).toEqual(
        collectPlaceholders(readPath(messagesEn.PublicSiteEditor, path)),
      );
    }
  });

  it("preserves the complete 291-key runtime baseline in both locales", () => {
    for (const [locale, catalog] of catalogs) {
      const priorPaths = collectLeafPaths(catalog).filter(
        (path) => !NEW_RUNTIME_PATHS.includes(path),
      );

      expect(priorPaths, `${locale} prior runtime path count`).toHaveLength(
        PRIOR_RUNTIME_PATH_COUNT,
      );
      expect(fingerprint(priorPaths), `${locale} prior runtime path set`).toBe(
        PRIOR_RUNTIME_PATHS_SHA256,
      );
    }
  });

  it("provides every portal appearance control in English and Czech", () => {
    for (const [locale, catalog] of catalogs) {
      for (const path of APPEARANCE_PATHS) {
        expectLocalizedString(catalog, path, locale);
      }
    }

    for (const path of APPEARANCE_PATHS) {
      expect(readPath(messagesCs.PublicSiteEditor, path), path).not.toBe(
        readPath(messagesEn.PublicSiteEditor, path),
      );
    }
  });

  it("provides every portal preview action in English and Czech", () => {
    for (const [locale, catalog] of catalogs) {
      for (const path of PORTAL_PREVIEW_PATHS) {
        expectLocalizedString(catalog, path, locale);
      }
    }

    for (const path of PORTAL_PREVIEW_PATHS) {
      expect(readPath(messagesCs.PublicSiteEditor, path), path).not.toBe(
        readPath(messagesEn.PublicSiteEditor, path),
      );
    }
  });

  it("localizes every portal visibility control in English, Czech and Dutch", () => {
    for (const [locale, catalog] of [
      ...catalogs,
      ["Dutch", messagesNl.PublicSiteEditor],
    ]) {
      for (const path of PORTAL_VISIBILITY_PATHS) {
        expectLocalizedString(catalog, path, locale);
        expect(collectPlaceholders(readPath(catalog, path)), path).toEqual(
          collectPlaceholders(readPath(messagesEn.PublicSiteEditor, path)),
        );
      }
    }
  });

  it("covers all dynamically selected editor tabs, preview pages and devices", () => {
    const dynamicPaths = [
      ...PUBLIC_SITE_EDITOR_TABS.map((key) => `tabs.${key}`),
      ...PUBLIC_SITE_EDITOR_PAGE_KEYS.map((key) => `preview.pages.${key}`),
      ...DEVICE_KEYS.map((key) => `preview.devices.${key}`),
      ...DEVICE_KEYS.map((key) => `preview.${key}`),
    ];

    for (const [locale, catalog] of catalogs) {
      for (const path of dynamicPaths) {
        expectLocalizedString(catalog, path, locale);
      }
    }
  });

  it("covers every dynamically selected style and font message", () => {
    const stylePaths = Object.values(STYLE_PRESET_MESSAGE_KEYS).flatMap((key) =>
      ["name", "description", "sample", "sampleText"].map(
        (leaf) => `branding.presets.${key}.${leaf}`,
      ),
    );
    const fontPaths = Object.values(FONT_PRESET_MESSAGE_KEYS).flatMap((key) =>
      ["name", "description", "sample"].map(
        (leaf) => `branding.fontPresets.${key}.${leaf}`,
      ),
    );

    expect(Object.keys(STYLE_PRESET_MESSAGE_KEYS).sort()).toEqual(
      Object.values(PUBLIC_TENANT_STYLE_PRESET_IDS).sort(),
    );
    expect(Object.keys(FONT_PRESET_MESSAGE_KEYS).sort()).toEqual(
      Object.values(PUBLIC_TENANT_FONT_PRESET_IDS).sort(),
    );

    for (const [locale, catalog] of catalogs) {
      for (const path of [...stylePaths, ...fontPaths]) {
        expectLocalizedString(catalog, path, locale);
      }
    }
  });
});
