/**
 * JavaScript consumers cannot read Tailwind's build-time theme tokens.
 * Keep this data-contract mirror synchronized with the canonical declarations
 * in src/styles/globals.css. Visual styling should prefer the CSS variables.
 */
export const SKAB_BRAND_COLORS = Object.freeze({
  primary: "#2563EB",
  offset: "#FFFFFF",
  accent: "#FF715B",
  softCoral: "#4DD7C5",
  sand: "#C3ADFF",
  ink: "#182333",
  secondaryText: "#536174",
});

export const SKAB_BRAND_RGB = Object.freeze({
  primary: "37 99 235",
  offset: "255 255 255",
  accent: "255 113 91",
  softCoral: "77 215 197",
  sand: "195 173 255",
});

/**
 * Semantic application surfaces. The exact corporate offset is the canvas;
 * paper and stone layers provide the hierarchy used by chrome, panels, cards,
 * controls, and dividers.
 */
export const SKAB_PLATFORM_COLORS = Object.freeze({
  canvas: SKAB_BRAND_COLORS.offset,
  surface: "#F5F7FB",
  panel: "#F5F7FB",
  raised: "#FFFFFF",
  muted: "#EDF3FF",
  line: "#DCE3ED",
  lineStrong: "#7E8A9B",
});

/**
 * Complete, accessible starting palettes materialized when a studio applies a
 * website style recipe. Keep these centralized so product surfaces do not
 * duplicate canonical Shario literals.
 */
export const PUBLIC_TENANT_STYLE_RECIPE_COLORS = Object.freeze({
  classic: Object.freeze({
    accentColor: SKAB_BRAND_COLORS.primary,
    secondaryColor: SKAB_BRAND_COLORS.accent,
    backgroundColor: SKAB_BRAND_COLORS.offset,
    textColor: SKAB_BRAND_COLORS.ink,
    labelColor: SKAB_BRAND_COLORS.primary,
  }),
  minimal: Object.freeze({
    accentColor: "#242424",
    secondaryColor: "#536174",
    backgroundColor: "#F6F6F4",
    textColor: "#171717",
    labelColor: "#454540",
  }),
  organic: Object.freeze({
    accentColor: "#9B4B35",
    secondaryColor: "#C96F4F",
    backgroundColor: "#F9EADC",
    textColor: "#2F241F",
    labelColor: "#88422F",
  }),
});
