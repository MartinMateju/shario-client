const LAUNCH_CENTER_STATUSES = new Set([
  "progress",
  "live",
  "attention",
  "operational",
]);

const normalizeLaunchCenterStatus = (status) => {
  if (
    !status ||
    !LAUNCH_CENTER_STATUSES.has(status.status) ||
    status.completed === undefined ||
    status.total === undefined
  ) {
    return null;
  }

  const completed = Number(status.completed);
  const total = Number(status.total);

  if (!Number.isFinite(completed) || !Number.isFinite(total) || total < 0) {
    return null;
  }

  const normalizedTotal = Math.max(0, Math.trunc(total));
  const normalizedCompleted = Math.min(
    normalizedTotal,
    Math.max(0, Math.trunc(completed)),
  );
  const issueCount = Math.max(0, Math.trunc(Number(status.issueCount) || 0));

  if (status.status === "progress" && normalizedTotal === 0) return null;
  if (status.status === "attention" && issueCount === 0) return null;

  return {
    status: status.status,
    completed: normalizedCompleted,
    total: normalizedTotal,
    issueCount,
  };
};

export const getLaunchCenterStatusPresentation = (status, t) => {
  const normalized = normalizeLaunchCenterStatus(status);
  if (!normalized || typeof t !== "function") return null;

  if (normalized.status === "attention") {
    return {
      ...normalized,
      badgeText: t("launchCenterIssueBadge", {
        count: normalized.issueCount,
      }),
      description: t("launchCenterAttentionStatus", {
        count: normalized.issueCount,
      }),
      tone: "attention",
    };
  }

  if (normalized.status === "live") {
    return {
      ...normalized,
      badgeText: t("launchCenterLiveBadge"),
      description: t("launchCenterLiveStatus"),
      tone: "positive",
    };
  }

  if (normalized.status === "operational") {
    return {
      ...normalized,
      badgeText: t("launchCenterReadyBadge"),
      description: t("launchCenterReadyStatus"),
      tone: "positive",
    };
  }

  return {
    ...normalized,
    badgeText: `${normalized.completed}/${normalized.total}`,
    description: t("launchCenterRequiredProgress", {
      completed: normalized.completed,
      total: normalized.total,
    }),
    tone: "progress",
  };
};
