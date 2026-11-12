"use client";

import {
  BoltIcon,
  CheckCircleIcon,
  CircleStackIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  useGetAiCapabilitiesQuery,
  useGetAiSettingsQuery,
  useGetAiUsageQuery,
  useUpdateAiSettingsMutation,
} from "@/lib/features/ai/aiApiSlice";

import {
  AI_SETTINGS_LOCALE_OPTIONS,
  resolveAiSettingsLocale,
} from "./aiLocaleSettings";
import { getAiErrorMessage } from "./ai.utils";

export const AI_SETTINGS_FEATURE_KEYS = [
  "assistant",
  "dailyBriefing",
  "businessAdvisor",
  "reportInsights",
  "staffPlanning",
  "knowledgeBase",
  "publicConcierge",
  "customerConcierge",
];

const DEFAULT_SETTINGS = {
  enabled: true,
  features: Object.fromEntries(
    AI_SETTINGS_FEATURE_KEYS.map((key) => [key, key !== "publicConcierge"]),
  ),
  preferredLanguage: "en",
  requireActionConfirmation: true,
  moderationEnabled: true,
  briefingTime: "06:00",
  publicConcierge: {
    // Anonymous AI must be an explicit workspace opt-in.
    enabled: false,
    handoffEnabled: true,
  },
};

export const mergeAiSettings = (value = {}) => ({
  ...DEFAULT_SETTINGS,
  enabled: value.enabled ?? DEFAULT_SETTINGS.enabled,
  features: {
    assistant: value.assistantEnabled ?? DEFAULT_SETTINGS.features.assistant,
    dailyBriefing:
      value.dailyBriefingEnabled ?? DEFAULT_SETTINGS.features.dailyBriefing,
    businessAdvisor:
      value.businessAdvisorEnabled ?? DEFAULT_SETTINGS.features.businessAdvisor,
    reportInsights:
      value.reportInsightsEnabled ?? DEFAULT_SETTINGS.features.reportInsights,
    staffPlanning:
      value.staffPlanningEnabled ?? DEFAULT_SETTINGS.features.staffPlanning,
    knowledgeBase:
      value.knowledgeBaseEnabled ?? DEFAULT_SETTINGS.features.knowledgeBase,
    publicConcierge:
      value.publicConciergeEnabled ?? DEFAULT_SETTINGS.features.publicConcierge,
    customerConcierge:
      value.customerConciergeEnabled ??
      DEFAULT_SETTINGS.features.customerConcierge,
  },
  preferredLanguage: resolveAiSettingsLocale(
    value.defaultLocale ??
      value.preferredLanguage ??
      DEFAULT_SETTINGS.preferredLanguage,
  ),
  requireActionConfirmation:
    value.requireActionConfirmation ??
    DEFAULT_SETTINGS.requireActionConfirmation,
  moderationEnabled:
    value.moderationEnabled ?? DEFAULT_SETTINGS.moderationEnabled,
  briefingTime: value.briefingTime ?? DEFAULT_SETTINGS.briefingTime,
  publicConcierge: {
    enabled:
      value.publicConciergeEnabled ?? DEFAULT_SETTINGS.publicConcierge.enabled,
    handoffEnabled:
      value.publicConciergeHandoffEnabled ??
      DEFAULT_SETTINGS.publicConcierge.handoffEnabled,
  },
});

export const toWireAiSettings = (form) => ({
  enabled: Boolean(form.enabled),
  assistantEnabled: Boolean(form.features.assistant),
  dailyBriefingEnabled: Boolean(form.features.dailyBriefing),
  businessAdvisorEnabled: Boolean(form.features.businessAdvisor),
  reportInsightsEnabled: Boolean(form.features.reportInsights),
  staffPlanningEnabled: Boolean(form.features.staffPlanning),
  customerConciergeEnabled: Boolean(form.features.customerConcierge),
  publicConciergeEnabled: Boolean(form.features.publicConcierge),
  publicConciergeHandoffEnabled: Boolean(form.publicConcierge.handoffEnabled),
  knowledgeBaseEnabled: Boolean(form.features.knowledgeBase),
  moderationEnabled: Boolean(form.moderationEnabled),
  defaultLocale: resolveAiSettingsLocale(form.preferredLanguage),
  briefingTime: form.briefingTime,
});

function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={disabled ? "flex gap-4 opacity-55" : "flex gap-4"}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">
          {description}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-cobalt-500 transition disabled:cursor-not-allowed"
            : "relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line-strong transition disabled:cursor-not-allowed"
        }
      >
        <span
          className={
            checked
              ? "absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition"
              : "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition"
          }
        />
      </button>
    </label>
  );
}

