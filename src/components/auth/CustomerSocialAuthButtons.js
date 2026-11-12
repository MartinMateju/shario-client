"use client";

import { useTranslations } from "next-intl";

import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { useGetCustomerSocialProvidersQuery } from "@/lib/features/auth/authApiSlice";
import {
  buildCustomerSocialStartUrl,
  shouldQueryCustomerSocialProviders,
} from "@/utils/tenantAuthRouting";

const providerIcons = {
  google: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9Z"
      />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.1 12.5c0-2.3 1.9-3.4 2-3.5a4.4 4.4 0 0 0-3.5-1.9c-1.5-.1-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.9A4.6 4.6 0 0 0 5 9.5c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.8 1.3-2.9-.1 0-2.9-1.1-2.9-3.9ZM14.6 5.6c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.7-3.2 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.5Z"
      />
    </svg>
  ),
};

function Divider({ children, compact = false }) {
  return (
    <div
      className={
        compact
          ? "my-3 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em]"
          : "my-6 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em]"
      }
      data-social-auth-divider
      style={{
        color: "var(--tenant-page-label-color, var(--tenant-auth-form-label))",
      }}
    >
      <span className="h-px flex-1 bg-[var(--tenant-page-label-color)]/20" />
      {children}
      <span className="h-px flex-1 bg-[var(--tenant-page-label-color)]/20" />
    </div>
  );
}

export default function CustomerSocialAuthButtons({
  tenantSlug,
  locale,
  nextPath = "",
  className = "",
  variant = "default",
}) {
  const t = useTranslations("CustomerAuth.social");
  const publicTenantContext = useOptionalPublicTenant();
  const shouldQueryProviders = shouldQueryCustomerSocialProviders({
    tenantSlug,
    degraded: publicTenantContext?.degraded,
  });
  const { data: providers = [] } = useGetCustomerSocialProvidersQuery(
    { tenantSlug },
    {
      skip: !shouldQueryProviders,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  );

  if (!providers.length) return null;

  const compact = variant === "compact";
  const compactColumns = compact && providers.length > 1;
  const start = (provider) => {
    const href = buildCustomerSocialStartUrl({
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
      provider,
      tenantSlug,
      locale,
      nextPath,
      returnOrigin: window.location.origin,
    });

    if (href) window.location.assign(href);
  };

  return (
    <section
      className={className}
      aria-label={t("label")}
      data-social-auth-variant={compact ? "compact" : "default"}
    >
      {compact ? <Divider compact>{t("or")}</Divider> : null}

      {!compact ? (
        <div className="mb-4">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            data-tenant-type="eyebrow"
            style={{
              color:
                "var(--tenant-page-label-color, var(--tenant-auth-form-label))",
            }}
          >
            {t("customerAccess")}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--tenant-auth-form-muted)]">
            {t("teamPasswordNote")}
          </p>
        </div>
      ) : null}

      <div
        className={
          compactColumns
            ? "grid gap-2.5 sm:grid-cols-2"
            : compact
              ? "grid gap-2.5"
              : "grid gap-3"
        }
      >
        {providers.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => start(provider)}
            data-tenant-button="secondary"
            className={`inline-flex w-full items-center justify-center gap-3 rounded-full border border-[color-mix(in_srgb,var(--tenant-auth-form-text)_16%,transparent)] bg-[var(--tenant-auth-form-surface)] text-sm font-semibold text-[var(--tenant-auth-form-text)] shadow-[0_8px_22px_rgba(25,26,24,0.04)] transition duration-200 hover:-translate-y-px hover:border-[var(--tenant-page-label-color)]/45 hover:bg-[color-mix(in_srgb,var(--tenant-auth-form-surface)_92%,var(--tenant-auth-form-text)_8%)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-page-label-color)]/15 motion-reduce:transform-none ${
              compact ? "min-h-12 px-4" : "min-h-[52px] px-5"
            }`}
          >
            {providerIcons[provider]}
            {t(`continueWith.${provider}`)}
          </button>
        ))}
      </div>

      {!compact ? <Divider>{t("or")}</Divider> : null}
    </section>
  );
}
