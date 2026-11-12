"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";

import CustomerAuthField, {
  CustomerAuthError,
  CustomerAuthPasswordField,
  CustomerAuthSubmitButton,
} from "@/components/auth/CustomerAuthField";
import CustomerAuthShell from "@/components/auth/CustomerAuthShell";
import CustomerSocialAuthButtons from "@/components/auth/CustomerSocialAuthButtons";
import { getCustomerAuthCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import ConfirmationModal from "@/components/modals/ConformationModal";
import PublicCapabilityGate from "@/components/public-tenant/PublicCapabilityGate";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "@/components/public-tenant/publicTenant.config";
import {
  EMAIL_REGEX,
  NAME_REGEX,
  PHONE_REGEX,
  PWD_REGEX,
} from "@/config/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { useRegisterNewUserMutation } from "@/lib/features/users/usersApiSlice";
import translation from "@/translations/translation";
import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";

const INITIAL_VALUES = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
};

const INITIAL_TOUCHED = {
  firstName: false,
  lastName: false,
  email: false,
  phone: false,
  password: false,
  passwordConfirm: false,
};

function LegalLink({ href, children }) {
  if (/^https:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 hover:underline"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Link>
  );
}

function TermsText({ type, language, href }) {
  if (type === "rules") {
    return (
      <span id="rules-agreement">
        {language === "CZ" ? "Přečetl/a jsem si " : "I accept the "}
        <LegalLink href={href}>
          {language === "CZ" ? "pravidla dílny" : "studio rules"}
        </LegalLink>
        .
      </span>
    );
  }

  return (
    <span id="terms-agreement">
      {language === "CZ" ? "Souhlasím s " : "I accept the "}
      <LegalLink href={href}>
        {language === "CZ" ? "obchodními podmínkami" : "Terms and Conditions"}
      </LegalLink>
      .
    </span>
  );
}

function Agreement({ checked, children, describedBy, id, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--tenant-auth-form-text)_14%,transparent)] bg-[var(--tenant-auth-form-surface)] px-4 py-3.5 text-sm leading-6 text-[var(--tenant-auth-form-muted)] transition hover:border-[var(--tenant-accent)]/35 hover:bg-[color-mix(in_srgb,var(--tenant-auth-form-surface)_94%,var(--tenant-auth-form-text)_6%)]">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-describedby={describedBy}
        required
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-[color-mix(in_srgb,var(--tenant-auth-form-text)_28%,transparent)] text-[var(--tenant-auth-form-secondary)] focus:ring-[var(--tenant-auth-form-secondary)]/30"
      />
      <span>{children}</span>
    </label>
  );
}

