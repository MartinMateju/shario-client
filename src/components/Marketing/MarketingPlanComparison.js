"use client";

import { useFormatter, useTranslations } from "next-intl";

import {
  MARKETING_COMPARISON_PLANS,
  MARKETING_PLAN_COMPARISON_ROWS,
} from "@/config/marketingPlanComparison";
import { PlanDefinitions } from "./PricingDetails";

export default function MarketingPlanComparison() {
  const t = useTranslations("MarketingPlanComparison");
  const pricing = useTranslations("MarketingHome.pricing");
  const format = useFormatter();
  const formatValue = (value) => {
    if (typeof value === "number") return format.number(value);
    if (typeof value === "boolean") {
      return t(value ? "values.included" : "values.notIncluded");
    }
    return t(`values.${value}`);
  };

  return (
    <section
      className="mt-16 scroll-mt-28 border-t border-[var(--studio-rule)] pt-12"
      id="compare-plans"
      aria-labelledby="plan-comparison-title"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-clay)]">
        {t("eyebrow")}
      </p>
      <h2
        className="mt-3 text-3xl font-medium tracking-[-0.05em] text-[var(--studio-ink)] sm:text-4xl"
        id="plan-comparison-title"
      >
        {t("title")}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--studio-muted)]">
        {t("description")}
      </p>
      <p className="mt-5 max-w-4xl text-sm leading-7 text-[var(--studio-ink)]">
        {t("shared")}
      </p>

      <p className="mt-4 text-xs leading-6 text-[var(--studio-muted)] sm:hidden">
        {t("scrollLabel")}
      </p>
      <div
        className="mt-7 overflow-x-auto rounded-[4px] border border-[var(--studio-rule)] bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-blue)]"
        role="region"
        aria-label={t("scrollLabel")}
        tabIndex={0}
      >
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead className="bg-[var(--studio-soft)] text-[var(--studio-ink)]">
            <tr>
              <th
                scope="col"
                className="w-[40%] px-5 py-5 text-left font-medium"
              >
                {t("feature")}
              </th>
              {MARKETING_COMPARISON_PLANS.map((plan) => (
                <th
                  className="px-4 py-5 text-center font-medium"
                  scope="col"
                  key={plan}
                >
                  {pricing(`${plan}.name`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MARKETING_PLAN_COMPARISON_ROWS.map((row) => (
              <tr
                className="border-t border-[var(--studio-rule)] even:bg-[var(--studio-white)]"
                key={row.key}
              >
                <th
                  className="px-5 py-4 text-left font-normal leading-6 text-[var(--studio-ink)]"
                  scope="row"
                >
                  {t(`rows.${row.key}`)}
                </th>
                {row.values.map((value, index) => (
                  <td
                    className="px-4 py-4 text-center leading-6 text-[var(--studio-muted)]"
                    key={MARKETING_COMPARISON_PLANS[index]}
                  >
                    {formatValue(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 text-xs leading-6 text-[var(--studio-muted)]">
        <p>{t("trialNote")}</p>
        <p>{t("usageNote")}</p>
        <p>{t("accessNote")}</p>
      </div>

      <PlanDefinitions />

      <aside className="mt-8 rounded-[4px] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <h3 className="text-lg font-medium tracking-[-0.03em] text-[var(--studio-ink)]">
            {t("enterpriseTitle")}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--studio-muted)]">
            {t("enterpriseDescription")}
          </p>
        </div>
        <a
          className="mt-5 inline-flex min-h-12 shrink-0 items-center justify-center rounded-[4px] border border-[var(--studio-rule)] bg-white px-5 text-sm font-medium text-[var(--studio-ink)] transition hover:border-[var(--studio-blue)] hover:text-[var(--studio-blue)] sm:mt-0"
          href="mailto:hello@shario.io?subject=shario.io%20Enterprise"
        >
          {t("enterpriseCta")}
        </a>
      </aside>
    </section>
  );
}
