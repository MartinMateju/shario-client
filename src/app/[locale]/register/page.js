"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import {
  ArrowLongRightIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { getVisitorPreferences } from "@/utils/visitorPreferences";
import { useMemo, useRef, useState } from "react";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import PlatformAuthCanvasBrushes from "@/components/auth/PlatformAuthCanvasBrushes";
import { PLATFORM_AUTH_VIEWPORT_HEIGHT } from "@/components/auth/platformAuthLayout";
import authLayoutStyles from "@/components/auth/platformAuthLayout.module.css";
import "@/styles/publicStudioTheme.css";
import { Link } from "@/i18n/navigation";
import { useRegisterTenantMutation } from "@/lib/features/auth/authApiSlice";
import { buildRegisteredTenantOnboardingUrl } from "@/utils/tenantRouting";

const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const initialForm = {
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  passwordConfirm: "",
  tenantName: "",
  slug: "",
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const inputClassName =
  "h-12 min-w-0 w-full rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] px-4 text-base outline-none transition placeholder:text-[var(--studio-muted)] focus:border-[var(--studio-blue)] focus:ring-4 focus:ring-[var(--studio-blue)]/10 aria-invalid:border-red-400 aria-invalid:ring-red-100 sm:text-[15px] [@media(max-height:800px)]:h-11";

function FieldError({ id, message }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs leading-5 text-red-700" id={id}>
      {message}
    </p>
  );
}