export default function Registration() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const verificationLocale = resolveRolloutEligibleLocaleCode(locale);
  // Public auth copy follows the locale in the URL. The workspace language in
  // Redux can lag behind a locale switch and must never override /en or /cs.
  const language = locale === "cs" ? "CZ" : "EN";
  const { tenant } = usePublicTenant();
  const errRef = useRef(null);
  const firstNameRef = useRef(null);

  const [addNewUser, { isLoading }] = useRegisterNewUserMutation();

  const [form, setForm] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [showModal, setShowModal] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [termsAgreement, setTermsAgreement] = useState(false);
  const [rulesAgreement, setRulesAgreement] = useState(false);

  const tenantSlugParam = params?.tenantSlug;
  const tenantSlug = String(
    Array.isArray(tenantSlugParam) ? tenantSlugParam[0] : tenantSlugParam || "",
  )
    .trim()
    .toLowerCase();
  const tenantName =
    tenant.publicSite.branding.displayName ||
    tenant.name ||
    (language === "CZ" ? "Vaše studio" : "Your studio");
  const legal = tenant.publicSite.footer.legal;
  const safeNextPath = getSafeTenantNextPath(searchParams.get("next"));
  const tenantLoginHref = buildTenantAuthHref("/login", safeNextPath);
  const register = tenant.publicSite.register || {};
  const backgroundImageUrl =
    register.backgroundImageUrl || tenant.publicSite.login.backgroundImageUrl;
  const logoUrl = tenant.publicSite.branding.logoUrl;
  const tenantTheme = getPublicTenantTheme(tenant);
  const { accentColor, accentLinkColor, secondaryColor } = tenantTheme;
  const isCzech = language === "CZ";
  const customizationDefaults = getCustomerAuthCustomizationDefaults(
    "register",
    locale,
  );
  const configuredEyebrow = getLocalizedPublicTenantText(
    register.eyebrow,
    locale,
  );
  const configuredHeadline = getLocalizedPublicTenantText(
    register.headline,
    locale,
  );
  const configuredSupportingText = getLocalizedPublicTenantText(
    register.supportingText,
    locale,
  );
  const configuredHelpText = getLocalizedPublicTenantText(
    register.helpText,
    locale,
  );
  const labelColor =
    register.labelColor ||
    tenant.publicSite.branding.labelColor ||
    tenantTheme.labelColor ||
    accentLinkColor;

  const t = useMemo(() => {
    return (key, fallback = "") => translation?.[key]?.[language] ?? fallback;
  }, [language]);

  const validation = useMemo(() => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    const validFirstName = NAME_REGEX.test(firstName);
    const validLastName = NAME_REGEX.test(lastName);
    const validEmail = EMAIL_REGEX.test(email);
    const validPhone = PHONE_REGEX.test(phone);
    const validPassword = PWD_REGEX.test(form.password);
    const passwordMatch =
      form.password === form.passwordConfirm && form.passwordConfirm.length > 0;

    return {
      validFirstName,
      validLastName,
      validEmail,
      validPhone,
      validPassword,
      passwordMatch,
    };
  }, [form]);

  useEffect(() => {
    const firstNameField = firstNameRef.current;
    if (!firstNameField) return;

    const bounds = firstNameField.getBoundingClientRect();
    const fieldIsAlreadyVisible =
      bounds.top >= 0 &&
      bounds.left >= 0 &&
      bounds.bottom <= window.innerHeight &&
      bounds.right <= window.innerWidth;

    if (fieldIsAlreadyVisible) firstNameField.focus({ preventScroll: true });
  }, []);

  const handleChange = useCallback(
    (field) => (e) => {
      const rawValue = e.target.value;
      const value =
        field === "email"
          ? rawValue.toLowerCase().replace(/\s+/g, "")
          : rawValue;

      setForm((prev) => ({ ...prev, [field]: value }));

      if (errMsg) setErrMsg("");
    },
    [errMsg],
  );

  const handleBlur = useCallback(
    (field) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    [],
  );

  const markAllTouched = useCallback(() => {
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      passwordConfirm: true,
    });
  }, []);

  const helperTexts = useMemo(() => {
    return {
      firstName:
        touched.firstName && form.firstName && !validation.validFirstName
          ? isCzech
            ? "Jméno musí obsahovat alespoň 2 znaky."
            : "First name must contain at least 2 characters."
          : "",
      lastName:
        touched.lastName && form.lastName && !validation.validLastName
          ? isCzech
            ? "Příjmení musí obsahovat alespoň 2 znaky."
            : "Last name must contain at least 2 characters."
          : "",
      email:
        touched.email && form.email && !validation.validEmail
          ? isCzech
            ? "Zadejte platnou e-mailovou adresu."
            : "Please enter a valid email address."
          : "",
      phone:
        touched.phone && form.phone && !validation.validPhone
          ? isCzech
            ? "Zadejte platné telefonní číslo."
            : "Please enter a valid phone number."
          : "",
      password:
        touched.password && form.password && !validation.validPassword
          ? isCzech
            ? "Heslo musí mít alespoň 8 znaků a obsahovat alespoň 1 číslici."
            : "Password must be at least 8 characters long and contain at least 1 number."
          : "",
      passwordConfirm:
        touched.passwordConfirm &&
        form.passwordConfirm &&
        !validation.passwordMatch
          ? isCzech
            ? "Hesla se neshodují."
            : "Passwords do not match."
          : "",
    };
  }, [form, isCzech, touched, validation]);

  const focusError = useCallback(() => {
    window.requestAnimationFrame(() => {
      errRef.current?.focus?.();
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (isLoading) return;

      setErrMsg("");
      markAllTouched();

      const payload = {
        firstname: form.firstName.trim(),
        lastname: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        tenantSlug,
        next: safeNextPath,
        locale: verificationLocale,
      };

      let nextError = "";

      if (!validation.validFirstName) {
        nextError = t("ERROR_NAME_REGEX", "Please enter a valid name.");
      } else if (!validation.validLastName) {
        nextError = t("ERROR_NAME_REGEX", "Please enter a valid name.");
      } else if (!validation.validEmail) {
        nextError = t("ERROR_EMAIL_REGEX", "Please enter a valid email.");
      } else if (!validation.validPhone) {
        nextError = t(
          "ERROR_PHONE_REGEX",
          "Please enter a valid phone number.",
        );
      } else if (!validation.validPassword) {
        nextError = t(
          "ERROR_PASSWORD_REGEX",
          "Password must be at least 8 characters long and contain at least 1 number.",
        );
      } else if (!validation.passwordMatch) {
        nextError = t("ERROR_PASS_MATCH", "Passwords do not match.");
      } else if (legal.studioRules && !rulesAgreement) {
        nextError = t("ERROR_RULES", "Please accept the studio rules.");
      } else if (legal.terms && !termsAgreement) {
        nextError = t("ERROR_TERMS", "Please accept the terms.");
      }

      if (nextError) {
        setErrMsg(nextError);
        focusError();
        return;
      }

      try {
        const response = await addNewUser(payload).unwrap();
        setForm(INITIAL_VALUES);
        setTouched(INITIAL_TOUCHED);
        setTermsAgreement(false);
        setRulesAgreement(false);
        setErrMsg("");

        if (response?.verificationRequired !== false) {
          router.push(
            `/verify-email?email=${encodeURIComponent(
              payload.email,
            )}&next=${encodeURIComponent(safeNextPath)}`,
          );
          return;
        }

        setShowModal(true);
      } catch (err) {
        if (!err?.status) {
          setErrMsg(t("ERROR_NO_SERVER_RESPONSE", "Server is not responding."));
        } else if (err.status === 400) {
          setErrMsg(
            t("ERROR_MISSING_CREDENTIALS", "Please fill in all fields."),
          );
        } else if (err.status === 401) {
          setErrMsg(t("ERROR_UNAUTHORIZED", "Unauthorized request."));
        } else if (err.status === 409) {
          setErrMsg(t("ERROR_USER_EXISTS", "User already exists."));
        } else {
          setErrMsg(
            err?.data?.message ||
              t("ERROR_NO_SERVER_RESPONSE", "Server is not responding."),
          );
        }

        focusError();
      }
    },
    [
      addNewUser,
      focusError,
      form,
      isLoading,
      legal.studioRules,
      legal.terms,
      markAllTouched,
      rulesAgreement,
      router,
      safeNextPath,
      t,
      termsAgreement,
      tenantSlug,
      validation,
      verificationLocale,
    ],
  );

  const closeConfirmationModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      {showModal ? (
        <ConfirmationModal
          open={showModal}
          setOpen={closeConfirmationModal}
          customerMode
          tenantStylePresetId={tenantTheme?.stylePresetId}
          tenantThemeStyle={tenantTheme?.style}
          text={t("REGISTER_CONFIRMATION", "Registration was successful.")}
          title={t("REGISTER_TITLE_CONFIRMATION", "Registration completed")}
          href={tenantLoginHref}
        />
      ) : null}

      <PublicCapabilityGate capability="registration">
        <CustomerAuthShell
          accentColor={accentColor}
          backgroundImageUrl={backgroundImageUrl}
          description={
            configuredSupportingText || customizationDefaults.description
          }
          eyebrow={configuredEyebrow || customizationDefaults.eyebrow}
          formDescription={
            isCzech
              ? "Zabere to jen chvilku. Údaje pak nebudete zadávat při každé návštěvě."
              : "It only takes a moment, and you will not need to enter your details for every visit."
          }
          formEyebrow={isCzech ? "Zákaznický účet" : "Customer access"}
          formTitle={isCzech ? "Vytvořit účet" : "Create account"}
          helpText={configuredHelpText}
          highlights={
            isCzech
              ? [
                  "Rezervace a kurzy bez opakovaného vyplňování",
                  "Výrobky, kredity a historie vždy po ruce",
                ]
              : [
                  "Book visits and courses without re-entering details",
                  "Keep pieces, credits and history within reach",
                ]
          }
          intentText={
            safeNextPath
              ? isCzech
                ? "Váš výběr rezervace je uložený. Po registraci můžete plynule pokračovat."
                : "Your booking selection is saved. Create your account to continue where you left off."
              : ""
          }
          labelColor={labelColor}
          logoUrl={logoUrl}
          branding={tenant.publicSite.branding}
          mode="register"
          secondaryColor={secondaryColor}
          tenantName={tenantName}
          themeStyle={tenantTheme.style}
          title={configuredHeadline || customizationDefaults.headline}
        >
          <form
            className="space-y-5"
            autoComplete="on"
            onSubmit={handleSubmit}
            aria-busy={isLoading}
            aria-labelledby="customer-auth-form-title"
            noValidate
          >
            <fieldset className="space-y-3">
              <legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-auth-form-muted)]">
                {isCzech ? "Vaše údaje" : "Your details"}
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomerAuthField
                  ref={firstNameRef}
                  id="firstname"
                  name="given-name"
                  label={t("FIRST_NAME", "First name")}
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  onBlur={handleBlur("firstName")}
                  placeholder={t("FIRST_NAME", "First name")}
                  touched={touched.firstName}
                  valid={validation.validFirstName}
                  error={helperTexts.firstName}
                  compact
                  required
                />

                <CustomerAuthField
                  id="lastname"
                  name="family-name"
                  label={t("LAST_NAME", "Last name")}
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  onBlur={handleBlur("lastName")}
                  placeholder={t("LAST_NAME", "Last name")}
                  touched={touched.lastName}
                  valid={validation.validLastName}
                  error={helperTexts.lastName}
                  compact
                  required
                />

                <CustomerAuthField
                  id="email"
                  name="email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  placeholder="you@email.com"
                  touched={touched.email}
                  valid={validation.validEmail}
                  error={helperTexts.email}
                  compact
                  required
                />

                <CustomerAuthField
                  id="phone"
                  name="tel"
                  label={t("PHONE", "Phone")}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  onBlur={handleBlur("phone")}
                  placeholder={t("PHONE", "Phone")}
                  touched={touched.phone}
                  valid={validation.validPhone}
                  error={helperTexts.phone}
                  compact
                  required
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-5">
              <legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-auth-form-muted)]">
                {isCzech ? "Zabezpečení účtu" : "Account security"}
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomerAuthPasswordField
                  id="password"
                  name="new-password"
                  label={t("PASSWORD", "Password")}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  placeholder={t("PASSWORD", "Password")}
                  touched={touched.password}
                  valid={validation.validPassword}
                  error={helperTexts.password}
                  helperText={
                    !helperTexts.password
                      ? isCzech
                        ? "Alespoň 8 znaků a 1 číslice."
                        : "At least 8 characters and 1 number."
                      : ""
                  }
                  showPasswordLabel={
                    isCzech ? "Zobrazit heslo" : "Show password"
                  }
                  hidePasswordLabel={isCzech ? "Skrýt heslo" : "Hide password"}
                  compact
                  required
                />

                <CustomerAuthPasswordField
                  id="password_confirm"
                  name="new-password-confirm"
                  label={t("PASSWORD_CONFIRM", "Confirm password")}
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  onBlur={handleBlur("passwordConfirm")}
                  placeholder={t("PASSWORD_CONFIRM", "Confirm password")}
                  touched={touched.passwordConfirm}
                  valid={validation.passwordMatch}
                  error={helperTexts.passwordConfirm}
                  showPasswordLabel={
                    isCzech
                      ? "Zobrazit potvrzení hesla"
                      : "Show password confirmation"
                  }
                  hidePasswordLabel={
                    isCzech
                      ? "Skrýt potvrzení hesla"
                      : "Hide password confirmation"
                  }
                  compact
                  required
                />
              </div>
            </fieldset>

            {legal.studioRules || legal.terms || legal.privacy ? (
              <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-5">
                {legal.studioRules ? (
                  <Agreement
                    id="rules-check"
                    checked={rulesAgreement}
                    onChange={() => {
                      setRulesAgreement((prev) => !prev);
                      setErrMsg("");
                    }}
                    describedBy="rules-agreement"
                  >
                    <TermsText
                      type="rules"
                      language={language}
                      href={legal.studioRules}
                    />
                  </Agreement>
                ) : null}

                {legal.terms ? (
                  <Agreement
                    id="terms-check"
                    checked={termsAgreement}
                    onChange={() => {
                      setTermsAgreement((prev) => !prev);
                      setErrMsg("");
                    }}
                    describedBy="terms-agreement"
                  >
                    <TermsText
                      type="terms"
                      language={language}
                      href={legal.terms}
                    />
                  </Agreement>
                ) : null}

                {legal.privacy ? (
                  <p className="px-1 pt-1 text-xs leading-5 text-[var(--tenant-auth-form-muted)]">
                    {isCzech
                      ? "Informace o zpracování osobních údajů najdete v "
                      : "Information about personal data processing is available in our "}
                    <LegalLink href={legal.privacy}>
                      {isCzech
                        ? "zásadách ochrany osobních údajů"
                        : "privacy policy"}
                    </LegalLink>
                    .
                  </p>
                ) : null}
              </div>
            ) : null}

            <CustomerAuthError ref={errRef}>{errMsg}</CustomerAuthError>

            <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
              {isLoading
                ? isCzech
                  ? "Vytváříme účet…"
                  : "Creating account…"
                : t("BUTTON_REGISTER", "Create account")}
            </CustomerAuthSubmitButton>

            <CustomerSocialAuthButtons
              tenantSlug={tenantSlug}
              locale={locale}
              nextPath={safeNextPath}
              variant="compact"
            />

            <p className="border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-3 text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
              {isCzech ? "Už máte účet? " : "Already registered? "}
              <Link
                href={tenantLoginHref}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
              >
                {isCzech ? "Přihlaste se" : "Sign in"}
              </Link>
            </p>
          </form>
        </CustomerAuthShell>
      </PublicCapabilityGate>
    </>
  );
}
