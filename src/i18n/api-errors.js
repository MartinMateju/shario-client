/**
 * Render API failures through the screen's message catalog. API messages and
 * transport errors are diagnostic text, not translated product copy.
 *
 * A screen can supply localized messages for known machine-readable codes;
 * unknown failures retain its translated, action-specific fallback.
 */
export const getLocalizedApiErrorMessage = (
  error,
  fallback,
  messagesByCode = {},
) => {
  const code = String(
    error?.data?.code ??
      error?.data?.errorCode ??
      error?.data?.error?.code ??
      error?.code ??
      "",
  )
    .trim()
    .toUpperCase();
  const localized = Object.prototype.hasOwnProperty.call(messagesByCode, code)
    ? messagesByCode[code]
    : undefined;
  return typeof localized === "string" && localized.trim()
    ? localized
    : fallback;
};
