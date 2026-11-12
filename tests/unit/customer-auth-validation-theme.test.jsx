import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CustomerAuthField from "@/components/auth/CustomerAuthField";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";

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

const darkTenant = {
  name: "Dark Studio",
  slug: "dark-studio",
  publicSite: {
    branding: {
      accentColor: "#121212",
      backgroundColor: "#111111",
      secondaryColor: "#181818",
      textColor: "#101010",
    },
  },
};

describe("customer auth validation theme", () => {
  it("resolves and renders validation states against a dark auth form and field", () => {
    const theme = getPublicTenantTheme(darkTenant);

    expect(
      contrast(theme.authFormErrorColor, theme.authFormSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.authFormSuccessColor, theme.authFormSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.authFieldErrorColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.authFieldSuccessColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.authFieldSecondaryColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.8);
    expect(
      contrast(theme.authFieldTextColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.authFieldMutedColor, theme.authFieldSurfaceColor),
    ).toBeGreaterThanOrEqual(4.5);

    render(
      <div data-testid="auth-theme" style={theme.style}>
        <CustomerAuthField
          id="invalid-email"
          label="E-mail"
          error="Needs attention"
          onChange={() => {}}
          value="invalid"
        />
        <CustomerAuthField
          id="valid-phone"
          label="Phone"
          onChange={() => {}}
          touched
          valid
          value="valid"
        />
        <CustomerAuthField
          id="neutral-name"
          label="Name"
          onChange={() => {}}
          value=""
        />
      </div>,
    );

    const themeRoot = screen.getByTestId("auth-theme");
    const invalidInput = screen.getByRole("textbox", { name: "E-mail" });
    const validInput = screen.getByRole("textbox", { name: "Phone" });
    const neutralInput = screen.getByRole("textbox", { name: "Name" });
    const validIcon = validInput.parentElement.querySelector("svg");

    expect(themeRoot.style.getPropertyValue("--tenant-auth-form-error")).toBe(
      theme.authFormErrorColor,
    );
    expect(themeRoot.style.getPropertyValue("--tenant-auth-field-error")).toBe(
      theme.authFieldErrorColor,
    );
    expect(
      themeRoot.style.getPropertyValue("--tenant-auth-field-success"),
    ).toBe(theme.authFieldSuccessColor);
    expect(
      themeRoot.style.getPropertyValue("--tenant-auth-field-secondary"),
    ).toBe(theme.authFieldSecondaryColor);
    expect(invalidInput).toHaveClass(
      "bg-[var(--tenant-auth-field-surface)]",
      "border-[var(--tenant-auth-field-error,var(--tenant-auth-field-text))]",
    );
    expect(screen.getByText("Needs attention")).toHaveClass(
      "text-[var(--tenant-auth-form-error,var(--tenant-auth-form-text))]",
    );
    expect(validInput).toHaveClass(
      "border-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))]",
    );
    expect(validIcon).toHaveClass(
      "text-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))]",
    );
    expect(neutralInput).toHaveClass(
      "focus:border-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]",
      "focus:ring-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]/15",
    );
    expect(invalidInput.className).not.toMatch(/red-|emerald-/);
    expect(validInput.className).not.toMatch(/red-|emerald-/);
  });
});
