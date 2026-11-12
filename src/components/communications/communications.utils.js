export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const createIdempotencyKey = (scope = "communication") => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${scope}-${uuid}`;

  return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getResourceId = (resource) => resource?._id ?? resource?.id ?? "";

export const unwrapResource = (value, key) => {
  if (!value || typeof value !== "object") return value ?? null;

  return value[key] ?? value.data?.[key] ?? value.data ?? value;
};

export const unwrapCollection = (value, key) => {
  if (Array.isArray(value)) return value;

  const candidates = [
    value?.[key],
    value?.items,
    value?.results,
    value?.data?.[key],
    value?.data?.items,
    value?.data?.results,
    value?.data,
  ];

  return candidates.find(Array.isArray) ?? [];
};

export const getConversationCustomer = (conversation) =>
  conversation?.customer ??
  (conversation?.customerId && typeof conversation.customerId === "object"
    ? conversation.customerId
    : null) ??
  conversation?.contact ??
  conversation?.participant ??
  null;

export const getCustomerName = (conversation) => {
  const customer = getConversationCustomer(conversation);
  const fullName = [
    customer?.firstname ?? customer?.firstName,
    customer?.lastname ?? customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    customer?.name ||
    fullName ||
    conversation?.senderName ||
    conversation?.from?.name ||
    conversation?.sender?.name ||
    conversation?.senderEmail ||
    conversation?.from?.email ||
    (conversation?.contact?.instagramUsername
      ? `@${String(conversation.contact.instagramUsername).replace(/^@/, "")}`
      : "") ||
    (conversation?.senderInstagramUsername
      ? `@${String(conversation.senderInstagramUsername).replace(/^@/, "")}`
      : "") ||
    ""
  );
};

export const getCustomerEmail = (conversation) => {
  const customer = getConversationCustomer(conversation);

  return (
    customer?.email ??
    conversation?.senderEmail ??
    conversation?.from?.email ??
    conversation?.sender?.email ??
    ""
  );
};

export const getCustomerPhone = (conversation) => {
  const customer = getConversationCustomer(conversation);

  return (
    customer?.phone ??
    customer?.phoneNumber ??
    conversation?.senderPhone ??
    conversation?.from?.phone ??
    ""
  );
};

export const getCustomerInstagramId = (conversation) => {
  const customer = getConversationCustomer(conversation);

  return (
    customer?.instagramScopedUserId ??
    customer?.instagramScopedId ??
    customer?.instagramUserId ??
    customer?.instagramId ??
    conversation?.contact?.instagramScopedUserId ??
    conversation?.contact?.instagramScopedId ??
    conversation?.contact?.instagramUserId ??
    conversation?.senderInstagramId ??
    conversation?.from?.instagramScopedUserId ??
    conversation?.from?.instagramScopedId ??
    conversation?.sender?.instagramScopedUserId ??
    conversation?.sender?.instagramScopedId ??
    ""
  );
};

export const getCustomerInstagramUsername = (conversation) => {
  const customer = getConversationCustomer(conversation);

  return (
    customer?.instagramUsername ??
    customer?.username ??
    conversation?.contact?.instagramUsername ??
    conversation?.senderInstagramUsername ??
    conversation?.from?.username ??
    conversation?.sender?.username ??
    ""
  );
};

export const getCustomerId = (conversation) =>
  getResourceId(conversation?.customer) ||
  getResourceId(conversation?.customerId) ||
  (typeof conversation?.customerId === "string"
    ? conversation.customerId
    : "") ||
  getResourceId(getConversationCustomer(conversation)) ||
  "";

export const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export const normalizeChannel = (value) => {
  const channel = String(value ?? "email").toLowerCase();

  if (channel.includes("whatsapp")) return "whatsapp";
  if (channel.includes("instagram") || channel === "ig") return "instagram";
  if (channel.includes("portal") || channel.includes("in_app")) return "in_app";
  if (channel.includes("sms")) return "sms";
  return "email";
};

export const getChannelReplyEligibility = (
  conversation,
  channel,
  referenceTime,
) => {
  const normalized = normalizeChannel(channel);
  const channelState =
    conversation?.replyEligibility?.[normalized] ??
    conversation?.channelReplyEligibility?.[normalized] ??
    conversation?.replyWindows?.[normalized] ??
    conversation?.channelWindows?.[normalized] ??
    (normalized === "instagram"
      ? (conversation?.instagram?.replyEligibility ??
        conversation?.instagram?.replyWindow ??
        conversation?.metadata?.instagram?.replyEligibility ??
        conversation?.metadata?.instagram?.replyWindow)
      : null) ??
    (conversation?.replyEligibility?.channel === normalized
      ? conversation.replyEligibility
      : null);

  const expiresAt =
    channelState?.expiresAt ??
    channelState?.windowExpiresAt ??
    channelState?.replyWindowExpiresAt ??
    (normalized === "instagram"
      ? (conversation?.instagramReplyWindowExpiresAt ??
        conversation?.instagram?.replyWindowExpiresAt ??
        conversation?.metadata?.instagram?.replyWindowExpiresAt)
      : null) ??
    null;
  const explicitAllowed =
    channelState?.eligible ??
    channelState?.canReply ??
    channelState?.allowed ??
    channelState?.isOpen ??
    (normalized === "instagram"
      ? (conversation?.instagramReplyEligible ??
        conversation?.canReplyOnInstagram)
      : undefined);
  const validExpiry = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const inferredAllowed =
    Number.isFinite(validExpiry) && Number.isFinite(referenceTime)
      ? validExpiry > referenceTime
      : undefined;
  const allowed = explicitAllowed ?? inferredAllowed;

  return {
    known: allowed !== undefined || Boolean(expiresAt),
    allowed,
    expiresAt,
    reason:
      channelState?.reason ??
      channelState?.blockedReason ??
      channelState?.code ??
      null,
    windowType:
      channelState?.windowType ??
      channelState?.type ??
      channelState?.policy ??
      null,
  };
};

export const getInstagramMessageContext = (message) => {
  const context =
    message?.instagram ??
    message?.metadata?.instagram ??
    message?.metadata?.providerContext ??
    message?.headers?.providerContext ??
    message?.content?.instagram ??
    (normalizeChannel(message?.channel) === "instagram"
      ? (message?.context ?? message?.metadata)
      : null);

  if (!context || typeof context !== "object") return null;

  return {
    type:
      (context.isStoryMention
        ? "story_mention"
        : context.isStoryReply
          ? "story_reply"
          : null) ??
      context.type ??
      context.sourceType ??
      context.entryPoint ??
      context.referral?.source ??
      "dm",
    storyId: context.storyId ?? context.story?.id ?? context.referral?.storyId,
    storyUrl:
      context.storyUrl ??
      context.story?.url ??
      context.referral?.storyUrl ??
      context.referral?.url,
    thumbnailUrl:
      context.thumbnailUrl ??
      context.story?.thumbnailUrl ??
      context.referral?.mediaUrl,
    mentionText: context.mentionText ?? context.mention?.text,
    commentText:
      context.commentText ?? context.comment?.text ?? context.referral?.comment,
    username: context.username ?? context.senderUsername,
  };
};

export const normalizePriority = (value) => {
  const priority = String(value ?? "normal").toLowerCase();

  return ["low", "normal", "high", "urgent"].includes(priority)
    ? priority
    : "normal";
};

export const normalizeStatus = (value) => {
  const status = String(value ?? "open").toLowerCase();

  if (["resolved", "closed", "archived"].includes(status)) return "closed";
  if (["pending", "waiting", "waiting_for_customer"].includes(status)) {
    return "waiting";
  }
  return "open";
};

export const humanize = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatDateTime = (value, locale = "en") => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatRelativeTime = (value, locale = "en") => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale === "cs" ? "cs" : "en", {
    numeric: "auto",
  });

  if (absoluteSeconds < 60) return formatter.format(deltaSeconds, "second");
  if (absoluteSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (absoluteSeconds < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  }
  if (absoluteSeconds < 604800) {
    return formatter.format(Math.round(deltaSeconds / 86400), "day");
  }

  return formatDateTime(value, locale);
};

export const getConversationTimestamp = (conversation) =>
  conversation?.lastMessageAt ??
  conversation?.updatedAt ??
  conversation?.lastMessage?.createdAt ??
  conversation?.createdAt;

export const getMessageBody = (message) => {
  const content = message?.content;

  if (typeof content === "string") return content;

  return (
    content?.text ??
    content?.body ??
    message?.body ??
    message?.text ??
    message?.htmlText ??
    ""
  );
};

export const getMessageDelivery = (message) =>
  message?.delivery ??
  message?.deliveries?.[message.deliveries.length - 1] ??
  null;

export const isIncomingMessage = (message) =>
  ["incoming", "inbound", "customer"].includes(
    String(message?.direction ?? message?.type ?? "").toLowerCase(),
  );

export const isInternalNote = (message) =>
  Boolean(message?.isInternal) ||
  ["note", "internal_note", "internal"].includes(
    String(message?.type ?? message?.kind ?? "").toLowerCase(),
  );

export const getAiAnalysis = (conversation) =>
  conversation?.aiTriage ??
  conversation?.aiAnalysis ??
  conversation?.analysis ??
  conversation?.ai ??
  null;

export const getAssignee = (conversation) =>
  conversation?.assignee ?? conversation?.assignedTo ?? null;

export const getRelatedEntities = (conversation) => {
  if (Array.isArray(conversation?.relatedEntities)) {
    return conversation.relatedEntities;
  }

  const single =
    conversation?.relatedEntity ?? getAiAnalysis(conversation)?.relatedEntity;

  return single ? [single] : [];
};

export const getSuggestedActions = (conversation) => {
  const actions =
    conversation?.suggestedActions ??
    getAiAnalysis(conversation)?.suggestedActions ??
    getAiAnalysis(conversation)?.actions ??
    getAiAnalysis(conversation)?.suggestedAction;

  if (Array.isArray(actions)) return actions;
  return actions ? [actions] : [];
};

export const extractMutationMessage = (error, fallback) =>
  error?.data?.message ?? error?.error ?? error?.message ?? fallback;
