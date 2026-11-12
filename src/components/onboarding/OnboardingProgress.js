"use client";

import { useTranslations } from "next-intl";
import styles from "./onboarding.module.css";

export function OnboardingProgress({ currentStep, totalSteps }) {
  const t = useTranslations("Onboarding");
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="my-7 flex items-center gap-5">
      <strong className="whitespace-nowrap text-sm font-medium">
        {t("progress.step", { current: currentStep, total: totalSteps })}
      </strong>
      <div
        role="progressbar"
        aria-label={t("progress.label")}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        className={`${styles.progressTrack} h-1 flex-1 overflow-hidden`}
      >
        <div
          className={`${styles.progressFill} h-full transition-[width] duration-300 ease-out motion-reduce:transition-none`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
