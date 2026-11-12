"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSelector, useStore } from "react-redux";
import { useTranslations } from "next-intl";
import { PaintBrushIcon } from "@heroicons/react/24/outline";

import {
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import {
  PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS,
  mergePortalAppearance,
  normalizePortalAppearance,
} from "@/components/public-tenant/publicTenantPortalAppearance";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import {
  createAuthRequestSnapshot,
  isAuthRequestBoundaryCurrent,
  isAuthRequestForSamePrincipal,
} from "@/lib/features/auth/authSession";
import { useUpdateCustomerPreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

export const CUSTOMER_PORTAL_COLOR_PRESETS = Object.freeze({
  light: {
    backgroundColor: "#F5F7FA",
    surfaceColor: "#FFFFFF",
    textColor: "#172033",
    headingColor: "#172033",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#172033",
    calendarBackgroundColor: "#FFFFFF",
    calendarTextColor: "#172033",
    primaryButtonColor: "#2455B5",
    profileMenuBackgroundColor: "#FFFFFF",
  },
  dark: {
    backgroundColor: "#111827",
    surfaceColor: "#1F2937",
    textColor: "#F3F4F6",
    headingColor: "#FFFFFF",
    headerBackgroundColor: "#111827",
    headerTextColor: "#F3F4F6",
    calendarBackgroundColor: "#1F2937",
    calendarTextColor: "#F3F4F6",
    primaryButtonColor: "#93C5FD",
    profileMenuBackgroundColor: "#1F2937",
  },
  highContrast: {
    backgroundColor: "#000000",
    surfaceColor: "#000000",
    textColor: "#FFFFFF",
    headingColor: "#FFFFFF",
    headerBackgroundColor: "#000000",
    headerTextColor: "#FFFFFF",
    calendarBackgroundColor: "#000000",
    calendarTextColor: "#FFFFFF",
    primaryButtonColor: "#FFFF00",
    profileMenuBackgroundColor: "#000000",
  },
});

const colorsMatch = (first, second) =>
  PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.every(
    (key) => first[key] === second[key],
  );

const themeColors = (theme) => ({
  backgroundColor: theme.backgroundColor,
  surfaceColor: theme.surfaceColor,
  textColor: theme.textColor,
  headingColor: theme.headingColor,
  headerBackgroundColor: theme.portalHeaderBackgroundColor,
  headerTextColor: theme.portalHeaderTextColor,
  calendarBackgroundColor: theme.portalCalendarBackgroundColor,
  calendarTextColor: theme.portalCalendarTextColor,
  primaryButtonColor: theme.portalButtonColor,
  profileMenuBackgroundColor: theme.portalProfileBackgroundColor,
});

export default function CustomerPortalAppearanceSettings({ account }) {
  const t = useTranslations("CustomerPortalAppearance");
  const id = useId();
  const context = useOptionalPublicTenant();
  const sessionTenant = useSelector(selectCurrentTenant);
  const studioTenant =
    context?.studioTenant || context?.tenant || sessionTenant;
  const store = useStore();
  const lifecycleRef = useRef(null);
  const accountId = account.id || account._id;
  const tenantSlug = studioTenant?.slug;
  useEffect(() => {
    const lifecycle = { active: true };
    lifecycleRef.current = lifecycle;
    return () => {
      lifecycle.active = false;
    };
  }, [accountId, tenantSlug]);

  const initial = normalizePortalAppearance(account.portalAppearance);
  const [observed, setObserved] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [notice, setNotice] = useState(null);
  const [updatePreferences, { isLoading: isSaving }] =
    useUpdateCustomerPreferencesMutation();

  if (!colorsMatch(observed, initial)) {
    setObserved(initial);
    setSaved(initial);
    setDraft((current) => (colorsMatch(current, saved) ? initial : current));
  }

  const normalized = normalizePortalAppearance(draft);
  const invalidKeys = PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.filter(
    (key) => draft[key].trim() && !normalized[key],
  );
  const canSave = !colorsMatch(saved, normalized) && !invalidKeys.length;
  const studioColors = themeColors(
    getPublicTenantTheme(studioTenant, { surface: "portal" }),
  );
  const previewTheme = getPublicTenantTheme(
    mergePortalAppearance(studioTenant, normalized),
    { surface: "portal" },
  );
  const isStudio = Object.values(normalized).every((value) => !value);

  const save = async (event) => {
    event.preventDefault();
    if (isSaving || !canSave) return;
    const lifecycle = lifecycleRef.current;
    const snapshot = createAuthRequestSnapshot(
      store.getState(),
      AUTH_CONTEXTS.CUSTOMER,
    );
    const isCurrent = () => {
      const state = store.getState();
      return (
        lifecycle?.active &&
        isAuthRequestBoundaryCurrent(state, snapshot) &&
        isAuthRequestForSamePrincipal(state, snapshot)
      );
    };
    setNotice(null);
    try {
      const result = await updatePreferences({
        portalAppearance: normalized,
      }).unwrap();
      if (!isCurrent()) return;
      const next = normalizePortalAppearance(result.account?.portalAppearance);
      setSaved(next);
      setDraft(next);
      setNotice({ type: "success", text: t("saved") });
    } catch {
      if (!isCurrent()) return;
      setNotice({ type: "error", text: t("saveError") });
    }
  };

  const setColor = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice(null);
  };

  return (
    <CustomerPortalSurface
      as="form"
      onSubmit={save}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-background)] px-5 py-4 text-[var(--tenant-text)] sm:px-6">
        <PaintBrushIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <h2 id={`${id}-title`} className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--tenant-muted-text)]">
            {t("description")}
          </p>
        </div>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isSaving} className="min-w-0 space-y-5">
          <legend className="mb-3 text-sm font-semibold">
            {t("presetLabel")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              aria-pressed={isStudio}
              onClick={() => {
                setDraft(normalizePortalAppearance());
                setNotice(null);
              }}
              className={`${customerPortalSecondaryActionClass} flex-col rounded-2xl p-4 aria-pressed:border-[var(--tenant-accent-on-surface)] aria-pressed:ring-2 aria-pressed:ring-[var(--tenant-accent-on-surface)]`}
            >
              <span>{t("studio")}</span>
              <span className="text-[11px] font-normal">
                {t("studioDescription")}
              </span>
            </button>
            {Object.entries(CUSTOMER_PORTAL_COLOR_PRESETS).map(
              ([key, colors]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={colorsMatch(normalized, colors)}
                  onClick={() => {
                    setDraft({ ...colors });
                    setNotice(null);
                  }}
                  className={`${customerPortalSecondaryActionClass} flex-col rounded-2xl p-4 aria-pressed:border-[var(--tenant-accent-on-surface)] aria-pressed:ring-2 aria-pressed:ring-[var(--tenant-accent-on-surface)]`}
                >
                  <span
                    className="flex overflow-hidden rounded-full border border-[var(--tenant-border)]"
                    aria-hidden="true"
                  >
                    {[
                      colors.backgroundColor,
                      colors.textColor,
                      colors.primaryButtonColor,
                    ].map((color, index) => (
                      <span
                        key={index}
                        className="h-4 w-6"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {t(`presets.${key}`)}
                </button>
              ),
            )}
          </div>
          <div
            role="img"
            aria-label={t("previewLabel")}
            className="overflow-hidden rounded-2xl border border-[var(--tenant-border)]"
            style={previewTheme.style}
          >
            <div
              className="flex items-center justify-between p-4"
              style={{
                backgroundColor: previewTheme.portalHeaderBackgroundColor,
                color: previewTheme.portalHeaderTextColor,
              }}
            >
              <span className="text-sm font-semibold">
                {t("preview.header")}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: previewTheme.portalButtonColor,
                  color: previewTheme.portalButtonForeground,
                }}
              >
                {t("preview.action")}
              </span>
            </div>
            <div
              className="space-y-3 p-4"
              style={{
                backgroundColor: previewTheme.backgroundColor,
                color: previewTheme.textForeground,
              }}
            >
              <h3
                className="text-lg font-semibold"
                style={{ color: previewTheme.headingColor }}
              >
                {t("preview.heading")}
              </h3>
              <div
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: previewTheme.portalCalendarBackgroundColor,
                  color: previewTheme.portalCalendarTextColor,
                  borderColor: previewTheme.borderColor,
                }}
              >
                <span className="text-sm">{t("preview.calendar")}</span>
                <div aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }, (_, index) => (
                    <span
                      key={index}
                      className="rounded border p-2 text-center text-xs"
                      style={{ borderColor: previewTheme.borderColor }}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <details>
            <summary className="cursor-pointer py-2 text-sm font-semibold">
              {t("customize")}
            </summary>
            <p className="mb-4 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
              {t("inheritHint")}
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              {PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.map((key) => (
                <div key={key} className="min-w-0 space-y-2">
                  <label
                    htmlFor={`${id}-${key}`}
                    className="block text-xs font-semibold"
                  >
                    {t(`fields.${key}`)}
                  </label>
                  <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2">
                    <input
                      type="color"
                      aria-label={t("pickColor", { field: t(`fields.${key}`) })}
                      value={normalized[key] || studioColors[key] || "#FFFFFF"}
                      onChange={(event) => setColor(key, event.target.value)}
                      className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-1"
                    />
                    <input
                      id={`${id}-${key}`}
                      type="text"
                      value={draft[key]}
                      placeholder={studioColors[key]}
                      maxLength={7}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={invalidKeys.includes(key)}
                      aria-describedby={
                        invalidKeys.includes(key) ? `${id}-invalid` : undefined
                      }
                      onChange={(event) => setColor(key, event.target.value)}
                      className="h-11 w-full min-w-0 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-xs text-[var(--tenant-text-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tenant-accent-on-surface)]"
                    />
                    <button
                      type="button"
                      disabled={!draft[key]}
                      aria-label={t("resetColor", {
                        field: t(`fields.${key}`),
                      })}
                      onClick={() => setColor(key, "")}
                      className="min-h-11 min-w-11 px-2 text-xs font-semibold underline underline-offset-2 disabled:opacity-50"
                    >
                      {t("inherit")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </fieldset>
        <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
          {t("contrastHint")}
        </p>
        {invalidKeys.length > 0 && (
          <p id={`${id}-invalid`} role="alert" className="text-sm">
            {t("invalidColor")}
          </p>
        )}
        {notice && (
          <p
            role={notice.type === "error" ? "alert" : "status"}
            className="text-sm"
          >
            {notice.text}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSaving || colorsMatch(draft, saved)}
            onClick={() => {
              setDraft(saved);
              setNotice(null);
            }}
            className={customerPortalSecondaryActionClass}
          >
            {t("discard")}
          </button>
          <button
            type="submit"
            disabled={isSaving || !canSave}
            className={customerPortalPrimaryActionClass}
          >
            {t(isSaving ? "saving" : "save")}
          </button>
        </div>
      </div>
    </CustomerPortalSurface>
  );
}
