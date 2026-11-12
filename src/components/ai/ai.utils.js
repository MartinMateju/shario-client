export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const getEntityId = (value) => {
  const candidate =
    value && typeof value === "object" ? (value._id ?? value.id) : value;

  return ["string", "number"].includes(typeof candidate)
    ? String(candidate).trim()
    : "";
};

export const unwrapAiData = (value, key) => {
  const source = value?.data ?? value ?? null;
  if (!source || typeof source !== "object") return source;
  return key ? (source[key] ?? source) : source;
};

export const getAiErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.data?.error?.message ??
  error?.data?.error ??
  error?.error ??
  error?.message ??
  fallback;

export const normalizeAiMessages = (conversation) => {
  const source =
    conversation?.messages ??
    conversation?.conversation?.messages ??
    conversation?.items ??
    [];
  return Array.isArray(source) ? source : [];
};

export const getAiMessageText = (message) =>
  String(
    message?.content?.text ??
      message?.content ??
      message?.text ??
      message?.answer ??
      message?.message ??
      "",
  );

export const getAiMessageRole = (message) => {
  const role = String(
    message?.role ?? message?.sender ?? message?.direction ?? "assistant",
  ).toLowerCase();
  return ["user", "customer", "human"].includes(role) ? "user" : "assistant";
};

export const getAiCitations = (value) => {
  const source =
    value?.citations ??
    value?.sources ??
    value?.knowledgeSources ??
    value?.metadata?.citations ??
    [];
  return Array.isArray(source) ? source : [];
};

export const getAiGrounding = (value) => {
  const source =
    value?.grounding ??
    value?.metadata?.grounding ??
    value?.message?.grounding ??
    null;

  return source && typeof source === "object" && !Array.isArray(source)
    ? source
    : null;
};

const getObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const firstString = (...values) => {
  const match = values.find(
    (value) => typeof value === "string" && value.trim(),
  );
  return match ? match.trim() : "";
};

