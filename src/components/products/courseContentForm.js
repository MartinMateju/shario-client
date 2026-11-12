import { ROLLOUT_ELIGIBLE_LOCALE_CODES } from "@/i18n/locales";

export const COURSE_CONTENT_TEXT_LIMITS = Object.freeze({
  name: 180,
  description: 4000,
  details: 16000,
  durationLabel: 120,
});
export const COURSE_CONTENT_IMAGE_LIMIT = 12;

export function getCourseContentForm(value) {
  return {
    ...Object.fromEntries(
      Object.keys(COURSE_CONTENT_TEXT_LIMITS).map((field) => [
        field,
        Object.fromEntries(
          ROLLOUT_ELIGIBLE_LOCALE_CODES.filter(
            (locale) => typeof value?.[field]?.[locale] === "string",
          ).map((locale) => [locale, value[field][locale]]),
        ),
      ]),
    ),
    images: Array.isArray(value?.images) ? [...value.images] : [],
    locationIds: Array.isArray(value?.locationIds)
      ? [...value.locationIds]
      : [],
  };
}

export function isCourseGalleryUrl(value) {
  const url = String(value || "").trim();
  if (!url || url.length > 2000) return false;
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !/[\u0000-\u001F\u007F]/.test(url)
  )
    return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      (!parsed.port || parsed.port === "443")
    );
  } catch {
    return false;
  }
}

export function getCourseContentError(value) {
  for (const [field, limit] of Object.entries(COURSE_CONTENT_TEXT_LIMITS)) {
    if (
      Object.values(value[field]).some(
        (text) =>
          text.trim().length > limit ||
          /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text) ||
          /<\/?[a-z][^>]*>/i.test(text),
      )
    )
      return "form.courseContent.invalidText";
  }
  if (value.images.length > COURSE_CONTENT_IMAGE_LIMIT)
    return "form.courseContent.galleryLimit";
  if (value.images.some((url) => !isCourseGalleryUrl(url)))
    return "form.courseContent.invalidImage";
  return "";
}
