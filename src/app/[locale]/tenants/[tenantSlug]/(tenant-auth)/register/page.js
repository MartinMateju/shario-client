"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyCopy, useLegacyText } from "@/i18n/useLegacyCopy";
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
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
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
  const legacyText = useLegacyText();
  if (type === "rules") {
    return (
      <span id="rules-agreement">
        {legacyText("TermsText_I_accept_the_0dc66")}
        <LegalLink href={href}>
          {legacyText("TermsText_studio_rules_d3727")}
        </LegalLink>
        .
      </span>
    );
  }

  return (
    <span id="terms-agreement">
      {legacyText("TermsText_I_accept_the_0dc66")}
      <LegalLink href={href}>
        {legacyText("TermsText_Terms_and_Conditions_89403")}
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
  const customerDefaults = useLegacyCopy("customerDefaults");
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
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
    legacyText("Registration_Your_studio_1b32c");
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
    customerDefaults,
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
  }, [language, translation]);

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
          ? legacyText(
              "Registration_First_name_must_contain_at_least_2_characters_1c536",
            )
          : "",
      lastName:
        touched.lastName && form.lastName && !validation.validLastName
          ? legacyText(
              "Registration_Last_name_must_contain_at_least_2_characters_c5dd3",
            )
          : "",
      email:
        touched.email && form.email && !validation.validEmail
          ? legacyText("Registration_Please_enter_a_valid_email_address_d2306")
          : "",
      phone:
        touched.phone && form.phone && !validation.validPhone
          ? legacyText("Registration_Please_enter_a_valid_phone_number_c08e1")
          : "",
      password:
        touched.password && form.password && !validation.validPassword
          ? legacyText(
              "Registration_Password_must_be_at_least_8_characters_long_and_contain_3d73c",
            )
          : "",
      passwordConfirm:
        touched.passwordConfirm &&
        form.passwordConfirm &&
        !validation.passwordMatch
          ? legacyText("Registration_Passwords_do_not_match_f7c3c")
          : "",
    };
  }, [
    form.email,
    form.firstName,
    form.lastName,
    form.password,
    form.passwordConfirm,
    form.phone,
    legacyText,
    touched.email,
    touched.firstName,
    touched.lastName,
    touched.password,
    touched.passwordConfirm,
    touched.phone,
    validation.passwordMatch,
    validation.validEmail,
    validation.validFirstName,
    validation.validLastName,
    validation.validPassword,
    validation.validPhone,
  ]);

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
        nextError = t("ERROR_NAME_REGEX");
      } else if (!validation.validLastName) {
        nextError = t("ERROR_NAME_REGEX");
      } else if (!validation.validEmail) {
        nextError = t("ERROR_EMAIL_REGEX");
      } else if (!validation.validPhone) {
        nextError = t("ERROR_PHONE_REGEX");
      } else if (!validation.validPassword) {
        nextError = t("ERROR_PASSWORD_REGEX");
      } else if (!validation.passwordMatch) {
        nextError = t("ERROR_PASS_MATCH");
      } else if (legal.studioRules && !rulesAgreement) {
        nextError = t("ERROR_RULES");
      } else if (legal.terms && !termsAgreement) {
        nextError = t("ERROR_TERMS");
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
          setErrMsg(t("ERROR_NO_SERVER_RESPONSE"));
        } else if (err.status === 400) {
          setErrMsg(t("ERROR_MISSING_CREDENTIALS"));
        } else if (err.status === 401) {
          setErrMsg(t("ERROR_UNAUTHORIZED"));
        } else if (err.status === 409) {
          setErrMsg(t("ERROR_USER_EXISTS"));
        } else {
          setErrMsg(
            getLocalizedApiErrorMessage(err, t("ERROR_NO_SERVER_RESPONSE")),
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
          text={t("REGISTER_CONFIRMATION")}
          title={t("REGISTER_TITLE_CONFIRMATION")}
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
          formDescription={legacyText(
            "Registration_It_only_takes_a_moment_and_you_will_not_need_to_enter_y_89bc4",
          )}
          formEyebrow={legacyText("Registration_Customer_access_aaae3")}
          formTitle={legacyText("Registration_Create_account_aaf37")}
          helpText={configuredHelpText}
          highlights={[
            legacyText(
              "Registration_Book_visits_and_courses_without_re_entering_details_6952f",
            ),
            legacyText(
              "Registration_Keep_pieces_credits_and_history_within_reach_2267f",
            ),
          ]}
          intentText={
            safeNextPath
              ? legacyText(
                  "Registration_Your_booking_selection_is_saved_Create_your_account_to_c9b1a",
                )
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
                {legacyText("Registration_Your_details_a6252")}
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomerAuthField
                  ref={firstNameRef}
                  id="firstname"
                  name="given-name"
                  label={t("FIRST_NAME")}
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  onBlur={handleBlur("firstName")}
                  placeholder={t("FIRST_NAME")}
                  touched={touched.firstName}
                  valid={validation.validFirstName}
                  error={helperTexts.firstName}
                  compact
                  required
                />

                <CustomerAuthField
                  id="lastname"
                  name="family-name"
                  label={t("LAST_NAME")}
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  onBlur={handleBlur("lastName")}
                  placeholder={t("LAST_NAME")}
                  touched={touched.lastName}
                  valid={validation.validLastName}
                  error={helperTexts.lastName}
                  compact
                  required
                />

                <CustomerAuthField
                  id="email"
                  name="email"
                  label={legacyText("Registration_Email_84add")}
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
                  label={t("PHONE")}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  onBlur={handleBlur("phone")}
                  placeholder={t("PHONE")}
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
                {legacyText("Registration_Account_security_0afc7")}
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomerAuthPasswordField
                  id="password"
                  name="new-password"
                  label={t("PASSWORD")}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  placeholder={t("PASSWORD")}
                  touched={touched.password}
                  valid={validation.validPassword}
                  error={helperTexts.password}
                  helperText={
                    !helperTexts.password
                      ? legacyText(
                          "Registration_At_least_8_characters_and_1_number_87242",
                        )
                      : ""
                  }
                  showPasswordLabel={legacyText(
                    "Registration_Show_password_044b8",
                  )}
                  hidePasswordLabel={legacyText(
                    "Registration_Hide_password_e4012",
                  )}
                  compact
                  required
                />

                <CustomerAuthPasswordField
                  id="password_confirm"
                  name="new-password-confirm"
                  label={t("PASSWORD_CONFIRM")}
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  onBlur={handleBlur("passwordConfirm")}
                  placeholder={t("PASSWORD_CONFIRM")}
                  touched={touched.passwordConfirm}
                  valid={validation.passwordMatch}
                  error={helperTexts.passwordConfirm}
                  showPasswordLabel={legacyText(
                    "Registration_Show_password_confirmation_c4411",
                  )}
                  hidePasswordLabel={legacyText(
                    "Registration_Hide_password_confirmation_7dbbe",
                  )}
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
                    {legacyText(
                      "Registration_Information_about_personal_data_processing_is_available_c4190",
                    )}
                    <LegalLink href={legal.privacy}>
                      {legacyText("Registration_privacy_policy_478db")}
                    </LegalLink>
                    .
                  </p>
                ) : null}
              </div>
            ) : null}

            <CustomerAuthError ref={errRef}>{errMsg}</CustomerAuthError>

            <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
              {isLoading
                ? legacyText("Registration_Creating_account_baab5")
                : t("BUTTON_REGISTER")}
            </CustomerAuthSubmitButton>

            <CustomerSocialAuthButtons
              tenantSlug={tenantSlug}
              locale={locale}
              nextPath={safeNextPath}
              variant="compact"
            />

            <p className="border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-3 text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
              {legacyText("Registration_Already_registered_e7edd")}
              <Link
                href={tenantLoginHref}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
              >
                {legacyText("Registration_Sign_in_ada2e")}
              </Link>
            </p>
          </form>
        </CustomerAuthShell>
      </PublicCapabilityGate>
    </>
  );
}
