"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS,
  PUBLIC_TENANT_FONT_PRESET_ORDER,
} from "@/components/public-tenant/publicTenantStylePresets";
import {
  useGetVoucherDesignDefaultsQuery,
  useUploadVoucherDesignAssetMutation,
  useDownloadVoucherDesignPdfMutation,
} from "@/lib/features/products/productsApiSlice";
import {
  buildVoucherPreviewPayload,
  downloadVoucherPdf,
  VOUCHER_DESIGN_ASSET_TYPES,
  VOUCHER_DESIGN_MAX_ASSET_BYTES,
  VOUCHER_DESIGN_TEXT_LIMITS,
  isVoucherDesignValid,
} from "./voucherDesign";
import useVoucherDesignPreview from "./useVoucherDesignPreview";
import VoucherEditorConfirmation from "./VoucherEditorConfirmation";

const errorMessage = (error, fallback) =>
  error?.data?.message || error?.message || fallback;

function AssetField({
  purpose,
  assetKey,
  disabled,
  uploading,
  onUpload,
  onRemove,
  prominent = false,
  error,
  children,
  t,
}) {
  const id = useId();
  const label = t(`assets.${purpose}`);
  return (
    <div
      className={`rounded-2xl border border-line ${prominent ? "bg-sand-50 p-4" : "bg-white p-3.5"}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand-50 text-ink-muted">
          {assetKey ? (
            <CheckIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <PhotoIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t(
              uploading
                ? "assets.uploading"
                : assetKey
                  ? "assets.added"
                  : "assets.optional",
            )}
          </p>
        </div>
      </div>
      {prominent && (
        <p id={`${id}-help`} className="mt-3 text-sm leading-5 text-ink-muted">
          {t("assets.imageHelp")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <label
          htmlFor={id}
          className={`${prominent ? workspacePrimaryButtonClass : "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-3 text-xs font-semibold text-ink-soft hover:border-line-strong"} cursor-pointer focus-within:ring-2 focus-within:ring-cobalt-500/30 ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
          {t(
            prominent
              ? assetKey
                ? "assets.replaceImage"
                : "assets.uploadImage"
              : assetKey
                ? "assets.replace"
                : "assets.upload",
          )}
          <input
            id={id}
            type="file"
            className="sr-only"
            accept={VOUCHER_DESIGN_ASSET_TYPES.join(",")}
            aria-label={label}
            aria-describedby={prominent ? `${id}-help` : undefined}
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUpload(purpose, file);
            }}
          />
        </label>
        {assetKey && (
          <button
            type="button"
            disabled={disabled}
            aria-label={t("assets.removeLabel", { asset: label })}
            onClick={onRemove}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line text-ink-muted hover:text-terracotta-600 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-coral-50 p-3 text-sm text-terracotta-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function VoucherDesignEditor({
  value,
  onChange,
  onInitialize,
  onBusyChange,
  onValidationChange,
  productName,
  price,
  currency,
  validity,
  locale,
  disabled = false,
}) {
  const t = useTranslations("VoucherEditor");
  const fontT = useTranslations("PublicSiteEditor.branding.fontPresets");
  const defaultsQuery = useGetVoucherDesignDefaultsQuery();
  const [uploadAsset] = useUploadVoucherDesignAssetMutation();
  const [downloadPdf, { isLoading: isDownloading }] =
    useDownloadVoucherDesignPdfMutation();
  const [uploading, setUploading] = useState(null);
  const [assetError, setAssetError] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const alive = useRef(false);
  const uploadRequest = useRef(null);
  const payload = buildVoucherPreviewPayload({
    design: value,
    productName,
    price,
    currency,
    validity,
    locale,
  });
  const preview = useVoucherDesignPreview({
    payload,
    enabled: Boolean(payload) && !uploading,
  });
  const blocked = disabled || Boolean(uploading);
  const fontOptions = PUBLIC_TENANT_FONT_PRESET_ORDER.includes(
    value?.typography?.font,
  )
    ? PUBLIC_TENANT_FONT_PRESET_ORDER
    : [
        ...PUBLIC_TENANT_FONT_PRESET_ORDER,
        ...(value?.typography?.font ? [value.typography.font] : []),
      ];

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      uploadRequest.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (!value && defaultsQuery.data?.design)
      onInitialize(defaultsQuery.data.design);
  }, [value, defaultsQuery.data, onInitialize]);

  useEffect(() => {
    onBusyChange(Boolean(uploading));
  }, [uploading, onBusyChange]);
  useEffect(() => {
    onValidationChange(
      isVoucherDesignValid(value) && Boolean(payload) && !preview.error,
    );
  }, [value, payload, preview.error, onValidationChange]);

  const update = (group, field, nextValue) => {
    onChange(
      group
        ? { ...value, [group]: { ...value[group], [field]: nextValue } }
        : { ...value, [field]: nextValue },
    );
  };

  const resetTitleColor = () => {
    const colors = { ...value.colors };
    delete colors.title;
    onChange({ ...value, colors });
  };

  const handleUpload = async (purpose, file) => {
    if (blocked) return;
    if (!VOUCHER_DESIGN_ASSET_TYPES.includes(file.type)) {
      setAssetError({ purpose, message: t("assets.invalidType") });
      return;
    }
    if (!file.size || file.size > VOUCHER_DESIGN_MAX_ASSET_BYTES) {
      setAssetError({ purpose, message: t("assets.tooLarge") });
      return;
    }
    setAssetError(null);
    setUploading(purpose);
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", purpose);
    try {
      const request = uploadAsset(body);
      uploadRequest.current = request;
      const result = await request.unwrap();
      if (alive.current) update("assets", `${purpose}Key`, result.key);
    } catch (error) {
      if (alive.current)
        setAssetError({
          purpose,
          message: errorMessage(error, t("assets.error")),
        });
    } finally {
      if (alive.current) setUploading(null);
    }
  };

  const handleDownload = async () => {
    if (!payload || blocked) return;
    setDownloadError("");
    try {
      const result = await downloadPdf(payload).unwrap();
      if (alive.current) downloadVoucherPdf(result.base64);
    } catch (error) {
      if (alive.current)
        setDownloadError(errorMessage(error, t("preview.downloadError")));
    }
  };

  if (!value)
    return (
      <div
        className="rounded-2xl border border-line bg-sand-50 p-6"
        role={defaultsQuery.isError ? "alert" : "status"}
      >
        <p className="text-sm text-ink-muted">
          {t(defaultsQuery.isError ? "defaults.error" : "defaults.loading")}
        </p>
        {defaultsQuery.isError && (
          <button
            type="button"
            onClick={() => defaultsQuery.refetch()}
            className={`${workspaceSecondaryButtonClass} mt-3`}
          >
            {t("retry")}
          </button>
        )}
      </div>
    );

  return (
    <section
      aria-label={t("title")}
      className="overflow-hidden rounded-[20px] border border-line bg-white"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            {t("eyebrow")}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
            {t("title")}
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-5 text-ink-muted">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          disabled={blocked || !defaultsQuery.data?.design}
          onClick={() => setResetOpen(true)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-ink-muted hover:bg-sand-50 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
          {t("defaults.restore")}
        </button>
      </header>
      <div className="grid min-w-0 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.2fr)]">
        <div className="order-2 min-w-0 space-y-5 p-4 sm:p-5 lg:order-1 lg:border-r lg:border-line">
          <AssetField
            purpose="image"
            assetKey={value.assets.imageKey}
            prominent
            disabled={blocked}
            uploading={uploading === "image"}
            onUpload={handleUpload}
            onRemove={() => {
              setAssetError(null);
              update("assets", "imageKey", null);
            }}
            error={assetError?.purpose === "image" ? assetError.message : null}
            t={t}
          >
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              {t("assets.imageFormats")}
            </p>
            {value.assets.imageKey && (
              <label className={`${workspaceLabelClass} mt-3`}>
                {t("assets.fit")}
                <select
                  className={workspaceInputClass}
                  value={value.imageFit}
                  disabled={blocked}
                  onChange={(event) =>
                    update(null, "imageFit", event.target.value)
                  }
                >
                  <option value="cover">{t("assets.cover")}</option>
                  <option value="contain">{t("assets.contain")}</option>
                </select>
              </label>
            )}
          </AssetField>
          <fieldset disabled={blocked}>
            <legend className="mb-3 text-sm font-semibold text-ink">
              {t("colors.title")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {["background", "text", "title", "accent"].map((field) => {
                const color =
                  field === "title"
                    ? (value.colors.title ?? value.colors.text)
                    : value.colors[field];
                const label = t(
                  `colors.${field === "title" ? "mainTitle" : field}`,
                );
                const hasTitleOverride = Object.hasOwn(value.colors, "title");
                const valid = /^#[0-9a-f]{6}$/i.test(
                  field === "title" && hasTitleOverride
                    ? value.colors.title
                    : color,
                );
                return (
                  <div
                    key={field}
                    className="min-w-0 rounded-xl border border-line bg-white p-2.5"
                  >
                    <span className="mb-2 block text-xs font-medium text-ink-soft">
                      {label}
                    </span>
                    <input
                      type="color"
                      aria-label={label}
                      value={valid ? color : "#000000"}
                      onChange={(event) =>
                        update("colors", field, event.target.value)
                      }
                      className="h-9 w-full cursor-pointer rounded-md border-0 bg-transparent p-0"
                    />
                    <input
                      aria-label={t("colors.hexLabel", {
                        color: label,
                      })}
                      value={color}
                      maxLength={7}
                      onChange={(event) =>
                        update("colors", field, event.target.value)
                      }
                      aria-invalid={!valid}
                      className="mt-2 min-h-9 w-full min-w-0 rounded-md border border-line px-1.5 font-mono text-xs uppercase text-ink outline-none focus:ring-2 focus:ring-cobalt-500/25 aria-invalid:border-danger"
                    />
                    {field === "title" && hasTitleOverride && (
                      <button
                        type="button"
                        onClick={resetTitleColor}
                        className="mt-1 min-h-9 text-left text-xs font-medium text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
                      >
                        {t("colors.useTextColor")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
          <fieldset disabled={blocked}>
            <legend className="mb-3 text-sm font-semibold text-ink">
              {t("typography.title")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <label className={workspaceLabelClass}>
                {t("typography.font")}
                <select
                  className={workspaceInputClass}
                  value={value.typography.font}
                  onChange={(event) =>
                    update("typography", "font", event.target.value)
                  }
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS[font]
                        ? fontT(
                            `${PUBLIC_TENANT_FONT_PRESET_MESSAGE_KEYS[font]}.name`,
                          )
                        : t(`typography.${font}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={workspaceLabelClass}>
                {t("typography.weight")}
                <select
                  className={workspaceInputClass}
                  value={value.typography.titleWeight}
                  onChange={(event) =>
                    update("typography", "titleWeight", event.target.value)
                  }
                >
                  {["regular", "bold"].map((weight) => (
                    <option key={weight} value={weight}>
                      {t(`typography.${weight}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <fieldset disabled={blocked} className="space-y-3">
            <legend className="mb-3 text-sm font-semibold text-ink">
              {t("content.heading")}
            </legend>
            {Object.entries(VOUCHER_DESIGN_TEXT_LIMITS).map(
              ([field, limit]) => (
                <label key={field} className={workspaceLabelClass}>
                  <span className="flex justify-between gap-2">
                    <span>
                      {t(`content.${field}`)}
                      {field === "title" && (
                        <span
                          className="ml-1 text-terracotta-600"
                          aria-hidden="true"
                        >
                          *
                        </span>
                      )}
                    </span>
                    <span
                      className="font-normal tabular-nums text-ink-muted"
                      aria-hidden="true"
                    >
                      {value.content[field].length}/{limit}
                    </span>
                  </span>
                  {field === "message" || field === "footer" ? (
                    <textarea
                      className={`${workspaceInputClass} resize-y py-3 leading-5`}
                      rows={field === "message" ? 3 : 2}
                      aria-label={t(`content.${field}`)}
                      value={value.content[field]}
                      maxLength={limit}
                      onChange={(event) =>
                        update("content", field, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      className={workspaceInputClass}
                      aria-label={t(`content.${field}`)}
                      value={value.content[field]}
                      maxLength={limit}
                      required={field === "title"}
                      onChange={(event) =>
                        update("content", field, event.target.value)
                      }
                    />
                  )}
                </label>
              ),
            )}
          </fieldset>
          <fieldset disabled={blocked}>
            <legend className="text-sm font-semibold text-ink">
              {t("assets.logo")}
            </legend>
            <p className="mb-3 mt-1 text-xs leading-5 text-ink-muted">
              {t("assets.formats")}
            </p>
            <AssetField
              purpose="logo"
              assetKey={value.assets.logoKey}
              disabled={blocked}
              uploading={uploading === "logo"}
              onUpload={handleUpload}
              onRemove={() => {
                setAssetError(null);
                update("assets", "logoKey", null);
              }}
              error={assetError?.purpose === "logo" ? assetError.message : null}
              t={t}
            />
          </fieldset>
        </div>
        <aside className="order-1 min-w-0 border-b border-line bg-[#F3F2EE] p-4 sm:p-5 lg:order-2 lg:border-b-0">
          <div className="lg:sticky lg:top-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {t("preview.title")}
              </p>
              <span role="status" className="text-xs text-ink-muted">
                {t(
                  preview.isUpdating
                    ? "preview.updating"
                    : preview.error || !payload
                      ? "preview.needsAttention"
                      : preview.svg
                        ? "preview.ready"
                        : "preview.loading",
                )}
              </span>
            </div>
            <div
              className="w-full overflow-hidden bg-white shadow-[0_12px_35px_-12px_rgba(25,30,25,0.3)]"
              aria-busy={preview.isUpdating}
            >
              {preview.svg ? (
                // A data-image keeps the renderer's SVG isolated from the application DOM.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.svg)}`}
                  alt={t("preview.alt")}
                  className="block h-auto w-full"
                />
              ) : (
                <div className="flex aspect-[21/10] w-full flex-col items-center justify-center px-5 text-center">
                  <PhotoIcon
                    className="mx-auto h-8 w-8 text-ink-subtle"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm text-ink-muted">
                    {t(!payload ? "preview.completeFields" : "preview.loading")}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-muted">
              {t("preview.automatic")}
            </p>
            {(!payload || preview.error) && (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-coral-200 bg-white p-3 text-sm leading-5 text-terracotta-700"
              >
                <p>
                  {!payload
                    ? t("preview.invalid")
                    : errorMessage(preview.error, t("preview.error"))}
                </p>
                {payload && (
                  <button
                    type="button"
                    onClick={preview.retry}
                    className="mt-2 min-h-10 font-semibold underline underline-offset-4"
                  >
                    {t("retry")}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={
                blocked || !payload || isDownloading || Boolean(preview.error)
              }
              onClick={handleDownload}
              className={`${workspaceSecondaryButtonClass} mt-5 w-full sm:w-full`}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              {t(isDownloading ? "preview.downloading" : "preview.download")}
            </button>
            {downloadError && (
              <p role="alert" className="mt-3 text-sm text-terracotta-700">
                {downloadError}
              </p>
            )}
            <p className="mt-4 rounded-xl border border-black/5 bg-white/60 p-3 text-xs leading-5 text-ink-muted">
              {t("futurePurchases")}
            </p>
          </div>
        </aside>
      </div>
      <VoucherEditorConfirmation
        open={resetOpen}
        title={t("defaults.confirmTitle")}
        description={t("defaults.confirmDescription")}
        confirmLabel={t("defaults.confirm")}
        cancelLabel={t("keepEditing")}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          onChange(structuredClone(defaultsQuery.data.design));
          setResetOpen(false);
          setAssetError(null);
        }}
      />
    </section>
  );
}
