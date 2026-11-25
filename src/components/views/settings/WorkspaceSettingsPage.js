"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { getLocaleDefinition } from "@/i18n/locales";
import { getCountryOptions, getTimeZoneOptions } from "@/config/regions";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  STUDIO_COMMERCE_CURRENCIES,
  getCurrencyOptions,
} from "@/config/currencies";
import {
  useGetWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { STUDIO_TYPES } from "@/components/onboarding/onboarding.constants";
import {
  buildWorkspaceLocalePayload,
  normalizeWorkspaceLocaleForm,
} from "./workspaceLocaleSettings";

export {
  buildWorkspaceLocalePayload,
  normalizeWorkspaceLocaleForm,
} from "./workspaceLocaleSettings";

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function Field({ label, hint, children, id, fieldRef }) {
  return (
    <label id={id} ref={fieldRef} className="block scroll-mt-28">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[13px] leading-5 text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

const controlClass =
  "h-12 w-full min-w-0 rounded-[13px] border border-line bg-white px-4 text-base text-ink outline-none sm:text-[14px] transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-surface-muted disabled:text-ink-muted";

function WorkspaceSettingsForm({ settings }) {
  const t = useTranslations("WorkspaceSettings");
  const setupT = useTranslations("SetupCenter");
  const onboardingT = useTranslations("Onboarding");
  const guidedSetup = useGuidedSetupStep("studio");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const languageFieldRef = useRef(null);
  useLayoutEffect(() => {
    // The form can arrive after Next's initial hash scroll has already run.
    if (window.location.hash === "#workspace-language") {
      languageFieldRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);
  const initialLocaleForm = normalizeWorkspaceLocaleForm(
    settings,
    routing.locales,
  );
  const [form, setForm] = useState({
    name: settings.name || "",
    businessType: settings.businessType || "",
    country: settings.country || "",
    ...initialLocaleForm,
    currency: settings.currency || "EUR",
    timezone: settings.timezone || "Europe/Prague",
  });
  const [notice, setNotice] = useState(null);
  const [updateSettings, { isLoading }] = useUpdateWorkspaceSettingsMutation();
  const currencyOptions = getCurrencyOptions(
    STUDIO_COMMERCE_CURRENCIES,
    locale,
  );
  const localeOptions = routing.locales.map((localeCode) => {
    const definition = getLocaleDefinition(localeCode);

    return {
      value: localeCode,
      label: definition?.nativeName || localeCode.toUpperCase(),
      shortLabel: definition?.shortLabel || localeCode.toUpperCase(),
    };
  });

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    try {
      const localePayload = buildWorkspaceLocalePayload(form, routing.locales);

      await updateSettings({
        name: form.name.trim(),
        ...(form.businessType ? { businessType: form.businessType } : {}),
        ...(form.country ? { country: form.country } : {}),
        ...localePayload,
        currency: form.currency,
        timezone: form.timezone,
      }).unwrap();
      if (guidedSetup.guided) {
        await guidedSetup.refreshAndContinue({
          metadata: { form: "workspace_settings" },
        });
        return;
      }
      setNotice({ type: "success", message: t("messages.saved") });
      if (localePayload.adminLanguage !== locale) {
        const queryString = searchParams?.toString();
        const currentHref = queryString
          ? `${pathname || "/"}?${queryString}`
          : pathname || "/";

        router.replace(`${currentHref}${window.location.hash}`, {
          locale: localePayload.adminLanguage,
          scroll: false,
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("messages.error")),
      });
    }
  };

  return (
    <form
      onSubmit={submit}
      data-guided-form={guidedSetup.guided ? "studio" : undefined}
      className="space-y-5"
    >
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "error"
              ? "flex gap-3 rounded-[14px] border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-danger"
              : "flex gap-3 rounded-[14px] border border-success/40 bg-success-soft px-4 py-3 text-[13px] text-success"
          }
        >
          {notice.type === "error" ? (
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          )}
          {notice.message}
        </div>
      )}

      <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]">
        <div className="flex items-start gap-3 border-b border-line bg-surface-muted px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700">
            <BuildingOffice2Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              {t("business.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
              {t("business.description")}
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label={t("fields.name")}>
            <input
              required
              minLength={1}
              maxLength={120}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className={controlClass}
            />
          </Field>
          {guidedSetup.guided ? (
            <>
              <Field label={onboardingT("studio.typeQuestion")}>
                <select
                  required
                  value={form.businessType}
                  onChange={(event) =>
                    update("businessType", event.target.value)
                  }
                  className={controlClass}
                >
                  <option value="" disabled>
                    {onboardingT("validation.businessType")}
                  </option>
                  {STUDIO_TYPES.map(({ value }) => (
                    <option key={value} value={value}>
                      {onboardingT(`studio.types.${value}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={onboardingT("business.country")}>
                <select
                  required
                  value={form.country}
                  onChange={(event) => update("country", event.target.value)}
                  className={controlClass}
                >
                  <option value="" disabled>
                    {onboardingT("validation.country")}
                  </option>
                  {getCountryOptions(locale, form.country).map(
                    ({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </>
          ) : null}
          {!guidedSetup.guided ? (
            <Field label={t("fields.slug")} hint={t("hints.slug")}>
              <input
                value={settings.slug || ""}
                disabled
                className={controlClass}
              />
            </Field>
          ) : null}
          <Field
            id="workspace-language"
            fieldRef={languageFieldRef}
            label={t("fields.adminLanguage")}
            hint={t("hints.adminLanguage")}
          >
            <select
              value={form.adminLanguage}
              onChange={(event) => update("adminLanguage", event.target.value)}
              className={controlClass}
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.shortLabel})
                </option>
              ))}
            </select>
          </Field>
          {!guidedSetup.guided ? (
            <>
              <Field
                label={t("fields.publicDefaultLanguage")}
                hint={t("hints.publicDefaultLanguage")}
              >
                <select
                  value={form.publicDefaultLanguage}
                  onChange={(event) => {
                    const nextLanguage = event.target.value;

                    setForm((current) => ({
                      ...current,
                      publicDefaultLanguage: nextLanguage,
                      secondaryPublicLanguage:
                        current.secondaryPublicLanguage === nextLanguage
                          ? ""
                          : current.secondaryPublicLanguage,
                    }));
                  }}
                  className={controlClass}
                >
                  {localeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.shortLabel})
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={t("fields.secondaryPublicLanguage")}
                hint={t("hints.secondaryPublicLanguage")}
              >
                <select
                  value={form.secondaryPublicLanguage}
                  onChange={(event) =>
                    update("secondaryPublicLanguage", event.target.value)
                  }
                  className={controlClass}
                >
                  <option value="">{t("languageOptions.noSecondary")}</option>
                  {localeOptions
                    .filter(
                      (option) => option.value !== form.publicDefaultLanguage,
                    )
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.shortLabel})
                      </option>
                    ))}
                </select>
              </Field>
            </>
          ) : null}
          <Field label={t("fields.timezone")} hint={t("hints.timezone")}>
            <select
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              className={controlClass}
            >
              {getTimeZoneOptions(form.timezone).map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("fields.currency")} hint={t("hints.currency")}>
            <select
              value={form.currency}
              onChange={(event) => update("currency", event.target.value)}
              className={controlClass}
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          {!guidedSetup.guided ? (
            <div className="rounded-[14px] border border-sand-200 bg-sand-50 p-4 text-[13px] leading-5 text-sand-800">
              <strong className="block text-[13px]">
                {t("currencyNotice.title")}
              </strong>
              <span className="mt-1 block">
                {t("currencyNotice.description")}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {!guidedSetup.guided ? (
        <section className="rounded-[20px] border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,17,15,0.04)]">
          <h2 className="text-sm font-semibold text-ink">
            {t("workspaceStatus.title")}
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [t("workspaceStatus.plan"), settings.plan],
              [t("workspaceStatus.status"), settings.status],
              [t("workspaceStatus.version"), settings.planVersion],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[13px] bg-surface-muted px-4 py-3"
              >
                <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-[14px] font-semibold capitalize text-ink">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            isLoading ||
            !form.name.trim() ||
            (guidedSetup.guided && (!form.businessType || !form.country))
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-[14px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
          {isLoading
            ? t("actions.saving")
            : guidedSetup.guided
              ? setupT("guided.saveAndContinue")
              : t("actions.save")}
        </button>
      </div>
    </form>
  );
}

export default function WorkspaceSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("WorkspaceSettings");
  const { data, isLoading, isError, error, refetch } =
    useGetWorkspaceSettingsQuery();
  const settings =
    data?.settings || data?.tenant?.settings || data?.tenant || data;

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-[13px] text-ink-muted">{t("loading")}</span>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {showPageHeader ? (
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-ink sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink-muted">
            {t("description")}
          </p>
        </header>
      ) : null}
      {isError || !settings ? (
        <div className="rounded-[18px] border border-danger/40 bg-danger-soft p-5">
          <p className="text-[13px] text-danger">
            {getErrorMessage(error, t("messages.loadError"))}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 text-[13px] font-semibold text-danger underline"
          >
            {t("actions.retry")}
          </button>
        </div>
      ) : (
        <WorkspaceSettingsForm
          key={settings.updatedAt || settings.id || "settings"}
          settings={settings}
        />
      )}
    </section>
  );
}
