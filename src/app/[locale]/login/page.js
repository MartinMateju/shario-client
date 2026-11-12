"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLongRightIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { getPostLoginUrl } from "@/components/auth/platformAuthRouting";
import { PLATFORM_AUTH_VIEWPORT_HEIGHT } from "@/components/auth/platformAuthLayout";
import authLayoutStyles from "@/components/auth/platformAuthLayout.module.css";
import "@/styles/publicStudioTheme.css";
import PlatformAuthCanvasBrushes from "@/components/auth/PlatformAuthCanvasBrushes";
import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
  selectIsSessionReady,
} from "@/lib/features/auth/authSlice";
import { useLoginMutation } from "@/lib/features/auth/authApiSlice";
import { useHydrated } from "@/hooks/useHydrated";
import {
  buildTenantUrl,
  getTenantSlugFromWorkspaceInput,
} from "@/utils/tenantRouting";

const getErrorMessage = (error, t) => {
  if (
    !error?.status ||
    error.status === "FETCH_ERROR" ||
    error.status === "TIMEOUT_ERROR"
  ) {
    return t("errors.server");
  }

  if (error.status === "PARSING_ERROR") {
    return t("errors.invalidResponse");
  }

  if (error.status === 400) {
    return error?.data?.message || t("errors.checkInformation");
  }

  if (error.status === 401) {
    return t("errors.incorrectCredentials");
  }

  if (error.status === 403) {
    return t("errors.disabled");
  }

  if (error.status === 404) {
    return t("errors.workspaceNotFound");
  }

  if (error.status === 429) {
    return t("errors.rateLimited");
  }

  return error?.data?.message || t("errors.signInFailed");
};

