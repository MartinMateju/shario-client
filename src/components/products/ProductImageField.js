"use client";

import {
  ArrowUpTrayIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useState } from "react";

export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const getProductImageValidationError = (file) => {
  if (!file) return null;
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return "invalidType";
  if (!file.size || file.size > PRODUCT_IMAGE_MAX_BYTES) return "tooLarge";
  return null;
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProductImageField({
  currentImageSrc = "",
  disabled = false,
  file = null,
  onChange,
  onRemove,
  t,
}) {
  const inputId = useId();
  const helpId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    if (!file || typeof FileReader === "undefined") return undefined;

    const reader = new FileReader();
    const handleLoad = () => {
      if (typeof reader.result === "string") {
        setFilePreview({ file, url: reader.result });
      }
    };

    reader.addEventListener("load", handleLoad);
    reader.readAsDataURL(file);

    return () => {
      reader.removeEventListener("load", handleLoad);
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  const chooseFile = (nextFile) => {
    if (!nextFile || disabled) return;

    const validationError = getProductImageValidationError(nextFile);
    if (validationError) {
      setError(
        t(
          validationError === "tooLarge"
            ? "form.imageTooLarge"
            : "form.imageInvalidType",
        ),
      );
      return;
    }

    setError("");
    onChange(nextFile);
  };

  const previewSource =
    (filePreview?.file === file ? filePreview.url : "") ||
    currentImageSrc.trim();
  const hasImage = Boolean(file || currentImageSrc.trim());

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-[12px] font-semibold leading-5 text-ink-soft">
        {t("form.image")}
      </legend>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
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
        className={`mt-2 overflow-hidden rounded-[16px] border bg-surface transition focus-within:ring-4 focus-within:ring-cobalt-500/10 ${
          error
            ? "border-coral-300"
            : dragging
              ? "border-cobalt-400 bg-cobalt-50"
              : "border-line focus-within:border-cobalt-400"
        }`}
      >
        <div className="grid gap-4 p-4 sm:grid-cols-[144px_minmax(0,1fr)]">
          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[13px] border border-line bg-white sm:w-36">
            {previewSource ? (
              // Product media may use a tenant-owned host outside Next's allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSource}
                alt={t("form.imagePreviewAlt")}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <PhotoIcon
                className="h-8 w-8 text-ink-subtle"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0 self-center">
            <p className="text-[12px] font-semibold text-ink">
              {t("form.imageDropTitle")}
            </p>
            <p
              id={helpId}
              className="mt-1 text-[11px] leading-5 text-ink-muted"
            >
              {t("form.imageFormats")}
            </p>
            {file ? (
              <p className="mt-1 truncate text-[10px] font-medium text-ink-soft">
                {file.name} · {formatFileSize(file.size)}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-100 px-4 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-200 focus-within:ring-4 focus-within:ring-cobalt-500/15 ${
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
                {t(hasImage ? "form.imageReplace" : "form.imageUpload")}
                <input
                  id={inputId}
                  type="file"
                  accept={PRODUCT_IMAGE_TYPES.join(",")}
                  aria-describedby={helpId}
                  aria-label={t("form.image")}
                  disabled={disabled}
                  className="sr-only"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>

              {hasImage ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setError("");
                    onRemove();
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[11px] font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  {t("form.imageRemove")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <p
            className="border-t border-coral-200 bg-coral-50 px-4 py-3 text-[11px] leading-5 text-terracotta-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
