import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  navigation: [],
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      key === "footer.defaultCopyright"
        ? `© ${values.year} ${values.studio}`
        : key === "footer.poweredBy"
          ? "Powered by shario.io"
          : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/",
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getLocalizedPublicTenantText: (value, _locale, fallback = "") =>
    value || fallback,
  getPublicTenantTheme: () => ({
    accentLinkColor: "#1F36D4",
    backgroundColor: "#FFFFFF",
    textColor: "#111111",
    secondaryColor: "#F5F1EA",
  }),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    degraded: false,
    navigation: mocks.navigation,
    surface: "public",
    tenant: {
      publicSite: {
        branding: {
          description: "",
          displayName: "The Pottery House",
        },
        footer: {
          address: "",
          copyright: "",
          description: "",
          email: "",
          legal: {},
          openingHours: "",
          phone: "",
          social: {},
        },
      },
    },
  }),
}));

import PublicTenantFooter from "@/components/public-tenant/PublicTenantFooter";

describe("PublicTenantFooter platform navigation", () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams();
    mocks.navigation = [];
  });

  it.each([
    [
      "location=vaclavska&courseSessionId=date-1",
      "/courses?location=vaclavska",
    ],
    ["locationId=location-main", "/courses?location=location-main"],
    ["location=%2F%2Fother-studio.example", "/courses"],
    ["", "/courses"],
  ])(
    "preserves only the valid studio reference in the Courses footer link: %s",
    (query, expectedHref) => {
      mocks.searchParams = new URLSearchParams(query);
      mocks.navigation = [
        { key: "courses", href: "/courses" },
        { key: "memberships", href: "/memberships" },
      ];
      render(<PublicTenantFooter />);

      expect(screen.getByRole("link", { name: "nav.courses" })).toHaveAttribute(
        "href",
        expectedHref,
      );
      expect(
        screen.getByRole("link", { name: "nav.memberships" }),
      ).toHaveAttribute("href", "/memberships");
    },
  );

  it("keeps unavailable or hidden Courses out of footer navigation", () => {
    mocks.searchParams = new URLSearchParams("location=vaclavska");
    render(<PublicTenantFooter />);

    expect(
      screen.queryByRole("link", { name: "nav.courses" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the configured platform origin in local development", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "shario.localhost");

    render(<PublicTenantFooter />);

    const target = new URL(
      screen
        .getByRole("link", { name: "Powered by shario.io" })
        .getAttribute("href"),
    );

    expect(target.hostname).toBe("shario.localhost");
    expect(target.pathname).toBe("/en");
  });
});
