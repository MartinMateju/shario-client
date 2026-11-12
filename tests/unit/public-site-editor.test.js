import { describe, expect, it } from "vitest";

import {
  buildPublicTenantLocaleRedirectPath,
  getPublicTenantNavigation,
  PUBLIC_TENANT_LOGO_SIZE,
  getPublicTenantTheme,
  normalizePublicTenant,
  normalizePublicTenantLogoSize,
  normalizePublicTenantUrl,
  resolvePublicTenantActionForeground,
  resolvePublicTenantLabelColor,
} from "@/components/public-tenant/publicTenant.config";
import {
  DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID,
  PUBLIC_TENANT_FONT_PRESET_IDS,
  PUBLIC_TENANT_FONT_PRESET_ORDER,
  PUBLIC_TENANT_STYLE_PRESET_IDS,
  getPublicTenantStylePresetRecipe,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  PUBLIC_SITE_EDITOR_MEDIA,
  applyPublicSiteMediaUpload,
  applyPublicSiteStylePreset,
  arePublicSiteDraftsEqual,
  arePublicSiteEditorStatesEqual,
  buildPublicSiteDraftPatch,
  canPublishPublicSiteDraft,
  getAvailablePublicSitePreviewPages,
  getInvalidPublicSiteColorPaths,
  getInvalidPublicSiteLogoRedirectUrl,
  isValidPublicSiteEditorDraft,
  getPublicSiteMediaErrorKey,
  formatPublicSiteMediaSize,
  movePublicSiteNavigationItem,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
  resolvePublicSiteEditorLocaleCodes,
  validatePublicSiteMediaFile,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import {
  buildPublicSiteMediaRequest,
  normalizePublicSiteEditorResponse,
  publicSiteApiRoutes,
} from "@/lib/features/publicSite/publicSiteApiSlice";
import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";

const relativeLuminance = (color) => {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(color.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

const rawTenant = {
  id: "tenant-1",
  name: "Studio Olivka",
  slug: "studio-olivka",
  publicCapabilities: {
    bookStudio: true,
    courses: true,
    memberships: false,
    help: true,
    registration: true,
  },
  publicSite: {
    branding: {
      displayName: "Olivka Ceramics",
      stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
      logoUrl: "https://media.example/logo.png",
      accentColor: "#fefefe",
      secondaryColor: "#E56F51",
      backgroundColor: "#FFFFFF",
      textColor: "#182333",
      description: {
        cs: "Keramické studio",
        en: "Pottery studio",
      },
    },
    pages: {
      home: {
        headline: {
          cs: "Tvořte s námi",
          en: "Create with us",
        },
      },
    },
    header: {
      navOrder: ["help", "memberships", "courses", "book"],
      hiddenItems: ["courses"],
      primaryCta: "book",
      announcement: {
        text: { cs: "", en: "" },
        url: "",
      },
    },
    footer: {
      social: {},
      legal: {},
    },
    login: {},
  },
};

describe("public-site editor frontend contract", () => {
  it("keeps logo redirects opt-in and preserves the destination across save and disable", () => {
    const original = normalizePublicSiteEditorDraft({
      publicSite: rawTenant.publicSite,
    });
    expect(original.branding.logoRedirectEnabled).toBe(false);
    expect(original.branding.logoRedirectUrl).toBe("");

    const edited = replacePublicSiteValue(
      replacePublicSiteValue(original, "branding.logoRedirectEnabled", true),
      "branding.logoRedirectUrl",
      " https://www.atelierklei.cz/ ",
    );
    const patch = buildPublicSiteDraftPatch(edited);
    expect(patch.branding).toMatchObject({
      logoRedirectEnabled: true,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    });
    expect(arePublicSiteDraftsEqual(original, edited)).toBe(false);
    expect(isValidPublicSiteEditorDraft(edited)).toBe(true);
    expect(
      normalizePublicSiteEditorDraft({ publicSite: patch }).branding,
    ).toMatchObject({
      logoRedirectEnabled: true,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    });

    const disabled = replacePublicSiteValue(
      edited,
      "branding.logoRedirectEnabled",
      false,
    );
    expect(buildPublicSiteDraftPatch(disabled).branding).toMatchObject({
      logoRedirectEnabled: false,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    });
    expect(arePublicSiteDraftsEqual(edited, disabled)).toBe(false);
  });

  it.each([
    "",
    "javascript:alert(1)",
    "//example.org",
    "http://example.org",
    "https://user:secret@example.org/",
  ])(
    "blocks saving an enabled logo redirect with invalid destination %s",
    (destination) => {
      const draft = normalizePublicSiteEditorDraft({
        publicSite: rawTenant.publicSite,
      });
      draft.branding.logoRedirectEnabled = true;
      draft.branding.logoRedirectUrl = destination;
      expect(getInvalidPublicSiteLogoRedirectUrl(draft)).toBe(true);
      expect(isValidPublicSiteEditorDraft(draft)).toBe(false);
      // Do not silently replace invalid typed input with a default destination.
      expect(buildPublicSiteDraftPatch(draft).branding.logoRedirectUrl).toBe(
        destination,
      );
      draft.branding.logoRedirectEnabled = false;
      expect(isValidPublicSiteEditorDraft(draft)).toBe(true);
      expect(buildPublicSiteDraftPatch(draft).branding).toMatchObject({
        logoRedirectEnabled: false,
        logoRedirectUrl: "",
      });
    },
  );

  it("accepts a root-relative logo destination for a page on the studio website", () => {
    const draft = normalizePublicSiteEditorDraft({
      publicSite: rawTenant.publicSite,
    });
    draft.branding.logoRedirectEnabled = true;
    draft.branding.logoRedirectUrl = "/cs/courses?location=vaclavska";
    expect(isValidPublicSiteEditorDraft(draft)).toBe(true);
    expect(buildPublicSiteDraftPatch(draft).branding.logoRedirectUrl).toBe(
      "/cs/courses?location=vaclavska",
    );
  });

  it("uses the authenticated draft editor endpoints and preserves revisions", () => {
    expect(publicSiteApiRoutes).toEqual({
      settings: "/tenants/current/settings/public-site",
      preview: "/tenants/current/settings/public-site/preview",
      versions: "/tenants/current/settings/public-site/versions",
      restoreVersion: expect.any(Function),
      publish: "/tenants/current/settings/public-site/publish",
      resetDraft: "/tenants/current/settings/public-site/reset-draft",
      media: expect.any(Function),
    });
    expect(publicSiteApiRoutes.media("loginBackground")).toBe(
      "/tenants/current/settings/public-site/media/loginBackground",
    );
    expect(publicSiteApiRoutes.restoreVersion("version/1")).toBe(
      "/tenants/current/settings/public-site/versions/version%2F1/restore",
    );

    const result = normalizePublicSiteEditorResponse({
      draft: {
        branding: {
          displayName: "Private draft",
          stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
        },
      },
      published: {
        branding: {
          displayName: "Public",
          stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
        },
      },
      editor: {
        draftRevision: 9,
        publishedRevision: 7,
        hasUnpublishedChanges: true,
        draftUpdatedAt: "2026-07-29T10:00:00.000Z",
      },
    });

    expect(result.draft.branding.displayName).toBe("Private draft");
    expect(result.publicSite).toBe(result.draft);
    expect(result.published.branding.displayName).toBe("Public");
    expect(result.draft.branding.stylePreset).toBe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );
    expect(result.published.branding.stylePreset).toBe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    );
    expect(result.editor).toMatchObject({
      draftRevision: 9,
      publishedRevision: 7,
      hasUnpublishedChanges: true,
    });
  });

  it("normalizes the authenticated preview without treating metadata as content", () => {
    const preview = normalizePublicSiteEditorResponse({
      tenant: {
        id: "tenant-1",
        publicSite: {
          branding: { displayName: "Authenticated draft preview" },
        },
      },
      preview: {
        publicationStatus: "live",
        publiclyAvailable: true,
        hasExplicitPublicationState: true,
        publishAction: "publishChanges",
        data: {
          locations: [{ id: "location-1", name: "Main studio" }],
        },
      },
    });

    expect(preview.draft.branding.displayName).toBe(
      "Authenticated draft preview",
    );
    expect(preview.editor).toMatchObject({
      publicationStatus: "live",
      publiclyAvailable: true,
      hasExplicitPublicationState: true,
      publishAction: "publishChanges",
    });
    expect(preview.preview.data.locations).toEqual([
      { id: "location-1", name: "Main studio" },
    ]);
    expect(preview.draft).not.toHaveProperty("publicationStatus");
  });

  it("builds a controlled patch with localized page content and no unknown keys", () => {
    const value = {
      ...normalizePublicTenant(rawTenant).publicSite,
      rawHtml: "<script>alert(1)</script>",
      pages: {
        ...normalizePublicTenant(rawTenant).publicSite.pages,
        home: {
          eyebrow: { cs: "Dílna", en: "Studio" },
          headline: { cs: "Tvořte s námi", en: "Create with us" },
          headlineColor: "#8a402e",
          description: { cs: "Český text", en: "English text" },
          sectionOrder: ["about", "waysToVisit", "about", "attacker"],
          hiddenSections: ["faq", "faq", "attacker"],
          sectionContent: {
            about: {
              title: { en: "About the studio" },
              description: { cs: "Keramika bez spěchu." },
              rawHtml: "<b>ignored</b>",
            },
            attacker: { title: { en: "Injected" } },
          },
          rawHtml: "<b>ignored</b>",
        },
        vouchers: {
          title: { cs: "Dárkové poukazy", en: "Gift vouchers" },
          description: {
            cs: "Darujte čas na tvoření.",
            en: "Give someone time to create.",
          },
          rawHtml: "<script>ignored</script>",
        },
      },
    };

    const patch = buildPublicSiteDraftPatch(value);

    expect(patch.pages.home).toEqual({
      eyebrow: { cs: "Dílna", en: "Studio" },
      headline: { cs: "Tvořte s námi", en: "Create with us" },
      headlineColor: "#8A402E",
      description: { cs: "Český text", en: "English text" },
      labelColor: "",
      sectionOrder: [
        "about",
        "waysToVisit",
        "featured",
        "gallery",
        "testimonials",
        "locations",
        "team",
        "faq",
      ],
      hiddenSections: ["faq"],
      sectionContent: expect.objectContaining({
        about: {
          title: { en: "About the studio" },
          description: { cs: "Keramika bez spěchu." },
        },
      }),
    });
    expect(patch).not.toHaveProperty("rawHtml");
    expect(patch.pages.home).not.toHaveProperty("rawHtml");
    expect(patch.pages.home.sectionContent).not.toHaveProperty("attacker");
    expect(patch.pages.home.sectionContent.about).not.toHaveProperty("rawHtml");
    expect(patch.branding.stylePreset).toBe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    );
    expect(patch.pages.vouchers).toEqual({
      visible: true,
      title: { cs: "Dárkové poukazy", en: "Gift vouchers" },
      description: {
        cs: "Darujte čas na tvoření.",
        en: "Give someone time to create.",
      },
    });
    expect(patch.header.navOrder).toEqual([
      "help",
      "memberships",
      "courses",
      "book",
      "vouchers",
    ]);
  });

  it("preserves canonical camel-case homepage section keys", () => {
    const home = normalizePublicTenant({
      name: "Clay House",
      slug: "clay-house",
      publicSite: {
        pages: {
          home: {
            sectionOrder: ["waysToVisit", "about"],
            hiddenSections: ["waysToVisit"],
          },
        },
      },
    }).publicSite.pages.home;

    expect(home.sectionOrder.slice(0, 2)).toEqual(["waysToVisit", "about"]);
    expect(home.hiddenSections).toContain("waysToVisit");
  });

  it("edits the configured pair and preserves legacy copy when saving", () => {
    const publicSite = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        pages: {
          ...rawTenant.publicSite.pages,
          home: {
            headline: {
              cs: "Tvořte s námi",
              en: "Create with us",
              de: "Gestalte mit uns",
              pl: "Twórz z nami",
              fr: "Créez avec nous",
              "pt-PT": "Crie connosco",
            },
          },
        },
      },
    }).publicSite;

    expect(
      resolvePublicSiteEditorLocaleCodes({
        settings: {
          publicDefaultLanguage: "fr",
          supportedPublicLanguages: ["fr", "pt-PT"],
        },
        publicSite,
      }),
    ).toEqual(["fr", "pt-PT"]);
    expect(buildPublicSiteDraftPatch(publicSite).pages.home.headline).toEqual({
      en: "Create with us",
      cs: "Tvořte s námi",
      de: "Gestalte mit uns",
      pl: "Twórz z nami",
      fr: "Créez avec nous",
      "pt-PT": "Crie connosco",
    });
    expect(
      resolvePublicSiteEditorLocaleCodes({
        settings: {
          publicDefaultLanguage: "fr",
          supportedPublicLanguages: ["fr", "pt-PT"],
        },
        publicSite,
        routeableLocaleCodes: ["en", "cs"],
      }),
    ).toEqual(["en", "cs"]);
  });

  it("keeps the historical Czech/English editor for legacy documents", () => {
    expect(
      resolvePublicSiteEditorLocaleCodes({
        settings: { defaultLanguage: "CZ" },
        publicSite: rawTenant.publicSite,
      }),
    ).toEqual(["cs", "en"]);
    expect(resolvePublicSiteEditorLocaleCodes()).toEqual(["cs", "en"]);
  });

  it("builds a safe canonical public-locale redirect without losing the page", () => {
    expect(
      buildPublicTenantLocaleRedirectPath(
        "/en/courses/wheel",
        "de",
        "?from=calendar",
      ),
    ).toBe("/de/courses/wheel?from=calendar");
    expect(
      buildPublicTenantLocaleRedirectPath("//attacker.example/en", "pl"),
    ).toBe("/pl");
    expect(buildPublicTenantLocaleRedirectPath("/en\\redirect", "sk")).toBe(
      "/sk",
    );
    expect(
      buildPublicTenantLocaleRedirectPath(
        "/en/courses/wheel",
        "da",
        "https://attacker.example",
      ),
    ).toBe("/da/courses/wheel");
  });

  it("normalizes header logo sizes before previewing or saving them", () => {
    expect(PUBLIC_TENANT_LOGO_SIZE).toEqual({
      MIN: 24,
      DEFAULT: 48,
      MAX: 72,
    });
    expect(normalizePublicTenantLogoSize()).toBe(
      PUBLIC_TENANT_LOGO_SIZE.DEFAULT,
    );
    expect(normalizePublicTenantLogoSize(null)).toBe(
      PUBLIC_TENANT_LOGO_SIZE.DEFAULT,
    );
    expect(normalizePublicTenantLogoSize("")).toBe(
      PUBLIC_TENANT_LOGO_SIZE.DEFAULT,
    );
    expect(normalizePublicTenantLogoSize(12)).toBe(PUBLIC_TENANT_LOGO_SIZE.MIN);
    expect(normalizePublicTenantLogoSize(99)).toBe(PUBLIC_TENANT_LOGO_SIZE.MAX);
    expect(normalizePublicTenantLogoSize(41.6)).toBe(42);
  });

  it("keeps gift vouchers as an explicit public primary action", () => {
    const draft = normalizePublicTenant(rawTenant).publicSite;
    draft.header.primaryCta = "vouchers";

    expect(buildPublicSiteDraftPatch(draft).header.primaryCta).toBe("vouchers");
  });

  it("updates nested draft state immutably and detects only controlled changes", () => {
    const original = normalizePublicTenant(rawTenant).publicSite;
    const changed = replacePublicSiteValue(
      original,
      "pages.home.headline.en",
      "A new headline",
    );

    expect(original.pages.home.headline.en).toBe("Create with us");
    expect(changed.pages.home.headline.en).toBe("A new headline");
    expect(arePublicSiteDraftsEqual(original, changed)).toBe(false);

    const withIgnoredProperty = {
      ...original,
      unsafeComponentConfig: { rawHtml: "<script />" },
    };
    expect(arePublicSiteDraftsEqual(original, withIgnoredProperty)).toBe(true);

    const withModernStyle = replacePublicSiteValue(
      original,
      "branding.stylePreset",
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );
    expect(original.branding.stylePreset).toBe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    );
    expect(arePublicSiteDraftsEqual(original, withModernStyle)).toBe(false);
  });

  it("keeps transient spaces in editor state while normalizing the saved payload", () => {
    const original = normalizePublicTenant(rawTenant).publicSite;
    const oneWord = replacePublicSiteValue(
      original,
      "branding.displayName",
      "Atelier",
    );
    const trailingSpace = replacePublicSiteValue(
      oneWord,
      "branding.displayName",
      "Atelier ",
    );
    const completeName = replacePublicSiteValue(
      trailingSpace,
      "branding.displayName",
      "Atelier Klei",
    );

    expect(arePublicSiteDraftsEqual(oneWord, trailingSpace)).toBe(true);
    expect(arePublicSiteEditorStatesEqual(oneWord, trailingSpace)).toBe(false);
    expect(completeName.branding.displayName).toBe("Atelier Klei");
    expect(buildPublicSiteDraftPatch(completeName).branding.displayName).toBe(
      "Atelier Klei",
    );
  });

  it("changes only the preset while preserving tenant branding, images, and content", () => {
    const original = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        branding: {
          ...rawTenant.publicSite.branding,
          faviconUrl: "https://media.example/favicon.png",
          coverImageUrl: "https://media.example/cover.webp",
        },
        login: {
          headline: { cs: "Vítejte", en: "Welcome" },
          backgroundImageUrl: "https://media.example/login.webp",
        },
        footer: {
          ...rawTenant.publicSite.footer,
          description: { cs: "Patička studia", en: "Studio footer" },
          openingHours: { cs: "Po–Ne", en: "Mon–Sun" },
        },
      },
    }).publicSite;

    const changed = replacePublicSiteValue(
      original,
      "branding.stylePreset",
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );

    expect(changed.branding).toMatchObject({
      stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
      logoUrl: "https://media.example/logo.png",
      faviconUrl: "https://media.example/favicon.png",
      coverImageUrl: "https://media.example/cover.webp",
      accentColor: original.branding.accentColor,
      secondaryColor: original.branding.secondaryColor,
      backgroundColor: original.branding.backgroundColor,
      textColor: original.branding.textColor,
    });
    expect(changed.login).toEqual(original.login);
    expect(changed.header).toEqual(original.header);
    expect(changed.footer).toEqual(original.footer);
    expect(changed.pages).toEqual(original.pages);

    expect(
      replacePublicSiteValue(
        changed,
        "branding.stylePreset",
        PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
      ),
    ).toEqual(original);
    expect(original.branding.stylePreset).toBe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    );
  });

  it("atomically applies a preset recipe while preserving content and later overrides", () => {
    const original = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        branding: {
          ...rawTenant.publicSite.branding,
          buttonTextColor: "#fefefe",
          coverImageUrl: "https://media.example/cover.webp",
        },
        register: {
          headline: { cs: "Přidejte se", en: "Join us" },
          backgroundImageUrl: "https://media.example/register.webp",
        },
      },
    }).publicSite;
    const recipe = getPublicTenantStylePresetRecipe(
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );
    const changed = applyPublicSiteStylePreset(
      original,
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );

    expect(changed.branding).toMatchObject(recipe);
    expect(changed.branding.coverImageUrl).toBe(
      original.branding.coverImageUrl,
    );
    expect(changed.branding.buttonTextColor).toBe("#FEFEFE");
    expect(changed.register).toEqual(original.register);
    expect(changed.pages).toEqual(original.pages);

    const overridden = replacePublicSiteValue(
      changed,
      "branding.fontPreset",
      PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
    );
    const recolored = replacePublicSiteValue(
      overridden,
      "branding.accentColor",
      "#3146C8",
    );

    expect(buildPublicSiteDraftPatch(recolored).branding).toMatchObject({
      stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
      fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
      accentColor: "#3146C8",
      secondaryColor: recipe.secondaryColor,
      backgroundColor: recipe.backgroundColor,
      textColor: recipe.textColor,
      labelColor: recipe.labelColor,
    });
  });

  it("defaults new typography to Manrope and keeps page colours inheritable", () => {
    const normalized = normalizePublicTenant(rawTenant);
    const patch = buildPublicSiteDraftPatch(normalized.publicSite);
    const theme = getPublicTenantTheme(normalized);

    expect(normalized.publicSite.branding.fontPreset).toBe(
      DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID,
    );
    expect(theme.resolvedFontPresetId).toBe(
      PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
    );
    expect(theme.style["--tenant-font-display"]).toContain("Manrope");
    expect(normalized.publicSite.branding.logoSize).toBe(
      PUBLIC_TENANT_LOGO_SIZE.DEFAULT,
    );
    expect(patch.branding.logoSize).toBe(PUBLIC_TENANT_LOGO_SIZE.DEFAULT);
    expect(patch.branding.buttonTextColor).toBe("");
    expect(theme.logoSize).toBe(PUBLIC_TENANT_LOGO_SIZE.DEFAULT);
    expect(patch.pages.home.labelColor).toBe("");
    expect(patch.pages.home.headlineColor).toBe("");
    expect(patch.login.labelColor).toBe("");
    expect(patch.register.labelColor).toBe("");
    expect(patch.customerPortal.dashboard.labelColor).toBe("");
    expect(patch.customerPortal.appearance).toEqual({
      backgroundColor: "",
      surfaceColor: "",
      textColor: "",
      headingColor: "",
      headerBackgroundColor: "",
      headerTextColor: "",
      primaryButtonColor: "",
      calendarBackgroundColor: "",
      calendarTextColor: "",
      profileMenuBackgroundColor: "",
    });
    expect(
      resolvePublicTenantLabelColor(
        patch.pages.home.labelColor,
        theme.backgroundColor,
        normalized.publicSite.branding.labelColor,
      ),
    ).toBe(theme.labelForeground);
  });

  it("builds the exact localized authentication and portal patch", () => {
    const publicSite = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        branding: {
          ...rawTenant.publicSite.branding,
          buttonTextColor: "#fefefe",
        },
        pages: {
          home: {
            eyebrow: { cs: "Studio", en: "Studio" },
            labelColor: "#3150B8",
          },
        },
        login: {
          eyebrow: { cs: "Účet", en: "Customer access" },
          headline: { cs: "Vítejte", en: "Welcome back" },
          supportingText: { cs: "Pokračujte", en: "Continue" },
          helpText: { cs: "Pomoc", en: "Help" },
          labelColor: "#3150B8",
          backgroundImageUrl: "https://media.example/login.webp",
          rawHtml: "<script />",
        },
        register: {
          eyebrow: { cs: "Registrace", en: "Join us" },
          headline: { cs: "Vytvořte účet", en: "Create an account" },
          supportingText: { cs: "Začněte", en: "Get started" },
          helpText: { cs: "Minuta", en: "One minute" },
          labelColor: "#8A402E",
          backgroundImageUrl: "https://media.example/register.webp",
          unsafeLayout: "iframe",
        },
        customerPortal: {
          dashboard: {
            eyebrow: { cs: "Přehled", en: "Dashboard" },
            headline: { cs: "Dobré ráno", en: "Good morning" },
            description: { cs: "Vše zde", en: "Everything is here" },
            labelColor: "#3150B8",
            injectedComponent: "ignored",
          },
          appearance: {
            backgroundColor: "#121820",
            surfaceColor: "#202b39",
            textColor: "#ffffff",
            headingColor: "#f1bd42",
            headerBackgroundColor: "#121820",
            headerTextColor: "#ffffff",
            primaryButtonColor: "#f1bd42",
            calendarBackgroundColor: "#202b39",
            calendarTextColor: "#ffffff",
            profileMenuBackgroundColor: "#fff2df",
            customCss: "display:none",
          },
        },
      },
    }).publicSite;

    expect(buildPublicSiteDraftPatch(publicSite)).toMatchObject({
      branding: { buttonTextColor: "#FEFEFE" },
      pages: { home: { labelColor: "#3150B8" } },
      login: {
        eyebrow: { cs: "Účet", en: "Customer access" },
        headline: { cs: "Vítejte", en: "Welcome back" },
        supportingText: { cs: "Pokračujte", en: "Continue" },
        helpText: { cs: "Pomoc", en: "Help" },
        labelColor: "#3150B8",
        backgroundImageUrl: "https://media.example/login.webp",
      },
      register: {
        eyebrow: { cs: "Registrace", en: "Join us" },
        headline: { cs: "Vytvořte účet", en: "Create an account" },
        supportingText: { cs: "Začněte", en: "Get started" },
        helpText: { cs: "Minuta", en: "One minute" },
        labelColor: "#8A402E",
        backgroundImageUrl: "https://media.example/register.webp",
      },
      customerPortal: {
        dashboard: {
          eyebrow: { cs: "Přehled", en: "Dashboard" },
          headline: { cs: "Dobré ráno", en: "Good morning" },
          description: { cs: "Vše zde", en: "Everything is here" },
          labelColor: "#3150B8",
        },
        appearance: {
          backgroundColor: "#121820",
          surfaceColor: "#202B39",
          textColor: "#FFFFFF",
          headingColor: "#F1BD42",
          headerBackgroundColor: "#121820",
          headerTextColor: "#FFFFFF",
          primaryButtonColor: "#F1BD42",
          calendarBackgroundColor: "#202B39",
          calendarTextColor: "#FFFFFF",
          profileMenuBackgroundColor: "#FFF2DF",
        },
      },
    });
    expect(
      buildPublicSiteDraftPatch(publicSite).customerPortal.appearance,
    ).not.toHaveProperty("customCss");
    expect(buildPublicSiteDraftPatch(publicSite).register).not.toHaveProperty(
      "unsafeLayout",
    );
  });

  it("maps each editable hero to its exact media slot", () => {
    expect(PUBLIC_SITE_EDITOR_MEDIA).toMatchObject({
      coverImageUrl: "cover",
      backgroundImageUrl: "loginBackground",
      loginBackgroundImageUrl: "loginBackground",
      registerBackgroundImageUrl: "registerBackground",
    });
    expect(publicSiteApiRoutes.media("registerBackground")).toBe(
      "/tenants/current/settings/public-site/media/registerBackground",
    );
  });

  it("keeps the current style, font and customer-experience controls localized in Czech and English", () => {
    const requiredKeys = [
      "styleTitle",
      "styleDescription",
      "styleSelectorLabel",
      "styleDraftHint",
      "styleUnavailable",
      "selected",
      "comingSoon",
      "previewStudio",
      "previewEyebrow",
      "previewAction",
      "fontTitle",
      "fontDescription",
      "fontSelectorLabel",
      "fontHint",
      "logoSize",
      "labelColor",
      "buttonTextColor",
      "buttonTextColorHint",
      "useAutomaticContrast",
      "usingAutomaticContrast",
      "customButtonTextColor",
      "adjustedButtonTextColor",
      "useBrandColor",
      "usingBrandColor",
      "customLabelColor",
    ];

    expect(PUBLIC_TENANT_FONT_PRESET_ORDER).toEqual([
      PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
      PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF,
      PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF,
    ]);

    for (const messages of [enMessages, csMessages]) {
      const branding = messages.PublicSiteEditor.branding;
      for (const key of requiredKeys) {
        expect(branding[key]).toEqual(expect.any(String));
        expect(branding[key].trim()).not.toBe("");
      }
      const presetKeys = ["classicEditorial", "modernMinimal", "warmOrganic"];
      expect(Object.keys(branding.presets)).toEqual(presetKeys);
      for (const presetKey of presetKeys) {
        for (const messageKey of [
          "name",
          "description",
          "sample",
          "sampleText",
        ]) {
          expect(branding.presets[presetKey][messageKey]).toEqual(
            expect.any(String),
          );
          expect(branding.presets[presetKey][messageKey].trim()).not.toBe("");
        }
      }
      expect(Object.keys(branding.fontPresets)).toEqual([
        "skabSans",
        "editorialSerif",
        "modernCondensed",
        "warmSerif",
      ]);
      for (const font of Object.values(branding.fontPresets)) {
        expect(font).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          sample: expect.any(String),
        });
      }

      expect(messages.PublicSiteEditor.tabs).toMatchObject({
        register: expect.any(String),
        customerPortal: expect.any(String),
      });
      expect(messages.PublicSiteEditor.register).toMatchObject({
        contentTitle: expect.any(String),
        contentDescription: expect.any(String),
        eyebrow: expect.any(String),
        labelColor: expect.any(String),
        headline: expect.any(String),
        supportingText: expect.any(String),
        helpText: expect.any(String),
        imageTitle: expect.any(String),
        imageDescription: expect.any(String),
        backgroundImage: expect.any(String),
        backgroundImageHint: expect.any(String),
      });
      expect(messages.PublicSiteEditor.customerPortal).toMatchObject({
        contentTitle: expect.any(String),
        contentDescription: expect.any(String),
        eyebrow: expect.any(String),
        labelColor: expect.any(String),
        headline: expect.any(String),
        description: expect.any(String),
      });
      expect(messages.PublicSiteEditor.messages.invalidColors).toEqual(
        expect.any(String),
      );
      expect(messages.PublicSiteEditor.preview.pages).toMatchObject({
        register: expect.any(String),
        portal: expect.any(String),
      });
      expect(messages.PublicSiteEditor.preview.devices.tablet).toEqual(
        expect.any(String),
      );
      expect(messages.PublicSiteEditor.preview.tablet).toEqual(
        expect.any(String),
      );
      for (const key of [
        "loginFormEyebrow",
        "registerFormEyebrow",
        "registerCard",
        "portalOverview",
        "portalBookings",
        "portalUpcoming",
        "portalUpcomingDescription",
        "portalNextVisit",
        "portalVisitValue",
        "portalAccount",
      ]) {
        expect(messages.PublicSiteEditor.preview[key]).toEqual(
          expect.any(String),
        );
      }
    }
  });

  it("reorders only known navigation positions", () => {
    expect(
      movePublicSiteNavigationItem(
        ["book", "courses", "memberships", "help"],
        "courses",
        1,
      ),
    ).toEqual(["book", "memberships", "courses", "help"]);
    expect(
      movePublicSiteNavigationItem(
        ["book", "courses", "memberships", "help"],
        "book",
        -1,
      ),
    ).toEqual(["book", "courses", "memberships", "help"]);
  });

  it("builds a browser-owned multipart upload with the exact revision", () => {
    const file = new File(["image"], "studio.png", { type: "image/png" });
    const request = buildPublicSiteMediaRequest({
      slot: "cover",
      file,
      revision: 12,
    });

    expect(request).toMatchObject({
      url: "/tenants/current/settings/public-site/media/cover",
      method: "POST",
    });
    expect(request).not.toHaveProperty("headers");
    expect(request.body).toBeInstanceOf(FormData);
    expect(request.body.get("image")).toBe(file);
    expect(request.body.get("revision")).toBe("12");
  });

  it("validates media before starting an upload", () => {
    expect(
      validatePublicSiteMediaFile(
        new File([], "empty.png", { type: "image/png" }),
      ),
    ).toEqual({ valid: false, messageKey: "mediaEmpty" });
    expect(
      validatePublicSiteMediaFile(
        new File(["svg"], "unsafe.svg", { type: "image/svg+xml" }),
      ),
    ).toEqual({ valid: false, messageKey: "mediaInvalidType" });
    expect(
      validatePublicSiteMediaFile({
        name: "huge.jpg",
        type: "image/jpeg",
        size: 8 * 1024 * 1024 + 1,
      }),
    ).toEqual({ valid: false, messageKey: "mediaTooLarge" });
    expect(
      validatePublicSiteMediaFile(
        new File(["png"], "studio.png", { type: "image/png" }),
      ),
    ).toEqual({ valid: true, messageKey: null });
  });

  it("formats upload sizes without showing tiny files as zero megabytes", () => {
    expect(formatPublicSiteMediaSize(5)).toBe("5 B");
    expect(formatPublicSiteMediaSize(2_048)).toBe("2 KB");
    expect(formatPublicSiteMediaSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("maps backend media failures to stable localized message keys", () => {
    expect(
      getPublicSiteMediaErrorKey({
        data: { code: "PUBLIC_SITE_MEDIA_STORAGE_UNAVAILABLE" },
      }),
    ).toBe("mediaStorageUnavailable");
    expect(
      getPublicSiteMediaErrorKey({
        data: { code: "PUBLIC_SITE_MEDIA_INVALID_DIMENSIONS" },
      }),
    ).toBe("mediaInvalidImage");
    expect(getPublicSiteMediaErrorKey(new Error("raw EPROTO"))).toBe(
      "mediaError",
    );
  });

  it("allows the first publish and hides disabled preview destinations", () => {
    expect(
      canPublishPublicSiteDraft({
        hasChanges: false,
        hasPublishedSnapshot: false,
      }),
    ).toBe(true);
    expect(
      canPublishPublicSiteDraft({
        hasChanges: false,
        hasPublishedSnapshot: true,
      }),
    ).toBe(false);
    expect(
      canPublishPublicSiteDraft({
        hasChanges: true,
        hasPublishedSnapshot: true,
      }),
    ).toBe(true);
    expect(
      getAvailablePublicSitePreviewPages({
        bookStudio: false,
        courses: true,
        memberships: false,
        vouchers: false,
        help: true,
      }),
    ).toEqual([
      "home",
      "courses",
      "help",
      "login",
      "register",
      "portal",
      "portalCourses",
    ]);
    expect(
      getAvailablePublicSitePreviewPages({
        bookStudio: false,
        courses: false,
        memberships: false,
        vouchers: true,
        help: false,
      }),
    ).toEqual(["home", "vouchers", "login", "register", "portal"]);
  });

  it("preserves separate localized course headings and photos across draft round trips", () => {
    const publicSite = {
      customerPortal: {
        pages: { courses: { enabled: false } },
        courses: {
          guestCheckoutEnabled: false,
          locations: [
            {
              locationId: "studio-a",
              headline: {
                cs: "Kurzy na Václavské",
                en: "Courses at Václavská",
              },
              description: { cs: "Práce s hlínou.", en: "" },
              heroImageUrl: "https://images.example.test/a.webp",
            },
            {
              locationId: "studio-b",
              headline: { cs: "", en: "Grohova courses" },
              description: { cs: "", en: "" },
              heroImageUrl: "",
            },
          ],
        },
      },
    };
    const draft = normalizePublicSiteEditorDraft({
      publicSite,
      tenantName: "Clay",
      tenantSlug: "clay",
    });
    const patch = buildPublicSiteDraftPatch(draft);
    expect(patch.customerPortal.courses).toEqual(
      publicSite.customerPortal.courses,
    );
    expect(patch.customerPortal.pages.courses.enabled).toBe(false);
    expect(
      normalizePublicTenant({ name: "Clay", publicSite: patch }).publicSite
        .customerPortal.courses,
    ).toEqual(publicSite.customerPortal.courses);
    const edited = replacePublicSiteValue(
      draft,
      "customerPortal.courses.locations.0.headline.en",
      "New title",
    );
    expect(
      buildPublicSiteDraftPatch(edited).customerPortal.courses.locations[1],
    ).toEqual(publicSite.customerPortal.courses.locations[1]);
    expect(arePublicSiteDraftsEqual(draft, edited)).toBe(false);
  });

  it("requires an explicit guest checkout opt-in and preserves disabling it on save", () => {
    for (const value of [undefined, false, "true", 1]) {
      const draft = normalizePublicSiteEditorDraft({
        publicSite: {
          customerPortal: { courses: { guestCheckoutEnabled: value } },
        },
      });
      expect(draft.customerPortal.courses.guestCheckoutEnabled).toBe(false);
      expect(
        buildPublicSiteDraftPatch(draft).customerPortal.courses
          .guestCheckoutEnabled,
      ).toBe(false);
    }
    const draft = normalizePublicSiteEditorDraft({
      publicSite: {
        customerPortal: { courses: { guestCheckoutEnabled: true } },
      },
    });
    expect(
      buildPublicSiteDraftPatch(draft).customerPortal.courses
        .guestCheckoutEnabled,
    ).toBe(true);
    const disabled = replacePublicSiteValue(
      draft,
      "customerPortal.courses.guestCheckoutEnabled",
      false,
    );
    expect(arePublicSiteDraftsEqual(draft, disabled)).toBe(false);
    expect(
      buildPublicSiteDraftPatch(disabled).customerPortal.courses
        .guestCheckoutEnabled,
    ).toBe(false);
  });

  it("binds a course hero upload to the selected studio and draft revision", () => {
    const file = new File(["image"], "hero.webp", { type: "image/webp" });
    const request = buildPublicSiteMediaRequest({
      slot: "courseHero",
      file,
      revision: 3,
      locationId: "studio-b",
    });
    expect(request.body.get("locationId")).toBe("studio-b");
    expect(request.body.get("revision")).toBe("3");
    expect(request.body.get("image")).toBe(file);
  });

  it("merges a retried course hero by studio ID after draft entries move", () => {
    const original = {
      customerPortal: {
        courses: {
          locations: [
            {
              locationId: "studio-b",
              headline: { en: "Other studio" },
              heroImageUrl: "https://images.example.test/b.webp",
            },
            {
              locationId: "studio-a",
              headline: { en: "Unsaved title" },
              description: { cs: "Rozepsaný text" },
              heroImageUrl: "",
            },
          ],
        },
      },
    };
    const result = applyPublicSiteMediaUpload(original, {
      path: "customerPortal.courses.locations.0.heroImageUrl",
      locationId: "studio-a",
      url: "https://images.example.test/a.webp",
    });

    expect(result.customerPortal.courses.locations).toEqual([
      original.customerPortal.courses.locations[0],
      {
        ...original.customerPortal.courses.locations[1],
        heroImageUrl: "https://images.example.test/a.webp",
      },
    ]);
    expect(original.customerPortal.courses.locations[1].heroImageUrl).toBe("");
  });

  it("restores the correct studio entry when Undo removed it before retry", () => {
    const otherStudio = {
      locationId: "studio-b",
      headline: { en: "Other studio" },
      description: {},
      heroImageUrl: "https://images.example.test/b.webp",
    };
    const result = applyPublicSiteMediaUpload(
      { customerPortal: { courses: { locations: [otherStudio] } } },
      {
        path: "customerPortal.courses.locations.0.heroImageUrl",
        locationId: "studio-a",
        url: "https://images.example.test/a.webp",
      },
    );

    expect(result.customerPortal.courses.locations).toEqual([
      otherStudio,
      {
        locationId: "studio-a",
        headline: {},
        description: {},
        heroImageUrl: "https://images.example.test/a.webp",
      },
    ]);
  });

  it("preserves regular website media uploads without a studio ID", () => {
    expect(
      applyPublicSiteMediaUpload(
        { branding: { logoUrl: "old", coverImageUrl: "cover" } },
        { path: "branding.logoUrl", url: "new" },
      ),
    ).toEqual({ branding: { logoUrl: "new", coverImageUrl: "cover" } });
  });

  it("rejects incomplete required and optional colour values before persistence", () => {
    const validDraft = normalizePublicSiteEditorDraft({
      publicSite: {},
      tenantName: "Clay House",
      tenantSlug: "clay-house",
    });

    expect(isValidPublicSiteEditorDraft(validDraft)).toBe(true);
    expect(
      getInvalidPublicSiteColorPaths({
        ...validDraft,
        branding: {
          ...validDraft.branding,
          accentColor: "#12",
          buttonTextColor: "#123",
        },
        register: { ...validDraft.register, labelColor: "blue" },
        pages: {
          ...validDraft.pages,
          home: { ...validDraft.pages.home, headlineColor: "#123" },
        },
        customerPortal: {
          ...validDraft.customerPortal,
          appearance: {
            ...validDraft.customerPortal.appearance,
            calendarBackgroundColor: "#123",
          },
        },
      }),
    ).toEqual([
      "branding.accentColor",
      "branding.buttonTextColor",
      "pages.home.headlineColor",
      "register.labelColor",
      "customerPortal.appearance.calendarBackgroundColor",
    ]);
    expect(
      isValidPublicSiteEditorDraft({
        ...validDraft,
        pages: {
          ...validDraft.pages,
          home: {
            ...validDraft.pages.home,
            labelColor: "",
            headlineColor: "",
          },
        },
      }),
    ).toBe(true);
  });
});

describe("public tenant rendering safety", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example/path",
    "https://user:password@example.com/path",
    "https://example.com:8443/path",
    "\\\\evil.example\\path",
  ])("fails closed for an unsafe tenant URL: %s", (value) => {
    expect(normalizePublicTenantUrl(value)).toBe("");
  });

  it("filters unsafe URLs and malformed colours even if the API is corrupted", () => {
    const tenant = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        branding: {
          ...rawTenant.publicSite.branding,
          logoUrl: "javascript:alert(1)",
          coverImageUrl: "//evil.example/cover.jpg",
          accentColor: "#fff;background:red",
          buttonTextColor: "currentColor",
        },
        header: {
          ...rawTenant.publicSite.header,
          announcement: {
            text: { en: "Notice" },
            url: "data:text/html,boom",
          },
        },
        footer: {
          ...rawTenant.publicSite.footer,
          social: {
            instagram: "http://instagram.example/profile",
          },
          legal: {
            privacy: "javascript:alert(1)",
          },
        },
      },
    });

    expect(tenant.publicSite.branding.logoUrl).toBe("");
    expect(tenant.publicSite.branding.coverImageUrl).toBe("");
    expect(tenant.publicSite.branding.accentColor).toBe("#2563EB");
    expect(tenant.publicSite.branding.buttonTextColor).toBe("");
    expect(tenant.publicSite.header.announcement.url).toBe("");
    expect(tenant.publicSite.footer.social.instagram).toBe("");
    expect(tenant.publicSite.footer.legal.privacy).toBe("");
  });

  it("honours capability and visibility controls without inventing routes", () => {
    const tenant = normalizePublicTenant(rawTenant);

    expect(getPublicTenantNavigation(tenant)).toEqual([
      { key: "help", href: "/help" },
      { key: "book", href: "/book" },
    ]);
  });

  it("chooses strong action contrast and safely guards custom colours", () => {
    expect(resolvePublicTenantActionForeground("#2563EB")).toBe("#FFFFFF");
    expect(resolvePublicTenantActionForeground("#FEFEFE")).toBe("#11110F");
    expect(resolvePublicTenantActionForeground("#2563EB", "#FEFEFE")).toBe(
      "#FEFEFE",
    );
    expect(resolvePublicTenantActionForeground("#2563EB", "#2563EB")).toBe(
      "#FFFFFF",
    );
  });

  it("normalizes and resolves an optional readable homepage headline colour", () => {
    const tenant = normalizePublicTenant({
      ...rawTenant,
      publicSite: {
        ...rawTenant.publicSite,
        pages: {
          home: {
            ...rawTenant.publicSite.pages.home,
            headlineColor: "#fcfbf8",
          },
        },
      },
    });
    const theme = getPublicTenantTheme(tenant);
    const patch = buildPublicSiteDraftPatch(tenant.publicSite);
    const customHeadlineColor = resolvePublicTenantLabelColor(
      patch.pages.home.headlineColor,
      theme.backgroundColor,
      theme.textForeground,
    );

    expect(patch.pages.home.headlineColor).toBe("#FCFBF8");
    expect(customHeadlineColor).not.toBe("#FCFBF8");
    expect(
      contrastRatio(customHeadlineColor, theme.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      resolvePublicTenantLabelColor(
        "",
        theme.backgroundColor,
        theme.textForeground,
      ),
    ).toBe(theme.textForeground);
  });

  it("derives valid, contrast-aware theme tokens from tenant colours", () => {
    const theme = getPublicTenantTheme(rawTenant);

    expect(theme.accentColor).toBe("#FEFEFE");
    expect(theme.accentForeground).toBe("#11110F");
    expect(theme.accentLinkColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(theme.style).toMatchObject({
      "--tenant-accent": "#FEFEFE",
      "--tenant-accent-foreground": "#11110F",
      "--tenant-accent-link": theme.accentLinkColor,
      "--tenant-background": "#FFFFFF",
      "--tenant-text": "#182333",
    });
  });

  it("derives readable portal header, button, calendar and profile-menu tokens", () => {
    const theme = getPublicTenantTheme({
      name: "Night studio",
      slug: "night-studio",
      publicSite: {
        branding: {
          accentColor: "#15171A",
          secondaryColor: "#242933",
          backgroundColor: "#101216",
          textColor: "#16191F",
          labelColor: "#181B20",
        },
        customerPortal: {
          appearance: {
            headerBackgroundColor: "#121820",
            primaryButtonColor: "#F1BD42",
            calendarBackgroundColor: "#202B39",
            profileMenuBackgroundColor: "#FFF2DF",
          },
        },
      },
    });

    expect(theme.accentForeground).toBe("#FFFFFF");
    expect(theme.portalButtonForeground).toBe("#11110F");
    expect(theme.style).toMatchObject({
      "--tenant-portal-header-background": "#121820",
      "--tenant-portal-button": "#F1BD42",
      "--tenant-portal-calendar-background": "#202B39",
      "--tenant-portal-profile-background": "#FFF2DF",
    });
    expect(
      contrastRatio(
        theme.style["--tenant-portal-button-foreground"],
        theme.style["--tenant-portal-button"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        theme.style["--tenant-portal-header-text"],
        theme.style["--tenant-portal-header-background"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        theme.style["--tenant-portal-calendar-text"],
        theme.style["--tenant-portal-calendar-background"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        theme.style["--tenant-portal-profile-text"],
        theme.style["--tenant-portal-profile-background"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("derives auth copy and labels against the actual dark form surface", () => {
    const theme = getPublicTenantTheme({
      name: "Night studio",
      slug: "night-studio",
      publicSite: {
        branding: {
          stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
          accentColor: "#20242A",
          secondaryColor: "#252A31",
          backgroundColor: "#101216",
          textColor: "#171A20",
          labelColor: "#242830",
        },
      },
    });
    const formSurface = theme.style["--tenant-auth-form-surface"];

    expect(formSurface).toMatch(/^#[0-9A-F]{6}$/);
    expect(theme.style["--tenant-auth-form-label"]).toBe(
      resolvePublicTenantLabelColor("#242830", formSurface, "#20242A"),
    );
    expect(theme.style["--tenant-auth-form-text"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(theme.style["--tenant-auth-form-muted"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(theme.style["--tenant-auth-form-link"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(theme.style["--tenant-auth-form-text"]).not.toBe("#171A20");
    expect(theme.style["--tenant-auth-form-label"]).not.toBe("#242830");
    expect(theme.style["--tenant-auth-form-link"]).not.toBe(
      theme.accentLinkColor,
    );
  });
});
