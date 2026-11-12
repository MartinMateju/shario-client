"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import LanguageSelector from "@/components/headers/LanguageSelector";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantLocaleCodes } from "@/components/public-tenant/publicTenant.config";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function CustomerAuthControls() {
  const t = useTranslations("CustomerShell");
  const { tenant } = usePublicTenant();
  const tenantLanguageCodes = getPublicTenantLocaleCodes(
    tenant?.settings,
    routing.locales,
  );
  const tenantDisplayName =
    tenant?.publicSite?.branding?.displayName || tenant?.name || "";

  return (
    <nav
      aria-label={t("actions.backToStudio")}
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] sm:top-5 lg:top-6"
      data-customer-auth-controls
    >
      <div
        className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-2 px-3 sm:px-5 lg:px-6"
        data-customer-auth-controls-inner
      >
        <Link
          href="/"
          className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/[0.92] px-3 text-xs font-semibold text-[#292925] shadow-[0_10px_30px_rgba(17,17,15,0.10)] backdrop-blur-xl transition hover:-translate-y-px hover:border-[var(--tenant-accent)]/30 hover:text-[var(--tenant-accent-link)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-accent)]/20 motion-reduce:transform-none sm:px-4 sm:text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="max-[359px]:sr-only">
            {t("actions.backToStudio")}
          </span>
        </Link>

        <div
          className="pointer-events-auto rounded-full border border-black/[0.08] bg-white/[0.92] px-1 shadow-[0_10px_30px_rgba(17,17,15,0.10)] backdrop-blur-xl [&_button]:min-h-11 [&_button]:rounded-full [&_button]:px-2.5"
          data-customer-auth-language
        >
          <LanguageSelector
            contextLabel={tenantDisplayName || undefined}
            hideWhenSingle
            localeCodes={tenantLanguageCodes}
            tenantThemed
          />
        </div>
      </div>
    </nav>
  );
}
