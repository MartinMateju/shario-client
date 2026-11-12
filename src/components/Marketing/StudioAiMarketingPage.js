"use client";

import { useTranslations } from "next-intl";
import {
  FinalCta,
  MarketingHero,
  MarketingPageShell,
  SignalPanel,
} from "./MarketingPageShell";
import "@/components/Home/sharioHome.css";

export default function StudioAiMarketingPage() {
  const t = useTranslations("SharioMarketing");
  const items = ["context", "drafts", "control"].map((key, index) => ({
    icon: ["layers", "spark", "shield"][index],
    title: t(`ai.${key}.title`),
    description: t(`ai.${key}.description`),
  }));
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow={t("ai.eyebrow")}
        title={t("ai.title")}
        description={t("ai.description")}
        secondaryHref="/product"
        secondaryLabel={t("hero.secondary")}
        aside={
          <SignalPanel
            eyebrow={t("ai.panelEyebrow")}
            title={t("ai.panelTitle")}
            items={items}
            tone="dark"
          />
        }
      />
      <section className="shario-container shario-self-service">
        <p className="shario-eyebrow">{t("ai.control.title")}</p>
        <h2>{t("ai.control.heading")}</h2>
        <p className="shario-description">{t("ai.control.description")}</p>
      </section>
      <FinalCta
        title={t("closing.title")}
        description={t("closing.description")}
        secondaryHref="/pricing"
        secondaryLabel={t("closing.secondary")}
      />
    </MarketingPageShell>
  );
}
