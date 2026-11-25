import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider, useLocale } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import MarketingPlanComparison from "@/components/Marketing/MarketingPlanComparison";
import {
  homepageCatalogs,
  homepageLocales,
} from "../helpers/homepage-catalogs";

vi.mock("@/i18n/navigation", () => ({
  Link: function LocalizedLink({ href, children, ...props }) {
    const locale = useLocale();
    return (
      <a href={`/${locale}${href}`} {...props}>
        {children}
      </a>
    );
  },
}));

function renderComparison(locale = "en") {
  const messages = {
    ...homepageCatalogs[locale],
    // PricingDetails deliberately uses English fallback in preview locales.
    // Keep the required marketing namespaces raw to catch missing translations.
    PricingDetails:
      homepageCatalogs[locale].PricingDetails ||
      homepageCatalogs.en.PricingDetails,
  };
  const onError = vi.fn();
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC"
      onError={onError}
    >
      <MarketingPlanComparison />
    </NextIntlClientProvider>,
  );
  return { copy: messages.MarketingPlanComparison, messages, onError };
}

function rowValues(label) {
  const row = screen.getByRole("rowheader", { name: label }).closest("tr");
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
}

describe("current public plan comparison", () => {
  it.each(homepageLocales)(
    "provides a translated, labelled and keyboard-scrollable %s comparison",
    (locale) => {
      const { copy, messages, onError } = renderComparison(locale);
      const table = screen.getByRole("table", { name: copy.caption });
      const region = screen.getByRole("region", { name: copy.scrollLabel });
      expect(region).toContainElement(table);
      expect(region).toHaveAttribute("tabindex", "0");
      const headers = within(table).getAllByRole("columnheader");
      expect(headers.map((header) => header.textContent)).toEqual([
        copy.feature,
        messages.MarketingHome.pricing.starter.name,
        messages.MarketingHome.pricing.professional.name,
        messages.MarketingHome.pricing.studioPlus.name,
      ]);
      headers.forEach((header) =>
        expect(header).toHaveAttribute("scope", "col"),
      );
      within(table)
        .getAllByRole("rowheader")
        .forEach((header) => expect(header).toHaveAttribute("scope", "row"));
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it("distinguishes the Professional trial from Studio Plus access and AI tools", () => {
    const { copy } = renderComparison();
    const { included, notIncluded } = copy.values;
    for (const row of ["accessCodes", "customDomain", "advancedAi"]) {
      expect(rowValues(copy.rows[row])).toEqual([
        notIncluded,
        notIncluded,
        included,
      ]);
    }
    for (const row of ["openStudioMemberships", "briefingKnowledge"]) {
      expect(rowValues(copy.rows[row])).toEqual([
        notIncluded,
        included,
        included,
      ]);
    }
    expect(screen.getByText(copy.trialNote)).toBeVisible();
    expect(screen.getByText(copy.accessNote)).toBeVisible();
  });

  it.each(["en", "cs"])(
    "shows current V3 allowances using %s number formatting",
    (locale) => {
      const { copy } = renderComparison(locale);
      const format = new Intl.NumberFormat(locale);
      // These are the public quotas in the backend PLAN_V3_CAPABILITIES,
      // not internal safety ceilings or historical V1/V2 entitlements.
      for (const [row, values] of Object.entries({
        locations: [1, 1, 2],
        teamAccounts: [1, 3, 6],
        emails: [500, 2500, 5000],
        aiCredits: [0, 2000, 10000],
      })) {
        expect(rowValues(copy.rows[row])).toEqual(
          values.map((value) => format.format(value)),
        );
      }
      expect(rowValues(copy.rows.automations)).toEqual([
        format.format(0),
        format.format(3),
        copy.values.advanced,
      ]);
      expect(rowValues(copy.rows.studioAssistant)).toEqual([
        copy.values.notIncluded,
        copy.values.included,
        copy.values.included,
      ]);
    },
  );

  it("offers Enterprise through a scoped conversation rather than a guaranteed allowance", () => {
    const { copy } = renderComparison();
    expect(screen.getByText(copy.enterpriseDescription)).toBeVisible();
    expect(
      screen.getByRole("link", { name: copy.enterpriseCta }),
    ).toHaveAttribute(
      "href",
      "mailto:hello@shario.io?subject=shario.io%20Enterprise",
    );
    expect(screen.getByRole("table").textContent).not.toMatch(/unlimited/i);
  });
});
