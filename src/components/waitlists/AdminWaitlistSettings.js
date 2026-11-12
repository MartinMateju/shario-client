"use client";

import { ArrowPathIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useGetAdminWaitlistSettingsQuery,
  useUpdateAdminWaitlistSettingsMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  autoPromote: true,
  offerWindowHours: 24,
  cutoffHours: 2,
});

export default function AdminWaitlistSettings({
  sessionId,
  canManage = false,
  modules = {},
}) {
  const t = useTranslations("Waitlists.admin.settings");
  const enabledByModules =
    modules?.courses !== false && modules?.payments !== false;
  const query = useGetAdminWaitlistSettingsQuery(
    { sessionId },
    { skip: !sessionId || !canManage || !enabledByModules },
  );
  const [update, updateState] = useUpdateAdminWaitlistSettingsMutation();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const values = draft ?? query.data ?? DEFAULT_SETTINGS;

  if (!canManage || !enabledByModules) return null;

  const change = (key, value) => {
    setDraft((current) => ({
      ...(current ?? query.data ?? DEFAULT_SETTINGS),
      [key]: value,
    }));
    setSaved(false);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    try {
      const settings = await update({ sessionId, settings: values }).unwrap();
      setDraft(settings);
      setSaved(true);
    } catch (requestError) {
      setError(requestError?.data?.message || t("error"));
    }
  };

  return (
    <section
      className="rounded-[22px] border border-[#E5E1DA] bg-[#FAF8F4] p-5"
      data-admin-waitlist-settings
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-white text-primary-text shadow-sm">
          <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[#292925]">{t("title")}</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#686762]">
            {t("description")}
          </p>
        </div>
      </div>

      {query.isLoading ? (
        <div
          className="mt-5 flex min-h-24 items-center justify-center text-xs text-[#686762]"
          role="status"
        >
          <ArrowPathIcon
            className="mr-2 h-4 w-4 animate-spin"
            aria-hidden="true"
          />
          {t("loading")}
        </div>
      ) : query.isError ? (
        <div
          className="mt-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-xs text-red-700"
          role="alert"
        >
          {t("loadError")}
          <button
            type="button"
            onClick={query.refetch}
            className="ml-2 font-semibold underline"
          >
            {t("retry")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="flex min-h-12 items-start gap-3 rounded-[15px] border border-[#E5E1DA] bg-white p-3">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(event) => change("enabled", event.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-[#CFCAC1] text-primary-text"
            />
            <span>
              <span className="block text-xs font-semibold">
                {t("enabled")}
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-[#777771]">
                {t("enabledHint")}
              </span>
            </span>
          </label>

          <label className="flex min-h-12 items-start gap-3 rounded-[15px] border border-[#E5E1DA] bg-white p-3">
            <input
              type="checkbox"
              checked={values.autoPromote}
              onChange={(event) => change("autoPromote", event.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-[#CFCAC1] text-primary-text"
            />
            <span>
              <span className="block text-xs font-semibold">
                {t("autoPromote")}
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-[#777771]">
                {t("autoPromoteHint")}
              </span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-[#4F4C48]">
              {t("offerWindow")}
              <input
                type="number"
                min="1"
                max="168"
                value={values.offerWindowHours}
                onChange={(event) =>
                  change("offerWindowHours", Number(event.target.value))
                }
                className="mt-1.5 min-h-11 w-full rounded-[12px] border border-[#D8D3CA] bg-white px-3 text-sm"
              />
            </label>
            <label className="text-[11px] font-semibold text-[#4F4C48]">
              {t("cutoff")}
              <input
                type="number"
                min="0"
                max="168"
                value={values.cutoffHours}
                onChange={(event) =>
                  change("cutoffHours", Number(event.target.value))
                }
                className="mt-1.5 min-h-11 w-full rounded-[12px] border border-[#D8D3CA] bg-white px-3 text-sm"
              />
            </label>
          </div>

          <p className="text-[10px] leading-4 text-[#777771]">
            {t("cutoffHint")}
          </p>
          <button
            type="submit"
            disabled={updateState.isLoading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-primary px-5 text-xs font-semibold text-white disabled:opacity-55 sm:w-auto"
          >
            {updateState.isLoading ? t("saving") : t("save")}
          </button>
          {saved ? (
            <span
              className="ml-3 text-xs font-semibold text-emerald-700"
              role="status"
            >
              {t("saved")}
            </span>
          ) : null}
          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
