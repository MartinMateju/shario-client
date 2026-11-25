import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, useLocale } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PlanDefinitions,
  PricingBuyerFaq,
  PricingFeeNote,
} from "@/components/Marketing/PricingDetails";
import PricingMarketingPage from "@/components/Marketing/PricingMarketingPage";
import { loadMessages } from "@/i18n/catalogs";
import { ROLLOUT_ELIGIBLE_LOCALE_CODES } from "@/i18n/locales";
import { subscriptionCatalog } from "../helpers/subscription-catalog";

const state = vi.hoisted(() => ({ catalog: null, isLoading: false }));

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

vi.mock("@/hooks/useCurrencyPreference", () => ({
  default: () => ({
    currency: "EUR",
    setCurrency: vi.fn(),
    isTenantCurrency: false,
  }),
}));
vi.mock("@/hooks/usePublicSubscriptionCatalog", () => ({
  default: () => ({
    catalog: state.catalog,
    isLoading: state.isLoading,
    isError: !state.isLoading && !state.catalog,
  }),
}));

async function renderDetails(locale, children) {
  const messages = await loadMessages(locale);
  const onError = vi.fn();
  const result = render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={onError}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>,
  );
  return { ...result, copy: messages.PricingDetails, messages, onError };
}

beforeEach(() => {
  state.catalog = subscriptionCatalog;
  state.isLoading = false;
});

describe("public buying details", () => {
  it.each(ROLLOUT_ELIGIBLE_LOCALE_CODES)(
    "renders the %s catalog with the supported preview fallback and localized AI link",
    async (locale) => {
      const { copy, onError } = await renderDetails(
        locale,
        <>
          <PricingFeeNote />
          <PricingBuyerFaq />
          <PlanDefinitions />
        </>,
      );
      const faq = screen.getByRole("region", { name: copy.faq.title });
      const feeLink = screen.getByRole("link", { name: copy.feeLink });
      expect(faq).toHaveAttribute("id", feeLink.hash.slice(1));
      expect(screen.getByText(copy.feeNote)).toBeVisible();

      const aiSummary = screen.getByText(copy.definitions.studioAi.question);
      await userEvent.click(aiSummary);
      const aiLink = screen.getByRole("link", { name: copy.links.studioAi });
      expect(aiLink).toHaveAttribute("href", `/${locale}/studio-ai`);
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "cs", "nl"])(
    "keeps %s payment and cancellation answers accessible without a signup",
    async (locale) => {
      const user = userEvent.setup();
      const { copy } = await renderDetails(locale, <PricingBuyerFaq />);
      const refundSummary = screen.getByText(copy.faq.refunds.question);
      const refundDetails = refundSummary.closest("details");
      const refundAnswer = screen.getByText(copy.faq.refunds.answer);

      expect(refundDetails).not.toHaveAttribute("open");
      expect(refundAnswer).not.toBeVisible();
      await user.click(refundSummary);
      expect(refundDetails).toHaveAttribute("open");
      expect(refundAnswer).toBeVisible();
      expect(
        screen.getByRole("link", { name: copy.links.refundTerms }),
      ).toHaveAttribute("href", `/${locale}/terms#cancellation-and-refunds`);
      expect(
        screen.getByRole("link", { name: copy.links.refundContact }),
      ).toHaveAttribute(
        "href",
        "mailto:hello@shario.io?subject=Subscription%20refund",
      );

      await user.click(screen.getByText(copy.faq.payments.question));
      expect(
        screen.getByRole("link", { name: copy.links.stripePricing }),
      ).toHaveAttribute("href", "https://stripe.com/pricing");
      await user.click(refundSummary);
      expect(refundDetails).not.toHaveAttribute("open");
    },
  );

  it("keeps billing explanations available when price loading fails", async () => {
    state.catalog = null;
    const { copy, messages, onError } = await renderDetails(
      "en",
      <PricingMarketingPage />,
    );

    expect(screen.getByText(copy.feeNote)).toBeVisible();
    expect(screen.getByRole("region", { name: copy.faq.title })).toBeVisible();
    expect(
      screen.getAllByRole("button", {
        name: messages.MarketingHome.pricing.loadError,
      }),
    ).toHaveLength(3);
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps the new details connected to live plan prices and interval controls", async () => {
    const user = userEvent.setup();
    const { copy, messages } = await renderDetails(
      "cs",
      <PricingMarketingPage />,
    );
    const plans = screen.getAllByRole("article");
    const starter = plans[0];
    const expectedAmount = (amount) =>
      new Intl.NumberFormat("cs", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
      })
        .format(amount / 100)
        .replace(/\s/g, " ");

    expect(within(starter).getByText(expectedAmount(4321))).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(messages.MarketingHome.pricing.yearly),
      }),
    );
    expect(within(starter).getByText(expectedAmount(43210))).toBeVisible();
    expect(screen.getByText(copy.feeNote)).toBeVisible();
    expect(screen.getByRole("region", { name: copy.faq.title })).toBeVisible();
  });
});
