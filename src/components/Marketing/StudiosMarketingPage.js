"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  FinalCta,
  MarketingHero,
  MarketingPageShell,
} from "./MarketingPageShell";
import { SharioSpaceTypes } from "./SharioMarketingSections";
import "@/components/Home/sharioHome.css";

export default function StudiosMarketingPage() {
  const t = useTranslations("SharioMarketing");
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow={t("spaces.eyebrow")}
        title={t("spaces.title")}
        description={t("spaces.description")}
        secondaryHref="/product"
        secondaryLabel={t("hero.secondary")}
        aside={
          <Image
            className="shario-spaces-photo"
            src="/brand/shared-space.webp"
            width={760}
            height={600}
            alt={t("website.imageAlt")}
            priority
          />
        }
      />
      <SharioSpaceTypes />
      <FinalCta
        title={t("closing.title")}
        description={t("closing.description")}
        secondaryHref="/pricing"
        secondaryLabel={t("closing.secondary")}
      />
    </MarketingPageShell>
  );
}
