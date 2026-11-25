import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  navigation: [],
  customLinks: [],
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
          customLinks: mocks.customLinks,
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
    mocks.customLinks = [];
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

  it("flattens header groups into real footer destinations and removes repeated hrefs", () => {
    mocks.navigation = [
      {
        key: "custom-studios",
        custom: true,
        label: "Studios",
        children: [
          {
            key: "custom-group:studios:grohova",
            custom: true,
            label: "Grohova",
            href: "https://www.example.com/en/grohova/",
          },
          {
            key: "custom-group:studios:about",
            custom: true,
            label: "About",
            href: "/en/about",
          },
        ],
      },
      {
        key: "custom-about",
        custom: true,
        label: "About again",
        href: "/en/about",
      },
    ];
    mocks.customLinks = [
      {
        id: "about-footer",
        label: { en: "Footer about" },
        href: { en: "/en/about" },
      },
    ];
    render(<PublicTenantFooter />);
    expect(screen.getByRole("link", { name: "Grohova" })).toHaveAttribute(
      "href",
      "https://www.example.com/en/grohova/",
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/en/about",
    );
    expect(screen.queryByRole("link", { name: "Studios" })).toBeNull();
    expect(screen.queryByRole("link", { name: "About again" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Footer about" })).toBeNull();
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

  it("localizes extra footer links, preserves their destinations, and deduplicates inherited and extra hrefs", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.navigation = [
      {
        key: "custom-shared-id",
        custom: true,
        label: "Courses",
        href: "/cs/courses?location=vaclavska",
      },
    ];
    mocks.customLinks = [
      {
        id: "shared-id",
        label: { cs: "O nás", en: "About us" },
        href: { cs: "/cs/about", en: "https://www.commonground.example/en/about/" },
      },
      {
        id: "courses-again",
        label: { en: "Duplicate courses" },
        href: { en: "/cs/courses?location=vaclavska" },
      },
      {
        id: "about-again",
        label: { en: "Duplicate about" },
        href: { en: "https://www.commonground.example/en/about/" },
      },
    ];

    render(<PublicTenantFooter />);

    expect(screen.getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      "/cs/courses?location=vaclavska",
    );
    expect(screen.getByRole("link", { name: "About us" })).toHaveAttribute(
      "href",
      "https://www.commonground.example/en/about/",
    );
    expect(screen.queryByRole("link", { name: /Duplicate/ })).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
