import { PUBLIC_TENANT_STYLE_RECIPE_COLORS } from "@/config/brandPalette";

export const PUBLIC_TENANT_STYLE_PRESET_IDS = Object.freeze({
  CLASSIC_EDITORIAL: "classic-editorial-v1",
  MODERN_MINIMAL: "modern-minimal-v1",
  WARM_ORGANIC: "warm-organic-v1",
});

export const PUBLIC_TENANT_STYLE_PRESET_ORDER = Object.freeze([
  PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
  PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
  PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
]);

export const DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID =
  PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL;

export const PUBLIC_TENANT_FONT_PRESET_IDS = Object.freeze({
  SKAB_SANS: "shario-sans-v1",
  EDITORIAL_SERIF: "editorial-serif-v1",
  MODERN_CONDENSED: "modern-condensed-v1",
  WARM_SERIF: "warm-serif-v1",
});

export const DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID =
  PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS;

// The condensed face remains resolvable for existing tenants, but new tenants
// are offered the calmer Skab sans, editorial and warm serif families.
export const PUBLIC_TENANT_FONT_PRESET_ORDER = Object.freeze([
  PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
  PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF,
  PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF,
]);

export const PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS = Object.freeze({
  [PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS]: "skabSans",
  [PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF]: "editorialSerif",
  [PUBLIC_TENANT_FONT_PRESET_IDS.MODERN_CONDENSED]: "modernCondensed",
  [PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF]: "warmSerif",
});

const GEIST_SANS =
  'var(--font-manrope, "Manrope"), "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const SWITZER_SANS =
  '"Manrope", var(--font-manrope, "Manrope"), "Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif';
const EDITORIAL_SERIF =
  'var(--font-editorial, "Playfair Display"), "Iowan Old Style", "Baskerville", "Times New Roman", ui-serif, Georgia, serif';
const MODERN_DISPLAY =
  'var(--font-modern-display, "Barlow Condensed"), var(--font-manrope, "Manrope"), "Arial Narrow", "Inter", ui-sans-serif, system-ui, sans-serif';
const WARM_DISPLAY =
  'var(--font-warm-display, "Fraunces"), "Iowan Old Style", "Baskerville", ui-serif, Georgia, serif';
const GEIST_MONO =
  'var(--font-geist-mono, "Geist Mono"), "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace';

const createFontPresetCssVariables = (typography) =>
  Object.freeze({
    "--tenant-font-body": typography.body,
    "--tenant-font-display": typography.display,
    "--tenant-font-label": typography.label,
    "--tenant-display-weight": typography.displayWeight,
    "--tenant-display-tracking": typography.displayTracking,
    "--tenant-display-transform": typography.displayTransform,
    "--tenant-label-weight": typography.labelWeight,
    "--tenant-label-tracking": typography.labelTracking,
    "--tenant-label-transform": typography.labelTransform,
  });

const FONT_PRESET_TYPOGRAPHY = Object.freeze({
  [PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS]: Object.freeze({
    body: SWITZER_SANS,
    display: SWITZER_SANS,
    label: SWITZER_SANS,
    displayWeight: "600",
    displayTracking: "-0.045em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.14em",
    labelTransform: "uppercase",
  }),
  [PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF]: Object.freeze({
    body: GEIST_SANS,
    display: EDITORIAL_SERIF,
    label: GEIST_SANS,
    displayWeight: "400",
    displayTracking: "-0.045em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.16em",
    labelTransform: "uppercase",
  }),
  [PUBLIC_TENANT_FONT_PRESET_IDS.MODERN_CONDENSED]: Object.freeze({
    body: GEIST_SANS,
    display: MODERN_DISPLAY,
    label: MODERN_DISPLAY,
    displayWeight: "400",
    displayTracking: "-0.035em",
    displayTransform: "uppercase",
    labelWeight: "500",
    labelTracking: "0.14em",
    labelTransform: "uppercase",
  }),
  [PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF]: Object.freeze({
    body: GEIST_SANS,
    display: WARM_DISPLAY,
    label: GEIST_SANS,
    displayWeight: "500",
    displayTracking: "-0.028em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.12em",
    labelTransform: "uppercase",
  }),
});