export default function PlatformRegisterPage() {
  const locale = useLocale();
  const t = useTranslations("PlatformAuth.register");
  const errorRef = useRef(null);
  const [registerTenant, { isLoading }] = useRegisterTenantMutation();
  const [form, setForm] = useState(initialForm);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fieldErrors = useMemo(() => {
    const errors = {};

    if (!form.firstname.trim()) {
      errors.firstname = t("validation.firstNameRequired");
    }

    if (!form.lastname.trim()) {
      errors.lastname = t("validation.lastNameRequired");
    }

    if (!form.tenantName.trim()) {
      errors.tenantName = t("validation.studioNameRequired");
    }

    if (!WORKSPACE_SLUG_PATTERN.test(form.slug)) {
      errors.slug = t("validation.workspaceInvalid");
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = t("validation.emailInvalid");
    }

    if (form.password.length < 8 || !/\d/.test(form.password)) {
      errors.password = t("validation.passwordInvalid");
    }

    if (!form.passwordConfirm || form.passwordConfirm !== form.password) {
      errors.passwordConfirm = t("validation.passwordMismatch");
    }

    if (!accepted) {
      errors.accepted = t("validation.legalRequired");
    }

    return errors;
  }, [accepted, form, t]);

  const isValid = Object.keys(fieldErrors).length === 0;

  const focusError = () => {
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "tenantName" ? { slug: slugify(value) } : {}),
    }));
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (!isValid || isLoading) {
      if (!isValid) {
        setErrorMessage(t("validation.completeRequired"));
        focusError();
      }
      return;
    }

    setErrorMessage("");

    try {
      const result = await registerTenant({
        ...getVisitorPreferences({ locale }),
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        tenantName: form.tenantName.trim(),
        slug: form.slug,
      }).unwrap();

      window.location.replace(
        buildRegisteredTenantOnboardingUrl({
          tenant: result?.tenant,
          requestedSlug: form.slug,
          locale,
        }),
      );
    } catch (requestError) {
      setErrorMessage(
        getLocalizedApiErrorMessage(requestError, t("errors.createFailed")),
      );
      focusError();
    }
  };

  const showFieldError = (field) => (attemptedSubmit ? fieldErrors[field] : "");

  return (
    <main
      className={`${authLayoutStyles.viewport} ${authLayoutStyles.authPage} relative isolate overflow-x-clip bg-[var(--studio-paper)] text-[var(--studio-ink)]`}
      data-skab-public-surface
      data-platform-auth-page
      data-platform-register-page
      style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
    >
      <PlatformAuthCanvasBrushes />

      <div
        className={`${authLayoutStyles.viewport} grid grid-cols-[minmax(0,1fr)] items-start xl:grid-cols-2`}
        data-platform-auth-grid
        style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
      >
        <section
          className={`${authLayoutStyles.viewport} relative z-10 flex min-w-0 flex-col px-4 pb-5 pt-[calc(var(--platform-auth-header-height)+1rem)] sm:px-8 sm:pb-7 sm:pt-[calc(var(--platform-auth-header-height)+1.25rem)] lg:px-10 xl:px-12 xl:pb-8 xl:pt-[calc(var(--platform-auth-header-height)+1.5rem)] 2xl:px-14 [@media(max-height:800px)]:pb-3 [@media(max-height:800px)]:pt-[calc(var(--platform-auth-header-height)+0.75rem)]`}
          data-platform-auth-left
        >
          <form
            aria-busy={isLoading}
            aria-labelledby="platform-register-title"
            className="mx-auto my-auto min-w-0 w-full max-w-[620px] rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-6 shadow-none sm:p-8 [@media(max-height:800px)]:p-5"
            data-platform-auth-card
            data-platform-register-card
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="mb-5 [@media(max-height:800px)]:mb-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--studio-clay)]">
                {t("form.eyebrow")}
              </p>
              <h1
                className="mt-2 text-[32px] font-medium leading-[1.08] tracking-[-0.035em] text-[var(--studio-blue)] sm:text-[38px] [@media(max-height:800px)]:text-[34px]"
                id="platform-register-title"
              >
                {t("form.title")}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--studio-muted)] [@media(max-height:800px)]:hidden">
                {t("form.description")}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--studio-ink)] xl:hidden [@media(max-height:800px)]:mt-2">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon
                    aria-hidden="true"
                    className="size-4 text-[var(--studio-ink)]"
                  />
                  {t("form.trial")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon
                    aria-hidden="true"
                    className="size-4 text-[var(--studio-ink)]"
                  />
                  {t("form.noCard")}
                </span>
              </div>
            </div>

            <div className="space-y-4 [@media(max-height:800px)]:space-y-3">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [@media(max-height:800px)]:gap-3">
                <div className="min-w-0">
                  <label
                    className="mb-1.5 block text-sm font-semibold"
                    htmlFor="platform-firstname"
                  >
                    {t("form.firstNameLabel")}
                  </label>
                  <input
                    aria-describedby={
                      showFieldError("firstname")
                        ? "platform-firstname-error"
                        : undefined
                    }
                    aria-invalid={Boolean(showFieldError("firstname"))}
                    autoComplete="given-name"
                    className={inputClassName}
                    id="platform-firstname"
                    name="firstname"
                    onChange={handleChange("firstname")}
                    placeholder={t("form.firstNamePlaceholder")}
                    required
                    type="text"
                    value={form.firstname}
                  />
                  <FieldError
                    id="platform-firstname-error"
                    message={showFieldError("firstname")}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    className="mb-1.5 block text-sm font-semibold"
                    htmlFor="platform-lastname"
                  >
                    {t("form.lastNameLabel")}
                  </label>
                  <input
                    aria-describedby={
                      showFieldError("lastname")
                        ? "platform-lastname-error"
                        : undefined
                    }
                    aria-invalid={Boolean(showFieldError("lastname"))}
                    autoComplete="family-name"
                    className={inputClassName}
                    id="platform-lastname"
                    name="lastname"
                    onChange={handleChange("lastname")}
                    placeholder={t("form.lastNamePlaceholder")}
                    required
                    type="text"
                    value={form.lastname}
                  />
                  <FieldError
                    id="platform-lastname-error"
                    message={showFieldError("lastname")}
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  htmlFor="platform-studio-name"
                >
                  {t("form.studioNameLabel")}
                </label>
                <input
                  aria-describedby={
                    showFieldError("tenantName")
                      ? "platform-studio-name-error"
                      : undefined
                  }
                  aria-invalid={Boolean(showFieldError("tenantName"))}
                  autoComplete="organization"
                  className={inputClassName}
                  id="platform-studio-name"
                  name="tenantName"
                  onChange={handleChange("tenantName")}
                  placeholder={t("form.studioNamePlaceholder")}
                  required
                  type="text"
                  value={form.tenantName}
                />
                <FieldError
                  id="platform-studio-name-error"
                  message={showFieldError("tenantName")}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  htmlFor="platform-workspace-slug"
                >
                  {t("form.workspaceLabel")}
                </label>
                <div
                  className="flex h-12 min-w-0 items-center overflow-hidden rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] transition focus-within:border-[var(--studio-blue)] focus-within:ring-4 focus-within:ring-[var(--studio-blue)]/10 has-[input[aria-invalid=true]]:border-red-400 has-[input[aria-invalid=true]]:ring-4 has-[input[aria-invalid=true]]:ring-red-100 [@media(max-height:800px)]:h-11"
                  data-platform-workspace-control
                >
                  <input
                    aria-describedby={`platform-workspace-hint${
                      showFieldError("slug") ? " platform-workspace-error" : ""
                    }`}
                    aria-invalid={Boolean(showFieldError("slug"))}
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 py-0 text-base shadow-none outline-none ring-0 placeholder:text-[var(--studio-muted)] focus:border-0 focus:outline-none focus:ring-0 sm:text-[15px]"
                    id="platform-workspace-slug"
                    name="slug"
                    onChange={handleChange("slug")}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    placeholder={t("form.workspacePlaceholder")}
                    required
                    spellCheck={false}
                    type="text"
                    value={form.slug}
                  />
                  <span
                    aria-hidden="true"
                    className="flex h-full shrink-0 items-center border-l border-[var(--studio-rule)] bg-transparent px-3 text-xs font-medium text-[var(--studio-muted)] sm:px-4"
                  >
                    .shario.io
                  </span>
                </div>
                <p
                  className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)]"
                  id="platform-workspace-hint"
                >
                  {t("form.workspaceHint", {
                    slug: form.slug || t("form.workspaceExample"),
                  })}
                </p>
                <FieldError
                  id="platform-workspace-error"
                  message={showFieldError("slug")}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  htmlFor="platform-register-email"
                >
                  {t("form.emailLabel")}
                </label>
                <input
                  aria-describedby={
                    showFieldError("email")
                      ? "platform-register-email-error"
                      : undefined
                  }
                  aria-invalid={Boolean(showFieldError("email"))}
                  autoComplete="email"
                  className={inputClassName}
                  id="platform-register-email"
                  inputMode="email"
                  name="email"
                  onChange={handleChange("email")}
                  placeholder={t("form.emailPlaceholder")}
                  required
                  type="email"
                  value={form.email}
                />
                <FieldError
                  id="platform-register-email-error"
                  message={showFieldError("email")}
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [@media(max-height:800px)]:gap-3">
                <div className="min-w-0">
                  <label
                    className="mb-1.5 block text-sm font-semibold"
                    htmlFor="platform-register-password"
                  >
                    {t("form.passwordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      aria-describedby={`platform-password-hint${
                        showFieldError("password")
                          ? " platform-register-password-error"
                          : ""
                      }`}
                      aria-invalid={Boolean(showFieldError("password"))}
                      autoComplete="new-password"
                      className={`${inputClassName} pr-14`}
                      id="platform-register-password"
                      minLength={8}
                      name="password"
                      onChange={handleChange("password")}
                      placeholder={t("form.passwordPlaceholder")}
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                    />
                    <button
                      aria-label={
                        showPassword
                          ? t("form.hidePassword")
                          : t("form.showPassword")
                      }
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-[var(--studio-muted)] transition hover:bg-[var(--studio-soft)] hover:text-[var(--studio-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeSlashIcon aria-hidden="true" className="size-5" />
                      ) : (
                        <EyeIcon aria-hidden="true" className="size-5" />
                      )}
                    </button>
                  </div>
                  <p
                    className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)]"
                    id="platform-password-hint"
                  >
                    {t("form.passwordHint")}
                  </p>
                  <FieldError
                    id="platform-register-password-error"
                    message={showFieldError("password")}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    className="mb-1.5 block text-sm font-semibold"
                    htmlFor="platform-register-password-confirm"
                  >
                    {t("form.passwordConfirmLabel")}
                  </label>
                  <div className="relative">
                    <input
                      aria-describedby={
                        showFieldError("passwordConfirm")
                          ? "platform-register-password-confirm-error"
                          : undefined
                      }
                      aria-invalid={Boolean(showFieldError("passwordConfirm"))}
                      autoComplete="new-password"
                      className={`${inputClassName} pr-14`}
                      id="platform-register-password-confirm"
                      minLength={8}
                      name="passwordConfirm"
                      onChange={handleChange("passwordConfirm")}
                      placeholder={t("form.passwordConfirmPlaceholder")}
                      required
                      type={showPasswordConfirm ? "text" : "password"}
                      value={form.passwordConfirm}
                    />
                    <button
                      aria-label={
                        showPasswordConfirm
                          ? t("form.hidePasswordConfirm")
                          : t("form.showPasswordConfirm")
                      }
                      aria-pressed={showPasswordConfirm}
                      className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-[var(--studio-muted)] transition hover:bg-[var(--studio-soft)] hover:text-[var(--studio-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25"
                      onClick={() =>
                        setShowPasswordConfirm((current) => !current)
                      }
                      type="button"
                    >
                      {showPasswordConfirm ? (
                        <EyeSlashIcon aria-hidden="true" className="size-5" />
                      ) : (
                        <EyeIcon aria-hidden="true" className="size-5" />
                      )}
                    </button>
                  </div>
                  <FieldError
                    id="platform-register-password-confirm-error"
                    message={showFieldError("passwordConfirm")}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-4 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:py-3">
              <label
                className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--studio-ink)]"
                htmlFor="platform-legal-agreement"
                id="platform-legal-label"
              >
                <input
                  aria-describedby={
                    showFieldError("accepted")
                      ? "platform-legal-error"
                      : undefined
                  }
                  aria-invalid={Boolean(showFieldError("accepted"))}
                  checked={accepted}
                  className="mt-1 size-[18px] shrink-0 rounded border-[var(--studio-rule)] accent-[var(--studio-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studio-white)]"
                  id="platform-legal-agreement"
                  onChange={(event) => {
                    setAccepted(event.target.checked);
                    setErrorMessage("");
                  }}
                  required
                  type="checkbox"
                />
                <span>
                  {t("form.legalPrefix")}{" "}
                  <span className="font-semibold text-[var(--studio-ink)]">
                    {t("form.terms")}
                  </span>{" "}
                  {t("form.legalAnd")}{" "}
                  <span className="font-semibold text-[var(--studio-ink)]">
                    {t("form.privacy")}
                  </span>
                  {t("form.legalSuffix")}
                </span>
              </label>
              <FieldError
                id="platform-legal-error"
                message={showFieldError("accepted")}
              />
            </div>

            {errorMessage ? (
              <p
                aria-live="assertive"
                className="mt-4 rounded-[var(--studio-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:py-2"
                ref={errorRef}
                role="alert"
                tabIndex={-1}
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              className="relative mt-5 flex min-h-12 w-full items-center justify-center rounded-[var(--studio-radius)] border border-transparent bg-[var(--studio-blue)] px-7 text-sm font-semibold text-[var(--studio-white)] shadow-none transition hover:bg-[var(--studio-blue-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--studio-blue)]/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-[var(--studio-rule)] disabled:bg-[var(--studio-soft)] disabled:text-[var(--studio-muted)] disabled:opacity-100 disabled:shadow-none disabled:hover:bg-[var(--studio-soft)] motion-reduce:transform-none [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:min-h-11"
              data-platform-auth-submit
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? t("form.submitting") : t("form.submit")}
              {!isLoading ? (
                <ArrowLongRightIcon
                  aria-hidden="true"
                  className="absolute right-5 size-5"
                />
              ) : null}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-[var(--studio-muted)] [@media(max-height:800px)]:mt-2">
              <span>{t("form.alreadyRegistered")}</span>
              <Link
                className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-[var(--studio-blue)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25"
                href="/login"
              >
                {t("form.signIn")}
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--studio-muted)] [@media(max-height:800px)]:hidden">
              <span className="inline-grid size-5 place-items-center rounded-full bg-[var(--studio-soft)] text-[var(--studio-ink)]">
                <LockClosedIcon aria-hidden="true" className="size-3" />
              </span>
              {t("form.secure")}
            </div>
          </form>
        </section>

        <aside
          aria-label={t("story.eyebrow")}
          className={`${authLayoutStyles.fullHeightPanel} relative hidden self-stretch overflow-hidden border-l border-[var(--studio-rule)] bg-[var(--studio-white)] xl:sticky xl:top-0 xl:block`}
          data-platform-auth-full-height
          data-platform-auth-right
          data-platform-auth-visual
          data-platform-register-visual
          style={{
            background: "var(--studio-paper)",
            height: PLATFORM_AUTH_VIEWPORT_HEIGHT,
            minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT,
          }}
        >
          <div className="absolute inset-0 grain-surface opacity-35" />
          <BrushStrokeSwash
            className="-right-[22rem] top-[30%] w-[58rem] rotate-[-8deg] opacity-50 xl:-right-[18rem] xl:w-[68rem]"
            texture="loaded"
            color="#263cd5"
            tone="cobalt"
          />
          <BrushStrokeSwash
            className="-bottom-8 -left-[17rem] w-[52rem] rotate-[7deg] opacity-50 xl:w-[62rem]"
            side="left"
            texture="rake"
            color="#ad4d32"
            tone="coral"
          />

          <div
            className="absolute inset-0 z-10 flex flex-col justify-between p-9 xl:p-12 [@media(max-height:800px)]:p-6"
            style={{
              paddingTop:
                "calc(var(--platform-auth-header-height, 4.5rem) + clamp(1.5rem, 4vh, 3rem))",
            }}
          >
            <div className="max-w-[510px]">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--studio-clay)]">
                {t("story.eyebrow")}
              </p>
              <h2 className="mt-4 text-[42px] font-medium leading-[1.06] tracking-[-0.035em] text-[var(--studio-blue)] xl:text-[52px] [@media(max-height:800px)]:text-[40px]">
                {t("story.titleBefore")}{" "}
                <em className="font-normal not-italic text-[var(--studio-clay)]">
                  {t("story.titleAccent")}
                </em>
              </h2>
              <p className="mt-4 max-w-[460px] text-base leading-7 text-[var(--studio-muted)] [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:text-sm [@media(max-height:800px)]:leading-6">
                {t("story.description")}
              </p>
            </div>

            <div
              className="ml-auto w-full max-w-[350px] rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-5 shadow-none xl:p-6 [@media(max-height:800px)]:p-4"
              data-platform-auth-story-card
            >
              <div className="flex items-center gap-3 border-b border-[var(--studio-rule)] pb-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--studio-radius)] bg-[var(--studio-blue)] text-[var(--studio-white)] shadow-none">
                  <CheckIcon aria-hidden="true" className="size-5 stroke-2" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--studio-muted)]">
                    {t("story.cardLabel")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {t("story.cardTitle")}
                  </p>
                </div>
              </div>
              <ul
                className="mt-4 space-y-3 [@media(max-height:800px)]:space-y-2"
                role="list"
              >
                {["workspace", "setup", "launch"].map((item) => (
                  <li
                    className="flex items-center gap-3 text-sm text-[var(--studio-ink)]"
                    key={item}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--studio-soft)] text-[var(--studio-ink)]">
                      <CheckIcon
                        aria-hidden="true"
                        className="size-3.5 stroke-[2.5]"
                      />
                    </span>
                    {t(`story.${item}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