const firstFiniteNumber = (...values) => {
  const match = values.find(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  return match ?? null;
};

const firstBoolean = (...values) => {
  const match = values.find((value) => typeof value === "boolean");
  return match ?? null;
};

const EVIDENCE_WARNING_TRANSLATION_KEYS = Object.freeze({
  insufficient_evidence: "insufficient",
  context_truncated: "truncated",
  context_partial: "partial",
});

export const getAiEvidenceWarningKey = (code) =>
  EVIDENCE_WARNING_TRANSLATION_KEYS[String(code ?? "").trim()] ?? "";

/**
 * Normalizes the server-owned evidence envelope while retaining compatibility
 * with assistant messages created before the envelope was introduced.
 */
export const getAiEvidence = (value) => {
  const source = unwrapAiData(value);
  const message =
    getObject(source?.message ?? source?.assistantMessage) ?? source;
  const evidence =
    getObject(message?.evidence) ??
    getObject(source?.evidence) ??
    getObject(message?.metadata?.evidence) ??
    null;
  const grounding = getAiGrounding(message) ?? getAiGrounding(source);
  const context = getObject(evidence?.context) ?? {};
  const evidenceSources = Array.isArray(evidence?.sources)
    ? evidence.sources
    : [];
  const messageSources = getAiCitations(message);
  const legacySources = messageSources.length
    ? messageSources
    : getAiCitations(source);
  const sources = evidenceSources.length ? evidenceSources : legacySources;
  const warnings = Array.isArray(evidence?.warnings)
    ? evidence.warnings.filter(
        (warning) =>
          typeof warning === "string" ||
          (warning && typeof warning === "object" && !Array.isArray(warning)),
      )
    : [];

  if (!evidence && !grounding && !sources.length) return null;

  const generatedAt = firstString(
    evidence?.generatedAt,
    context.generatedAt,
    grounding?.contextGeneratedAt,
    grounding?.retrievedAt,
  );

  return {
    generatedAt,
    sources,
    warnings,
    context: {
      basis: firstString(context.basis, evidence?.basis, grounding?.basis),
      freshnessAt: firstString(
        context.freshnessAt,
        evidence?.freshnessAt,
        generatedAt,
        grounding?.retrievedAt,
      ),
      sourceCount:
        firstFiniteNumber(
          context.sourceCount,
          evidence?.sourceCount,
          grounding?.sourceCount,
        ) ?? sources.length,
      candidateCount: firstFiniteNumber(
        context.candidateCount,
        evidence?.candidateCount,
        grounding?.candidateCount,
      ),
      complete: firstBoolean(
        context.complete,
        evidence?.complete,
        grounding?.complete,
      ),
      truncated: firstBoolean(
        context.truncated,
        evidence?.truncated,
        grounding?.truncated,
      ),
      stale: firstBoolean(context.stale, evidence?.stale, grounding?.stale),
    },
  };
};

const CONCIERGE_SUGGESTIONS = Object.freeze({
  public: Object.freeze(["openingHours", "courses", "booking"]),
  customer: Object.freeze(["studioRules", "memberships", "materials"]),
});

export const getConciergeSuggestionKeys = (surface) =>
  CONCIERGE_SUGGESTIONS[surface] ?? CONCIERGE_SUGGESTIONS.public;

export const getAiActions = (value) => {
  const source =
    value?.suggestedActions ?? value?.actions ?? value?.toolActions ?? [];
  return Array.isArray(source) ? source : [];
};

export const getAiNavigation = (value) => {
  const source = value?.navigation ?? value?.links ?? [];
  return Array.isArray(source) ? source : [];
};

export const getAiSuggestedReplies = (value) => {
  const source = value?.suggestedReplies ?? [];
  if (!Array.isArray(source)) return [];

  return [
    ...new Set(
      source
        .map((reply) => (typeof reply === "string" ? reply.trim() : ""))
        .filter(Boolean),
    ),
  ].slice(0, 4);
};

export const getSafeWorkspaceHref = (value, fallback = "") => {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("//") || raw.includes("\\")) return fallback;

  try {
    const url = new URL(raw, "https://workspace.invalid");
    if (
      url.origin !== "https://workspace.invalid" ||
      (url.pathname !== "/app" && !url.pathname.startsWith("/app/"))
    ) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const BOOKING_COMPOSER_PATH = "/app/bookings/new";
const BOOKING_COMPOSER_PARAMS = new Set([
  "productId",
  "locationId",
  "start",
  "end",
  "returnTo",
]);
const BOOKING_PREFILL_ID = /^[A-Za-z0-9_-]{1,128}$/;

const isValidBookingDateTime = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
};

export const normalizeBookingComposerHref = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("//") || raw.includes("\\") || raw.includes("#")) {
    return "";
  }

  try {
    const url = new URL(raw, "https://workspace.invalid");
    if (
      url.origin !== "https://workspace.invalid" ||
      url.pathname !== BOOKING_COMPOSER_PATH
    ) {
      return "";
    }

    const entries = [...url.searchParams.entries()];
    if (
      entries.some(([key]) => !BOOKING_COMPOSER_PARAMS.has(key)) ||
      [...BOOKING_COMPOSER_PARAMS].some(
        (key) => url.searchParams.getAll(key).length > 1,
      )
    ) {
      return "";
    }

    const productId = url.searchParams.get("productId") ?? "";
    const locationId = url.searchParams.get("locationId") ?? "";
    const start = url.searchParams.get("start") ?? "";
    const end = url.searchParams.get("end") ?? "";
    const canonicalKeys = ["productId", "locationId", "start", "end"];
    const suppliedCanonicalCount = canonicalKeys.filter((key) =>
      url.searchParams.has(key),
    ).length;

    if (suppliedCanonicalCount !== 0 && suppliedCanonicalCount !== 4) return "";
    if (
      suppliedCanonicalCount === 4 &&
      (!BOOKING_PREFILL_ID.test(productId) ||
        !BOOKING_PREFILL_ID.test(locationId) ||
        !isValidBookingDateTime(start) ||
        !isValidBookingDateTime(end))
    ) {
      return "";
    }

    if (suppliedCanonicalCount === 4) {
      const duration = new Date(end).getTime() - new Date(start).getTime();
      if (duration <= 0 || duration > 24 * 60 * 60 * 1000) return "";
    }

    const returnToValue = url.searchParams.get("returnTo");
    const returnTo =
      returnToValue === null ? "" : getSafeWorkspaceHref(returnToValue, "");
    if (returnToValue !== null && !returnTo) return "";

    const normalized = new URLSearchParams();
    if (suppliedCanonicalCount === 4) {
      normalized.set("productId", productId);
      normalized.set("locationId", locationId);
      normalized.set("start", start);
      normalized.set("end", end);
    }
    if (returnTo) normalized.set("returnTo", returnTo);

    const query = normalized.toString();
    return query ? `${BOOKING_COMPOSER_PATH}?${query}` : BOOKING_COMPOSER_PATH;
  } catch {
    return "";
  }
};

export const normalizeAiNavigationItem = (
  item,
  { canCreateBooking = false, canPrefillBooking = false } = {},
) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const kind = String(item.kind ?? "")
    .trim()
    .toLowerCase();
  if (kind === "booking_composer") {
    if (!canCreateBooking) return null;
    const href = normalizeBookingComposerHref(item.href);
    return href ? { ...item, kind, href } : null;
  }

  const href = getSafeWorkspaceHref(item.href, "");
  if (!href) return null;

  try {
    const normalizedPathname = new URL(
      href,
      "https://workspace.invalid",
    ).pathname.replace(/\/+$/, "");
    if (normalizedPathname === BOOKING_COMPOSER_PATH) return null;
  } catch {
    return null;
  }

  return { ...item, href };
};