export const PUBLIC_TENANT_FONT_PRESET_REGISTRY = Object.freeze(
  Object.fromEntries(
    Object.entries(FONT_PRESET_TYPOGRAPHY).map(([id, typography]) => [
      id,
      Object.freeze({
        id,
        typography,
        cssVariables: createFontPresetCssVariables(typography),
      }),
    ]),
  ),
);

const CLASSIC_EDITORIAL_TOKENS = Object.freeze({
  typography: Object.freeze({
    sans: GEIST_SANS,
    serif: EDITORIAL_SERIF,
    mono: GEIST_MONO,
    body: GEIST_SANS,
    display: EDITORIAL_SERIF,
    label: GEIST_SANS,
    bodyLineHeight: "1.5",
    displayLineHeight: "0.98",
    displayWeight: "400",
    displayTracking: "-0.045em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.16em",
    labelTransform: "uppercase",
  }),
  spacing: Object.freeze({
    pageInline: "clamp(1.25rem, 3vw, 3rem)",
    sectionBlock: "clamp(3.5rem, 6vw, 5rem)",
    heroBlock: "clamp(3.5rem, 7vw, 6rem)",
    cardPadding: "1.5rem",
    panelPadding: "clamp(1.25rem, 3vw, 2rem)",
    contentGap: "1.5rem",
    actionGap: "0.75rem",
    previewPageInline: "1rem",
    previewSectionBlock: "1.5rem",
    previewHeroBlock: "1.75rem",
    previewCardPadding: "0.875rem",
    previewPanelPadding: "1rem",
    previewContentGap: "0.75rem",
    previewActionGap: "0.5rem",
  }),
  buttons: Object.freeze({
    minHeight: "3rem",
    paddingInline: "1.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    letterSpacing: "0",
    textTransform: "none",
    shadow: "0 16px 40px rgb(17 17 15 / 0.12)",
    hoverShadow: "0 20px 48px rgb(17 17 15 / 0.16)",
  }),
  radii: Object.freeze({
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
  }),
  shadows: Object.freeze({
    xs: "0 1px 2px rgb(31 31 31 / 0.04)",
    sm: "0 1px 2px rgb(31 31 31 / 0.04), 0 4px 12px rgb(31 31 31 / 0.04)",
    card: "0 1px 2px rgb(31 31 31 / 0.03), 0 12px 32px rgb(31 31 31 / 0.06)",
    cardHover:
      "0 2px 4px rgb(31 31 31 / 0.04), 0 20px 48px rgb(31 31 31 / 0.09)",
    floating:
      "0 8px 24px rgb(31 31 31 / 0.08), 0 32px 80px rgb(31 31 31 / 0.1)",
    cobalt: "0 12px 36px rgb(var(--skab-blue-rgb)/0.22)",
    button: "0 16px 40px rgb(17 17 15 / 0.12)",
    buttonHover: "0 20px 48px rgb(17 17 15 / 0.16)",
  }),
  imagery: Object.freeze({
    filter: "saturate(0.96) contrast(1.02)",
    scale: "1",
    hoverScale: "1.015",
    shadow: "0 24px 70px rgb(31 31 31 / 0.14)",
  }),
});

