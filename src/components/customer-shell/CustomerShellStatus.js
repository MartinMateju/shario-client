"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function CustomerShellStatus({ kind = "loading", onRetry }) {
  const t = useTranslations("CustomerShell.status");
  const isError = kind === "error";
  const Icon = isError ? ExclamationTriangleIcon : ArrowPathIcon;

  return (
    <main className="flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center bg-[var(--tenant-background)] px-6 py-16">
      <section
        className="w-full max-w-lg rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-7 py-10 text-center shadow-[0_18px_60px_rgba(17,17,15,0.06)] sm:px-10"
        data-tenant-surface="panel"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_12%,var(--tenant-surface))] text-[var(--tenant-interactive-hover-on-surface)]">
          <Icon
            aria-hidden="true"
            className={isError ? "h-6 w-6" : "h-6 w-6 animate-spin"}
          />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--tenant-text-on-surface)]">
          {t(isError ? "errorTitle" : "loadingTitle")}
        </h1>
        <p
          className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]"
          role={isError ? "alert" : "status"}
        >
          {t(isError ? "errorDescription" : "loadingDescription")}
        </p>
        {isError && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            data-tenant-button="primary"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tenant-accent)] px-6 text-sm font-semibold text-[var(--tenant-accent-foreground)] transition"
          >
            {t("retry")}
          </button>
        ) : null}
      </section>
    </main>
  );
}
