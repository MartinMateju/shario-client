import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID,
  DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID,
  PUBLIC_TENANT_FONT_PRESET_IDS,
  PUBLIC_TENANT_STYLE_PRESET_IDS,
  PUBLIC_TENANT_STYLE_PRESET_ORDER,
  PUBLIC_TENANT_STYLE_PRESET_REGISTRY,
  getPublicTenantStylePreset,
  normalizePublicTenantStylePresetId,
  resolvePublicTenantStylePreset,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  getPublicTenantTheme,
  normalizePublicTenant,
} from "@/components/public-tenant/publicTenant.config";

const expectDeepFrozen = (value) => {
  expect(Object.isFrozen(value)).toBe(true);

  Object.values(value).forEach((nestedValue) => {
    if (nestedValue && typeof nestedValue === "object") {
      expectDeepFrozen(nestedValue);
    }
  });
};

describe("public tenant style preset foundation", () => {
  it("keeps the three versioned preset IDs stable and ordered", () => {
    expect(PUBLIC_TENANT_STYLE_PRESET_IDS).toEqual({
      CLASSIC_EDITORIAL: "classic-editorial-v1",
      MODERN_MINIMAL: "modern-minimal-v1",
      WARM_ORGANIC: "warm-organic-v1",
    });
    expect(PUBLIC_TENANT_STYLE_PRESET_ORDER).toEqual([
      "classic-editorial-v1",
      "modern-minimal-v1",
      "warm-organic-v1",
    ]);
    expect(DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID).toBe("classic-editorial-v1");
  });

  it("has an immutable registry entry for every public preset", () => {
    expect(Object.keys(PUBLIC_TENANT_STYLE_PRESET_REGISTRY)).toEqual(
      PUBLIC_TENANT_STYLE_PRESET_ORDER,
    );
    expect(Object.isFrozen(PUBLIC_TENANT_STYLE_PRESET_IDS)).toBe(true);
    expect(Object.isFrozen(PUBLIC_TENANT_STYLE_PRESET_ORDER)).toBe(true);
    expect(Object.isFrozen(PUBLIC_TENANT_STYLE_PRESET_REGISTRY)).toBe(true);

    PUBLIC_TENANT_STYLE_PRESET_ORDER.forEach((presetId) => {
      expectDeepFrozen(getPublicTenantStylePreset(presetId));
    });

    PUBLIC_TENANT_STYLE_PRESET_ORDER.forEach((presetId) => {
      expect(
        Object.keys(getPublicTenantStylePreset(presetId).tokens).sort(),
      ).toEqual([
        "buttons",
        "imagery",
        "radii",
        "shadows",
        "spacing",
        "typography",
      ]);
    });

    expect(
      getPublicTenantStylePreset(
        PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
      ).status,
    ).toBe("ready");
    expect(
      getPublicTenantStylePreset(PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL),
    ).toMatchObject({
      status: "ready",
      fallbackPresetId: null,
    });
    expect(
      getPublicTenantStylePreset(PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC),
    ).toMatchObject({
      status: "ready",
      fallbackPresetId: null,
    });
  });

  it("normalizes missing and unknown values to Classic Editorial", () => {
    expect(normalizePublicTenantStylePresetId()).toBe("classic-editorial-v1");
    expect(normalizePublicTenantStylePresetId("future-style-v9")).toBe(
      "classic-editorial-v1",
    );
    expect(normalizePublicTenantStylePresetId(" MODERN-MINIMAL-V1 ")).toBe(
      "modern-minimal-v1",
    );
    expect(resolvePublicTenantStylePreset("future-style-v9").id).toBe(
      "classic-editorial-v1",
    );
    expect(resolvePublicTenantStylePreset("modern-minimal-v1").id).toBe(
      "modern-minimal-v1",
    );
    expect(resolvePublicTenantStylePreset("warm-organic-v1").id).toBe(
      "warm-organic-v1",
    );
  });

  it("maps Classic Editorial to the existing typography, radii, and shadows", () => {
    const preset = getPublicTenantStylePreset("classic-editorial-v1");

    expect(preset.tokens.typography).toMatchObject({
      sans: expect.stringContaining('var(--font-manrope, "Manrope")'),
      serif: expect.stringContaining(
        'var(--font-editorial, "Playfair Display")',
      ),
      mono: expect.stringContaining('var(--font-geist-mono, "Geist Mono")'),
    });
    expect(preset.tokens.radii).toMatchObject({
      xs: "0.375rem",
      sm: "0.625rem",
      md: "0.875rem",
      lg: "1.125rem",
      xl: "1.5rem",
      "2xl": "2rem",
      pill: "9999px",
      control: "9999px",
      field: "1rem",
      card: "1.5rem",
      panel: "2rem",
      media: "1.5rem",
    });
    expect(preset.tokens.shadows).toMatchObject({
      xs: "0 1px 2px rgb(31 31 31 / 0.04)",
      card: "0 1px 2px rgb(31 31 31 / 0.03), 0 12px 32px rgb(31 31 31 / 0.06)",
      floating:
        "0 8px 24px rgb(31 31 31 / 0.08), 0 32px 80px rgb(31 31 31 / 0.1)",
    });
    expect(preset.cssVariables).toMatchObject({
      "--radius-xl": "1.5rem",
      "--radius-pill": "9999px",
      "--shadow-card": preset.tokens.shadows.card,
      "--tenant-font-body": preset.tokens.typography.sans,
      "--tenant-font-display": preset.tokens.typography.serif,
      "--tenant-radius-card": "1.5rem",
      "--tenant-shadow-xs": preset.tokens.shadows.xs,
      "--tenant-shadow-card": preset.tokens.shadows.card,
      "--tenant-shadow-cobalt": preset.tokens.shadows.cobalt,
      "--tenant-preview-space-hero-block": "1.75rem",
      "--tenant-image-filter": "saturate(0.96) contrast(1.02)",
    });
  });

  it("defines the complete Modern Minimal v1 token contract", () => {
    const preset = getPublicTenantStylePreset("modern-minimal-v1");

    expect(Object.keys(preset.tokens).sort()).toEqual([
      "buttons",
      "imagery",
      "radii",
      "shadows",
      "spacing",
      "typography",
    ]);
    expect(preset.tokens.typography).toEqual({
      sans: expect.stringContaining('"Manrope"'),
      serif: expect.stringContaining('"Manrope"'),
      mono: expect.stringContaining('var(--font-geist-mono, "Geist Mono")'),
      body: expect.stringContaining('"Manrope"'),
      display: expect.stringContaining('"Manrope"'),
      label: expect.stringContaining('"Manrope"'),
      bodyLineHeight: "1.65",
      displayLineHeight: "0.96",
      displayWeight: "600",
      displayTracking: "-0.045em",
      displayTransform: "none",
      labelWeight: "600",
      labelTracking: "0.14em",
      labelTransform: "uppercase",
    });
    expect(preset.tokens.spacing).toMatchObject({
      pageInline: "clamp(1rem, 3vw, 2rem)",
      sectionBlock: "clamp(4rem, 7vw, 5rem)",
      heroBlock: "clamp(4rem, 8vw, 7rem)",
      cardPadding: "clamp(1.5rem, 3vw, 2rem)",
      panelPadding: "clamp(1.5rem, 3vw, 2rem)",
      contentGap: "2rem",
      actionGap: "1rem",
      previewPageInline: "0.75rem",
      previewHeroBlock: "2rem",
    });
    expect(preset.tokens.buttons).toEqual({
      minHeight: "2.75rem",
      paddingInline: "1.5rem",
      fontSize: "0.75rem",
      fontWeight: "500",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      shadow: "none",
      hoverShadow: "none",
    });
    expect(preset.tokens.radii).toEqual({
      xs: "0.125rem",
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
      "2xl": "1rem",
      pill: "9999px",
      control: "9999px",
      field: "0.25rem",
      card: "0.25rem",
      panel: "0.5rem",
      media: "0px",
    });
    expect(preset.tokens.shadows).toEqual({
      xs: "0 1px 2px rgb(15 17 19 / 0.05)",
      sm: "0 2px 4px -2px rgb(15 17 19 / 0.08), 0 4px 6px -1px rgb(15 17 19 / 0.08)",
      card: "none",
      cardHover:
        "0 2px 4px -2px rgb(15 17 19 / 0.08), 0 4px 6px -1px rgb(15 17 19 / 0.08)",
      floating: "0 12px 32px rgb(15 17 19 / 0.1)",
      cobalt: "0 8px 24px rgb(var(--skab-blue-rgb)/0.14)",
      button: "none",
      buttonHover: "none",
    });
    expect(preset.tokens.imagery).toEqual({
      filter: "saturate(0.82) contrast(1.08)",
      scale: "1",
      hoverScale: "1",
      shadow: "none",
    });
    expect(preset.cssVariables).toMatchObject({
      "--tenant-font-body": preset.tokens.typography.body,
      "--tenant-font-display": preset.tokens.typography.display,
      "--tenant-font-label": preset.tokens.typography.label,
      "--tenant-leading-body": "1.65",
      "--tenant-leading-display": "0.96",
      "--tenant-display-tracking": "-0.045em",
      "--tenant-space-page-inline": "clamp(1rem, 3vw, 2rem)",
      "--tenant-space-section-block": "clamp(4rem, 7vw, 5rem)",
      "--tenant-button-min-height": "2.75rem",
      "--tenant-button-tracking": "0.12em",
      "--tenant-radius-field": "0.25rem",
      "--tenant-radius-card": "0.25rem",
      "--tenant-radius-media": "0px",
      "--tenant-shadow-card": "none",
      "--tenant-shadow-button": "none",
      "--tenant-preview-space-page-inline": "0.75rem",
      "--tenant-preview-space-hero-block": "2rem",
      "--tenant-image-filter": "saturate(0.82) contrast(1.08)",
      "--radius-xl": "0.75rem",
      "--shadow-floating": "0 12px 32px rgb(15 17 19 / 0.1)",
    });
  });

  it("defines the complete Warm Organic v1 token contract", () => {
    const preset = getPublicTenantStylePreset("warm-organic-v1");

    expect(preset.tokens.typography).toEqual({
      sans: expect.stringContaining('var(--font-manrope, "Manrope")'),
      serif: expect.stringContaining('var(--font-warm-display, "Fraunces")'),
      mono: expect.stringContaining('var(--font-geist-mono, "Geist Mono")'),
      body: expect.stringContaining('var(--font-manrope, "Manrope")'),
      display: expect.stringContaining('var(--font-warm-display, "Fraunces")'),
      label: expect.stringContaining('var(--font-manrope, "Manrope")'),
      bodyLineHeight: "1.7",
      displayLineHeight: "1.02",
      displayWeight: "500",
      displayTracking: "-0.028em",
      displayTransform: "none",
      labelWeight: "600",
      labelTracking: "0.12em",
      labelTransform: "uppercase",
    });
    expect(preset.tokens.spacing).toMatchObject({
      pageInline: "clamp(1.25rem, 4vw, 3.5rem)",
      sectionBlock: "clamp(4.5rem, 8vw, 7rem)",
      heroBlock: "clamp(4.25rem, 9vw, 7.5rem)",
      cardPadding: "clamp(1.5rem, 3vw, 2.25rem)",
      panelPadding: "clamp(1.5rem, 4vw, 3rem)",
      contentGap: "1.75rem",
      actionGap: "0.75rem",
      previewPageInline: "0.875rem",
      previewHeroBlock: "1.875rem",
    });
    expect(preset.tokens.buttons).toEqual({
      minHeight: "3.125rem",
      paddingInline: "1.75rem",
      fontSize: "0.8125rem",
      fontWeight: "600",
      letterSpacing: "0.015em",
      textTransform: "none",
      shadow: "0 12px 32px rgb(66 49 36 / 0.14)",
      hoverShadow: "0 18px 42px rgb(66 49 36 / 0.2)",
    });
    expect(preset.tokens.radii).toMatchObject({
      control: "1.25rem",
      field: "1rem",
      card: "2rem 1rem 2rem 1rem",
      panel: "2.75rem 1.5rem 2.75rem 1.5rem",
      media: "3rem 1.5rem 3rem 1.5rem",
    });
    expect(preset.tokens.shadows).toMatchObject({
      card: "0 18px 48px rgb(66 49 36 / 0.1)",
      cardHover: "0 24px 60px rgb(66 49 36 / 0.16)",
      floating: "0 24px 72px rgb(66 49 36 / 0.18)",
    });
    expect(preset.tokens.imagery).toEqual({
      filter: "saturate(0.9) sepia(0.08) contrast(0.98)",
      scale: "1.015",
      hoverScale: "1.04",
      shadow: "0 30px 80px rgb(66 49 36 / 0.18)",
    });
    expect(preset.cssVariables).toMatchObject({
      "--tenant-font-display": preset.tokens.typography.display,
      "--tenant-leading-body": "1.7",
      "--tenant-space-page-inline": "clamp(1.25rem, 4vw, 3.5rem)",
      "--tenant-preview-space-card-padding": "0.875rem",
      "--tenant-button-min-height": "3.125rem",
      "--tenant-radius-card": "2rem 1rem 2rem 1rem",
      "--tenant-radius-panel": "2.75rem 1.5rem 2.75rem 1.5rem",
      "--tenant-radius-media": "3rem 1.5rem 3rem 1.5rem",
      "--tenant-shadow-card": "0 18px 48px rgb(66 49 36 / 0.1)",
      "--tenant-image-scale-hover": "1.04",
    });
  });

  it("routes Tailwind typography utilities through tenant font tokens", () => {
    const globalsCss = readFileSync(
      resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );
    const localeLayout = readFileSync(
      resolve(process.cwd(), "src/app/[locale]/layout.js"),
      "utf8",
    );

    expect(globalsCss).toMatch(/--font-sans:\s*var\(\s*--tenant-font-body,/);
    expect(globalsCss).toMatch(
      /--font-serif:\s*var\(\s*--tenant-font-display,/,
    );
    expect(globalsCss).toMatch(/--font-mono:\s*var\(\s*--tenant-font-mono,/);
    expect(localeLayout).toContain("../../fonts/Manrope-Variable.ttf");

    ["xs", "sm", "card", "card-hover", "floating", "cobalt"].forEach(
      (shadow) => {
        expect(globalsCss).toMatch(
          new RegExp(
            `--shadow-${shadow}:\\s*var\\(\\s*--tenant-shadow-${shadow},`,
          ),
        );
      },
    );

    for (const presetId of PUBLIC_TENANT_STYLE_PRESET_ORDER) {
      expect(globalsCss).toContain(`[data-tenant-style="${presetId}"]`);
    }
    expect(globalsCss).toContain(":not([data-tenant-preview])");
    expect(globalsCss).toContain("var(--tenant-button-min-height)");
    expect(globalsCss).toContain("var(--tenant-radius-card)");
    expect(globalsCss).toContain("var(--tenant-shadow-card)");
    expect(globalsCss).toContain("[data-tenant-image]");
    expect(globalsCss).toContain("[data-tenant-button-compact]");
    expect(globalsCss).toContain("[data-dialog-layout]");
    expect(globalsCss).toContain('[data-preview-device="desktop"]');
    expect(globalsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(localeLayout).toContain("Barlow_Condensed");
    expect(localeLayout).toContain("Playfair_Display");
    expect(localeLayout).toContain("Fraunces");
    expect(localeLayout).toContain('variable: "--font-editorial"');
    expect(localeLayout).toContain('variable: "--font-modern-display"');
    expect(localeLayout).toContain('variable: "--font-warm-display"');
    expect(localeLayout).toMatch(/subsets:\s*\[\s*"latin",\s*"latin-ext"\s*\]/);
    expect(localeLayout).toContain("preload: false");
    expect(localeLayout).toMatch(/\$\{modernDisplay\.variable\}/);
    expect(localeLayout).toMatch(/\$\{editorialDisplay\.variable\}/);
    expect(localeLayout).toMatch(/\$\{warmDisplay\.variable\}/);
  });

  it("defaults every normalized tenant to Classic Editorial and Manrope without changing brand colours", () => {
    const rawTenant = {
      slug: "studio-olivie",
      name: "Studio Olivie",
      publicSite: {
        branding: {
          accentColor: "#4056D6",
          secondaryColor: "#D9806E",
          backgroundColor: "#FCFBF8",
          textColor: "#292925",
        },
      },
    };
    const tenant = normalizePublicTenant(rawTenant);
    const theme = getPublicTenantTheme(tenant);

    expect(tenant.publicSite.branding.stylePreset).toBe("classic-editorial-v1");
    expect(tenant.publicSite.branding.fontPreset).toBe("shario-sans-v1");
    expect(DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID).toBe("shario-sans-v1");
    expect(theme).toMatchObject({
      stylePresetId: "classic-editorial-v1",
      resolvedStylePresetId: "classic-editorial-v1",
      fontPresetId: DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID,
      resolvedFontPresetId: PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
      accentColor: "#4056D6",
      secondaryColor: "#D9806E",
      backgroundColor: "#FCFBF8",
      textColor: "#292925",
    });
    expect(theme.style).toMatchObject({
      "--tenant-accent": "#4056D6",
      "--tenant-secondary": "#D9806E",
      "--tenant-background": "#FCFBF8",
      "--tenant-font-display": expect.stringContaining("Manrope"),
      "--radius-xl": "1.5rem",
    });
  });

  it("applies every non-default layout preset without changing tenant brand colours or typography", () => {
    const tenant = {
      slug: "studio-olivie",
      publicSite: {
        branding: {
          accentColor: "#4056D6",
          secondaryColor: "#D9806E",
          backgroundColor: "#FCFBF8",
          textColor: "#292925",
        },
      },
    };
    const classicTheme = getPublicTenantTheme(tenant);
    for (const [presetId, cardRadius] of [
      [PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL, "0.25rem"],
      [PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC, "2rem 1rem 2rem 1rem"],
    ]) {
      const theme = getPublicTenantTheme({
        ...tenant,
        publicSite: {
          ...tenant.publicSite,
          branding: {
            ...tenant.publicSite.branding,
            stylePreset: presetId,
          },
        },
      });

      [
        "accentColor",
        "secondaryColor",
        "backgroundColor",
        "textColor",
        "textForeground",
        "accentForeground",
        "accentLinkColor",
        "borderColor",
      ].forEach((colorKey) => {
        expect(theme[colorKey]).toBe(classicTheme[colorKey]);
      });
      [
        "--tenant-accent",
        "--tenant-secondary",
        "--tenant-background",
        "--tenant-text",
        "--tenant-border",
      ].forEach((variable) => {
        expect(theme.style[variable]).toBe(classicTheme.style[variable]);
      });

      expect(theme.stylePresetId).toBe(presetId);
      expect(theme.resolvedStylePresetId).toBe(presetId);
      expect(theme.fontPresetId).toBe(DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID);
      expect(theme.resolvedFontPresetId).toBe(
        PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
      );
      expect(theme.style["--tenant-font-display"]).toBe(
        classicTheme.style["--tenant-font-display"],
      );
      expect(theme.style["--tenant-radius-card"]).toBe(cardRadius);
      expect(theme.style["--tenant-radius-card"]).not.toBe(
        classicTheme.style["--tenant-radius-card"],
      );
    }
  });
});
