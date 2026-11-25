"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./pricingDetails.module.css";

const BUYING_QUESTIONS = [
  "trial",
  "cancellation",
  "refunds",
  "planChanges",
  "payments",
];
const PLAN_DEFINITIONS = [
  "automations",
  "studioAi",
  "aiCredits",
  "emails",
];

export function PricingFeeNote() {
  const t = useTranslations("PricingDetails");

  return (
    <div className={styles.feeNote}>
      <p>{t("feeNote")}</p>
      <a className={styles.link} href="#buying-questions">
        {t("feeLink")}
      </a>
    </div>
  );
}

export function PricingBuyerFaq() {
  const t = useTranslations("PricingDetails");

  return (
    <section
      aria-labelledby="buying-questions-title"
      className={styles.section}
      id="buying-questions"
    >
      <div className={styles.heading}>
        <h2 id="buying-questions-title">{t("faq.title")}</h2>
        <p>{t("faq.description")}</p>
      </div>
      <div className={styles.questions}>
        {BUYING_QUESTIONS.map((key) => (
          <details key={key}>
            <summary>{t(`faq.${key}.question`)}</summary>
            <div className={styles.answer}>
              <p>{t(`faq.${key}.answer`)}</p>
              {key === "payments" ? (
                <a className={styles.link} href="https://stripe.com/pricing">
                  {t("links.stripePricing")}
                </a>
              ) : null}
              {key === "refunds" ? (
                <>
                  <Link
                    className={styles.link}
                    href="/terms#cancellation-and-refunds"
                  >
                    {t("links.refundTerms")}
                  </Link>
                  <a
                    className={styles.link}
                    href="mailto:hello@shario.io?subject=Subscription%20refund"
                  >
                    {t("links.refundContact")}
                  </a>
                </>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PlanDefinitions() {
  const t = useTranslations("PricingDetails");

  return (
    <section
      aria-labelledby="plan-definitions-title"
      className={styles.definitions}
      id="plan-definitions"
    >
      <div className={styles.heading}>
        <h3 id="plan-definitions-title">{t("definitions.title")}</h3>
      </div>
      <div className={styles.questions}>
        {PLAN_DEFINITIONS.map((key) => (
          <details key={key}>
            <summary>{t(`definitions.${key}.question`)}</summary>
            <div className={styles.answer}>
              <p>{t(`definitions.${key}.answer`)}</p>
              {key === "studioAi" ? (
                <Link className={styles.link} href="/studio-ai">
                  {t("links.studioAi")}
                </Link>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
