"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import {
  CustomerAuthError,
  CustomerAuthPasswordField,
  CustomerAuthSubmitButton,
} from "@/components/auth/CustomerAuthField";
import CustomerPasswordRecoveryShell from "@/components/auth/CustomerPasswordRecoveryShell";
import { PASSWORD_MAX_LENGTH, PWD_REGEX } from "@/config/constants";
import isOptAuth from "@/hoc/isOptAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { usePassResetMutation } from "@/lib/features/pass/passApiSlice";
import {
  selectCurrentOptToken,
  selectPasswordResetNextPath,
} from "@/lib/features/pass/passSlice";
import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

const getResetError = (error, copy) => {
  if (error?.status === 401) return copy.expired;
  if (error?.status === 429) return copy.rateLimited;
  if (error?.status === 400) return copy.passwordError;
  return copy.genericError;
};

function ResetPasswordForm() {
  const locale = useLocale();
  const copy = useLegacyCopy("passwordReset");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const source =
    searchParams.get("source") === "platform" ? "platform" : "customer";
  const token = useSelector(selectCurrentOptToken);
  const nextPath = getSafeTenantNextPath(
    useSelector(selectPasswordResetNextPath),
    "/portal",
  );
  const [passReset, { isLoading }] = usePassResetMutation();
  const errorRef = useRef(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validPassword = useMemo(
    () => PWD_REGEX.test(password) && password.length <= PASSWORD_MAX_LENGTH,
    [password],
  );
  const passwordMatch = useMemo(
    () => password === passwordConfirm && passwordConfirm !== "",
    [password, passwordConfirm],
  );
  const passwordError =
    passwordTouched && !validPassword ? copy.passwordError : "";
  const confirmError =
    passwordConfirmTouched && !passwordMatch ? copy.confirmError : "";
  const requestAgainHref =
    source === "platform"
      ? "/password?source=platform"
      : buildTenantAuthHref("/password", nextPath);

  const showError = (message) => {
    setErrorMessage(message);
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    setPasswordTouched(true);
    setPasswordConfirmTouched(true);
    setErrorMessage("");

    if (!validPassword) {
      showError(copy.passwordError);
      return;
    }

    if (!passwordMatch) {
      showError(copy.confirmError);
      return;
    }

    try {
      await passReset({
        tenantSlug,
        resetToken: token,
        password,
      }).unwrap();
      router.replace(
        source === "platform"
          ? "/password/success?source=platform"
          : `/password/success?next=${encodeURIComponent(nextPath)}`,
      );
    } catch (error) {
      showError(getResetError(error, copy));
    }
  };

  return (
    <CustomerPasswordRecoveryShell
      formDescription={copy.description}
      formEyebrow={copy.eyebrow}
      formTitle={copy.title}
    >
      <form
        aria-busy={isLoading}
        aria-labelledby="customer-auth-form-title"
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit}
      >
        <CustomerAuthPasswordField
          id="new-password"
          autoComplete="new-password"
          compact
          error={passwordError}
          helperText={copy.passwordHelper}
          hidePasswordLabel={copy.hidePassword}
          label={copy.passwordLabel}
          maxLength={PASSWORD_MAX_LENGTH}
          name="password"
          onBlur={() => setPasswordTouched(true)}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrorMessage("");
          }}
          placeholder={copy.passwordPlaceholder}
          required
          showPasswordLabel={copy.showPassword}
          touched={passwordTouched}
          valid={validPassword}
          value={password}
        />

        <CustomerAuthPasswordField
          id="new-password-confirmation"
          autoComplete="new-password"
          compact
          error={confirmError}
          hidePasswordLabel={copy.hideConfirm}
          label={copy.confirmLabel}
          maxLength={PASSWORD_MAX_LENGTH}
          name="passwordConfirm"
          onBlur={() => setPasswordConfirmTouched(true)}
          onChange={(event) => {
            setPasswordConfirm(event.target.value);
            setErrorMessage("");
          }}
          placeholder={copy.confirmPlaceholder}
          required
          showPasswordLabel={copy.showConfirm}
          touched={passwordConfirmTouched}
          valid={passwordMatch}
          value={passwordConfirm}
        />

        <CustomerAuthError ref={errorRef}>{errorMessage}</CustomerAuthError>

        <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
          {isLoading ? copy.saving : copy.save}
        </CustomerAuthSubmitButton>

        <p className="text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            href={requestAgainHref}
          >
            {copy.requestAgain}
          </Link>
        </p>
      </form>
    </CustomerPasswordRecoveryShell>
  );
}

export default isOptAuth(ResetPasswordForm);
