"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useState } from "react";
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

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[10px] leading-4 text-[#858580]">
          {hint}
        </span>
      )}
    </label>
  );
}

const controlClass =
  "h-12 w-full min-w-0 rounded-[13px] border border-line bg-white px-4 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-[#F4F2ED] disabled:text-[#858580]";

function WorkspaceSettingsForm({ settings }) {
  const t = useTranslations("WorkspaceSettings");
  const setupT = useTranslations("SetupCenter");
  const onboardingT = useTranslations("Onboarding");
  const guidedSetup = useGuidedSetupStep("studio");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
              ? "flex gap-3 rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
              : "flex gap-3 rounded-[14px] border border-[#CFE0CB] bg-[#F5FAF3] px-4 py-3 text-xs text-[#47613E]"
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
            <h2 className="text-sm font-semibold text-[#292925]">
              {t("business.title")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#777773]">
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
            <div className="rounded-[14px] border border-sand-200 bg-sand-50 p-4 text-[11px] leading-5 text-sand-800">
              <strong className="block text-xs">
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
          <h2 className="text-sm font-semibold text-[#292925]">
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
                className="rounded-[13px] bg-[#F7F5F1] px-4 py-3"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8983]">
                  {label}
                </dt>
                <dd className="mt-1 text-xs font-semibold capitalize text-[#3F3F3B]">
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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-50"
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
        <span className="ml-3 text-[12px] text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {showPageHeader ? (
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#111111] sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#777773]">
            {t("description")}
          </p>
        </header>
      ) : null}
      {isError || !settings ? (
        <div className="rounded-[18px] border border-coral-200 bg-coral-50 p-5">
          <p className="text-xs text-terracotta-700">
            {getErrorMessage(error, t("messages.loadError"))}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 text-xs font-semibold text-terracotta-700 underline"
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
