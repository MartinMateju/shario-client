"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  useGetCommunicationSettingsQuery,
  useConnectInstagramCommunicationMutation,
  useDisconnectInstagramCommunicationMutation,
  useUpdateCommunicationSettingsMutation,
} from "@/lib/features/communications/communicationsApiSlice";

import {
  ErrorState,
  ChannelBadge,
  LoadingState,
  StatusBanner,
  Toggle,
} from "./CommunicationsPrimitives";
import {
  extractMutationMessage,
  formatDateTime,
  unwrapResource,
} from "./communications.utils";

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const defaultSettings = {
  inbox: {
    forwardingLocalPart: "",
    senderName: "",
    senderEmail: "",
    replyToEmail: "",
    defaultAssignee: null,
  },
  channels: {
    email: { enabled: true, provider: "smtp", inboundEnabled: false },
    whatsapp: {
      enabled: false,
      provider: "meta_cloud_api",
      phoneNumberId: "",
      businessAccountId: "",
      accessToken: "",
      tokenConfigured: false,
    },
    instagram: {
      enabled: false,
      provider: "meta",
      instagramAccountId: "",
      username: "",
      tokenExpiresAt: null,
      connectedAt: null,
      tokenConfigured: false,
      connectionStatus: "disconnected",
      reconnectRequired: false,
    },
    inApp: { enabled: true },
  },
  businessHours: {
    timezone: "Europe/Prague",
    ...Object.fromEntries(
      weekdays.map((day, index) => [
        day,
        { enabled: index < 5, open: "09:00", close: "17:00" },
      ]),
    ),
    holidays: [],
  },
  absence: { enabled: false, message: "", repeatAfterHours: 24 },
  quietHours: {
    enabled: true,
    start: "21:00",
    end: "08:00",
    allowUrgent: true,
  },
  delivery: {
    maxAttempts: 3,
    retryBaseSeconds: 60,
    fallbackOrder: ["instagram", "whatsapp", "email", "in_app"],
  },
  retention: { days: 730, redactInsteadOfDelete: true, retainAuditDays: 2555 },
  satisfaction: { enabled: true, sendForCategories: [], cooldownDays: 30 },
  ai: {
    enabled: true,
    autoCategorize: true,
    autoRoute: false,
    draftReplies: true,
    autoApplyConfidence: 0.8,
    preferredStaffLanguage: "en",
  },
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings,
  inbox: { ...defaultSettings.inbox, ...(settings.inbox ?? {}) },
  channels: {
    ...defaultSettings.channels,
    ...(settings.channels ?? {}),
    email: {
      ...defaultSettings.channels.email,
      ...(settings.channels?.email ?? {}),
    },
    whatsapp: {
      ...defaultSettings.channels.whatsapp,
      ...(settings.channels?.whatsapp ?? {}),
      accessToken: "",
    },
    instagram: {
      ...defaultSettings.channels.instagram,
      ...(settings.channels?.instagram ?? {}),
    },
    inApp: {
      ...defaultSettings.channels.inApp,
      ...(settings.channels?.inApp ?? {}),
    },
  },
  businessHours: {
    ...defaultSettings.businessHours,
    ...(settings.businessHours ?? {}),
    ...Object.fromEntries(
      weekdays.map((day) => [
        day,
        {
          ...defaultSettings.businessHours[day],
          ...(settings.businessHours?.[day] ?? {}),
        },
      ]),
    ),
  },
  absence: { ...defaultSettings.absence, ...(settings.absence ?? {}) },
  quietHours: { ...defaultSettings.quietHours, ...(settings.quietHours ?? {}) },
  delivery: { ...defaultSettings.delivery, ...(settings.delivery ?? {}) },
  retention: { ...defaultSettings.retention, ...(settings.retention ?? {}) },
  satisfaction: {
    ...defaultSettings.satisfaction,
    ...(settings.satisfaction ?? {}),
  },
  ai: { ...defaultSettings.ai, ...(settings.ai ?? {}) },
});

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen = false,
}) {
  return (
    <details
      className="group border-b border-line last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 sm:px-6">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-100 text-sand-800">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-ink-muted">
            {description}
          </span>
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-line bg-sand-50/50 px-5 py-5 sm:px-6">
        {children}
      </div>
    </details>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      {label}
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[11px] leading-5 text-ink-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function CommunicationsSettingsForm({
  initialSettings,
  canManage,
  canManageAi,
  onRefetch,
  guided = false,
  onGuidedSaved,
}) {
  const t = useTranslations("Communications");
  const setupT = useTranslations("SetupCenter");
  const locale = useLocale();
  const [form, setForm] = useState(() => mergeSettings(initialSettings));
  const [renderedAt] = useState(() => Date.now());
  const [feedback, setFeedback] = useState(null);
  const [saveSettings, { isLoading }] =
    useUpdateCommunicationSettingsMutation();
  const [getInstagramConnectUrl, { isLoading: isConnectingInstagram }] =
    useConnectInstagramCommunicationMutation();
  const [disconnectInstagram, { isLoading: isDisconnectingInstagram }] =
    useDisconnectInstagramCommunicationMutation();

  const setSection = (section, key, value) => {
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };

  const setChannel = (channel, key, value) => {
    setForm((current) => ({
      ...current,
      channels: {
        ...current.channels,
        [channel]: { ...current.channels[channel], [key]: value },
      },
    }));
  };

  const setDay = (day, key, value) => {
    setForm((current) => ({
      ...current,
      businessHours: {
        ...current.businessHours,
        [day]: { ...current.businessHours[day], [key]: value },
      },
    }));
  };

  const save = async () => {
    setFeedback(null);
    try {
      const whatsapp = { ...form.channels.whatsapp };
      delete whatsapp.tokenConfigured;
      if (!whatsapp.accessToken.trim()) delete whatsapp.accessToken;
      const instagram = {
        enabled: form.channels.instagram.enabled,
      };
      await saveSettings({
        ...form,
        channels: { ...form.channels, whatsapp, instagram },
      }).unwrap();
      if (guided) {
        await onGuidedSaved?.();
        return;
      }
      setFeedback({ tone: "success", text: t("feedback.settingsSaved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: extractMutationMessage(error, t("feedback.settingsError")),
      });
    }
  };

  const whatsappStatus =
    form.channels.whatsapp.businessAccountId &&
    form.channels.whatsapp.phoneNumberId &&
    form.channels.whatsapp.tokenConfigured
      ? "connected"
      : "disconnected";
  const instagramTokenExpiry = form.channels.instagram.tokenExpiresAt
    ? new Date(form.channels.instagram.tokenExpiresAt).getTime()
    : Number.NaN;
  const backendInstagramStatus = String(
    form.channels.instagram.connectionStatus ?? "",
  ).toLowerCase();
  const instagramStatus = [
    "connected",
    "expiring",
    "expired",
    "reconnect_required",
    "disconnected",
  ].includes(backendInstagramStatus)
    ? backendInstagramStatus
    : form.channels.instagram.instagramAccountId &&
        form.channels.instagram.tokenConfigured
      ? Number.isFinite(instagramTokenExpiry) &&
        instagramTokenExpiry <= renderedAt
        ? "expired"
        : form.channels.instagram.reconnectRequired
          ? "reconnect_required"
          : "connected"
      : "disconnected";
  const instagramUsable = ["connected", "expiring"].includes(instagramStatus);

  const connectInstagram = async () => {
    setFeedback(null);
    try {
      const result = await getInstagramConnectUrl().unwrap();
      const connection =
        unwrapResource(result, "connection") ??
        unwrapResource(result, "instagram") ??
        result?.data ??
        result;
      const authorizationUrl =
        connection?.authorizationUrl ?? connection?.url ?? "";
      if (!authorizationUrl) {
        throw new Error(t("settings.instagram.connectError"));
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      setFeedback({
        tone: "error",
        text: extractMutationMessage(
          error,
          t("settings.instagram.connectError"),
        ),
      });
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!window.confirm(t("settings.instagram.disconnectConfirm"))) return;
    setFeedback(null);
    try {
      await disconnectInstagram().unwrap();
      setForm((current) => ({
        ...current,
        channels: {
          ...current.channels,
          instagram: { ...defaultSettings.channels.instagram },
        },
      }));
      setFeedback({
        tone: "success",
        text: t("settings.instagram.disconnected"),
      });
      onRefetch();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: extractMutationMessage(
          error,
          t("settings.instagram.disconnectError"),
        ),
      });
    }
  };

  return (
    <>
      <div className="rounded-[26px] border border-line bg-white shadow-card">
        <SettingsSection
          icon={EnvelopeIcon}
          title={t("settings.channels.title")}
          description={t("settings.channels.description")}
          defaultOpen
        >
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[18px] border border-line bg-white p-4">
              <Toggle
                checked={form.channels.email.enabled}
                onChange={(checked) => setChannel("email", "enabled", checked)}
                label={t("settings.email.enabled")}
                description={t("settings.email.enabledHint")}
                disabled={!canManage}
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("settings.email.senderName")}>
                  <input
                    value={form.inbox.senderName}
                    onChange={(event) =>
                      setSection("inbox", "senderName", event.target.value)
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Field
                  label={t("settings.email.senderEmail")}
                  hint={t("settings.email.verificationHint")}
                >
                  <input
                    type="email"
                    value={form.inbox.senderEmail}
                    onChange={(event) =>
                      setSection("inbox", "senderEmail", event.target.value)
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
              </div>
            </div>

            {!guided ? (
              <div className="rounded-[18px] border border-line bg-white p-4">
                <Toggle
                  checked={form.channels.whatsapp.enabled}
                  onChange={(checked) =>
                    setChannel("whatsapp", "enabled", checked)
                  }
                  label={t("settings.whatsapp.enabled")}
                  description={t("settings.whatsapp.enabledHint")}
                  disabled={!canManage}
                />
                <div className="mt-4 flex items-center justify-between gap-4 rounded-[13px] bg-sand-50 p-3">
                  <div>
                    <p className="text-xs font-medium text-ink">
                      {form.channels.whatsapp.phoneNumberId ||
                        t("settings.whatsapp.noNumber")}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                      {humanizeStatus(whatsappStatus)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${whatsappStatus === "connected" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
                  >
                    {whatsappStatus === "connected" ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    )}
                    {t(
                      `settings.whatsapp.statuses.${whatsappStatus === "connected" ? "connected" : "disconnected"}`,
                    )}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label={t("settings.whatsapp.businessAccountId")}>
                    <input
                      value={form.channels.whatsapp.businessAccountId}
                      onChange={(event) =>
                        setChannel(
                          "whatsapp",
                          "businessAccountId",
                          event.target.value,
                        )
                      }
                      disabled={!canManage}
                      className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                    />
                  </Field>
                  <Field label={t("settings.whatsapp.phoneNumberId")}>
                    <input
                      value={form.channels.whatsapp.phoneNumberId}
                      onChange={(event) =>
                        setChannel(
                          "whatsapp",
                          "phoneNumberId",
                          event.target.value,
                        )
                      }
                      disabled={!canManage}
                      className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                    />
                  </Field>
                  <Field
                    label={t("settings.whatsapp.accessToken")}
                    hint={t("settings.whatsapp.accessTokenHint")}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.channels.whatsapp.accessToken}
                      onChange={(event) =>
                        setChannel(
                          "whatsapp",
                          "accessToken",
                          event.target.value,
                        )
                      }
                      disabled={!canManage}
                      placeholder={t(
                        "settings.whatsapp.accessTokenPlaceholder",
                      )}
                      className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                    />
                  </Field>
                  <Field label={t("settings.whatsapp.provider")}>
                    <input
                      value="Meta Cloud API"
                      readOnly
                      className="mt-1.5 w-full rounded-[13px] border-line bg-sand-50 text-sm text-ink-muted"
                    />
                  </Field>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-ink-muted">
                  {t("settings.whatsapp.manualHint")}
                </p>
              </div>
            ) : null}

            {!guided ? (
              <div className="rounded-[18px] border border-line bg-white p-4">
                <Toggle
                  checked={form.channels.instagram.enabled}
                  onChange={(checked) =>
                    setChannel("instagram", "enabled", checked)
                  }
                  label={t("settings.instagram.enabled")}
                  description={t("settings.instagram.enabledHint")}
                  disabled={!canManage || !instagramUsable}
                />

                <div className="mt-4 rounded-[15px] bg-gradient-to-br from-fuchsia-50 via-white to-coral-50 p-3 ring-1 ring-inset ring-fuchsia-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <ChannelBadge channel="instagram" />
                      <p className="mt-2 truncate text-xs font-semibold text-ink">
                        {form.channels.instagram.username
                          ? `@${String(form.channels.instagram.username).replace(/^@/, "")}`
                          : t("settings.instagram.noAccount")}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                        {form.channels.instagram.instagramAccountId ||
                          t("settings.instagram.professionalAccount")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${instagramStatus === "connected" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
                    >
                      {instagramStatus === "connected" ? (
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                      ) : (
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                      )}
                      {t(`settings.instagram.statuses.${instagramStatus}`)}
                    </span>
                  </div>

                  {instagramStatus !== "disconnected" ? (
                    <div className="mt-3 space-y-1 border-t border-fuchsia-100 pt-3 text-[10px] text-ink-muted">
                      {form.channels.instagram.connectedAt ? (
                        <p>
                          {t("settings.instagram.connectedAt", {
                            date: formatDateTime(
                              form.channels.instagram.connectedAt,
                              locale,
                            ),
                          })}
                        </p>
                      ) : null}
                      {form.channels.instagram.tokenExpiresAt ? (
                        <p>
                          {t("settings.instagram.tokenExpiresAt", {
                            date: formatDateTime(
                              form.channels.instagram.tokenExpiresAt,
                              locale,
                            ),
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={connectInstagram}
                    disabled={!canManage || isConnectingInstagram}
                    className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-cobalt-600 disabled:opacity-50"
                  >
                    {isConnectingInstagram
                      ? t("settings.instagram.connecting")
                      : instagramStatus === "disconnected"
                        ? t("settings.instagram.connect")
                        : t("settings.instagram.reconnect")}
                  </button>
                  {instagramStatus !== "disconnected" ? (
                    <button
                      type="button"
                      onClick={handleDisconnectInstagram}
                      disabled={!canManage || isDisconnectingInstagram}
                      className="rounded-full border border-line-strong bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-sand-50 disabled:opacity-50"
                    >
                      {isDisconnectingInstagram
                        ? t("settings.instagram.disconnecting")
                        : t("settings.instagram.disconnect")}
                    </button>
                  ) : null}
                </div>

                <p className="mt-3 text-[11px] leading-5 text-ink-muted">
                  {t("settings.instagram.oauthHint")}
                </p>
              </div>
            ) : null}
          </div>
        </SettingsSection>

        {!guided ? (
          <>
            <SettingsSection
              icon={BuildingOffice2Icon}
              title={t("settings.mailbox.title")}
              description={t("settings.mailbox.description")}
            >
              <div className="space-y-5">
                <Toggle
                  checked={form.channels.email.inboundEnabled}
                  onChange={(checked) =>
                    setChannel("email", "inboundEnabled", checked)
                  }
                  label={t("settings.mailbox.enabled")}
                  description={t("settings.mailbox.enabledHint")}
                  disabled={!canManage}
                />
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <Field
                    label={t("settings.mailbox.forwardingAddress")}
                    hint={t("settings.mailbox.forwardingHint")}
                  >
                    <div className="mt-1.5 flex rounded-[13px] border border-line bg-sand-50">
                      <input
                        value={form.inbox.forwardingLocalPart}
                        onChange={(event) =>
                          setSection(
                            "inbox",
                            "forwardingLocalPart",
                            event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, ""),
                          )
                        }
                        disabled={!canManage}
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink focus:ring-0"
                      />
                      <span className="self-center border-l border-line px-3 text-xs text-ink-muted">
                        @inbound.shario.io
                      </span>
                    </div>
                  </Field>
                  <Field
                    label={t("settings.email.replyToEmail")}
                    hint={t("settings.email.replyToEmailHint")}
                  >
                    <input
                      type="email"
                      value={form.inbox.replyToEmail}
                      onChange={(event) =>
                        setSection("inbox", "replyToEmail", event.target.value)
                      }
                      disabled={!canManage}
                      className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                    />
                  </Field>
                </div>
                <StatusBanner tone="info">
                  {t("settings.mailbox.loopProtection")}
                </StatusBanner>
              </div>
            </SettingsSection>

            <SettingsSection
              icon={ClockIcon}
              title={t("settings.hours.title")}
              description={t("settings.hours.description")}
            >
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                  <p className="text-xs leading-5 text-ink-muted">
                    {t("settings.hours.enabledHint")}
                  </p>
                  <Field label={t("settings.hours.timezone")}>
                    <input
                      value={form.businessHours.timezone}
                      onChange={(event) =>
                        setSection(
                          "businessHours",
                          "timezone",
                          event.target.value,
                        )
                      }
                      disabled={!canManage}
                      className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                    />
                  </Field>
                </div>
                <div className="overflow-hidden rounded-[18px] border border-line bg-white">
                  {weekdays.map((day) => {
                    const schedule = form.businessHours[day] ?? {};
                    return (
                      <div
                        key={day}
                        className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[160px_1fr]"
                      >
                        <label className="flex items-center gap-3 text-xs font-medium text-ink">
                          <input
                            type="checkbox"
                            checked={Boolean(schedule.enabled)}
                            onChange={(event) =>
                              setDay(day, "enabled", event.target.checked)
                            }
                            disabled={!canManage}
                            className="rounded border-line text-cobalt-500 focus:ring-cobalt-200"
                          />
                          {t(`settings.hours.days.${day}`)}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={schedule.open ?? "09:00"}
                            onChange={(event) =>
                              setDay(day, "open", event.target.value)
                            }
                            disabled={!canManage || !schedule.enabled}
                            className="h-9 rounded-[11px] border-line py-1 text-xs focus:border-cobalt-300 focus:ring-cobalt-200"
                          />
                          <span className="text-xs text-ink-subtle">–</span>
                          <input
                            type="time"
                            value={schedule.close ?? "17:00"}
                            onChange={(event) =>
                              setDay(day, "close", event.target.value)
                            }
                            disabled={!canManage || !schedule.enabled}
                            className="h-9 rounded-[11px] border-line py-1 text-xs focus:border-cobalt-300 focus:ring-cobalt-200"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-[18px] border border-line bg-white p-4">
                  <Toggle
                    checked={form.absence.enabled}
                    onChange={(checked) =>
                      setSection("absence", "enabled", checked)
                    }
                    label={t("settings.absence.enabled")}
                    description={t("settings.absence.enabledHint")}
                    disabled={!canManage}
                  />
                  {form.absence.enabled ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
                      <Field
                        label={t("settings.absence.message")}
                        hint={t("settings.absence.loopHint")}
                      >
                        <textarea
                          value={form.absence.message}
                          onChange={(event) =>
                            setSection("absence", "message", event.target.value)
                          }
                          disabled={!canManage}
                          rows={3}
                          className="mt-3 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                        />
                      </Field>
                      <Field label={t("settings.absence.repeatAfterHours")}>
                        <input
                          type="number"
                          min="1"
                          value={form.absence.repeatAfterHours}
                          onChange={(event) =>
                            setSection(
                              "absence",
                              "repeatAfterHours",
                              Number(event.target.value),
                            )
                          }
                          disabled={!canManage}
                          className="mt-3 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              icon={SparklesIcon}
              title={t("settings.ai.title")}
              description={t("settings.ai.description")}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  ["enabled", "master"],
                  ["autoCategorize", "categorize"],
                  ["autoRoute", "route"],
                  ["draftReplies", "draft"],
                ].map(([key, label]) => (
                  <Toggle
                    key={key}
                    checked={Boolean(form.ai[key])}
                    onChange={(checked) => setSection("ai", key, checked)}
                    label={t(`settings.ai.${label}`)}
                    description={t(`settings.ai.${label}Hint`)}
                    disabled={
                      !canManageAi || (key !== "enabled" && !form.ai.enabled)
                    }
                  />
                ))}
                <Field
                  label={t("settings.ai.confidence")}
                  hint={t("settings.ai.confidenceHint")}
                >
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={form.ai.autoApplyConfidence}
                      onChange={(event) =>
                        setSection(
                          "ai",
                          "autoApplyConfidence",
                          Number(event.target.value),
                        )
                      }
                      disabled={!canManageAi}
                      className="w-full accent-cobalt-500"
                    />
                    <span className="w-11 text-right text-xs font-semibold text-ink">
                      {Math.round(form.ai.autoApplyConfidence * 100)}%
                    </span>
                  </div>
                </Field>
                <Field
                  label={t("settings.ai.staffLanguage")}
                  hint={t("settings.ai.staffLanguageHint")}
                >
                  <select
                    value={form.ai.preferredStaffLanguage}
                    onChange={(event) =>
                      setSection(
                        "ai",
                        "preferredStaffLanguage",
                        event.target.value,
                      )
                    }
                    disabled={!canManageAi}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  >
                    <option value="en">English</option>
                    <option value="cs">Čeština</option>
                  </select>
                </Field>
              </div>
            </SettingsSection>

            <SettingsSection
              icon={ShieldCheckIcon}
              title={t("settings.safeguards.title")}
              description={t("settings.safeguards.description")}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label={t("settings.safeguards.retries")}
                  hint={t("settings.safeguards.retriesHint")}
                >
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.delivery.maxAttempts}
                    onChange={(event) =>
                      setSection(
                        "delivery",
                        "maxAttempts",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Field
                  label={t("settings.safeguards.retryBaseSeconds")}
                  hint={t("settings.safeguards.retryBaseSecondsHint")}
                >
                  <input
                    type="number"
                    min="1"
                    value={form.delivery.retryBaseSeconds}
                    onChange={(event) =>
                      setSection(
                        "delivery",
                        "retryBaseSeconds",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Field
                  label={t("settings.safeguards.fallback")}
                  hint={t("settings.safeguards.fallbackHint")}
                >
                  <input
                    value={form.delivery.fallbackOrder.join(", ")}
                    onChange={(event) =>
                      setSection(
                        "delivery",
                        "fallbackOrder",
                        event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter((value) =>
                            [
                              "email",
                              "whatsapp",
                              "instagram",
                              "in_app",
                            ].includes(value),
                          ),
                      )
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Toggle
                  checked={form.quietHours.enabled}
                  onChange={(checked) =>
                    setSection("quietHours", "enabled", checked)
                  }
                  label={t("settings.safeguards.quietHours")}
                  description={t("settings.safeguards.quietHoursHint")}
                  disabled={!canManage}
                />
                {form.quietHours.enabled ? (
                  <div className="flex items-end gap-3">
                    <Field label={t("settings.safeguards.from")}>
                      <input
                        type="time"
                        value={form.quietHours.start}
                        onChange={(event) =>
                          setSection("quietHours", "start", event.target.value)
                        }
                        disabled={!canManage}
                        className="mt-1.5 w-full rounded-[13px] border-line text-sm"
                      />
                    </Field>
                    <Field label={t("settings.safeguards.to")}>
                      <input
                        type="time"
                        value={form.quietHours.end}
                        onChange={(event) =>
                          setSection("quietHours", "end", event.target.value)
                        }
                        disabled={!canManage}
                        className="mt-1.5 w-full rounded-[13px] border-line text-sm"
                      />
                    </Field>
                  </div>
                ) : null}
                <Toggle
                  checked={form.quietHours.allowUrgent}
                  onChange={(checked) =>
                    setSection("quietHours", "allowUrgent", checked)
                  }
                  label={t("settings.safeguards.allowUrgent")}
                  description={t("settings.safeguards.allowUrgentHint")}
                  disabled={!canManage || !form.quietHours.enabled}
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["deduplication", "conditionRecheck", "cancelOnChange"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-[14px] bg-success-soft p-3 text-xs text-success"
                    >
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t(`settings.safeguards.active.${item}`)}</span>
                    </div>
                  ),
                )}
              </div>
            </SettingsSection>

            <SettingsSection
              icon={LockClosedIcon}
              title={t("settings.privacy.title")}
              description={t("settings.privacy.description")}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label={t("settings.privacy.retentionDays")}
                  hint={t("settings.privacy.retentionHint")}
                >
                  <input
                    type="number"
                    min="30"
                    value={form.retention.days}
                    onChange={(event) =>
                      setSection(
                        "retention",
                        "days",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Field label={t("settings.privacy.auditDays")}>
                  <input
                    type="number"
                    min="365"
                    value={form.retention.retainAuditDays}
                    onChange={(event) =>
                      setSection(
                        "retention",
                        "retainAuditDays",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canManage}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Toggle
                  checked={form.retention.redactInsteadOfDelete}
                  onChange={(checked) =>
                    setSection("retention", "redactInsteadOfDelete", checked)
                  }
                  label={t("settings.privacy.redact")}
                  description={t("settings.privacy.redactHint")}
                  disabled={!canManage}
                />
                <Toggle
                  checked={form.satisfaction.enabled}
                  onChange={(checked) =>
                    setSection("satisfaction", "enabled", checked)
                  }
                  label={t("settings.satisfaction.enabled")}
                  description={t("settings.satisfaction.enabledHint")}
                  disabled={!canManage}
                />
                <Field
                  label={t("settings.satisfaction.cooldown")}
                  hint={t("settings.satisfaction.cooldownHint")}
                >
                  <input
                    type="number"
                    min="1"
                    value={form.satisfaction.cooldownDays}
                    onChange={(event) =>
                      setSection(
                        "satisfaction",
                        "cooldownDays",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canManage || !form.satisfaction.enabled}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
                <Field
                  label={t("settings.satisfaction.categories")}
                  hint={t("settings.satisfaction.categoriesHint")}
                >
                  <input
                    value={form.satisfaction.sendForCategories.join(", ")}
                    onChange={(event) =>
                      setSection(
                        "satisfaction",
                        "sendForCategories",
                        event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      )
                    }
                    disabled={!canManage || !form.satisfaction.enabled}
                    className="mt-1.5 w-full rounded-[13px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                  />
                </Field>
              </div>
            </SettingsSection>
          </>
        ) : null}
      </div>

      <div className="sticky bottom-4 z-10 mt-5 flex flex-col gap-3 rounded-[20px] border border-line bg-white/95 p-4 shadow-floating backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {feedback ? (
            <StatusBanner tone={feedback.tone}>{feedback.text}</StatusBanner>
          ) : (
            <p className="text-xs text-ink-muted">
              {canManage
                ? t("settings.saveHint")
                : t("permissions.settingsReadOnly")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!guided ? (
            <button
              type="button"
              onClick={() => {
                setForm(mergeSettings(initialSettings));
                setFeedback(null);
                onRefetch();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-xs font-semibold text-ink"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              {t("actions.reset")}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              onClick={save}
              disabled={isLoading}
              className="rounded-full bg-cobalt-500 px-5 py-2.5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-50"
            >
              {isLoading
                ? t("actions.saving")
                : guided
                  ? setupT("guided.saveAndContinue")
                  : t("actions.saveChanges")}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

const humanizeStatus = (value) => String(value ?? "").replaceAll("_", " ");

export default function CommunicationsSettingsView({
  canManage,
  canManageAi = false,
  guided = false,
  onGuidedSaved,
}) {
  const t = useTranslations("Communications");
  const { data, isLoading, isError, refetch } =
    useGetCommunicationSettingsQuery();
  const settings = unwrapResource(data, "settings") ?? {};
  const settingsKey =
    settings.updatedAt ?? settings.version ?? JSON.stringify(settings);

  if (isLoading)
    return (
      <div className="rounded-[26px] border border-line bg-white shadow-card">
        <LoadingState label={t("loading.settings")} />
      </div>
    );
  if (isError)
    return (
      <div className="rounded-[26px] border border-line bg-white shadow-card">
        <ErrorState
          title={t("errors.settingsTitle")}
          description={t("errors.settingsDescription")}
          actionLabel={t("actions.retry")}
          onRetry={refetch}
        />
      </div>
    );

  return (
    <CommunicationsSettingsForm
      key={settingsKey}
      initialSettings={settings}
      canManage={canManage}
      canManageAi={canManageAi}
      onRefetch={refetch}
      guided={guided}
      onGuidedSaved={onGuidedSaved}
    />
  );
}
