import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingSidebar } from "@/components/onboarding/OnboardingSidebar";
import { StepHeading } from "@/components/onboarding/StepHeading";
import { BusinessStep } from "@/components/onboarding/steps/BusinessStep";
import { StudioStep } from "@/components/onboarding/steps/StudioStep";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, locale, ...props }) => (
    <a href={locale ? `/${locale}${href}` : href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/app/onboarding",
  useRouter: () => mocks.router,
}));

const form = {
  studioName: "Ateliér Klei",
  businessType: "coworking_space",
  country: "Czech Republic",
  currency: "CZK",
  timezone: "Europe/Prague",
};

describe("tenant onboarding translations", () => {
  it("renders the five launch essentials on one Czech screen", () => {
    render(
      <NextIntlClientProvider locale="cs" messages={messagesCs}>
        <OnboardingHeader onExit={vi.fn()} />
        <OnboardingSidebar />
        <StepHeading />
        <StudioStep form={form} setField={vi.fn()} />
        <BusinessStep form={form} setField={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getAllByRole("button", { name: "Ukončit" }).length,
    ).toBeGreaterThanOrEqual(1);

    const header = screen.getByRole("banner");
    const languageTriggers = within(header).getAllByRole("button", {
      name: "Změnit jazyk (CS)",
    });

    expect(languageTriggers.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(languageTriggers[0]);

    const selectedLanguage = within(
      languageTriggers[0].parentElement,
    ).getByRole("button", { pressed: true });

    expect(selectedLanguage).toHaveTextContent("CS");
    expect(selectedLanguage).toHaveTextContent("Čeština");
    expect(
      within(header).queryByRole("link", { name: /Přepnout na/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Pojďme spustit/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Název studia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Česká republika")).toBeInTheDocument();
    expect(screen.getByText("CZK — česká koruna")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Časové pásmo" })).toHaveValue(
      "Europe/Prague",
    );
    expect(
      screen.getByRole("button", { name: "Coworking" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Město" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Velikost týmu")).not.toBeInTheDocument();
    expect(screen.getByText("DALŠÍ: LAUNCH CENTER")).toBeInTheDocument();
  });

  it("keeps the English and Czech onboarding catalogs structurally aligned", () => {
    const collectLeaves = (value, prefix = "") =>
      Object.entries(value).flatMap(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;

        return child && typeof child === "object"
          ? collectLeaves(child, path)
          : [path];
      });

    expect(collectLeaves(messagesCs.Onboarding).sort()).toEqual(
      collectLeaves(messagesEn.Onboarding).sort(),
    );
  });

  it.each([
    ["English", messagesEn, "Launch Center", "Launch Center"],
    ["Czech", messagesCs, "Centrum spuštění", "Centrum spuštění"],
  ])(
    "keeps the onboarding handoff branded and localizes workspace destinations in %s",
    (_label, catalog, dashboardRouteTitle, headerLinkTitle) => {
      expect(catalog.Onboarding.headings.description).toContain(
        "Launch Center",
      );
      expect(catalog.Onboarding.actions.openLaunchCenter).toContain(
        "Launch Center",
      );
      expect(catalog.Dashboard.routeTitles.setup).toBe(dashboardRouteTitle);
      expect(catalog.Header.account.tenantLinks.setupCenter).toBe(
        headerLinkTitle,
      );
    },
  );
});
