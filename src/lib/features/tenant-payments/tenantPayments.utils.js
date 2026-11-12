const normalizeStatus = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replaceAll("-", "_")
    : "";

export const CONNECT_DISPLAY_STATUSES = Object.freeze({
  NOT_STARTED: "not_started",
  PENDING: "pending",
  RESTRICTED: "restricted",
  ACTIVE: "active",
});

export const normalizeTenantPaymentConnect = (response) => {
  const source = response?.data ?? response ?? {};
  const account = source?.account ?? source?.connectedAccount ?? {};
  const apiStatus = normalizeStatus(
    account?.onboardingStatus ?? source?.onboardingStatus ?? source?.status,
  );
  const connected = Boolean(
    account?.connected ??
    source?.connected ??
    account?.id ??
    source?.connectedAccountId,
  );
  const chargesEnabled = Boolean(
    account?.chargesEnabled ?? source?.chargesEnabled,
  );
  const payoutsEnabled = Boolean(
    account?.payoutsEnabled ?? source?.payoutsEnabled,
  );
  const detailsSubmitted = Boolean(
    account?.detailsSubmitted ?? source?.detailsSubmitted,
  );

  let status = CONNECT_DISPLAY_STATUSES.NOT_STARTED;

  if (apiStatus === "complete" || apiStatus === "active") {
    status = CONNECT_DISPLAY_STATUSES.ACTIVE;
  } else if (
    apiStatus === "restricted" ||
    apiStatus === "disabled" ||
    apiStatus === "action_required"
  ) {
    status = CONNECT_DISPLAY_STATUSES.RESTRICTED;
  } else if (
    apiStatus === "pending" ||
    apiStatus === "in_progress" ||
    apiStatus === "onboarding"
  ) {
    status = CONNECT_DISPLAY_STATUSES.PENDING;
  } else if (apiStatus === "not_started" || !connected) {
    status = CONNECT_DISPLAY_STATUSES.NOT_STARTED;
  } else if (chargesEnabled && payoutsEnabled) {
    status = CONNECT_DISPLAY_STATUSES.ACTIVE;
  } else if (detailsSubmitted) {
    status = CONNECT_DISPLAY_STATUSES.RESTRICTED;
  } else {
    status = CONNECT_DISPLAY_STATUSES.PENDING;
  }

  return {
    status,
    connected,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    country: account?.country ?? source?.country ?? null,
    defaultCurrency:
      account?.defaultCurrency ?? source?.defaultCurrency ?? null,
    dashboardType: account?.dashboardType ?? source?.dashboardType ?? null,
    lastSyncedAt: account?.lastSyncedAt ?? source?.lastSyncedAt ?? null,
    canManage: Boolean(
      source?.permissions?.canManage ?? source?.canManage ?? false,
    ),
  };
};
