vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PublicSiteLoginPreview from "@/components/public-site-editor/PublicSiteLoginPreview";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";

const tenant = normalizePublicTenant({
  name: "Studio Olivie",
  slug: "studio-olivie",
  publicSite: {
    branding: {
      displayName: "Studio Olivie",
      logoUrl: "https://images.example.com/logo.webp",
      accentColor: "#4056D6",
      secondaryColor: "#D9806E",
      backgroundColor: "#FCFBF8",
      textColor: "#292925",
    },
    login: {
      headline: { en: "Welcome back." },
      supportingText: { en: "Continue with your studio account." },
      helpText: { en: "Contact the studio if you need help." },
      backgroundImageUrl: "https://images.example.com/studio.webp",
    },
  },
});

const t = (key) =>
  ({
    loginCard: "Sign in",
    loginFormEyebrow: "Customer access",
  })[key] || key;

describe("public-site login editor preview", () => {
  it.each([
    ["login", true],
    ["login", false],
    ["register", true],
    ["register", false],
  ])(
    "reflects enabled and disabled logo links for %s, mobile=%s",
    (mode, mobile) => {
      const previewTenant = normalizePublicTenant({
        ...tenant,
        publicSite: {
          ...tenant.publicSite,
          branding: {
            ...tenant.publicSite.branding,
            logoRedirectEnabled: true,
            logoRedirectUrl: "https://www.atelierklei.cz/",
          },
        },
      });
      const { rerender, container } = render(
        <PublicSiteLoginPreview
          tenant={previewTenant}
          locale="en"
          mode={mode}
          mobile={mobile}
          t={t}
        />,
      );

      expect(
        screen.getByRole("link", { name: "Studio Olivie" }),
      ).toHaveAttribute("href", "https://www.atelierklei.cz/");

      rerender(
        <PublicSiteLoginPreview
          tenant={{
            ...previewTenant,
            publicSite: {
              ...previewTenant.publicSite,
              branding: {
                ...previewTenant.publicSite.branding,
                logoRedirectEnabled: false,
              },
            },
          }}
          locale="en"
          mode={mode}
          mobile={mobile}
          t={t}
        />,
      );

      expect(screen.queryByRole("link", { name: "Studio Olivie" })).toBeNull();
      const logo = container.querySelector("[data-auth-form-brand]");
      expect(logo).not.toHaveAttribute("href");
      expect(logo).not.toHaveAttribute("tabindex");
    },
  );

  it("mirrors the stacked mobile image and form composition", () => {
    render(<PublicSiteLoginPreview tenant={tenant} locale="en" mobile t={t} />);

    const auth = document.querySelector("[data-preview-auth]");
    const visual = auth.querySelector("[data-preview-auth-visual]");
    const image = auth.querySelector("[data-preview-auth-image]");

    expect(auth).toHaveClass("grid", "grid-cols-1");
    expect(visual).toHaveClass("min-h-[200px]");
    expect(
      auth.querySelector("[data-preview-auth-visual-content]"),
    ).toHaveClass("relative", "min-h-[200px]");
    expect(image).toHaveClass("object-cover");
    expect(image.getAttribute("class")).not.toContain("opacity");
    expect(screen.getByText("Welcome back.")).toBeInTheDocument();
    expect(
      screen.getByText("Continue with your studio account."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(auth.querySelectorAll("[data-preview-auth-field]")).toHaveLength(2);
    expect(
      auth.querySelector('[data-tenant-button="primary"]'),
    ).toBeInTheDocument();
  });

  it("switches to the accurate split preview for desktop", () => {
    const { container } = render(
      <PublicSiteLoginPreview
        tenant={tenant}
        locale="en"
        mobile={false}
        t={t}
      />,
    );

    const auth = container.querySelector("[data-preview-auth]");

    expect(auth).toHaveClass("grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]");
    const formPanel = container.querySelector("[data-preview-auth-form-panel]");
    expect(formPanel).toHaveAttribute("data-tenant-surface", "panel");
    expect(formPanel).toHaveStyle({
      backgroundColor: "var(--tenant-auth-form-surface)",
      color: "var(--tenant-auth-form-text)",
    });
    expect(
      container.querySelectorAll('[data-testid="brush-swash"]'),
    ).toHaveLength(0);
  });

  it("uses the tenant palette for the no-image fallback", () => {
    const fallbackTenant = normalizePublicTenant({
      ...tenant,
      publicSite: {
        ...tenant.publicSite,
        login: {
          ...tenant.publicSite.login,
          backgroundImageUrl: "",
        },
      },
    });
    const { container } = render(
      <PublicSiteLoginPreview
        tenant={fallbackTenant}
        locale="en"
        mobile={false}
        t={t}
      />,
    );

    const fallback = container.querySelector("[data-preview-auth-fallback]");

    expect(fallback).toBeInTheDocument();
    expect(fallback.getAttribute("style")).toContain("color-mix");
    expect(
      container.querySelectorAll('[data-testid="brush-swash"]'),
    ).toHaveLength(2);
  });
});
