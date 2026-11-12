"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowIcon, MarketingIcon } from "./MarketingPageShell";

export const SHARIO_FEATURES = [
  ["bookings", "calendar", "blue"],
  ["memberships", "users", "aqua"],
  ["website", "layers", "lilac"],
  ["payments", "flow", "coral"],
  ["resources", "layers", "sunshine"],
  ["communication", "users", "lilac"],
  ["team", "shield", "aqua"],
  ["insights", "chart", "blue"],
];

export function SharioFeatures() {
  const t = useTranslations("SharioMarketing");
  return (
    <section className="shario-container shario-features" id="features">
      <div className="shario-section-heading">
        <p className="shario-eyebrow">{t("features.eyebrow")}</p>
        <h2>{t("features.title")}</h2>
        <p className="shario-description">{t("features.description")}</p>
      </div>
      <div className="shario-feature-grid">
        {SHARIO_FEATURES.map(([key, icon, color]) => (
          <article
            className="shario-feature"
            key={key}
            id={
              key === "website"
                ? "your-website"
                : key === "bookings"
                  ? "bookings-payments"
                  : key === "resources"
                    ? "operations-production"
                    : key === "insights"
                      ? "analytics-decisions"
                      : undefined
            }
          >
            <span className={`shario-feature-icon shario-tone-${color}`}>
              <MarketingIcon type={icon} />
            </span>
            <h3>{t(`features.${key}.title`)}</h3>
            <p>{t(`features.${key}.description`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SharioSpaceTypes() {
  const t = useTranslations("SharioMarketing");
  return (
    <section className="shario-spaces">
      <div className="shario-container">
        <div className="shario-section-heading">
          <p className="shario-eyebrow">{t("spaces.eyebrow")}</p>
          <h2>{t("spaces.title")}</h2>
          <p className="shario-description">{t("spaces.description")}</p>
        </div>
        <div className="shario-space-grid">
          {["coworking", "creative", "rehearsal", "community", "workshops"].map(
            (key, index) => (
              <article id={key} key={key}>
                <span
                  className={`shario-space-shape shario-tone-${["blue", "coral", "lilac", "aqua", "sunshine"][index]}`}
                  aria-hidden="true"
                >
                  <MarketingIcon
                    type={
                      ["layers", "spark", "flow", "users", "calendar"][index]
                    }
                  />
                </span>
                <h3>{t(`spaces.${key}.title`)}</h3>
                <p>{t(`spaces.${key}.description`)}</p>
              </article>
            ),
          )}
        </div>
        <Link className="shario-text-link" href="/register">
          {t("spaces.cta")}
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}