export default function AiSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("AI");
  const settingsQuery = useGetAiSettingsQuery();
  const capabilitiesQuery = useGetAiCapabilitiesQuery();
  const usageQuery = useGetAiUsageQuery();
  const [save, saveState] = useUpdateAiSettingsMutation();
  const initialForm = useMemo(
    () => mergeAiSettings(settingsQuery.data),
    [settingsQuery.data],
  );
  const [draft, setDraft] = useState(null);
  const form = draft ?? initialForm;
  const setForm = (updater) => {
    setDraft((current) =>
      typeof updater === "function" ? updater(current ?? initialForm) : updater,
    );
  };
  const [feedback, setFeedback] = useState(null);

  const usage = usageQuery.data ?? {};
  const used = Number(usage.consumed ?? usage.used ?? usage.current ?? 0);
  const limit = Number(usage.limit ?? usage.included ?? 0);
  const remaining = Number(
    usage.remaining ?? (limit > 0 ? Math.max(limit - used, 0) : 0),
  );
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const capabilityCount = useMemo(() => {
    const features =
      capabilitiesQuery.data?.features ?? capabilitiesQuery.data?.capabilities;
    if (!features || typeof features !== "object") {
      return AI_SETTINGS_FEATURE_KEYS.length;
    }
    return AI_SETTINGS_FEATURE_KEYS.filter((key) => features[key] !== false)
      .length;
  }, [capabilitiesQuery.data]);

  const setFeature = (key, value) => {
    setForm((current) => ({
      ...current,
      features: { ...current.features, [key]: value },
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await save(toWireAiSettings(form)).unwrap();
      setForm(mergeAiSettings(response?.settings ?? response ?? form));
      setFeedback({ tone: "success", text: t("settings.saved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getAiErrorMessage(error, t("settings.saveError")),
      });
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center" role="status">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="rounded-[20px] border border-danger/20 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">
          {t("settings.loadError")}
        </p>
        <button
          type="button"
          onClick={() => settingsQuery.refetch()}
          className="mt-4 rounded-full bg-cobalt-500 px-4 py-2.5 text-xs font-semibold text-white"
        >
          {t("settings.retry")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <header
        className={
          showPageHeader
            ? "overflow-hidden rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"
            : ""
        }
      >
        <div
          className={
            showPageHeader
              ? "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
              : "flex justify-end"
          }
        >
          {showPageHeader ? (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                <SparklesIcon className="h-4 w-4" />
                {t("settings.eyebrow")}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-ink">
                {t("settings.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                {t("settings.description")}
              </p>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saveState.isLoading}
            className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:opacity-50"
          >
            {saveState.isLoading ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </header>

      {feedback ? (
        <div
          role="status"
          className={
            feedback.tone === "error"
              ? "rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger"
              : "rounded-[14px] border border-success/20 bg-success-soft px-4 py-3 text-xs text-success"
          }
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [CircleStackIcon, t("settings.usage.used"), used],
          [BoltIcon, t("settings.usage.remaining"), remaining],
          [CheckCircleIcon, t("settings.usage.features"), capabilityCount],
        ].map(([Icon, label, value]) => (
          <article
            key={label}
            className="rounded-[20px] border border-line bg-white p-5 shadow-sm"
          >
            <Icon className="h-5 w-5 text-cobalt-600" />
            <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-ink">
              {value}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{label}</p>
          </article>
        ))}
      </section>

      {limit > 0 ? (
        <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
          <div className="flex justify-between text-xs text-ink-muted">
            <span>{t("settings.usage.monthly")}</span>
            <span>
              {used} / {limit}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
            <span
              className="block h-full rounded-full bg-cobalt-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-[22px] border border-line bg-white shadow-card">
        <div className="border-b border-line p-5 sm:p-6">
          <Toggle
            checked={form.enabled}
            onChange={(enabled) =>
              setForm((current) => ({ ...current, enabled }))
            }
            label={t("settings.master.label")}
            description={t("settings.master.description")}
          />
        </div>
        <div className="grid gap-0 sm:grid-cols-2">
          {AI_SETTINGS_FEATURE_KEYS.map((key) => (
            <div
              key={key}
              className="border-b border-line p-5 sm:p-6 sm:odd:border-r"
            >
              <Toggle
                checked={Boolean(form.features[key])}
                onChange={(value) => setFeature(key, value)}
                label={t(`settings.features.${key}.label`)}
                description={t(`settings.features.${key}.description`)}
                disabled={!form.enabled}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 rounded-[22px] border border-line bg-white p-5 shadow-card sm:grid-cols-2 sm:p-6">
        <Toggle
          checked={form.requireActionConfirmation}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              requireActionConfirmation: value,
            }))
          }
          label={t("settings.safety.confirm.label")}
          description={t("settings.safety.confirm.description")}
          disabled
        />
        <Toggle
          checked={form.moderationEnabled}
          onChange={(value) =>
            setForm((current) => ({ ...current, moderationEnabled: value }))
          }
          label={t("settings.safety.moderation.label")}
          description={t("settings.safety.moderation.description")}
        />
        <Toggle
          checked={form.publicConcierge.handoffEnabled}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              publicConcierge: {
                ...current.publicConcierge,
                handoffEnabled: value,
              },
            }))
          }
          label={t("settings.safety.handoff.label")}
          description={t("settings.safety.handoff.description")}
          disabled={!form.features.publicConcierge}
        />
        <label className="block text-xs font-medium text-ink-muted">
          {t("settings.defaultLocale")}
          <select
            value={form.preferredLanguage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                preferredLanguage: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
          >
            {AI_SETTINGS_LOCALE_OPTIONS.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          {t("settings.briefingTime")}
          <input
            type="time"
            value={form.briefingTime}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                briefingTime: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>
      </section>
    </form>
  );
}