const MODERN_MINIMAL_TOKENS = Object.freeze({
  typography: Object.freeze({
    sans: SWITZER_SANS,
    serif: SWITZER_SANS,
    mono: GEIST_MONO,
    body: SWITZER_SANS,
    display: SWITZER_SANS,
    label: SWITZER_SANS,
    bodyLineHeight: "1.65",
    displayLineHeight: "0.96",
    displayWeight: "600",
    displayTracking: "-0.045em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.14em",
    labelTransform: "uppercase",
  }),
  spacing: Object.freeze({
    pageInline: "clamp(1rem, 3vw, 2rem)",
    sectionBlock: "clamp(4rem, 7vw, 5rem)",
    heroBlock: "clamp(4rem, 8vw, 7rem)",
    cardPadding: "clamp(1.5rem, 3vw, 2rem)",
    panelPadding: "clamp(1.5rem, 3vw, 2rem)",
    contentGap: "2rem",
    actionGap: "1rem",
    previewPageInline: "0.75rem",
    previewSectionBlock: "1.75rem",
    previewHeroBlock: "2rem",
    previewCardPadding: "0.75rem",
    previewPanelPadding: "0.875rem",
    previewContentGap: "0.875rem",
    previewActionGap: "0.625rem",
  }),
  buttons: Object.freeze({
    minHeight: "2.75rem",
    paddingInline: "1.5rem",
    fontSize: "0.75rem",
    fontWeight: "500",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    shadow: "none",
    hoverShadow: "none",
  }),
  radii: Object.freeze({
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
  }),
  shadows: Object.freeze({
    xs: "0 1px 2px rgb(15 17 19 / 0.05)",
    sm: "0 2px 4px -2px rgb(15 17 19 / 0.08), 0 4px 6px -1px rgb(15 17 19 / 0.08)",
    card: "none",
    cardHover:
      "0 2px 4px -2px rgb(15 17 19 / 0.08), 0 4px 6px -1px rgb(15 17 19 / 0.08)",
    floating: "0 12px 32px rgb(15 17 19 / 0.1)",
    cobalt: "0 8px 24px rgb(var(--skab-blue-rgb)/0.14)",
    button: "none",
    buttonHover: "none",
  }),
  imagery: Object.freeze({
    filter: "saturate(0.82) contrast(1.08)",
    scale: "1",
    hoverScale: "1",
    shadow: "none",
  }),
});

const WARM_ORGANIC_TOKENS = Object.freeze({
  typography: Object.freeze({
    sans: GEIST_SANS,
    serif: WARM_DISPLAY,
    mono: GEIST_MONO,
    body: GEIST_SANS,
    display: WARM_DISPLAY,
    label: GEIST_SANS,
    bodyLineHeight: "1.7",
    displayLineHeight: "1.02",
    displayWeight: "500",
    displayTracking: "-0.028em",
    displayTransform: "none",
    labelWeight: "600",
    labelTracking: "0.12em",
    labelTransform: "uppercase",
  }),
  spacing: Object.freeze({
    pageInline: "clamp(1.25rem, 4vw, 3.5rem)",
    sectionBlock: "clamp(4.5rem, 8vw, 7rem)",
    heroBlock: "clamp(4.25rem, 9vw, 7.5rem)",
    cardPadding: "clamp(1.5rem, 3vw, 2.25rem)",
    panelPadding: "clamp(1.5rem, 4vw, 3rem)",
    contentGap: "1.75rem",
    actionGap: "0.75rem",
    previewPageInline: "0.875rem",
    previewSectionBlock: "1.625rem",
    previewHeroBlock: "1.875rem",
    previewCardPadding: "0.875rem",
    previewPanelPadding: "1rem",
    previewContentGap: "0.75rem",
    previewActionGap: "0.5rem",
  }),
  buttons: Object.freeze({
    minHeight: "3.125rem",
    paddingInline: "1.75rem",
    fontSize: "0.8125rem",
    fontWeight: "600",
    letterSpacing: "0.015em",
    textTransform: "none",
    shadow: "0 12px 32px rgb(66 49 36 / 0.14)",
    hoverShadow: "0 18px 42px rgb(66 49 36 / 0.2)",
  }),
  radii: Object.freeze({
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    pill: "9999px",
    control: "1.25rem",
    field: "1rem",
    card: "2rem 1rem 2rem 1rem",
    panel: "2.75rem 1.5rem 2.75rem 1.5rem",
    media: "3rem 1.5rem 3rem 1.5rem",
  }),
  shadows: Object.freeze({
    xs: "0 2px 5px rgb(66 49 36 / 0.06)",
    sm: "0 8px 24px rgb(66 49 36 / 0.08)",
    card: "0 18px 48px rgb(66 49 36 / 0.1)",
    cardHover: "0 24px 60px rgb(66 49 36 / 0.16)",
    floating: "0 24px 72px rgb(66 49 36 / 0.18)",
    cobalt: "0 14px 38px rgb(var(--skab-blue-rgb)/0.18)",
    button: "0 12px 32px rgb(66 49 36 / 0.14)",
    buttonHover: "0 18px 42px rgb(66 49 36 / 0.2)",
  }),
  imagery: Object.freeze({
    filter: "saturate(0.9) sepia(0.08) contrast(0.98)",
    scale: "1.015",
    hoverScale: "1.04",
    shadow: "0 30px 80px rgb(66 49 36 / 0.18)",
  }),
});

