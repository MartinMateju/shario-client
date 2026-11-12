import { getPublicTenantTheme } from "./publicTenant.config";

export const getPublicTenantPortalTheme = (
  tenant,
  interactionSurface = "background",
  surface = "portal",
) => {
  if (!tenant) return null;

  const theme = getPublicTenantTheme(tenant, { surface });
  if (!["light", "soft-light"].includes(interactionSurface)) return theme;

  const secondaryOnInteractionSurfaceColor =
    (interactionSurface === "soft-light"
      ? theme.secondaryOnSoftLightColor ||
        theme.style?.["--tenant-secondary-on-soft-light"]
      : theme.secondaryOnLightColor ||
        theme.style?.["--tenant-secondary-on-light"]) ||
    theme.secondaryColor ||
    theme.style?.["--tenant-secondary"];

  if (!secondaryOnInteractionSurfaceColor) return theme;

  return {
    ...theme,
    style: {
      ...(theme.style || {}),
      "--tenant-interactive-hover": secondaryOnInteractionSurfaceColor,
      "--tenant-interactive-hover-on-surface":
        secondaryOnInteractionSurfaceColor,
    },
  };
};
