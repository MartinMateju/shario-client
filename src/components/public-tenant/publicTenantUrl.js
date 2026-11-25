export const isSafeRelativePublicUrl = (value) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  !/[\u0000-\u001f\u007f]/.test(value);

export const normalizePublicTenantUrl = (
  value,
  { allowRelative = true } = {},
) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (allowRelative && isSafeRelativePublicUrl(raw)) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return "";
    }
    return url.href;
  } catch {
    return "";
  }
};