const createPresetCssVariables = (tokens) =>
  Object.freeze({
    "--tenant-font-body": tokens.typography.body,
    "--tenant-font-display": tokens.typography.display,
    "--tenant-font-label": tokens.typography.label,
    "--tenant-font-mono": tokens.typography.mono,
    "--tenant-leading-body": tokens.typography.bodyLineHeight,
    "--tenant-leading-display": tokens.typography.displayLineHeight,
    "--tenant-display-weight": tokens.typography.displayWeight,
    "--tenant-display-tracking": tokens.typography.displayTracking,
    "--tenant-display-transform": tokens.typography.displayTransform,
    "--tenant-label-weight": tokens.typography.labelWeight,
    "--tenant-label-tracking": tokens.typography.labelTracking,
    "--tenant-label-transform": tokens.typography.labelTransform,
    "--tenant-space-page-inline": tokens.spacing.pageInline,
    "--tenant-space-section-block": tokens.spacing.sectionBlock,
    "--tenant-space-hero-block": tokens.spacing.heroBlock,
    "--tenant-space-card-padding": tokens.spacing.cardPadding,
    "--tenant-space-panel-padding": tokens.spacing.panelPadding,
    "--tenant-space-content-gap": tokens.spacing.contentGap,
    "--tenant-space-action-gap": tokens.spacing.actionGap,
    "--tenant-preview-space-page-inline": tokens.spacing.previewPageInline,
    "--tenant-preview-space-section-block": tokens.spacing.previewSectionBlock,
    "--tenant-preview-space-hero-block": tokens.spacing.previewHeroBlock,
    "--tenant-preview-space-card-padding": tokens.spacing.previewCardPadding,
    "--tenant-preview-space-panel-padding": tokens.spacing.previewPanelPadding,
    "--tenant-preview-space-content-gap": tokens.spacing.previewContentGap,
    "--tenant-preview-space-action-gap": tokens.spacing.previewActionGap,
    "--tenant-button-min-height": tokens.buttons.minHeight,
    "--tenant-button-padding-inline": tokens.buttons.paddingInline,
    "--tenant-button-font-size": tokens.buttons.fontSize,
    "--tenant-button-font-weight": tokens.buttons.fontWeight,
    "--tenant-button-tracking": tokens.buttons.letterSpacing,
    "--tenant-button-transform": tokens.buttons.textTransform,
    "--tenant-button-shadow": tokens.buttons.shadow,
    "--tenant-button-shadow-hover": tokens.buttons.hoverShadow,
    "--tenant-radius-control": tokens.radii.control,
    "--tenant-radius-field": tokens.radii.field,
    "--tenant-radius-card": tokens.radii.card,
    "--tenant-radius-panel": tokens.radii.panel,
    "--tenant-radius-media": tokens.radii.media,
    "--tenant-shadow-xs": tokens.shadows.xs,
    "--tenant-shadow-sm": tokens.shadows.sm,
    "--tenant-shadow-card": tokens.shadows.card,
    "--tenant-shadow-card-hover": tokens.shadows.cardHover,
    "--tenant-shadow-floating": tokens.shadows.floating,
    "--tenant-shadow-cobalt": tokens.shadows.cobalt,
    "--tenant-shadow-button": tokens.shadows.button,
    "--tenant-shadow-button-hover": tokens.shadows.buttonHover,
    "--tenant-image-filter": tokens.imagery.filter,
    "--tenant-image-scale": tokens.imagery.scale,
    "--tenant-image-scale-hover": tokens.imagery.hoverScale,
    "--tenant-image-shadow": tokens.imagery.shadow,

    // Existing direct CSS consumers resolve these aliases on the tenant root.
    // Tailwind typography and elevation utilities resolve through the semantic
    // tenant variables above via the mappings in globals.css.
    "--radius-xs": tokens.radii.xs,
    "--radius-sm": tokens.radii.sm,
    "--radius-md": tokens.radii.md,
    "--radius-lg": tokens.radii.lg,
    "--radius-xl": tokens.radii.xl,
    "--radius-2xl": tokens.radii["2xl"],
    "--radius-pill": tokens.radii.pill,
    "--shadow-xs": tokens.shadows.xs,
    "--shadow-sm": tokens.shadows.sm,
    "--shadow-card": tokens.shadows.card,
    "--shadow-card-hover": tokens.shadows.cardHover,
    "--shadow-floating": tokens.shadows.floating,
    "--shadow-cobalt": tokens.shadows.cobalt,
  });

