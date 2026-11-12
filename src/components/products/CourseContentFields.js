"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  workspaceInputClass,
  workspaceLabelClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  LOCALE_REGISTRY,
  ROLLOUT_ELIGIBLE_LOCALE_CODES,
  resolveRolloutEligibleLocaleCode,
} from "@/i18n/locales";
import {
  COURSE_CONTENT_IMAGE_LIMIT,
  COURSE_CONTENT_TEXT_LIMITS,
  isCourseGalleryUrl,
} from "./courseContentForm";

export default function CourseContentFields({
  value,
  onChange,
  locale,
  productImage,
  locations = [],
  locationsLoading = false,
  locationsError = false,
  disabled = false,
  t,
}) {
  const [language, setLanguage] = useState(() =>
    resolveRolloutEligibleLocaleCode(locale),
  );
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const galleryFull = value.images.length >= COURSE_CONTENT_IMAGE_LIMIT;
  const updateText = (field, text) =>
    onChange({
      ...value,
      [field]: { ...value[field], [language]: text },
    });
  const addImage = (url) => {
    if (disabled || galleryFull) return;
    if (!isCourseGalleryUrl(url)) {
      setImageError(t("form.courseContent.invalidImage"));
      return;
    }
    onChange({ ...value, images: [...value.images, url.trim()] });
    setImageUrl("");
    setImageError("");
  };
  const moveImage = (index, offset) => {
    const images = [...value.images];
    [images[index], images[index + offset]] = [
      images[index + offset],
      images[index],
    ];
    onChange({ ...value, images });
  };

  return (
    <details className="group rounded-[15px] border border-line bg-white sm:col-span-2">
      <summary className="cursor-pointer px-4 py-3.5 text-[11px] font-semibold text-[#555553]">
        {t("form.courseContent.title")}
      </summary>
      <div className="space-y-5 border-t border-line p-4">
        <p className="text-sm text-[#666660]">{t("form.courseContent.help")}</p>
        <fieldset disabled={disabled || locationsLoading} className="space-y-3">
          <legend className={workspaceLabelClass}>
            {t("form.courseContent.locations")}
          </legend>
          <p className="text-sm text-[#666660]">
            {t("form.courseContent.locationsHelp")}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {locations.map((location) => (
              <label
                key={location.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={value.locationIds.includes(location.id)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      locationIds: event.target.checked
                        ? [...value.locationIds, location.id]
                        : value.locationIds.filter((id) => id !== location.id),
                    })
                  }
                />
                {location.name}
              </label>
            ))}
          </div>
          {locationsError ? (
            <p role="alert" className="text-sm text-red-700">
              {t("form.locationsError")}
            </p>
          ) : null}
        </fieldset>
        <label className={`${workspaceLabelClass} block max-w-sm`}>
          {t("form.courseContent.language")}
          <select
            className={workspaceInputClass}
            value={language}
            disabled={disabled}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {ROLLOUT_ELIGIBLE_LOCALE_CODES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_REGISTRY[code].nativeName}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(COURSE_CONTENT_TEXT_LIMITS).map(
            ([field, maxLength]) => {
              const multiline = field === "description" || field === "details";
              const Control = multiline ? "textarea" : "input";
              return (
                <label
                  key={field}
                  className={`${workspaceLabelClass} ${multiline ? "sm:col-span-2" : ""}`}
                >
                  {t(`form.courseContent.${field}`)}
                  <Control
                    className={workspaceInputClass}
                    value={value[field][language] || ""}
                    onChange={(event) => updateText(field, event.target.value)}
                    maxLength={maxLength}
                    disabled={disabled}
                    lang={language}
                    {...(multiline
                      ? { rows: field === "details" ? 6 : 3 }
                      : {})}
                  />
                </label>
              );
            },
          )}
        </div>
        <p className="text-xs text-[#666660]">
          {t("form.courseContent.plainTextHelp")}
        </p>
        <fieldset className="space-y-3" disabled={disabled}>
          <legend className={workspaceLabelClass}>
            {t("form.courseContent.gallery")}
          </legend>
          <p className="text-sm text-[#666660]">
            {t("form.courseContent.galleryHelp")}
          </p>
          <ol className="space-y-2">
            {value.images.map((url, index) => (
              <li
                key={`${index}-${url}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {t("form.courseContent.imageLabel", { number: index + 1 })}
                  </p>
                  <p className="break-all text-xs text-[#666660]">{url}</p>
                </div>
                {[
                  {
                    key: "moveEarlier",
                    Icon: ArrowUpIcon,
                    disabled: index === 0,
                    action: () => moveImage(index, -1),
                  },
                  {
                    key: "moveLater",
                    Icon: ArrowDownIcon,
                    disabled: index === value.images.length - 1,
                    action: () => moveImage(index, 1),
                  },
                  {
                    key: "removeImage",
                    Icon: TrashIcon,
                    action: () =>
                      onChange({
                        ...value,
                        images: value.images.filter(
                          (_, current) => current !== index,
                        ),
                      }),
                  },
                ].map(({ key, Icon, disabled: unavailable, action }) => (
                  <button
                    key={key}
                    type="button"
                    className={workspaceSecondaryButtonClass}
                    disabled={disabled || unavailable}
                    aria-label={t(`form.courseContent.${key}`, {
                      number: index + 1,
                    })}
                    onClick={action}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ))}
              </li>
            ))}
          </ol>
          {!galleryFull ? (
            <div className="space-y-3">
              <label className={`${workspaceLabelClass} block`}>
                {t("form.courseContent.imageUrl")}
                <input
                  className={workspaceInputClass}
                  value={imageUrl}
                  maxLength={2000}
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setImageError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addImage(imageUrl);
                    }
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={workspaceSecondaryButtonClass}
                  onClick={() => addImage(imageUrl)}
                  disabled={!imageUrl.trim()}
                >
                  {t("form.courseContent.addImage")}
                </button>
                {isCourseGalleryUrl(productImage) &&
                !value.images.includes(productImage) ? (
                  <button
                    type="button"
                    className={workspaceSecondaryButtonClass}
                    onClick={() => addImage(productImage)}
                  >
                    {t("form.courseContent.useProductImage")}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#666660]">
              {t("form.courseContent.galleryLimit")}
            </p>
          )}
          {imageError ? (
            <p role="alert" className="text-sm text-red-700">
              {imageError}
            </p>
          ) : null}
        </fieldset>
      </div>
    </details>
  );
}
