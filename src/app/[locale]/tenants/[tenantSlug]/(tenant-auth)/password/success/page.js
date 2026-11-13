"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import {
  ArrowLongRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

import CustomerPasswordRecoveryShell from "@/components/auth/CustomerPasswordRecoveryShell";
import { Link } from "@/i18n/navigation";
import { clearTempCredentials } from "@/lib/features/pass/passSlice";
import { getSafeTenantNextPath } from "@/utils/tenantAuthRouting";
import { buildPlatformUrl } from "@/utils/tenantRouting";

const actionClassName =
  "group inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full border border-[var(--tenant-accent)] bg-[var(--tenant-accent)] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-foreground)] shadow-[0_14px_34px_rgba(25,26,24,0.14)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(25,26,24,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-page-label-color)]/20 focus-visible:ring-offset-2 motion-reduce:transform-none";

export default function PasswordResetSuccess() {
  const dispatch = useDispatch();
  const locale = useLocale();
  const copy = useLegacyCopy("passwordSuccess");
  const searchParams = useSearchParams();
  const nextPath = getSafeTenantNextPath(searchParams.get("next"), "/portal");
  const isPlatformSource = searchParams.get("source") === "platform";
  const platformLoginHref = buildPlatformUrl({ locale, pathname: "/login" });
  const customerLoginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    dispatch(clearTempCredentials());
  }, [dispatch]);

  const actionContent = (
    <>
      <span>{copy.action}</span>
      <ArrowLongRightIcon
        aria-hidden="true"
        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
      />
    </>
  );

  return (
    <CustomerPasswordRecoveryShell
      formDescription={copy.description}
      formEyebrow={copy.eyebrow}
      formTitle={copy.title}
      mode="recovery-success"
    >
      <div aria-labelledby="customer-auth-form-title" className="space-y-5">
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--tenant-accent)]/15 bg-[var(--tenant-accent)]/[0.055] px-4 py-3 text-sm text-[var(--tenant-auth-form-text)]">
          <CheckCircleIcon
            aria-hidden="true"
            className="h-6 w-6 shrink-0 text-[var(--tenant-accent-link)]"
          />
          <p>{copy.status}</p>
        </div>

        {isPlatformSource ? (
          <a
            className={actionClassName}
            data-tenant-button="primary"
            href={platformLoginHref}
          >
            {actionContent}
          </a>
        ) : (
          <Link
            className={actionClassName}
            data-tenant-button="primary"
            href={customerLoginHref}
          >
            {actionContent}
          </Link>
        )}
      </div>
    </CustomerPasswordRecoveryShell>
  );
}
