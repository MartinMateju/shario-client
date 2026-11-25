"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  "bookingCreated",
  "bookingAssigned",
  "bookingCancelled",
  "taskAssigned",
  "inventoryAlerts",
];

const CHANNEL_NOTIFICATION_KEYS = ["inApp", "email"];

const controlClass =
  "h-12 w-full min-w-0 rounded-[13px] border border-line bg-white px-4 text-base text-ink outline-none sm:text-[14px] transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function PreferenceForm({ preferences, locations }) {
  const t = useTranslations("WorkspacePreferences");
  const formRef = useRef(null);
  useLayoutEffect(() => {
    // The form mounts after its data queries complete, which can be later
    // than Next's initial hash scroll. Restore only these known destinations.
    const anchor = window.location.hash;
    if (
      anchor === "#workspace-preferences" ||
      anchor === "#notification-preferences"
    ) {
      formRef.current
        ?.querySelector(anchor)
        ?.scrollIntoView({ block: "start" });
    }
  }, []);
  const [form, setForm] = useState({
    displayTimezone: preferences.displayTimezone || "",
    defaultLocation: preferences.defaultLocation || "",
    defaultCalendarView: preferences.defaultCalendarView || "week",
    weekStartsOn: Number(preferences.weekStartsOn) === 0 ? 0 : 1,
    defaultLandingPage: preferences.defaultLandingPage || "/app",
    notifications: {
      bookingCreated: preferences.notifications?.bookingCreated === true,
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
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "error"
              ? "rounded-[14px] border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-danger"
              : "flex items-center gap-2 rounded-[14px] border border-success/40 bg-success-soft px-4 py-3 text-[13px] text-success"
          }
        >
          {notice.type === "success" && (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          )}
          {notice.message}
        </p>
      )}

      <section
        id="workspace-preferences"
        className="scroll-mt-28 overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]"
      >
        <div className="flex items-start gap-3 border-b border-line bg-surface-muted px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700">
            <CalendarDaysIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              {t("workspace.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
              {t("workspace.description")}
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
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
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
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
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
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
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
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
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
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

      <section
        id="notification-preferences"
        className="scroll-mt-28 overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]"
      >
        <div className="flex items-start gap-3 border-b border-line bg-surface-muted px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            <BellIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              {t("notifications.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
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
              <legend className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
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
                      <strong className="block text-[13px] text-ink">
                        {t(`notifications.items.${key}.label`)}
                      </strong>
                      <span className="mt-1 block text-[13px] leading-5 text-ink-muted">
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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-[14px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:opacity-50"
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
      {accessQuery.isError || !preferences ? (
        <p
          role="alert"
          className="rounded-[14px] border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-danger"
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
