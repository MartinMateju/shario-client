"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Link } from "@/i18n/navigation";
import { buildTenantUrl } from "@/utils/tenantRouting";
import { useLoginMutation } from "@/lib/features/auth/authApiSlice";
import { selectIsSessionReady } from "@/lib/features/auth/authSlice";
import {
  useAcceptTeamInvitationMutation,
  usePreviewTeamInvitationMutation,
} from "@/lib/features/workspace-access/teamInvitationsApiSlice";
import { getPostLoginUrl } from "./platformAuthRouting";

function InvitationForm({ token, invitation, onPasswordReady }) {
  const t = useTranslations("TeamInvitation");
  const accountT = useTranslations("AccountSettings");
  const registerT = useTranslations("PlatformAuth.register");
  const loginT = useTranslations("PlatformAuth.login");
  const teamT = useTranslations("TeamSettings");
  const locale = useLocale();
  const sessionReady = useSelector(selectIsSessionReady);
  const [accept, { isLoading: isAccepting }] =
    useAcceptTeamInvitationMutation();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    password: "",
    confirm: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [acceptedIdentity, setAcceptedIdentity] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const submission = useRef(false);
  const busy = isSubmitting || isAccepting || isLoggingIn;
  const newAccount = !invitation.accountExists;
  const resetHref = buildTenantUrl({
    slug: invitation.tenantSlug,
    locale,
    pathname: "/password?source=platform",
  });
  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!sessionReady || busy || submission.current) return;
    setError("");
    if (newAccount && !accepted) {
      if (!form.firstname.trim() || !form.lastname.trim()) {
        setError(registerT("validation.completeRequired"));
        return;
      }
      if (form.password.length < 8 || !/\d/.test(form.password)) {
        setError(registerT("validation.passwordInvalid"));
        return;
      }
      if (form.password !== form.confirm) {
        setError(registerT("validation.passwordMismatch"));
        return;
      }
    }
    let invitationAccepted = accepted;
    let identity = acceptedIdentity;
    submission.current = true;
    setSubmitting(true);
    try {
      if (!invitationAccepted) {
        identity = await accept({
          token,
          password: form.password,
          ...(newAccount
            ? {
                firstname: form.firstname.trim(),
                lastname: form.lastname.trim(),
              }
            : {}),
        }).unwrap();
        invitationAccepted = true;
        setAcceptedIdentity(identity);
        setAccepted(true);
        // The single-use token is no longer needed; do not retain it in the
        // address bar or any browser storage after successful acceptance.
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
      const result = await login({
        tenantSlug: identity.tenantSlug,
        email: identity.email,
        password: form.password,
      }).unwrap();
      window.location.replace(getPostLoginUrl({ ...result, locale }));
    } catch (requestError) {
      setError(
        invitationAccepted
          ? t("loginRetry")
          : requestError?.status === 401
            ? loginT("errors.incorrectCredentials")
            : t("acceptError"),
      );
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  };

  const inputClass =
    "min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-cobalt-500 focus:outline-none focus:ring-2 focus:ring-cobalt-500/20";
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {invitation.mode === "sign_in" ? t("signInTitle") : t("title")}
      </h1>
      <p className="mt-3 break-words text-sm leading-6 text-ink-muted">
        {t("description", {
          tenant: invitation.tenantName,
          email: invitation.email,
        })}
      </p>
      <dl className="my-6 space-y-2 rounded-xl border border-line bg-surface-muted p-4 text-sm">
        <div>
          <dt className="font-semibold">{teamT("editor.role")}</dt>
          <dd>{invitation.roleName || teamT(`roles.${invitation.roleKey}`)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{teamT("editor.locationTitle")}</dt>
          <dd>
            {invitation.locationAccess?.mode === "selected"
              ? (invitation.locations || []).map((item) => item.name).join(", ")
              : teamT("allLocations")}
          </dd>
        </div>
      </dl>
      {invitation.requiresPasswordReset ? (
        <div className="space-y-4">
          <p role="status" className="text-sm leading-6">
            {t("resetRequired")}
          </p>
          <a
            href={resetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            {t("resetPassword")}
          </a>
          <button
            type="button"
            onClick={onPasswordReady}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-cobalt-500 px-5 font-semibold text-white hover:bg-cobalt-600"
          >
            {t("passwordReady")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-team-invitation-form>
          <p className="text-sm leading-6">
            {newAccount ? t("newAccount") : t("existingAccount")}
          </p>
          {accepted && (
            <p
              role="status"
              className="rounded-xl bg-surface-muted p-3 text-sm"
            >
              {t("accepted")}
            </p>
          )}
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {newAccount && !accepted && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  {accountT("fields.firstname")}
                  <input
                    className={`${inputClass} mt-2`}
                    value={form.firstname}
                    onChange={update("firstname")}
                    autoComplete="given-name"
                    maxLength={80}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {accountT("fields.lastname")}
                  <input
                    className={`${inputClass} mt-2`}
                    value={form.lastname}
                    onChange={update("lastname")}
                    autoComplete="family-name"
                    maxLength={80}
                    required
                  />
                </label>
              </div>
            )}
            <label className="block text-sm font-semibold">
              {newAccount && !accepted
                ? accountT("fields.newPassword")
                : accountT("fields.currentPassword")}
              <input
                className={`${inputClass} mt-2`}
                type="password"
                maxLength={128}
                value={form.password}
                onChange={update("password")}
                autoComplete={
                  newAccount && !accepted ? "new-password" : "current-password"
                }
                required
              />
            </label>
            {newAccount && !accepted && (
              <>
                <p className="text-xs text-ink-muted">
                  {registerT("form.passwordHint")}
                </p>
                <label className="block text-sm font-semibold">
                  {accountT("fields.confirmPassword")}
                  <input
                    className={`${inputClass} mt-2`}
                    type="password"
                    maxLength={128}
                    value={form.confirm}
                    onChange={update("confirm")}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm text-terracotta-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !sessionReady}
            className="min-h-12 w-full rounded-full bg-cobalt-500 px-5 font-semibold text-white hover:bg-cobalt-600 disabled:opacity-50"
          >
            {busy || !sessionReady
              ? t("working")
              : accepted || invitation.mode === "sign_in"
                ? t("signIn")
                : t("accept")}
          </button>
          {!newAccount && (
            <a
              href={resetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              {t("resetPassword")}
            </a>
          )}
        </form>
      )}
    </>
  );
}

export default function TeamInvitationPage() {
  const t = useTranslations("TeamInvitation");
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get("token") || "");
  const [preview] = usePreviewTeamInvitationMutation();
  const [result, setResult] = useState({ isLoading: true });
  const previewRequest = useRef(0);
  const loadPreview = useCallback(() => {
    const requestId = ++previewRequest.current;
    return preview(token)
      .unwrap()
      .catch((error) => {
        if (
          error?.name !== "AbortError" ||
          requestId !== previewRequest.current
        )
          throw error;
        // RTK also aborts pending requests during the auth cache reset. Retry
        // this read-only preview once; acceptance is never replayed this way.
        return preview(token).unwrap();
      })
      .then(
        (data) => {
          if (requestId !== previewRequest.current) return;
          // Restoring a signed-in session clears the shared RTK cache. This public
          // token result belongs to this page, so keep it through that security reset.
          setResult(data?.invitation ? { data } : { isError: true });
        },
        () => {
          if (requestId === previewRequest.current)
            setResult({ isError: true });
        },
      );
  }, [preview, token]);
  const retryPreview = () => {
    setResult({ isLoading: true });
    void loadPreview();
  };
  useEffect(() => {
    if (token) void loadPreview();
    return () => {
      // Ignore an older attempt or an answer that arrives after unmount.
      previewRequest.current += 1;
    };
  }, [loadPreview, token]);
  const invitation = result.data?.invitation;
  return (
    <main
      className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12"
      data-team-invitation-page
    >
      <section className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-8">
        {!token || result.isError ? (
          <>
            <h1 className="text-2xl font-semibold">{t("unavailableTitle")}</h1>
            <p role="alert" className="mt-4 text-sm leading-6">
              {t("unavailable")}
            </p>
            {token && (
              <button
                type="button"
                onClick={retryPreview}
                className="mt-4 min-h-11 rounded-full border border-line px-5 font-semibold"
              >
                {t("retry")}
              </button>
            )}
            <Link
              href="/login"
              className="mt-4 flex min-h-11 items-center text-sm underline"
            >
              {t("signIn")}
            </Link>
          </>
        ) : !invitation || result.isLoading ? (
          <p role="status">{t("loading")}</p>
        ) : (
          <InvitationForm
            key={token}
            token={token}
            invitation={invitation}
            onPasswordReady={retryPreview}
          />
        )}
      </section>
    </main>
  );
}
