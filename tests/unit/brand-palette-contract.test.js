import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getPublicTenantTheme,
  normalizePublicTenant,
} from "@/components/public-tenant/publicTenant.config";
import { PUBLIC_TENANT_STYLE_PRESET_REGISTRY } from "@/components/public-tenant/publicTenantStylePresets";
import {
  SKAB_BRAND_COLORS,
  SKAB_BRAND_RGB,
  SKAB_PLATFORM_COLORS,
} from "@/config/brandPalette";

const repositoryRoot = process.cwd();
const globalsPath = join(repositoryRoot, "src/styles/globals.css");
const globalsCss = readFileSync(globalsPath, "utf8");

const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs"]);
const EXCLUDED_SOURCE_DIRECTORIES = new Set([
  "messages",
  "test",
  "translations",
]);

const collectProductionSources = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_SOURCE_DIRECTORIES.has(entry.name)) return [];
      if (
        entry.name === "studio-grohovka-public" ||
        entry.name === "(studio-grohovka-public)"
      ) {
        return [];
      }
      return collectProductionSources(path);
    }

    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });

const productionSources = collectProductionSources(join(repositoryRoot, "src"));

// The current public/workspace studio theme deliberately uses warm white.
// Allow only its declarations and the standalone setup widget fallback;
// other literals in these files remain subject to the migration check.
const STUDIO_PAPER_DECLARATIONS = {
  "src/components/Home/workingStudioHome.css": /--hp-white:\s*#fffefb;/gi,
  "src/styles/publicStudioTheme.css": /--studio-white:\s*#fffefb;/gi,
  "src/components/setup-center/SetupCenterWidget.module.css":
    /var\(--studio-white,\s*#fffefb\)/gi,
};

const OLD_BRAND_HEXES = [
  "f2f6fd",
  "e2eaf9",
  "c4d3f3",
  "9bb5ec",
  "6790e1",
  "3367d6",
  "2a58b8",
  "244a99",
  "203f7c",
  "1d3565",
  "fff6f3",
  "fdeae5",
  "f9d5cc",
  "f5b9aa",
  "f19b86",
  "ed8467",
  "d86d52",
  "b95740",
  "964737",
  "793c32",
  "f3efe7",
  "fcfaf5",
  "fbf9f4",
  "f8f5ef",
  "fffefb",
  "ece7de",
  "ddd6cc",
  "ccc2b6",
  "e56f51",
  "f9eadc",
  "e8ebff",
  "5465e8",
  "c76b5a",
  "fbe3db",
  "fbe5de",
  "c84f32",
  "b84e31",
];

const OLD_BRAND_COLOR = new RegExp(`#(?:${OLD_BRAND_HEXES.join("|")})`, "i");
const OLD_BRAND_RGB =
  /rgba?\(\s*(?:51(?:\s+|,\s*)103(?:\s+|,\s*)214|237(?:\s+|,\s*)132(?:\s+|,\s*)103|243(?:\s+|,\s*)239(?:\s+|,\s*)231|252(?:\s+|,\s*)250(?:\s+|,\s*)245|249(?:\s+|,\s*)234(?:\s+|,\s*)220)\b/i;
const FRAMEWORK_BLUE_UTILITY =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to)-(?:blue|indigo)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d+)?\b/;
const EXACT_PALETTE_LITERAL =
  /#(?:1f36d4|fcfbf8|d27357|f4c1b1|d6ceb6|f8f7f5|f1efea|e6e2da)\b|\b(?:37 99 235|255 255 255|255 113 91|77 215 197|195 173 255)\b/i;

const toLinear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );

  return (
    0.2126 * toLinear(channels[0]) +
    0.7152 * toLinear(channels[1]) +
    0.0722 * toLinear(channels[2])
  );
};

const contrast = (left, right) => {
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};

