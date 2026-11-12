import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildWorkspaceLocalePayload,
  normalizeWorkspaceLocaleForm,
  resolveWorkspaceRouteLocale,
} from "@/components/views/settings/workspaceLocaleSettings";
import {
  getLocalizedPublicTenantText,
  getPublicTenantLocaleCodes,
  normalizePublicTenant,
  normalizePublicTenantLocaleSettings,
  resolvePublicTenantRouteLocale,
} from "@/components/public-tenant/publicTenant.config";

const ROUTEABLE_LOCALES = [
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

describe("workspace locale settings", () => {
  it("treats the configured workspace language as the canonical app locale", () => {
    expect(
      resolveWorkspaceRouteLocale(
        { defaultLanguage: "EN", adminLanguage: "sk-SK" },
        ROUTEABLE_LOCALES,
      ),
    ).toBe("sk");
    expect(
      resolveWorkspaceRouteLocale(
        { defaultLanguage: "CZ", adminLanguage: "sk" },
        ["en", "cs"],
      ),
    ).toBe("cs");
  });

  it("migrates the legacy workspace language without losing compatibility", () => {
    expect(
      normalizeWorkspaceLocaleForm(
        {
          defaultLanguage: "CZ",
        },
        ROUTEABLE_LOCALES,
      ),
    ).toEqual({
      adminLanguage: "cs",
      publicDefaultLanguage: "cs",
      secondaryPublicLanguage: "",
    });
  });

  it("normalizes canonical settings and keeps only one secondary language", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        defaultLanguage: "EN",
        adminLanguage: "de-DE",
        publicDefaultLanguage: "pl-PL",
        supportedPublicLanguages: ["pl", "DA-dk", "de", "sk"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "de",
      publicDefaultLanguage: "pl",
      secondaryPublicLanguage: "da",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "de",
      publicDefaultLanguage: "pl",
      supportedPublicLanguages: ["pl", "da"],
    });
  });

  it("rejects unsupported or duplicate public languages from the payload", () => {
    expect(
      buildWorkspaceLocalePayload(
        {
          adminLanguage: "ja",
          publicDefaultLanguage: "sk",
          secondaryPublicLanguage: "sk",
        },
        ROUTEABLE_LOCALES,
      ),
    ).toEqual({
      adminLanguage: "en",
      publicDefaultLanguage: "sk",
      supportedPublicLanguages: ["sk"],
    });
  });

  it("preserves Wave 2 preview workspace and public language choices", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        adminLanguage: "fr-FR",
        publicDefaultLanguage: "pt_PT",
        supportedPublicLanguages: ["pt-PT", "it-IT"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "fr",
      publicDefaultLanguage: "pt-PT",
      secondaryPublicLanguage: "it",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "fr",
      publicDefaultLanguage: "pt-PT",
      supportedPublicLanguages: ["pt-PT", "it"],
    });
  });

  it("canonicalizes Wave 2B workspace and public language choices", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        adminLanguage: "sv-SE",
        publicDefaultLanguage: "no-NO",
        supportedPublicLanguages: ["nb", "fi-FI"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "sv",
      publicDefaultLanguage: "nb",
      secondaryPublicLanguage: "fi",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "sv",
      publicDefaultLanguage: "nb",
      supportedPublicLanguages: ["nb", "fi"],
    });
  });

  it("canonicalizes Wave 2C workspace and public language choices", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        adminLanguage: "hu-HU",
        publicDefaultLanguage: "el-GR",
        supportedPublicLanguages: ["el", "tr-TR"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "hu",
      publicDefaultLanguage: "el",
      secondaryPublicLanguage: "tr",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "hu",
      publicDefaultLanguage: "el",
      supportedPublicLanguages: ["el", "tr"],
    });
  });

  it("canonicalizes Wave 2D workspace and public language choices", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        adminLanguage: "nl-NL",
        publicDefaultLanguage: "nl_NL",
        supportedPublicLanguages: ["nl-NL", "en"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "nl",
      publicDefaultLanguage: "nl",
      secondaryPublicLanguage: "en",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "nl",
      publicDefaultLanguage: "nl",
      supportedPublicLanguages: ["nl", "en"],
    });
  });

  it("canonicalizes Wave 2E workspace and public language choices", () => {
    const form = normalizeWorkspaceLocaleForm(
      {
        adminLanguage: "ro-RO",
        publicDefaultLanguage: "ro_RO",
        supportedPublicLanguages: ["ro-RO", "en"],
      },
      ROUTEABLE_LOCALES,
    );

    expect(form).toEqual({
      adminLanguage: "ro",
      publicDefaultLanguage: "ro",
      secondaryPublicLanguage: "en",
    });
    expect(buildWorkspaceLocalePayload(form, ROUTEABLE_LOCALES)).toEqual({
      adminLanguage: "ro",
      publicDefaultLanguage: "ro",
      supportedPublicLanguages: ["ro", "en"],
    });
  });

  it("keeps canonical locale fields in the authenticated tenant cache", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/features/workspace-access/workspaceAccessApiSlice.js",
      ),
      "utf8",
    );

    for (const field of [
      "adminLanguage",
      "publicDefaultLanguage",
      "supportedPublicLanguages",
    ]) {
      expect(source).toContain(`${field}:`);
      expect(source).toContain(`workspaceSettings.${field}`);
    }
  });
});

