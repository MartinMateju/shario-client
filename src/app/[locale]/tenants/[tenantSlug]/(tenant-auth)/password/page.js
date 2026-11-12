"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

import CustomerAuthField, {
  CustomerAuthError,
  CustomerAuthSubmitButton,
} from "@/components/auth/CustomerAuthField";
import CustomerPasswordRecoveryShell from "@/components/auth/CustomerPasswordRecoveryShell";
import OTPModal from "@/components/modals/OTPModal";
import { EMAIL_MAX_LENGTH, EMAIL_REGEX } from "@/config/constants";
import { Link } from "@/i18n/navigation";
import { useRequestPassResetMutation } from "@/lib/features/pass/passApiSlice";
import { clearTempCredentials } from "@/lib/features/pass/passSlice";
import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";
import {
  buildPlatformUrl,
  getValidatedTenantSlugParam,
} from "@/utils/tenantRouting";

const COPY = {
  cs: {
    back: "Zpět na přihlášení",
    description:
      "Zadejte e-mail propojený s účtem. Pošleme vám bezpečný kód pro nastavení nového hesla.",
    emailError: "Zadejte platnou e-mailovou adresu.",
    emailHelper: "Použijte adresu registrovanou v tomto studiu.",
    emailLabel: "E-mail",
    eyebrow: "Obnovení přístupu",
    genericError: "Kód se nepodařilo odeslat. Zkuste to prosím znovu.",
    rateLimited: "Proběhlo příliš mnoho žádostí. Zkuste to znovu později.",
    send: "Poslat ověřovací kód",
    sending: "Odesíláme…",
    title: "Obnovit heslo",
  },
  en: {
    back: "Back to sign in",
    description:
      "Enter the email connected with your account. We will send a secure code so you can choose a new password.",
    emailError: "Enter a valid email address.",
    emailHelper: "Use the address registered with this studio.",
    emailLabel: "E-mail",
    eyebrow: "Account recovery",
    genericError: "We could not send the code. Please try again.",
    rateLimited: "There have been too many requests. Please try again later.",
    send: "Send verification code",
    sending: "Sending…",
    title: "Reset password",
  },
};

const getRequestError = (error, copy) => {
  if (error?.status === 429) return copy.rateLimited;
  return copy.genericError;
};

export default function ResetPasswordRequest() {
  const locale = useLocale();
  const copy = COPY[locale === "cs" ? "cs" : "en"];
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const nextPath = getSafeTenantNextPath(searchParams.get("next"), "/portal");
  const source =
    searchParams.get("source") === "platform" ? "platform" : "customer";
  const isPlatformSource = source === "platform";
  const [requestReset, { isLoading }] = useRequestPassResetMutation();
  const errorRef = useRef(null);

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedEmail = useMemo(
    () => email.toLowerCase().replace(/\s+/g, ""),
    [email],
  );
  const validEmail = useMemo(
    () => EMAIL_REGEX.test(normalizedEmail),
    [normalizedEmail],
  );
  const fieldError = emailTouched && !validEmail ? copy.emailError : "";
  const customerLoginHref = buildTenantAuthHref("/login", nextPath);
  const platformLoginHref = buildPlatformUrl({ locale, pathname: "/login" });

  const showError = (message) => {
    setErrorMessage(message);
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    setEmailTouched(true);
    setErrorMessage("");

    if (!validEmail) {
      showError(copy.emailError);
      return;
    }

    try {
      dispatch(clearTempCredentials());
      await requestReset({
        tenantSlug,
        email: normalizedEmail,
        locale: locale === "cs" ? "cs" : "en",
      }).unwrap();
      setShowModal(true);
    } catch (error) {
      showError(getRequestError(error, copy));
    }
  };

  return (
    <>
      {showModal ? (
        <OTPModal
          email={normalizedEmail}
          nextPath={nextPath}
          onClose={() => setShowModal(false)}
          source={source}
          tenantSlug={tenantSlug}
        />
      ) : null}

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
          <CustomerAuthField
            id="recovery-email"
            autoComplete="email"
            compact
            error={fieldError}
            helperText={copy.emailHelper}
            inputMode="email"
            label={copy.emailLabel}
            maxLength={EMAIL_MAX_LENGTH}
            name="email"
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            placeholder="you@email.com"
            required
            touched={emailTouched}
            type="email"
            valid={validEmail}
            value={email}
          />

          <CustomerAuthError ref={errorRef}>{errorMessage}</CustomerAuthError>

          <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
            {isLoading ? copy.sending : copy.send}
          </CustomerAuthSubmitButton>

          <p className="text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
            {isPlatformSource ? (
              <a
                className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                href={platformLoginHref}
              >
                {copy.back}
              </a>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                href={customerLoginHref}
              >
                {copy.back}
              </Link>
            )}
          </p>
        </form>
      </CustomerPasswordRecoveryShell>
    </>
  );
}
