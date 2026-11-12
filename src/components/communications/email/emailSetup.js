export const EMAIL_SETUP_READINESS = Object.freeze({
  NOT_CONFIGURED: "not_configured",
  PROVISIONING: "provisioning",
  REPLY_TO_PENDING: "reply_to_pending",
  READY: "ready",
  DISABLED: "disabled",
  ERROR: "error",
});

export const EMAIL_SETUP_POLL_INTERVAL_MS = 5_000;

const READINESS_VALUES = new Set(Object.values(EMAIL_SETUP_READINESS));
const SAFE_PROVISIONING_ERROR_CODE = /^[A-Z][A-Z0-9_]{2,79}$/;

const isManagedSender = (sender) =>
  sender?.provider === "postmark_managed" ||
  sender?.mode === "managed" ||
  sender?.managed === true;

const asString = (value) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value);

const asSafeProvisioningErrorCode = (value) => {
  const code = asString(value);
  return SAFE_PROVISIONING_ERROR_CODE.test(code) ? code : "";
};

const asIsoTimestamp = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const unwrap = (response) => response?.data ?? response ?? null;

const getSenderList = (response) => {
  const source = unwrap(response);

  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.senders)) return source.senders;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.registeredSenderEmails)) {
    return source.registeredSenderEmails;
  }

  return [];
};

export const selectManagedSender = (response) => {
  const source = unwrap(response);
  const list = getSenderList(response).filter(isManagedSender);

  if (list.length) {
    return (
      list.find(
        (sender) =>
          sender?.isDefault &&
          sender?.isActive !== false &&
          (sender?.readiness === EMAIL_SETUP_READINESS.READY ||
            Boolean(sender?.replyToVerifiedAt)),
      ) ??
      list.find(
        (sender) =>
          sender?.isActive !== false &&
          (sender?.readiness === EMAIL_SETUP_READINESS.READY ||
            Boolean(sender?.replyToVerifiedAt)),
      ) ??
      list.find((sender) => sender?.isDefault && sender?.isActive !== false) ??
      list.find((sender) => sender?.isActive !== false) ??
      list[0]
    );
  }

  if (
    source?.sender &&
    typeof source.sender === "object" &&
    isManagedSender(source.sender)
  ) {
    return source.sender;
  }
  if (
    source &&
    typeof source === "object" &&
    !Array.isArray(source) &&
    isManagedSender(source)
  ) {
    if (source._id || source.id || source.email || source.readiness)
      return source;
  }

  return null;
};

const normalizeReadiness = (sender) => {
  if (!sender) return EMAIL_SETUP_READINESS.NOT_CONFIGURED;

  const value = asString(sender.readiness).toLowerCase();
  if (READINESS_VALUES.has(value)) return value;
  if (sender.isActive === false || sender.enabled === false) {
    return EMAIL_SETUP_READINESS.DISABLED;
  }

  const provisioningStatus = asString(
    sender.providerProvisioningStatus,
  ).toLowerCase();
  if (provisioningStatus === "error") {
    return EMAIL_SETUP_READINESS.ERROR;
  }
  if (provisioningStatus && provisioningStatus !== "ready") {
    return EMAIL_SETUP_READINESS.PROVISIONING;
  }

  if (sender.replyToVerifiedAt) return EMAIL_SETUP_READINESS.READY;
  if (sender.replyToEmail || sender.pendingReplyToEmail) {
    return EMAIL_SETUP_READINESS.REPLY_TO_PENDING;
  }

  return EMAIL_SETUP_READINESS.ERROR;
};

export const normalizeEmailSetup = (response) => {
  const sender = selectManagedSender(response);
  const readiness = normalizeReadiness(sender);
  const activeReplyTo = asString(sender?.replyToEmail).toLowerCase();
  const pendingReplyTo = asString(sender?.pendingReplyToEmail).toLowerCase();
  const verifiedAt = sender?.replyToVerifiedAt ?? null;

  return {
    id: asString(sender?._id ?? sender?.id),
    mode: "managed",
    readiness,
    senderName: asString(sender?.displayName ?? sender?.senderName),
    fromAddress: asString(sender?.email ?? sender?.fromAddress),
    replyToEmail: activeReplyTo,
    pendingReplyToEmail: pendingReplyTo,
    replyToStatus: pendingReplyTo
      ? "pending"
      : verifiedAt
        ? "verified"
        : activeReplyTo
          ? "pending"
          : "missing",
    replyToVerifiedAt: verifiedAt,
    isActive: sender
      ? sender.isActive !== false && sender.enabled !== false
      : false,
    lastTestAt: sender?.lastTestAt ?? sender?.lastTestedAt ?? null,
    lastTestStatus: asString(sender?.lastTestStatus),
    providerProvisioningStatus: asString(sender?.providerProvisioningStatus),
    providerProvisioningErrorCode: asSafeProvisioningErrorCode(
      sender?.providerProvisioningErrorCode,
    ),
    providerProvisioningAttemptedAt: asIsoTimestamp(
      sender?.providerProvisioningAttemptedAt,
    ),
  };
};

export const isEmailSetupReady = (setup) =>
  normalizeEmailSetup(setup).readiness === EMAIL_SETUP_READINESS.READY;

export const getEmailSetupPollingInterval = (setup) =>
  normalizeEmailSetup(setup).readiness === EMAIL_SETUP_READINESS.PROVISIONING
    ? EMAIL_SETUP_POLL_INTERVAL_MS
    : 0;

export const buildEmailSetupCreateBody = ({
  senderName,
  replyToEmail,
} = {}) => ({
  displayName: asString(senderName),
  replyToEmail: asString(replyToEmail).toLowerCase(),
});

export const buildEmailSetupUpdateBody = ({
  senderName,
  replyToEmail,
} = {}) => ({
  displayName: asString(senderName),
  replyToEmail: asString(replyToEmail).toLowerCase(),
});

export const getEmailReadinessTone = (readiness) => {
  if (readiness === EMAIL_SETUP_READINESS.READY) return "success";
  if (readiness === EMAIL_SETUP_READINESS.PROVISIONING) return "info";
  if (readiness === EMAIL_SETUP_READINESS.REPLY_TO_PENDING) return "warning";
  if (readiness === EMAIL_SETUP_READINESS.ERROR) return "danger";
  return "neutral";
};
