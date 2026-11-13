"use client";

import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS,
  PUBLIC_TENANT_FONT_PRESET_ORDER,
  PUBLIC_TENANT_STYLE_PRESET_ORDER,
  getPublicTenantStylePresetRecipe,
  getPublicTenantStylePreset,
  resolvePublicTenantFontPreset,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  PUBLIC_TENANT_LOGO_SIZE,
  getPublicTenantTheme,
  resolvePublicTenantActionForeground,
  resolvePublicTenantLabelColor,
} from "@/components/public-tenant/publicTenant.config";
import { getLocaleDefinition } from "@/i18n/locales";
import { PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS } from "@/components/public-tenant/publicTenantPortalAppearance";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import {
  CUSTOMER_PORTAL_PAGE_IDS,
  CUSTOMER_PORTAL_NAVIGATION_PAGE_IDS,
} from "@/components/customer-shell/customerPortalVisibility";

import {
  PUBLIC_SITE_EDITOR_MEDIA,
  PUBLIC_SITE_MEDIA_TYPES,
  formatPublicSiteMediaSize,
  getInvalidPublicSiteLogoRedirectUrl,
  movePublicSiteNavigationItem,
} from "./publicSiteEditor.utils";

const controlClass =
  "min-h-11 w-full min-w-0 rounded-[13px] border border-line bg-white px-3.5 text-base text-[#292925] 2xl:text-xs outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-[#F4F2ED] disabled:text-[#858580]";
const textAreaClass = `${controlClass} min-h-[94px] resize-y py-3 leading-5`;
const STYLE_PRESET_MESSAGE_KEYS = Object.freeze({
  "classic-editorial-v1": "classicEditorial",
  "modern-minimal-v1": "modernMinimal",
  "warm-organic-v1": "warmOrganic",
});
const DEFAULT_EDITOR_LOCALE_CODES = Object.freeze(["cs", "en"]);

const PublicSiteEditorLocaleContext = createContext(
  DEFAULT_EDITOR_LOCALE_CODES,
);

export function PublicSiteEditorLocaleProvider({ localeCodes, children }) {
  const normalizedLocaleCodes = [
    ...new Set(
      (Array.isArray(localeCodes) ? localeCodes : [])
        .map((locale) => getLocaleDefinition(locale)?.code)
        .filter(Boolean),
    ),
  ].slice(0, 2);

  return (
    <PublicSiteEditorLocaleContext.Provider
      value={
        normalizedLocaleCodes.length
          ? normalizedLocaleCodes
          : DEFAULT_EDITOR_LOCALE_CODES
      }
    >
      {children}
    </PublicSiteEditorLocaleContext.Provider>
  );
}

function Field({
  label,
  hint,
  path,
  required = false,
  group = false,
  children,
}) {
  const content = (
    <>
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#292925]">
        {label}
        {required ? <span className="text-terracotta-600">*</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[10px] leading-4 text-[#858580]">
          {hint}
        </span>
      ) : null}
    </>
  );

  return group ? (
    <div className="block" data-public-site-field-path={path}>
      {content}
    </div>
  ) : (
    <label className="block" data-public-site-field-path={path}>
      {content}
    </label>
  );
}

function LogoRedirectFields({ branding, onChange, disabled }) {
  const t = useTranslations("PublicSiteEditor.branding");
  const id = useId();
  const enabled = branding.logoRedirectEnabled === true;
  const invalid = getInvalidPublicSiteLogoRedirectUrl({ branding });

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between gap-4 rounded-[13px] border border-line bg-white px-3.5 py-3"
        data-public-site-field-path="branding.logoRedirectEnabled"
      >
        <label className="min-w-0 flex-1" htmlFor={`${id}-toggle`}>
          <span
            id={`${id}-toggle-label`}
            className="block text-[11px] font-semibold leading-4 text-[#292925]"
          >
            {t("logoRedirectEnabled")}
          </span>
          <span
            id={`${id}-toggle-hint`}
            className="mt-1 block text-[10px] leading-4 text-[#858580]"
          >
            {t("logoRedirectHint")}
          </span>
        </label>
        <button
          id={`${id}-toggle`}
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`${id}-toggle-label`}
          aria-describedby={`${id}-toggle-hint`}
          disabled={disabled}
          onClick={() => onChange("branding.logoRedirectEnabled", !enabled)}
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-cobalt-500 group-hover:bg-cobalt-600" : "bg-line-strong group-hover:bg-[#A4A39D]"}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${enabled ? "translate-x-4" : "translate-x-0"}`}
            />
          </span>
        </button>
      </div>
      {enabled ? (
        <Field
          label={t("logoRedirectUrl")}
          path="branding.logoRedirectUrl"
          required
        >
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={branding.logoRedirectUrl ?? ""}
            required
            maxLength={2048}
            disabled={disabled}
            aria-label={t("logoRedirectUrl")}
            aria-invalid={invalid}
            aria-describedby={`${id}-url-hint${invalid ? ` ${id}-error` : ""}`}
            onChange={(event) =>
              onChange("branding.logoRedirectUrl", event.target.value)
            }
            className={controlClass}
          />
          <span
            id={`${id}-url-hint`}
            className="mt-1.5 block text-[10px] leading-4 text-[#858580]"
          >
            {t("logoRedirectUrlHint")}
          </span>
          {invalid ? (
            <span
              id={`${id}-error`}
              className="mt-1.5 block text-xs text-red-700"
            >
              {t("invalidLogoRedirectUrl")}
            </span>
          ) : null}
        </Field>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  path,
  value,
  onChange,
  optional = false,
  fallbackValue = "#000000",
  statusColor,
  hint,
  resetLabel,
  automaticStatusLabel,
  customStatusLabel,
}) {
  const t = useTranslations("PublicSiteEditor.branding");
  const hasValue = Boolean(String(value ?? "").trim());
  const valid = (!hasValue && optional) || /^#[0-9A-Fa-f]{6}$/.test(value);
  const errorId = `public-site-${path.replaceAll(".", "-")}-error`;
  const appliedColor =
    statusColor || (hasValue && valid ? value : fallbackValue);

  return (
    <Field label={label} hint={hint} path={path} group>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hasValue && valid ? value : fallbackValue}
          onChange={(event) => onChange(path, event.target.value.toUpperCase())}
          aria-label={t("colorPickerLabel", { color: label })}
          className="h-11 w-14 cursor-pointer rounded-[12px] border border-line bg-white p-1.5"
        />
        <input
          value={value}
          pattern="^#[0-9A-Fa-f]{6}$"
          maxLength={7}
          onChange={(event) => onChange(path, event.target.value.toUpperCase())}
          data-public-site-color-path={path}
          data-public-site-color-invalid={valid ? undefined : "true"}
          aria-label={t("hexColorLabel", { color: label })}
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : errorId}
          className={`${controlClass} ${valid ? "" : "border-coral-300"}`}
        />
      </div>
      {!valid ? (
        <span
          id={errorId}
          className="mt-1.5 block text-[10px] leading-4 text-terracotta-700"
        >
          {t("invalidColor")}
        </span>
      ) : null}
      {optional ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(path, "")}
            disabled={!hasValue}
            aria-pressed={!hasValue}
            className="inline-flex min-h-8 items-center rounded-full border border-line bg-white px-3 text-[10px] font-semibold text-[#686762] transition hover:border-cobalt-300 hover:text-cobalt-700 disabled:cursor-default disabled:bg-[#F4F2ED] disabled:text-[#858580]"
          >
            {resetLabel || t("useBrandColor")}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#777773]">
            <span
              className="h-3 w-3 rounded-full border border-black/10"
              style={{
                backgroundColor: appliedColor,
              }}
              aria-hidden="true"
            />
            {hasValue
              ? customStatusLabel || t("customLabelColor")
              : automaticStatusLabel || t("usingBrandColor")}
          </span>
        </div>
      ) : null}
    </Field>
  );
}

