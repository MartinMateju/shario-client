"use client";

import { useTranslations } from "next-intl";
import styles from "./onboarding.module.css";

export function StepHeading() {
  const t = useTranslations("Onboarding");

  return (
    <>
      <h1 className={`${styles.heading} mt-2`} id="onboarding-title">
        {t.rich("headings.title", {
          br: () => <br />,
          accent: (chunks) => <em>{chunks}</em>,
        })}
      </h1>
      <p
        className={`${styles.muted} mt-3 max-w-xl text-sm leading-6 [@media(max-height:800px)]:hidden`}
      >
        {t("headings.description")}
      </p>
    </>
  );
}
