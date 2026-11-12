"use client";

import { useTranslations } from "next-intl";
import {
  FinalCta,
  MarketingHero,
  MarketingPageShell,
  SignalPanel,
} from "./MarketingPageShell";
import { SharioFeatures } from "./SharioMarketingSections";
import "@/components/Home/sharioHome.css";

export default function ProductMarketingPage() {
  const t = useTranslations("SharioMarketing");
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow={t("product.eyebrow")}
        title={t("product.title")}
        description={t("product.description")}
        secondaryHref="/pricing"
        secondaryLabel={t("closing.secondary")}
        aside={
          <SignalPanel
            eyebrow={t("product.panelEyebrow")}
            title={t("product.panelTitle")}
            items={["bookings", "memberships", "website", "team"].map(
              (key, index) => ({
                icon: ["calendar", "users", "layers", "shield"][index],
                title: t(`features.${key}.title`),
                description: t(`features.${key}.description`),
              }),
            )}
          />
        }
      />
      <SharioFeatures />
      <section
        className="shario-container shario-self-service"
        id="self-service"
      >
        <p className="shario-eyebrow">{t("access.eyebrow")}</p>
        <h2>{t("access.title")}</h2>
        <p className="shario-description">{t("access.description")}</p>
      </section>
      <FinalCta
        title={t("closing.title")}
        description={t("closing.description")}
        secondaryHref="/for-studios"
        secondaryLabel={t("product.solutions")}
      />
    </MarketingPageShell>
  );
}
