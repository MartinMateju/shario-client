import { describe, expect, it } from "vitest";

import {
  getPublicTenantTheme,
  normalizePublicTenant,
} from "@/components/public-tenant/publicTenant.config";
import {
  DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID,
  PUBLIC_TENANT_STYLE_PRESET_IDS,
  PUBLIC_TENANT_STYLE_PRESET_ORDER,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
} from "@/components/public-site-editor/publicSiteEditor.utils";

const tenant = {
  id: "tenant-rollout",
  name: "Rollout Studio",
  slug: "rollout-studio",
  publicCapabilities: {
    bookStudio: true,
    courses: true,
    memberships: true,
    vouchers: true,
    help: true,
    registration: true,
  },
  publicSite: {
    branding: {
      displayName: "Rollout Studio Identity",
      stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
      logoUrl: "https://media.example.com/rollout/logo.webp",
      faviconUrl: "https://media.example.com/rollout/favicon.png",
      coverImageUrl: "https://media.example.com/rollout/cover.webp",
      accentColor: "#4056D6",
      secondaryColor: "#D9806E",
      backgroundColor: "#FFFDF7",
      textColor: "#26231F",
      description: {
        cs: "Vlastní popis studia",
        en: "Custom studio description",
      },
    },
    pages: {
      home: {
        eyebrow: { cs: "Vítejte", en: "Welcome" },
        headline: { cs: "Tvořte s námi", en: "Create with us" },
        description: { cs: "Český obsah", en: "English content" },
      },
      book: {
        title: { cs: "Rezervace", en: "Bookings" },
        description: { cs: "Vyberte si čas", en: "Choose a time" },
      },
    },
    header: {
      navOrder: ["courses", "book", "memberships", "vouchers", "help"],
      hiddenItems: ["help"],
      primaryCta: "courses",
      announcement: {
        text: { cs: "Nový kurz", en: "New class" },
        url: "/courses",
      },
    },
    footer: {
      description: { cs: "Patička", en: "Footer copy" },
      openingHours: { cs: "Po–Ne", en: "Mon–Sun" },
      copyright: { cs: "Studio", en: "Studio" },
      email: "hello@example.com",
      phone: "+420 111 222 333",
      address: "Brno",
      social: {
        instagram: "https://instagram.com/rollout-studio",
        facebook: "https://facebook.com/rollout-studio",
        youtube: "https://youtube.com/@rollout-studio",
        website: "https://example.com",
      },
      legal: {
        studioRules: "/rules",
        terms: "/terms",
        privacy: "/privacy",
        cancellation: "/cancellation",
      },
    },
    login: {
      headline: { cs: "Vítejte zpět", en: "Welcome back" },
      supportingText: { cs: "Pokračujte", en: "Continue creating" },
      helpText: { cs: "Potřebujete pomoc?", en: "Need help?" },
      backgroundImageUrl: "https://media.example.com/rollout/login.webp",
    },
  },
};

const withoutPreset = (publicSite) => ({
  branding: Object.fromEntries(
    Object.entries(publicSite.branding).filter(
      ([key]) => key !== "stylePreset",
    ),
  ),
  pages: publicSite.pages,
  header: publicSite.header,
  footer: publicSite.footer,
  login: publicSite.login,
});

describe("public-site style rollout contract", () => {
  const original = normalizePublicTenant(tenant).publicSite;
  const preservedContract = withoutPreset(
    normalizePublicTenant({
      ...tenant,
      publicSite: buildPublicSiteDraftPatch(original),
    }).publicSite,
  );

  it.each(PUBLIC_TENANT_STYLE_PRESET_ORDER)(
    "persists %s while preserving the complete tenant palette and content",
    (presetId) => {
      const selected = replacePublicSiteValue(
        original,
        "branding.stylePreset",
        presetId,
      );
      const patch = buildPublicSiteDraftPatch(selected);
      const persisted = normalizePublicTenant({
        ...tenant,
        publicSite: patch,
      }).publicSite;
      const theme = getPublicTenantTheme({ ...tenant, publicSite: persisted });

      expect(patch.branding.stylePreset).toBe(presetId);
      expect(persisted.branding.stylePreset).toBe(presetId);
      expect(withoutPreset(persisted)).toEqual(preservedContract);
      expect(theme).toMatchObject({
        stylePresetId: presetId,
        resolvedStylePresetId: presetId,
        accentColor: "#4056D6",
        secondaryColor: "#D9806E",
        backgroundColor: "#FFFDF7",
        textColor: "#26231F",
      });
      expect(original.branding.stylePreset).toBe(
        PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
      );
    },
  );

  it.each([undefined, null, "", "future-layout-v9", "<style>bad</style>"])(
    "safely resolves an unsupported persisted value (%s) to Classic Editorial",
    (stylePreset) => {
      const draft = normalizePublicSiteEditorDraft({
        publicSite: {
          ...tenant.publicSite,
          branding: {
            ...tenant.publicSite.branding,
            stylePreset,
          },
        },
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
      });
      const patch = buildPublicSiteDraftPatch(draft);
      const theme = getPublicTenantTheme({ ...tenant, publicSite: draft });

      expect(draft.branding.stylePreset).toBe(
        DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID,
      );
      expect(patch.branding.stylePreset).toBe(
        DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID,
      );
      expect(theme.stylePresetId).toBe(DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID);
      expect(theme.resolvedStylePresetId).toBe(
        DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID,
      );
      expect(withoutPreset(draft)).toEqual(preservedContract);
    },
  );
});
