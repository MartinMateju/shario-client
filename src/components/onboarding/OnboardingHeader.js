"use client";

import { useTranslations } from "next-intl";

import { PLATFORM_AUTH_HEADER_HEIGHT } from "@/components/auth/platformAuthLayout";
import authLayoutStyles from "@/components/auth/platformAuthLayout.module.css";
import Brand from "@/components/headers/Brand";
import LanguageSelector from "@/components/headers/LanguageSelector";
import { routing } from "@/i18n/routing";
import styles from "./onboarding.module.css";

function SetupActions({ onExit, mobile = false }) {
  const t = useTranslations("Onboarding");

  return (
    <div
      className={
        mobile
          ? "pointer-events-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 sm:gap-3"
          : "pointer-events-auto flex min-w-0 items-center justify-end gap-3"
      }
      data-onboarding-actions
    >
      <div className={mobile ? "hidden sm:block" : undefined}>
        <LanguageSelector
          contextLabel="shario.io"
          hideWhenSingle
          localeCodes={routing.locales}
        />
      </div>

      <button
        className={`${styles.exit} inline-flex shrink-0 items-center justify-center`}
        onClick={onExit}
        type="button"
      >
        {t("header.exit")}
      </button>
    </div>
  );
}

export function OnboardingHeader({ onExit }) {
  const t = useTranslations("Onboarding");

  return (
    <header
      className={`${authLayoutStyles.header} ${styles.header} pointer-events-none absolute inset-x-0 top-0 z-50 w-full bg-transparent`}
      data-onboarding-header
      style={{
        height: PLATFORM_AUTH_HEADER_HEIGHT,
        minHeight: PLATFORM_AUTH_HEADER_HEIGHT,
      }}
    >
      <div className="grid h-full min-w-0 grid-cols-1 xl:grid-cols-2">
        <div
          className="flex min-w-0 flex-col px-5 sm:flex-row sm:items-center sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
          data-onboarding-left-chrome
        >
          <div className="flex min-h-14 shrink-0 items-center justify-between sm:min-h-0">
            <div className="pointer-events-auto" data-onboarding-brand>
              <Brand href="/" />
            </div>

            <div className="pointer-events-auto sm:hidden">
              <LanguageSelector
                contextLabel="shario.io"
                hideWhenSingle
                localeCodes={routing.locales}
                variant="compact"
              />
            </div>
          </div>

          <div className="pointer-events-auto hidden min-w-0 items-center gap-4 sm:ml-4 sm:flex">
            <span
              aria-hidden="true"
              className="h-5 w-px bg-[var(--studio-rule)]"
            />
            <span
              className={`${styles.muted} truncate text-[11px] font-medium uppercase tracking-[0.1em]`}
            >
              {t("header.studioSetup")}
            </span>
          </div>

          <div className="flex min-h-14 min-w-0 items-center sm:ml-auto sm:min-h-0 xl:hidden">
            <span
              className={`${styles.muted} mr-auto truncate text-[10px] font-medium uppercase tracking-[0.1em] sm:hidden`}
            >
              {t("header.studioSetup")}
            </span>
            <SetupActions mobile onExit={onExit} />
          </div>
        </div>

        <div className="hidden min-w-0 items-center justify-end px-12 xl:flex 2xl:px-14">
          <SetupActions onExit={onExit} />
        </div>
      </div>
    </header>
  );
}