describe("Shario brand palette contract", () => {
  it("defines the exact corporate colors once and exposes semantic aliases", () => {
    expect(SKAB_BRAND_COLORS).toEqual({
      primary: "#2563EB",
      offset: "#FFFFFF",
      accent: "#FF715B",
      softCoral: "#4DD7C5",
      sand: "#C3ADFF",
      ink: "#182333",
      secondaryText: "#536174",
    });
    expect(SKAB_BRAND_RGB).toEqual({
      primary: "37 99 235",
      offset: "255 255 255",
      accent: "255 113 91",
      softCoral: "77 215 197",
      sand: "195 173 255",
    });
    expect(SKAB_PLATFORM_COLORS).toEqual({
      canvas: "#FFFFFF",
      surface: "#F5F7FB",
      panel: "#F5F7FB",
      raised: "#FFFFFF",
      muted: "#EDF3FF",
      line: "#DCE3ED",
      lineStrong: "#7E8A9B",
    });

    expect(globalsCss).toContain("--color-brand-primary: #2563eb;");
    expect(globalsCss).toContain("--color-brand-offset: #ffffff;");
    expect(globalsCss).toContain("--color-brand-accent: #ff715b;");
    expect(globalsCss).toContain("--color-brand-coral-soft: #4dd7c5;");
    expect(globalsCss).toContain("--color-brand-sand: #c3adff;");
    expect(globalsCss).toContain("--color-primary: var(--color-skab-blue);");
    expect(globalsCss).toContain(
      "--color-platform-canvas: var(--color-brand-offset);",
    );
    expect(globalsCss).toContain("--color-platform-surface: #f5f7fb;");
    expect(globalsCss).toContain("--color-platform-panel: #f5f7fb;");
    expect(globalsCss).toContain("--color-platform-surface-raised: #ffffff;");
    expect(globalsCss).toContain("--color-platform-surface-muted: #edf3ff;");
    expect(globalsCss).toContain("--color-platform-line: #dce3ed;");
    expect(globalsCss).toContain("--color-platform-line-strong: #7e8a9b;");
    expect(globalsCss).toContain(
      "--color-canvas: var(--color-platform-canvas);",
    );
    expect(globalsCss).toContain(
      "--color-surface-warm: var(--color-skab-coral-50);",
    );
    expect(globalsCss).toContain(
      "--color-surface-warm-soft: var(--color-skab-terracotta-50);",
    );
    expect(globalsCss).toContain(
      "--color-surface-muted: var(--color-platform-surface-muted);",
    );
    expect(globalsCss).toContain(
      "--color-surface-panel: var(--color-platform-panel);",
    );
    expect(globalsCss).toContain(
      "--color-surface-raised: var(--color-platform-surface-raised);",
    );
    expect(globalsCss).toContain(
      "--color-accent: var(--color-skab-terracotta);",
    );
    expect(globalsCss).toContain("--skab-blue-rgb: 37 99 235;");
    expect(globalsCss).toContain("--skab-offset-rgb: 255 255 255;");
    expect(globalsCss).toContain("--skab-coral-rgb: 255 113 91;");
    expect(globalsCss).toContain("--skab-soft-coral-rgb: 77 215 197;");
    expect(globalsCss).toContain("--skab-sand-rgb: 195 173 255;");
    expect(globalsCss).toContain("--skab-platform-canvas-rgb: 255 255 255;");
    expect(globalsCss).toContain(
      "--color-skab-blue-50: var(--color-skab-cobalt-50);",
    );
    expect(globalsCss).toContain(
      "--color-skab-blue-800: var(--color-skab-cobalt-800);",
    );
  });

  it("uses the palette for missing tenant branding without overwriting custom colors", () => {
    const fallbackTheme = getPublicTenantTheme(
      normalizePublicTenant({ slug: "fallback-studio", publicSite: {} }),
    );

    expect(fallbackTheme).toMatchObject({
      accentColor: SKAB_BRAND_COLORS.primary,
      secondaryColor: SKAB_BRAND_COLORS.accent,
      backgroundColor: SKAB_BRAND_COLORS.offset,
    });

    const customTheme = getPublicTenantTheme(
      normalizePublicTenant({
        slug: "custom-studio",
        publicSite: {
          branding: {
            accentColor: "#4056D6",
            secondaryColor: "#D9806E",
            backgroundColor: "#FFFDF7",
          },
        },
      }),
    );

    expect(customTheme).toMatchObject({
      accentColor: "#4056D6",
      secondaryColor: "#D9806E",
      backgroundColor: "#FFFDF7",
    });
  });

  it("reuses the global RGB channel in every style-preset brand shadow", () => {
    for (const preset of Object.values(PUBLIC_TENANT_STYLE_PRESET_REGISTRY)) {
      expect(preset.tokens.shadows.cobalt).toContain(
        "rgb(var(--skab-blue-rgb)/",
      );
    }
  });

  it("keeps accessible foreground combinations for the exact colors", () => {
    expect(
      contrast("#FFFFFF", SKAB_BRAND_COLORS.primary),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast("#11110F", SKAB_BRAND_COLORS.accent),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast("#11110F", SKAB_BRAND_COLORS.offset),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast("#11110F", SKAB_PLATFORM_COLORS.canvas),
    ).toBeGreaterThanOrEqual(4.5);

    for (const color of [
      SKAB_PLATFORM_COLORS.surface,
      SKAB_PLATFORM_COLORS.panel,
      SKAB_PLATFORM_COLORS.raised,
      SKAB_PLATFORM_COLORS.muted,
    ]) {
      expect(contrast("#11110F", color)).toBeGreaterThanOrEqual(4.5);
    }

    expect(
      contrast(SKAB_BRAND_COLORS.primary, SKAB_PLATFORM_COLORS.raised),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(SKAB_BRAND_COLORS.primary, SKAB_PLATFORM_COLORS.canvas),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast("#9B4835", SKAB_PLATFORM_COLORS.canvas),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast("#686762", SKAB_PLATFORM_COLORS.canvas),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("preserves status colors independently from the brand palette", () => {
    expect(globalsCss).toContain("--color-success: #397a5f;");
    expect(globalsCss).toContain("--color-warning: #9a6417;");
    expect(globalsCss).toContain("--color-danger: #bd473e;");
  });

  it("contains no deprecated palette literals or framework blue utilities", () => {
    const offenders = [];

    for (const path of productionSources) {
      const relativePath = relative(repositoryRoot, path).split(sep).join("/");
      let source = readFileSync(path, "utf8");
      const studioPaperDeclaration = STUDIO_PAPER_DECLARATIONS[relativePath];
      if (studioPaperDeclaration)
        source = source.replace(studioPaperDeclaration, "");
      if (relativePath === "src/config/brandPalette.js") {
        source = source.replace(/backgroundColor:\s*"#F9EADC"/g, "");
      }

      if (OLD_BRAND_COLOR.test(source))
        offenders.push(`${relativePath}: old hex`);
      if (OLD_BRAND_RGB.test(source))
        offenders.push(`${relativePath}: old RGB`);
      if (FRAMEWORK_BLUE_UTILITY.test(source)) {
        offenders.push(`${relativePath}: framework blue utility`);
      }

      if (
        !relativePath.endsWith("src/styles/globals.css") &&
        !relativePath.endsWith("src/config/brandPalette.js") &&
        EXACT_PALETTE_LITERAL.test(source)
      ) {
        offenders.push(`${relativePath}: duplicated exact brand literal`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
