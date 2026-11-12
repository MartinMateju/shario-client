import { describe, expect, it } from "vitest";

import {
  getPublicTenantTheme,
  resolvePublicTenantActionForeground,
} from "@/components/public-tenant/publicTenant.config";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import {
  mergePortalAppearance,
  normalizePortalAppearance,
  PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS,
} from "@/components/public-tenant/publicTenantPortalAppearance";

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

const mixWithWhite = (hex, amount) => {
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );

  return `#${channels
    .map((channel) =>
      Math.round(channel + (255 - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

const createTenant = (branding) => ({
  name: "Adversarial Studio",
  slug: "adversarial-studio",
  publicSite: { branding },
});

describe("independent customer portal colors", () => {
  const branding = {
    accentColor: "#1F36D4",
    secondaryColor: "#E84000",
    backgroundColor: "#FCFBF8",
    textColor: "#1F1F1F",
  };
  const appearance = {
    backgroundColor: "#101820",
    surfaceColor: "#263645",
    textColor: "#E8EFF5",
    headingColor: "#F9DD9E",
    headerBackgroundColor: "#FFF1DD",
    headerTextColor: "#342C22",
    calendarBackgroundColor: "#1A2C26",
    calendarTextColor: "#EBF4ED",
  };

  it("inherits the original theme when no portal overrides are set", () => {
    const tenant = createTenant(branding);
    const original = getPublicTenantTheme(tenant);
    const portal = getPublicTenantPortalTheme(tenant);
    for (const property of [
      "backgroundColor",
      "surfaceColor",
      "textForeground",
      "portalHeaderBackgroundColor",
      "portalCalendarBackgroundColor",
      "portalButtonColor",
    ]) {
      expect(portal[property]).toBe(original[property]);
    }
  });

  it("applies independent page, card, header and calendar colors without changing public or authentication pages", () => {
    const tenant = { publicSite: { branding, customerPortal: { appearance } } };
    const portal = getPublicTenantPortalTheme(tenant);
    expect(portal.backgroundColor).toBe(appearance.backgroundColor);
    expect(portal.surfaceColor).toBe(appearance.surfaceColor);
    expect(portal.textForeground).toBe(appearance.textColor);
    expect(portal.headingColor).toBe(appearance.headingColor);
    expect(portal.portalHeaderTextColor).toBe(appearance.headerTextColor);
    expect(portal.portalCalendarTextColor).toBe(appearance.calendarTextColor);
    expect(portal.style["--tenant-background"]).toBe(
      appearance.backgroundColor,
    );
    expect(portal.style["--tenant-surface"]).toBe(appearance.surfaceColor);
    expect(portal.style["--tenant-heading-color"]).toBe(
      appearance.headingColor,
    );
    for (const surface of ["public", "auth"]) {
      const theme = getPublicTenantTheme(tenant, { surface });
      const before = getPublicTenantTheme(
        {
          publicSite: {
            branding,
            customerPortal: {
              appearance: {
                headerBackgroundColor: appearance.headerBackgroundColor,
                calendarBackgroundColor: appearance.calendarBackgroundColor,
              },
            },
          },
        },
        { surface },
      );
      expect(theme.backgroundColor).toBe(branding.backgroundColor);
      expect(theme.textColor).toBe(branding.textColor);
      expect(theme.style["--tenant-heading-color"]).toBe(theme.accentLinkColor);
      expect(theme.style).toEqual(before.style);
    }
    expect(
      getPublicTenantPortalTheme(tenant, "light", "public").backgroundColor,
    ).toBe(branding.backgroundColor);
  });

  it.each([
    {
      backgroundColor: "#111111",
      surfaceColor: "#1D1D1D",
      textColor: "#121212",
      headingColor: "#151515",
      headerBackgroundColor: "#FFFFFF",
      headerTextColor: "#FAFAFA",
      calendarBackgroundColor: "#111111",
      calendarTextColor: "#151515",
    },
    {
      backgroundColor: "#FAFAFA",
      surfaceColor: "#FFFFFF",
      textColor: "#FAFAFA",
      headingColor: "#FFFFFF",
      headerBackgroundColor: "#111111",
      headerTextColor: "#121212",
      calendarBackgroundColor: "#FFFFFF",
      calendarTextColor: "#FAFAFA",
    },
    {
      backgroundColor: "#FFFFFF",
      surfaceColor: "#000000",
      textColor: "#000000",
      headingColor: "#111111",
      headerBackgroundColor: "#000000",
      headerTextColor: "#111111",
      calendarBackgroundColor: "#FFFFFF",
      calendarTextColor: "#EEEEEE",
    },
    {
      backgroundColor: "#000000",
      surfaceColor: "#FFFFFF",
      textColor: "#FFFFFF",
      headingColor: "#EEEEEE",
      headerBackgroundColor: "#FFFFFF",
      headerTextColor: "#EEEEEE",
      calendarBackgroundColor: "#000000",
      calendarTextColor: "#111111",
    },
  ])(
    "keeps all customized surfaces readable even with low-contrast input",
    (colors) => {
      const theme = getPublicTenantPortalTheme({
        publicSite: { branding, customerPortal: { appearance: colors } },
      });
      for (const [foreground, background] of [
        [theme.textForeground, theme.backgroundColor],
        [theme.textOnSurfaceColor, theme.surfaceColor],
        [theme.headingColor, theme.backgroundColor],
        [theme.headingOnSurfaceColor, theme.surfaceColor],
        [theme.portalHeaderTextColor, theme.portalHeaderBackgroundColor],
        [theme.portalHeaderLinkColor, theme.portalHeaderBackgroundColor],
        [theme.portalHeaderTextOnSurfaceColor, theme.portalHeaderSurfaceColor],
        [theme.portalCalendarTextColor, theme.portalCalendarBackgroundColor],
        [
          theme.portalCalendarTextOnSurfaceColor,
          theme.portalCalendarSurfaceColor,
        ],
        [theme.portalButtonForeground, theme.portalButtonColor],
      ])
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("merges only valid personal overrides while blank fields inherit the studio", () => {
    const tenant = { publicSite: { branding, customerPortal: { appearance } } };
    const normalized = normalizePortalAppearance({
      backgroundColor: " #123abc ",
      textColor: "red",
      unknown: "#FFFFFF",
    });
    expect(Object.keys(normalized)).toEqual(
      PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS,
    );
    expect(normalized.backgroundColor).toBe("#123ABC");
    expect(normalized.textColor).toBe("");
    const merged = mergePortalAppearance(tenant, {
      backgroundColor: "#123abc",
      surfaceColor: "",
      textColor: "invalid",
    });
    expect(merged.publicSite.customerPortal.appearance).toMatchObject({
      ...appearance,
      backgroundColor: "#123ABC",
    });
    expect(tenant.publicSite.customerPortal.appearance.backgroundColor).toBe(
      appearance.backgroundColor,
    );
    expect(mergePortalAppearance(tenant, {})).toBe(tenant);
  });
});

describe("customer portal tenant theme contrast", () => {
  it.each(["#737373", "#757575", "#797979", "#7A7A7A"])(
    "keeps action labels readable near the dark/light crossover on %s",
    (background) => {
      const foreground = resolvePublicTenantActionForeground(background);
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("uses fixed high-contrast poles for automatic action text", () => {
    expect(resolvePublicTenantActionForeground("#1F36D4")).toBe("#FFFFFF");
    expect(resolvePublicTenantActionForeground("#F1BD42")).toBe("#11110F");
    expect(resolvePublicTenantActionForeground("#1F36D4", "#FEFEFE")).toBe(
      "#FEFEFE",
    );
    expect(resolvePublicTenantActionForeground("#1F36D4", "#1F36D4")).toBe(
      "#FFFFFF",
    );

    const theme = getPublicTenantTheme(
      createTenant({
        accentColor: "#1F36D4",
        secondaryColor: "#242933",
        backgroundColor: "#FCFBF8",
        textColor: "#1F1F1F",
      }),
    );

    expect(theme.accentForeground).toBe("#FFFFFF");
    expect(theme.secondaryForeground).toBe("#FFFFFF");
    expect(theme.portalButtonForeground).toBe("#FFFFFF");

    const preferredTheme = getPublicTenantTheme(
      createTenant({
        accentColor: "#1F36D4",
        secondaryColor: "#242933",
        backgroundColor: "#FCFBF8",
        textColor: "#1F1F1F",
        buttonTextColor: "#fefefe",
      }),
    );

    expect(preferredTheme.accentForeground).toBe("#FEFEFE");
    expect(preferredTheme.portalButtonForeground).toBe("#FEFEFE");
  });

  it("keeps secondary interactions readable on fixed warm overlay panels", () => {
    const theme = getPublicTenantTheme(
      createTenant({
        accentColor: "#2748D8",
        secondaryColor: "#E84000",
        backgroundColor: "#FFFFFF",
        textColor: "#171715",
      }),
    );

    expect(
      contrast(theme.secondaryOnSoftLightColor, "#F7F5F2"),
    ).toBeGreaterThanOrEqual(4.8);
    expect(theme.style["--tenant-secondary-on-soft-light"]).toBe(
      theme.secondaryOnSoftLightColor,
    );
    const portalTheme = getPublicTenantPortalTheme(
      createTenant({
        accentColor: "#2748D8",
        secondaryColor: "#E84000",
        backgroundColor: "#FFFFFF",
        textColor: "#171715",
      }),
      "soft-light",
    );
    expect(portalTheme.style["--tenant-interactive-hover"]).toBe(
      theme.secondaryOnSoftLightColor,
    );
    expect(portalTheme.style["--tenant-interactive-hover-on-surface"]).toBe(
      theme.secondaryOnSoftLightColor,
    );
  });

  it.each([
    {
      name: "near-white brand colors on a warm white background",
      branding: {
        accentColor: "#FDFCF9",
        secondaryColor: "#FFFBF4",
        backgroundColor: "#FCFBF8",
        textColor: "#FDFCFA",
      },
    },
    {
      name: "near-black brand colors on a dark background",
      branding: {
        accentColor: "#121212",
        secondaryColor: "#181818",
        backgroundColor: "#111111",
        textColor: "#101010",
      },
    },
    {
      name: "mid-tone green accent with the dark premium label color",
      branding: {
        accentColor: "#44842C",
        secondaryColor: "#E56F51",
        backgroundColor: "#FCFBF8",
        textColor: "#1F1F1F",
      },
    },
    {
      name: "neutral mid-tone where premium ink and white both miss AA",
      branding: {
        accentColor: "#797979",
        secondaryColor: "#E56F51",
        backgroundColor: "#FCFBF8",
        textColor: "#1F1F1F",
      },
    },
    {
      name: "mid-tone background whose raised surface changes the safe ink",
      branding: {
        accentColor: "#1F36D4",
        secondaryColor: "#E56F51",
        backgroundColor: "#707070",
        textColor: "#FFFFFF",
      },
    },
  ])("keeps links, text, and CTA labels readable for $name", ({ branding }) => {
    const theme = getPublicTenantTheme(createTenant(branding));

    expect(theme.backgroundColor).toBe(branding.backgroundColor);
    expect(
      contrast(theme.accentLinkColor, theme.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.textForeground, theme.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.accentForeground, theme.accentColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.secondaryForeground, theme.secondaryColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.secondaryLinkColor, theme.backgroundColor),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.secondaryOnLightColor, "#FFFFFF"),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.secondaryOnSoftLightColor, "#F7F5F2"),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.secondaryOnSurfaceColor,
        mixWithWhite(theme.backgroundColor, 0.12),
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.authFormSecondaryColor, theme.authFormSurfaceColor),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.authFieldSecondaryColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalHeaderSecondaryColor,
        theme.portalHeaderBackgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalHeaderSecondaryOnSurfaceColor,
        theme.portalHeaderSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalCalendarSecondaryColor,
        theme.portalCalendarBackgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalCalendarSecondaryOnSurfaceColor,
        theme.portalCalendarSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalProfileSecondaryColor,
        theme.portalProfileBackgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.portalProfileSecondaryOnSurfaceColor,
        theme.portalProfileSurfaceColor,
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.accentOnLightColor, "#FFFFFF"),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(
        theme.accentOnSurfaceColor,
        mixWithWhite(theme.backgroundColor, 0.12),
      ),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.mutedTextColor, theme.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        theme.mutedOnSurfaceColor,
        mixWithWhite(theme.backgroundColor, 0.12),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        theme.textOnSurfaceColor,
        mixWithWhite(theme.backgroundColor, 0.12),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(theme.style).toMatchObject({
      "--tenant-accent": theme.accentColor,
      "--tenant-accent-foreground": theme.accentForeground,
      "--tenant-accent-link": theme.accentLinkColor,
      "--tenant-accent-on-light": theme.accentOnLightColor,
      "--tenant-accent-on-surface": theme.accentOnSurfaceColor,
      "--tenant-secondary": theme.secondaryColor,
      "--tenant-secondary-foreground": theme.secondaryForeground,
      "--tenant-secondary-link": theme.secondaryLinkColor,
      "--tenant-secondary-on-light": theme.secondaryOnLightColor,
      "--tenant-secondary-on-surface": theme.secondaryOnSurfaceColor,
      "--tenant-interactive-hover": theme.secondaryLinkColor,
      "--tenant-interactive-hover-on-surface": theme.secondaryOnSurfaceColor,
      "--tenant-interactive-hover-foreground": theme.secondaryForeground,
      "--tenant-auth-form-secondary": theme.authFormSecondaryColor,
      "--tenant-auth-field-secondary": theme.authFieldSecondaryColor,
      "--tenant-background": theme.backgroundColor,
      "--tenant-surface": mixWithWhite(
        theme.backgroundColor,
        0.12,
      ).toUpperCase(),
      "--tenant-muted-on-surface": theme.mutedOnSurfaceColor,
      "--tenant-muted-text": theme.mutedTextColor,
      "--tenant-text": theme.textForeground,
      "--tenant-text-on-surface": theme.textOnSurfaceColor,
    });
  });
});
