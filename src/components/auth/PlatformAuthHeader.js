"use client";

import { useTranslations } from "next-intl";

import { PLATFORM_AUTH_HEADER_HEIGHT } from "@/components/auth/platformAuthLayout";
import Brand from "@/components/headers/Brand";
import LanguageSelector from "@/components/headers/LanguageSelector";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/publicStudioTheme.css";
import styles from "./platformAuthLayout.module.css";

const actionClassName =
  "inline-flex min-h-11 max-w-[72%] shrink-0 items-center justify-center rounded-[var(--studio-action-radius)] border border-[var(--studio-blue)] bg-[var(--studio-blue)] px-5 py-2 text-center text-sm font-medium leading-5 text-[var(--studio-white)] shadow-[var(--studio-action-shadow)] transition-colors hover:bg-[var(--studio-blue-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-blue)]";

function AuthActions({ actionHref, actionLabel, prompt, mobile = false }) {
  return (
    <div
      className={
        mobile
          ? "pointer-events-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 sm:gap-3"
          : "pointer-events-auto flex min-w-0 items-center justify-end gap-3"
      }
      data-platform-auth-actions
    >
      <div className={mobile ? "hidden sm:block" : undefined}>
        <LanguageSelector
          contextLabel="shario.io"
          hideWhenSingle
          localeCodes={routing.locales}
        />
      </div>

      <span
        className="min-w-0 text-right text-xs leading-5 text-[var(--studio-muted)]"
        data-platform-auth-prompt
      >
        {prompt}
      </span>

      <Link
        className={actionClassName}
        data-platform-auth-cross-link
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export default function PlatformAuthHeader({ mode = "login" }) {
  const isRegister = mode === "register";
  const t = useTranslations(
    `PlatformAuth.${isRegister ? "register" : "login"}.header`,
  );
  const actionHref = isRegister ? "/login" : "/register";
  const actionLabel = t(isRegister ? "signIn" : "createWorkspace");
  const prompt = t(isRegister ? "alreadyHaveWorkspace" : "newToSkab");

  return (
    <header
      className={`${styles.header} pointer-events-none absolute inset-x-0 top-0 z-50 w-full bg-transparent`}
      data-skab-public-surface
      data-platform-auth-header
      style={{
        height: PLATFORM_AUTH_HEADER_HEIGHT,
        minHeight: PLATFORM_AUTH_HEADER_HEIGHT,
      }}
    >
      <div className="grid h-full min-w-0 grid-cols-1 xl:grid-cols-2">
        <div
          className="flex min-w-0 flex-col px-5 sm:flex-row sm:items-center sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
          data-platform-auth-left-chrome
        >
          <div
            className="flex min-h-14 shrink-0 items-center justify-between sm:min-h-0"
            data-platform-auth-brand
          >
            <div className="pointer-events-auto">
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

          <div className="flex min-h-14 min-w-0 items-center sm:ml-auto sm:min-h-0 xl:hidden">
            <AuthActions
              actionHref={actionHref}
              actionLabel={actionLabel}
              mobile
              prompt={prompt}
            />
          </div>
        </div>

        <div className="hidden min-w-0 items-center justify-end px-12 xl:flex 2xl:px-14">
          <AuthActions
            actionHref={actionHref}
            actionLabel={actionLabel}
            prompt={prompt}
          />
        </div>
      </div>
    </header>
  );
}
