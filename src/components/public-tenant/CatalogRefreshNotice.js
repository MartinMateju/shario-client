"use client";

import { useTranslations } from "next-intl";

export default function CatalogRefreshNotice({ onRetry }) {
  const t = useTranslations("PublicTenant.catalog");
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <p role="status">{t("refreshError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 font-semibold underline underline-offset-4 focus-visible:outline-offset-4"
      >
        {t("retry")}
      </button>
    </div>
  );
}
