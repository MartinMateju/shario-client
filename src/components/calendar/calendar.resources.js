export const DEFAULT_CALENDAR_ACTIVITY_NAMES = Object.freeze({
  WORKSTATION: "Workstations",
  SHARED_TABLE: "Shared tables",
  GENERAL: "General capacity",
});

export function localizeCalendarResource(resource, t) {
  const activityId = String(resource.id || "")
    .trim()
    .toUpperCase();
  const defaultName = DEFAULT_CALENDAR_ACTIVITY_NAMES[activityId];
  // Translate adapter-generated names while preserving studio-authored labels.
  if (!defaultName || (resource.name && resource.name !== defaultName)) {
    return resource;
  }
  const key = `activities.${activityId}`;
  const name = t(key);
  return name && name !== key ? { ...resource, name } : resource;
}

export function getCalendarActivityName(studio, activityId, t) {
  const normalizedActivityId = String(activityId || "")
    .trim()
    .toUpperCase();
  const resource = studio?.resources?.find(
    (item) =>
      String(item.id || "")
        .trim()
        .toUpperCase() === normalizedActivityId,
  ) || {
    id: normalizedActivityId,
    name: DEFAULT_CALENDAR_ACTIVITY_NAMES[normalizedActivityId] || "",
  };

  return localizeCalendarResource(resource, t).name || "";
}
