export const PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS = Object.freeze([
  "backgroundColor",
  "surfaceColor",
  "textColor",
  "headingColor",
  "headerBackgroundColor",
  "headerTextColor",
  "primaryButtonColor",
  "calendarBackgroundColor",
  "calendarTextColor",
  "profileMenuBackgroundColor",
]);

export const normalizePortalAppearance = (appearance = {}) =>
  Object.fromEntries(
    PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.map((key) => {
      const value = String(appearance?.[key] ?? "").trim();
      return [key, /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : ""];
    }),
  );

// An empty personal field inherits the studio's setting; it must never erase it.
export const mergePortalAppearance = (tenant, personalAppearance) => {
  const overrides = Object.fromEntries(
    Object.entries(normalizePortalAppearance(personalAppearance)).filter(
      ([, value]) => value,
    ),
  );
  if (!tenant || !Object.keys(overrides).length) return tenant;

  return {
    ...tenant,
    publicSite: {
      ...tenant.publicSite,
      customerPortal: {
        ...tenant.publicSite?.customerPortal,
        appearance: {
          ...tenant.publicSite?.customerPortal?.appearance,
          ...overrides,
        },
      },
    },
  };
};
