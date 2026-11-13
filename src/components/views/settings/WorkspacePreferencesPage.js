"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import {
  useGetCurrentWorkspaceAccessQuery,
  useUpdateWorkspacePreferencesMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";

const TIMEZONES = [
  "Europe/Prague",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Warsaw",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Zurich",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Asia/Tokyo",
];

const LANDING_PAGES = [
  "/app",
  "/app/calendar",
  "/app/bookings",
  "/app/users",
  "/app/products",
  "/app/operations",
];

const EVENT_NOTIFICATION_KEYS = [
  "bookingAssigned",
  "bookingCancelled",
  "taskAssigned",
  "inventoryAlerts",
];

const CHANNEL_NOTIFICATION_KEYS = ["inApp", "email"];

const controlClass =
  "h-12 w-full min-w-0 rounded-[13px] border border-line bg-white px-4 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function PreferenceForm({ preferences, locations }) {
  const t = useTranslations("WorkspacePreferences");
  const [form, setForm] = useState({
    displayTimezone: preferences.displayTimezone || "",
    defaultLocation: preferences.defaultLocation || "",
    defaultCalendarView: preferences.defaultCalendarView || "week",
    weekStartsOn: Number(preferences.weekStartsOn) === 0 ? 0 : 1,
    defaultLandingPage: preferences.defaultLandingPage || "/app",
    notifications: {
      bookingAssigned: preferences.notifications?.bookingAssigned !== false,
      bookingCancelled: preferences.notifications?.bookingCancelled !== false,
      taskAssigned: preferences.notifications?.taskAssigned !== false,
      inventoryAlerts: preferences.notifications?.inventoryAlerts !== false,
      email: preferences.notifications?.email !== false,
      inApp: preferences.notifications?.inApp !== false,
    },
  });
  const [notice, setNotice] = useState(null);
  const [updatePreferences, { isLoading }] =
    useUpdateWorkspacePreferencesMutation();

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateNotification = (key, value) =>
    setForm((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    try {
      await updatePreferences({
        displayTimezone: form.displayTimezone || null,
        defaultLocation: form.defaultLocation || null,
        defaultCalendarView: form.defaultCalendarView,
        weekStartsOn: form.weekStartsOn,
        defaultLandingPage: form.defaultLandingPage,
        notifications: form.notifications,
      }).unwrap();
      setNotice({ type: "success", message: t("messages.saved") });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("messages.error")),
      });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "error"
              ? "rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
              : "flex items-center gap-2 rounded-[14px] border border-[#CFE0CB] bg-[#F5FAF3] px-4 py-3 text-xs text-[#47613E]"
          }
        >
          {notice.type === "success" && (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          )}
          {notice.message}
        </p>
      )}

      <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]">
        <div className="flex items-start gap-3 border-b border-line bg-surface-muted px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700">
            <CalendarDaysIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#292925]">
              {t("workspace.title")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#777773]">
              {t("workspace.description")}
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
              {t("fields.timezone")}
            </span>
            <select
              value={form.displayTimezone}
              onChange={(event) =>
                update("displayTimezone", event.target.value)
              }
              className={controlClass}
            >
              <option value="">{t("inherit")}</option>
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
              {t("fields.defaultLocation")}
            </span>
            <select
              value={form.defaultLocation}
              onChange={(event) =>
                update("defaultLocation", event.target.value)
              }
              className={controlClass}
            >
              <option value="">{t("automatic")}</option>
              {locations.map((location) => (
                <option
                  key={getLocationId(location)}
                  value={getLocationId(location)}
                >
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
              {t("fields.calendarView")}
            </span>
            <select
              value={form.defaultCalendarView}
              onChange={(event) =>
                update("defaultCalendarView", event.target.value)
              }
              className={controlClass}
            >
              {["day", "week", "month"].map((view) => (
                <option key={view} value={view}>
                  {t(`calendarViews.${view}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
              {t("fields.weekStartsOn")}
            </span>
            <select
              value={form.weekStartsOn}
              onChange={(event) =>
                update("weekStartsOn", Number(event.target.value))
              }
              className={controlClass}
            >
              <option value={1}>{t("weekDays.monday")}</option>
              <option value={0}>{t("weekDays.sunday")}</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
              {t("fields.landingPage")}
            </span>
            <select
              value={form.defaultLandingPage}
              onChange={(event) =>
                update("defaultLandingPage", event.target.value)
              }
              className={controlClass}
            >
              {LANDING_PAGES.map((path) => (
                <option key={path} value={path}>
                  {t(`landingPages.${path.replaceAll("/", "_") || "_app"}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]">
        <div className="flex items-start gap-3 border-b border-line bg-surface-muted px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-100 text-terracotta-700">
            <BellIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#292925]">
              {t("notifications.title")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#777773]">
              {t("notifications.description")}
            </p>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          {[
            {
              title: t("notifications.eventsTitle"),
              keys: EVENT_NOTIFICATION_KEYS,
            },
            {
              title: t("notifications.channelsTitle"),
              keys: CHANNEL_NOTIFICATION_KEYS,
            },
          ].map((group) => (
            <fieldset key={group.title}>
              <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777773]">
                {group.title}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    aria-disabled={key === "email" ? "true" : undefined}
                    className={`flex min-w-0 items-start justify-between gap-4 rounded-[14px] border border-line px-4 py-3.5 ${
                      key === "email"
                        ? "cursor-not-allowed bg-surface-muted/60 opacity-70"
                        : "cursor-pointer"
                    }`}
                  >
                    <span className="min-w-0">
                      <strong className="block text-xs text-[#292925]">
                        {t(`notifications.items.${key}.label`)}
                      </strong>
                      <span className="mt-1 block text-[10px] leading-4 text-[#858580]">
                        {t(`notifications.items.${key}.description`)}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.notifications[key]}
                      disabled={key === "email"}
                      onChange={(event) =>
                        updateNotification(key, event.target.checked)
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-50"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <ClockIcon className="h-4 w-4" />
          )}
          {isLoading ? t("actions.saving") : t("actions.save")}
        </button>
      </div>
    </form>
  );
}

export default function WorkspacePreferencesPage({ showPageHeader = true }) {
  const t = useTranslations("WorkspacePreferences");
  const storedAccess = useSelector(selectCurrentWorkspaceAccess);
  const accessQuery = useGetCurrentWorkspaceAccessQuery();
  const locationsQuery = useGetLocationsQuery({ isActive: true, limit: 100 });
  const access =
    accessQuery.data?.workspaceAccess || accessQuery.data || storedAccess;
  const preferences = access?.preferences;
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );

  if (accessQuery.isLoading || locationsQuery.isLoading) {
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
      {accessQuery.isError || !preferences ? (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {getErrorMessage(accessQuery.error, t("messages.loadError"))}
        </p>
      ) : (
        <PreferenceForm
          key={`${access?.membershipId || "me"}-${access?.authorizationVersion || access?.accessVersion || 0}`}
          preferences={preferences}
          locations={locations}
        />
      )}
    </section>
  );
}