const CLASSIC_EDITORIAL_CSS_VARIABLES = createPresetCssVariables(
  CLASSIC_EDITORIAL_TOKENS,
);
const MODERN_MINIMAL_CSS_VARIABLES = createPresetCssVariables(
  MODERN_MINIMAL_TOKENS,
);
const WARM_ORGANIC_CSS_VARIABLES =
  createPresetCssVariables(WARM_ORGANIC_TOKENS);

export const PUBLIC_TENANT_STYLE_PRESET_REGISTRY = Object.freeze({
  [PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL]: Object.freeze({
    id: PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    status: "ready",
    fallbackPresetId: null,
    tokens: CLASSIC_EDITORIAL_TOKENS,
    cssVariables: CLASSIC_EDITORIAL_CSS_VARIABLES,
  }),
  [PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL]: Object.freeze({
    id: PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    status: "ready",
    fallbackPresetId: null,
    tokens: MODERN_MINIMAL_TOKENS,
    cssVariables: MODERN_MINIMAL_CSS_VARIABLES,
  }),
  [PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC]: Object.freeze({
    id: PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    status: "ready",
    fallbackPresetId: null,
    tokens: WARM_ORGANIC_TOKENS,
    cssVariables: WARM_ORGANIC_CSS_VARIABLES,
  }),
});

export const PUBLIC_TENANT_STYLE_PRESET_RECIPES = Object.freeze({
  [PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL]: Object.freeze({
    stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF,
    ...PUBLIC_TENANT_STYLE_RECIPE_COLORS.classic,
  }),
  [PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL]: Object.freeze({
    stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
    ...PUBLIC_TENANT_STYLE_RECIPE_COLORS.minimal,
  }),
  [PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC]: Object.freeze({
    stylePreset: PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF,
    ...PUBLIC_TENANT_STYLE_RECIPE_COLORS.organic,
  }),
});

const KNOWN_STYLE_PRESET_IDS = new Set(PUBLIC_TENANT_STYLE_PRESET_ORDER);
const KNOWN_FONT_PRESET_IDS = new Set(
  Object.keys(PUBLIC_TENANT_FONT_PRESET_REGISTRY),
);

export const normalizePublicTenantStylePresetId = (value) => {
  const presetId = String(value ?? "")
    .trim()
    .toLowerCase();

  return KNOWN_STYLE_PRESET_IDS.has(presetId)
    ? presetId
    : DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID;
};

export const getPublicTenantStylePreset = (value) =>
  PUBLIC_TENANT_STYLE_PRESET_REGISTRY[
    normalizePublicTenantStylePresetId(value)
  ];

export const resolvePublicTenantStylePreset = (value) => {
  const requestedPreset = getPublicTenantStylePreset(value);

  return requestedPreset.status === "ready"
    ? requestedPreset
    : PUBLIC_TENANT_STYLE_PRESET_REGISTRY[
        requestedPreset.fallbackPresetId ||
          DEFAULT_PUBLIC_TENANT_STYLE_PRESET_ID
      ];
};

export const normalizePublicTenantFontPresetId = (value) => {
  const presetId = String(value ?? "")
    .trim()
    .toLowerCase();

  return KNOWN_FONT_PRESET_IDS.has(presetId)
    ? presetId
    : DEFAULT_PUBLIC_TENANT_FONT_PRESET_ID;
};

export const resolvePublicTenantFontPreset = (value) =>
  PUBLIC_TENANT_FONT_PRESET_REGISTRY[normalizePublicTenantFontPresetId(value)];

export const getPublicTenantStylePresetRecipe = (value) =>
  PUBLIC_TENANT_STYLE_PRESET_RECIPES[normalizePublicTenantStylePresetId(value)];
