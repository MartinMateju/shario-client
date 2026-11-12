import fs from "node:fs";
import path from "node:path";

import { render, screen, within } from "@testing-library/react";
import React from "react";

import CustomerAuthShell from "@/components/auth/CustomerAuthShell";
import { resolveCustomerPortalDashboardCustomization } from "@/components/customer-shell/customerPortalCustomization";
import { getCustomerAuthCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import PublicSiteLoginPreview from "@/components/public-site-editor/PublicSiteLoginPreview";
import {
  normalizePublicTenant,
  resolvePublicTenantLabelColor,
} from "@/components/public-tenant/publicTenant.config";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";
import PublicTenantHomePage from "@/components/public-tenant/PublicTenantHomePage";

const tenant = {
  name: "Studio Olivie",
  slug: "studio-olivie",
  publicCapabilities: {
    bookStudio: true,
    courses: false,
    memberships: false,
    vouchers: false,
    help: false,
    registration: true,
  },
  publicSite: {
    branding: {
      displayName: "Studio Olivie",
      accentColor: "#4056D6",
      secondaryColor: "#D8785E",
      backgroundColor: "#F7F4ED",
      textColor: "#1F1F1F",
      labelColor: "#75412F",
      coverImageUrl: "https://cdn.example.com/home.webp",
    },
    pages: {
      home: {
        eyebrow: { en: "Made for makers", cs: "Pro tvůrce" },
        headline: { en: "Create with us", cs: "Tvořte s námi" },
        description: { en: "A calm studio.", cs: "Klidné studio." },
        labelColor: "#8A3F2B",
        sectionOrder: ["waysToVisit"],
        hiddenSections: [],
      },
    },
    customerPortal: {
      dashboard: {
        eyebrow: { en: "Your studio", cs: "Vaše studio" },
        headline: { en: "Welcome home", cs: "Vítejte" },
        description: {
          en: "Everything in one place.",
          cs: "Vše na jednom místě.",
        },
        labelColor: "#3F5B37",
      },
    },
  },
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) =>
    ({
      "home.exploreEyebrow": "Explore",
      "home.exploreTitle": "Ways to visit",
      "home.cards.book": "Book your visit",
      "nav.book": "Book",
      "home.explore": "Explore",
      "actions.signIn": "Sign in",
    })[key] || key,
}));

vi.mock("react-redux", () => ({
  useSelector: () => false,
}));

vi.mock("@/components/auth/useIsCustomerSurfaceReady", () => ({
  default: () => false,
}));

vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicBookingLocationsQuery: () => ({ data: [] }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicProductsQuery: () => ({ data: [] }),
  useGetPublicCourseProductsQuery: () => ({ data: [] }),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetPublicMembershipCatalogQuery: () => ({ data: [] }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: normalizePublicTenant(tenant),
    navigation: [{ key: "book", href: "/book" }],
    primaryAction: null,
  }),
}));