export const getSafeCitationHref = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};

export const getSafeExternalCitationUrl = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
};

const KNOWLEDGE_RESOURCE_ID = /^[a-f\d]{24}$/i;

export const getSafeKnowledgeSourceHref = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";

  try {
    const url = new URL(raw, "https://skab.local");
    if (url.origin !== "https://skab.local" || url.hash) return "";

    if (["/app/knowledge", "/portal/knowledge"].includes(url.pathname)) {
      const resourceId = url.searchParams.get("resource") ?? "";
      return url.searchParams.size === 1 &&
        KNOWLEDGE_RESOURCE_ID.test(resourceId)
        ? `${url.pathname}?resource=${encodeURIComponent(resourceId)}`
        : "";
    }

    const helpMatch = url.pathname.match(/^\/help\/([a-f\d]{24})$/i);
    return helpMatch && url.searchParams.size === 0 ? url.pathname : "";
  } catch {
    return "";
  }
};

/**
 * @typedef {object} NormalizedAiCitation
 * @property {string} id
 * @property {string} title
 * @property {string} excerpt
 * @property {string} href
 * @property {boolean} external
 * @property {string} kind
 * @property {string} category
 * @property {string} audience
 * @property {string} locale
 * @property {string} version
 * @property {string} updatedAt
 * @property {string} retrievedAt
 */

/**
 * Normalizes both current knowledge citations and legacy assistant links.
 *
 * @param {unknown} citation
 * @param {number} index
 * @param {string} fallbackTitle
 * @returns {NormalizedAiCitation}
 */
export const normalizeAiCitation = (
  citation,
  index = 0,
  fallbackTitle = "Source",
) => {
  const value = typeof citation === "string" ? { title: citation } : citation;
  const title = String(
    value?.title ?? value?.label ?? value?.name ?? fallbackTitle,
  ).trim();
  const sourceHref = getSafeKnowledgeSourceHref(value?.sourceHref);
  const sourceUrl = getSafeExternalCitationUrl(value?.sourceUrl);
  const legacyHref = getSafeCitationHref(
    value?.href ?? value?.url ?? value?.path,
  );
  const href = sourceHref || sourceUrl || legacyHref;

  return {
    id: String(
      value?.id ??
        value?.sourceId ??
        `${title || fallbackTitle || "source"}-${index}`,
    ),
    title,
    excerpt: String(value?.excerpt ?? value?.snippet ?? "").trim(),
    href,
    external:
      !sourceHref &&
      (Boolean(sourceUrl) ||
        href.startsWith("http://") ||
        href.startsWith("https://")),
    kind: String(value?.kind ?? value?.type ?? "")
      .trim()
      .toLowerCase(),
    category: String(value?.category ?? "")
      .trim()
      .toLowerCase(),
    audience: String(value?.audience ?? "")
      .trim()
      .toLowerCase(),
    locale: String(value?.locale ?? value?.language ?? "")
      .trim()
      .toLowerCase(),
    version: String(value?.version ?? "").trim(),
    updatedAt: String(value?.updatedAt ?? "").trim(),
    retrievedAt: String(value?.retrievedAt ?? "").trim(),
  };
};

export const createClientMessage = (text, role = "user") => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  text,
  clientOnly: true,
  createdAt: new Date().toISOString(),
});

export const normalizeAssistantResponse = (response) => {
  const source = unwrapAiData(response);
  const message = source?.message ?? source?.assistantMessage ?? source;
  const text = getAiMessageText(message || source);
  const messageSuggestedReplies = getAiSuggestedReplies(message);

  return {
    ...(message && typeof message === "object" ? message : {}),
    id:
      getEntityId(message) ||
      getEntityId(source?.messageId) ||
      `assistant-${Date.now()}`,
    role: "assistant",
    text,
    citations: getAiCitations(message?.citations ? message : source),
    grounding: getAiGrounding(message) ?? getAiGrounding(source),
    evidence: getAiEvidence(message?.evidence ? message : source),
    actions: getAiActions(message?.actions ? message : source),
    navigation: getAiNavigation(message?.navigation ? message : source),
    suggestedReplies: messageSuggestedReplies.length
      ? messageSuggestedReplies
      : getAiSuggestedReplies(source),
    runId: message?.runId ?? source?.runId,
    createdAt:
      message?.createdAt ?? source?.createdAt ?? new Date().toISOString(),
  };
};
