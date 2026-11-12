export const getTenantSlugParam = (params) => {
  const value = params?.tenantSlug;
  const slug = Array.isArray(value) ? value[0] : value;

  return String(slug || "")
    .trim()
    .toLowerCase();
};

export const formatTenantNameFromSlug = (slug, fallback = "Your studio") => {
  const name = String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");

  return name || fallback;
};

export const getTenantLoginHref = () => "/login";

export const getTenantRegistrationHref = () => "/register";
