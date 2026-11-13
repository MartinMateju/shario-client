"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { Link } from "@/i18n/navigation";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import {
  useRefreshMutation,
  useResendCustomerEmailVerificationMutation,
  useVerifyCustomerEmailMutation,
} from "@/lib/features/auth/authApiSlice";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { getSafeTenantNextPath } from "@/utils/tenantAuthRouting";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import { getUserAccess } from "@/utils/user-profile.utils";

const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{8,4096}$/;

export default function VerifyEmailPage() {
  const t = useTranslations("EmailVerification");
  const locale = useLocale();
  const verificationLocale = resolveRolloutEligibleLocaleCode(locale);
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const tokenCandidate = String(searchParams.get("token") || "").trim();
  const token = VERIFICATION_TOKEN_PATTERN.test(tokenCandidate)
    ? tokenCandidate
    : "";
  const email = String(searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  const requestedNext = getSafeTenantNextPath(
    searchParams.get("next"),
    "/portal",
  );
  const [verify, verifyState] = useVerifyCustomerEmailMutation();
  const [refresh] = useRefreshMutation();
  const [resend, resendState] = useResendCustomerEmailVerificationMutation();
  const [status, setStatus] = useState(token ? "verifying" : "sent");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState(requestedNext);
  const [resendCooldown, setResendCooldown] = useState(0);
  const attemptedToken = useRef("");
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const userAccess = getUserAccess(currentUser, workspaceAccess);
  const authenticatedTenantSlug = String(currentTenant?.slug || "")
    .trim()
    .toLowerCase();
  const canContinueDirectly =
    isAuthenticated &&
    authenticatedTenantSlug === tenantSlug &&
    userAccess.isEndCustomer;

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;

    const verifyToken = async () => {
      try {
        const response = await verify({ tenantSlug, token }).unwrap();
        setNextPath(getSafeTenantNextPath(response?.next, requestedNext));
        if (isAuthenticated) {
          try {
            await refresh().unwrap();
          } catch {
            // Verification succeeded. A fresh sign-in remains available below.
          }
        }
        setStatus("verified");
      } catch (error) {
        setMessage(getLocalizedApiErrorMessage(error, t("error.description")));
        setStatus("error");
      }
    };

    void verifyToken();
  }, [isAuthenticated, refresh, requestedNext, t, tenantSlug, token, verify]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timeout = window.setTimeout(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  const resendEmail = async () => {
    if (!email || resendState.isLoading || resendCooldown > 0) return;
    setMessage("");
    try {
      await resend({
        tenantSlug,
        email,
        next: requestedNext,
        locale: verificationLocale,
      }).unwrap();
      setResendCooldown(30);
      setStatus("sent");
      setMessage(t("sent.again"));
    } catch (error) {
      setMessage(getLocalizedApiErrorMessage(error, t("resend.error")));
    }
  };

  const stateConfig = {
    verifying: {
      icon: ArrowPathIcon,
      title: t("verifying.title"),
      description: t("verifying.description"),
      spin: true,
    },
    verified: {
      icon: CheckCircleIcon,
      title: t("verified.title"),
      description: t("verified.description"),
    },
    error: {
      icon: ExclamationTriangleIcon,
      title: t("error.title"),
      description: message || t("error.description"),
    },
    sent: {
      icon: EnvelopeIcon,
      title: t("sent.title"),
      description: t("sent.description"),
    },
  }[status];
  const Icon = stateConfig.icon;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const verifiedHref = canContinueDirectly ? nextPath : loginHref;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--tenant-background)] px-4 py-14 text-[var(--tenant-text)]">
      <section
        className="w-full max-w-lg rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-auth-form-surface,var(--tenant-surface))] px-6 py-10 text-center shadow-[0_20px_60px_rgba(15,17,19,0.08)] sm:px-9"
        data-auth-form-panel
        data-tenant-surface="panel"
      >
        <Icon
          className={`mx-auto h-12 w-12 text-[var(--tenant-auth-form-secondary,var(--tenant-interactive-hover))] ${
            stateConfig.spin ? "animate-spin" : ""
          }`}
        />
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-[var(--tenant-auth-form-text,var(--tenant-text))]">
          {stateConfig.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--tenant-auth-form-muted,var(--tenant-muted-text))]">
          {stateConfig.description}
        </p>
        {email && status !== "verified" ? (
          <p className="mt-2 break-all text-xs font-semibold text-[var(--tenant-auth-form-text,var(--tenant-text))]">
            {email}
          </p>
        ) : null}
        {message && status === "sent" ? (
          <p className="mt-4 text-xs text-emerald-700" role="status">
            {message}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3">
          {status === "verified" ? (
            <Link
              href={verifiedHref}
              data-tenant-button="primary"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--tenant-accent)] bg-[var(--tenant-accent)] px-6 text-sm font-semibold text-[var(--tenant-accent-foreground)] transition"
            >
              {t(canContinueDirectly ? "verified.continue" : "verified.signIn")}
            </Link>
          ) : null}
          {email && status !== "verifying" && status !== "verified" ? (
            <button
              type="button"
              onClick={resendEmail}
              disabled={resendState.isLoading || resendCooldown > 0}
              data-tenant-button="secondary"
              className="min-h-12 rounded-full border border-[color-mix(in_srgb,var(--tenant-auth-form-text)_22%,transparent)] bg-transparent px-6 text-sm font-semibold text-[var(--tenant-auth-form-text,var(--tenant-text))] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendState.isLoading
                ? t("resend.sending")
                : resendCooldown > 0
                  ? t("resend.wait", { seconds: resendCooldown })
                  : t("resend.action")}
            </button>
          ) : null}
          {status === "error" && !email ? (
            <Link
              href={loginHref}
              data-tenant-button="primary"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--tenant-accent)] bg-[var(--tenant-accent)] px-6 text-sm font-semibold text-[var(--tenant-accent-foreground)] transition"
            >
              {t("error.back")}
            </Link>
          ) : null}
        </div>

        {verifyState.isLoading ? (
          <p className="sr-only" role="status">
            {t("verifying.description")}
          </p>
        ) : null}
      </section>
    </main>
  );
}
