"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowIcon,
  FinalCta,
  MarketingIcon,
  MarketingPageShell,
} from "@/components/Marketing/MarketingPageShell";
import {
  SharioFeatures,
  SharioSpaceTypes,
} from "@/components/Marketing/SharioMarketingSections";
import "./sharioHome.css";

export default function WorkingStudioHome() {
  const t = useTranslations("SharioMarketing");
  return (
    <MarketingPageShell>
      <section className="shario-hero shario-container" id="top">
        <div className="shario-hero-copy">
          <p className="shario-eyebrow">
            <span />
            {t("hero.eyebrow")}
          </p>
          <h1>
            {t("hero.title")} <span>{t("hero.highlight")}</span>
          </h1>
          <p className="shario-intro">{t("hero.description")}</p>
          <div className="shario-actions">
            <Link className="shario-button" href="/register">
              {t("hero.cta")}
              <ArrowIcon />
            </Link>
            <Link
              className="shario-button shario-button-secondary"
              href="/product"
            >
              {t("hero.secondary")}
              <ArrowIcon />
            </Link>
          </div>
          <p className="shario-footnote">{t("hero.note")}</p>
        </div>
        <div className="shario-hero-visual">
          <Image
            alt={t("hero.imageAlt")}
            className="shario-campaign"
            height={1024}
            width={1536}
            priority
            src="/brand/campaign-hero.webp"
          />
          <div className="shario-welcome-card">
            <span className="shario-welcome-icon">
              <MarketingIcon type="users" />
            </span>
            <div>
              <strong>{t("hero.cardTitle")}</strong>
              <p>{t("hero.cardText")}</p>
            </div>
            <span className="shario-welcome-dot" />
          </div>
        </div>
      </section>
      <section className="shario-audience" aria-label={t("spaces.eyebrow")}>
        <div className="shario-container">
          <p>{t("spaces.eyebrow")}</p>
          <div>
            {[
              "coworking",
              "creative",
              "rehearsal",
              "community",
              "workshops",
            ].map((key) => (
              <span key={key}>{t(`spaces.${key}.title`)}</span>
            ))}
          </div>
        </div>
      </section>
      <SharioFeatures />
      <section
        className="shario-container shario-website-section"
        id="website-preview"
      >
        <div className="shario-website-preview">
          <div className="shario-preview-bar">
            <span />
            <span />
            <span />
            <p>{t("website.example")}</p>
          </div>
          <div className="shario-example-site">
            <div className="shario-example-nav">
              <strong>{t("website.spaceName")}</strong>
              <span>{t("website.nav")}</span>
            </div>
            <div className="shario-example-content">
              <p>{t("website.previewEyebrow")}</p>
              <h3>{t("website.previewTitle")}</h3>
              <Image
                src="/brand/shared-space.webp"
                alt={t("website.imageAlt")}
                width={760}
                height={500}
              />
              <span className="shario-example-cta">
                {t("website.previewCta")}
              </span>
            </div>
          </div>
        </div>
        <div>
          <p className="shario-eyebrow">{t("website.eyebrow")}</p>
          <h2>{t("website.title")}</h2>
          <p className="shario-description">{t("website.description")}</p>
          <ul className="shario-checks">
            {["one", "two", "three"].map((key) => (
              <li key={key}>
                <span>✓</span>
                {t(`website.${key}`)}
              </li>
            ))}
          </ul>
          <Link className="shario-text-link" href="/product#your-website">
            {t("website.cta")}
            <ArrowIcon />
          </Link>
        </div>
      </section>
      <SharioSpaceTypes />
      <section className="shario-container shario-faq" id="faq">
        <div>
          <p className="shario-eyebrow">{t("faq.eyebrow")}</p>
          <h2>{t("faq.title")}</h2>
        </div>
        <div>
          {["one", "two", "three", "four"].map((key) => (
            <details key={key}>
              <summary>
                {t(`faq.${key}.question`)}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{t(`faq.${key}.answer`)}</p>
            </details>
          ))}
        </div>
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