function Section({ title, description, action, status, children }) {
  return (
    <section className="rounded-[18px] border border-line bg-white p-4 shadow-[0_12px_32px_rgba(17,17,15,0.035)] sm:p-5">
      <div className="flex items-center gap-3">
        {action}
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-[#292925]">{title}</h2>
          {status ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#777773]">
              {status}
            </p>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="mt-1 text-[11px] leading-5 text-[#777773]">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-5 space-y-5">{children}</div> : null}
    </section>
  );
}

function StylePresetCard({ branding, onSelect, presetId, selected, t }) {
  const preset = getPublicTenantStylePreset(presetId);
  const recipe = getPublicTenantStylePresetRecipe(presetId);
  const previewTheme = getPublicTenantTheme({
    name: branding.displayName,
    publicSite: {
      branding: {
        ...branding,
        ...recipe,
      },
    },
  });
  const ready = preset.status === "ready";
  const messageKey = STYLE_PRESET_MESSAGE_KEYS[presetId];
  const displayName = branding.displayName || t("previewStudio");
  const descriptionId = useId();
  const availabilityId = useId();

  return (
    <label
      data-style-preset-id={presetId}
      data-style-preset-status={preset.status}
      className={ready ? "group min-w-0 cursor-pointer" : "group min-w-0"}
    >
      <input
        type="radio"
        name="public-site-style-preset"
        value={presetId}
        checked={selected}
        disabled={!ready && !selected}
        aria-disabled={!ready || undefined}
        onChange={() => {
          if (ready) {
            onSelect(presetId);
          }
        }}
        onClick={() => {
          if (ready && selected) {
            onSelect(presetId);
          }
        }}
        aria-label={t(`presets.${messageKey}.name`)}
        aria-describedby={
          ready ? descriptionId : `${descriptionId} ${availabilityId}`
        }
        className="peer sr-only"
      />
      <span
        data-style-preset-card
        className={`block min-h-11 rounded-[18px] border p-2 text-left outline-none transition peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt-500 peer-focus-visible:ring-offset-2 ${
          selected
            ? "border-cobalt-500 bg-cobalt-50/70 shadow-[0_10px_30px_rgb(var(--skab-blue-rgb)/0.1)]"
            : ready
              ? "border-line bg-white group-hover:border-cobalt-300 group-hover:bg-cobalt-50/30"
              : "border-dashed border-[#CBC8BF] bg-[#F7F5F0]"
        }`}
      >
        <span
          aria-hidden="true"
          data-style-preset-preview={presetId}
          data-tenant-style={previewTheme.stylePresetId}
          data-tenant-preview="preset-card"
          className={`block overflow-hidden border border-black/10 p-3 ${
            ready ? "" : "opacity-65 grayscale-[0.15]"
          }`}
          style={{
            ...previewTheme.style,
            backgroundColor: previewTheme.backgroundColor,
            borderRadius: "var(--tenant-radius-card)",
            boxShadow: "var(--tenant-shadow-card)",
            color: previewTheme.textForeground,
            fontFamily: "var(--tenant-font-body)",
          }}
        >
          <span className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                style={{
                  backgroundColor: previewTheme.accentColor,
                  color: "var(--tenant-accent-foreground, #FFFFFF)",
                }}
              >
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-[7px] font-semibold">
                {displayName}
              </span>
            </span>
            <span className="flex gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: previewTheme.accentColor }}
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: previewTheme.secondaryColor }}
              />
            </span>
          </span>
          <span
            data-tenant-type="eyebrow"
            className="mt-4 block text-[6px]"
            style={{ color: previewTheme.labelForeground }}
          >
            {t("previewEyebrow")}
          </span>
          <span
            data-tenant-type="display"
            className="mt-1 block text-[19px] leading-none"
          >
            {t(`presets.${messageKey}.sample`)}
          </span>
          <span
            className="mt-2 block max-w-[85%] text-[6px] leading-[1.5]"
            style={{ color: previewTheme.mutedTextColor }}
          >
            {t(`presets.${messageKey}.sampleText`)}
          </span>
          <span
            data-tenant-button="primary"
            className="mt-3 inline-flex items-center px-2.5 py-1 text-[6px]"
            style={{
              backgroundColor: previewTheme.accentColor,
              color: "var(--tenant-accent-foreground, #FFFFFF)",
            }}
          >
            {t("previewAction")}
          </span>
        </span>

        <span className="flex min-w-0 items-start justify-between gap-2 px-1 pb-1 pt-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-[#292925]">
              {t(`presets.${messageKey}.name`)}
            </span>
            <span
              id={descriptionId}
              className="mt-1 block text-[10px] leading-4 text-[#686762]"
            >
              {t(`presets.${messageKey}.description`)}
            </span>
          </span>
          {ready && selected ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cobalt-500 px-2 py-1 text-[9px] font-semibold text-white">
              <CheckIcon className="h-3 w-3" />
              {t("selected")}
            </span>
          ) : null}
          {!ready ? (
            <span
              id={availabilityId}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAE6DC] px-2 py-1 text-[9px] font-semibold text-[#68625A]"
            >
              <ClockIcon className="h-3 w-3" />
              {t("comingSoon")}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function FontPresetCard({ onSelect, presetId, selected, t }) {
  const preset = resolvePublicTenantFontPreset(presetId);
  const messageKey = PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS[presetId];

  return (
    <label className="group min-w-0 cursor-pointer">
      <input
        type="radio"
        name="public-site-font-preset"
        value={presetId}
        checked={selected}
        onChange={() => onSelect(presetId)}
        aria-label={t(`fontPresets.${messageKey}.name`)}
        className="peer sr-only"
      />
      <span className="flex min-h-[116px] flex-col rounded-[16px] border border-line bg-white p-3 outline-none transition group-hover:border-cobalt-300 peer-checked:border-cobalt-500 peer-checked:bg-cobalt-50/60 peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt-500 peer-focus-visible:ring-offset-2">
        <span
          aria-hidden="true"
          className="text-[26px] leading-none text-[#292925]"
          style={{
            ...preset.cssVariables,
            fontFamily: "var(--tenant-font-display)",
            fontWeight: "var(--tenant-display-weight)",
            letterSpacing: "var(--tenant-display-tracking)",
          }}
        >
          {t(`fontPresets.${messageKey}.sample`)}
        </span>
        <span className="mt-auto pt-4 text-[11px] font-semibold text-[#292925]">
          {t(`fontPresets.${messageKey}.name`)}
        </span>
        <span className="mt-1 text-[9px] leading-4 text-[#777773]">
          {t(`fontPresets.${messageKey}.description`)}
        </span>
      </span>
    </label>
  );
}

function LocalizedField({
  path,
  label,
  value,
  onChange,
  multiline = true,
  maxLength = 800,
  hint,
}) {
  const localeCodes = useContext(PublicSiteEditorLocaleContext);

  return (
    <div
      className={
        localeCodes.length > 1 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"
      }
    >
      {localeCodes.map((locale) => (
        <Field
          key={locale}
          path={`${path}.${locale}`}
          label={`${label} · ${
            getLocaleDefinition(locale)?.nativeName || locale.toUpperCase()
          }`}
          hint={hint}
        >
          {multiline ? (
            <textarea
              value={value?.[locale] || ""}
              maxLength={maxLength}
              onChange={(event) =>
                onChange(`${path}.${locale}`, event.target.value)
              }
              className={textAreaClass}
            />
          ) : (
            <input
              value={value?.[locale] || ""}
              maxLength={maxLength}
              onChange={(event) =>
                onChange(`${path}.${locale}`, event.target.value)
              }
              className={controlClass}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

export function MediaField({
  label,
  path,
  slot,
  value,
  onChange,
  onUpload,
  onClearUpload,
  disabled = false,
  uploadState,
  hint,
}) {
  const t = useTranslations("PublicSiteEditor");
  const legendId = useId();
  const busy = uploadState?.slot === slot && uploadState?.busy;
  const locked = disabled || uploadState?.busy === true;
  const error =
    uploadState?.errorSlot === slot ? uploadState.errorMessage : null;
  const failedUpload =
    uploadState?.errorSlot === slot ? uploadState.failedUpload : null;
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const previewUrlRef = useRef(null);
  const resetToken = Number(uploadState?.resetToken ?? 0);
  const cropPreview =
    slot === "cover" ||
    slot === "loginBackground" ||
    slot === "registerBackground";
  const logoPreview = slot === "logo";
  const fileName =
    (busy || error) && uploadState?.fileName ? uploadState.fileName : null;
  const fileSize =
    (busy || error) && Number.isFinite(uploadState?.fileSize)
      ? uploadState.fileSize
      : null;

  const clearLocalPreview = useCallback(() => {
    if (previewUrlRef.current && typeof URL?.revokeObjectURL === "function") {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    setLocalPreview(null);
  }, []);

  useEffect(
    () => () => {
      if (previewUrlRef.current && typeof URL?.revokeObjectURL === "function") {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    if (
      localPreview &&
      localPreview.resetToken !== resetToken &&
      previewUrlRef.current &&
      typeof URL?.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [localPreview, resetToken]);

  const chooseFile = (file) => {
    if (!file || locked) return;
    const accepted = onUpload({ file, slot, path });
    if (!accepted) return;
    clearLocalPreview();
    if (typeof URL?.createObjectURL === "function") {
      previewUrlRef.current = URL.createObjectURL(file);
      setLocalPreview({ url: previewUrlRef.current, resetToken });
    }
  };

  const formattedSize = fileSize ? formatPublicSiteMediaSize(fileSize) : null;
  const activeLocalPreview =
    localPreview?.resetToken === resetToken ? localPreview.url : null;
  const previewSource =
    activeLocalPreview && (!value || busy || error)
      ? activeLocalPreview
      : value;

  return (
    <fieldset className="block" data-public-site-field-path={path}>
      <legend
        id={legendId}
        className="mb-1.5 text-[11px] font-semibold text-[#292925]"
      >
        {label}
      </legend>
      <div
        aria-labelledby={legendId}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!locked) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files?.[0]);
        }}
        className={
          error
            ? "overflow-hidden rounded-[16px] border border-coral-300 bg-coral-50/40 transition"
            : dragging
              ? "overflow-hidden rounded-[16px] border border-cobalt-400 bg-cobalt-50 ring-4 ring-cobalt-500/10 transition"
              : "overflow-hidden rounded-[16px] border border-line bg-surface transition focus-within:border-cobalt-400 focus-within:ring-4 focus-within:ring-cobalt-500/10"
        }
      >
        <div className="grid gap-4 p-3 sm:grid-cols-[128px_minmax(0,1fr)] sm:p-4">
          <div
            className={
              cropPreview
                ? "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[12px] border border-line bg-white sm:w-32"
                : logoPreview
                  ? "flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-[12px] border border-line bg-white sm:w-32"
                  : "flex aspect-square w-24 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-white sm:w-32"
            }
          >
            {previewSource ? (
              // Tenant media can be hosted outside the Next image allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSource}
                alt={label}
                className={
                  cropPreview
                    ? "h-full w-full object-cover"
                    : "h-full w-full object-contain p-2"
                }
                referrerPolicy="no-referrer"
              />
            ) : (
              <PhotoIcon className="h-7 w-7 text-[#A4A39D]" />
            )}
          </div>
          <div className="min-w-0 self-center">
            <p className="text-xs font-semibold text-[#292925]">
              {busy ? t("media.uploading") : t("media.dropTitle")}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#777773]">
              {t("media.formats")}
            </p>
            {fileName ? (
              <p className="mt-1 truncate text-[10px] font-medium text-[#686762]">
                {fileName}
                {formattedSize ? ` · ${formattedSize}` : ""}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                className={
                  locked
                    ? "inline-flex min-h-11 cursor-wait items-center gap-2 rounded-full bg-cobalt-100 px-4 text-[11px] font-semibold text-cobalt-700 opacity-60"
                    : "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-cobalt-100 px-4 text-[11px] font-semibold text-cobalt-700 hover:bg-cobalt-200 focus-within:ring-4 focus-within:ring-cobalt-500/15"
                }
              >
                {busy ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="h-4 w-4" />
                )}
                {busy ? t("media.uploading") : t("media.upload")}
                <input
                  type="file"
                  accept={PUBLIC_SITE_MEDIA_TYPES.join(",")}
                  disabled={locked}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    chooseFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
              {failedUpload ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onUpload(failedUpload)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cobalt-200 bg-white px-4 text-[11px] font-semibold text-cobalt-700 hover:bg-cobalt-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  {t("media.retry")}
                </button>
              ) : null}
              {value || activeLocalPreview ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    clearLocalPreview();
                    onClearUpload?.();
                    onChange(path, "");
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[11px] font-semibold text-[#686762] hover:bg-[#F1EEE8] disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  {t("media.remove")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {error ? (
          <div className="border-t border-coral-200 bg-coral-50 px-4 py-3 text-[11px] leading-5 text-terracotta-700">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div
            className="h-1 w-full overflow-hidden bg-cobalt-100"
            role="progressbar"
            aria-label={t("media.uploading")}
          >
            <div className="h-full w-full animate-pulse bg-cobalt-500" />
          </div>
        ) : null}
        <details className="border-t border-line bg-white px-4 py-3">
          <summary className="cursor-pointer text-[10px] font-semibold text-[#686762] marker:text-[#A4A39D]">
            {t("media.externalUrl")}
          </summary>
          <div className="mt-3">
            <input
              type="url"
              value={value || ""}
              maxLength={2048}
              disabled={locked}
              aria-label={t("media.externalUrl")}
              placeholder="https://…"
              onChange={(event) => {
                clearLocalPreview();
                onClearUpload?.();
                onChange(path, event.target.value);
              }}
              className={controlClass}
            />
            <p className="mt-1.5 text-[10px] leading-4 text-[#858580]">
              {t("media.externalUrlHint")}
            </p>
          </div>
        </details>
      </div>
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-4 text-[#858580]">{hint}</p>
      ) : null}
    </fieldset>
  );
}

export function BrandingFields({
  draft,
  onChange,
  onApplyStylePreset,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.branding");
  const branding = draft.branding;
  const fontPresetOrder = PUBLIC_TENANT_FONT_PRESET_ORDER.includes(
    branding.fontPreset,
  )
    ? PUBLIC_TENANT_FONT_PRESET_ORDER
    : [...PUBLIC_TENANT_FONT_PRESET_ORDER, branding.fontPreset];
  const configuredButtonTextColor = String(branding.buttonTextColor ?? "")
    .trim()
    .toUpperCase();
  const automaticButtonTextColor = resolvePublicTenantActionForeground(
    branding.accentColor,
  );
  const appliedButtonTextColor = resolvePublicTenantActionForeground(
    branding.accentColor,
    configuredButtonTextColor,
  );
  const buttonTextColorWasAdjusted =
    Boolean(configuredButtonTextColor) &&
    appliedButtonTextColor !== configuredButtonTextColor;

  return (
    <div className="space-y-4">
      <Section title={t("styleTitle")} description={t("styleDescription")}>
        <div
          role="radiogroup"
          aria-label={t("styleSelectorLabel")}
          data-style-preset-selector
          className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
        >
          {PUBLIC_TENANT_STYLE_PRESET_ORDER.map((presetId) => (
            <StylePresetCard
              key={presetId}
              branding={branding}
              presetId={presetId}
              selected={branding.stylePreset === presetId}
              onSelect={onApplyStylePreset}
              t={t}
            />
          ))}
        </div>
        <p className="text-[10px] leading-4 text-[#777773]">
          {t("styleDraftHint")}
        </p>
        {getPublicTenantStylePreset(branding.stylePreset).status !== "ready" ? (
          <p
            role="status"
            data-style-preset-unavailable
            className="rounded-[13px] border border-[#DED7C9] bg-[#FAF7F0] px-3 py-2.5 text-[10px] leading-4 text-[#6D6254]"
          >
            {t("styleUnavailable")}
          </p>
        ) : null}
      </Section>

      <Section title={t("fontTitle")} description={t("fontDescription")}>
        <div
          role="radiogroup"
          aria-label={t("fontSelectorLabel")}
          className="grid gap-3 sm:grid-cols-3"
        >
          {fontPresetOrder.map((presetId) => (
            <FontPresetCard
              key={presetId}
              presetId={presetId}
              selected={branding.fontPreset === presetId}
              onSelect={(nextPresetId) =>
                onChange("branding.fontPreset", nextPresetId)
              }
              t={t}
            />
          ))}
        </div>
        <p className="text-[10px] leading-4 text-[#777773]">{t("fontHint")}</p>
      </Section>

      <Section
        title={t("identityTitle")}
        description={t("identityDescription")}
      >
        <Field label={t("displayName")} path="branding.displayName" required>
          <input
            required
            value={branding.displayName}
            maxLength={120}
            onChange={(event) =>
              onChange("branding.displayName", event.target.value)
            }
            className={controlClass}
          />
        </Field>
        <MediaField
          label={t("logo")}
          path="branding.logoUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.logoUrl}
          value={branding.logoUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("logoHint")}
        />
        <Field label={t("logoSize")} path="branding.logoSize">
          <div className="flex min-h-11 items-center gap-4 rounded-[13px] border border-line bg-white px-3.5">
            <input
              id="public-site-logo-size"
              type="range"
              min={PUBLIC_TENANT_LOGO_SIZE.MIN}
              max={PUBLIC_TENANT_LOGO_SIZE.MAX}
              step="2"
              value={branding.logoSize}
              disabled={disabled || !branding.logoUrl}
              onChange={(event) =>
                onChange("branding.logoSize", Number(event.target.value))
              }
              className="h-2 min-w-0 flex-1 cursor-pointer accent-cobalt-500 disabled:cursor-not-allowed disabled:opacity-40"
            />
            <span className="min-w-12 text-right text-xs font-semibold tabular-nums text-[#4D4D49]">
              {branding.logoSize}px
            </span>
          </div>
        </Field>
        <LogoRedirectFields
          branding={branding}
          onChange={onChange}
          disabled={disabled || uploadState?.busy}
        />
        <MediaField
          label={t("favicon")}
          path="branding.faviconUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.faviconUrl}
          value={branding.faviconUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("faviconHint")}
        />
      </Section>

      <Section title={t("colorsTitle")} description={t("colorsDescription")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["accentColor", t("accentColor")],
            ["secondaryColor", t("secondaryColor")],
            ["backgroundColor", t("backgroundColor")],
            ["textColor", t("textColor")],
            ["labelColor", t("labelColor")],
          ].map(([key, label]) => (
            <ColorField
              key={key}
              label={label}
              path={`branding.${key}`}
              value={branding[key]}
              onChange={onChange}
            />
          ))}
          <ColorField
            label={t("buttonTextColor")}
            path="branding.buttonTextColor"
            value={branding.buttonTextColor}
            onChange={onChange}
            optional
            fallbackValue={automaticButtonTextColor}
            statusColor={appliedButtonTextColor}
            hint={t("buttonTextColorHint")}
            resetLabel={t("useAutomaticContrast")}
            automaticStatusLabel={t("usingAutomaticContrast")}
            customStatusLabel={t(
              buttonTextColorWasAdjusted
                ? "adjustedButtonTextColor"
                : "customButtonTextColor",
            )}
          />
        </div>
      </Section>
    </div>
  );
}

export function PagesFields({
  draft,
  onChange,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.pages");
  const sectionT = useTranslations("PublicSiteEditor.homeSections");
  const home = draft.pages.home;
  const homeTheme = getPublicTenantTheme({ publicSite: draft });
  const configuredHeadlineColor = String(home.headlineColor ?? "")
    .trim()
    .toUpperCase();
  const appliedHeadlineColor = resolvePublicTenantLabelColor(
    configuredHeadlineColor,
    homeTheme.backgroundColor,
    homeTheme.textForeground,
  );
  const headlineColorWasAdjusted =
    Boolean(configuredHeadlineColor) &&
    appliedHeadlineColor !== configuredHeadlineColor;

  return (
    <div className="space-y-4">
      <Section title={t("homeTitle")} description={t("homeDescription")}>
        <MediaField
          label={t("coverImage")}
          path="branding.coverImageUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.coverImageUrl}
          value={draft.branding.coverImageUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("coverImageHint")}
        />
        <LocalizedField
          path="pages.home.eyebrow"
          label={t("eyebrow")}
          value={draft.pages.home.eyebrow}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <ColorField
          label={t("labelColor")}
          path="pages.home.labelColor"
          value={draft.pages.home.labelColor}
          onChange={onChange}
          optional
          fallbackValue={draft.branding.labelColor}
        />
        <LocalizedField
          path="pages.home.headline"
          label={t("headline")}
          value={draft.pages.home.headline}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <ColorField
          label={t("headlineColor")}
          path="pages.home.headlineColor"
          value={draft.pages.home.headlineColor}
          onChange={onChange}
          optional
          fallbackValue={homeTheme.textForeground}
          statusColor={appliedHeadlineColor}
          resetLabel={t("useTextColor")}
          automaticStatusLabel={t("usingTextColor")}
          customStatusLabel={t(
            headlineColorWasAdjusted
              ? "adjustedHeadlineColor"
              : "customHeadlineColor",
          )}
        />
        <LocalizedField
          path="pages.home.description"
          label={t("description")}
          value={draft.pages.home.description}
          onChange={onChange}
        />
      </Section>

      <Section title={sectionT("title")} description={sectionT("description")}>
        <div className="space-y-2">
          {home.sectionOrder.map((key, index) => {
            const hidden = home.hiddenSections.includes(key);
            const content = home.sectionContent[key];

            return (
              <div
                key={key}
                className="rounded-[15px] border border-line bg-surface-muted p-2.5"
                data-home-section-editor={key}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        "pages.home.hiddenSections",
                        hidden
                          ? home.hiddenSections.filter((item) => item !== key)
                          : [...home.hiddenSections, key],
                      )
                    }
                    aria-label={`${sectionT("toggle")}: ${sectionT(`labels.${key}`)}`}
                    aria-pressed={!hidden}
                    className={
                      hidden
                        ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#858580] shadow-sm"
                        : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cobalt-500 text-white shadow-cobalt"
                    }
                  >
                    {hidden ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        hidden
                          ? "text-xs font-semibold text-[#777773]"
                          : "text-xs font-semibold text-[#292925]"
                      }
                    >
                      {sectionT(`labels.${key}`)}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#858580]">
                      {hidden ? sectionT("hidden") : sectionT("visible")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() =>
                      onChange(
                        "pages.home.sectionOrder",
                        movePublicSiteNavigationItem(
                          home.sectionOrder,
                          key,
                          -1,
                        ),
                      )
                    }
                    aria-label={`${sectionT("moveUp")}: ${sectionT(`labels.${key}`)}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#686762] hover:bg-white disabled:opacity-25"
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={
                      disabled || index === home.sectionOrder.length - 1
                    }
                    onClick={() =>
                      onChange(
                        "pages.home.sectionOrder",
                        movePublicSiteNavigationItem(home.sectionOrder, key, 1),
                      )
                    }
                    aria-label={`${sectionT("moveDown")}: ${sectionT(`labels.${key}`)}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#686762] hover:bg-white disabled:opacity-25"
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!hidden ? (
                  <details className="mt-2 rounded-[12px] bg-white px-3 py-2">
                    <summary className="min-h-9 cursor-pointer py-2 text-[10px] font-semibold text-cobalt-700">
                      {sectionT("edit")}
                    </summary>
                    <div className="space-y-4 pb-2 pt-3">
                      <LocalizedField
                        path={`pages.home.sectionContent.${key}.title`}
                        label={sectionT("sectionTitle")}
                        value={content.title}
                        onChange={onChange}
                        multiline={false}
                        maxLength={160}
                      />
                      <LocalizedField
                        path={`pages.home.sectionContent.${key}.description`}
                        label={sectionT("sectionDescription")}
                        value={content.description}
                        onChange={onChange}
                      />
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      {["book", "courses", "memberships", "vouchers", "help"].map((key) => {
        const visible = draft.pages[key].visible !== false;

        return (
          <Section
            key={key}
            title={t(`${key}.title`)}
            description={
              visible ? t(`${key}.description`) : t("hiddenDescription")
            }
            status={t(visible ? "visible" : "hidden")}
            action={
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(`pages.${key}.visible`, !visible)}
                aria-label={t("visibilityLabel", { page: t(`${key}.title`) })}
                aria-pressed={visible}
                className={
                  visible
                    ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cobalt-500 text-white shadow-cobalt"
                    : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[#858580] shadow-sm"
                }
              >
                {visible ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeSlashIcon className="h-4 w-4" />
                )}
              </button>
            }
          >
            {visible ? (
              <>
                <LocalizedField
                  path={`pages.${key}.title`}
                  label={t("pageTitle")}
                  value={draft.pages[key].title}
                  onChange={onChange}
                  multiline={false}
                  maxLength={160}
                />
                <LocalizedField
                  path={`pages.${key}.description`}
                  label={t("pageDescription")}
                  value={draft.pages[key].description}
                  onChange={onChange}
                />
              </>
            ) : null}
          </Section>
        );
      })}
    </div>
  );
}

export function HeaderFields({ draft, onChange }) {
  const t = useTranslations("PublicSiteEditor.header");
  const header = draft.header;

  return (
    <div className="space-y-4">
      <Section
        title={t("navigationTitle")}
        description={t("navigationDescription")}
      >
        <div className="space-y-2">
          {header.navOrder.map((key, index) => {
            const hidden = header.hiddenItems.includes(key);

            return (
              <div
                key={key}
                className="flex items-center gap-2 rounded-[13px] border border-line bg-surface-muted px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      "header.hiddenItems",
                      hidden
                        ? header.hiddenItems.filter((item) => item !== key)
                        : [...header.hiddenItems, key],
                    )
                  }
                  aria-pressed={!hidden}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#686762] shadow-sm"
                  aria-label={t("navigationVisibility", {
                    item: t(`items.${key}`),
                  })}
                >
                  {hidden ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <span
                  className={
                    hidden
                      ? "min-w-0 flex-1 break-words text-xs font-medium text-[#A4A39D]"
                      : "min-w-0 flex-1 break-words text-xs font-semibold text-[#292925]"
                  }
                >
                  {t(`items.${key}`)}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    onChange(
                      "header.navOrder",
                      movePublicSiteNavigationItem(header.navOrder, key, -1),
                    )
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#686762] hover:bg-white disabled:opacity-25"
                  aria-label={`${t("moveUp")}: ${t(`items.${key}`)}`}
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === header.navOrder.length - 1}
                  onClick={() =>
                    onChange(
                      "header.navOrder",
                      movePublicSiteNavigationItem(header.navOrder, key, 1),
                    )
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#686762] hover:bg-white disabled:opacity-25"
                  aria-label={`${t("moveDown")}: ${t(`items.${key}`)}`}
                >
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <Field label={t("primaryCta")} hint={t("primaryCtaHint")}>
          <select
            value={header.primaryCta}
            onChange={(event) =>
              onChange("header.primaryCta", event.target.value)
            }
            className={controlClass}
          >
            {["auto", "book", "courses", "memberships", "vouchers"].map(
              (key) => (
                <option key={key} value={key}>
                  {t(`cta.${key}`)}
                </option>
              ),
            )}
          </select>
        </Field>
      </Section>

      <Section
        title={t("announcementTitle")}
        description={t("announcementDescription")}
      >
        <LocalizedField
          path="header.announcement.text"
          label={t("announcementText")}
          value={header.announcement.text}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <Field label={t("announcementUrl")} hint={t("urlHint")}>
          <input
            value={header.announcement.url}
            maxLength={2048}
            placeholder={t("urlExample")}
            onChange={(event) =>
              onChange("header.announcement.url", event.target.value)
            }
            className={controlClass}
          />
        </Field>
      </Section>
    </div>
  );
}

export function FooterFields({ draft, onChange }) {
  const t = useTranslations("PublicSiteEditor.footer");
  const footer = draft.footer;

  return (
    <div className="space-y-4">
      <Section title={t("contentTitle")} description={t("contentDescription")}>
        <LocalizedField
          path="footer.description"
          label={t("description")}
          value={footer.description}
          onChange={onChange}
        />
        <LocalizedField
          path="footer.openingHours"
          label={t("openingHours")}
          value={footer.openingHours}
          onChange={onChange}
        />
        <LocalizedField
          path="footer.copyright"
          label={t("copyright")}
          value={footer.copyright}
          onChange={onChange}
          multiline={false}
          maxLength={240}
        />
      </Section>

      <Section title={t("contactTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["email", "email"],
            ["phone", "text"],
          ].map(([key, type]) => (
            <Field key={key} label={t(key)} path={`footer.${key}`}>
              <input
                type={type}
                value={footer[key]}
                maxLength={key === "email" ? 254 : 50}
                onChange={(event) =>
                  onChange(`footer.${key}`, event.target.value)
                }
                className={controlClass}
              />
            </Field>
          ))}
        </div>
        <Field label={t("address")} path="footer.address">
          <textarea
            value={footer.address}
            maxLength={500}
            onChange={(event) => onChange("footer.address", event.target.value)}
            className={textAreaClass}
          />
        </Field>
      </Section>

      <Section title={t("socialTitle")} description={t("httpsHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(footer.social).map((key) => (
            <Field
              key={key}
              label={t(`social.${key}`)}
              path={`footer.social.${key}`}
            >
              <input
                type="url"
                value={footer.social[key]}
                maxLength={2048}
                placeholder="https://…"
                onChange={(event) =>
                  onChange(`footer.social.${key}`, event.target.value)
                }
                className={controlClass}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title={t("legalTitle")} description={t("legalDescription")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(footer.legal).map((key) => (
            <Field
              key={key}
              label={t(`legal.${key}`)}
              path={`footer.legal.${key}`}
            >
              <input
                value={footer.legal[key]}
                maxLength={2048}
                placeholder={t("urlExample")}
                onChange={(event) =>
                  onChange(`footer.legal.${key}`, event.target.value)
                }
                className={controlClass}
              />
            </Field>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function LoginFields({
  draft,
  onChange,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.login");
  const login = draft.login;

  return (
    <div className="space-y-4">
      <Section title={t("contentTitle")} description={t("contentDescription")}>
        <LocalizedField
          path="login.eyebrow"
          label={t("eyebrow")}
          value={login.eyebrow}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <ColorField
          label={t("labelColor")}
          path="login.labelColor"
          value={login.labelColor}
          onChange={onChange}
          optional
          fallbackValue={draft.branding.labelColor}
        />
        <LocalizedField
          path="login.headline"
          label={t("headline")}
          value={login.headline}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <LocalizedField
          path="login.supportingText"
          label={t("supportingText")}
          value={login.supportingText}
          onChange={onChange}
        />
        <LocalizedField
          path="login.helpText"
          label={t("helpText")}
          value={login.helpText}
          onChange={onChange}
        />
      </Section>
      <Section title={t("imageTitle")} description={t("imageDescription")}>
        <MediaField
          label={t("logo")}
          path="branding.logoUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.logoUrl}
          value={draft.branding.logoUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("logoHint")}
        />
        <MediaField
          label={t("backgroundImage")}
          path="login.backgroundImageUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.loginBackgroundImageUrl}
          value={login.backgroundImageUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("backgroundImageHint")}
        />
      </Section>
    </div>
  );
}

export function RegisterFields({
  draft,
  onChange,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.register");
  const register = draft.register;

  return (
    <div className="space-y-4">
      <Section title={t("contentTitle")} description={t("contentDescription")}>
        <LocalizedField
          path="register.eyebrow"
          label={t("eyebrow")}
          value={register.eyebrow}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <ColorField
          label={t("labelColor")}
          path="register.labelColor"
          value={register.labelColor}
          onChange={onChange}
          optional
          fallbackValue={draft.branding.labelColor}
        />
        <LocalizedField
          path="register.headline"
          label={t("headline")}
          value={register.headline}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <LocalizedField
          path="register.supportingText"
          label={t("supportingText")}
          value={register.supportingText}
          onChange={onChange}
        />
        <LocalizedField
          path="register.helpText"
          label={t("helpText")}
          value={register.helpText}
          onChange={onChange}
        />
      </Section>
      <Section title={t("imageTitle")} description={t("imageDescription")}>
        <MediaField
          label={t("backgroundImage")}
          path="register.backgroundImageUrl"
          slot={PUBLIC_SITE_EDITOR_MEDIA.registerBackgroundImageUrl}
          value={register.backgroundImageUrl}
          onChange={onChange}
          onUpload={onUpload}
          onClearUpload={onClearUpload}
          disabled={disabled}
          uploadState={uploadState}
          hint={t("backgroundImageHint")}
        />
      </Section>
    </div>
  );
}

function PortalVisibilityControl({
  label,
  actionLabel,
  pressed,
  status,
  disabled = false,
  hint,
  path,
  onChange,
}) {
  const hintId = useId();

  return (
    <div
      className="flex items-center gap-3 rounded-[13px] border border-line bg-surface-muted p-3"
      data-public-site-field-path={path}
    >
      <button
        type="button"
        aria-label={actionLabel}
        aria-pressed={pressed}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={onChange}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          pressed
            ? "bg-cobalt-500 text-white shadow-cobalt"
            : "bg-white text-[#858580] shadow-sm"
        }`}
      >
        {pressed ? (
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#292925]">{label}</p>
        <p className="mt-0.5 text-[10px] text-[#777773]">{status}</p>
        {hint ? (
          <p id={hintId} className="mt-1 text-[10px] leading-4 text-[#777773]">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CustomerPortalFields({
  draft,
  onChange,
  locations = [],
  selectedCourseLocationId,
  onCourseLocationChange,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.customerPortal");
  const dashboard = draft.customerPortal.dashboard;
  const appearance = draft.customerPortal.appearance || {};
  const inheritedTheme = getPublicTenantPortalTheme({
    publicSite: {
      ...draft,
      customerPortal: { ...draft.customerPortal, appearance: {} },
    },
  });
  const inheritedColors = {
    backgroundColor: inheritedTheme.backgroundColor,
    surfaceColor: inheritedTheme.surfaceColor,
    textColor: inheritedTheme.textForeground,
    headingColor: inheritedTheme.headingColor,
    headerBackgroundColor: inheritedTheme.portalHeaderBackgroundColor,
    headerTextColor: inheritedTheme.portalHeaderTextColor,
    primaryButtonColor: inheritedTheme.portalButtonColor,
    calendarBackgroundColor: inheritedTheme.portalCalendarBackgroundColor,
    calendarTextColor: inheritedTheme.portalCalendarTextColor,
    profileMenuBackgroundColor: inheritedTheme.portalProfileBackgroundColor,
  };
  const appearanceGroups = {
    pageColors: [
      "backgroundColor",
      "surfaceColor",
      "textColor",
      "headingColor",
    ],
    headerColors: [
      "headerBackgroundColor",
      "headerTextColor",
      "profileMenuBackgroundColor",
    ],
    calendarColors: ["calendarBackgroundColor", "calendarTextColor"],
    buttonColors: ["primaryButtonColor"],
  };

  return (
    <div className="space-y-4">
      <Section
        title={t("appearanceTitle")}
        description={t("appearanceDescription")}
        action={
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink disabled:opacity-50"
            disabled={
              !PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.some(
                (key) => appearance[key],
              )
            }
            onClick={() =>
              onChange(
                "customerPortal.appearance",
                Object.fromEntries(
                  PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.map((key) => [key, ""]),
                ),
              )
            }
          >
            {t("useAllBrandColors")}
          </button>
        }
      >
        <p className="text-xs leading-5 text-ink-muted">
          {t("appearanceHint")}
        </p>
        {Object.entries(appearanceGroups).map(([group, keys]) => (
          <fieldset
            key={group}
            className="space-y-4 rounded-[16px] border border-line p-4"
          >
            <legend className="px-2 text-sm font-semibold text-ink">
              {t(group)}
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              {keys.map((key) => (
                <ColorField
                  key={key}
                  label={t(key)}
                  path={`customerPortal.appearance.${key}`}
                  value={appearance[key] || ""}
                  onChange={onChange}
                  optional
                  fallbackValue={inheritedColors[key]}
                  automaticStatusLabel={t("inheritedColor")}
                  customStatusLabel={t("customColor")}
                />
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-xs leading-5 text-ink-muted">
          {t("personalOverrideHint")}
        </p>
      </Section>
      <Section title={t("pagesTitle")} description={t("pagesDescription")}>
        <div className="space-y-2">
          {CUSTOMER_PORTAL_PAGE_IDS.map((pageId) => {
            const enabled =
              draft.customerPortal.pages?.[pageId]?.enabled !== false;
            const label = t(`pageLabels.${pageId}`);
            const path = `customerPortal.pages.${pageId}.enabled`;

            return (
              <PortalVisibilityControl
                key={pageId}
                label={label}
                actionLabel={t("pageEnabledLabel", { page: label })}
                pressed={enabled}
                status={t(enabled ? "enabled" : "disabled")}
                path={path}
                onChange={() => onChange(path, !enabled)}
              />
            );
          })}
        </div>
      </Section>
      <Section
        title={t("navigationTitle")}
        description={t("navigationDescription")}
      >
        <div className="space-y-2">
          {Object.entries(CUSTOMER_PORTAL_NAVIGATION_PAGE_IDS).map(
            ([key, pageId]) => {
              const enabled =
                draft.customerPortal.pages?.[pageId]?.enabled !== false;
              const visible =
                draft.customerPortal.navigation?.[key]?.visible !== false;
              const label = t(`navigationLabels.${key}`);
              const path = `customerPortal.navigation.${key}.visible`;

              return (
                <PortalVisibilityControl
                  key={key}
                  label={label}
                  actionLabel={t("navigationVisibleLabel", { link: label })}
                  pressed={enabled && visible}
                  status={t(enabled && visible ? "visible" : "hidden")}
                  disabled={!enabled}
                  hint={
                    enabled
                      ? undefined
                      : t("pageDisabledHint", {
                          page: t(`pageLabels.${pageId}`),
                        })
                  }
                  path={path}
                  onChange={() => onChange(path, !visible)}
                />
              );
            },
          )}
        </div>
      </Section>
      <Section title={t("contentTitle")} description={t("contentDescription")}>
        <ColorField
          label={t("labelColor")}
          path="customerPortal.dashboard.labelColor"
          value={dashboard.labelColor}
          onChange={onChange}
          optional
          fallbackValue={draft.branding.labelColor}
        />
        <LocalizedField
          path="customerPortal.dashboard.headline"
          label={t("headline")}
          value={dashboard.headline}
          onChange={onChange}
          multiline={false}
          maxLength={160}
        />
        <LocalizedField
          path="customerPortal.dashboard.description"
          label={t("description")}
          value={dashboard.description}
          onChange={onChange}
        />
      </Section>
      <CoursePageFields
        draft={draft}
        onChange={onChange}
        locations={locations}
        selectedLocationId={selectedCourseLocationId}
        onLocationChange={onCourseLocationChange}
        onUpload={onUpload}
        onClearUpload={onClearUpload}
        disabled={disabled}
        uploadState={uploadState}
      />
    </div>
  );
}

export function CoursePageFields({
  draft,
  onChange,
  locations,
  selectedLocationId,
  onLocationChange,
  onUpload,
  onClearUpload,
  disabled,
  uploadState,
}) {
  const t = useTranslations("PublicSiteEditor.customerPortal.courses");
  const id = String(
    selectedLocationId || locations[0]?.id || locations[0]?._id || "",
  );
  const overrides = draft.customerPortal.courses?.locations || [];
  const savedIndex = overrides.findIndex((item) => item.locationId === id);
  const index = savedIndex >= 0 ? savedIndex : overrides.length;
  const entry = overrides[savedIndex] || {
    locationId: id,
    headline: {},
    description: {},
    heroImageUrl: "",
  };
  const path = `customerPortal.courses.locations.${index}`;
  const locationUploadState =
    uploadState?.locationId === id
      ? uploadState
      : {
          ...uploadState,
          errorSlot: null,
          errorMessage: null,
          failedUpload: null,
          fileName: null,
          fileSize: null,
        };
  const update = (fieldPath, value) => {
    const next = [...overrides];
    const [field, locale] = fieldPath.replace(`${path}.`, "").split(".");
    next[index] = locale
      ? { ...entry, [field]: { ...entry[field], [locale]: value } }
      : { ...entry, [field]: value };
    onChange("customerPortal.courses.locations", next);
  };
  return (
    <Section title={t("title")} description={t("description")}>
      <label
        className="flex items-start gap-3 rounded-[13px] border border-line bg-surface-muted p-4"
        data-public-site-field-path="customerPortal.courses.guestCheckoutEnabled"
      >
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
          checked={draft.customerPortal.courses?.guestCheckoutEnabled === true}
          disabled={disabled || uploadState?.busy}
          onChange={(event) =>
            onChange(
              "customerPortal.courses.guestCheckoutEnabled",
              event.target.checked,
            )
          }
        />
        <span>
          <span className="block text-sm font-semibold text-ink">
            {t("guestCheckoutEnabled")}
          </span>
          <span className="mt-1 block text-sm text-ink-muted">
            {t("guestCheckoutDescription")}
          </span>
        </span>
      </label>
      {locations.length ? (
        <>
          <Field label={t("location")}>
            <select
              value={id}
              onChange={(event) => onLocationChange(event.target.value)}
              disabled={disabled || uploadState?.busy}
              className={controlClass}
            >
              {locations.map((location) => (
                <option
                  key={location.id || location._id}
                  value={location.id || location._id}
                >
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <LocalizedField
            label={t("headline")}
            path={`${path}.headline`}
            value={entry.headline}
            onChange={update}
            multiline={false}
            maxLength={160}
          />
          <LocalizedField
            label={t("intro")}
            path={`${path}.description`}
            value={entry.description}
            onChange={update}
          />
          <MediaField
            key={id}
            label={t("image")}
            hint={t("inherit")}
            path={`${path}.heroImageUrl`}
            slot="courseHero"
            value={entry.heroImageUrl}
            onChange={update}
            onUpload={(request) =>
              onUpload({ ...request, locationId: request.locationId || id })
            }
            onClearUpload={onClearUpload}
            disabled={disabled}
            uploadState={locationUploadState}
          />
        </>
      ) : (
        <p className="text-sm text-ink-muted">{t("noLocations")}</p>
      )}
    </Section>
  );
}
