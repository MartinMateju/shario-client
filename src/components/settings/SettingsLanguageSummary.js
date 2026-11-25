"use client";

import { LanguageIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { getLocaleDefinition } from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";

export default function SettingsLanguageSummary() {
  const t = useTranslations("UnifiedSettings.language");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const canEdit = hasPermission(access, PERMISSIONS.WORKSPACE_UPDATE);
  const settings = tenant?.settings;
  const language =
    settings?.adminLanguage || settings?.defaultLanguage
      ? resolveWorkspaceRouteLocale(settings, routing.locales)
      : locale;
  const languageName =
    getLocaleDefinition(language)?.nativeName || language.toUpperCase();

  return (
    <div
      data-settings-language
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[14px] border border-[var(--studio-rule)] bg-[var(--studio-soft)] px-3 py-2.5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <LanguageIcon
          className="h-5 w-5 shrink-0 text-[var(--studio-blue)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[12px] leading-5 text-ink-muted">{t("label")}</p>
          <p className="text-[16px] leading-6 font-medium tracking-[-0.02em] text-ink">
            {languageName}
          </p>
        </div>
      </div>
      {canEdit ? (
        <Link
          href="/app/settings/general#workspace-language"
          className="inline-flex min-h-11 items-center rounded-lg px-1 text-[14px] font-medium text-[var(--studio-blue)] underline decoration-[var(--studio-blue-line)] underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-blue)]"
        >
          {t("change")}
        </Link>
      ) : null}
      <p className="basis-full text-[12px] leading-5 text-ink-muted">
        {t(canEdit ? "sharedScope" : "managedByAdmin")}
      </p>
    </div>
  );
}
