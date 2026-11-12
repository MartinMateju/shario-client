import { getEntityId, getSafeWorkspaceHref, unwrapAiData } from "./ai.utils";

export const AI_ACTION_STATUSES = [
  "suggested",
  "executing",
  "completed",
  "dismissed",
  "failed",
  "expired",
];

export const normalizeAiAction = (response, fallback = null) => {
  const source = unwrapAiData(response);
  const action = source?.action ?? source ?? fallback;
  if (!action || typeof action !== "object") return fallback;
  return {
    ...(fallback && typeof fallback === "object" ? fallback : {}),
    ...action,
    id: getEntityId(action) || getEntityId(fallback),
    status: AI_ACTION_STATUSES.includes(String(action.status))
      ? String(action.status)
      : "failed",
    preview:
      action.preview && typeof action.preview === "object"
        ? action.preview
        : (fallback?.preview ?? {}),
  };
};

export const getAiActionItems = (response) => {
  const source = unwrapAiData(response);
  const items = source?.items ?? source?.actions ?? [];
  return Array.isArray(items)
    ? items.map((item) => normalizeAiAction(item))
    : [];
};

export const clampAiActionPage = (page, pages) => {
  const normalizedPage = Number.isFinite(Number(page))
    ? Math.max(Math.trunc(Number(page)), 1)
    : 1;
  const normalizedPages = Number.isFinite(Number(pages))
    ? Math.max(Math.trunc(Number(pages)), 1)
    : 1;
  return Math.min(normalizedPage, normalizedPages);
};

export const getAiActionTitle = (action) =>
  String(
    action?.preview?.title ??
      action?.label ??
      action?.title ??
      action?.description ??
      "",
  ).trim();

export const getAiActionPreviewFields = (action) => {
  const fields = action?.preview?.fields;
  return Array.isArray(fields)
    ? fields
        .slice(0, 12)
        .map((field) => ({
          key: String(field?.key ?? "").trim(),
          value: String(field?.value ?? "").trim(),
        }))
        .filter(({ key }) => key)
    : [];
};

export const getAiActionWarnings = (action) =>
  (Array.isArray(action?.preview?.warnings) ? action.preview.warnings : [])
    .map((warning) => String(warning ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);

const AI_ACTION_RESULT_HREFS = Object.freeze({
  event: "/app/operations?section=events",
});

export const getAiActionResultHref = (
  action,
  { canOpenEventResult = false } = {},
) => {
  const resultType = String(action?.result?.type ?? "");
  if (resultType === "event" && !canOpenEventResult) return "";

  const href = action?.result?.href ?? AI_ACTION_RESULT_HREFS[resultType];
  return href ? getSafeWorkspaceHref(href, "") : "";
};

const ERROR_KEYS = Object.freeze({
  AI_ACTION_ALREADY_DECIDED: "alreadyDecided",
  AI_ACTION_EXPIRED: "expired",
  AI_ACTION_IN_PROGRESS: "inProgress",
  AI_ACTION_TARGET_CHANGED: "targetChanged",
  AI_ACTION_VERSION_UNSUPPORTED: "versionUnsupported",
  WORKSPACE_PERMISSION_REQUIRED: "permissionChanged",
  TENANT_MODULE_REQUIRED: "moduleChanged",
  STAFF_TASKS_MODULE_REQUIRED: "moduleChanged",
});

export const getAiActionErrorKey = (error) => {
  const code = String(
    error?.data?.code ?? error?.data?.error?.code ?? error?.code ?? "",
  ).trim();
  return ERROR_KEYS[code] ?? "generic";
};

export const isPendingAiAction = (action) =>
  ["suggested", "executing"].includes(String(action?.status));
