"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  SUBSCRIPTION_PLAN_ORDER,
  getCurrentPlanPrice,
  getCurrentPlanPriceSpec,
} from "@/config/subscriptionPlans";
import { Link } from "@/i18n/navigation";
import PricingCurrencySelect from "@/components/Marketing/PricingCurrencySelect";
import useCurrencyPreference from "@/hooks/useCurrencyPreference";
import usePublicSubscriptionCatalog from "@/hooks/usePublicSubscriptionCatalog";
import { formatMinorCurrencyAmount } from "@/utils/money";

import {
  ArrowIcon,
  CheckIcon,
  FeatureCard,
  FinalCta,
  MarketingHero,
  MarketingPageShell,
  SectionHeading,
  SignalPanel,
} from "./MarketingPageShell";

const getPlanMessageKey = (planKey) =>
  planKey === "studio_plus" ? "studioPlus" : planKey;

function PricingCard({
  catalog,
  unavailableLabel,
  billingInterval,
  currency,
  home,
  locale,
  planKey,
}) {
  const messageKey = getPlanMessageKey(planKey);
  const featured = planKey === "professional";
  const enterprise = planKey === "enterprise";
  const features = [1, 2, 3, 4].map((index) =>
    home(`pricing.${messageKey}.feature${index}`),
  );
  const price = getCurrentPlanPrice(
    planKey,
    billingInterval,
    currency,
    catalog,
  );
  const customAnnual =
    getCurrentPlanPriceSpec(planKey, billingInterval, currency, catalog)
      ?.type === "custom";

  return (
    <article
      className={`relative flex h-full flex-col rounded-xl border p-6 sm:p-7 ${
        featured
          ? "border-[var(--studio-blue)] bg-[var(--studio-blue)] text-white shadow-[0_5px_18px_rgb(32_40_36/0.05)]"
          : "border-[var(--studio-rule)] bg-[var(--studio-white)] text-[var(--studio-ink)]"
      }`}
    >
      <div className="studio-marketing-plan-head">
        <p
          className={`text-[11px] font-medium uppercase tracking-[0.13em] ${featured ? "text-white/80" : "text-[var(--studio-clay)]"}`}
        >
          {home(`pricing.${messageKey}.name`)}
        </p>
        {featured ? (
          <span className="studio-marketing-plan-badge rounded-xl bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.11em] text-[var(--studio-blue)]">
            {home("pricing.mostPopular")}
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <div className="text-3xl font-medium tracking-[-0.055em]">
          {customAnnual ? (
            home("pricing.customAnnual")
          ) : price == null ? (
            <span className="text-base tracking-normal">
              {unavailableLabel}
            </span>
          ) : (
            <>
              {enterprise ? `${home("pricing.from")} ` : ""}
              {formatMinorCurrencyAmount(price, currency, locale)}
            </>
          )}
        </div>
        {!customAnnual && price != null ? (
          <div
            className={`mt-1 text-[11px] uppercase tracking-[0.11em] ${featured ? "text-white/80" : "text-[var(--studio-muted)]"}`}
          >
            {billingInterval === "yearly"
              ? home("pricing.perYear")
              : home("pricing.perMonth")}
          </div>
        ) : null}
      </div>

      <p
        className={`mt-3 min-h-14 text-sm leading-6 ${featured ? "text-white/80" : "text-[var(--studio-muted)]"}`}
      >
        {home(`pricing.${messageKey}.description`)}
      </p>

      <ul
        className={`mt-7 space-y-3 border-t pt-6 ${featured ? "border-white/18" : "border-[var(--studio-rule)]"}`}
      >
        {features.map((feature) => (
          <li className="flex gap-3 text-sm leading-6" key={feature}>
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-xl ${featured ? "bg-white/14 text-white" : "bg-[var(--studio-soft)] text-[var(--studio-blue)]"}`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {enterprise ? (
        <Link
          data-studio-action="primary"
          className={`group mt-8 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-medium transition ${
            featured
              ? "bg-white text-[var(--studio-blue)] hover:bg-[var(--studio-soft)]"
              : "bg-[var(--studio-blue)] text-white hover:bg-[var(--studio-blue-hover)]"
          }`}
          href="/register"
        >
          {home(`pricing.${messageKey}.cta`)}
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : price == null ? (
        <button
          type="button"
          disabled
          className="mt-8 min-h-12 cursor-not-allowed rounded-xl border border-current px-4 text-sm opacity-70"
        >
          {unavailableLabel}
        </button>
      ) : (
        <Link
          data-studio-action="primary"
          className={`group mt-8 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-medium transition ${
            featured
              ? "bg-white text-[var(--studio-blue)] hover:bg-[var(--studio-soft)]"
              : "bg-[var(--studio-blue)] text-white hover:bg-[var(--studio-blue-hover)]"
          }`}
          href="/register"
        >
          {home(`pricing.${messageKey}.cta`)}
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </article>
  );
}

export default function PricingMarketingPage() {
  const locale = useLocale();
  const t = useTranslations("MarketingPages");
  const home = useTranslations("MarketingHome");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const { currency, setCurrency, isTenantCurrency } = useCurrencyPreference();
  const { catalog, isLoading, isError } = usePublicSubscriptionCatalog();
  const unavailableLabel = home(
    isLoading
      ? "pricing.loading"
      : isError
        ? "pricing.loadError"
        : "pricing.unavailable",
  );

  const planSignals = SUBSCRIPTION_PLAN_ORDER.map((planKey) => {
    const key = getPlanMessageKey(planKey);

    return {
      description: home(`pricing.${key}.description`),
      icon: planKey === "enterprise" ? "layers" : "chart",
      title: home(`pricing.${key}.name`),
    };
  });

  const clarityItems = [
    {
      description: home("pricing.note"),
      icon: "chart",
      key: "pricing",
      title: home("pricing.eyebrow"),
    },
    {
      description: t("pricing.onboardingDescription"),
      icon: "layers",
      key: "launch",
      title: t("pricing.onboardingTitle"),
    },
    {
      description: home("trust.control.description"),
      icon: "shield",
      key: "control",
      title: home("trust.control.title"),
    },
  ];

  return (
    <MarketingPageShell>
      <MarketingHero
        aside={
          <SignalPanel
            eyebrow={home("pricing.eyebrow")}
            items={planSignals}
            title={home("pricing.title")}
          />
        }
        description={t("pricing.description")}
        eyebrow={t("pricing.eyebrow")}
        secondaryHref="/product"
        secondaryLabel={t("common.exploreProduct")}
        title={t("pricing.title")}
      />

      <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeading
            description={t("pricing.sectionDescription")}
            eyebrow={t("pricing.sectionEyebrow")}
            title={t("pricing.sectionTitle")}
          />

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <p aria-live="polite" className="sr-only">
              {home(`pricing.${billingInterval}`)} · {currency}
            </p>
            <div
              aria-label={home("pricing.billingIntervalLabel")}
              className="inline-flex rounded-xl border border-[var(--studio-rule)] bg-[var(--studio-white)] p-1"
              role="group"
            >
              {["monthly", "yearly"].map((interval) => (
                <button
                  aria-pressed={billingInterval === interval}
                  className={`min-h-11 rounded-xl px-4 text-xs font-medium transition ${
                    billingInterval === interval
                      ? "bg-[var(--studio-blue)] text-white shadow-sm"
                      : "text-[var(--studio-muted)] hover:text-[var(--studio-blue)]"
                  }`}
                  key={interval}
                  onClick={() => setBillingInterval(interval)}
                  type="button"
                >
                  {home(`pricing.${interval}`)}
                  {interval === "yearly" ? (
                    <span className="ml-2 hidden text-[11px] opacity-75 sm:inline">
                      {home("pricing.annualSavings")}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <PricingCurrencySelect
              currency={currency}
              onChange={setCurrency}
              disabled={isTenantCurrency}
              locale={locale}
              label={t("common.currencyLabel")}
            />
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLAN_ORDER.map((planKey) => (
            <PricingCard
              catalog={catalog}
              unavailableLabel={unavailableLabel}
              billingInterval={billingInterval}
              currency={currency}
              home={home}
              key={planKey}
              locale={locale}
              planKey={planKey}
            />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-4xl text-center text-xs leading-6 text-[var(--studio-muted)]">
          {home("pricing.note")}
        </p>
      </section>

      <section className="border-y border-[var(--studio-rule)] bg-[var(--studio-white)] py-20 lg:py-28">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8">
          <SectionHeading
            align="center"
            description={home("trust.description")}
            eyebrow={home("trust.eyebrow")}
            title={home("trust.title")}
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {clarityItems.map((item, index) => (
              <FeatureCard
                description={item.description}
                icon={item.icon}
                index={index}
                key={item.key}
                title={item.title}
              />
            ))}
          </div>
        </div>
      </section>

      <FinalCta
        description={t("pricing.closingDescription")}
        secondaryHref="/product"
        secondaryLabel={t("common.exploreProduct")}
        title={t("pricing.closingTitle")}
      />
    </MarketingPageShell>
  );
}
