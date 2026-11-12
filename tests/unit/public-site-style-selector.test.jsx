import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

import { BrandingFields } from "@/components/public-site-editor/PublicSiteEditorFields";
import { PUBLIC_TENANT_LOGO_SIZE } from "@/components/public-tenant/publicTenant.config";
import {
  PUBLIC_TENANT_FONT_PRESET_IDS,
  PUBLIC_TENANT_STYLE_PRESET_IDS,
} from "@/components/public-tenant/publicTenantStylePresets";

const createDraft = (stylePreset) => ({
  branding: {
    displayName: "Studio Olivka",
    stylePreset,
    fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
    logoUrl: "https://media.example/logo.png",
    logoSize: PUBLIC_TENANT_LOGO_SIZE.DEFAULT,
    faviconUrl: "",
    accentColor: "#4056D6",
    secondaryColor: "#D9806E",
    backgroundColor: "#FCFBF8",
    textColor: "#292925",
  },
});

const renderFields = ({
  onApplyStylePreset = vi.fn(),
  onChange = vi.fn(),
  stylePreset = PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
} = {}) => {
  const view = render(
    <>
      <button type="button">Before styles</button>
      <BrandingFields
        draft={createDraft(stylePreset)}
        onChange={onChange}
        onApplyStylePreset={onApplyStylePreset}
        onUpload={() => false}
        onClearUpload={() => {}}
        disabled={false}
        uploadState={{ busy: false, resetToken: 0 }}
      />
    </>,
  );

  return { ...view, onApplyStylePreset, onChange };
};

const getStyleRadios = () =>
  within(
    screen.getByRole("radiogroup", { name: "styleSelectorLabel" }),
  ).getAllByRole("radio");

describe("public-site style selector", () => {
  it("shows all three stable presets as complete selectable designs", () => {
    renderFields();

    const selector = screen.getByRole("radiogroup", {
      name: "styleSelectorLabel",
    });
    const cards = getStyleRadios();

    expect(selector).toHaveAttribute("data-style-preset-selector");
    expect(cards).toHaveLength(3);
    expect(cards[0].closest("label")).toHaveAttribute(
      "data-style-preset-id",
      PUBLIC_TENANT_STYLE_PRESET_IDS.CLASSIC_EDITORIAL,
    );
    expect(cards[0]).toBeChecked();
    expect(cards[0]).toHaveAttribute("type", "radio");
    expect(cards[0]).toHaveAttribute("name", "public-site-style-preset");
    expect(cards[0]).toBeEnabled();
    expect(cards[1].closest("label")).toHaveAttribute(
      "data-style-preset-id",
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );
    expect(cards[1]).toBeEnabled();
    expect(cards[2].closest("label")).toHaveAttribute(
      "data-style-preset-id",
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );
    expect(cards[2].closest("label")).toHaveAttribute(
      "data-style-preset-status",
      "ready",
    );
    expect(cards[2]).toBeEnabled();
    expect(cards[2]).toHaveAccessibleDescription(
      "presets.warmOrganic.description",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("comingSoon")).not.toBeInTheDocument();
    expect(selector.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("previews the complete style recipe and delegates atomic application", () => {
    const { onApplyStylePreset, onChange } = renderFields();
    const modern = getStyleRadios()[1];
    const modernPreview = modern
      .closest("label")
      .querySelector('[data-style-preset-preview="modern-minimal-v1"]');

    expect(modernPreview).toHaveAttribute(
      "data-tenant-style",
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );
    expect(modernPreview.style.backgroundColor).toBe("rgb(246, 246, 244)");
    expect(modernPreview.style.color).toBe("rgb(23, 23, 23)");
    expect(modernPreview.style.getPropertyValue("--tenant-accent")).toBe(
      "#242424",
    );
    expect(
      modernPreview.style.getPropertyValue("--tenant-font-display"),
    ).toContain("Manrope");

    fireEvent.click(modern);

    expect(onApplyStylePreset).toHaveBeenCalledOnce();
    expect(onApplyStylePreset).toHaveBeenCalledWith(
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects Warm Organic with its own preview tokens", () => {
    const { onApplyStylePreset } = renderFields();
    const warm = getStyleRadios()[2];
    const warmPreview = warm
      .closest("label")
      .querySelector('[data-style-preset-preview="warm-organic-v1"]');

    expect(warmPreview).toHaveAttribute(
      "data-tenant-style",
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );
    expect(
      warmPreview.style.getPropertyValue("--tenant-font-display"),
    ).toContain("Fraunces");
    expect(warmPreview.style.getPropertyValue("--tenant-radius-card")).toBe(
      "2rem 1rem 2rem 1rem",
    );
    expect(warmPreview.style.getPropertyValue("--tenant-secondary")).toBe(
      "#C96F4F",
    );
    expect(warmPreview.style.getPropertyValue("--tenant-surface")).not.toBe("");
    expect(
      warmPreview.style.getPropertyValue("--tenant-accent-foreground"),
    ).not.toBe("");

    fireEvent.click(warm);

    expect(onApplyStylePreset).toHaveBeenCalledWith(
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );
  });

  it("edits the persisted header logo size as a bounded number", () => {
    const { onChange } = renderFields();
    const input = document.getElementById("public-site-logo-size");

    expect(input).toHaveAttribute("min", String(PUBLIC_TENANT_LOGO_SIZE.MIN));
    expect(input).toHaveAttribute("max", String(PUBLIC_TENANT_LOGO_SIZE.MAX));
    expect(input).toHaveAttribute("step", "2");
    expect(input.value).toBe(String(PUBLIC_TENANT_LOGO_SIZE.DEFAULT));

    fireEvent.change(input, { target: { value: "72" } });

    expect(onChange).toHaveBeenCalledWith("branding.logoSize", 72);
  });

  it("uses native radio keyboard navigation for the available presets", async () => {
    const user = userEvent.setup();
    const { onApplyStylePreset } = renderFields();
    const [classic, modern, warm] = getStyleRadios();

    classic.focus();
    expect(classic).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(modern).toHaveFocus();
    expect(onApplyStylePreset).toHaveBeenCalledWith(
      PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL,
    );

    modern.focus();
    await user.keyboard("{ArrowRight}");

    expect(warm).toHaveFocus();
    expect(onApplyStylePreset).toHaveBeenCalledWith(
      PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC,
    );
  });
});
