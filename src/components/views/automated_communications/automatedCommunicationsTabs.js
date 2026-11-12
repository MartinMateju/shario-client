export const DEFAULT_AUTOMATED_EMAIL_TAB = "history";

export function resolveAutomatedCommunicationsView(
  requestedTab,
  availableTabIds,
) {
  const resolvedRequest = requestedTab || DEFAULT_AUTOMATED_EMAIL_TAB;

  if (resolvedRequest === "templates") {
    return { templatesOpen: true, activeTab: null };
  }

  return {
    templatesOpen: false,
    activeTab: availableTabIds.includes(resolvedRequest)
      ? resolvedRequest
      : DEFAULT_AUTOMATED_EMAIL_TAB,
  };
}
