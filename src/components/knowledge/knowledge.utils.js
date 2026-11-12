export const KNOWLEDGE_RESOURCE_TYPES = Object.freeze([
  "video",
  "guide",
  "faq",
  "link",
  "file",
]);

export const KNOWLEDGE_CATEGORIES = Object.freeze([
  "general",
  "getting_started",
  "studio_rules",
  "booking_policy",
  "courses",
  "pickup",
  "memberships",
  "payments",
  "faq",
]);

export const KNOWLEDGE_AUDIENCES = Object.freeze([
  "public",
  "customer",
  "member",
  "course",
  "owner",
  "staff",
]);

export const KNOWLEDGE_STATUSES = Object.freeze([
  "draft",
  "published",
  "archived",
]);

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const getKnowledgeId = (resource) =>
  String(resource?.id ?? resource?._id ?? "").trim();

export const isKnowledgeResourceId = (value) =>
  /^[a-f\d]{24}$/i.test(String(value ?? "").trim());

export const findKnowledgeResourceById = (resources, value) => {
  const resourceId = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!isKnowledgeResourceId(resourceId)) return null;

  return (
    (Array.isArray(resources) ? resources : []).find(
      (resource) => getKnowledgeId(resource).toLowerCase() === resourceId,
    ) || null
  );
};

export const KNOWLEDGE_AI_READINESS = Object.freeze({
  READY: "ready",
  INDEXING: "indexing",
  NEEDS_ATTENTION: "needs_attention",
  NOT_USED: "not_used",
});

export const KNOWLEDGE_AI_INDEX_VERSION = "knowledge-article-v2";

const parseKnowledgeDate = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const getKnowledgeAiReadiness = (resource, now = Date.now()) => {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  const effectiveFrom = parseKnowledgeDate(resource?.effectiveFrom);
  const effectiveUntil = parseKnowledgeDate(resource?.effectiveUntil);
  const isEffective =
    Number.isFinite(timestamp) &&
    (effectiveFrom === null || effectiveFrom <= timestamp) &&
    (effectiveUntil === null || effectiveUntil > timestamp);

  if (
    resource?.status !== "published" ||
    resource?.aiEnabled === false ||
    !isEffective
  ) {
    return KNOWLEDGE_AI_READINESS.NOT_USED;
  }

  const embeddingStatus = String(resource?.embeddingStatus ?? "pending")
    .trim()
    .toLowerCase();
  if (
    embeddingStatus === "ready" &&
    resource?.embeddingIndexVersion === KNOWLEDGE_AI_INDEX_VERSION
  ) {
    return KNOWLEDGE_AI_READINESS.READY;
  }
  if (["failed", "skipped"].includes(embeddingStatus)) {
    return KNOWLEDGE_AI_READINESS.NEEDS_ATTENTION;
  }

  return KNOWLEDGE_AI_READINESS.INDEXING;
};

export const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

export const normalizeKnowledgeQuestions = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      question: String(item?.question ?? "").trim(),
      answer: String(item?.answer ?? "").trim(),
    }))
    .filter((item) => item.question || item.answer);

const getCompleteKnowledgeQuestions = (value) =>
  normalizeKnowledgeQuestions(value).filter(
    (item) => item.question && item.answer,
  );

const toDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const createBlankKnowledgeForm = () => ({
  title: "",
  summary: "",
  content: "",
  type: "guide",
  category: "general",
  language: "en",
  audience: "customer",
  status: "draft",
  sourceUrl: "",
  videoUrl: "",
  fileUrl: "",
  transcript: "",
  tags: "",
  locationIds: [],
  targetMembershipIds: [],
  targetCourseIds: [],
  customQuestions: [],
  featured: false,
  aiEnabled: true,
  effectiveFrom: "",
  effectiveUntil: "",
});

export const normalizeKnowledgeForm = (resource) => {
  const blank = createBlankKnowledgeForm();

  if (!resource) return blank;

  return {
    ...blank,
    ...resource,
    title: String(resource.title ?? "").trim(),
    summary: String(resource.summary ?? resource.description ?? "").trim(),
    content: String(resource.content ?? resource.body ?? "").trim(),
    tags: normalizeStringList(resource.tags).join(", "),
    locationIds: normalizeStringList(resource.locationIds),
    targetMembershipIds: normalizeStringList(
      resource.targetMembershipIds ?? resource.membershipPlanIds,
    ),
    targetCourseIds: normalizeStringList(
      resource.targetCourseIds ?? resource.courseIds,
    ),
    customQuestions: normalizeKnowledgeQuestions(
      resource.customQuestions ?? resource.questions,
    ),
    effectiveFrom: toDateTimeInput(resource.effectiveFrom),
    effectiveUntil: toDateTimeInput(resource.effectiveUntil),
    featured: resource.featured === true,
    aiEnabled: resource.aiEnabled !== false,
  };
};

export const buildKnowledgePayload = (form) => ({
  title: String(form.title || "").trim(),
  summary: String(form.summary || "").trim(),
  content: String(form.content || "").trim(),
  type: String(form.type || "guide"),
  category: String(form.category || "general"),
  language: String(form.language || "en"),
  audience: String(form.audience || "customer"),
  status: String(form.status || "draft"),
  sourceUrl: String(form.sourceUrl || "").trim(),
  videoUrl: String(form.videoUrl || "").trim(),
  fileUrl: String(form.fileUrl || "").trim(),
  transcript: String(form.transcript || "").trim(),
  tags: normalizeStringList(form.tags),
  locationIds: normalizeStringList(form.locationIds),
  targetMembershipIds:
    form.audience === "member"
      ? normalizeStringList(form.targetMembershipIds)
      : [],
  targetCourseIds:
    form.audience === "course" ? normalizeStringList(form.targetCourseIds) : [],
  customQuestions: getCompleteKnowledgeQuestions(form.customQuestions),
  featured: form.featured === true,
  aiEnabled: form.aiEnabled === true,
  effectiveFrom: form.effectiveFrom
    ? new Date(form.effectiveFrom).toISOString()
    : null,
  effectiveUntil: form.effectiveUntil
    ? new Date(form.effectiveUntil).toISOString()
    : null,
});

export const getSafeResourceUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
};

export const getYoutubeVideoId = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return "";
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v") || "";
      }

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) {
        id = parts[1] || "";
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
};

export const getYoutubeEmbedUrl = (resource) => {
  const id = getYoutubeVideoId(resource?.videoUrl || resource?.sourceUrl);
  return id
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
    : "";
};

export const getKnowledgeSearchText = (resource) =>
  [
    resource?.title,
    resource?.summary,
    resource?.content,
    resource?.transcript,
    ...(resource?.tags || []),
    ...(resource?.customQuestions || []).flatMap((item) => [
      item?.question,
      item?.answer,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const isKnowledgeResourceVisible = (
  resource,
  { query = "", category = "all", type = "all" } = {},
) => {
  const needle = String(query || "")
    .trim()
    .toLowerCase();
  const matchesCategory = category === "all" || resource?.category === category;
  const matchesType = type === "all" || resource?.type === type;

  return (
    matchesCategory &&
    matchesType &&
    (!needle || getKnowledgeSearchText(resource).includes(needle))
  );
};
