"use client";

import {
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { PLATFORM_AUTH_VIEWPORT_HEIGHT } from "@/components/auth/platformAuthLayout";
import authLayoutStyles from "@/components/auth/platformAuthLayout.module.css";
import styles from "./onboarding.module.css";

const BENEFITS = [
  [AdjustmentsHorizontalIcon, "defaults"],
  [ArrowTopRightOnSquareIcon, "realWorkspace"],
  [SparklesIcon, "adaptive"],
];

export function OnboardingSidebar() {
  const t = useTranslations("Onboarding");

  return (
    <aside
      aria-label={t("sidebar.eyebrow")}
      className={`${authLayoutStyles.fullHeightPanel} ${styles.sidebar} relative hidden self-start overflow-hidden border-l xl:sticky xl:top-0 xl:block`}
      data-platform-auth-full-height
      data-platform-auth-right
      data-onboarding-visual
      data-onboarding-right
      style={{
        height: PLATFORM_AUTH_VIEWPORT_HEIGHT,
        minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT,
      }}
    >
      <div
        className="absolute inset-0 z-10 flex flex-col justify-between p-9 xl:p-12 [@media(max-height:800px)]:p-6"
        style={{
          paddingTop:
            "calc(var(--platform-auth-header-height, 4.5rem) + clamp(1.5rem, 4vh, 3rem))",
        }}
      >
        <div className="max-w-[510px]" data-onboarding-story>
          <p className={styles.eyebrow}>{t("sidebar.eyebrow")}</p>
          <h2 className={`${styles.sidebarHeading} mt-4`}>
            {t("sidebar.titleBefore")} <em>{t("sidebar.titleAccent")}</em>
          </h2>
          <p
            className={`${styles.muted} mt-4 max-w-[460px] text-base leading-7 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:text-sm [@media(max-height:800px)]:leading-6 [@media(max-height:650px)]:hidden`}
          >
            {t("sidebar.description")}
          </p>
        </div>

        <div
          className={`${styles.preview} ml-auto p-5 xl:p-6 [@media(max-height:800px)]:p-4`}
          data-platform-auth-story-card
          data-onboarding-preview
        >
          <div
            className={`${styles.rule} flex items-center gap-3 border-b pb-4`}
          >
            <span
              className={`${styles.previewIcon} grid size-10 shrink-0 place-items-center`}
            >
              <CheckIcon aria-hidden="true" className="size-5 stroke-2" />
            </span>
            <div>
              <p
                className={`${styles.muted} text-[10px] font-medium uppercase tracking-[0.1em]`}
              >
                {t("sidebar.cardLabel")}
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {t("sidebar.cardTitle")}
              </p>
            </div>
          </div>

          <ul className="mt-3" role="list">
            {BENEFITS.map(([Icon, key]) => (
              <li
                className={`${styles.rule} flex items-start gap-3 border-b py-3 last:border-b-0 last:pb-0 [@media(max-height:800px)]:py-2.5 [@media(max-height:650px)]:items-center [@media(max-height:650px)]:py-2`}
                key={key}
              >
                <span
                  className={`${styles.benefitIcon} grid size-8 shrink-0 place-items-center`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-xs font-medium">
                    {t(`sidebar.benefits.${key}.title`)}
                  </strong>
                  <small
                    className={`${styles.muted} mt-0.5 block text-[11px] leading-4 [@media(max-height:650px)]:hidden`}
                  >
                    {t(`sidebar.benefits.${key}.description`)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
