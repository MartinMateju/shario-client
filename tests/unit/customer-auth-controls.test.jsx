import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    key === "actions.backToStudio" ? "Back to studio" : key,
}));

vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");

  return {
    Link: ({ children, href, ...props }) =>
      createElement("a", { ...props, href }, children),
  };
});

vi.mock("@/components/headers/LanguageSelector", () => ({
  default: ({ tenantThemed }) => (
    <button type="button" data-tenant-themed={tenantThemed ? "true" : "false"}>
      Change language
    </button>
  ),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: {
      name: "Studio Olivie",
      publicSite: { branding: { displayName: "Studio Olivie" } },
      settings: {
        publicDefaultLanguage: "en",
        supportedPublicLanguages: ["en", "cs"],
      },
    },
  }),
}));

import CustomerAuthControls from "@/components/auth/CustomerAuthControls";

describe("customer auth controls", () => {
  it("keeps navigation available without rendering a full auth header", () => {
    render(<CustomerAuthControls />);

    const controls = document.querySelector("[data-customer-auth-controls]");
    const language = document.querySelector("[data-customer-auth-language]");
    const back = screen.getByRole("link", { name: "Back to studio" });

    expect(controls).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Back to studio" })).toBe(
      controls,
    );
    expect(controls).toHaveClass("fixed", "inset-x-0", "pointer-events-none");
    expect(
      controls.querySelector("[data-customer-auth-controls-inner]"),
    ).toHaveClass("max-w-[1480px]", "justify-between", "px-3");
    expect(document.querySelector("header")).toBeNull();
    expect(document.querySelector("[data-customer-auth-header]")).toBeNull();
    expect(back).toHaveAttribute("href", "/");
    expect(back).toHaveClass(
      "min-h-11",
      "min-w-11",
      "justify-center",
      "pointer-events-auto",
    );
    expect(
      screen.getByRole("button", { name: "Change language" }),
    ).toHaveAttribute("data-tenant-themed", "true");
    expect(language).toHaveClass("pointer-events-auto", "[&_button]:min-h-11");
    expect(controls.querySelector('[aria-controls="mobile-menu"]')).toBeNull();
  });
});