export default function PlatformLoginPage() {
  const hydrated = useHydrated();
  const locale = useLocale();
  const t = useTranslations("PlatformAuth.login");
  const workspaceInputRef = useRef(null);
  const errorRef = useRef(null);

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const sessionReady = useSelector(selectIsSessionReady);
  const currentTenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const currentWorkspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const [login, { isLoading }] = useLoginMutation();

  const [form, setForm] = useState({
    tenantSlug: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberWorkspace, setRememberWorkspace] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const normalizedWorkspace = useMemo(
    () => getTenantSlugFromWorkspaceInput(form.tenantSlug),
    [form.tenantSlug],
  );

  useEffect(() => {
    const savedWorkspace = window.localStorage.getItem("shario:last-workspace");

    if (!savedWorkspace) {
      return;
    }

    const savedSlug = getTenantSlugFromWorkspaceInput(savedWorkspace);

    if (!savedSlug) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setForm((current) => ({
        ...current,
        tenantSlug: savedSlug,
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sessionReady || !isAuthenticated || !currentUser) {
      return;
    }

    try {
      window.location.replace(
        getPostLoginUrl({
          user: currentUser,
          tenant: currentTenant,
          workspaceAccess: currentWorkspaceAccess,
          authContext: currentUser.authContext,
          locale,
        }),
      );
    } catch {
      // Keep the form available if persisted authentication is incomplete.
    }
  }, [
    currentTenant,
    currentUser,
    currentWorkspaceAccess,
    isAuthenticated,
    locale,
    sessionReady,
  ]);

  const isValid = useMemo(() => {
    const validEmail = /\S+@\S+\.\S+/.test(form.email);

    return Boolean(
      normalizedWorkspace && validEmail && form.password.length > 0,
    );
  }, [form.email, form.password.length, normalizedWorkspace]);

  const handleChange = (field) => (event) => {
    const rawValue = event.target.value;
    const value =
      field === "tenantSlug"
        ? getTenantSlugFromWorkspaceInput(rawValue) ||
          rawValue.toLowerCase().trim()
        : field === "email"
          ? rawValue.toLowerCase().replace(/\s+/g, "")
          : rawValue;

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrorMessage("");
  };

  const showError = (message, focusWorkspace = false) => {
    setErrorMessage(message);
    window.requestAnimationFrame(() => {
      if (focusWorkspace) {
        workspaceInputRef.current?.focus();
        return;
      }

      errorRef.current?.focus();
    });
  };

  const handleForgotPassword = () => {
    const tenantSlug = getTenantSlugFromWorkspaceInput(form.tenantSlug);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) {
      showError(t("guidance.workspaceRequired"), true);
      return;
    }

    if (rememberWorkspace) {
      window.localStorage.setItem("shario:last-workspace", tenantSlug);
    } else {
      window.localStorage.removeItem("shario:last-workspace");
    }

    window.location.assign(
      buildTenantUrl({
        slug: tenantSlug,
        locale,
        pathname: "/password?source=platform",
      }),
    );
  };

  const handleFindWorkspace = () => {
    window.localStorage.removeItem("shario:last-workspace");
    setForm((current) => ({ ...current, tenantSlug: "" }));
    showError(t("guidance.workspaceCleared"), true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValid || isLoading) {
      return;
    }

    setErrorMessage("");

    try {
      const result = await login({
        tenantSlug: normalizedWorkspace,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }).unwrap();

      if (rememberWorkspace) {
        window.localStorage.setItem(
          "shario:last-workspace",
          normalizedWorkspace,
        );
      } else {
        window.localStorage.removeItem("shario:last-workspace");
      }

      window.location.replace(
        getPostLoginUrl({
          user: result.user,
          tenant: result.tenant,
          workspaceAccess: result.workspaceAccess,
          authContext: result.authContext,
          locale,
        }),
      );
    } catch (error) {
      showError(getErrorMessage(error, t));
    }
  };

  return (
    <main
      className={`${authLayoutStyles.viewport} ${authLayoutStyles.authPage} relative isolate overflow-x-clip bg-[var(--studio-paper)] text-[var(--studio-ink)]`}
      data-skab-public-surface
      data-platform-auth-page
      data-platform-login-page
      style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
    >
      <PlatformAuthCanvasBrushes />

      <div
        className={`${authLayoutStyles.viewport} grid grid-cols-[minmax(0,1fr)] xl:grid-cols-2`}
        data-platform-auth-grid
        style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
      >
        <section
          className="relative z-10 flex min-w-0 flex-col overflow-y-auto px-4 pb-5 pt-[calc(var(--platform-auth-header-height)+1rem)] sm:px-8 sm:pb-7 sm:pt-[calc(var(--platform-auth-header-height)+1.25rem)] lg:px-10 xl:px-12 xl:pb-8 xl:pt-[calc(var(--platform-auth-header-height)+1.5rem)] 2xl:px-14 [@media(max-height:800px)]:pb-3 [@media(max-height:800px)]:pt-[calc(var(--platform-auth-header-height)+0.75rem)]"
          data-platform-auth-left
        >
          <form
            aria-busy={isLoading}
            aria-labelledby="platform-login-title"
            className="mx-auto my-auto min-w-0 w-full max-w-[620px] rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-6 shadow-none sm:p-8 [@media(max-height:800px)]:p-5"
            data-platform-auth-card
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="mb-5 [@media(max-height:800px)]:mb-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--studio-clay)]">
                {t("form.eyebrow")}
              </p>
              <h1
                className="mt-2 text-[32px] font-medium leading-[1.08] tracking-[-0.035em] text-[var(--studio-blue)] sm:text-[38px] [@media(max-height:800px)]:text-[34px]"
                id="platform-login-title"
              >
                {t("form.title")}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[var(--studio-muted)] [@media(max-height:800px)]:hidden">
                {t("form.description")}
              </p>
            </div>

            <div className="space-y-4 [@media(max-height:800px)]:space-y-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-1 sm:gap-4">
                  <div className="relative inline-flex min-w-0 items-center">
                    <label
                      className="text-sm font-semibold"
                      htmlFor="workspace-slug"
                    >
                      {t("form.workspaceLabel")}
                    </label>

                    <Popover className="static">
                      <PopoverButton
                        aria-label={t("form.workspaceHelp.open")}
                        className="relative ml-0.5 grid size-11 shrink-0 place-items-center rounded-full text-[var(--studio-muted)] transition hover:bg-[var(--studio-soft)] hover:text-[var(--studio-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25"
                        data-platform-workspace-help-trigger
                      >
                        <QuestionMarkCircleIcon
                          aria-hidden="true"
                          className="size-[18px] stroke-[1.6]"
                        />
                      </PopoverButton>

                      <Transition
                        as={Fragment}
                        enter="transition duration-200 ease-out"
                        enterFrom="translate-y-1 scale-[0.98] opacity-0"
                        enterTo="translate-y-0 scale-100 opacity-100"
                        leave="transition duration-150 ease-in"
                        leaveFrom="translate-y-0 scale-100 opacity-100"
                        leaveTo="translate-y-1 scale-[0.98] opacity-0"
                      >
                        <PopoverPanel
                          aria-label={t("form.workspaceHelp.title")}
                          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-3rem))] rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] p-4 shadow-none focus:outline-none"
                          data-platform-workspace-help-panel
                        >
                          <p className="text-[13px] font-semibold tracking-[-0.015em] text-[var(--studio-ink)]">
                            {t("form.workspaceHelp.title")}
                          </p>
                          <p className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)]">
                            {t("form.workspaceHelp.description")}
                          </p>
                        </PopoverPanel>
                      </Transition>
                    </Popover>
                  </div>
                  <button
                    className="min-h-11 shrink-0 rounded-full px-1 text-xs font-semibold text-[var(--studio-blue)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25 sm:px-2"
                    onClick={handleFindWorkspace}
                    type="button"
                  >
                    {t("form.findWorkspace")}
                  </button>
                </div>
                <div
                  className="flex h-12 items-center overflow-hidden rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] transition focus-within:border-[var(--studio-blue)] focus-within:ring-4 focus-within:ring-[var(--studio-blue)]/10 [@media(max-height:800px)]:h-11"
                  data-platform-workspace-control
                >
                  <input
                    aria-describedby="workspace-hint"
                    autoCapitalize="none"
                    autoComplete="organization"
                    autoCorrect="off"
                    className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 py-0 text-base shadow-none outline-none ring-0 placeholder:text-[var(--studio-muted)] focus:border-0 focus:outline-none focus:ring-0 sm:text-[15px]"
                    id="workspace-slug"
                    disabled={!hydrated}
                    onChange={handleChange("tenantSlug")}
                    placeholder={t("form.workspacePlaceholder")}
                    ref={workspaceInputRef}
                    required
                    spellCheck={false}
                    type="text"
                    value={form.tenantSlug}
                  />
                  <span
                    aria-hidden="true"
                    className="flex h-full shrink-0 items-center border-l border-[var(--studio-rule)] bg-transparent px-3 text-xs font-medium text-[var(--studio-muted)] sm:px-4"
                  >
                    .shario.io
                  </span>
                </div>
                <p className="sr-only" id="workspace-hint">
                  {t("form.workspaceHint")}
                </p>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  htmlFor="platform-email"
                >
                  {t("form.emailLabel")}
                </label>
                <input
                  autoComplete="email"
                  className="h-12 min-w-0 w-full rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] px-4 text-base outline-none transition placeholder:text-[var(--studio-muted)] focus:border-[var(--studio-blue)] focus:ring-4 focus:ring-[var(--studio-blue)]/10 sm:text-[15px] [@media(max-height:800px)]:h-11"
                  id="platform-email"
                  disabled={!hydrated}
                  inputMode="email"
                  onChange={handleChange("email")}
                  placeholder={t("form.emailPlaceholder")}
                  required
                  type="email"
                  value={form.email}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold"
                  htmlFor="platform-password"
                >
                  {t("form.passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="h-12 min-w-0 w-full rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-white)] px-4 pr-14 text-base outline-none transition placeholder:text-[var(--studio-muted)] focus:border-[var(--studio-blue)] focus:ring-4 focus:ring-[var(--studio-blue)]/10 sm:text-[15px] [@media(max-height:800px)]:h-11"
                    id="platform-password"
                    disabled={!hydrated}
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
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 [@media(max-height:800px)]:mt-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--studio-muted)]">
                <input
                  checked={rememberWorkspace}
                  className="size-[18px] rounded border-[var(--studio-rule)] accent-[var(--studio-blue)]"
                  onChange={(event) =>
                    setRememberWorkspace(event.target.checked)
                  }
                  type="checkbox"
                />
                {t("form.rememberWorkspace")}
              </label>
              <button
                className="min-h-11 rounded-full px-2 text-right text-sm font-semibold text-[var(--studio-blue)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]/25"
                onClick={handleForgotPassword}
                type="button"
              >
                {t("form.forgotPassword")}
              </button>
            </div>

            {errorMessage ? (
              <p
                aria-live="assertive"
                className="mt-3 rounded-[var(--studio-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 [@media(max-height:800px)]:py-2"
                ref={errorRef}
                role="alert"
                tabIndex={-1}
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              className="relative mt-4 flex min-h-12 w-full items-center justify-center rounded-[var(--studio-radius)] border border-transparent bg-[var(--studio-blue)] px-7 text-sm font-semibold text-[var(--studio-white)] shadow-none transition hover:bg-[var(--studio-blue-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--studio-blue)]/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-[var(--studio-rule)] disabled:bg-[var(--studio-soft)] disabled:text-[var(--studio-muted)] disabled:opacity-100 disabled:shadow-none disabled:hover:bg-[var(--studio-soft)] motion-reduce:transform-none [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:min-h-11"
              data-platform-auth-submit
              disabled={!isValid || isLoading}
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

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[var(--studio-muted)] [@media(max-height:800px)]:hidden">
              <span className="inline-grid size-5 place-items-center rounded-full bg-[var(--studio-soft)] text-[var(--studio-ink)]">
                <LockClosedIcon aria-hidden="true" className="size-3" />
              </span>
              {t("form.secure")}
            </div>
          </form>
        </section>

        <aside
          aria-label={t("story.eyebrow")}
          className={`${authLayoutStyles.fullHeightPanel} relative hidden self-stretch overflow-hidden border-l border-[var(--studio-rule)] bg-[var(--studio-white)] xl:block`}
          data-platform-auth-full-height
          data-platform-auth-right
          data-platform-auth-visual
          style={{
            background: "var(--studio-paper)",
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
                    {t("story.pulseLabel")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {t("story.pulse")}
                  </p>
                </div>
              </div>
              <ul
                className="mt-4 space-y-3 [@media(max-height:800px)]:space-y-2"
                role="list"
              >
                {["bookings", "team", "operations"].map((item) => (
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