describe("public tenant locale settings", () => {
  it("orders the primary language first, deduplicates aliases, and caps at two", () => {
    expect(
      normalizePublicTenantLocaleSettings({
        defaultLanguage: "CZ",
        publicDefaultLanguage: "de-DE",
        supportedPublicLanguages: ["pl-PL", "DE", "pl", "sk"],
      }),
    ).toEqual({
      defaultLanguage: "cs",
      publicDefaultLanguage: "de",
      supportedPublicLanguages: ["de", "pl"],
    });
  });

  it("preserves the canonical contract on normalized public tenant data", () => {
    const tenant = normalizePublicTenant({
      id: "tenant-1",
      name: "The Pottery House",
      slug: "the-pottery-house",
      settings: {
        defaultLanguage: "EN",
        publicDefaultLanguage: "da",
        supportedPublicLanguages: ["pl", "da", "de"],
      },
    });

    expect(tenant.settings).toMatchObject({
      defaultLanguage: "en",
      publicDefaultLanguage: "da",
      supportedPublicLanguages: ["da", "pl"],
    });
  });

  it("preserves Wave 2C public settings", () => {
    expect(
      normalizePublicTenantLocaleSettings({
        publicDefaultLanguage: "hu",
        supportedPublicLanguages: ["hu", "tr"],
      }),
    ).toEqual({
      defaultLanguage: "en",
      publicDefaultLanguage: "hu",
      supportedPublicLanguages: ["hu", "tr"],
    });
  });

  it("preserves Wave 2D public settings", () => {
    expect(
      normalizePublicTenantLocaleSettings({
        publicDefaultLanguage: "nl-NL",
        supportedPublicLanguages: ["nl_NL", "en"],
      }),
    ).toEqual({
      defaultLanguage: "en",
      publicDefaultLanguage: "nl",
      supportedPublicLanguages: ["nl", "en"],
    });
  });

  it("preserves Wave 2E public settings", () => {
    expect(
      normalizePublicTenantLocaleSettings({
        publicDefaultLanguage: "ro-RO",
        supportedPublicLanguages: ["ro_RO", "en"],
      }),
    ).toEqual({
      defaultLanguage: "en",
      publicDefaultLanguage: "ro",
      supportedPublicLanguages: ["ro", "en"],
    });
  });

  it("keeps the tenant primary language first in the public selector", () => {
    expect(
      getPublicTenantLocaleCodes(
        {
          publicDefaultLanguage: "da",
          supportedPublicLanguages: ["pl", "da"],
        },
        ROUTEABLE_LOCALES,
      ),
    ).toEqual(["da", "pl"]);

    expect(
      getPublicTenantLocaleCodes(
        {
          publicDefaultLanguage: "da",
          supportedPublicLanguages: ["pl", "da"],
        },
        ["en", "cs", "pl"],
      ),
    ).toEqual(["pl"]);

    expect(
      resolvePublicTenantRouteLocale(
        {
          publicDefaultLanguage: "da",
          supportedPublicLanguages: ["pl", "da"],
        },
        "en",
        ROUTEABLE_LOCALES,
      ),
    ).toBe("da");
    expect(
      resolvePublicTenantRouteLocale(
        {
          publicDefaultLanguage: "da",
          supportedPublicLanguages: ["pl", "da"],
        },
        "pl-PL",
        ROUTEABLE_LOCALES,
      ),
    ).toBe("pl");
  });

  it("preserves and resolves rollout-eligible tenant-authored copy", () => {
    const tenant = normalizePublicTenant({
      settings: {
        publicDefaultLanguage: "de",
        supportedPublicLanguages: ["de", "pl"],
      },
      publicSite: {
        pages: {
          home: {
            headline: {
              en: "Create with us",
              "de-DE": "Gestalte mit uns",
              pl: "Twórz z nami",
              fr: "Créez avec nous",
              "pt-PT": "Crie connosco",
              "nl-NL": "Maak met ons mee",
              "ro-RO": "Creează alături de noi",
            },
          },
        },
      },
    });

    expect(tenant.publicSite.pages.home.headline).toMatchObject({
      cs: "",
      en: "Create with us",
      de: "Gestalte mit uns",
      pl: "Twórz z nami",
      fr: "Créez avec nous",
      "pt-PT": "Crie connosco",
      nl: "Maak met ons mee",
      ro: "Creează alături de noi",
    });
    expect(
      getLocalizedPublicTenantText(
        tenant.publicSite.pages.home.headline,
        "de-DE",
      ),
    ).toBe("Gestalte mit uns");
    expect(
      getLocalizedPublicTenantText(
        tenant.publicSite.pages.home.headline,
        "pt_PT",
      ),
    ).toBe("Crie connosco");
    expect(
      getLocalizedPublicTenantText(
        tenant.publicSite.pages.home.headline,
        "nl_NL",
      ),
    ).toBe("Maak met ons mee");
    expect(
      getLocalizedPublicTenantText(
        tenant.publicSite.pages.home.headline,
        "ro_RO",
      ),
    ).toBe("Creează alături de noi");
    expect(
      getLocalizedPublicTenantText(tenant.publicSite.pages.home.headline, "sk"),
    ).toBe("Create with us");
  });
});