describe("live customer-facing customization", () => {
  it("applies the page label to the hero and the brand accent to visit card actions", () => {
    render(<PublicTenantHomePage />);

    expect(screen.getByText("Made for makers")).toHaveStyle({
      color: "#8A3F2B",
    });
    expect(screen.getAllByText("Explore")[0]).toHaveStyle({
      color: "#4056D6",
    });
    expect(
      document.querySelector("[data-public-tenant-service='book']"),
    ).toHaveClass("text-[color:var(--tenant-text-on-surface)]");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("applies an auth page label colour without recolouring form fields", () => {
    render(
      <CustomerAuthShell
        accentColor="#4056D6"
        description="A calm account."
        eyebrow="Customer story"
        formDescription="Use your studio account."
        formEyebrow="Customer access"
        formTitle="Sign in"
        labelColor="#7A412D"
        secondaryColor="#D8785E"
        tenantName="Studio Olivie"
        themeStyle={{
          "--tenant-accent-link": "#8293FF",
          "--tenant-auth-form-surface": "#16181D",
          "--tenant-auth-form-text": "#F8F8F5",
          "--tenant-auth-form-muted": "#C8C9C4",
        }}
        title="Welcome back"
      >
        <label htmlFor="email">Neutral field label</label>
        <input id="email" />
      </CustomerAuthShell>,
    );

    expect(screen.getByText("Customer story")).toHaveStyle({
      color: resolvePublicTenantLabelColor("#7A412D", "#292720", "#FFFFFF"),
    });
    expect(screen.getByText("Customer access")).toHaveStyle({
      color:
        "var(--tenant-page-label-color, var(--tenant-label-color, var(--tenant-accent-link)))",
    });
    expect(screen.getByText("Neutral field label")).not.toHaveStyle({
      color: "#7A412D",
    });
    expect(document.querySelector('[data-auth-surface="login"]')).toHaveStyle({
      "--tenant-page-label-color": resolvePublicTenantLabelColor(
        "#7A412D",
        "#16181D",
        "#8293FF",
      ),
    });
    expect(screen.getByRole("heading", { name: "Sign in" })).toHaveStyle({
      color:
        "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #1f1f1f))",
    });
  });

  it.each(["login", "register"])(
    "uses the same blank %s story defaults in preview and live routes",
    (mode) => {
      const defaults = getCustomerAuthCustomizationDefaults(mode, "en");
      const previewTenant = normalizePublicTenant({
        name: "Studio Olivie",
        slug: "studio-olivie",
        publicSite: {
          branding: {
            displayName: "Studio Olivie",
            accentColor: "#4056D6",
            secondaryColor: "#D8785E",
            backgroundColor: "#F7F4ED",
            textColor: "#1F1F1F",
          },
        },
      });

      render(
        <PublicSiteLoginPreview
          tenant={previewTenant}
          locale="en"
          mode={mode}
          mobile={false}
          t={(key) =>
            ({
              loginFormEyebrow: "Customer access",
              loginCard: "Sign in",
              registerFormEyebrow: "Customer access",
              registerCard: "Create account",
            })[key] || key
          }
        />,
      );

      expect(screen.getByText(defaults.eyebrow)).toBeInTheDocument();
      expect(screen.getByText(defaults.headline)).toBeInTheDocument();
      expect(screen.getByText(defaults.description)).toBeInTheDocument();
      expect(screen.getByText("Customer access")).toBeInTheDocument();
      expect(screen.queryByText("Google")).not.toBeInTheDocument();
      expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    },
  );

  it("matches the live auth brand spacing when an uploaded logo is present", () => {
    const previewTenant = normalizePublicTenant({
      name: "Studio Olivie",
      slug: "studio-olivie",
      publicSite: {
        branding: {
          displayName: "Studio Olivie",
          logoUrl: "https://cdn.example.com/logo.webp",
        },
      },
    });

    render(
      <PublicSiteLoginPreview
        tenant={previewTenant}
        locale="en"
        mobile={false}
        t={(key) =>
          ({
            loginFormEyebrow: "Customer access",
            loginCard: "Sign in",
          })[key] || key
        }
      />,
    );

    const brand = document.querySelector("[data-auth-form-brand]");
    expect(brand.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo.webp",
    );
    expect(within(brand).getByText("Studio Olivie")).toHaveClass("sr-only");
  });

  it("localizes portal dashboard copy and inherits the global label colour", () => {
    const english = resolveCustomerPortalDashboardCustomization({
      tenant,
      locale: "en",
      fallbackCopy: {
        eyebrow: "Fallback eyebrow",
        greeting: "Fallback greeting",
        intro: "Fallback intro",
        book: "Book",
      },
    });
    const inherited = resolveCustomerPortalDashboardCustomization({
      tenant: {
        publicSite: {
          branding: { labelColor: "#75412F" },
          customerPortal: { dashboard: {} },
        },
      },
      locale: "cs",
      fallbackCopy: { eyebrow: "Přehled", greeting: "Ahoj", intro: "Úvod" },
    });

    expect(english).toEqual({
      copy: {
        eyebrow: "Your studio",
        greeting: "Welcome home",
        intro: "Everything in one place.",
        book: "Book",
      },
      labelColor: "#3F5B37",
    });
    expect(inherited.labelColor).toBe("#75412F");
    expect(inherited.copy).toEqual({
      eyebrow: "Přehled",
      greeting: "Ahoj",
      intro: "Úvod",
    });
  });

  it.each(["", "#2331D2"])(
    "keeps inherited or explicit dashboard labels readable on a personal dark background (%s)",
    (labelColor) => {
      const studio = {
        publicSite: {
          branding: { backgroundColor: "#FFFFFF", labelColor: "#2331D2" },
          customerPortal: { dashboard: { labelColor } },
        },
      };
      const effectiveTenant = mergePortalAppearance(studio, {
        backgroundColor: "#111827",
      });
      const resolved = resolveCustomerPortalDashboardCustomization({
        tenant: effectiveTenant,
      });
      const luminance = (hex) => {
        const [r, g, b] = [1, 3, 5].map((index) => {
          const channel =
            Number.parseInt(hex.slice(index, index + 2), 16) / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const foreground = luminance(resolved.labelColor);
      const background = luminance("#111827");
      expect(
        (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
      expect(resolved.labelColor).not.toBe("#2331D2");
      expect(studio.publicSite.branding.labelColor).toBe("#2331D2");
    },
  );

  it("wires distinct login and registration content with legacy image fallback", () => {
    const root = process.cwd();
    const loginSource = fs.readFileSync(
      path.join(
        root,
        "src/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page.js",
      ),
      "utf8",
    );
    const registerSource = fs.readFileSync(
      path.join(
        root,
        "src/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page.js",
      ),
      "utf8",
    );

    expect(loginSource).toContain("tenant.publicSite.login.eyebrow");
    expect(loginSource).toContain("tenant.publicSite.login.labelColor");
    expect(loginSource).toContain("labelColor={labelColor}");
    expect(registerSource).toContain(
      "register.backgroundImageUrl || tenant.publicSite.login.backgroundImageUrl",
    );
    expect(registerSource).toContain("register.supportingText");
    expect(registerSource).toContain("register.helpText");
    expect(registerSource).toContain("register.labelColor");
  });
});
