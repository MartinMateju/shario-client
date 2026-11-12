import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "de",
  pathname: "/pricing",
  query: "plan=pro",
  replace: vi.fn(),
  tenant: null,
  persistCurrent: vi.fn(),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.tenant ? { tenant: mocks.tenant } : null,
}));
vi.mock("@/i18n/customerLocalePreference", () => ({
  persistCustomerCurrentLocale: (...args) => mocks.persistCurrent(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: [
      "en",
      "cs",
      "de",
      "pl",
      "sk",
      "da",
      "fr",
      "es",
      "it",
      "pt-PT",
      "sv",
      "nb",
      "fi",
      "hu",
      "el",
      "tr",
      "nl",
      "ro",
    ],
  },
}));

import LanguageSelector from "@/components/headers/LanguageSelector";
import { EXPLICIT_LOCALE_COOKIE_NAME } from "@/i18n/localePreference";

describe("LanguageSelector", () => {
  beforeEach(() => {
    mocks.locale = "de";
    mocks.pathname = "/pricing";
    mocks.query = "plan=pro";
    mocks.replace.mockReset();
    mocks.tenant = null;
    mocks.persistCurrent.mockReset();
    document.cookie = `${EXPLICIT_LOCALE_COOKIE_NAME}=; Path=/; Max-Age=0`;
    window.location.hash = "#plans";
  });

  it("shows every routeable platform language and preserves location state", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));

    for (const language of [
      "English",
      "Čeština",
      "Deutsch",
      "Polski",
      "Slovenčina",
      "Dansk",
      "Français",
      "Español",
      "Italiano",
      "Português (Portugal)",
      "Svenska",
      "Norsk bokmål",
      "Suomi",
      "Magyar",
      "Ελληνικά",
      "Türkçe",
      "Nederlands",
      "Română",
    ]) {
      expect(
        screen.getByRole("button", {
          name: (accessibleName) => accessibleName.includes(language),
        }),
      ).toBeVisible();
    }
    expect(screen.getByRole("button", { name: /Deutsch/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: /Polski/ }));

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "pl",
      scroll: false,
    });
    expect(document.cookie).toContain(`${EXPLICIT_LOCALE_COOKIE_NAME}=pl`);
    expect(mocks.persistCurrent).not.toHaveBeenCalled();
  });

  it("remembers the current customer language for this studio without changing the platform preference", async () => {
    const user = userEvent.setup();
    mocks.locale = "cs";
    mocks.pathname = "/portal/bookings";
    mocks.query = "location=brno&scope=history";
    mocks.tenant = { slug: "clay-house" };
    document.cookie = `${EXPLICIT_LOCALE_COOKIE_NAME}=de; Path=/`;
    render(<LanguageSelector tenantScoped localeCodes={["cs", "en"]} />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /English/ }));
    expect(mocks.persistCurrent).toHaveBeenCalledWith("en", "clay-house");
    expect(document.cookie).toContain(`${EXPLICIT_LOCALE_COOKIE_NAME}=de`);
    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal/bookings?location=brno&scope=history#plans",
      { locale: "en", scroll: false },
    );
  });

  it("also scopes tenant login selectors to their public context", async () => {
    const user = userEvent.setup();
    mocks.tenant = { slug: "clay-house" };
    render(<LanguageSelector tenantThemed localeCodes={["de", "en"]} />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /English/ }));
    expect(mocks.persistCurrent).toHaveBeenCalledWith("en", "clay-house");
    expect(document.cookie).not.toContain(EXPLICIT_LOCALE_COOKIE_NAME);
  });

  it("offers an unclipped profile choice using the supplied studio and preserving query and hash", async () => {
    const user = userEvent.setup();
    render(
      <LanguageSelector
        variant="profile"
        tenantScoped
        tenantSlug="clay-house"
        localeCodes={["de", "en"]}
      />,
    );
    const select = screen.getByRole("combobox", { name: "changeLanguage" });
    expect(screen.getAllByRole("option").map((option) => option.value)).toEqual(
      ["de", "en"],
    );
    await user.selectOptions(select, "en");
    expect(mocks.persistCurrent).toHaveBeenCalledWith("en", "clay-house");
    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "en",
      scroll: false,
    });
  });

  it("limits tenant selectors to the configured primary and secondary pair", async () => {
    const user = userEvent.setup();

    render(
      <LanguageSelector
        contextLabel="The Pottery House"
        localeCodes={["pl", "de", "ja", "pl"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));

    expect(screen.getByText("The Pottery House")).toBeVisible();
    expect(screen.getByRole("button", { name: /Deutsch/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Polski/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /English/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Français/ })).toBeNull();

    const configuredOptions = screen
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(configuredOptions).toHaveLength(2);
    expect(configuredOptions[0]).toHaveTextContent("Polski");
    expect(configuredOptions[1]).toHaveTextContent("Deutsch");
  });

  it("preserves the canonical hyphenated Portuguese route locale", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(
      screen.getByRole("button", { name: /Português \(Portugal\)/ }),
    );

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "pt-PT",
      scroll: false,
    });
  });

  it("uses canonical Bokmål routing for Norwegian", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /Norsk bokmål/ }));

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "nb",
      scroll: false,
    });
  });

  it("uses canonical Greek routing for Wave 2C", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /Ελληνικά/ }));

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "el",
      scroll: false,
    });
  });

  it("uses canonical Dutch routing for Wave 2D", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /Nederlands/ }));

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "nl",
      scroll: false,
    });
  });

  it("uses canonical Romanian routing for Wave 2E", async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);
    await user.click(screen.getByRole("button", { name: /^changeLanguage/ }));
    await user.click(screen.getByRole("button", { name: /Română/ }));

    expect(mocks.replace).toHaveBeenCalledWith("/pricing?plan=pro#plans", {
      locale: "ro",
      scroll: false,
    });
  });

  it("keeps the tenant trigger primary while the selected locale stays secondary", async () => {
    const user = userEvent.setup();

    render(
      <LanguageSelector
        contextLabel="The Pottery House"
        localeCodes={["de", "pl"]}
        tenantThemed
      />,
    );
    const trigger = screen.getByRole("button", { name: /^changeLanguage/ });
    expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
    expect(trigger).toHaveClass(
      "focus-visible:ring-[var(--tenant-accent-link)]/30",
    );

    await user.click(trigger);
    expect(trigger).toHaveStyle({
      color: "var(--tenant-accent-on-surface)",
    });

    const selected = screen.getByRole("button", { name: /Deutsch/ });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).toHaveClass(
      "bg-[var(--tenant-secondary)]",
      "text-[var(--tenant-secondary-foreground)]",
      "focus-visible:ring-[var(--tenant-auth-form-secondary,var(--tenant-interactive-hover))]/30",
    );
    expect(selected).not.toHaveClass(
      "bg-skab-cobalt-50",
      "text-primary-text",
      "focus-visible:ring-brand-primary/25",
    );
  });

  it("uses a neutral surface and primary feedback in the public tenant header", async () => {
    const user = userEvent.setup();

    render(
      <LanguageSelector
        contextLabel="The Pottery House"
        localeCodes={["de", "pl"]}
        tenantScoped
      />,
    );

    const trigger = screen.getByRole("button", { name: /^changeLanguage/ });
    expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
    expect(trigger).toHaveClass(
      "rounded-full",
      "hover:bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)]",
      "hover:text-[var(--tenant-accent-link)]",
      "focus-visible:ring-[var(--tenant-accent-link)]/30",
    );

    await user.click(trigger);

    expect(trigger).toHaveClass(
      "bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)]",
      "text-[var(--tenant-accent-link)]",
    );
  });

  it("hides a tenant selector when only one routeable language is configured", () => {
    render(<LanguageSelector hideWhenSingle localeCodes={["de"]} />);

    expect(
      screen.queryByRole("button", { name: /^changeLanguage/ }),
    ).toBeNull();
  });
});
