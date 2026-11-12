import {
  tenantDateKey,
  unwrapDailyBriefing,
} from "@/components/dashboard/overview/daily-studio-briefing.utils";

const MAX_INBOX_ITEMS = 5;
const SEVERITIES = new Set(["critical", "warning", "info"]);
const ASSISTANT_INTENT = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const text = (value, maxLength = 2_000) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const getBriefingLocationId = (briefing) =>
  text(
    briefing?.locationId ??
      briefing?.scope?.locationId ??
      briefing?.context?.locationId,
    128,
  );

const safeWorkspaceHref = (value) => {
  const raw = text(value, 300);
  if (!raw || raw.startsWith("//") || raw.includes("\\")) return null;

  try {
    const url = new URL(raw, "https://workspace.invalid");
    if (
      url.origin !== "https://workspace.invalid" ||
      (url.pathname !== "/app" && !url.pathname.startsWith("/app/"))
    ) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

const getFreshScopedBriefing = (
  response,
  { locale, locationId, now = new Date() } = {},
) => {
  const briefing = unwrapDailyBriefing(response);
  if (!briefing || briefing.freshness?.state !== "fresh") return null;
  if (
    text(briefing.locale, 24).toLowerCase() !== text(locale, 24).toLowerCase()
  ) {
    return null;
  }

  const timezone =
    text(briefing?.period?.timezone, 100) ||
    text(briefing?.timezone, 100) ||
    "UTC";
  if (briefing.dateKey !== tenantDateKey(now, timezone)) return null;

  const requestedLocationId = text(locationId, 128);
  const briefingLocationId = getBriefingLocationId(briefing);
  const scopeKey = text(briefing.scopeKey, 200);
  if (requestedLocationId) {
    const expectedScopeKey = `location:${requestedLocationId}`;
    if (
      (briefingLocationId && briefingLocationId !== requestedLocationId) ||
      (scopeKey && scopeKey !== expectedScopeKey) ||
      (!briefingLocationId && !scopeKey) ||
      (briefingLocationId !== requestedLocationId &&
        scopeKey !== expectedScopeKey)
    ) {
      return null;
    }
  } else if (briefingLocationId || scopeKey.startsWith("location:")) {
    return null;
  }

  return briefing;
};

const normalizeInboxItem = (item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const id = text(item.id, 100);
  const title = text(item.title, 300);
  const description = text(item.description, 1_000);
  if (!id || (!title && !description)) return null;

  const severity = text(item.severity, 20).toLowerCase();
  return {
    id,
    type: text(item.type ?? item.key, 100),
    severity: SEVERITIES.has(severity) ? severity : "info",
    title: title || description,
    description: title ? description : "",
    prompt: text(item.prompt, 1_000),
    href: safeWorkspaceHref(item.href),
  };
};

export const getStudioAssistantOperationsInbox = (response, options = {}) => {
  const briefing = getFreshScopedBriefing(response, options);
  if (!briefing) return null;

  const source = Array.isArray(briefing.operationsInbox)
    ? briefing.operationsInbox
    : Array.isArray(briefing.attention)
      ? briefing.attention
      : [];
  const promptByAttentionId = new Map();
  for (const action of Array.isArray(briefing.suggestedActions)
    ? briefing.suggestedActions
    : []) {
    const attentionId = text(action?.attentionId, 100);
    const intent = text(action?.intent, 100).toLowerCase();
    if (
      action?.kind === "assistant_intent" &&
      attentionId &&
      ASSISTANT_INTENT.test(intent) &&
      !promptByAttentionId.has(attentionId)
    ) {
      promptByAttentionId.set(attentionId, intent);
    }
  }
  const items = [];
  const seen = new Set();

  for (const candidate of source) {
    const item = normalizeInboxItem(candidate);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(
      item.prompt
        ? item
        : { ...item, prompt: promptByAttentionId.get(item.id) || "" },
    );
    if (items.length === MAX_INBOX_ITEMS) break;
  }

  if (items.length === 0 && briefing.coverage?.complete !== true) {
    return null;
  }

  return items;
};

export const getStudioAssistantBriefingAttention = (response, options = {}) => {
  const first = getStudioAssistantOperationsInbox(response, options)?.[0];
  return first
    ? { id: first.id, label: first.description || first.title }
    : null;
};
